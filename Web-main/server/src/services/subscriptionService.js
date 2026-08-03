const UserSubscription = require('../models/UserSubscription');
const Package = require('../models/Package');
const Account = require('../models/Account');
const mongoose = require('mongoose');
const { getVirtualDate } = require('../utils/virtualTime');

const formatNotificationDate = (date) => {
  if (!date) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const DD = pad(date.getDate());
  const MM = pad(date.getMonth() + 1);
  const YYYY = date.getFullYear();
  return `${hh}:${mm} - ${DD}/${MM}/${YYYY}`;
};

// Auto-migrate package metadata if not present
(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await runMetadataMigration();
    } else {
      mongoose.connection.once('open', async () => {
        await runMetadataMigration();
      });
    }
  } catch (err) {
    console.error("Error setting up metadata migration listener:", err);
  }
})();

async function runMetadataMigration() {
  try {
    const pkgs = await Package.find({});
    let updatedCount = 0;
    for (const pkg of pkgs) {
      const updates = {};
      if (!pkg.cycle_type) {
        const days = parseInt(pkg.chu_ky_ngay || '30', 10);
        updates.cycle_type = days < 30 ? 'DAY' : 'MONTH';
      }
      if (!pkg.service_group) {
        const cat = (pkg.phan_loai_goi || 'Data').toLowerCase();
        if (cat === 'combo') updates.service_group = 'COMBO';
        else if (cat === 'social' || cat === 'mxh') updates.service_group = 'SOCIAL';
        else if (cat === 'thoại') updates.service_group = 'VOICE';
        else updates.service_group = 'daily_data';
      }
      if (!pkg.registration_policy) {
        updates.registration_policy = 'ALLOW';
      }

      if (Object.keys(updates).length > 0) {
        await Package.updateOne({ _id: pkg._id }, { $set: updates });
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      console.log(`Successfully migrated ${updatedCount} packages with missing metadata.`);
    }
  } catch (err) {
    console.error("Error migrating package metadata:", err);
  }
}

// ─── Utility functions used by conflict helpers and registerSubscription ─────

const calculateExpiryDate = (activatedAt, duration, cycleType, validityMode) => {
  const date = new Date(activatedAt);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid activatedAt date');
  }

  date.setDate(date.getDate() + duration);

  if (validityMode === 'END_OF_DAY') {
    const localTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    localTime.setUTCHours(23, 59, 59, 999);
    return new Date(localTime.getTime() - 7 * 60 * 60 * 1000);
  }

  return date;
};

const getPkgMetadata = (pkg) => {
  const duration = pkg.duration !== undefined ? pkg.duration : parseInt(pkg.chu_ky_ngay || '30', 10);

  let cycle = 'MONTH';
  if (duration < 30) {
    cycle = 'DAY';
  } else if (duration >= 360) {
    cycle = 'YEAR';
  }

  const cycle_type = pkg.cycle_type || `${cycle}_${duration}`;
  const support_auto_renew = pkg.support_auto_renew !== undefined ? pkg.support_auto_renew : (cycle !== 'DAY');
  const validity_mode = pkg.validity_mode || (cycle === 'DAY' ? 'END_OF_DAY' : 'SAME_TIME');
  const registration_policy = pkg.registration_policy || 'REPLACE';

  let service_group = pkg.service_group;
  if (!service_group) {
    const cat = pkg.phan_loai_goi || 'Data';
    if (cat.toLowerCase() === 'combo') {
      service_group = 'COMBO';
    } else if (cat.toLowerCase() === 'social') {
      service_group = 'SOCIAL';
    } else if (cat.toLowerCase() === 'thoại') {
      service_group = 'VOICE';
    } else {
      service_group = 'DATA';
    }
  }

  return {
    package_id: pkg.package_id,
    cycle,
    duration,
    cycle_type,
    support_auto_renew,
    validity_mode,
    service_group,
    registration_policy
  };
};

