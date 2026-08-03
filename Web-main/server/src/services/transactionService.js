const mongoose = require('mongoose');
const { ethers } = require('ethers');
const Account = require('../models/Account');
const UserSubscription = require('../models/UserSubscription');
const Deposit = require('../models/Deposit');
const Package = require('../models/Package');
const subscriptionService = require('./subscriptionService');

// Verification helper function via JSON-RPC
const verifyBlockchainTx = async (txHash, expectedReceiver, expectedEthAmount, rpcUrl) => {
  try {
    // 1. Get transaction details
    const txResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1
      })
    });

    const txResult = await txResponse.json();
    if (!txResult.result) {
      return false;
    }

    const tx = txResult.result;

    // 2. Validate receiver address (case insensitive comparison)
    if (!tx.to || tx.to.toLowerCase() !== expectedReceiver.toLowerCase()) {
      return false;
    }

    // 3. Validate amount (hex to decimal Wei comparison)
    const txValueWei = BigInt(tx.value);
    // Convert expected ETH to Wei: ETH * 10^18
    const expectedValueWei = BigInt(Math.floor(expectedEthAmount * 1e18));

    // Allow small precision error (e.g. 0.0001 ETH difference is acceptable)
    const allowedDiff = BigInt(Math.floor(0.0001 * 1e18));
    const diff = txValueWei > expectedValueWei ? txValueWei - expectedValueWei : expectedValueWei - txValueWei;

    if (diff > allowedDiff) {
      return false;
    }

    // 4. Verify transaction status by checking receipt
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1
      })
    });

    const receiptResult = await receiptResponse.json();
    if (!receiptResult.result) {
      return false;
    }

    const receipt = receiptResult.result;
    
    // status '0x1' is success, '0x0' is failure
    if (receipt.status !== '0x1') {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const transactionService = {
  // Process Blockchain deposit
  depositBlockchain: async (userId, amount, network, txHash, walletAddress, depositId) => {
    if (
      isNaN(Number(amount)) ||
      Number(amount) <= 0 ||
      !txHash?.trim() ||
      !walletAddress?.trim() ||
      !network?.trim()
    ) {
      throw new Error('Thiếu thông tin yêu cầu giao dịch nạp tiền blockchain.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let existingDep = null;
      if (depositId) {
        let query = {};
        if (typeof depositId === 'number' || !isNaN(Number(depositId))) {
          query = { deposit_id: Number(depositId) };
        } else {
          query = { _id: mongoose.Types.ObjectId.isValid(depositId) ? depositId : null };
        }
        existingDep = await Deposit.findOne(query).session(session);
      }

      if (!existingDep) {
        existingDep = await Deposit.findOne({
          $or: [
            { txHash: txHash },
            { tx_hash: txHash }
          ]
        }).session(session);
      }

      if (!existingDep) {
        throw new Error('Không tìm thấy yêu cầu nạp tiền chờ xử lý tương ứng.');
      }

      if (existingDep.status === 'success') {
        throw new Error('Giao dịch đã được xử lý.');
      }

      const account = await Account.findOne({ user_id: userId }).session(session);
      if (!account) {
        throw new Error('Tài khoản không tồn tại.');
      }

      const expectedReceiver = process.env.RECEIVER_WALLET;
      if (!expectedReceiver) {
        throw new Error('Chưa cấu hình địa chỉ ví nhận trên server.');
      }

      const exchangeRate = parseFloat(process.env.ETH_EXCHANGE_RATE || '75000000');
      const expectedEthAmount = Number(amount) / exchangeRate;
      const rpcUrl = process.env.RPC_URL || 'https://sepolia.drpc.org';

      const isValidTx = await verifyBlockchainTx(txHash, expectedReceiver, expectedEthAmount, rpcUrl);

      if (!isValidTx) {
        existingDep.status = 'failed';
        await existingDep.save({ session });

        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          userId: userId,
          title: 'Giao dịch nạp tiền thất bại',
          content: `Xác minh giao dịch blockchain thất bại. Giao dịch nạp tiền qua MetaMask với hash ${txHash} đã thất bại.`,
          type: 'TRANSACTION',
          link: '/profile/history'
        });

        throw new Error('Xác minh giao dịch blockchain thất bại. Vui lòng kiểm tra lại Hash hoặc số tiền.');
      }

      const numericAmount = Number(amount);
      account.balance += numericAmount;
      await account.save({ session });

      existingDep.status = 'success';
      existingDep.amountVND = numericAmount;
      existingDep.walletAddress = walletAddress.toLowerCase();
      existingDep.network = network;
      existingDep.txHash = txHash;
      existingDep.tx_hash = txHash; // legacy compatibility
      existingDep.amount = numericAmount; // legacy compatibility
      existingDep.fiat_equivalent = numericAmount; // legacy compatibility
      await existingDep.save({ session });

      await session.commitTransaction();

      // Create notification for successful MetaMask deposit
      try {
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          userId: userId,
          title: 'Nạp tiền MetaMask thành công',
          content: `Đã nạp thành công ${numericAmount.toLocaleString('vi-VN')} VNĐ vào ví ảo của bạn thông qua MetaMask. Mã giao dịch (txHash): ${txHash}.`,
          type: 'TRANSACTION',
          link: '/profile/history'
        });
      } catch (err) {
        console.error("Failed to create deposit success notification:", err);
      }

      return {
        balance: account.balance
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  createPendingDeposit: async (userId, amount, network, walletAddress, txHash = '') => {
    const lastDep = await Deposit.findOne().sort({ deposit_id: -1 });
    const nextId = lastDep ? lastDep.deposit_id + 1 : 1;
    const exchangeRate = parseFloat(process.env.ETH_EXCHANGE_RATE || '75000000');
    const numericAmount = Number(amount) || 0;
    const expectedEthAmount = numericAmount / exchangeRate;
    const hashToUse = txHash && txHash.trim() ? txHash.trim() : `pending_dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const dep = await Deposit.create({
      deposit_id: nextId,
      user_id: userId,
      amountVND: numericAmount,
      amountETH: expectedEthAmount.toString(),
      exchangeRate: exchangeRate,
      txHash: hashToUse,
      walletAddress: (walletAddress || '').toLowerCase(),
      network: network || 'Sepolia',
      status: 'pending',
      amount: numericAmount,
      fiat_equivalent: numericAmount,
      tx_hash: hashToUse
    });

    return dep;
  },

  cancelPendingDeposit: async (userId, depositIdOrHash) => {
    let query = { user_id: userId, status: 'pending' };
    if (depositIdOrHash) {
      if (typeof depositIdOrHash === 'number' || !isNaN(Number(depositIdOrHash))) {
        query.$or = [{ deposit_id: Number(depositIdOrHash) }, { txHash: String(depositIdOrHash) }];
      } else {
        query.$or = [
          { txHash: depositIdOrHash },
          { tx_hash: depositIdOrHash },
          { _id: mongoose.Types.ObjectId.isValid(depositIdOrHash) ? depositIdOrHash : null }
        ];
      }
    }

    let dep = await Deposit.findOne(query).sort({ deposit_id: -1 });
    if (!dep) {
      dep = await Deposit.findOne({ user_id: userId, status: 'pending' }).sort({ deposit_id: -1 });
    }

    if (dep) {
      dep.status = 'cancelled';
      await dep.save();

      // Create notification for MetaMask deposit cancellation
      try {
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          userId: userId,
          title: 'Giao dịch nạp tiền đã hủy',
          content: `Yêu cầu nạp tiền ${dep.amountVND.toLocaleString('vi-VN')} VNĐ qua MetaMask đã bị hủy hoặc thất bại.`,
          type: 'TRANSACTION',
          link: '/profile/history'
        });
      } catch (err) {
        console.error("Failed to create deposit cancel notification:", err);
      }

      return dep;
    }
    return null;
  },

  // 1. Process Virtual deposit
  depositFiat: async (userId, amount) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const account = await Account.findOne({ user_id: userId }).session(session);
      if (!account) {
        throw new Error('Tài khoản không tồn tại.');
      }

      // Add balance
      account.balance += amount;
      await account.save({ session });

      // Record deposit transaction
      const lastDep = await Deposit.findOne().sort({ deposit_id: -1 }).session(session);
      const nextId = lastDep ? lastDep.deposit_id + 1 : 1;

      const exchangeRate = parseFloat(process.env.ETH_EXCHANGE_RATE || '75000000');
      const virtualHash = `virtual_fiat_dep_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      const walletAddr = account.wallet_address || 'Virtual Wallet';

      await Deposit.create([{
        deposit_id: nextId,
        user_id: userId,
        amountVND: amount,
        amountETH: '0',
        exchangeRate: exchangeRate,
        txHash: virtualHash,
        walletAddress: walletAddr.toLowerCase(),
        network: 'VietQR',
        status: 'success',

        // legacy compatibility
        amount: amount,
        fiat_equivalent: amount,
        tx_hash: virtualHash
      }], { session });

      await session.commitTransaction();

      // Create notification for fiat deposit
      try {
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          userId: userId,
          title: 'Nạp tiền vào tài khoản thành công',
          content: `Tài khoản của bạn đã được cộng ${amount.toLocaleString('vi-VN')} VNĐ từ giao dịch nạp tiền ảo.`,
          type: 'TRANSACTION',
          link: '/profile/history'
        });
      } catch (err) {
        console.error("Failed to create fiat deposit notification:", err);
      }

      return {
        balance: account.balance
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // 2. Register package via virtual balance (Unified subscriber)
  subscribePackage: async (userId, packageId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const account = await Account.findOne({ user_id: userId }).session(session);
      if (!account) {
        throw new Error('Tài khoản không tồn tại.');
      }

      const pkg = await Package.findOne({ $or: [{ package_id: Number(packageId) }, { id: Number(packageId) }] }).session(session);
      if (!pkg) {
        throw new Error('Gói cước không tồn tại.');
      }

      // Check balance
      if (account.balance < pkg.gia) {
        throw new Error('Số dư tài khoản không đủ. Vui lòng nạp thêm tiền.');
      }

      // Check if already active
      const activeSub = await UserSubscription.findOne({
        userId: userId,
        packageId: pkg.package_id,
        status: 'ACTIVE'
      }).session(session);

      if (activeSub) {
        throw new Error(`Bạn đang sử dụng gói ${pkg.ten} rồi.`);
      }

      const activatedAt = new Date();
      const metadata = subscriptionService.getPkgMetadata(pkg);
      const expiresAt = subscriptionService.calculateExpiryDate(
        activatedAt,
        metadata.duration,
        metadata.cycle_type,
        metadata.validity_mode
      );

      // 1. Create UserSubscription
      await UserSubscription.create([{
        userId: userId,
        packageId: pkg.package_id,
        activatedAt,
        expiresAt,
        cycle: metadata.cycle,
        duration: metadata.duration,
        cycleType: metadata.cycle_type,
        autoRenew: metadata.support_auto_renew,
        status: 'ACTIVE'
      }], { session });

      // 2. Deduct user balance
      account.balance -= pkg.gia;
      await account.save({ session });

      await session.commitTransaction();
      return { 
        balance: account.balance,
        activePackage: {
          packageId: pkg.ma_goi.toLowerCase(),
          activatedAt: activatedAt.toISOString(),
          expiresAt: expiresAt.toISOString()
        }
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // 3. Unsubscribe package
  unsubscribePackage: async (userId, packageIdStr) => {
    const pkgCode = packageIdStr.toUpperCase();
    const pkg = await Package.findOne({ ma_goi: pkgCode });
    if (!pkg) {
      throw new Error(`Gói cước ${pkgCode} không tồn tại.`);
    }

    const sub = await UserSubscription.findOne({
      userId: userId,
      packageId: pkg.package_id,
      status: 'ACTIVE'
    });

    if (!sub) {
      throw new Error(`Bạn hiện không kích hoạt sử dụng gói cước ${pkgCode}.`);
    }

    sub.status = 'CANCELLED';
    await sub.save();

    // Create notification for unsubscribe
    try {
      const notificationService = require('./notificationService');
      await notificationService.createNotification({
        userId: userId,
        title: 'Hủy gói cước thành công',
        content: `Bạn đã hủy thành công gói cước ${pkg.ten} (${pkg.ma_goi}).`,
        type: 'SUBSCRIPTION',
        link: '/profile/subscriptions'
      });
    } catch (err) {
      console.error("Failed to create unsubscribe notification:", err);
    }

    return true;
  },

  // 4. Merge deposits & subscriptions into user transactions (Soft-delete aware)
  getTransactionsForUser: async (userId) => {
    const userDeposits = await Deposit.find({ user_id: userId, isDeleted: { $ne: true } });
    const userSubs = await UserSubscription.find({ userId: userId, isDeleted: { $ne: true } });

    const packages = await Package.find({});
    const pkgMap = new Map();
    for (const p of packages) {
      pkgMap.set(p.package_id, p);
    }

    const txs = [];

    // Map deposits (Cộng tiền)
    for (const dep of userDeposits) {
      const amt = dep.amountVND || parseFloat(dep.fiat_equivalent ? dep.fiat_equivalent.toString() : '0') || dep.amount || 0;
      txs.push({
        id: `tx_dep_${dep.deposit_id || dep._id}`,
        userId: String(dep.user_id),
        type: 'deposit',
        direction: 'PLUS',
        amount: amt,
        paymentMethod: dep.network || 'VietQR',
        status: dep.status || 'success',
        createdAt: dep.created_at || (dep._id ? dep._id.getTimestamp().toISOString() : new Date().toISOString()),
        txHash: dep.txHash || dep.tx_hash || '',
        walletAddress: dep.walletAddress || '',
        exchangeRate: dep.exchangeRate || null,
        network: dep.network || '',
        amountETH: dep.amountETH || '',
        description: dep.txHash && dep.txHash.startsWith('0x') ? `Nạp tiền MetaMask (${dep.network || 'Sepolia'})` : 'Nạp tiền vào tài khoản'
      });
    }

    // Map subscriptions (Trừ tiền: Mua gói / Gia hạn)
    for (const sub of userSubs) {
      const pkg = pkgMap.get(sub.packageId);
      const pkgName = pkg ? (pkg.ten || pkg.ma_goi) : `Gói cước ID ${sub.packageId}`;
      const pkgCode = pkg ? (pkg.ma_goi || pkg.ten) : `PKG_${sub.packageId}`;
      const pkgPrice = pkg ? (pkg.gia || 0) : 0;
      const subTime = sub.activatedAt || sub.registeredAt || sub.createdAt || new Date();

      txs.push({
        id: `tx_sub_${sub._id}`,
        userId: String(sub.userId),
        type: 'purchase',
        direction: 'MINUS',
        amount: pkgPrice,
        packageName: pkgName,
        paymentMethod: 'Số dư tài khoản',
        status: sub.status === 'CANCELLED' ? 'cancelled' : 'success',
        createdAt: typeof subTime === 'string' ? subTime : new Date(subTime).toISOString(),
        txHash: pkgCode.toUpperCase(),
        description: `Thanh toán gói cước ${pkgName} (${pkgCode.toUpperCase()})`
      });
    }

    // Sort by Date descending
    txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return txs;
  },

  // Soft delete all transaction records for user
  clearAllTransactions: async (userId) => {
    const now = new Date();
    await Deposit.updateMany(
      { user_id: userId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: now } }
    );
    await UserSubscription.updateMany(
      { userId: userId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: now } }
    );
    return true;
  },

  // 5. Statistics for Admin Dashboard
  getAdminDashboardStats: async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const [
      totalUsersCount,
      totalPackagesCount,
      revenueAgg,
      totalSubscriptionsCount,
      latestDeposits,
      latestSubs,
      recentDepositsForChart
    ] = await Promise.all([
      Account.countDocuments(),
      Package.countDocuments(),
      Deposit.aggregate([
        { $match: { status: 'success', isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amountVND' } } }
      ]),
      UserSubscription.countDocuments(),
      Deposit.find().sort({ deposit_id: -1 }).limit(10),
      UserSubscription.find().sort({ createdAt: -1 }).limit(10),
      Deposit.find({
        status: 'success',
        isDeleted: { $ne: true },
        created_at: { $gte: sevenDaysAgoStr }
      })
    ]);

    const totalRevenueVal = revenueAgg[0] ? revenueAgg[0].total : 0;

    const merged = [];

    for (const dep of latestDeposits) {
      const user = await Account.findOne({ user_id: dep.user_id });
      merged.push({
        id: `tx_dep_${dep.deposit_id}`,
        type: 'deposit',
        phoneNumber: user ? user.phone_number : '',
        fullname: user ? user.fullname : '',
        amount: dep.amountVND || parseFloat(dep.fiat_equivalent ? dep.fiat_equivalent.toString() : '0') || 0,
        paymentMethod: dep.network || 'VietQR',
        status: dep.status || 'success',
        createdAt: dep.created_at,
        txHash: dep.txHash || dep.tx_hash || ''
      });
    }

    for (const sub of latestSubs) {
      const user = await Account.findOne({ user_id: sub.userId });
      const pkg = await Package.findOne({ $or: [{ package_id: sub.packageId }, { id: sub.packageId }] });
      merged.push({
        id: `tx_sub_${sub._id}`,
        type: 'subscribe',
        phoneNumber: user ? user.phone_number : '',
        fullname: user ? user.fullname : '',
        amount: pkg ? pkg.gia : 0,
        packageName: pkg ? pkg.ten : 'Gói cước',
        status: 'success',
        createdAt: sub.activatedAt || sub.createdAt || new Date()
      });
    }

    // Sort and slice top 10
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentTransactions = merged.slice(0, 10);

    // Calculate revenue trends for the last 7 days (including today)
    const revenueTrends = [];
    const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = weekdayNames[d.getDay()];
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const dayRevenue = recentDepositsForChart.reduce((sum, curr) => {
        if (!curr.created_at) return sum;
        const depDate = new Date(curr.created_at);
        if (depDate >= startOfDay && depDate <= endOfDay) {
          const fiat = curr.amountVND || parseFloat(curr.fiat_equivalent ? curr.fiat_equivalent.toString() : '0') || 0;
          return sum + fiat;
        }
        return sum;
      }, 0);

      revenueTrends.push({ label, val: dayRevenue });
    }

    return {
      totalUsersCount,
      totalPackagesCount,
      totalRevenueVal,
      totalSubscriptionsCount,
      recentTransactions,
      revenueTrends
    };
  },

  getAdminStatsCards: async () => {
    const [
      totalUsersCount,
      totalPackagesCount,
      revenueAgg,
      totalSubscriptionsCount
    ] = await Promise.all([
      Account.countDocuments(),
      Package.countDocuments(),
      Deposit.aggregate([
        { $match: { status: 'success', isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amountVND' } } }
      ]),
      UserSubscription.countDocuments()
    ]);
    const totalRevenueVal = revenueAgg[0] ? revenueAgg[0].total : 0;
    return {
      totalUsersCount,
      totalPackagesCount,
      totalRevenueVal,
      totalSubscriptionsCount
    };
  },

  getAdminRevenueTrends: async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const trendsAgg = await Deposit.aggregate([
      {
        $match: {
          status: 'success',
          isDeleted: { $ne: true },
          created_at: { $gte: sevenDaysAgoStr }
        }
      },
      {
        $project: {
          amountVND: 1,
          fiat_equivalent: 1,
          dateStr: { $substr: ['$created_at', 0, 10] }
        }
      },
      {
        $group: {
          _id: '$dateStr',
          total: { 
            $sum: {
              $cond: [
                { $gt: ['$amountVND', 0] },
                '$amountVND',
                { $toDouble: '$fiat_equivalent' }
              ]
            }
          }
        }
      }
    ]);

    const trendsMap = new Map();
    trendsAgg.forEach(t => {
      trendsMap.set(t._id, t.total);
    });

    const revenueTrends = [];
    const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = weekdayNames[d.getDay()];
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${date}`;

      const dayRevenue = trendsMap.get(dateKey) || 0;
      revenueTrends.push({ label, val: dayRevenue });
    }
    return revenueTrends;
  },

  getAdminRecentTransactions: async (page = 1, limit = 5, clientTotalItems = null) => {
    const queryLimit = page * limit;
    let totalDeposits = 0;
    let totalSubs = 0;

    if (clientTotalItems === null || clientTotalItems === undefined || page === 1) {
      const [countD, countS] = await Promise.all([
        Deposit.countDocuments({ isDeleted: { $ne: true } }),
        UserSubscription.countDocuments({ isDeleted: { $ne: true } })
      ]);
      totalDeposits = countD;
      totalSubs = countS;
    }

    const [latestDeposits, latestSubs] = await Promise.all([
      Deposit.find({ isDeleted: { $ne: true } })
        .select('deposit_id user_id amountVND fiat_equivalent network status created_at txHash tx_hash')
        .sort({ deposit_id: -1 })
        .limit(queryLimit)
        .lean(),
      UserSubscription.find({ isDeleted: { $ne: true } })
        .select('userId packageId status activatedAt createdAt')
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .lean()
    ]);

    const merged = [];

    for (const dep of latestDeposits) {
      const user = await Account.findOne({ user_id: dep.user_id }).select('phone_number fullname').lean();
      merged.push({
        id: `tx_dep_${dep.deposit_id}`,
        type: 'deposit',
        phoneNumber: user ? user.phone_number : '',
        fullname: user ? user.fullname : '',
        amount: dep.amountVND || parseFloat(dep.fiat_equivalent ? dep.fiat_equivalent.toString() : '0') || 0,
        paymentMethod: dep.network || 'VietQR',
        status: dep.status || 'success',
        createdAt: dep.created_at,
        txHash: dep.txHash || dep.tx_hash || ''
      });
    }

    for (const sub of latestSubs) {
      const user = await Account.findOne({ user_id: sub.userId }).select('phone_number fullname').lean();
      const pkg = await Package.findOne({ $or: [{ package_id: sub.packageId }, { id: sub.packageId }] }).select('gia ten').lean();
      merged.push({
        id: `tx_sub_${sub._id}`,
        type: 'subscribe',
        phoneNumber: user ? user.phone_number : '',
        fullname: user ? user.fullname : '',
        amount: pkg ? pkg.gia : 0,
        packageName: pkg ? pkg.ten : 'Gói cước',
        status: 'success',
        createdAt: sub.activatedAt || sub.createdAt || new Date()
      });
    }

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const startIdx = (page - 1) * limit;
    const paginatedTransactions = merged.slice(startIdx, startIdx + limit);
    const totalItems = clientTotalItems !== null && clientTotalItems !== undefined ? parseInt(clientTotalItems) : (totalDeposits + totalSubs);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      transactions: paginatedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    };
  },

  getAdminDeposits: async ({ page = 1, limit = 10, status = '', search = '' }) => {
    const skip = (page - 1) * limit;

    const mongoQuery = {};
    
    if (status) {
      mongoQuery.status = status;
    }

    if (search.trim()) {
      const searchKeyword = search.trim();
      
      if (/^[0-9+]+$/.test(searchKeyword)) {
        const matchingAccounts = await Account.find({
          phone_number: new RegExp(searchKeyword, 'i')
        }).select('user_id').lean();
        
        const userIds = matchingAccounts.map(acc => acc.user_id);
        mongoQuery.$or = [
          { user_id: { $in: userIds } },
          { txHash: new RegExp(searchKeyword, 'i') }
        ];
      } else {
        mongoQuery.txHash = new RegExp(searchKeyword, 'i');
      }
    }

    const [totalItems, rawDeposits] = await Promise.all([
      Deposit.countDocuments(mongoQuery),
      Deposit.find(mongoQuery)
        .sort({ deposit_id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const deposits = [];
    for (const dep of rawDeposits) {
      const user = await Account.findOne({ user_id: dep.user_id }).select('phone_number fullname').lean();
      deposits.push({
        deposit_id: dep.deposit_id,
        user_id: dep.user_id,
        phoneNumber: user ? user.phone_number : 'Không rõ',
        fullname: user ? user.fullname : 'Không rõ',
        amountVND: dep.amountVND || parseFloat(dep.fiat_equivalent ? dep.fiat_equivalent.toString() : '0') || 0,
        amountETH: dep.amountETH || (dep.amount ? dep.amount.toString() : '0'),
        txHash: dep.txHash || dep.tx_hash || '',
        network: dep.network || 'VietQR',
        status: dep.status || 'success',
        isDeleted: dep.isDeleted || false,
        created_at: dep.created_at
      });
    }

    const totalPages = Math.ceil(totalItems / limit);

    return {
      deposits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    };
  }
};

// Help crypto require inside module
const crypto = require('crypto');

module.exports = transactionService;
