import { useState, useEffect } from 'react';
import { 
  Users, 
  Lock, 
  Unlock, 
  Sparkles, 
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  Search,
  Wallet,
  X,
  CreditCard
} from 'lucide-react';
import { useAuthStore } from '../../store';
import { userApi } from '../../services/api';
import type { User } from '../../types';
import { TableRowSkeleton } from '../../components/Skeleton';

export default function AdminUsers() {
  const { currentUser } = useAuthStore();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Search & Pagination states
  const [searchVal, setSearchVal] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Track loading per user row by maps of userId -> actionName
  const [processingUserIds, setProcessingUserIds] = useState<Record<string, string>>({});

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Balance Adjust Modal states
  const [balanceModalUser, setBalanceModalUser] = useState<User | null>(null);
  const [newBalanceVal, setNewBalanceVal] = useState<string>('0');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Search debounce handler
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchVal);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.fetchUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchKeyword
      });
      setUsersList(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalItems(response.totalItems || 0);
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách người dùng:", err);
      showToast('error', 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchKeyword]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleStatus = (user: User) => {
    const nextStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const confirmMessage = nextStatus === 'blocked'
      ? "Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ không thể đăng nhập cho đến khi được mở khóa."
      : "Bạn có chắc chắn muốn mở khóa tài khoản này?";

    setConfirmModal({
      title: nextStatus === 'blocked' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      message: confirmMessage,
      onConfirm: async () => {
        setProcessingUserIds(prev => ({ ...prev, [user.id]: 'status' }));
        try {
          const success = await userApi.updateUserStatus(user.id, nextStatus);
          if (success) {
            setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
            showToast('success', nextStatus === 'blocked' ? 'Đã khóa tài khoản thành công.' : 'Đã mở khóa tài khoản thành công.');
            
            if (currentUser && currentUser.id === user.id) {
              useAuthStore.getState().fetchMe().catch(() => {});
            }
          } else {
            showToast('error', 'Không thể cập nhật trạng thái.');
          }
        } catch (err: any) {
          showToast('error', 'Kết nối máy chủ thất bại.');
        } finally {
          setProcessingUserIds(prev => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
        }
      }
    });
  };

  const handleToggleLoyalty = (user: User) => {
    const nextLoyal = !user.is_loyal_customer;
    setConfirmModal({
      title: 'Thay đổi trạng thái Khách hàng thân thiết',
      message: 'Bạn có chắc chắn muốn thay đổi trạng thái khách hàng thân thiết của tài khoản này?',
      onConfirm: async () => {
        setProcessingUserIds(prev => ({ ...prev, [user.id]: 'loyalty' }));
        try {
          const updated = await userApi.updateUser(user.id, { is_loyal_customer: nextLoyal });
          if (updated) {
            setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, is_loyal_customer: nextLoyal } : u));
            showToast('success', 'Đã cập nhật trạng thái khách hàng thân thiết thành công.');
            
            if (currentUser && currentUser.id === user.id) {
              useAuthStore.getState().fetchMe().catch(() => {});
            }
          }
        } catch (err: any) {
          showToast('error', 'Không thể cập nhật trạng thái khách hàng thân thiết.');
        } finally {
          setProcessingUserIds(prev => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
        }
      }
    });
  };

  const handleToggleSubscriptionType = (user: User) => {
    const nextType = user.subscription_type === 'tra_sau' ? 'tra_truoc' : 'tra_sau';
    const label = nextType === 'tra_truoc' ? 'Trả trước' : 'Trả sau';

    setConfirmModal({
      title: 'Thay đổi loại thuê bao',
      message: `Bạn có chắc chắn muốn chuyển thuê bao này sang ${label}? Thao tác sẽ ảnh hưởng tới các gói cước người dùng có thể xem.`,
      onConfirm: async () => {
        setProcessingUserIds(prev => ({ ...prev, [user.id]: 'type' }));
        try {
          const updated = await userApi.updateUser(user.id, { subscription_type: nextType });
          if (updated) {
            setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, subscription_type: nextType } : u));
            showToast('success', `Đã cập nhật loại thuê bao của ${user.phoneNumber} sang ${label}.`);
            
            if (currentUser && currentUser.id === user.id) {
              useAuthStore.getState().fetchMe().catch(() => {});
            }
          }
        } catch (err: any) {
          showToast('error', 'Không thể cập nhật loại thuê bao.');
        } finally {
          setProcessingUserIds(prev => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
        }
      }
    });
  };

  const openBalanceModal = (user: User) => {
    setBalanceModalUser(user);
    setNewBalanceVal(String(user.balance));
    setBalanceError(null);
  };

  const handleUpdateBalance = async () => {
    if (!balanceModalUser) return;
    const balanceNum = Number(newBalanceVal);
    if (isNaN(balanceNum) || balanceNum < 0) {
      setBalanceError("Số dư ví không được là số âm.");
      return;
    }

    setProcessingUserIds(prev => ({ ...prev, [balanceModalUser.id]: 'balance' }));
    try {
      const success = await userApi.updateUserBalance(balanceModalUser.id, balanceNum);
      if (success) {
        setUsersList(prev => prev.map(u => u.id === balanceModalUser.id ? { ...u, balance: balanceNum } : u));
        showToast('success', `Đã cập nhật số dư cho tài khoản ${balanceModalUser.phoneNumber} thành công.`);
        setBalanceModalUser(null);
      } else {
        showToast('error', 'Cập nhật số dư thất bại.');
      }
    } catch (err: any) {
      showToast('error', 'Không thể cập nhật số dư ví ảo.');
    } finally {
      setProcessingUserIds(prev => {
        const next = { ...prev };
        delete next[balanceModalUser.id];
        return next;
      });
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Không rõ';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 relative animate-fade-in text-xs font-semibold max-w-7xl mx-auto px-2">
      {/* Toast Notification Container */}
      {toastMsg && (
        <div className={`fixed top-20 right-6 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl border transition-all duration-300 animate-scale-up bg-white text-slate-800 ${
          toastMsg.type === 'success' 
            ? 'border-emerald-500' 
            : 'border-red-500'
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 ${toastMsg.type === 'success' ? 'text-emerald-600' : 'text-primary'}`} />
          <span className="font-bold text-xs">{toastMsg.text}</span>
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Users className="w-6 h-6 text-primary mr-2" />
            Quản lý người dùng thuê bao
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">Danh sách các tài khoản khách hàng đăng ký trên hệ thống Viettel Portal.</p>
        </div>
        <button
          onClick={loadUsers}
          className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer text-xs shrink-0 self-start sm:self-center active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search Input UX */}
      <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm theo Số điện thoại hoặc Họ tên người dùng..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2.5 px-3 pl-10 text-slate-700 focus:outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* User Records Table Container */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden text-left">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs table-auto min-w-[1000px]">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
              <tr className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4 bg-slate-50">Họ và tên</th>
                <th className="p-4 bg-slate-50">Số điện thoại</th>
                <th className="p-4 bg-slate-50">Loại thuê bao</th>
                <th className="p-4 bg-slate-50">Khách hàng thân thiết</th>
                <th className="p-4 bg-slate-50">Số dư ví</th>
                <th className="p-4 bg-slate-50">Trạng thái</th>
                <th className="p-4 bg-slate-50">Vai trò</th>
                <th className="p-4 bg-slate-50">Ngày đăng ký</th>
                <th className="p-4 bg-slate-50 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRowSkeleton key={idx} />
                ))
              ) : usersList.length > 0 ? (
                usersList.map((user) => {
                  const isStatusLoading = processingUserIds[user.id] === 'status';
                  const isLoyaltyLoading = processingUserIds[user.id] === 'loyalty';
                  const isTypeLoading = processingUserIds[user.id] === 'type';
                  
                  return (
                    <tr key={user.id} className="hover:bg-red-50/5 transition-colors">
                      {/* Full Name */}
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.name}</span>
                        </div>
                      </td>
                      
                      {/* Phone Number */}
                      <td className="p-4 font-mono font-medium">{user.phoneNumber}</td>
                      
                      {/* Subscription Type Toggle */}
                      <td className="p-4">
                        <button
                          disabled={isTypeLoading}
                          onClick={() => handleToggleSubscriptionType(user)}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer select-none text-[10px] uppercase tracking-wider active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                            user.subscription_type === 'tra_sau' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title="Click để đổi loại thuê bao"
                        >
                          {isTypeLoading ? 'Đang đổi...' : (user.subscription_type === 'tra_sau' ? 'Trả sau' : 'Trả trước')}
                        </button>
                      </td>

                      {/* Loyal Customer (KHTT) Toggle */}
                      <td className="p-4">
                        <button
                          disabled={isLoyaltyLoading}
                          onClick={() => handleToggleLoyalty(user)}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none font-bold text-[10px] uppercase tracking-wider active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                            user.is_loyal_customer 
                              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                              : 'bg-slate-50 border-slate-200 text-slate-450 hover:bg-slate-100'
                          }`}
                          title="Click để bật/tắt ưu đãi KHTT"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${user.is_loyal_customer ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                          <span>{isLoyaltyLoading ? 'Cập nhật...' : (user.is_loyal_customer ? 'Thân thiết' : 'Thường')}</span>
                        </button>
                      </td>

                      {/* Balance (Adjust balance support) */}
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5 font-black text-slate-800 text-xs">
                          <span>{new Intl.NumberFormat('vi-VN').format(user.balance)}đ</span>
                          <button
                            onClick={() => openBalanceModal(user)}
                            className="p-1 hover:bg-slate-100 rounded text-blue-600 hover:text-blue-800 transition-colors cursor-pointer focus:outline-none"
                            title="Điều chỉnh số dư ví ảo"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Account Status Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                          user.status === 'blocked'
                            ? 'bg-red-50 border-red-200 text-primary'
                            : user.status === 'pending'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-250 text-emerald-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'blocked' ? 'bg-primary' : user.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span>{user.status === 'blocked' ? 'Bị khóa' : user.status === 'pending' ? 'Chờ kích hoạt' : 'Hoạt động'}</span>
                        </span>
                      </td>

                      {/* Role */}
                      <td className="p-4 uppercase font-bold text-[9px]">
                        {user.role === 'admin' ? (
                          <span className="text-primary bg-red-50 border border-red-200 px-2 py-0.5 rounded">ADMIN</span>
                        ) : (
                          <span className="text-slate-650 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">USER</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Action buttons - Khóa/Mở khóa */}
                      <td className="p-4 text-center">
                        <button
                          disabled={isStatusLoading}
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center space-x-1 border px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all focus:outline-none cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                            user.status === 'blocked'
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                              : 'bg-red-50 hover:bg-red-100 border-red-200 text-primary'
                          }`}
                        >
                          {user.status === 'blocked' ? (
                            <>
                              <Unlock className="w-3 h-3 shrink-0" />
                              <span>{isStatusLoading ? 'Đang mở...' : 'Mở tài khoản'}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>{isStatusLoading ? 'Đang khóa...' : 'Khóa tài khoản'}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 font-semibold">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!loading && usersList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold space-y-3 sm:space-y-0">
          <div>
            HIỂN THỊ TRANG <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{totalPages}</span> (TỔNG <span className="text-slate-800">{totalItems}</span> NGƯỜI DÙNG)
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trang trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <div key={p} className="flex items-center">
                    {showEllipsis && <span className="px-1.5 text-slate-400 font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg font-extrabold transition-all ${currentPage === p ? 'bg-primary text-white shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                      {p}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* Balance Adjust Modal */}
      {balanceModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-lg animate-scale-up text-left space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center">
              <Wallet className="w-5 h-5 text-primary mr-1.5 shrink-0" />
              Cập nhật số dư tài khoản
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Nhập số dư mới (VND) cho tài khoản <strong className="text-slate-800 font-extrabold">{balanceModalUser.name} ({balanceModalUser.phoneNumber})</strong>.
            </p>

            <div className="flex flex-col space-y-1.5">
              <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Số dư ví ảo (VND)</label>
              <input
                type="number"
                min="0"
                value={newBalanceVal}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewBalanceVal(val);
                  const num = Number(val);
                  if (isNaN(num) || num < 0) {
                    setBalanceError("Số dư ví không được là số âm.");
                  } else {
                    setBalanceError(null);
                  }
                }}
                className={`w-full bg-slate-50 border rounded-lg py-2.5 px-3 text-slate-700 focus:outline-none transition-colors ${
                  balanceError ? 'border-red-500 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                }`}
              />
              {balanceError && <p className="text-[10px] text-red-500 mt-0.5 font-bold">{balanceError}</p>}
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setBalanceModalUser(null)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-605 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUpdateBalance}
                disabled={!!balanceError || newBalanceVal === ''}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-lg animate-scale-up text-left space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {confirmModal.message}
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
