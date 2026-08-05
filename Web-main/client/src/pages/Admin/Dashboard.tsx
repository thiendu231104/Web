import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users, Wifi, CreditCard, MessageSquare,
  RefreshCw, AlertTriangle, ArrowUpRight, Loader2,
  Activity, BarChart3, Phone, CheckCircle2, Clock,
  Zap, Inbox, ChevronLeft, ChevronRight, Shield, WifiOff
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { transactionApi, compareApi, contactApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface StatsCards {
  totalUsersCount: number;
  totalPackagesCount: number;
  totalRevenueVal: number;
  totalSubscriptionsCount: number;
}
interface ChartPoint { label: string; val: number; }
interface DepositItem {
  deposit_id: number;
  phoneNumber: string;
  fullname?: string;
  amountVND: number;
  status: string;
  created_at: string;
}
interface ContactItem {
  contact_id: string;
  full_name: string;
  phone: string;
  message: string;
  topic?: string;
  status?: string;
  created_at?: string;
}
interface TopPackage { packageId: string; count: number; }

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND = '#EE0033';
const PIE_COLORS: Record<string, string> = {
  NEW: '#EE0033', READ: '#F59E0B', PROCESSING: '#3B82F6',
  DONE: '#10B981', CLOSED: '#6B7280',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (v: number): string => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}T đ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M đ`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k đ`;
  return `${v.toLocaleString('vi-VN')} đ`;
};
const fmtNum = (v: number): string => v.toLocaleString('vi-VN');
const fmtDateShort = (s?: string): string => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
  } catch { return '—'; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Sk = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-100 rounded-lg ${className ?? ''}`} />
);

const AreaTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-slate-400 text-[10px] font-bold mb-0.5">{label}</p>
      <p className="text-white font-extrabold text-xs">{Number(payload[0].value).toLocaleString('vi-VN')}đ</p>
    </div>
  );
};

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-slate-400 text-[10px] font-bold mb-0.5">{label}</p>
      <p className="text-white font-extrabold text-xs">{payload[0].value} lượt</p>
    </div>
  );
};

interface StatCardProps {
  label: string; value: string; sub: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  loading: boolean; onClick?: () => void; badge?: React.ReactNode;
}
const StatCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, loading, onClick, badge }: StatCardProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between"><Sk className="h-3 w-24" /><Sk className="h-10 w-10 rounded-xl" /></div>
        <Sk className="h-8 w-32" /><Sk className="h-2.5 w-20" />
      </div>
    );
  }
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md p-5 transition-all duration-300 group flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
      <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-50">
        {badge ?? <span className="text-[10px] text-slate-400 font-semibold">{sub}</span>}
      </div>
    </div>
  );
};

const ErrBanner = ({ msg, onRetry }: { msg: string; onRetry: () => void }) => (
  <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[11px] font-semibold text-red-600">
    <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>{msg}</span></div>
    <button onClick={onRetry} className="flex items-center gap-1 bg-white border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 font-bold ml-4 shrink-0">
      <RefreshCw className="w-3 h-3" />Thử lại
    </button>
  </div>
);

const DepositBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();
  if (s === 'success') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Thành công</span>;
  if (s === 'pending') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />Đang xử lý</span>;
  if (s === 'cancelled') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />Đã hủy</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-100 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{status}</span>;
};

const ContactBadge = ({ status }: { status?: string }) => {
  const s = (status ?? 'NEW').toUpperCase();
  if (s === 'DONE' || s === 'CLOSED') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700"><CheckCircle2 className="w-2.5 h-2.5" />Đã xử lý</span>;
  if (s === 'PROCESSING') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 border border-blue-100 text-blue-700"><Clock className="w-2.5 h-2.5" />Đang xử lý</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-100 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" />Mới</span>;
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [isOffline, setIsOffline] = useState(false);

  // ── Stats (accounts + goi_cuoc + deposits + user_subscriptions) ────────────
  const [stats, setStats] = useState<StatsCards | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Revenue trends chart data ──────────────────────────────────────────────
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  // ── Deposits (bảng phân trang) ─────────────────────────────────────────────
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [depositsError, setDepositsError] = useState<string | null>(null);
  const [depPage, setDepPage] = useState(1);
  const [depTotalPages, setDepTotalPages] = useState(1);
  const [depTotalItems, setDepTotalItems] = useState(0);
  const [depPageLoading, setDepPageLoading] = useState(false);
  const depCacheRef = useRef<Record<number, { data: DepositItem[]; totalPages: number; totalItems: number }>>({});

  // ── Top packages (goi_cuoc) ────────────────────────────────────────────────
  const [topPkgs, setTopPkgs] = useState<TopPackage[]>([]);
  const [topPkgsLoading, setTopPkgsLoading] = useState(true);
  const [topPkgsError, setTopPkgsError] = useState<string | null>(null);

  // ── Contacts (contacts) ────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);

  // ── Real-time clock ────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Loaders ────────────────────────────────────────────────────────────────

  /** 1. Stats cards — accounts + goi_cuoc + user_subscriptions + deposits */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const d = await transactionApi.fetchAdminStatsCards();
      setStats(d ?? { totalUsersCount: 0, totalPackagesCount: 0, totalRevenueVal: 0, totalSubscriptionsCount: 0 });
    } catch {
      setIsOffline(true);
      setStats({ totalUsersCount: 0, totalPackagesCount: 0, totalRevenueVal: 0, totalSubscriptionsCount: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  /** 2. Tải dữ liệu biểu đồ doanh thu trực tiếp từ MongoDB API */
  const loadRevenueChart = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const res = await transactionApi.fetchAdminRevenueChart();
      setChartData(Array.isArray(res) ? res : []);
    } catch {
      setIsOffline(true);
      setChartError('Không thể tải dữ liệu biểu đồ doanh thu từ CSDL');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  /** 3. Deposits bảng phân trang (5 bản/trang) từ MongoDB */
  const loadDeposits = useCallback(async (page: number, force = false) => {
    const cache = depCacheRef.current;
    if (!force && cache[page]) {
      setDeposits(cache[page].data);
      setDepTotalPages(cache[page].totalPages);
      setDepTotalItems(cache[page].totalItems);
      return;
    }
    if (page === 1) setDepositsLoading(true); else setDepPageLoading(true);
    setDepositsError(null);
    try {
      const res = await transactionApi.fetchAdminDeposits({ page, limit: 5 });
      const data: DepositItem[] = res.data ?? [];
      const tp = res.pagination?.totalPages ?? 1;
      const ti = res.pagination?.totalItems ?? 0;
      setDeposits(data);
      setDepTotalPages(tp);
      setDepTotalItems(ti);
      cache[page] = { data, totalPages: tp, totalItems: ti };
    } catch {
      setIsOffline(true);
      setDepositsError('Không thể nạp danh sách giao dịch từ CSDL');
      setDeposits([]);
      setDepTotalPages(1);
      setDepTotalItems(0);
    } finally {
      setDepositsLoading(false);
      setDepPageLoading(false);
    }
  }, []);

  /** 4. Top packages (compare analytics) từ MongoDB */
  const loadTopPkgs = useCallback(async () => {
    setTopPkgsLoading(true);
    setTopPkgsError(null);
    try {
      const d = await compareApi.fetchAnalytics();
      const pkgs = d?.mostComparedPackages;
      setTopPkgs(Array.isArray(pkgs) ? pkgs : []);
    } catch {
      setIsOffline(true);
      setTopPkgsError('Không thể nạp thống kê so sánh từ CSDL');
      setTopPkgs([]);
    } finally {
      setTopPkgsLoading(false);
    }
  }, []);

  /** 5. Contacts CSKH từ MongoDB */
  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const d = await contactApi.getAdminContacts();
      setContacts(Array.isArray(d) ? d : []);
    } catch {
      setIsOffline(true);
      setContactsError('Không thể nạp danh sách CSKH từ CSDL');
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadStats();
    loadRevenueChart();
    loadDeposits(1);
    loadTopPkgs();
    loadContacts();
  }, []);

  useEffect(() => { loadDeposits(depPage); }, [depPage]);

  const handleRefreshAll = () => {
    depCacheRef.current = {};
    setDepPage(1);
    setIsOffline(false);
    loadStats();
    loadRevenueChart();
    loadDeposits(1, true);
    loadTopPkgs();
    loadContacts();
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const contactsPending = useMemo(() =>
    contacts.filter(c => ['NEW', 'READ', 'PROCESSING'].includes((c.status ?? 'NEW').toUpperCase())),
    [contacts]
  );

  const contactPie = useMemo(() => {
    if (!contacts.length) return [];
    const m: Record<string, number> = {};
    contacts.forEach(c => {
      const s = (c.status ?? 'NEW').toUpperCase();
      m[s] = (m[s] ?? 0) + 1;
    });
    const lbl: Record<string, string> = { NEW: 'Mới', READ: 'Đã đọc', PROCESSING: 'Đang xử lý', DONE: 'Đã xử lý', CLOSED: 'Đã đóng' };
    return Object.entries(m).map(([key, value]) => ({ name: lbl[key] ?? key, value, key }));
  }, [contacts]);

  const barData = useMemo(() => topPkgs.slice(0, 7).map(p => ({ name: p.packageId, value: p.count })), [topPkgs]);
  const topMax = useMemo(() => topPkgs.length > 0 ? Math.max(...topPkgs.map(p => p.count)) : 1, [topPkgs]);

  // clock
  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">

      {/* Offline Banner */}
      {isOffline && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-[11px] font-semibold text-red-800">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Mất kết nối API MongoDB Backend. Đang chờ kết nối lại...</span>
          </div>
          <button onClick={handleRefreshAll} className="flex items-center gap-1 bg-white border border-red-300 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors font-bold ml-4 shrink-0 text-red-700">
            <RefreshCw className="w-3 h-3" />Thử lại kết nối
          </button>
        </div>
      )}

      {/* ── VÙNG 1: Header ──────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-full bg-gradient-to-r from-red-600/20 to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 px-2.5 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-red-300">Live Admin Console</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-400 shrink-0" />
              Tổng Quan Hệ Thống Viettel Telecom &amp; AI
            </h1>
            <p className="text-slate-400 text-[11px] font-medium mt-1">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAll}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-400" />
              Tải lại dữ liệu
            </button>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-center shrink-0">
              <p className="text-white font-mono font-black text-lg tracking-wider">{clockStr}</p>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">VN Local Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── VÙNG 2: 4 Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Doanh thu ví ảo" value={statsLoading ? '—' : fmtMoney(stats?.totalRevenueVal ?? 0)}
          sub="deposits · status=success" icon={CreditCard} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          loading={statsLoading} onClick={() => navigate('/admin/deposits')}
          badge={<span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold"><Zap className="w-3 h-3" />Tổng nạp ví thành công</span>}
        />
        <StatCard
          label="Tổng thuê bao" value={statsLoading ? '—' : fmtNum(stats?.totalUsersCount ?? 0)}
          sub="accounts collection" icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600"
          loading={statsLoading} onClick={() => navigate('/admin/users')}
          badge={<span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold"><Users className="w-3 h-3" />Tài khoản đã đăng ký</span>}
        />
        <StatCard
          label="Gói cước active" value={statsLoading ? '—' : fmtNum(stats?.totalSubscriptionsCount ?? 0)}
          sub="user_subscriptions" icon={Wifi} iconBg="bg-red-50" iconColor="text-red-600"
          loading={statsLoading} onClick={() => navigate('/admin/packages')}
          badge={<span className="flex items-center gap-1 text-[10px] text-red-600 font-bold"><Activity className="w-3 h-3" />Lượt đăng ký dịch vụ</span>}
        />
        <StatCard
          label="CSKH chờ phản hồi" value={contactsLoading ? '—' : fmtNum(contactsPending.length)}
          sub="contacts · NEW/PROCESSING"
          icon={MessageSquare}
          iconBg={contactsPending.length > 0 ? 'bg-amber-50' : 'bg-slate-50'}
          iconColor={contactsPending.length > 0 ? 'text-amber-600' : 'text-slate-400'}
          loading={contactsLoading} onClick={() => navigate('/admin/contacts')}
          badge={
            contactsPending.length > 0
              ? <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                {contactsPending.length} yêu cầu đang chờ
              </span>
              : <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <Shield className="w-3 h-3" />Đã xử lý toàn bộ
              </span>
          }
        />
      </div>

      {/* ── VÙNG 3: Biểu đồ (8/4) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left 8/12 */}
        <div className="lg:col-span-8 space-y-4">

          {/* Revenue Area Chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Xu hướng doanh thu nạp ví</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Doanh số theo ngày trong tuần · CSDL <span className="font-mono text-slate-600">deposits</span>
                </p>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-2 py-1 rounded-lg bg-slate-50 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-500" />TUẦN NÀY
              </span>
            </div>
            {chartLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[10px] font-semibold">Đang tải dữ liệu từ CSDL MongoDB...</span>
                </div>
              </div>
            ) : chartError ? (
              <ErrBanner msg={chartError} onRetry={loadRevenueChart} />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Inbox className="w-8 h-8 text-slate-200" />
                <span className="text-[10px] font-semibold">Chưa có dữ liệu doanh thu</span>
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 600, fill: '#CBD5E1' }} axisLine={false} tickLine={false} width={52}
                      tickFormatter={v => fmtMoney(Number(v)).replace(' đ', '')} />
                    <Tooltip content={<AreaTip />} />
                    <Area type="monotone" dataKey="val" stroke={BRAND} strokeWidth={2.5} fill="url(#revGrad)"
                      dot={{ r: 3, fill: BRAND, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, fill: BRAND, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Contact Pie */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Phân bổ trạng thái CSKH</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Phân tích từ collection <span className="font-mono text-slate-600">contacts</span>
                </p>
              </div>
              <button onClick={() => navigate('/admin/contacts')} className="flex items-center gap-1 text-[9px] font-bold text-red-600 hover:text-red-700 transition-colors">
                <span>Chi tiết</span><ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {contactsLoading ? (
              <div className="h-36 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : contactsError ? (
              <ErrBanner msg={contactsError} onRetry={loadContacts} />
            ) : contactPie.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Inbox className="w-8 h-8 text-slate-200" /><span className="text-[10px] font-semibold">Chưa có dữ liệu liên hệ nào</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contactPie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" nameKey="name">
                        {contactPie.map(entry => <Cell key={entry.key} fill={PIE_COLORS[entry.key] ?? '#94A3B8'} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${Number(v)} yêu cầu`, String(n)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {contactPie.map(e => (
                    <div key={e.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[e.key] ?? '#94A3B8' }} />
                        <span className="text-[10px] font-semibold text-slate-600">{e.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-800">{e.value}</span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Tổng cộng</span>
                    <span className="text-[11px] font-black text-slate-900">{contacts.length} yêu cầu</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4/12: Top Packages */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Top Gói Hot</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Lượt so sánh · <span className="font-mono text-slate-600">goi_cuoc</span></p>
            </div>
            <button onClick={() => navigate('/admin/packages')} className="flex items-center gap-1 text-[9px] font-bold text-red-600 hover:text-red-700 transition-colors">
              <span>Xem</span><ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {topPkgsLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : topPkgsError ? (
            <ErrBanner msg={topPkgsError} onRetry={loadTopPkgs} />
          ) : barData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Inbox className="w-8 h-8 text-slate-200" />
              <span className="text-[10px] font-semibold">Chưa có dữ liệu so sánh gói cước</span>
            </div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fontWeight: 600, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BarTip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? BRAND : i === 1 ? '#FF6B8A' : i === 2 ? '#FF9EB5' : '#FFD1DC'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 space-y-2">
                {topPkgs.slice(0, 5).map((pkg, i) => {
                  const w = Math.max(6, Math.round((pkg.count / topMax) * 100));
                  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
                  return (
                    <div key={pkg.packageId} className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center shrink-0">{medals[i]}</span>
                      <span className="text-[9px] font-extrabold text-slate-700 font-mono bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">{pkg.packageId}</span>
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: i === 0 ? BRAND : '#FF9EB5' }} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 shrink-0">{pkg.count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── VÙNG 4: Bảng vận hành (6/6) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Deposits bảng phân trang */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Giao dịch nạp tiền gần đây</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Collection <span className="font-mono text-slate-600">deposits</span> · {depTotalItems} bản ghi
              </p>
            </div>
            <button onClick={() => navigate('/admin/deposits')} className="flex items-center gap-1 text-[9px] font-bold text-red-600 hover:text-red-700 transition-colors">
              <span>Xem tất cả</span><ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {depositsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Sk className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5"><Sk className="h-2.5 w-28" /><Sk className="h-2 w-40" /></div>
                  <Sk className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : depositsError ? (
            <ErrBanner msg={depositsError} onRetry={() => loadDeposits(depPage, true)} />
          ) : deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Inbox className="w-8 h-8 text-slate-200" />
              <span className="text-xs font-semibold">Chưa có giao dịch nạp tiền nào</span>
            </div>
          ) : (
            <>
              <div className={`space-y-1 relative transition-opacity duration-200 ${depPageLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                {depPageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                  </div>
                )}
                {deposits.map(dep => (
                  <div key={dep.deposit_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dep.status === 'success' ? 'bg-emerald-50' : dep.status === 'pending' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      <Zap className={`w-3.5 h-3.5 ${dep.status === 'success' ? 'text-emerald-600' : dep.status === 'pending' ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-bold text-slate-800 font-mono">{dep.phoneNumber}</p>
                        <span className="text-[9px] text-slate-400 font-mono">#{dep.deposit_id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-extrabold text-emerald-700">+{dep.amountVND?.toLocaleString('vi-VN')}đ</span>
                        <span className="text-[9px] text-slate-400 font-medium">{fmtDateShort(dep.created_at)}</span>
                      </div>
                    </div>
                    <DepositBadge status={dep.status} />
                  </div>
                ))}
              </div>

              {depTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-50">
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Trang <span className="text-slate-700 font-bold">{depPage}</span>/<span className="text-slate-700 font-bold">{depTotalPages}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDepPage(p => Math.max(1, p - 1))} disabled={depPage === 1 || depPageLoading}
                      className="w-6 h-6 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <ChevronLeft className="w-3 h-3 text-slate-600" />
                    </button>
                    {Array.from({ length: Math.min(depTotalPages, 5) }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setDepPage(p)} disabled={depPageLoading}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${depPage === p ? 'bg-red-600 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setDepPage(p => Math.min(depTotalPages, p + 1))} disabled={depPage === depTotalPages || depPageLoading}
                      className="w-6 h-6 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Contacts CSKH */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">CSKH — Liên hệ chưa phản hồi</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Collection <span className="font-mono text-slate-600">contacts</span> · {contactsPending.length} chờ xử lý
              </p>
            </div>
            <button onClick={() => navigate('/admin/contacts')} className="flex items-center gap-1 text-[9px] font-bold text-red-600 hover:text-red-700 transition-colors">
              <span>Xử lý</span><ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {contactsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Sk className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5"><Sk className="h-2.5 w-32" /><Sk className="h-2 w-48" /></div>
                  <Sk className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : contactsError ? (
            <ErrBanner msg={contactsError} onRetry={loadContacts} />
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Shield className="w-8 h-8 text-slate-200" />
              <span className="text-xs font-semibold">Tất cả liên hệ đã được xử lý</span>
            </div>
          ) : (
            <>
              <div className="space-y-1 overflow-y-auto max-h-[300px] no-scrollbar">
                {contacts.slice(0, 10).map(c => {
                  const isPending = ['NEW', 'READ', 'PROCESSING'].includes((c.status ?? 'NEW').toUpperCase());
                  return (
                    <div key={c.contact_id} className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors ${isPending ? 'border-l-2 border-red-300' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPending ? 'bg-red-50' : 'bg-emerald-50'}`}>
                        <Phone className={`w-3.5 h-3.5 ${isPending ? 'text-red-600' : 'text-emerald-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{c.full_name}</p>
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">{fmtDateShort(c.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{c.message}</p>
                      </div>
                      <div className="shrink-0 mt-0.5"><ContactBadge status={c.status} /></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-3 gap-2">
                {[
                  { label: 'Mới', count: contacts.filter(c => (c.status ?? 'NEW').toUpperCase() === 'NEW').length, color: 'text-red-600' },
                  { label: 'Đang xử lý', count: contacts.filter(c => (c.status ?? '').toUpperCase() === 'PROCESSING').length, color: 'text-blue-600' },
                  { label: 'Đã xong', count: contacts.filter(c => ['DONE', 'CLOSED'].includes((c.status ?? '').toUpperCase())).length, color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-base font-black ${s.color}`}>{s.count}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
