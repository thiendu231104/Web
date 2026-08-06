import { useState, useEffect } from 'react';
import {
  Clipboard,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Calendar,
  Layers,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { surveyApi } from '../../services/api';
import { TableRowSkeleton } from '../../components/Skeleton';

interface SurveyHistoryRecord {
  _id: string;
  userId: number | null;
  user_id?: number | null;
  phoneNumber: string;
  fullName?: string;
  source?: 'user' | 'guest';
  answers: Record<string, any>;
  filters: Record<string, any>;
  recommendedPackages: Array<any>;
  isEarlyTerminated: boolean;
  createdAt: string;
}

export default function AdminSurveys() {
  const [surveysList, setSurveysList] = useState<SurveyHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Search filter
  const [searchVal, setSearchVal] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search Debounce (300ms) -> resets page to 1
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchVal);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await surveyApi.getAdminSurveys({
        page: currentPage,
        limit: pageSize,
        search: searchKeyword
      });

      if (Array.isArray(res)) {
        setSurveysList(res);
        setTotalRecords(res.length);
        setTotalPages(1);
      } else if (res && Array.isArray(res.data)) {
        setSurveysList(res.data);
        if (res.pagination) {
          setCurrentPage(res.pagination.page || 1);
          setPageSize(res.pagination.limit || 10);
          setTotalRecords(res.pagination.total || res.data.length);
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setSurveysList([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải lịch sử khảo sát:", err);
      showToast('error', 'Không thể tải lịch sử khảo sát.');
      setSurveysList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, [currentPage, pageSize, searchKeyword]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fmtNum = (v: number): string => (Number(v) || 0).toLocaleString('vi-VN');

  const formatDate = (dateInput?: any) => {
    if (!dateInput) return '—';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return String(dateInput);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateInput);
    }
  };

  const translateAnswer = (key: string, val: any): string => {
    if (val === undefined || val === null) return '';
    if (key === 'phan_loai_goi') {
      if (val === 'Combo') return 'Combo (Data+Thoại)';
      if (val === 'Data') return 'Chỉ Data';
      if (val === 'MXH') return 'Mạng xã hội & Tiện ích';
    }
    if (key === 'phan_khuc_gia') {
      if (val === 'Gia_re') return 'Dưới 50k';
      if (val === 'Trung_binh') return '50k - 150k';
      if (val === 'Cao_cap') return 'Trên 150k';
    }
    if (key === 'chu_ky_ngay') {
      if (val === 'short') return 'Ngắn ngày';
      if (val === 'monthly') return 'Theo tháng';
      if (val === 'long') return 'Dài hạn';
    }
    if (key === 'loai_mang') {
      return `Mạng ${val}`;
    }
    if (key === 'free_noi_mang') {
      return val === 'voice' ? 'Cần thoại' : 'Không thoại';
    }
    return String(val);
  };

  const renderAnswersSummary = (answers: Record<string, any>) => {
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return <span className="text-slate-400 font-medium">—</span>;
    }

    const elements = Object.entries(answers)
      .map(([k, v]) => translateAnswer(k, v))
      .filter(item => !!item && item !== 'undefined' && item !== 'null');

    if (elements.length === 0) return <span className="text-slate-400 font-medium">—</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {elements.map((el, i) => (
          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
            {el}
          </span>
        ))}
      </div>
    );
  };

  // Calculate Record Range for Footer Info
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate Page Numbers Pill Array
  const renderPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages.map(p => (
      <button
        key={p}
        onClick={() => setCurrentPage(p)}
        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${p === currentPage
            ? 'bg-slate-900 text-white shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
      >
        {p}
      </button>
    ));
  };

  return (
    <div className="space-y-6 relative animate-fade-in text-xs font-semibold max-w-7xl mx-auto px-2">
      {/* Toast Notification Container */}
      {toastMsg && (
        <div className={`fixed top-20 right-6 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl border transition-all duration-300 animate-scale-up bg-white text-slate-800 ${toastMsg.type === 'success'
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
            <Clipboard className="w-6 h-6 text-primary mr-2" />
            Lịch sử khảo sát người dùng
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">Theo dõi nhu cầu tiêu dùng và các gói cước đề xuất tự động từ hệ thống Decision Tree.</p>
        </div>
        <button
          onClick={loadSurveys}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer text-xs shrink-0 self-start sm:self-center active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search Input Row */}
      <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl text-left flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Tìm kiếm theo Số điện thoại hoặc Tên người thực hiện..."
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

      {/* Surveys Table Container */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden text-left">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left border-collapse text-xs table-auto min-w-[900px]">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
              <tr className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4 bg-slate-50 w-24">ID Khảo sát</th>
                <th className="p-4 bg-slate-50 w-44">Người thực hiện</th>
                <th className="p-4 bg-slate-50">Nhu cầu lựa chọn (Lọc)</th>
                <th className="p-4 bg-slate-50 w-52">Gói cước đề xuất</th>
                <th className="p-4 bg-slate-50 w-36">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {loading ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <TableRowSkeleton key={idx} />
                ))
              ) : surveysList && surveysList.length > 0 ? (
                surveysList.map((hist, histIdx) => {
                  const safeId = hist._id ? String(hist._id).substring(0, 8) : `ID_${histIdx}`;
                  return (
                    <tr key={hist._id || histIdx} className="hover:bg-red-50/5 transition-colors">
                      {/* ID Khảo sát */}
                      <td className="p-4 font-mono font-bold text-slate-500">
                        #{safeId}
                      </td>

                      {/* Người thực hiện */}
                      <td className="p-4">
                        {hist.userId || hist.user_id ? (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-slate-900 font-bold text-xs">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                              <span>{hist.fullName || 'Thành viên'}</span>
                            </div>
                            <span className="font-mono text-slate-500 font-medium pl-5">{hist.phoneNumber || '—'}</span>
                            <div className="pl-5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                                Thành viên
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-slate-700 font-bold text-xs">
                              <UserX className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                              <span>{hist.fullName || 'Khách vãng lai'}</span>
                            </div>
                            {hist.phoneNumber && hist.phoneNumber !== 'Khách vãng lai' && (
                              <span className="font-mono text-slate-500 font-medium pl-5">{hist.phoneNumber}</span>
                            )}
                            <div className="pl-5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                                Khách vãng lai
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Nhu cầu lựa chọn */}
                      <td className="p-4">
                        {renderAnswersSummary(hist.answers)}
                      </td>

                      {/* Gói cước đề xuất */}
                      <td className="p-4">
                        {hist.recommendedPackages && Array.isArray(hist.recommendedPackages) && hist.recommendedPackages.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {hist.recommendedPackages.map((pkg, pIdx) => {
                              const code = typeof pkg === 'string' ? pkg : (pkg.ma_goi || pkg.ten || pkg.id || 'Gói');
                              const titleName = typeof pkg === 'object' ? (pkg.ten || code) : code;
                              return (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-red-50 border border-red-200 text-primary uppercase"
                                  title={titleName}
                                >
                                  <Layers className="w-2.5 h-2.5 text-primary shrink-0" />
                                  <span>{String(code).toUpperCase()}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Không có</span>
                        )}
                      </td>

                      {/* Thời gian */}
                      <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                        <span className="inline-flex items-center">
                          <Calendar className="w-3 h-3 text-slate-400 mr-1" />
                          {formatDate(hist.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 font-semibold">
                    Chưa có lịch sử khảo sát nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SERVER-SIDE PAGINATION FOOTER */}
        <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <strong className="text-slate-900">{startRecord}</strong> - <strong className="text-slate-900">{endRecord}</strong> trên tổng số <strong className="text-slate-900">{fmtNum(totalRecords)}</strong> lượt khảo sát
          </div>

          <div className="flex items-center gap-1.5">
            {/* Trang đầu */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all"
              title="Trang đầu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Trang trước */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Pill Buttons */}
            {renderPageNumbers()}

            {/* Trang sau */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Trang cuối */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all"
              title="Trang cuối"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
