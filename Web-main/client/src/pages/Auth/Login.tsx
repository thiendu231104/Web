import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store';

const loginSchema = z.object({
  phoneNumber: z.string()
    .length(10, { message: 'Số điện thoại phải có đúng 10 số' })
    .regex(/^0[0-9]{9}$/, { message: 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có đúng 10 chữ số)' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const success = await login(data.phoneNumber, data.password);
      setIsSubmitting(false);
      if (success) {
        const user = useAuthStore.getState().currentUser;
        if (user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setErrorMsg(useAuthStore.getState().error || 'Thông tin đăng nhập không chính xác.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(useAuthStore.getState().error || err.message || 'Đã xảy ra lỗi đăng nhập hệ thống.');
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
          Đăng nhập
        </h1>
        <p className="text-[14px] text-slate-400 font-semibold">
          Chào mừng quay trở lại với ViettelAI
        </p>
      </div>

      {/* Error Notification Alert Banner */}
      {errorMsg && (
        <div role="alert" className="flex items-center space-x-2 text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl text-[13px] font-semibold animate-scale-up">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EE0033]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form elements */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Phone Number Input */}
        <div className="flex flex-col space-y-1.5 text-left">
          <label htmlFor="login-phone" className="text-[13px] font-semibold text-slate-500 pl-0.5">
            Số điện thoại di động
          </label>
          <div className="relative flex items-center">
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="off"
              placeholder="Nhập số điện thoại Viettel..."
              {...register('phoneNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, '');
                }
              })}
              className={`w-full h-[48px] bg-slate-50 border ${
                errors.phoneNumber 
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                  : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
              } rounded-xl pl-11 pr-4 text-[15px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-all duration-200`}
            />
            <Phone className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
          </div>
          {errors.phoneNumber && (
            <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {errors.phoneNumber.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className="flex flex-col space-y-1.5 text-left">
          <div className="flex justify-between items-center px-0.5">
            <label htmlFor="login-password" className="text-[13px] font-semibold text-slate-500">
              Mật khẩu tài khoản
            </label>
            <Link 
              to="/forgot-password" 
              state={{ phoneNumber: watch('phoneNumber') }} 
              className="text-[14px] text-[#EE0033] hover:text-[#D40032] hover:underline transition-colors font-bold"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative flex items-center">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Nhập mật khẩu..."
              {...register('password')}
              className={`w-full h-[48px] bg-slate-50 border ${
                errors.password 
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                  : 'border-slate-200 focus:border-[#EE0033] focus:ring-[#EE0033]/10'
              } rounded-xl pl-11 pr-11 text-[15px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-all duration-200`}
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
          {errors.password && (
            <p className="text-[13px] text-red-500 flex items-center mt-1 font-medium pl-0.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Form Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-[48px] bg-[#EE0033] hover:bg-[#D40032] hover:shadow-[0_4px_15px_rgba(238,0,51,0.2)] hover:-translate-y-0.5 active:translate-y-0 transform transition-all duration-200 text-white font-semibold rounded-xl text-[15px] uppercase tracking-wider disabled:opacity-50 focus:outline-none cursor-pointer flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Đang xử lý...</span>
            </span>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* Redirect link footer */}
      <footer className="text-center text-[14px] space-y-3 pt-4 border-t border-slate-100">
        <div>
          Chưa có tài khoản di động?{' '}
          <Link to="/register" className="text-[#EE0033] hover:text-[#D40032] hover:underline font-extrabold transition-colors">
            Đăng ký thuê bao mới
          </Link>
        </div>
        <div className="flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center space-x-1 text-slate-400 hover:text-slate-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
