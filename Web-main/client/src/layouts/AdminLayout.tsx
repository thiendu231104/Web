import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wifi, Users, ArrowLeft, LogOut, ShieldCheck, Wallet, PhoneCall, ClipboardList, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store';
import { useState, useEffect } from 'react';

export default function AdminLayout() {
  const { currentUser, authChecked, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  // Route Guard: only admins allowed
  useEffect(() => {
    if (!authChecked) return;

    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
    }
  }, [currentUser, authChecked, navigate]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Đang xác thực tài khoản...</span>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') return null;

  const adminLinks = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Quản lý Gói cước', path: '/admin/packages', icon: Wifi },
    { label: 'Quản lý Người dùng', path: '/admin/users', icon: Users },
    { label: 'Lịch sử Nạp tiền', path: '/admin/deposits', icon: Wallet },
    { label: 'Yêu cầu Liên hệ', path: '/admin/contacts', icon: PhoneCall },
    { label: 'Lịch sử Khảo sát', path: '/admin/surveys', icon: ClipboardList },
    { label: 'Lịch sử Chatbot', path: '/admin/chatbot', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen flex bg-[#F5F5F5] text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen sticky top-0 shrink-0 p-5 hidden md:flex">
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-900">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-extrabold text-white text-base">
              V
            </div>
            <span className="text-base font-bold text-white tracking-tight flex items-center">
              Admin<span className="text-primary ml-1">Portal</span>
            </span>
          </div>

          <nav className="flex flex-col space-y-1">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-850 mt-auto">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Trang chủ Portal</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center space-x-2 text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white h-16 px-6 md:px-8 flex items-center justify-between border-b border-slate-200 shrink-0 z-10">
          {/* Mobile brand text */}
          <span className="text-sm font-bold text-slate-900 md:hidden">Admin Portal</span>
          
          {/* Right Header Controls */}
          <div className="relative ml-auto flex items-center space-x-3">
            {/* Role Badge */}
            <span className="flex items-center text-[10px] font-extrabold tracking-wider uppercase text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              ADMIN
            </span>

            {/* Admin Avatar + Name Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 focus:outline-none hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-extrabold text-xs shadow-inner">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-slate-700">{currentUser.name}</span>
              </button>

              {showDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-extrabold text-slate-800 truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold truncate">{currentUser.email || 'admin@viettel.vn'}</p>
                    </div>
                    <Link
                      to="/"
                      className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold"
                      onClick={() => setShowDropdown(false)}
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-400" />
                      <span>Về Trang chủ Portal</span>
                    </Link>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 font-bold text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* View Outlet Container */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto space-y-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