const subscriptionService = {
  /**
   * Kiểm tra xung đột trước khi đăng ký gói cước theo Quy tắc Viettel Business Rules.
   */
  checkSubscriptionConflict: async (userId, packageId, session = null) => {
    // 1. KIỂM TRA TRẠNG THÁI TÀI KHOẢN & NGƯỜI DÙNG
    const account = await Account.findOne({ user_id: userId }).session(session);
    if (!account) {
      throw new Error('Người dùng không tồn tại.');
    }

    if (account.status === 'blocked') {
      return {
        action: 'REJECT',
        message: 'Tài khoản của bạn đã bị khóa.'
      };
    }

    // Lấy thông tin gói cước cần kiểm tra
    let pkg = await Package.findOne({ package_id: Number(packageId) }).session(session);
    if (!pkg) {
      pkg = await Package.findOne({ $or: [{ package_id: Number(packageId) }, { id: Number(packageId) }] }).session(session);
    }
    if (!pkg) {
      pkg = await Package.findOne({ ma_goi: new RegExp(`^${packageId}$`, 'i') }).session(session);
    }
    if (!pkg) {
      throw new Error('Gói cước không tồn tại.');
    }

    // BƯỚC 1.1: Kiểm tra Số dư ví tài khoản
    if (account.balance < pkg.gia) {
      return {
        action: 'REJECT',
        message: `Số dư tài khoản (${account.balance.toLocaleString('vi-VN')}đ) không đủ để đăng ký gói cước ${pkg.ten} (${pkg.gia.toLocaleString('vi-VN')}đ).`
      };
    }

    // BƯỚC 1.2: Lấy danh sách tất cả các gói cước đang ACTIVE của userId
    const now = getVirtualDate();
    const activeSubs = await UserSubscription.find({
      userId: userId,
      status: 'ACTIVE',
      expiresAt: { $gt: now },
      isDeleted: { $ne: true }
    }).session(session);

    // BƯỚC 1.3: Kiểm tra Trùng chính gói cước (Exact Duplicate: ma_goi hoặc package_id)
    const exactSub = activeSubs.find(sub => sub.packageId === pkg.package_id);
    if (exactSub) {
      const days = parseInt(String(pkg.chu_ky_ngay || '30'), 10);
      const isShortTerm = days < 30;

      if (isShortTerm) {
        return {
          action: 'RENEW_SHORT',
          message: 'Đăng ký lại thành công. Ưu đãi và thời gian sử dụng đã được cấp mới.',
          exactSubId: exactSub._id,
          hasActive: true
        };
      } else {
        return {
          action: 'REJECT',
          message: 'Quý khách đang sử dụng gói cước này. Vui lòng đợi hết chu kỳ hoặc hủy gói trước khi đăng ký lại.',
          hasActive: true
        };
      }
    }

    // Lọc các gói cước đang hoạt động
    const filteredActiveSubs = activeSubs;
    if (filteredActiveSubs.length === 0) {
      if (pkg.requires_base_package === true) {
        return {
          action: 'REJECT',
          message: 'Gói cước này yêu cầu thuê bao phải đang sử dụng một gói cước Data nền hoặc Combo đang hoạt động.',
          hasActive: false
        };
      }
      return {
        action: 'ALLOW',
        message: 'Gói cước có thể sử dụng song song.',
        hasActive: false
      };
    }

    // Lấy chi tiết thông tin các gói đang active trong 1 query
    const activePkgIds = filteredActiveSubs.map(s => s.packageId);
    const activePkgs = await Package.find({ package_id: { $in: activePkgIds } }).session(session);
    const pkgMap = new Map();
    for (const p of activePkgs) {
      pkgMap.set(p.package_id, p);
    }

    // BƯỚC 1.4: Kiểm tra Yêu cầu gói nền (requires_base_package === true)
    if (pkg.requires_base_package === true) {
      const hasBase = filteredActiveSubs.some(sub => {
        const activePkg = pkgMap.get(sub.packageId);
        if (!activePkg) return false;
        const sysType = (activePkg.system_type || '').toUpperCase().trim();
        return ['DATA_BASE', 'COMBO'].includes(sysType);
      });
      if (!hasBase) {
        return {
          action: 'REJECT',
          message: 'Gói cước này yêu cầu thuê bao phải đang sử dụng một gói cước Data nền hoặc Combo đang hoạt động.',
          hasActive: true
        };
      }
    }

    // BƯỚC 1.5: Kiểm tra Cờ Add-on (is_addon === true)
    const isAddonPkg = pkg.is_addon === true || ['ADD_ON', 'ADDON'].includes((pkg.system_type || '').toUpperCase().trim());
    if (isAddonPkg) {
      return {
        action: 'ALLOW',
        message: 'Gói cước mua thêm (Add-on) có thể đăng ký sử dụng song song.',
        hasActive: true
      };
    }

    // BƯỚC 1.6: BẮT BUỘC KIỂM TRA TRÙNG BENEFIT_GROUP TRƯỚC
    const newGroup = (pkg.benefit_group || '').toUpperCase().trim();
    const newDays = parseInt(String(pkg.chu_ky_ngay || '30'), 10);

    let finalAction = 'ALLOW';
    let finalMessage = 'Gói cước có thể sử dụng song song.';
    const replaceSubscriptions = [];

    for (const sub of filteredActiveSubs) {
      const activePkg = pkgMap.get(sub.packageId);
      if (!activePkg) continue;

      const activeGroup = (activePkg.benefit_group || '').toUpperCase().trim();
      const activeDays = parseInt(String(activePkg.chu_ky_ngay || '30'), 10);

      // So sánh nhóm ưu đãi (benefit_group):
      const isSameBenefitGroup = newGroup && activeGroup && newGroup === activeGroup;

      if (isSameBenefitGroup) {
        if (newDays > activeDays) {
          // 2a. Nếu gói mới có chu kỳ DÀI HƠN gói cũ -> Cho phép NÂNG CẤP THAY THẾ (REPLACE)
          replaceSubscriptions.push({
            subscriptionId: sub._id,
            packageId: activePkg.package_id,
            packageName: activePkg.ten,
            packageCode: activePkg.ma_goi
          });
          finalAction = 'REPLACE';
          finalMessage = `Đăng ký thành công. Gói ${pkg.ma_goi} đã thay thế gói ${activePkg.ma_goi} trước đó.`;
        } else {
          // 2b. Nếu gói mới có chu kỳ BẰNG HOẶC NGẮN HƠN gói cũ -> TỪ CHỐI (REJECT)
          return {
            action: 'REJECT',
            message: `Quý khách đang sử dụng gói ${activePkg.ma_goi} cùng nhóm ưu đãi có chu kỳ tương đương hoặc dài hơn.`,
            hasActive: true
          };
        }
      }
    }

    if (finalAction === 'REPLACE') {
      return {
        action: 'REPLACE',
        message: finalMessage,
        replaceSubscriptions,
        hasActive: true
      };
    }

    // 3. NẾU KHÁC BENEFIT_GROUP -> CHO PHÉP ĐĂNG KÝ SONG SONG (ALLOW)
    return {
      action: 'ALLOW',
      message: finalMessage,
      hasActive: filteredActiveSubs.length > 0
    };
  },

  registerSubscription: async (userId, packageId, cycle) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const conflictResult = await subscriptionService.checkSubscriptionConflict(userId, packageId, session);
      if (conflictResult.action === 'REJECT') {
        throw new Error(conflictResult.message);
      }

      let pkg = await Package.findOne({ package_id: Number(packageId) }).session(session);
      if (!pkg) {
        pkg = await Package.findOne({ $or: [{ package_id: Number(packageId) }, { id: Number(packageId) }] }).session(session);
      }
      if (!pkg) {
        pkg = await Package.findOne({ ma_goi: new RegExp(`^${packageId}$`, 'i') }).session(session);
      }
      if (!pkg) {
        throw new Error('Gói cước không tồn tại.');
      }

      const account = await Account.findOne({ user_id: userId }).session(session);
      if (!account) {
        throw new Error('Tài khoản không tồn tại.');
      }
      if (account.balance < pkg.gia) {
        throw new Error('Số dư tài khoản không đủ.');
      }

      const now = getVirtualDate();
      const metadata = getPkgMetadata(pkg);
      const expiresAt = calculateExpiryDate(
        now,
        metadata.duration,
        metadata.cycle_type,
        metadata.validity_mode
      );

      let returnedSub = null;

      if (conflictResult.action === 'RENEW_SHORT') {
        const oldSub = await UserSubscription.findById(conflictResult.exactSubId).session(session);
        if (!oldSub) {
          throw new Error('Không tìm thấy gói cước đang hoạt động để gia hạn.');
        }
        oldSub.status = 'EXPIRED';
        await oldSub.save({ session });

        account.balance -= pkg.gia;
        await account.save({ session });

        const newSub = new UserSubscription({
          userId: userId,
          packageId: pkg.package_id,
          registeredAt: now,
          activatedAt: now,
          startedAt: now,
          expiresAt: expiresAt,
          status: 'ACTIVE',
          autoRenew: pkg.is_auto_renew !== undefined ? pkg.is_auto_renew : true,
          cycle: metadata.cycle,
          duration: metadata.duration,
          cycleType: metadata.cycle_type
        });
        await newSub.save({ session });

        returnedSub = newSub;
      } else {
        account.balance -= pkg.gia;
        await account.save({ session });

        const newSub = new UserSubscription({
          userId: userId,
          packageId: pkg.package_id,
          registeredAt: now,
          activatedAt: now,
          startedAt: now,
          expiresAt: expiresAt,
          status: 'ACTIVE',
          autoRenew: pkg.is_auto_renew !== undefined ? pkg.is_auto_renew : true,
          cycle: metadata.cycle,
          duration: metadata.duration,
          cycleType: metadata.cycle_type
        });
        await newSub.save({ session });

        if (conflictResult.action === 'REPLACE' && conflictResult.replaceSubscriptions) {
          const subIdsToReplace = conflictResult.replaceSubscriptions.map(s => s.subscriptionId);
          await UserSubscription.updateMany(
            { _id: { $in: subIdsToReplace } },
            {
              $set: {
                status: 'REPLACED',
                replacedAt: now,
                replacedBySubscriptionId: newSub._id
              }
            },
            { session }
          );
        }

        returnedSub = newSub;
      }

      await session.commitTransaction();

      // Create notification after successful registration/replacement
      try {
        const notificationService = require('./notificationService');
        if (conflictResult.action === 'REPLACE' && conflictResult.replaceSubscriptions) {
          const replacedCodes = conflictResult.replaceSubscriptions.map(s => s.packageCode).join(', ');
          await notificationService.createNotification({
            userId: userId,
            title: 'Chuyển đổi gói cước thành công',
            content: `Bạn đã chuyển đổi thành công sang gói cước mới ${pkg.ten} (${pkg.ma_goi}) thay thế cho gói cước cũ (${replacedCodes}). Phí đăng ký ${pkg.gia.toLocaleString('vi-VN')} VNĐ.`,
            type: 'SUBSCRIPTION',
            link: '/profile/subscriptions'
          });
        } else {
          const isRenew = conflictResult.action === 'RENEW_SHORT';
          await notificationService.createNotification({
            userId: userId,
            title: isRenew ? 'Gia hạn gói cước thành công' : 'Đăng ký gói cước thành công',
            content: isRenew 
              ? `Bạn đã gia hạn thành công gói cước ${pkg.ten} (${pkg.ma_goi}). Phí gia hạn ${pkg.gia.toLocaleString('vi-VN')} VNĐ.` 
              : `Bạn đã đăng ký thành công gói cước ${pkg.ten} (${pkg.ma_goi}). Phí đăng ký ${pkg.gia.toLocaleString('vi-VN')} VNĐ.`,
            type: 'SUBSCRIPTION',
            link: '/profile/subscriptions'
          });
        }
      } catch (notifErr) {
        console.error("Failed to create registration/replacement notification:", notifErr);
      }

      const subObj = returnedSub.toObject();
      if (conflictResult.action === 'RENEW_SHORT') {
        subObj.message = 'Đăng ký lại thành công. Ưu đãi và thời gian sử dụng đã được cấp mới.';
      }

      return { subscription: subObj, account, pkg };

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  },

  getActiveSubscriptions: async (userId) => {
    await processAutoRenewals().catch(err => console.error("Real-time auto renewal process failed:", err));
    const now = getVirtualDate();
    return await UserSubscription.find({
      userId: userId,
      status: 'ACTIVE',
      expiresAt: { $gt: now },
      isDeleted: { $ne: true }
    });
  },

  getSubscriptionHistory: async (userId) => {
    await processAutoRenewals().catch(err => console.error("Real-time auto renewal process failed:", err));
    return await UserSubscription.find({
      userId: userId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 });
  },

  cancelSubscription: async (userId, subscriptionId) => {
    const sub = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId,
      status: 'ACTIVE',
      isDeleted: { $ne: true }
    });

    if (!sub) {
      throw new Error('Không tìm thấy gói cước đang hoạt động.');
    }

    sub.status = 'CANCELLED';
    sub.autoRenew = false;
    sub.cancelledAt = getVirtualDate();
    await sub.save();

    // Create cancel notification
    try {
      let pkg = await Package.findOne({ package_id: sub.packageId });
      if (!pkg) {
        pkg = await Package.findOne({ $or: [{ package_id: Number(sub.packageId) }, { id: Number(sub.packageId) }] });
      }
      if (pkg) {
        const notificationService = require('./notificationService');
        await notificationService.createNotification({
          userId: userId,
          title: 'Hủy gói cước thành công',
          content: `Bạn đã hủy thành công gói cước ${pkg.ten} (${pkg.ma_goi}).`,
          type: 'SUBSCRIPTION',
          link: '/profile/subscriptions'
        });
      }
    } catch (err) {
      console.error("Failed to create cancel subscription notification:", err);
    }

    return sub;
  },

  updateAutoRenew: async (userId, subscriptionId, autoRenew) => {
    const sub = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: userId,
      status: 'ACTIVE',
      isDeleted: { $ne: true }
    });

    if (!sub) {
      throw new Error('Không tìm thấy gói cước đang hoạt động.');
    }

    sub.autoRenew = autoRenew;
    await sub.save();

    // Create Notification
    try {
      let pkg = await Package.findOne({ package_id: sub.packageId });
      if (!pkg) {
        pkg = await Package.findOne({ $or: [{ package_id: Number(sub.packageId) }, { id: Number(sub.packageId) }] });
      }
      if (pkg) {
        const formattedDate = formatNotificationDate(sub.expiresAt);
        const notificationService = require('./notificationService');
        if (autoRenew === false) {
          await notificationService.createNotification({
            userId: userId,
            title: 'Đã tắt tự động gia hạn',
            content: `Bạn đã TẮT tính năng tự động gia hạn cho gói ${pkg.ma_goi}. Gói cước sẽ tự động hủy khi hết hạn vào ${formattedDate}.`,
            type: 'SUBSCRIPTION',
            link: '/profile?tab=subscriptions',
            subscriptionId: sub._id
          });
        } else {
          await notificationService.createNotification({
            userId: userId,
            title: 'Đã bật tự động gia hạn',
            content: `Bạn đã BẬT lại tự động gia hạn cho gói ${pkg.ma_goi}. Hệ thống sẽ tự động gia hạn vào ${formattedDate} nếu số dư đủ ${pkg.gia.toLocaleString('vi-VN')}đ.`,
            type: 'SUBSCRIPTION',
            link: '/profile?tab=subscriptions',
            subscriptionId: sub._id
          });
        }
      }
    } catch (err) {
      console.error("Failed to create autoRenew change notification:", err);
    }

    return sub;
  },

  clearSubscriptionHistory: async (userId) => {
    const now = getVirtualDate();
    return await UserSubscription.updateMany(
      {
        userId: userId,
        isDeleted: { $ne: true },
        $or: [
          { status: { $in: ['CANCELLED', 'EXPIRED', 'REPLACED'] } },
          { status: 'ACTIVE', expiresAt: { $lte: now } }
        ]
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now
        }
      }
    );
  },

  deleteSubscriptionHistoryItem: async (userId, subscriptionId) => {
    const now = getVirtualDate();
    return await UserSubscription.updateOne(
      {
        _id: subscriptionId,
        userId: userId
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now
        }
      }
    );
  }
};

