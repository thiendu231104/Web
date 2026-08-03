import { Outlet, useLocation } from 'react-router-dom';
import SEO from '../components/SEO';

export default function AuthLayout() {
  const location = useLocation();

  // Custom SEO titles/descriptions based on active route
  const getSeoData = () => {
    if (location.pathname === '/login') {
      return {
        title: "Đăng Nhập ViettelAI",
        description: "Đăng nhập để sử dụng hệ thống ViettelAI - Website tra cứu gói cước Viettel tích hợp Chatbot AI."
      };
    } else if (location.pathname === '/register') {
      return {
        title: "Đăng Ký Tài Khoản ViettelAI",
        description: "Tạo tài khoản mới để tra cứu gói cước di động Viettel và quản lý số dư ảo trên ViettelAI Portal."
      };
    } else {
      return {
        title: "Khôi phục mật khẩu - ViettelAI",
        description: "Xác thực mã OTP để thiết lập lại mật khẩu di động trên ViettelAI."
      };
    }
  };

  const seo = getSeoData();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 relative overflow-y-auto">
      <SEO title={seo.title} description={seo.description} />

      {/* Decorative background grid and soft glow blobs */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#EE0033]/5 rounded-full filter blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-rose-300/10 rounded-full filter blur-3xl opacity-30 pointer-events-none" />

      {/* Center viewport for Login, Register, ForgotPassword cards */}
      <div className="w-full max-w-[460px] relative z-10 transition-all duration-300 flex justify-center">
        <Outlet />
      </div>
    </div>
  );
}
