import { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Calendar,
  User,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  EyeOff,
  UserCheck,
  UserX,
  Send,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { contactApi } from '../../services/api';
import { TableRowSkeleton } from '../../components/Skeleton';
import type { Contact } from '../../types';

export default function AdminContacts() {
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters state
  const [searchVal, setSearchVal] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'user' | 'guest'>('ALL');

  // Drawer / Modal state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy code feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search Debounce (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await contactApi.getAdminContacts({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchKeyword,
        source: sourceFilter !== 'ALL' ? sourceFilter : undefined
      });
      setContactsList(data || []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách yêu cầu liên hệ:', err);
      showToast('error', 'Không thể tải danh sách liên hệ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [statusFilter, searchKeyword, sourceFilter]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPI Statistics Calculation
  const stats = useMemo(() => {
    const total = contactsList.length;
    const pending = contactsList.filter(
      (c) => c.status === 'NEW' || c.status === 'READ' || c.status === 'PROCESSING'
    ).length;
    const done = contactsList.filter(
      (c) => c.status === 'DONE' || c.status === 'CLOSED' || !!c.admin_note?.trim()
    ).length;
    const deletedByUser = contactsList.filter((c) => c.is_deleted_by_user === true).length;

    return { total, pending, done, deletedByUser };
  }, [contactsList]);

  // Open Drawer helper
  const handleOpenDrawer = (contact: Contact) => {
    setSelectedContact(contact);
    setReplyMessage(contact.admin_note || '');
  };

  // Submit Admin Reply
  const handleSubmitReply = async () => {
    if (!selectedContact || !replyMessage.trim()) return;
    setSubmittingReply(true);
    try {
      await contactApi.replyContact(selectedContact.contact_id, replyMessage.trim(), 'DONE');
      showToast('success', 'Đã lưu và gửi phản hồi thành công!');
      setSelectedContact(null);
      setReplyMessage('');
      loadContacts();
    } catch (err: any) {
      console.error('Lỗi khi gửi phản hồi:', err);
      showToast('error', err.response?.data?.message || 'Gửi phản hồi thất bại.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Delete Admin Contact
  const confirmDeleteAdminContact = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const success = await contactApi.deleteAdminContact(deleteTarget.contact_id);
      if (success) {
        showToast('success', 'Đã xóa bản ghi liên hệ khỏi hệ thống.');
        setContactsList((prev) => prev.filter((item) => item.contact_id !== deleteTarget.contact_id));
      } else {
        showToast('error', 'Xóa bản ghi thất bại.');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi xóa bản ghi.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick reply templates
  const quickTemplates = [
    'Vấn đề của bạn đã được tiếp nhận và chuyển đến bộ phận chuyên môn xử lý.',
    'Yêu cầu đã được kiểm tra và xử lý thành công. Cảm ơn bạn đã phản hồi.',
    'Bộ phận CSKH Viettel đã liên hệ hỗ trợ trực tiếp qua số điện thoại.'
  ];

  // Formatting helpers
  const formatDate = (dateInput?: any) => {
    if (!dateInput) return '—';
    try {
      const date = new Date(dateInput);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(date.getHours())}:${pad(date.getMinutes())} - ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    } catch (e) {
      return String(dateInput);
    }
  };

  const truncateMessage = (msg: string, limit = 60) => {
    if (!msg) return '—';
    if (msg.length <= limit) return msg;
    return `${msg.substring(0, limit)}...`;
  };

  return (
    <div className="space-y-6 relative animate-fade-in text-slate-800 max-w-7xl mx-auto px-2">
      {/* Toast Notification Container */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl border transition-all duration-300 animate-scale-up bg-white text-slate-800 ${
            toastMsg.type === 'success' ? 'border-emerald-500' : 'border-[#EE0033]'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 shrink-0 ${
              toastMsg.type === 'success' ? 'text-emerald-600' : 'text-[#EE0033]'
            }`}
          />
          <span className="font-bold text-xs">{toastMsg.text}</span>
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-[#EE0033] border border-red-100">
              <ShieldCheck className="w-3 h-3" />
              Hệ thống hỗ trợ CSKH Viettel
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Phone className="w-6 h-6 text-[#EE0033]" />
            Quản Lý Yêu Cầu Liên Hệ & CSKH
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Bảng điều khiển trung tâm tiếp nhận, tra cứu và xử lý phản hồi yêu cầu hỗ trợ khách hàng.
          </p>
        </div>

        <button
          onClick={loadContacts}
          className="inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-sm focus:outline-none cursor-pointer text-xs shrink-0 active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Tổng yêu cầu
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[10px] font-semibold text-slate-400">Tất cả yêu cầu đã tiếp nhận</p>
        </div>

        {/* Card 2: Pending */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">
              Chờ xử lý
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center relative">
              <Clock className="w-4 h-4" />
              {stats.pending > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
          <p className="text-[10px] font-semibold text-amber-700/80">NEW / PROCESSING</p>
        </div>

        {/* Card 3: Done */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
              Đã phản hồi
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.done}</p>
          <p className="text-[10px] font-semibold text-emerald-700/80">DONE</p>
        </div>

        {/* Card 4: Soft Deleted */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Khách đã ẩn
            </span>
            <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-700">{stats.deletedByUser}</p>
          <p className="text-[10px] font-semibold text-slate-400">Ẩn khỏi UI cá nhân của khách</p>
        </div>
      </div>

      {/* Smart Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-left">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm theo Mã YC (#CT...), Họ tên, Số điện thoại hoặc nội dung..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#EE0033] focus:bg-white rounded-2xl py-2.5 px-3 pl-10 pr-10 text-xs font-semibold text-slate-800 focus:outline-none transition-all"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Source Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 h-11 rounded-2xl text-xs font-bold text-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="bg-transparent focus:outline-none cursor-pointer text-xs font-semibold"
              >
                <option value="ALL">Tất cả nguồn</option>
                <option value="user">Thành viên (User)</option>
                <option value="guest">Khách vãng lai (Guest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Chips Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chờ xử lý ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('DONE')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'DONE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã phản hồi ({stats.done})
            </button>
          </div>
        </div>
      </div>

      {/* Smart Data Table Container */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[980px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                <th className="p-4 w-32">Mã YC & Nguồn</th>
                <th className="p-4 w-48">Khách hàng</th>
                <th className="p-4 w-48">Chủ đề & Nội dung</th>
                <th className="p-4 w-36">Trạng thái xử lý</th>
                <th className="p-4 w-32">Trạng thái Lịch sử</th>
                <th className="p-4 w-36">Thời gian</th>
                <th className="p-4 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => <TableRowSkeleton key={idx} />)
              ) : contactsList.length > 0 ? (
                contactsList.map((contact) => {
                  const isDone =
                    contact.status === 'DONE' ||
                    contact.status === 'CLOSED' ||
                    !!contact.admin_note?.trim();

                  return (
                    <tr key={contact.contact_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Mã YC & Nguồn */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleCopyCode(contact.contact_id)}
                            title="Bấm để sao chép mã"
                            className="inline-flex items-center gap-1 font-mono font-bold text-xs text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>#{contact.contact_id.substring(0, 10)}...</span>
                            {copiedId === contact.contact_id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          <div>
                            {contact.source === 'user' || contact.user_id ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                                <UserCheck className="w-3 h-3" />
                                Thành viên
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                                <UserX className="w-3 h-3 text-slate-400" />
                                Khách vãng lai
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {contact.full_name}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 font-semibold pl-4">
                            {contact.phone}
                          </p>
                          {contact.user_id && (
                            <p className="text-[9px] text-slate-400 pl-4 font-mono">
                              UID: #{contact.user_id}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Chủ đề & Nội dung */}
                      <td className="p-4">
                        <div className="space-y-1 max-w-xs">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {contact.topic || 'Liên hệ chung'}
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                            {truncateMessage(contact.message)}
                          </p>
                        </div>
                      </td>

                      {/* Trạng thái xử lý */}
                      <td className="p-4">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã phản hồi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            Chờ xử lý
                          </span>
                        )}
                      </td>

                      {/* Trạng thái Lịch sử User */}
                      <td className="p-4">
                        {contact.is_deleted_by_user ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <EyeOff className="w-3 h-3 text-slate-400" />
                            Khách đã ẩn
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Hiển thị</span>
                        )}
                      </td>

                      {/* Thời gian */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(contact.created_at)}
                          </p>
                          {contact.handled_at && (
                            <p className="text-[9px] text-emerald-600 font-semibold pl-4">
                              Phản hồi: {formatDate(contact.handled_at)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDrawer(contact)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                              isDone
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                : 'bg-[#EE0033] hover:bg-[#d4002d] text-white shadow-sm'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isDone ? 'Xem/Sửa' : 'Phản hồi'}</span>
                          </button>

                          <button
                            onClick={() => setDeleteTarget(contact)}
                            title="Xóa bản ghi Admin"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                    Không tìm thấy yêu cầu liên hệ nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────── CSKH RESPONSE RIGHT DRAWER ────────────────── */}
      {selectedContact && (
        <>
          {/* Backdrop Layer */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setSelectedContact(null)}
          />

          {/* Drawer Main Container */}
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col h-screen max-h-screen overflow-hidden animate-slide-left text-left border-l border-slate-100">
            {/* Drawer Header (Fixed Top) */}
            <div className="flex-shrink-0 p-5 border-b bg-[#0f172a] text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EE0033] text-white flex items-center justify-center font-black">
                  CSKH
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Chi tiết & Phản hồi Yêu cầu
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Mã: #{selectedContact.contact_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable Middle Section Only) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Customer Info Card */}
              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-3xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div>
                    <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      {selectedContact.full_name}
                    </p>
                    <p className="text-xs font-mono font-semibold text-slate-600 pl-5">
                      SĐT: {selectedContact.phone}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        selectedContact.source === 'user'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedContact.source === 'user' ? 'Thành viên' : 'Khách vãng lai'}
                    </span>
                    {selectedContact.is_deleted_by_user && (
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 justify-end">
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        Khách đã ẩn lịch sử
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-extrabold">
                      Chủ đề: {selectedContact.topic}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDate(selectedContact.created_at)}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 mt-2">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Nội dung câu hỏi từ khách hàng:
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                      {selectedContact.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guest Warning Alert */}
              {!selectedContact.user_id && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-semibold text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Lưu ý: Đây là Khách vãng lai. Hệ thống sẽ lưu câu trả lời cho tra cứu online. Nếu cần hỗ trợ khẩn cấp, Admin vui lòng liên hệ trực tiếp qua số điện thoại <strong>{selectedContact.phone}</strong>.
                  </span>
                </div>
              )}

              {/* Admin Action Block */}
              <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                {/* Quick Response Templates */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Mẫu phản hồi nhanh (Click để chèn)
                  </span>
                  <div className="space-y-1.5">
                    {quickTemplates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReplyMessage(tpl)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <span className="line-clamp-1">{tpl}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Textarea */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#EE0033]" />
                    Nội dung câu trả lời / Phản hồi CSKH
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Nhập nội dung phản hồi chính thức cho khách hàng..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#EE0033] focus:bg-white rounded-2xl p-4 text-xs font-semibold text-slate-800 focus:outline-none transition-all"
                  />
                </div>

                {/* Handler Info */}
                {selectedContact.handled_at && (
                  <div className="text-[11px] text-slate-400 font-semibold pt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lần phản hồi cuối: {formatDate(selectedContact.handled_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions (Fixed Bottom) */}
            <div className="flex-shrink-0 p-4 border-t bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                disabled={submittingReply}
                onClick={() => setSelectedContact(null)}
                className="px-5 h-11 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingReply || !replyMessage.trim()}
                onClick={handleSubmitReply}
                className="px-7 h-11 rounded-2xl bg-[#EE0033] hover:bg-[#d4002d] text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {submittingReply ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>LƯU & GỬI PHẢN HỒI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Single Item Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-scale-up text-left">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#EE0033]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Xóa vĩnh viễn bản ghi</h3>
                <p className="text-xs text-slate-400 font-medium">Mã yêu cầu: #{deleteTarget.contact_id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              Bạn có chắc chắn muốn xóa bản ghi yêu cầu hỗ trợ của khách hàng <strong>"{deleteTarget.full_name}"</strong> khỏi cơ sở dữ liệu hệ thống?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 h-10 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteAdminContact}
                className="px-5 h-10 rounded-xl bg-[#EE0033] hover:bg-[#d4002d] text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa bản ghi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
