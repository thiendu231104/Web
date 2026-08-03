const Account = require('../models/Account');
const UserSubscription = require('../models/UserSubscription');
const Package = require('../models/Package');

const userService = {
  getAllUsers: async (options = {}) => {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const search = options.search || '';
    const skip = (page - 1) * limit;

    const mongoQuery = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      mongoQuery.$or = [
        { fullname: regex },
        { phone_number: regex },
        { email: regex }
      ];
    }

    const totalItems = await Account.countDocuments(mongoQuery);
    const accounts = await Account.find(mongoQuery)
      .sort({ user_id: 1 })
      .skip(skip)
      .limit(limit);

    const users = [];
    const now = new Date();

    for (const acc of accounts) {
      // Find active subscriptions
      const activeSubs = await UserSubscription.find({ 
        userId: acc.user_id, 
        status: 'ACTIVE',
        expiresAt: { $gt: now }
      });

      const activePackages = [];
      for (const sub of activeSubs) {
        const pkg = await Package.findOne({ $or: [{ package_id: sub.packageId }, { id: sub.packageId }] });
        if (pkg) {
          activePackages.push({
            packageId: pkg.ma_goi.toLowerCase(),
            activatedAt: sub.activatedAt,
            expiresAt: sub.expiresAt
          });
        }
      }

      users.push({
        id: String(acc.user_id),
        name: acc.fullname,
        phoneNumber: acc.phone_number,
        email: acc.email || '',
        balance: acc.balance,
        role: acc.role === 'admin' ? 'admin' : 'customer',
        subscription_type: acc.subscription_type || 'tra_truoc',
        is_loyal_customer: acc.is_loyal_customer || false,
        status: acc.status || 'active',
        created_at: acc.created_at || '',
        activePackages
      });
    }

    return {
      users,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    };
  },

  updateUser: async (userId, data) => {
    const numericUserId = parseInt(userId);
    const account = await Account.findOne({ user_id: numericUserId });
    if (!account) {
      throw new Error(`Không tìm thấy tài khoản với ID ${userId}`);
    }

    if (data.subscription_type !== undefined) {
      if (['tra_truoc', 'tra_sau'].includes(data.subscription_type)) {
        account.subscription_type = data.subscription_type;
      } else {
        throw new Error('Loại thuê bao không hợp lệ.');
      }
    }

    if (data.is_loyal_customer !== undefined) {
      account.is_loyal_customer = !!data.is_loyal_customer;
    }

    if (data.status !== undefined) {
      if (['active', 'blocked', 'pending'].includes(data.status)) {
        account.status = data.status;
      } else {
        throw new Error('Trạng thái tài khoản không hợp lệ.');
      }
    }

    if (data.balance !== undefined) {
      const parsedBalance = parseFloat(data.balance);
      if (isNaN(parsedBalance) || parsedBalance < 0) {
        throw new Error('Số dư không hợp lệ.');
      }
      account.balance = parsedBalance;
    }

    await account.save();
    return {
      id: String(account.user_id),
      name: account.fullname,
      phoneNumber: account.phone_number,
      email: account.email || '',
      balance: account.balance,
      role: account.role === 'admin' ? 'admin' : 'customer',
      subscription_type: account.subscription_type || 'tra_truoc',
      is_loyal_customer: account.is_loyal_customer || false,
      status: account.status || 'active',
      created_at: account.created_at || ''
    };
  },

  updateUserBalance: async (userId, balance) => {
    const numericUserId = parseInt(userId);
    const account = await Account.findOne({ user_id: numericUserId });
    if (!account) {
      throw new Error(`Không tìm thấy tài khoản với ID ${userId} để cập nhật số dư.`);
    }

    account.balance = balance;
    await account.save();
    return account;
  }
};

module.exports = userService;
