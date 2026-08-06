import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, MessageSquare, ArrowRight, ChevronDown,
  Wifi, Zap, RefreshCw, CheckCircle2, Bot, ClipboardList,
  Signal, Users, ShieldCheck, HeadphonesIcon, Search,
  ChevronLeft, ChevronRight, Clock
} from 'lucide-react';
import { usePackageStore, useAuthStore } from '../store';
import { packageApi } from '../services/api';
import PackageCard from '../components/PackageCard';
import RegisterModal from '../components/RegisterModal';
import SEO from '../components/SEO';
import type { Package } from '../types';

// ─── CẤU HÌNH DANH SÁCH VIDEO YOUTUBE Ở ĐÂY ──────────────────────────────────
// Bạn có thể thay đổi ID hoặc Link video YouTube trong mảng bên dưới.
// Hệ thống hỗ trợ cả Link đầy đủ (ví dụ: https://www.youtube.com/watch?v=...) hoặc chỉ ID (ví dụ: q6cZrx60l8Y)
const YOUTUBE_VIDEOS = [
  {
    idOrUrl: '5dmLpdy3Lr8', // Video 1
    title: 'Viettel 5G | DÂN CHƠI 5G - TỚI BẾN TỚI BỜ! | OFFICIAL TVC',
    description: 'Video giới thiệu và kiểm tra tốc độ thực tế mạng di động 5G thế hệ mới của Viettel.'
  },
  {
    idOrUrl: 'vih-fHhDVI', // Video 2 (Hỗ trợ cả link đầy đủ)
    title: 'Hướng dẫn xác thực thông tin trên VNeID',
    description: 'Hãy cùng theo dõi video dưới đây để nắm rõ các bước xác thực thông tin thuê bao trên VNeID nhé!'
  },
  {
    idOrUrl: 'FqGiAfrcy5Q', // Video 3
    title: 'VIETTEL TAMMI | Tập 1: SUÝT NỮA THÌ LỚN CHUYỆN... AI DÈ CHỈ LÀ...',
    description: 'Giới thiệu về VIETTEL TAMMI'
  }
];

// Helper để tự động trích xuất ID video từ link hoặc giữ nguyên nếu là ID
function getYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : urlOrId;
}

// ─── Skeleton card for loading state ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
      <div className="h-3 w-14 bg-slate-200 rounded-full mb-3 ml-auto" />
      <div className="h-4 w-3/4 bg-slate-200 rounded-lg mb-2" />
      <div className="h-6 w-1/2 bg-slate-200 rounded-lg mb-4" />
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 rounded" />
        <div className="h-3 w-4/6 bg-slate-100 rounded" />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
        <div className="flex-1 h-8 bg-slate-200 rounded-xl" />
        <div className="w-8 h-8 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