const cleanDuplicateNotifications = async () => {
  try {
    const Notification = require('../models/Notification');
    const notifications = await Notification.find({
      type: 'SUBSCRIPTION',
      title: { $in: ['Nhắc nhở gia hạn gói cước', 'Cảnh báo số dư không đủ gia hạn'] }
    });

    const seen = new Set();
    const toDelete = [];

    for (const notif of notifications) {
      const match = notif.content.match(/Gói cước\s+([A-Z0-9_]+)/i);
      const pkgCode = match ? match[1].toUpperCase() : '';
      const key = notif.subscriptionId 
        ? `${notif.subscriptionId}_${notif.title}` 
        : `${notif.userId}_${pkgCode}_${notif.title}`;
      if (seen.has(key)) {
        toDelete.push(notif._id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      await Notification.deleteMany({ _id: { $in: toDelete } });
      console.log(`Cleaned up ${toDelete.length} duplicate warning/reminder notifications from database.`);
    }
  } catch (err) {
    console.error("Failed to clean duplicate notifications:", err);
  }
};

const processAutoRenewals = async () => {
  await cleanDuplicateNotifications().catch(() => {});
  const now = getVirtualDate();
  const activeSubs = await UserSubscription.find({ status: 'ACTIVE', isDeleted: { $ne: true } });

  // Phase 1: Reminder Sweep (Bước 1)
  for (const sub of activeSubs) {
    const expiresAt = sub.expiresAt;
    const msLeft = expiresAt.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);

    if (hoursLeft <= 48 && sub.autoRenew) {
      try {
        let pkg = await Package.findOne({ package_id: sub.packageId });
        if (!pkg) {
          pkg = await Package.findOne({ $or: [{ package_id: Number(sub.packageId) }, { id: Number(sub.packageId) }] });
        }
        const account = await Account.findOne({ user_id: sub.userId });

        if (pkg && account) {
          const Notification = require('../models/Notification');
          const warningExists = await Notification.findOne({
            subscriptionId: sub._id,
            type: 'SUBSCRIPTION',
            createdAt: { $gte: sub.startedAt || sub.activatedAt },
            title: { $in: ['Nhắc nhở gia hạn gói cước', 'Cảnh báo số dư không đủ gia hạn'] }
          });

          if (!warningExists) {
            const notificationService = require('./notificationService');
            const formattedDate = formatNotificationDate(expiresAt);
            const balanceNum = Number(account.balance);
            const priceNum = Number(pkg.gia);
            if (balanceNum >= priceNum) {
              await notificationService.createNotification({
                userId: sub.userId,
                title: 'Nhắc nhở gia hạn gói cước',
                content: `Gói cước ${pkg.ma_goi} của bạn sẽ tự động gia hạn vào ${formattedDate}. Số dư hiện tại (${account.balance.toLocaleString('vi-VN')}đ) đủ điều kiện duy trì dịch vụ.`,
                type: 'SUBSCRIPTION',
                link: '/profile?tab=subscriptions',
                subscriptionId: sub._id
              });
            } else {
              await notificationService.createNotification({
                userId: sub.userId,
                title: 'Cảnh báo số dư không đủ gia hạn',
                content: `Gói cước ${pkg.ma_goi} của bạn sẽ gia hạn vào ${formattedDate} (Cần ${pkg.gia.toLocaleString('vi-VN')}đ). Số dư hiện tại chỉ còn ${account.balance.toLocaleString('vi-VN')}đ. Vui lòng nạp thêm tiền để không bị ngắt kết nối.`,
                type: 'SUBSCRIPTION',
                link: '/profile?tab=subscriptions',
                subscriptionId: sub._id
              });
            }
          }
        }
      } catch (err) {
        console.error("Error creating expiry warning notification in sweep:", err);
      }
    }
  }

  // Phase 2: Renewal Execution Sweep (Bước 2)
  for (const sub of activeSubs) {
    const expiresAt = sub.expiresAt;
    const expiresAtLocal = new Date(expiresAt.getTime() + 7 * 60 * 60 * 1000);
    const nextDayLocal = new Date(expiresAtLocal);
    nextDayLocal.setUTCHours(0, 0, 0, 0);
    nextDayLocal.setUTCDate(nextDayLocal.getUTCDate() + 1);
    const renewalThreshold = new Date(nextDayLocal.getTime() - 7 * 60 * 60 * 1000);

    if (now >= renewalThreshold) {
      if (sub.autoRenew) {
        let pkg = await Package.findOne({ package_id: sub.packageId });
        if (!pkg) {
          pkg = await Package.findOne({ $or: [{ package_id: Number(sub.packageId) }, { id: Number(sub.packageId) }] });
        }
        const account = await Account.findOne({ user_id: sub.userId });

        if (pkg && account && Number(account.balance) >= Number(pkg.gia)) {
          account.balance -= pkg.gia;
          await account.save();

          const metadata = getPkgMetadata(pkg);
          const newExpiresAt = calculateExpiryDate(
            now,
            metadata.duration,
            metadata.cycle_type,
            metadata.validity_mode
          );

          sub.activatedAt = now;
          sub.startedAt = now;
          sub.expiresAt = newExpiresAt;
          sub.cycle = metadata.cycle;
          sub.duration = metadata.duration;
          sub.cycleType = metadata.cycle_type;
          await sub.save();
          console.log(`Auto-renewed sub ${sub._id} for user ${sub.userId} pkg ${pkg.ma_goi}`);

          // Create auto-renewal success notification
          try {
            const notificationService = require('./notificationService');
            await notificationService.createNotification({
              userId: sub.userId,
              title: 'Gia hạn gói cước thành công',
              content: `Gia hạn thành công gói cước ${pkg.ma_goi}! Tài khoản đã trừ ${pkg.gia.toLocaleString('vi-VN')}đ. Ưu đãi ${pkg.uudaitrong || pkg.ten} đã được khôi phục, hạn sử dụng đến ${formatNotificationDate(newExpiresAt)}.`,
              type: 'SUBSCRIPTION',
              link: '/profile?tab=subscriptions',
              subscriptionId: sub._id
            });
          } catch (notifErr) {
            console.error("Failed to create auto-renewal success notification:", notifErr);
          }
        } else {
          sub.status = 'EXPIRED';
          sub.autoRenew = false;
          await sub.save();
          console.log(`Auto-renewal failed/insufficient funds for sub ${sub._id} user ${sub.userId}`);

          // Create auto-renewal failed notification
          if (pkg && account) {
            try {
              const notificationService = require('./notificationService');
              await notificationService.createNotification({
                userId: sub.userId,
                title: 'Gia hạn gói cước thất bại',
                content: `Gia hạn gói cước ${pkg.ma_goi} thất bại do số dư ví không đủ (${account.balance.toLocaleString('vi-VN')}đ / ${pkg.gia.toLocaleString('vi-VN')}đ). Gói cước đã bị tạm dừng/hủy. Nạp tiền ngay để đăng ký lại.`,
                type: 'SUBSCRIPTION',
                link: '/profile?tab=subscriptions',
                subscriptionId: sub._id
              });
            } catch (notifErr) {
              console.error("Failed to create auto-renewal failed notification:", notifErr);
            }
          }
        }
      } else {
        sub.status = 'EXPIRED';
        await sub.save();
        console.log(`Sub ${sub._id} expired naturally`);
      }
    }
  }
};

// Periodic checker interval in background
setInterval(() => {
  processAutoRenewals().catch(err => console.error("Error in background renewals:", err));
}, 10000);

module.exports = {
  calculateExpiryDate,
  getPkgMetadata,
  processAutoRenewals,
  checkAndUpdateSubscriptions: processAutoRenewals,
  ...subscriptionService
};
