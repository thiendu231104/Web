const authService = require('../services/authService');

const authController = {
  login: async (req, res, next) => {
    try {
      const { phoneNumber, password } = req.body;
      if (!phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại và mật khẩu là bắt buộc.'
        });
      }

      const result = await authService.login(phoneNumber, password);
      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công!',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
  },

  register: async (req, res, next) => {
    try {
      const { name, phoneNumber, email, password, subscription_type } = req.body;
      if (!name || !phoneNumber || !password || !subscription_type) {
        return res.status(400).json({
          success: false,
          message: 'Họ tên, Số điện thoại, mật khẩu và loại thuê bao là bắt buộc.'
        });
      }

      const result = await authService.register(name, phoneNumber, email, password, subscription_type);
      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getMe: async (req, res, next) => {
    try {
      // req.user is populated by authenticateToken middleware
      const user = await authService.getMe(req.user.user_id);
      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin tài khoản thành công.',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name, email } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Họ và tên không được để trống.'
        });
      }

      const updatedUser = await authService.updateProfile(req.user.user_id, name, email);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật hồ sơ cá nhân thành công!',
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu cũ và mật khẩu mới là bắt buộc.'
        });
      }

      await authService.changePassword(req.user.user_id, oldPassword, newPassword);
      return res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công!'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  linkWallet: async (req, res, next) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Địa chỉ ví là bắt buộc.'
        });
      }

      const updatedUser = await authService.linkWallet(req.user.user_id, walletAddress);
      return res.status(200).json({
        success: true,
        message: 'Liên kết địa chỉ ví thành công!',
        data: { user: updatedUser }
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
  },

  sendForgotPasswordOTP: async (req, res, next) => {
    try {
      const { phone_number, phoneNumber, email } = req.body;
      const finalPhone = phone_number || phoneNumber;
      if (!finalPhone || !email) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại và Email là bắt buộc.'
        });
      }

      const result = await authService.sendOTP(finalPhone, email);
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
  },
  verifyForgotPasswordOTP: async (req, res, next) => {
    try {
      const { phone_number, phoneNumber, otp, otpCode } = req.body;
      const finalPhone = phone_number || phoneNumber;
      const finalOtp = otp || otpCode;

      if (!finalPhone || !finalOtp) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại và mã OTP là bắt buộc.'
        });
      }

      const result = await authService.verifyOTP(finalPhone, finalOtp);
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
  },

  resetForgotPassword: async (req, res, next) => {
    try {
      const { phone_number, phoneNumber, otp, otpCode, new_password, newPassword } = req.body;
      const finalPhone = phone_number || phoneNumber;
      const finalOtp = otp || otpCode;
      const finalPassword = new_password || newPassword;

      if (!finalPhone || !finalOtp || !finalPassword) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại, mã OTP và mật khẩu mới là bắt buộc.'
        });
      }

      const result = await authService.resetPassword(finalPhone, finalOtp, finalPassword);
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = authController;
