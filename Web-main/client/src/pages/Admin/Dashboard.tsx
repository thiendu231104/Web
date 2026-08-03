import { useState, useEffect } from 'react';
import { Activity, CreditCard, Users, Wifi, Loader2, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp, ChevronDown, RefreshCw } from 'lucide-react';
import { transactionApi, compareApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  // Decoupled states
  const [stats, setStats] = useState<{
    totalUsersCount: number;
    totalPackagesCount: number;
    totalRevenueVal: number;
    totalSubscriptionsCount: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [chartData, setChartData] = useState<{ label: string; val: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotalItems, setTxTotalItems] = useState(0);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [txCache, setTxCache] = useState<Record<number, { transactions: any[], totalPages: number, totalItems: number }>>({});

  const [compareStats, setCompareStats] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(true);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'thisMonth'>('7days');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Tooltip state for chart
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  // Decoupled load functions
  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await transactionApi.fetchAdminStatsCards();
      setStats(data || {
        totalUsersCount: 0,
        totalPackagesCount: 0,
        totalRevenueVal: 0,
        totalSubscriptionsCount: 0
      });
    } catch (err: any) {
      console.error("Lỗi khi tải chỉ số chính:", err);
      setStatsError(err.message || "Lỗi tải dữ liệu");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadChart = async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const data = await transactionApi.fetchAdminRevenueChart();
      setChartData(data || []);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu biểu đồ:", err);
      setChartError(err.message || "Lỗi tải biểu đồ");
    } finally {
      setChartLoading(false);
    }
  };

  const loadRecent = async (page: number = 1) => {
    // 1. Check local cache
    if (txCache[page]) {
      setRecentActivities(txCache[page].transactions);
      setTxTotalPages(txCache[page].totalPages);
      setTxTotalItems(txCache[page].totalItems);
      setRecentLoading(false);
      setIsTransactionsLoading(false);
      return;
    }

    if (page === 1) {
      setRecentLoading(true);
    } else {
      setIsTransactionsLoading(true);
    }
    setRecentError(null);
    try {
      // Pass txTotalItems as the third parameter to avoid count calculation on backend if page > 1
      const data = await transactionApi.fetchAdminRecentTransactions(page, 5, page > 1 ? txTotalItems : undefined);
      const newTransactions = data.transactions || [];
      const newTotalPages = data.pagination?.totalPages || 1;
      const newTotalItems = data.pagination?.totalItems || 0;

      setRecentActivities(newTransactions);
      setTxTotalPages(newTotalPages);
      setTxTotalItems(newTotalItems);

      // Cache the result
      setTxCache(prev => ({
        ...prev,
        [page]: {
          transactions: newTransactions,
          totalPages: newTotalPages,
          totalItems: newTotalItems
        }
      }));
    } catch (err: any) {
      console.error("Lỗi khi tải giao dịch gần đây:", err);
      setRecentError(err.message || "Lỗi tải giao dịch");
    } finally {
      setRecentLoading(false);
      setIsTransactionsLoading(false);
    }
  };

  const loadCompare = async () => {
    setCompareLoading(true);
    setCompareError(null);
    try {
      const data = await compareApi.fetchAnalytics();
      setCompareStats(data || null);
    } catch (err: any) {
      console.error("Lỗi khi tải so sánh gói:", err);
      setCompareError(err.message || "Lỗi tải widget");
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadChart();
    loadCompare();
  }, []);

  useEffect(() => {
    loadRecent(txPage);
  }, [txPage]);

  // Format short money values (e.g. 1.12M VNĐ or 120k VNĐ)
  const formatShortValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(2)}M VNĐ`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}k VNĐ`;
    }
    return `${val} VNĐ`;
  };

  // Mock SaaS growth data for metrics
  const getStatsList = () => {
    if (!stats) return [];
    return [
      { 
        label: 'Doanh thu', 
        val: formatShortValue(stats.totalRevenueVal), 
        icon: CreditCard, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50',
        growth: '+12.5% so với tháng trước',
        isPositive: true
      },
      { 
        label: 'Người dùng', 
        val: stats.totalUsersCount.toLocaleString('vi-VN'), 
        icon: Users, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50',
        growth: '+4.8% so với tuần trước',
        isPositive: true
      },
      { 
        label: 'Gói cước', 
        val: stats.totalPackagesCount.toLocaleString('vi-VN'), 
        icon: Wifi, 
        color: 'text-primary', 
        bg: 'bg-primary/5',
        growth: '+2 gói mới tuần này',
        isPositive: true
      },
      { 
        label: 'Lượt đăng ký', 
        val: stats.totalSubscriptionsCount.toLocaleString('vi-VN'), 
        icon: Activity, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50',
        growth: '+18.3% so với tháng trước',
        isPositive: true
      }
    ];
  };

  const statsList = getStatsList();

  // SVG Chart settings (height shortened by 25-30%)
  const svgWidth = 600;
  const svgHeight = 130;
  const padding = 20;

  // Render chart according to filters (mock multiplier for 30days / month to simulate view change)
  const getFilteredChartData = () => {
    if (timeFilter === '30days') {
      return chartData.map(pt => ({ ...pt, val: Math.round(pt.val * 4.2) }));
    }
    if (timeFilter === 'thisMonth') {
      return chartData.map(pt => ({ ...pt, val: Math.round(pt.val * 3.5) }));
    }
    return chartData;
  };

  const currentChartData = getFilteredChartData();
  const maxVal = Math.max(...currentChartData.map(p => p.val)) || 1;
  const minVal = Math.min(...currentChartData.map(p => p.val)) || 0;

  const pointsString = currentChartData.map((pt, idx) => {
    const x = padding + (idx * (svgWidth - padding * 2)) / (currentChartData.length - 1 || 1);
    const y = svgHeight - padding - ((pt.val - minVal) * (svgHeight - padding * 2)) / (maxVal - minVal || 1);
    return `${x},${y}`;
  }).join(' ');

  // Get package price helper
  const getPackagePrice = (pkgId: string) => {
    const cleanId = pkgId.toUpperCase();
    if (cleanId.includes('120')) return '120.000đ';
    if (cleanId.includes('135')) return '135.000đ';
    if (cleanId.includes('150')) return '150.000đ';
    if (cleanId.includes('200')) return '200.000đ';
    if (cleanId.includes('90')) return '90.000đ';
    if (cleanId.includes('70')) return '70.000đ';
    if (cleanId.includes('30')) return '30.000đ';
    if (cleanId.includes('50')) return '50.000đ';
    return '120.000đ';
  };

  const topPackages = compareStats?.mostComparedPackages || [];
  const topPackagesMaxCount = topPackages.length > 0 ? Math.max(...topPackages.map((p: any) => p.count)) : 1;

  const timeFilterLabels = {
    '7days': '7 ngày qua',
    '30days': '30 ngày qua',
    'thisMonth': 'Tháng này'
  };

  return (
    <div className="space-y-8 animate-fade-in text-xs font-semibold">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <TrendingUp className="w-6 h-6 text-primary mr-2" />
            Dashboard Thống kê báo cáo
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">Theo dõi thời gian thực dữ liệu đăng ký gói cước di động và số dư ví khách hàng.</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
                <div className="h-5 w-24 bg-slate-300 rounded" />
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : statsError ? (
        <div className="bg-rose-55/10 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Không thể tải chỉ số thống kê tổng hợp: {statsError}</span>
          </div>
          <button 
            onClick={loadStats}
            className="flex items-center space-x-1 text-rose-700 hover:text-rose-900 border border-rose-200 bg-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tải lại</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200 shadow-sm hover:shadow-md p-5 rounded-xl flex flex-col justify-between transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{stat.label}</p>
                    <h3 className="text-xl font-extrabold text-slate-900">{stat.val}</h3>
                  </div>
                  <div className={`p-2.5 rounded-lg shrink-0 ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                
                {/* Growth rate */}
                <div className="flex items-center mt-3 pt-2 border-t border-slate-50 text-[10px]">
                  {stat.isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 mr-0.5" />
                  )}
                  <span className={`font-bold ${stat.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stat.growth}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Revenue Chart) - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4 relative min-h-[220px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xu hướng doanh thu & Đăng ký</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Biểu đồ doanh số ví ảo hàng ngày</p>
              </div>

              {/* Time Filter Dropdown */}
              {!chartLoading && !chartError && (
                <div className="relative">
                  <button 
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center space-x-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg transition-colors text-[10px]"
                  >
                    <span>{timeFilterLabels[timeFilter]}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  {showFilterDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-[10px] font-bold">
                        {(['7days', '30days', 'thisMonth'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setTimeFilter(filter);
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors ${timeFilter === filter ? 'text-primary bg-red-50/30' : 'text-slate-600'}`}
                          >
                            {timeFilterLabels[filter]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Chart Area */}
            <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-hidden relative flex-1 flex items-center justify-center min-h-[140px]">
              {chartLoading ? (
                <div className="flex flex-col items-center space-y-2 text-[10px] text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span>Đang tải biểu đồ xu hướng...</span>
                </div>
              ) : chartError ? (
                <div className="flex flex-col items-center space-y-3 text-center p-4">
                  <span className="text-rose-600 text-xs font-bold flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
                    Không thể hiển thị biểu đồ
                  </span>
                  <p className="text-[10px] text-slate-405 max-w-[250px]">{chartError}</p>
                  <button 
                    onClick={loadChart}
                    className="flex items-center space-x-1 text-slate-600 hover:text-slate-800 border border-slate-350 bg-white px-2.5 py-1 rounded-md text-[9px] font-extrabold transition-all"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : currentChartData.length > 0 ? (
                <div className="relative w-full">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EE0033" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#EE0033" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const yVal = padding + ratio * (svgHeight - padding * 2);
                      return (
                        <line
                          key={idx}
                          x1={padding}
                          y1={yVal}
                          x2={svgWidth - padding}
                          y2={yVal}
                          stroke="#e2e8f0"
                          strokeWidth="0.8"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    <path
                      d={`M ${padding},${svgHeight - padding} L ${pointsString} L ${svgWidth - padding},${svgHeight - padding} Z`}
                      fill="url(#chartGradient)"
                    />

                    <polyline
                      fill="none"
                      stroke="#EE0033"
                      strokeWidth="2.5"
                      points={pointsString}
                    />

                    {currentChartData.map((pt, idx) => {
                      const x = padding + (idx * (svgWidth - padding * 2)) / (currentChartData.length - 1 || 1);
                      const y = svgHeight - padding - ((pt.val - minVal) * (svgHeight - padding * 2)) / (maxVal - minVal || 1);
                      return (
                        <g key={idx}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#EE0033"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-pointer hover:r-5 transition-all"
                            onMouseEnter={() => setHoveredPoint({ label: pt.label, val: pt.val, x, y })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          <text
                            x={x}
                            y={svgHeight - 4}
                            fill="#64748b"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip Overlay */}
                  {hoveredPoint && (
                    <div 
                      className="absolute bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-md pointer-events-none z-20 border border-slate-800 transition-all duration-150 -translate-x-1/2 -translate-y-full"
                      style={{ 
                        left: `${(hoveredPoint.x / svgWidth) * 100}%`, 
                        top: `${(hoveredPoint.y / svgHeight) * 100 - 10}%` 
                      }}
                    >
                      <div className="font-bold text-center border-b border-slate-800 pb-0.5 mb-1">{hoveredPoint.label} (Doanh thu)</div>
                      <div className="text-emerald-400 font-extrabold">{hoveredPoint.val.toLocaleString('vi-VN')} đ</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">Không có dữ liệu xu hướng doanh thu.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column (Top Packages Widget) - 1/3 width */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4 min-h-[220px] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Gói Cước Hot</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Danh sách các gói cước được so sánh & quan tâm nhiều nhất</p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {compareLoading ? (
                <div className="flex flex-col items-center space-y-2 text-[10px] text-slate-400 py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  <span>Đang tải widget gói cước...</span>
                </div>
              ) : compareError ? (
                <div className="flex flex-col items-center space-y-2 text-center p-4">
                  <span className="text-rose-600 text-[10px] font-bold flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                    Lỗi tải widget
                  </span>
                  <button 
                    onClick={loadCompare}
                    className="flex items-center space-x-1 text-slate-600 hover:text-slate-850 border border-slate-300 bg-white px-2.5 py-1 rounded-md text-[9px] font-extrabold transition-all"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : topPackages.length > 0 ? (
                <div className="space-y-4 w-full">
                  {topPackages.slice(0, 5).map((item: any, idx: number) => {
                    const widthPercent = Math.max(10, Math.min(100, (item.count / topPackagesMaxCount) * 100));
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono">
                              {item.packageId}
                            </span>
                            <span className="text-slate-550 text-[10px]">{getPackagePrice(item.packageId)}</span>
                          </div>
                          <span className="text-slate-600 font-bold">{item.count} lượt</span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-500" 
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-1 w-full">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Không có dữ liệu</span>
                  <p className="text-slate-500 text-[10px] max-w-[180px]">Chưa ghi nhận lượt so sánh gói cước nào từ hệ thống.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Recent Activities Section */}
      <section className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4 min-h-[200px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Giao dịch đăng ký & Nạp ví gần đây</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Hoạt động mới nhất được thực hiện bởi người dùng trên hệ thống</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {!recentLoading && !recentError && (
              <button 
                onClick={() => navigate('/admin/users')}
                className="flex items-center space-x-1 text-primary hover:text-red-700 transition-colors font-extrabold text-[10px]"
              >
                <span>Xem tất cả giao dịch</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          {recentLoading ? (
            <div className="flex flex-col items-center space-y-2 text-[10px] text-slate-400 py-10">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span>Đang tải danh sách giao dịch...</span>
            </div>
          ) : recentError ? (
            <div className="flex flex-col items-center space-y-3 text-center p-4">
              <span className="text-rose-600 text-xs font-bold flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
                Lỗi tải giao dịch
              </span>
              <p className="text-[10px] text-slate-405 max-w-[300px]">{recentError}</p>
              <button 
                onClick={() => loadRecent(txPage)}
                className="flex items-center space-x-1 text-slate-600 hover:text-slate-800 border border-slate-350 bg-white px-2.5 py-1 rounded-md text-[9px] font-extrabold transition-all"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Tải lại</span>
              </button>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="w-full space-y-4">
              <div className={`rounded-xl border border-slate-200 relative overflow-hidden transition-opacity duration-200 ${isTransactionsLoading ? 'opacity-55 pointer-events-none' : 'opacity-100'}`}>
                {isTransactionsLoading && (
                  <div className="absolute inset-0 bg-slate-50/40 flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3">Giao dịch</th>
                      <th className="p-3">Người dùng / SĐT</th>
                      <th className="p-3">Số tiền</th>
                      <th className="p-3">Mô tả</th>
                      <th className="p-3">Ngày thực hiện</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                    {recentActivities.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-800">
                          {tx.type === 'deposit' ? (
                            <span className="text-emerald-600">Nạp ví ảo</span>
                          ) : (
                            <span className="text-primary">Đăng ký gói</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-medium">
                          {tx.phoneNumber && tx.phoneNumber !== '09xxxxxxxx' ? tx.phoneNumber : ((tx as any).fullname || 'Người dùng ẩn danh')}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {tx.type === 'deposit' ? '+' : '-'}
                          {(tx.amount || 0).toLocaleString('vi-VN')} VNĐ
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {tx.type === 'deposit' ? `Qua cổng ${tx.paymentMethod || 'VietQR'}` : `Đăng ký gói ${tx.packageName || 'Gói cước'}`}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {tx.createdAt && !isNaN(new Date(tx.createdAt).getTime()) ? (
                            <>
                              {new Date(tx.createdAt).toLocaleDateString('vi-VN')} {new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </>
                          ) : '---'}
                        </td>
                        <td className="p-3">
                          {tx.status?.toUpperCase() === 'SUCCESS' ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                              Thành công
                            </span>
                          ) : tx.status?.toUpperCase() === 'PENDING' ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                              Đang xử lý
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                              {tx.status?.toUpperCase() === 'CANCELLED' ? 'Đã hủy' : (tx.status || 'Đã hủy')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Control Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold space-y-3 sm:space-y-0">
                <div>
                  HIỂN THỊ TRANG <span className="text-slate-800">{txPage}</span> / <span className="text-slate-800">{txTotalPages}</span> (TỔNG <span className="text-slate-800">{txTotalItems}</span> GIAO DỊCH)
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setTxPage(prev => Math.max(1, prev - 1))}
                    disabled={txPage === 1 || isTransactionsLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trang trước
                  </button>

                  {Array.from({ length: txTotalPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - txPage) <= 1 || p === 1 || p === txTotalPages)
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showEllipsis && <span className="px-1.5 text-slate-400 font-bold">...</span>}
                          <button
                            onClick={() => setTxPage(p)}
                            disabled={isTransactionsLoading}
                            className={`w-7 h-7 rounded-lg font-extrabold transition-all ${txPage === p ? 'bg-primary text-white shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700'}`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    onClick={() => setTxPage(prev => Math.min(txTotalPages, prev + 1))}
                    disabled={txPage === txTotalPages || isTransactionsLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2 w-full">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Không có dữ liệu</span>
              <p className="text-slate-500 text-xs">Chưa có giao dịch hoặc hoạt động đăng ký gói nào được thực hiện.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
