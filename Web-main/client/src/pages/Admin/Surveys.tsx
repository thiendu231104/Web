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
  UserX
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
  recommendedPackages: Array<{
    id: string;
    ma_goi: string;
    ten: string;
    gia: number;
  }>;
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

  // Search Debounce (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const data = await surveyApi.getAdminSurveys({
        search: searchKeyword
      });
      setSurveysList(data || []);
    } catch (err: any) {
      console.error("Lỗi khi tải lịch sử khảo sát:", err);
      showToast('error', 'Không thể tải lịch sử khảo sát.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, [searchKeyword]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const formatDate = (dateInput?: any) => {
    if (!dateInput) return '—';
    try {
      const date = new Date(dateInput);
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
    if (!answers || Object.keys(answers).length === 0) return <span className="text-slate-400 font-medium">—</span>;
    
    const elements = Object.entries(answers)
      .map(([k, v]) => translateAnswer(k, v))
      .filter(item => !!item);

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
            <Clipboard className="w-6 h-6 text-primary mr-2" />
            Lịch sử khảo sát người dùng
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">Theo dõi nhu cầu tiêu dùng và các gói cước đề xuất tự động từ hệ thống Decision Tree.</p>
        </div>
        <button
          onClick={loadSurveys}
          className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer text-xs shrink-0 self-start sm:self-center active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search Input Row */}
      <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl text-left">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm theo Số điện thoại người thực hiện..."
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
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
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
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRowSkeleton key={idx} />
                ))
              ) : surveysList.length > 0 ? (
                surveysList.map((hist) => (
                  <tr key={hist._id} className="hover:bg-red-50/5 transition-colors">
                    {/* ID Khảo sát */}
                    <td className="p-4 font-mono font-bold text-slate-500">
                      #{hist._id.substring(0, 8)}
                    </td>

                    {/* Người thực hiện */}
                    <td className="p-4">
                      {hist.userId || hist.user_id ? (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-slate-900 font-bold text-xs">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                            <span>{hist.fullName || 'Thành viên'}</span>
                          </div>
                          <span className="font-mono text-slate-500 font-medium pl-5">{hist.phoneNumber}</span>
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
                      {hist.recommendedPackages && hist.recommendedPackages.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {hist.recommendedPackages.map((pkg) => (
                            <span 
                              key={pkg.id || pkg.ma_goi} 
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-red-50 border border-red-200 text-primary uppercase"
                              title={pkg.ten}
                            >
                              <Layers className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span>{(pkg.ma_goi || '').toUpperCase()}</span>
                            </span>
                          ))}
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
                ))
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
      </div>
    </div>
  );
}
