import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BarChart3, RefreshCw, Wifi, MessageSquare,
  Search, PieChart as PieChartIcon, Activity, AlertTriangle, Loader2,
  FileSpreadsheet, Coins, Zap, ShieldCheck, Clock, Calendar, Eye,
  Layers, Scale, ClipboardList, XCircle, Users, User, Target, ChevronDown, Printer
} from 'lucide-react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import axiosInstance from '../../services/axiosInstance';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Kpis {
  subscriptionRevenue: number;
  web3DepositsVND: number;
  web3DepositsETH: number;
  activePackages: number;
  chatbotInteractions: number;
}

interface TrendPoint {
  date: string;
  displayDate: string;
  revenue: number;
  subscriptions: number;
}

interface TopPackageItem {
  packageId: number;
  packageCode: string;
  packageName: string;
  price: number;
  count: number;
  revenue: number;
}

interface MostViewedPackageItem {
  packageId: number;
  packageCode: string;
  packageName: string;
  price: number;
  viewCount: number;
  buyCount: number;
  conversionRate: number;
}

interface DistributionItem {
  category: string;
  count: number;
}

interface SearchKeywordItem {
  keyword: string;
  count: number;
}

interface FlowSummaryItem {
  flowType: string;
  label: string;
  count: number;
  percentage: number;
}

interface SubLifecycle {
  active: number;
  cancelled: number;
  expired: number;
  replaced: number;
  autoRenewOn: number;
  autoRenewOff: number;
  autoRenewRate: number;
}

interface CompareStats {
  total: number;
  completed: number;
  completionRate: number;
  topCompared: { packageCode: string; count: number }[];
}

interface SurveyStats {
  total: number;
  topNeeds: { need: string; count: number }[];
}

interface ChatbotStats {
  total: number;
  guest: number;
  user: number;
}

interface LiveActivityItem {
  id: string;
  type: 'deposit' | 'activity' | 'chat';
  title: string;
  subtitle: string;
  timestamp: string;
  source: string;
}

