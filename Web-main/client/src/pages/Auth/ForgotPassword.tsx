import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Phone, Lock, Key, Mail, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '../../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Step state (1: Account Info, 2: Confirm OTP, 3: Reset Password)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Form values
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Autofill phone number from login state or query param
  useEffect(() => {
    const initialPhone = location.state?.phoneNumber || searchParams.get('phone') || '';
    if (initialPhone) {
      setPhone(initialPhone.replace(/[^0-9]/g, '').slice(0, 10));
    }
  }, [location, searchParams]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    const phoneRegex = /^0[0-9]{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!phone) {
      newErrors.phone = 'Số điện thoại là bắt buộc.';
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.';
    }

    if (!email) {
      newErrors.email = 'Email là bắt buộc.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Địa chỉ email không hợp lệ.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateStep1()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const success = await authApi.sendForgotPasswordOTP(phone, email);
      if (success) {
        setSuccessMsg(`Mã OTP đã được gửi đến email ${email}. Vui lòng kiểm tra hộp thư.`);
        setStep(2);
        setCountdown(60);
      } else {
        setErrorMsg('Gửi mã OTP thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi gửi mã OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const success = await authApi.sendForgotPasswordOTP(phone, email);
      if (success) {
        setSuccessMsg('Mã OTP mới đã được gửi lại vào email của bạn.');
        setCountdown(60);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi gửi lại mã OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!otp) {
      newErrors.otp = 'Mã OTP là bắt buộc.';
    } else if (otp.length !== 6) {
      newErrors.otp = 'Mã OTP phải chứa đúng 6 chữ số.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyOTP = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const success = await authApi.verifyForgotPasswordOTP(phone, otp);
      if (success) {
        setSuccessMsg('Mã OTP hợp lệ! Vui lòng thiết lập mật khẩu mới.');
        setStep(3);
      } else {
        setErrorMsg('Xác thực OTP thất bại.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!newPassword) {
      newErrors.newPassword = 'Mật khẩu mới là bắt buộc.';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải từ 6 ký tự.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu nhập lại không trùng khớp.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const success = await authApi.resetForgotPassword(phone, otp, newPassword);
      if (success) {
        setSuccessMsg('Khôi phục mật khẩu thành công! Đang chuyển hướng về trang Đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setErrorMsg('Đặt lại mật khẩu thất bại.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi đặt lại mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-6 animate-scale-up">
      {/* Brand Header */}
      <header className="flex flex-col items-center justify-center text-center space-y-2">
        {/* Logo V with Red Background */}
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#EE0033] rounded-2xl shadow-sm transform hover:scale-105 transition-transform duration-200">
          <span className="text-xl font-black text-white">V</span>
        </div>
        <div className="text-[30px] font-black tracking-tight text-[#EE0033] leading-none">
          ViettelAI
        </div>
      </header>

      {/* Title Area */}
      <div className="text-center space-y-1">
        <h1 className="text-[28px] font-black text-slate-900 tracking-tight leading-tight">
          Quên mật khẩu
        </h1>
        <p className="text-[14px] text-slate-400 font-semibold">
          Xác thực qua 3 bước để khôi phục tài khoản
        </p>
      </div>

      {/* Visual Stepper */}
      <div className="flex items-center justify-center space-x-2 pt-2 select-none">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
          step >= 1 ? 'bg-[#EE0033] text-white shadow-sm' : 'bg-slate-100 text-slate-400'
        }`}>
          1
        </div>
        <div className={`w-10 h-0.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#EE0033]' : 'bg-slate-100'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
          step >= 2 ? 'bg-[#EE0033] text-white shadow-sm' : 'bg-slate-100 text-slate-400'
        }`}>
          2
        </div>
        <div className={`w-10 h-0.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-[#EE0033]' : 'bg-slate-100'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
          step >= 3 ? 'bg-[#EE0033] text-white shadow-sm' : 'bg-slate-100 text-slate-400'
        }`}>
          3
        </div>
      </div>

      {/* Error & Success Messages */}
      {errorMsg && (
        <div className="flex items-start space-x-2 text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl text-[13px] font-semibold animate-scale-up text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EE0033] mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start space-x-2 text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-[13px] font-semibold animate-scale-up text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 1 && (
        /* Step 1: Input Phone & Email to request OTP */
        <div className="space-y-4">
          {/* Phone Number Input */}
          <div className="flex flex-col space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-slate-500 pl-0.5">Số điện thoại di động</label>
            <div className="relative flex items-center">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Ví dụ: 0987654321"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^0-9]/g, ''));
                  if (errors.phone) setErrors(prev => { const next = { ...prev }; delete next.phone; return next; });
                }}
                className={`w-full h-[48px] bg-slate-50 border ${
                  errors.phone ? 'border-red-400 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
                } rounded-xl pl-11 pr-4 text-[15px] font-semibold text-slate-700 focus:outline-none transition-all`}
              />
              <Phone className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
            </div>
            {errors.phone && (
              <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div className="flex flex-col space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-slate-500 pl-0.5">Địa chỉ Email liên kết</label>
            <div className="relative flex items-center">
              <input
                type="email"
                placeholder="Ví dụ: name@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => { const next = { ...prev }; delete next.email; return next; });
                }}
                className={`w-full h-[48px] bg-slate-50 border ${
                  errors.email ? 'border-red-400 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
                } rounded-xl pl-11 pr-4 text-[15px] font-semibold text-slate-700 focus:outline-none transition-all`}
              />
              <Mail className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
            </div>
            {errors.email && (
              <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSendOTP}
            disabled={isSubmitting}
            className="w-full h-[48px] bg-[#EE0033] hover:bg-[#D40032] text-white font-semibold rounded-xl text-[15px] uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center focus:outline-none shadow-sm"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        </div>
      )}

      {step === 2 && (
        /* Step 2: Confirm OTP Code */
        <div className="space-y-4">
          <div className="text-slate-500 text-xs text-left leading-relaxed pl-0.5">
            Mã OTP đã được gửi đến email <strong className="text-slate-800 font-extrabold">{email}</strong>. Vui lòng nhập mã để xác nhận.
          </div>

          {/* OTP Code Input */}
          <div className="flex flex-col space-y-1.5 text-left">
            <label className="text-[13px] font-semibold text-slate-500 pl-0.5">Mã xác thực OTP (6 chữ số)</label>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Nhập 6 số OTP..."
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/[^0-9]/g, ''));
                    if (errors.otp) setErrors(prev => { const next = { ...prev }; delete next.otp; return next; });
                  }}
                  className={`w-full h-[48px] bg-slate-50 border ${
                    errors.otp ? 'border-red-400 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
                  } rounded-xl pl-11 pr-4 text-[15px] font-semibold text-slate-700 focus:outline-none transition-all`}
                />
                <Key className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0 || isSubmitting}
                className="h-[48px] px-4 border border-slate-200 hover:bg-slate-50 text-[13px] font-bold text-slate-650 rounded-xl transition-all disabled:opacity-50 min-w-[110px] cursor-pointer focus:outline-none"
              >
                {countdown > 0 ? `${countdown}s` : 'Gửi lại mã'}
              </button>
            </div>
            {errors.otp && (
              <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.otp}
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="flex-1 h-[48px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[14px] transition-all cursor-pointer flex items-center justify-center focus:outline-none"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={isSubmitting}
              className="flex-[2] h-[48px] bg-[#EE0033] hover:bg-[#D40032] text-white font-semibold rounded-xl text-[15px] uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center focus:outline-none shadow-sm"
            >
              {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận OTP'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        /* Step 3: Input new password and save */
        <form onSubmit={handleResetPassword} className="space-y-4 text-left">
          {/* New Password Input */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-500 pl-0.5">Mật khẩu mới</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự..."
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors(prev => { const next = { ...prev }; delete next.newPassword; return next; });
                }}
                className={`w-full h-[48px] bg-slate-50 border ${
                  errors.newPassword ? 'border-red-400 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
                } rounded-xl pl-11 pr-11 text-[15px] font-semibold text-slate-700 focus:outline-none transition-all`}
              />
              <Lock className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 pointer-events-none" />

              {/* Show/Hide Password Switch */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-500 pl-0.5">Xác nhận mật khẩu mới</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới..."
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors(prev => { const next = { ...prev }; delete next.confirmPassword; return next; });
                }}
                className={`w-full h-[48px] bg-slate-50 border ${
                  errors.confirmPassword ? 'border-red-400 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
                } rounded-xl pl-11 pr-11 text-[15px] font-semibold text-slate-700 focus:outline-none transition-all`}
              />
              <Lock className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
            </div>
            {errors.confirmPassword && (
              <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[48px] bg-[#EE0033] hover:bg-[#D40032] text-white font-semibold rounded-xl text-[15px] uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center focus:outline-none shadow-sm"
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>
      )}

      {/* Switch to Login link */}
      <div className="text-center text-[14px] text-slate-500 pt-2 font-semibold">
        Nhớ mật khẩu di động?{' '}
        <Link to="/login" className="text-[#EE0033] hover:text-[#D40032] hover:underline font-bold transition-colors">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