// ─── FAQ Accordion item ───────────────────────────────────────────────────────
function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-white'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-5 text-left cursor-pointer"
      >
        <span className={`text-sm font-bold leading-snug ${open ? 'text-primary' : 'text-slate-800'}`}>{q}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : 'text-slate-400'}`}
        />
      </button>
      <div
        ref={bodyRef}
        style={{ maxHeight: open ? (bodyRef.current?.scrollHeight ?? 400) + 'px' : '0px' }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
      >
        <p className="px-5 pb-5 text-xs text-slate-600 font-medium leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ─── Tab definition ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'hot', label: '🔥 Tất Cả Gói HOT' },
  { id: 'data', label: '📶 SUPER DATA' },
  { id: 'combo', label: '📦 COMBO Toàn Diện' },
  { id: 'social', label: '🎵 Giải Trí / MXH' },
  { id: 'short', label: '📅 Gói Ngắn Hạn' },
];

// ─── FAQ data ────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Làm sao để biết sim của tôi đăng ký được gói cước nào?',
    a: 'Bạn có thể sử dụng công cụ Khảo sát thông minh (30 giây) để hệ thống AI phân tích nhu cầu và đề xuất gói phù hợp, hoặc hỏi trực tiếp trợ lý AI Chatbot. Ngoài ra, trang Chi tiết gói cước hiển thị rõ điều kiện đăng ký và đối tượng áp dụng.'
  },
  {
    q: 'Nạp tiền qua ví MetaMask/Web3 có mất phí không?',
    a: 'Hệ thống sử dụng mạng thử nghiệm Sepolia Testnet, vì vậy bạn chỉ cần ETH Sepolia (không có giá trị thực). Phí gas giao dịch trên Testnet là miễn phí hoặc rất nhỏ. Tỷ giá quy đổi VND/ETH được cố định theo cấu hình hệ thống.'
  },
  {
    q: 'Hủy gói cước di động hoặc tắt tự động gia hạn thực hiện thế nào?',
    a: 'Đăng nhập vào tài khoản, vào mục Hồ sơ → Lịch sử đăng ký gói cước. Tại khu vực "Gói cước đang sử dụng", bạn có thể bấm nút "Hủy gói" để hủy ngay lập tức, hoặc bấm nút chuyển đổi "Tự động gia hạn" để bật/tắt tính năng gia hạn khi hết chu kỳ.'
  },
];

// ─── Filter packages by tab ──────────────────────────────────────────────────
function filterByTab(pkgs: Package[], tab: string): Package[] {
  switch (tab) {
    case 'hot':
      return pkgs.filter(p => p.dohot === 'Hot');
    case 'data':
      return pkgs.filter(p =>
        p.phan_loai_goi === 'Data' || p.system_type === 'DATA_BASE'
      );
    case 'combo':
      return pkgs.filter(p =>
        p.phan_loai_goi === 'Combo' || p.system_type === 'COMBO'
      );
    case 'social':
      return pkgs.filter(p =>
        p.phan_loai_goi === 'Social' ||
        Boolean(p.has_tiktok) || Boolean(p.has_youtube) || Boolean(p.has_facebook)
      );
    case 'short':
      return pkgs.filter(p => {
        const days = typeof p.chu_ky_ngay === 'number' ? p.chu_ky_ngay : parseInt(String(p.chu_ky_ngay || '30'), 10);
        return days <= 7;
      });
    default:
      return pkgs;
  }
}

// ─── Stat badge data ─────────────────────────────────────────────────────────
const STATS = [
  { icon: <Wifi className="w-5 h-5 text-primary" />, value: '100+', label: 'Gói Cước', sub: 'Data · Combo · MXH' },
  { icon: <Bot className="w-5 h-5 text-violet-500" />, value: 'AI 24/7', label: 'Tư Vấn Thông Minh', sub: 'Khớp nhu cầu 99%' },
  { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, value: '1-Click', label: 'Đăng Ký Nhanh', sub: 'An toàn & tức thì' },
  { icon: <Signal className="w-5 h-5 text-blue-500" />, value: '4G/5G', label: 'Tốc Độ Cao', sub: 'Phủ sóng toàn quốc' },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { packages, loading: pkgLoading, error: pkgError, fetchPackages } = usePackageStore();
  const { currentUser } = useAuthStore();

  // ── Local state ──────────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('hot');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [recentlyViewedPkgs, setRecentlyViewedPkgs] = useState<Package[]>([]);

  // ── Section refs for smooth scroll ───────────────────────────────────────
  const packagesSectionRef = useRef<HTMLElement>(null);

  // ── Auto-reset search filters and fetch packages on mount ────────────────
  useEffect(() => {
    const store = usePackageStore.getState();
    store.reset();
    fetchPackages({ limit: 999, page: 1, search: '' });

    packageApi.fetchRecentlyViewedPackages()
      .then(res => {
        setRecentlyViewedPkgs(res || []);
      })
      .catch(err => {
        console.error("Error fetching recently viewed packages:", err);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────
  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const handleSubscribeOpen = useCallback((pkg: Package) => {
    if (!currentUser) {
      showToast('error', 'Vui lòng đăng nhập để đăng ký gói cước.');
      return;
    }
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  }, [currentUser, showToast]);

  const handleModalClose = useCallback(() => {
    setSelectedPkg(null);
    setIsModalOpen(false);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const tabPackages = filterByTab(packages, activeTab).slice(0, 8);

  // ── SEO schemas ───────────────────────────────────────────────────────────
  const homeSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Viettel AI - Cổng Đăng Ký Gói Cước Di Động',
      url: window.location.origin,
      logo: `${window.location.origin}/favicon.svg`,
      contactPoint: { '@type': 'ContactPoint', telephone: '1800 8098', contactType: 'CSKH', areaServed: 'VN', availableLanguage: 'Vietnamese' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Tổng Công ty Viễn thông Viettel',
      telephone: '1800 8098',
      priceRange: '50000-300000 VND'
    }
  ];

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="pb-16 relative animate-fade-in">
      <SEO
        title="Viettel AI - Tra Cứu và Đăng Ký Gói Cước Di Động Thông Minh"
        description="Cổng thông tin tra cứu, so sánh và đăng ký gói cước data 4G/5G, combo thoại giá rẻ tích hợp Trợ lý ảo AI tư vấn 24/7."
        schema={homeSchemas}
      />

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-20 right-5 z-[200] px-4 py-3 rounded-xl shadow-lg border text-xs font-bold animate-scale-up bg-white ${toastMsg.type === 'success' ? 'border-l-4 border-l-emerald-500 text-slate-800' : 'border-l-4 border-l-primary text-slate-800'}`}>
          {toastMsg.text}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: HERO SPLIT BANNER                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white shadow-xl mb-0">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[440px] p-8 md:p-12 lg:p-14">
          {/* Left Column — Title & Navigation CTAs (7 cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Brand pill */}
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              Viettel AI · Cổng Đăng Ký Gói Cước Thông Minh
            </span>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                Lựa chọn gói cước 4G/5G <br className="hidden sm:inline" />
                <span className="text-amber-300">Tối ưu chi phí cùng AI</span>
              </h1>
              <p className="text-red-100/90 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                Hệ thống Trợ lý ảo AI Viettel tự động phân tích tần suất sử dụng, nhu cầu Data, phút gọi và tiện ích mạng xã hội để đề xuất gói cước di động tiết kiệm chi phí tối đa cho bạn.
              </p>
            </div>

            {/* Navigation CTA Buttons */}
            <div className="flex flex-wrap gap-3.5 pt-2">
              {/* Nút 1: Tư vấn cùng AI */}
              <Link
                id="btn-hero-ai-chat"
                to="/chatbot"
                className="inline-flex items-center gap-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-6 py-3.5 rounded-2xl text-xs transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-slate-950" />
                <span>Tư vấn cùng AI</span>
              </Link>

              {/* Nút 2: Khảo sát chọn gói */}
              <Link
                id="btn-hero-survey"
                to="/survey"
                className="inline-flex items-center gap-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition-all hover:-translate-y-0.5"
              >
                <ClipboardList className="w-4 h-4 text-white" />
                <span>Khảo sát chọn gói</span>
              </Link>

              {/* Nút 3: Khám phá gói cước */}
              <Link
                id="btn-hero-packages"
                to="/packages"
                className="inline-flex items-center gap-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 py-3.5 rounded-2xl text-xs transition-all hover:-translate-y-0.5 shadow-md"
              >
                <Search className="w-4 h-4 text-slate-700" />
                <span>Khám phá gói cước</span>
              </Link>
            </div>
          </div>

          {/* Right Column — YouTube Interactive Video Player (5 cols) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-md group">
              {/* Outer glowing ambient background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/40 via-red-500/40 to-rose-600/40 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-500 opacity-80" />

              {/* Main Container */}
              <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col gap-4">

                {/* 16:9 Video Player Frame */}
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border border-white/5 group/player">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${getYouTubeId(YOUTUBE_VIDEOS[activeVideoIndex].idOrUrl)}?autoplay=0&rel=0`}
                    title={YOUTUBE_VIDEOS[activeVideoIndex].title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  {/* Decorative corner highlights */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500 pointer-events-none rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500 pointer-events-none rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500 pointer-events-none rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500 pointer-events-none rounded-br-lg" />
                </div>

                {/* Active Video Info */}
                <div className="space-y-1 px-1">
                  <h3 className="text-sm font-black text-white line-clamp-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block shrink-0" />
                    {YOUTUBE_VIDEOS[activeVideoIndex].title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    {YOUTUBE_VIDEOS[activeVideoIndex].description}
                  </p>
                </div>

                {/* Video Navigation Controls */}
                <div className="flex flex-col gap-3 mt-1 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-black px-1">
                    <span>Trình điều khiển video</span>
                    <span className="text-red-500 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full text-[9px]">
                      {activeVideoIndex + 1} / {YOUTUBE_VIDEOS.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {/* Prev Button */}
                    <button
                      type="button"
                      onClick={() => setActiveVideoIndex((prev) => (prev === 0 ? YOUTUBE_VIDEOS.length - 1 : prev - 1))}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-350 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                      title="Video trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Dot Indicators */}
                    <div className="flex items-center gap-2">
                      {YOUTUBE_VIDEOS.map((_, idx) => {
                        const isActive = idx === activeVideoIndex;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveVideoIndex(idx)}
                            className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${isActive ? 'w-8 bg-red-500 shadow-md shadow-red-500/50' : 'w-2.5 bg-white/10 hover:bg-white/30'
                              }`}
                            title={`Xem video ${idx + 1}`}
                          />
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => setActiveVideoIndex((prev) => (prev === YOUTUBE_VIDEOS.length - 1 ? 0 : prev + 1))}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-355 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                      title="Video kế tiếp"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: STATS BANNER                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="-mt-4 relative z-20 px-2">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-md p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 leading-none">{s.value}</p>
                  <p className="text-[11px] font-bold text-slate-700">{s.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: RECENTLY VIEWED PACKAGES (PERSONALIZED)                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {recentlyViewedPkgs.length > 0 && (
        <section className="mt-10 space-y-5 text-left animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 bg-gradient-to-r from-red-50/80 via-white to-slate-50 border border-red-100 rounded-2xl p-5 shadow-xs">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-red-100/80 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-1.5">
                <Clock className="w-3 h-3 text-primary animate-pulse" />
                Dành cho bạn
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Gói cước bạn quan tâm gần đây
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">
                Danh sách các gói cước bạn vừa tìm kiếm, so sánh hoặc xem chi tiết
              </p>
            </div>
            <span className="text-[11px] font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
              {recentlyViewedPkgs.length} gói cước
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentlyViewedPkgs.map(pkg => (
              <PackageCard
                key={`recent_${pkg.id || pkg.package_id}`}
                pkg={pkg}
                onSubscribe={handleSubscribeOpen}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: PACKAGE TABS                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={packagesSectionRef} className="mt-10 space-y-6 scroll-mt-24">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Danh Mục Gói Cước</p>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tìm gói cước theo nhu cầu</h2>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Lọc ngay theo loại — dữ liệu tải trực tiếp từ hệ thống</p>
          </div>
          <Link to="/packages" className="shrink-0 inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Package grid */}
        {pkgLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : pkgError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <Wifi className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-bold text-slate-800">Không thể tải danh sách gói cước</p>
            <p className="text-xs text-slate-500">{pkgError}</p>
            <button
              type="button"
              onClick={() => fetchPackages({ limit: 999, page: 1 })}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử lại
            </button>
          </div>
        ) : tabPackages.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-10 text-center">
            <p className="text-sm font-bold text-slate-700 mb-1">Chưa có gói trong danh mục này</p>
            <p className="text-xs text-slate-400">Thử chọn tab khác hoặc xem tất cả gói cước.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {tabPackages.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onSubscribe={handleSubscribeOpen}
              />
            ))}
          </div>
        )}

        {/* View more */}
        {!pkgLoading && !pkgError && tabPackages.length > 0 && (
          <div className="text-center pt-2">
            <Link
              to="/packages"
              className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-primary text-slate-700 hover:text-primary font-bold px-7 py-3 rounded-xl text-xs transition-all hover:-translate-y-0.5"
            >
              Xem đầy đủ tất cả gói cước <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: AI PROMO BENTO                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mt-14 space-y-4">
        <div className="text-center space-y-1 mb-6">
          <p className="text-[11px] font-black text-primary uppercase tracking-widest">Công Nghệ AI Độc Quyền</p>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Trợ lý thông minh hỗ trợ bạn</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Chatbot card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EE0033] to-[#7B0019] p-7 flex flex-col justify-between min-h-[240px]">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-11 h-11 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Trợ lý AI Chatbot</h3>
              <p className="text-sm text-white/80 font-medium leading-relaxed max-w-sm">
                Phân tích nhu cầu bằng ngôn ngữ tự nhiên. Hỏi bất cứ điều gì về gói cước — AI trả lời chính xác và nhanh chóng 24/7.
              </p>
            </div>
            <div className="relative z-10 mt-5 flex gap-3">
              <Link
                to="/chatbot"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-white/20 transition-colors"
              >
                Trò chuyện ngay <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Survey card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-7 flex flex-col justify-between min-h-[240px]">
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-11 h-11 bg-violet-500/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-4">
                <ClipboardList className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Khảo sát chọn gói</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-sm">
                Chỉ mất 30 giây trả lời 4 câu hỏi về thói quen sử dụng. Thuật toán Decision Tree đề xuất gói cước chuẩn 100% nhu cầu.
              </p>
            </div>
            <div className="relative z-10 mt-5">
              <Link
                id="btn-survey-section"
                to="/survey"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                <Zap className="w-4 h-4" /> Bắt đầu khảo sát
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: STEP GUIDE                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mt-14">
        <div className="text-center space-y-1 mb-8">
          <p className="text-[11px] font-black text-primary uppercase tracking-widest">Đơn Giản & Nhanh Chóng</p>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Chỉ 3 bước để đăng ký gói cước</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connector lines (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[33.33%] right-[33.33%] h-0.5 bg-gradient-to-r from-slate-200 via-primary/30 to-slate-200 z-0" />

          {[
            {
              step: '01',
              color: 'text-primary',
              bg: 'bg-red-50 border-red-100',
              icon: <Search className="w-6 h-6 text-primary" />,
              title: 'Tìm & Chọn gói phù hợp',
              desc: 'Duyệt danh mục gói cước, lọc theo nhu cầu, sử dụng AI Chatbot hoặc Khảo sát để nhận đề xuất tối ưu.',
            },
            {
              step: '02',
              color: 'text-blue-600',
              bg: 'bg-blue-50 border-blue-100',
              icon: <Wifi className="w-6 h-6 text-blue-600" />,
              title: 'Nạp tiền tài khoản',
              desc: 'Kết nối ví MetaMask (Web3 Blockchain Sepolia) hoặc nạp qua QR Code để nạp số dư ví di động nhanh chóng.',
            },
            {
              step: '03',
              color: 'text-emerald-600',
              bg: 'bg-emerald-50 border-emerald-100',
              icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
              title: 'Đăng ký 1-Click',
              desc: 'Nhấn nút Đăng ký trên trang — hệ thống xử lý tức thì. Hoặc soạn SMS theo cú pháp hiển thị sẵn và gửi 191.',
            },
          ].map((item, i) => (
            <div key={i} className="relative z-10 bg-white border border-slate-100 rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
              {/* Step number */}
              <div className="text-6xl font-black text-slate-100 group-hover:text-red-100 transition-colors leading-none mb-3 select-none">
                {item.step}
              </div>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${item.bg}`}>
                {item.icon}
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: FAQ + CONTACT SUPPORT                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="mb-6">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Giải Đáp Thắc Mắc</p>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Câu hỏi thường gặp</h2>
          </div>
          {FAQS.map((faq, i) => (
            <FaqItem
              key={i}
              q={faq.q}
              a={faq.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>

        {/* CSKH card (1/3) */}
        <div className="flex flex-col gap-4">
          {/* Hotline card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                <HeadphonesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng đài CSKH · Miễn phí</p>
                <p className="text-4xl font-black text-white leading-none mb-1">198</p>
                <p className="text-xs text-slate-400 font-medium">hoặc 1800 8098 · 24/7</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang hoạt động — Sẵn sàng hỗ trợ
              </div>
            </div>
          </div>

          {/* Info tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Hỗ trợ</p>
              <p className="text-xs font-extrabold text-slate-800">24/7</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">CSKH</p>
              <p className="text-xs font-extrabold text-slate-800">Chuyên nghiệp</p>
            </div>
          </div>

          {/* Contact CTA */}
          <Link
            id="btn-go-contact"
            to="/contact"
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs px-5 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            Gửi yêu cầu hỗ trợ
          </Link>
        </div>
      </section>

      {/* Register Modal */}
      {selectedPkg && (
        <RegisterModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          pkg={selectedPkg}
          onSuccess={msg => showToast('success', msg)}
          onError={msg => showToast('error', msg)}
        />
      )}
    </div>
  );
}
