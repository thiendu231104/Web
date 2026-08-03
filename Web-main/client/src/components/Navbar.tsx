import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, LogOut, Shield, CreditCard, Menu, X, ChevronDown, Lock, History, FileText, Headphones } from 'lucide-react';
import { useAuthStore } from '../store';

export default function Navbar() {
  const {
    currentUser,
    logout,
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    clearNotifications
  } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications().catch(() => { });
      fetchUnreadCount().catch(() => { });
    }
  }, [currentUser]);

  const formatDateTime = (dateInput: string | Date | number): string => {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false
    };

    const formatter = new Intl.DateTimeFormat('vi-VN', options);
    const parts = formatter.formatToParts(d);

    let hour = '00', minute = '00', day = '01', month = '01', year = '2026';
    for (const part of parts) {
      if (part.type === 'hour') hour = part.value;
      else if (part.type === 'minute') minute = part.value;
      else if (part.type === 'day') day = part.value;
      else if (part.type === 'month') month = part.value;
      else if (part.type === 'year') year = part.value;
    }

    return `${hour}:${minute} - ${day}/${month}/${year}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const keyword = params.get('keyword') || '';
    setSearchQuery(keyword);
  }, [location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/goi-cuoc?keyword=${encodeURIComponent(query)}`);
    } else {
      navigate('/goi-cuoc');
    }
    setIsMenuOpen(false);
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Gói cước', path: '/packages' },
    { label: 'So sánh', path: '/compare' },
    { label: 'Khảo sát', path: '/survey' },
    { label: 'Tư vấn AI', path: '/chatbot' },
    { label: 'Liên hệ', path: '/contact' }
  ];

  return (
    <nav className="bg-white sticky top-0 z-50 px-4 py-3.5 md:px-8 flex items-center justify-between border-b border-slate-100 shadow-sm">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center space-x-2 focus:outline-none">
        <div className="w-8.5 h-8.5 bg-primary rounded-lg flex items-center justify-center font-extrabold text-white text-lg tracking-wider">
          V
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-905">
          Viettel<span className="text-primary">AI</span>
        </span>
      </Link>

      {/* Main Nav Links (Desktop) */}
      <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-600">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`hover:text-primary transition-colors py-1 relative ${isActive ? 'text-primary font-bold' : ''
                }`}
            >
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Search Bar (Desktop) */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-xs w-full mx-4">
        <input
          type="text"
          placeholder="Tìm kiếm nhanh gói cước..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-4 pr-10 text-xs text-slate-705 placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:bg-white transition-colors"
        />
        <button type="submit" className="absolute right-3 text-slate-400 hover:text-primary transition-colors focus:outline-none">
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Right User Area */}
      <div className="flex items-center space-x-3">
        {/* Notification Icon & Popover */}
        {currentUser && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 bg-slate-55 hover:bg-slate-105 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors relative focus:outline-none cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-extrabold text-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-[360px] bg-white border border-slate-200 rounded-xl shadow-lg animate-fade-in z-50 text-slate-705 divide-y divide-slate-100 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                    <span>Thông báo</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-100 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">
                        {unreadCount} mới
                      </span>
                    )}
                  </h3>
                  <div className="flex space-x-2 text-[10px]">
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await markAllNotificationsAsRead();
                        }}
                        className="text-primary hover:underline font-bold cursor-pointer"
                      >
                        Đọc tất cả
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await clearNotifications();
                        }}
                        className="text-slate-405 hover:text-slate-650 hover:underline font-bold cursor-pointer"
                      >
                        Xóa lịch sử
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-350">
                        <Bell className="w-5 h-5" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-400">Không có thông báo nào</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = n.status === 'UNREAD';
                      return (
                        <div
                          key={n._id}
                          onClick={async () => {
                            if (isUnread) {
                              await markNotificationAsRead(n._id);
                            }
                            setIsNotificationOpen(false);
                            if (n.type === 'SUPPORT' || n.title.includes('CSKH Viettel')) {
                              const contactId = (n as any).contact_id || (n.link && new URLSearchParams(n.link.split('?')[1]).get('id')) || '';
                              navigate(contactId ? `/contact?tab=history&id=${contactId}` : '/contact?tab=history');
                            } else if (n.link) {
                              const targetLink = n.link === '/contact' ? '/contact?tab=history' : n.link;
                              navigate(targetLink);
                            } else {
                              navigate('/contact?tab=history');
                            }
                          }}
                          className={`px-4 py-3 flex items-start space-x-3 transition-all cursor-pointer hover:bg-slate-50/70 ${isUnread ? 'bg-red-50/10 font-semibold' : ''
                            }`}
                        >
                          {/* Notification Type Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            n.type === 'SUPPORT' || n.title.includes('CSKH Viettel')
                              ? 'bg-red-50 text-primary'
                              : n.type === 'TRANSACTION'
                                ? 'bg-emerald-50 text-emerald-600'
                                : n.type === 'SUBSCRIPTION'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-amber-50 text-amber-600'
                            }`}>
                            {n.type === 'SUPPORT' || n.title.includes('CSKH Viettel') ? (
                              <Headphones className="w-4 h-4" />
                            ) : n.type === 'TRANSACTION' ? (
                              <CreditCard className="w-4 h-4" />
                            ) : n.type === 'SUBSCRIPTION' ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-xs ${isUnread ? 'text-slate-900 font-extrabold' : 'text-slate-707 font-medium'}`}>
                              {n.title}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-normal mt-0.5 break-words font-medium">
                              {n.content}
                            </p>
                            <p className="text-[8px] text-slate-450 mt-1 font-bold">
                              {formatDateTime(n.createdAt)}
                            </p>
                          </div>

                          {/* Unread dot indicator */}
                          {isUnread && (
                            <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentUser ? (
          <div className="flex items-center space-x-3">
            {/* Balance Badge (Desktop) */}
            <Link
              to="/profile/deposit"
              className="hidden sm:flex items-center space-x-1.5 bg-red-50 border border-red-100 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold text-primary transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{formatBalance(currentUser.balance)}</span>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-1.5 focus:outline-none group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-707 text-sm font-semibold group-hover:border-primary/50 transition-colors">
                  {currentUser.name.charAt(0)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-md py-1 text-slate-700 divide-y divide-slate-100 animate-fade-in z-50">
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đang đăng nhập</p>
                    <p className="text-sm font-bold truncate text-slate-900">{currentUser.name}</p>
                    <p className="text-xs text-slate-550 truncate">{currentUser.phoneNumber}</p>
                    {/* Mobile Balance */}
                    <div className="sm:hidden mt-2">
                      <Link
                        to="/profile/deposit"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center space-x-1.5 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg text-xs font-bold text-primary"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{formatBalance(currentUser.balance)}</span>
                      </Link>
                    </div>
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center px-4 py-2 text-xs hover:bg-slate-50 hover:text-slate-950 transition-colors text-primary font-bold"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Quản trị Admin
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center px-4 py-2 text-xs hover:bg-slate-50 hover:text-slate-950 transition-colors font-bold text-slate-700"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      to="/profile/deposit"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center px-4 py-2 text-xs hover:bg-slate-50 hover:text-slate-950 transition-colors font-bold text-slate-700"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Nạp tiền tài khoản
                    </Link>
                    <Link
                      to="/profile/subscriptions"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center px-4 py-2 text-xs hover:bg-slate-50 hover:text-slate-950 transition-colors font-bold text-slate-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Lịch sử đăng ký gói cước
                    </Link>
                    <Link
                      to="/profile/history"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center px-4 py-2 text-xs hover:bg-slate-50 hover:text-slate-950 transition-colors font-bold text-slate-700"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Lịch sử giao dịch
                    </Link>
                    <Link
                      to="/profile/change-password"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center px-4 py-2 text-xs hover:bg-slate-50 hover:text-slate-950 transition-colors font-bold text-slate-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Đổi mật khẩu
                    </Link>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full text-left flex items-center px-4 py-2 text-xs hover:bg-red-50 transition-colors text-red-650 font-bold"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center space-x-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </Link>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 bg-slate-55 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
        >
          {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="absolute top-[65px] left-0 right-0 bg-white border border-slate-200 py-4 px-6 flex flex-col space-y-4 lg:hidden z-40 animate-fade-in shadow-xl">
          {/* Mobile search */}
          <form onSubmit={handleSearchSubmit} className="flex md:hidden items-center relative w-full">
            <input
              type="text"
              placeholder="Tìm kiếm gói cước..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-55 border border-slate-200 rounded-lg py-1.5 pl-4 pr-10 text-xs text-slate-700 focus:outline-none"
            />
            <button type="submit" className="absolute right-3 text-slate-400">
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Nav links */}
          <div className="flex flex-col space-y-3 font-semibold text-sm text-slate-650">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`hover:text-primary transition-colors py-1 ${isActive ? 'text-primary font-bold border-l-2 border-primary pl-2' : ''
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-lg animate-scale-up text-left space-y-4">
            <h3 className="text-base font-extrabold text-slate-905">Xác nhận đăng xuất</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống ViettelAI?
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-605 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                  navigate('/login');
                }}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
