const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Account = require('../models/Account');
const UserSubscription = require('../models/UserSubscription');
const Package = require('../models/Package');
const OtpCode = require('../models/OtpCode');
const { generateToken } = require('../middlewares/authMiddleware');

function hashPassword(password) {
  return password;
}

function verifyPassword(password, storedHash) {
  return password === storedHash;
}

// Map MongoDB UserSubscription list to frontend activePackages
async function getActivePackages(userId) {
  const now = new Date();
  const activeSubs = await UserSubscription.find({ 
    userId: userId, 
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
  return activePackages;
}

const authService = {
  login: async (phoneNumber, password) => {
    const account = await Account.findOne({ phone_number: phoneNumber });
    if (!account) {
      const err = new Error('Tài khoản không tồn tại.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = verifyPassword(password, account.password);
    if (!isMatch) {
      const err = new Error('Mật khẩu không chính xác.');
      err.statusCode = 401;
      throw err;
    }

    if (account.status === 'blocked') {
      const err = new Error('Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
      err.statusCode = 403;
      throw err;
    }

    // Generate payload
    const tokenPayload = {
      userId: account.user_id,
      role: account.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours expiry
    };

    const token = generateToken(tokenPayload);
    const activePackages = await getActivePackages(account.user_id);

    return {
      token,
      user: {
        id: String(account.user_id),
        name: account.fullname,
        phoneNumber: account.phone_number,
        email: account.email || '',
        balance: account.balance,
        role: account.role === 'admin' ? 'admin' : 'customer',
        subscription_type: account.subscription_type || 'tra_truoc',
        is_loyal_customer: account.is_loyal_customer || false,
        status: account.status || 'active',
        walletAddress: account.wallet_address || null,
        activePackages
      }
    };
  },

  register: async (fullname, phoneNumber, email, password, subscriptionType) => {
    // Check if phone number is a valid Viettel format
    const isViettelPhone = (phone) => /^(086|096|097|098|032|033|034|035|036|037|038|039)\d{7}$/.test(phone);
    if (!isViettelPhone(phoneNumber)) {
      throw new Error('Chỉ hỗ trợ đăng ký bằng số điện thoại Viettel.');
    }

    // Check if phone number exists
    const existing = await Account.findOne({ phone_number: phoneNumber });
    if (existing) {
      throw new Error('Số điện thoại này đã được đăng ký.');
    }

    // Check if email exists
    if (email) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const existingEmail = await Account.findOne({ email: trimmedEmail });
      if (existingEmail) {
        throw new Error('Email này đã được đăng ký.');
      }
    }

    // Find next user_id
    const lastUser = await Account.findOne().sort({ user_id: -1 });
    const nextUserId = lastUser ? lastUser.user_id + 1 : 1;

    // Hash password
    const hashedPassword = hashPassword(password);

    // Enforce default values for new account registration
    const newAccount = await Account.create({
      user_id: nextUserId,
      fullname,
      phone_number: phoneNumber,
      password: hashedPassword,
      email: email ? String(email).trim().toLowerCase() : '',
      balance: 0,
      role: 'user',
      subscription_type: subscriptionType === 'tra_sau' ? 'tra_sau' : 'tra_truoc',
      is_loyal_customer: false,
      status: 'active'
    });

    const tokenPayload = {
      userId: newAccount.user_id,
      role: newAccount.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };

    const token = generateToken(tokenPayload);

    return {
      token,
      user: {
        id: String(newAccount.user_id),
        name: newAccount.fullname,
        phoneNumber: newAccount.phone_number,
        email: newAccount.email || '',
        balance: newAccount.balance,
        role: 'customer',
        subscription_type: newAccount.subscription_type || 'tra_truoc',
        is_loyal_customer: newAccount.is_loyal_customer || false,
        status: newAccount.status || 'active',
        walletAddress: newAccount.wallet_address || null,
        activePackages: []
      }
    };
  },

  getMe: async (userId) => {
    const account = await Account.findOne({ user_id: userId });
    if (!account) {
      throw new Error('Không tìm thấy thông tin tài khoản.');
    }

    const activePackages = await getActivePackages(account.user_id);

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
      walletAddress: account.wallet_address || null,
      activePackages
    };
  },

  updateProfile: async (userId, fullname, email) => {
    const account = await Account.findOne({ user_id: userId });
    if (!account) {
      throw new Error('Không tìm thấy thông tin tài khoản.');
    }

    account.fullname = fullname;
    account.email = email || '';
    await account.save();

    const activePackages = await getActivePackages(account.user_id);

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
      walletAddress: account.wallet_address || null,
      activePackages
    };
  },

  changePassword: async (userId, oldPassword, newPassword) => {
    const account = await Account.findOne({ user_id: userId });
    if (!account) {
      throw new Error('Không tìm thấy thông tin tài khoản.');
    }

    const isMatch = verifyPassword(oldPassword, account.password);
    if (!isMatch) {
      throw new Error('Mật khẩu cũ không chính xác.');
    }

    account.password = hashPassword(newPassword);
    await account.save();
    return true;
  },

  linkWallet: async (userId, walletAddress) => {
    const account = await Account.findOne({ user_id: userId });
    if (!account) {
      throw new Error('Không tìm thấy thông tin tài khoản.');
    }

    if (!walletAddress) {
      throw new Error('Địa chỉ ví không hợp lệ.');
    }

    // Normalize walletAddress (lowercase)
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if another account has already linked this address (only if multiple accounts per wallet are disabled)
    const allowMultiple = process.env.ALLOW_MULTIPLE_ACCOUNTS_PER_WALLET !== 'false';
    if (!allowMultiple) {
      const otherAccount = await Account.findOne({ 
        wallet_address: normalizedAddress, 
        user_id: { $ne: userId } 
      });
      if (otherAccount) {
        throw new Error('Địa chỉ ví này đã được liên kết với một tài khoản khác.');
      }
    }

    if (account.wallet_address !== normalizedAddress) {
      account.wallet_address = normalizedAddress;
      await account.save();
    }

    const activePackages = await getActivePackages(account.user_id);

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
      walletAddress: account.wallet_address,
      activePackages
    };
  },

  sendOTP: async (phoneNumber, email) => {
    const account = await Account.findOne({ phone_number: phoneNumber });
    if (!account) {
      const err = new Error('Số điện thoại hoặc Email không chính xác.');
      err.statusCode = 400;
      throw err;
    }

    const emailMatch = account.email && (account.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (!emailMatch) {
      const err = new Error('Số điện thoại hoặc Email không chính xác.');
      err.statusCode = 400;
      throw err;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpCode.findOneAndUpdate(
      { phone_number: phoneNumber, email: email.trim().toLowerCase() },
      { code: otp, created_at: new Date() },
      { upsert: true, new: true }
    );

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAIL_PORT || '2525', 10),
      auth: {
        user: process.env.MAIL_USER || '501570f9a06120',
        pass: process.env.MAIL_PASS || 'b2bd3e133986f8'
      }
    });

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || '"Hệ thống Xác thực" <no-reply@localhost.com>',
        to: email.trim().toLowerCase(),
        subject: 'Mã OTP khôi phục mật khẩu - ViettelAI',
        text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`,
        html: `
          <div style="font-family: sans-serif; padding: 25px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 16px;">
            <h2 style="color: #EE0033; text-align: center; margin-bottom: 20px;">Khôi phục mật khẩu ViettelAI</h2>
            <p>Chào bạn,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản di động <b>${phoneNumber}</b>.</p>
            <p>Mã xác thực OTP của bạn là:</p>
            <div style="font-size: 28px; font-weight: 800; color: #EE0033; letter-spacing: 5px; padding: 15px 0; background-color: #f9f9f9; text-align: center; border-radius: 12px; margin: 20px 0;">
              ${otp}
            </div>
            <p>Mã này có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            <p style="font-size: 11px; color: #999; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
              Đây là email tự động từ hệ thống chăm sóc khách hàng ViettelAI. Vui lòng không trả lời email này.
            </p>
          </div>
        `
      });
      console.log(`[Mailtrap] Đã gửi OTP ${otp} đến email ${email}`);
    } catch (mailErr) {
      console.warn(`[Mailtrap Warning] Không thể gửi email đến ${email}: ${mailErr.message}. OTP đã sinh là: ${otp}`);
    }

    return { success: true, message: 'Gửi mã OTP thành công.' };
  },
  verifyOTP: async (phoneNumber, otp) => {
    const otpRecord = await OtpCode.findOne({
      phone_number: phoneNumber,
      code: otp
    });

    if (!otpRecord) {
      const err = new Error('Mã xác thực OTP không chính xác hoặc đã hết hạn.');
      err.statusCode = 400;
      throw err;
    }

    return { success: true, message: 'Xác thực mã OTP thành công.' };
  },

  resetPassword: async (phoneNumber, otp, newPassword) => {
    const otpRecord = await OtpCode.findOne({
      phone_number: phoneNumber,
      code: otp
    });

    if (!otpRecord) {
      const err = new Error('Mã xác thực OTP không chính xác hoặc đã hết hạn.');
      err.statusCode = 400;
      throw err;
    }

    const account = await Account.findOne({
      phone_number: phoneNumber
    });

    if (!account) {
      const err = new Error('Tài khoản không tồn tại.');
      err.statusCode = 400;
      throw err;
    }

    account.password = newPassword;
    await account.save();

    await OtpCode.deleteMany({ phone_number: phoneNumber });

    return { success: true, message: 'Đổi mật khẩu thành công.' };
  }
};

module.exports = authService;