interface AnalyticsPayload {
  kpis: Kpis;
  trend: TrendPoint[];
  topPackages: TopPackageItem[];
  mostViewedPackages: MostViewedPackageItem[];
  distribution: DistributionItem[];
  searchKeywords: SearchKeywordItem[];
  flowsSummary: FlowSummaryItem[];
  subLifecycle: SubLifecycle;
  compareStats: CompareStats;
  surveyStats: SurveyStats;
  chatbotStats: ChatbotStats;
  liveActivities: LiveActivityItem[];
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PIE_COLORS = ['#EE0033', '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6', '#EC4899'];

// Constant defining required flow types
const REQUIRED_FLOW_TYPES = [
  { flowType: 'SEARCH_VIEW', label: 'Tìm kiếm → Xem chi tiết' },
  { flowType: 'SEARCH_VIEW_SUBSCRIBE', label: 'Tìm kiếm → Xem chi tiết → Đăng ký' },
  { flowType: 'SEARCH_SUBSCRIBE_DIRECT', label: 'Tìm kiếm → Đăng ký trực tiếp' },
  { flowType: 'VIEW_ONLY', label: 'Chỉ xem chi tiết' },
  { flowType: 'VIEW_SUBSCRIBE', label: 'Xem chi tiết → Đăng ký' },
  { flowType: 'COMPARE_SUBSCRIBE', label: 'So sánh → Đăng ký' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoneyExact = (v: number): string => `${(Number(v) || 0).toLocaleString('vi-VN')} đ`;
const fmtNum = (v: number): string => (Number(v) || 0).toLocaleString('vi-VN');
const fmtETH = (v: number): string => {
  const num = Number(v) || 0;
  return num === 0 ? '0 ETH' : `${num.toFixed(4)} ETH`;
};
const fmtTimeAgo = (ts: string): string => {
  try {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${Math.max(1, diff)}s trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    return `${Math.floor(diff / 86400)}d trước`;
  } catch {
    return 'Gần đây';
  }
};

const getFirstDayOfCurrentMonthStr = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
};

const getTodayStr = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ─── Tooltip Component ────────────────────────────────────────────────────────
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 shadow-xl rounded-xl p-3 text-xs text-white space-y-1.5 min-w-[190px] print:hidden">
      <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}:
          </span>
          <span className="font-extrabold text-white">
            {entry.dataKey === 'revenue' ? fmtMoneyExact(entry.value) : `${fmtNum(entry.value)} lượt`}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Admin Analytics Component ───────────────────────────────────────────
export default function Analytics() {
  const [startDate, setStartDate] = useState<string>(getFirstDayOfCurrentMonthStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [rangeMode, setRangeMode] = useState<string>('custom');

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export dropdown state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAnalytics = useCallback(async (start: string, end: string, mode: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      if (mode === 'all') {
        query = '?range=all';
      } else if (mode === 'today') {
        query = '?range=today';
      } else {
        query = `?startDate=${start}&endDate=${end}`;
      }
      const res = await axiosInstance.get(`/api/admin/analytics${query}`);
      setData(res.data?.data ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể nạp dữ liệu thống kê từ CSDL.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(startDate, endDate, rangeMode);
  }, [startDate, endDate, rangeMode, fetchAnalytics]);

  // Real-time polling live stream every 15s (ONLY update liveActivities to prevent flickering)
  useEffect(() => {
    const timer = setInterval(() => {
      let query = '';
      if (rangeMode === 'all') query = '?range=all';
      else if (rangeMode === 'today') query = '?range=today';
      else query = `?startDate=${startDate}&endDate=${endDate}`;

      axiosInstance.get(`/api/admin/analytics${query}`)
        .then(res => {
          const newLive = res.data?.data?.liveActivities;
          if (newLive) {
            setData(prev => prev ? { ...prev, liveActivities: newLive } : res.data?.data);
          }
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [startDate, endDate, rangeMode]);

  // Map API's flowsSummary with REQUIRED_FLOW_TYPES
  const nonZeroFlowsSummary = useMemo(() => {
    const apiFlows = data?.flowsSummary || [];
    const totalCount = apiFlows.reduce((sum, item) => sum + (item.count || 0), 0);

    const mapped = REQUIRED_FLOW_TYPES.map(def => {
      const found = apiFlows.find(f => f.flowType === def.flowType);
      const count = found ? found.count : 0;
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0;
      return {
        flowType: def.flowType,
        label: def.label,
        count,
        percentage
      };
    });

    const filtered = mapped.filter(item => item.count > 0);
    return filtered.length > 0 ? filtered : mapped;
  }, [data]);

  // Filter out keywords with count === 0
  const activeKeywords = useMemo(() => {
    return (data?.searchKeywords || []).filter(k => k.count > 0);
  }, [data]);

  // Quick Preset Handlers
  const handleSetToday = () => {
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
    setRangeMode('today');
  };

  const handleSetThisMonth = () => {
    setStartDate(getFirstDayOfCurrentMonthStr());
    setEndDate(getTodayStr());
    setRangeMode('custom');
  };

  const handleSetAllTime = () => {
    setRangeMode('all');
  };

  // ── Excel (.xlsx) 2-Sheet Structured Export Handler ──────────────────────
  const handleExportExcel = () => {
    if (!data) return;
    setIsExportOpen(false);
    const wb = XLSX.utils.book_new();

    // SHEET 1: "TỔNG QUAN & DOANH THU THEO NGÀY"
    const sheet1Data = [
      ['BÁO CÁO THỐNG KÊ TỔNG QUAN & DOANH THU THEO NGÀY'],
      [`Mốc thời gian báo cáo: Từ ${startDate} Đến ${endDate}`],
      [`Thời điểm xuất file: ${new Date().toLocaleString('vi-VN')}`],
      [],
      ['1. BẢNG TỔNG HỢP CHỈ SỐ KPI VẬN HÀNH'],
      ['Hạng mục KPI', 'Giá trị thực tế', 'Đơn vị / Ghi chú'],
      ['Tổng Doanh Thu Đăng Ký Gói', fmtMoneyExact(data.kpis.subscriptionRevenue), 'VND'],
      ['Tổng Nạp Web3 (VND)', fmtMoneyExact(data.kpis.web3DepositsVND), 'VND'],
      ['Tổng Nạp Web3 (ETH)', fmtETH(data.kpis.web3DepositsETH), 'ETH'],
      ['Tổng Thuê Bao Active', data.kpis.activePackages, 'Gói đang chạy'],
      ['Tương tác Chatbot AI', data.kpis.chatbotInteractions, 'Lượt tin nhắn'],
      [],
      ['2. BẢNG CHI TIẾT BIẾN ĐỘNG THEO NGÀY'],
      ['Ngày (YYYY-MM-DD)', 'Doanh Thu (VND)', 'Số Lượt Đăng Ký Gói'],
      ...(data.trend || []).map(t => [
        t.date || t.displayDate,
        fmtMoneyExact(t.revenue),
        t.subscriptions
      ])
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    ws1['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'TONG_QUAN_DOANH_THU');

    // SHEET 2: "TOP GÓI CƯỚC & TỪ KHÓA"
    const sheet2Data = [
      ['BẢNG XẾP HẠNG TOP GÓI CƯỚC VÀ TỪ KHÓA TÌM KIẾM'],
      [`Mốc thời gian: Từ ${startDate} Đến ${endDate}`],
      [],
      ['1. BẢNG TOP GÓI CƯỚC ĐƯỢC QUAN TÂM (XEM CHI TIẾT VS MUA)'],
      ['STT', 'Mã Gói', 'Tên Gói Cước', 'Lượt Xem Chi Tiết', 'Lượt Đăng Ký Thực Tế', 'Tỷ Lệ Chuyển Đổi %'],
      ...(data.mostViewedPackages || []).map((p, idx) => [
        idx + 1,
        p.packageCode,
        p.packageName,
        p.viewCount,
        p.buyCount,
        `${p.conversionRate}%`
      ]),
      [],
      ['2. BẢNG TOP TỪ KHÓA TÌM KIẾM NHIỀU NHẤT'],
      ['STT', 'Từ Khóa Tìm Kiếm', 'Số Lượt Tìm Kiếm'],
      ...(data.searchKeywords || []).map((k, idx) => [
        idx + 1,
        k.keyword,
        k.count
      ])
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'TOP_GOI_TU_KHOA');

    const fileName = `Bao_Cao_Viettel_Analytics_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ── PDF / Print Export Handler ───────────────────────────────────────────
  const handleExportPDF = () => {
    setIsExportOpen(false);
    window.print();
  };

  const d = data;

  return (
    <div className="space-y-6 pb-8 animate-fade-in font-sans text-slate-800">

      {/* ── PRINT HEADER (ONLY VISIBLE ON PRINT / PDF) ────────────────────── */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
          BÁO CÁO THỐNG KÊ QUẢN TRỊ VIETTEL TELECOM
        </h1>
        <p className="text-xs text-slate-600 font-bold mt-1">
          Mốc thời gian: Từ {startDate} đến {endDate} — Thời điểm in báo cáo: {new Date().toLocaleString('vi-VN')}
        </p>
      </div>

      {/* ── HEADER CONTROL BAR WITH DROPDOWN MENU ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Báo Cáo Thống Kê Quản Trị
            </h1>
          </div>
        </div>

        {/* Date Range Picker & Export Dropdown Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Calendar Inputs */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRangeMode('custom');
                }}
                className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
              />
            </div>
            <span className="text-slate-300 font-bold">→</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRangeMode('custom');
                }}
                className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handleSetToday}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rangeMode === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={handleSetThisMonth}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rangeMode === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={handleSetAllTime}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rangeMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Export Report Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsExportOpen(prev => !prev)}
              disabled={loading || !d}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Options */}
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-black text-slate-900">Xuất Excel Pro (.xlsx)</span>
                    <span className="block text-[10px] text-slate-400 font-semibold">Gồm 2 Sheet đầy đủ chi tiết</span>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="block font-black text-slate-900">Xuất Báo Cáo PDF / In</span>
                    <span className="block text-[10px] text-slate-400 font-semibold">Định dạng A4 in ấn chuẩn</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchAnalytics(startDate, endDate, rangeMode)}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold text-red-700 print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAnalytics(startDate, endDate, rangeMode)}
            className="bg-white border border-red-300 px-3 py-1 rounded-lg text-red-700 font-bold hover:bg-red-50"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Doanh Thu Đăng Ký */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Doanh Thu Đăng Ký</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                {loading ? '...' : fmtMoneyExact(d?.kpis.subscriptionRevenue ?? 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Số lượt đăng ký:</span>
            <span className="font-extrabold text-primary bg-red-50 px-2 py-0.5 rounded-md">
              {loading ? '...' : `${fmtNum(d?.trend.reduce((acc, curr) => acc + curr.subscriptions, 0) ?? 0)} lượt`}
            </span>
          </div>
        </div>

        {/* KPI 2: Tiền Nạp Web3 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tiền Nạp Ví Web3</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                {loading ? '...' : fmtMoneyExact(d?.kpis.web3DepositsVND ?? 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Quy đổi Blockchain:</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {loading ? '...' : fmtETH(d?.kpis.web3DepositsETH ?? 0)}
            </span>
          </div>
        </div>

        {/* KPI 3: Gói Đang Hoạt Động */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Gói Đang Hoạt Động</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                {loading ? '...' : fmtNum(d?.kpis.activePackages ?? 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Wifi className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Trạng thái thuê bao:</span>
            <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              ACTIVE
            </span>
          </div>
        </div>

        {/* KPI 4: Tương Tác Chatbot */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tương Tác Chatbot AI</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                {loading ? '...' : fmtNum(d?.kpis.chatbotInteractions ?? 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Số lượt hỏi đáp:</span>
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              {loading ? '...' : `${fmtNum(d?.kpis.chatbotInteractions ?? 0)} tin nhắn`}
            </span>
          </div>
        </div>

      </div>

      {/* ── SECTION: SUBSCRIPTION LIFECYCLE ANALYTICS ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Thống Kê Vòng Đời Gói Cước
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 🟢 ACTIVE */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-emerald-800 uppercase">Đang Hoạt Động</p>
              <h4 className="text-xl font-black text-emerald-900 mt-1">{fmtNum(d?.subLifecycle?.active ?? 0)}</h4>
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* 🔴 CANCELLED */}
          <div className="bg-rose-50/60 border border-rose-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-rose-800 uppercase">Đã Hủy Gói</p>
              <h4 className="text-xl font-black text-rose-900 mt-1">{fmtNum(d?.subLifecycle?.cancelled ?? 0)}</h4>
            </div>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>

          {/* 🟡 EXPIRED */}
          <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-amber-800 uppercase">Đã Hết Hạn</p>
              <h4 className="text-xl font-black text-amber-900 mt-1">{fmtNum(d?.subLifecycle?.expired ?? 0)}</h4>
            </div>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>

          {/* 🔵 REPLACED */}
          <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-blue-800 uppercase">Đã Nâng Cấp / Thay Thế</p>
              <h4 className="text-xl font-black text-blue-900 mt-1">{fmtNum(d?.subLifecycle?.replaced ?? 0)}</h4>
            </div>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* AutoRenew Stats Banner */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Tự Động Gia Hạn (Auto-Renew):</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              {fmtNum(d?.subLifecycle?.autoRenewOn ?? 0)} gói BẬT
            </span>
            <span className="font-extrabold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
              {fmtNum(d?.subLifecycle?.autoRenewOff ?? 0)} gói TẮT
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Tỷ lệ gia hạn tự động:</span>
            <span className="font-black text-sm text-primary bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-lg">
              {d?.subLifecycle?.autoRenewRate ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION: TOP GÓI CƯỚC ĐƯỢC QUAN TÂM & PHỄU CHUYỂN ĐỔI ────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Phân Tích Quan Tâm &amp; Phễu Chuyển Đổi
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 6/12: TOP GÓI CƯỚC ĐƯỢC QUAN TÂM NHẤT (XEM CHI TIẾT & CHUYỂN ĐỔI %) */}
          <div className="lg:col-span-6 bg-slate-50/70 rounded-2xl p-5 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Top Gói Cước Được Quan Tâm Nhiều Nhất</span>
              </h3>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Xem vs Mua</span>
            </div>

            {loading ? (
              <div className="space-y-2 py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" /></div>
            ) : !d || !d.mostViewedPackages || d.mostViewedPackages.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 py-4 text-center">Chưa có dữ liệu xem chi tiết gói</p>
            ) : (
              <div className="space-y-2.5">
                {d.mostViewedPackages.map((pkg, idx) => (
                  <div key={pkg.packageId} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-4 font-black text-slate-400 text-center shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{pkg.packageCode}</span>
                          <span className="font-semibold text-slate-700 truncate">{pkg.packageName}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Xem chi tiết: <strong className="text-slate-700">{fmtNum(pkg.viewCount)}</strong> lượt · Đăng ký mua: <strong className="text-emerald-700">{fmtNum(pkg.buyCount)}</strong> lượt
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={`font-black text-xs px-2.5 py-1 rounded-lg border block ${
                        pkg.conversionRate >= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        pkg.conversionRate >= 10 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {pkg.conversionRate}%
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase block mt-0.5">Chuyển đổi</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT 6/12: CONVERSION FUNNEL */}
          <div className="lg:col-span-6 bg-slate-50/70 rounded-2xl p-5 border border-slate-100 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/60 pb-2 flex items-center justify-between">
              <span>Phễu Chuyển Đổi Tiến Trình</span>
              <span className="text-[10px] text-slate-400 font-semibold lowercase">Tỷ lệ %</span>
            </h3>

            {loading ? (
              <div className="space-y-2 py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" /></div>
            ) : (
              <div className="space-y-2.5">
                {nonZeroFlowsSummary.map(flow => (
                  <div key={flow.flowType} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{flow.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{fmtNum(flow.count)} lượt</span>
                        <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                          flow.count > 0 ? 'text-red-600 bg-red-50 border border-red-100' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {flow.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-red-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, flow.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── SECTION: THỐNG KÊ SO SÁNH, KHẢO SÁT & CHATBOT AI ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: So Sánh Gói Cước */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">So Sánh Gói Cước</h3>
              </div>
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Compare
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tổng Lượt So Sánh</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">{fmtNum(d?.compareStats?.total ?? 0)}</span>
              </div>
              <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                <span className="text-purple-700 font-semibold block text-[10px] uppercase">Tỷ Lệ Hoàn Thành</span>
                <span className="text-lg font-black text-purple-900 mt-1 block">{d?.compareStats?.completionRate ?? 0}%</span>
              </div>
            </div>

            {d?.compareStats?.topCompared && d.compareStats.topCompared.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Top Gói Được So Sánh Nhiều nhất:</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.compareStats.topCompared.map(t => (
                    <span key={t.packageCode} className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      {t.packageCode} ({t.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Khảo Sát Đề Xuất */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Khảo Sát Nhu Cầu</h3>
              </div>
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Survey
              </span>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs flex items-center justify-between">
              <span className="text-blue-900 font-bold">Tổng số lượt thực hiện khảo sát:</span>
              <span className="text-lg font-black text-blue-900">{fmtNum(d?.surveyStats?.total ?? 0)}</span>
            </div>

            {d?.surveyStats?.topNeeds && d.surveyStats.topNeeds.length > 0 && (
              <div className="space-y-1.5 pt-1 text-xs">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Top 3 Nhu Cầu Được Chọn Nhiều Nhất:</p>
                <div className="space-y-1.5">
                  {d.surveyStats.topNeeds.map((tn, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700 truncate">{idx + 1}. {tn.need}</span>
                      <span className="font-extrabold text-blue-600 shrink-0 ml-2">{tn.count} lượt</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Chatbot AI Source Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Nguồn Chatbot AI</h3>
              </div>
              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                AI Source
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                <span className="text-indigo-700 font-semibold block text-[10px] uppercase flex items-center gap-1">
                  <User className="w-3 h-3" /> Đã Đăng Nhập
                </span>
                <span className="text-lg font-black text-indigo-900 mt-1 block">{fmtNum(d?.chatbotStats?.user ?? 0)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase flex items-center gap-1">
                  <Users className="w-3 h-3" /> Khách Vãng Lai
                </span>
                <span className="text-lg font-black text-slate-900 mt-1 block">{fmtNum(d?.chatbotStats?.guest ?? 0)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium flex items-center justify-between">
              <span>Tổng lượt hỏi đáp AI:</span>
              <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {fmtNum(d?.chatbotStats?.total ?? 0)} msgs
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── MAIN CONTENT GRID (8 / 4 LAYOUT WITH LIVE STREAM SIDEBAR) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN 8/12 */}
        <div className="lg:col-span-8 space-y-6">

          {/* Biểu Đồ Doanh Thu & Đăng Ký Theo Ngày */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Biến Động Doanh Thu &amp; Số Lượt Đăng Ký
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold self-start sm:self-auto">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                  <span className="text-slate-600">Doanh thu (VND)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  <span className="text-slate-600">Số lượt đăng ký</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={d?.trend || []} margin={{ top: 20, right: 25, bottom: 0, left: 10 }}>
                      <defs>
                        <linearGradient id="mainRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EE0033" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#EE0033" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => fmtMoneyExact(v)}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `${v} lượt`}
                      />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu"
                        stroke="#EE0033"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#mainRevenueGrad)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="subscriptions"
                        name="Số lượt đăng ký"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3B82F6', stroke: '#ffffff', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* DAILY SUMMARY TABLE (PRINT-FRIENDLY & DETAILED VIEW) */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Bảng Tóm Tắt Số Liệu Doanh Thu &amp; Đăng Ký Theo Ngày</span>
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Print-Friendly Summary
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-extrabold text-[11px] uppercase border-b border-slate-200">
                          <th className="py-2.5 px-4 font-extrabold">Ngày (YYYY-MM-DD)</th>
                          <th className="py-2.5 px-4 text-right font-extrabold">Doanh Thu (VND)</th>
                          <th className="py-2.5 px-4 text-right font-extrabold">Số Lượt Đăng Ký</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800 bg-white">
                        {d?.trend && d.trend.length > 0 ? (
                          d.trend.map(row => (
                            <tr key={row.date || row.displayDate} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-4 font-mono font-bold text-slate-700">{row.date || row.displayDate}</td>
                              <td className="py-2 px-4 text-right font-black text-red-600">{fmtMoneyExact(row.revenue)}</td>
                              <td className="py-2 px-4 text-right font-black text-blue-600">{fmtNum(row.subscriptions)} lượt</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-400 font-semibold">Chưa có dữ liệu theo ngày</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grid 2 Columns: Top Gói Cước & Biểu Đồ Tròn Phân Bổ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Bảng Top Gói Cước */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Top Gói Cước Đăng Ký</h3>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    Top 10
                  </span>
                </div>
                {loading ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-slate-50 animate-pulse rounded-lg" />)}
                  </div>
                ) : !d || d.topPackages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold">Chưa có dữ liệu đăng ký</div>
                ) : (
                  <div className="space-y-2">
                    {d.topPackages.slice(0, 6).map((pkg, idx) => (
                      <div key={pkg.packageId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 font-black text-slate-400 text-center shrink-0">{idx + 1}.</span>
                          <span className="font-extrabold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{pkg.packageCode}</span>
                          <span className="font-medium text-slate-600 truncate">{pkg.packageName}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-black text-primary block">{fmtNum(pkg.count)} lượt</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{fmtMoneyExact(pkg.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Biểu Đồ Tròn Phân Bổ Gói Cước */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Phân Bổ Loại Gói Cước</h3>
                  <PieChartIcon className="w-4 h-4 text-slate-400" />
                </div>
                {loading ? (
                  <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                ) : !d || d.distribution.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-semibold">Chưa có dữ liệu phân bổ</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center h-48">
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={d.distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={56}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="category"
                          >
                            {d.distribution.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [`${fmtNum(Number(v))} lượt`, String(n)]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5">
                      {d.distribution.map((dist, i) => (
                        <div key={dist.category} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="font-semibold text-slate-700 truncate">{dist.category}</span>
                          </div>
                          <span className="font-extrabold text-slate-900 ml-2">{fmtNum(dist.count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bảng Top Từ Khóa Tìm Kiếm */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Top Từ Khóa Tìm Kiếm</h3>
              <Search className="w-4 h-4 text-slate-400" />
            </div>

            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : activeKeywords.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">Chưa có dữ liệu từ khóa tìm kiếm</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeKeywords.slice(0, 5).map((kw, i) => (
                  <div key={kw.keyword} className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 w-4 shrink-0">{i + 1}.</span>
                      <span className="text-xs font-bold text-slate-800 truncate">{kw.keyword}</span>
                    </div>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg shrink-0">
                      {fmtNum(kw.count)} lượt
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN 4/12: LIVE ACTIVITY STREAM SIDEBAR */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-20 print:hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900">Luồng Hoạt Động Thời Gian Thực</h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Realtime
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1"><div className="h-3 bg-slate-100 rounded w-28" /><div className="h-2 bg-slate-50 rounded w-40" /></div>
                </div>
              ))}
            </div>
          ) : !d || d.liveActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Chưa có hoạt động mới</div>
          ) : (
            <div className="space-y-3.5 max-h-[620px] overflow-y-auto no-scrollbar pr-1">
              {d.liveActivities.map(act => {
                const isDeposit = act.type === 'deposit';
                const isChat = act.type === 'chat';
                return (
                  <div key={act.id} className="flex items-start gap-3 text-xs group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDeposit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      isChat ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                      'bg-red-50 text-primary border border-red-100'
                    }`}>
                      {isDeposit ? <Coins className="w-4 h-4" /> : isChat ? <MessageSquare className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-900 truncate">{act.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">{fmtTimeAgo(act.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{act.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
