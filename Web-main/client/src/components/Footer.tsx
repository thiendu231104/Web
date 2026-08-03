import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, MapPin, Bot, ChevronDown, ChevronUp,
  Shield, FileText, HeadphonesIcon, Zap,
  ArrowRightLeft, ClipboardList, Wallet
} from 'lucide-react';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-medium"
    >
      {children}
    </Link>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-[11px] font-black text-white uppercase tracking-widest text-left cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180 text-primary' : 'text-slate-400'}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function SocialBtn({ href, label, hoverClass, children }: { href: string; label: string; hoverClass: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 transition-all ${hoverClass}`}
    >
      {children}
    </a>
  );
}

// ─── Social icon SVGs (inline — no external deps) ─────────────────────────────
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-label="Facebook">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.266h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}
function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-label="Youtube">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  );
}
function IconTiktok() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-label="TikTok">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.88a8.24 8.24 0 0 0 4.82 1.54V7.04a4.85 4.85 0 0 1-1.06-.35z" />
    </svg>
  );
}
// ═════════════════════════════════════════════════════════════════════════════
export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0f172a] border-t-2 border-primary/30 text-slate-400 text-xs mt-12">
      {/* ═══ TẦNG 1: MAIN NAVIGATION — DESKTOP ═══════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 hidden md:block">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">

          {/* COL 1: Brand */}
          <div className="lg:col-span-2 space-y-3 pr-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 bg-gradient-to-br from-primary to-[#7B0019] rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg shadow-primary/30">
                V
              </div>
              <span className="text-base font-black text-white tracking-tight">
                Viettel<span className="text-primary">AI</span>
              </span>
            </div>

            <p className="text-slate-400 text-[11px] font-medium leading-relaxed max-w-sm">
              Hệ thống đăng ký gói cước di động thông minh tích hợp AI Chatbot tư vấn & Công nghệ nạp tiền Web3 Blockchain Sepolia.
            </p>
          </div>

          {/* COL 3: Tiện ích & AI */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              Tiện Ích & AI
            </h4>
            <ul className="space-y-2">
              <li><NavLink to="/packages">
                <ArrowRightLeft className="w-3 h-3 opacity-70" /> Xem tất cả gói cước
              </NavLink></li>
              <li><NavLink to="/compare">
                <ArrowRightLeft className="w-3 h-3 opacity-70" /> So sánh gói cước thông minh
              </NavLink></li>
              <li><NavLink to="/survey">
                <ClipboardList className="w-3 h-3 opacity-70" /> Khảo sát chọn gói
              </NavLink></li>
              <li><NavLink to="/chatbot">
                <Bot className="w-3 h-3 opacity-70" /> Chatbot tư vấn
              </NavLink></li>
              <li><NavLink to="/profile/subscriptions">
                <Zap className="w-3 h-3 opacity-70" /> Lịch sử đăng ký gói cước
              </NavLink></li>
              <li><NavLink to="/profile/deposit">
                <Wallet className="w-3 h-3 opacity-70" /> Nạp tiền
              </NavLink></li>
            </ul>
          </div>

          {/* COL 4: CSKH */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <HeadphonesIcon className="w-3.5 h-3.5 text-yellow-400" />
              Hỗ Trợ CSKH
            </h4>
            <ul className="space-y-2">
              <li className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tổng đài miễn phí 24/7</span>
                </div>
                <div className="pl-5 flex items-center gap-2">
                  <span className="text-xl font-black text-primary leading-none">198</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-sm font-black text-yellow-400">1800 8098</span>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-slate-400 font-medium">cskh@viettel.com.vn</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-slate-400 font-medium leading-relaxed">Tòa nhà Viettel Cần Thơ<br />210 Trần Phú, Ninh Kiều</span>
              </li>
              <li><NavLink to="/contact">
                Gửi yêu cầu hỗ trợ
              </NavLink></li>
            </ul>
          </div>

          {/* COL 5: Điều khoản */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Pháp Lý & Tuân Thủ
            </h4>
            <ul className="space-y-2">
              <li><NavLink to="/terms">
                <FileText className="w-3 h-3 opacity-70" /> Điều khoản sử dụng dịch vụ
              </NavLink></li>
              <li><NavLink to="/privacy">
                <Shield className="w-3 h-3 opacity-70" /> Chính sách bảo mật
              </NavLink></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ TẦNG 2: MAIN NAVIGATION — MOBILE ACCORDION ══════════════════════ */}
      <div className="md:hidden px-6 py-4 border-b border-white/8 space-y-0">
        {/* Brand always visible on mobile */}
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/8 mb-2">
          <div className="w-8.5 h-8.5 bg-gradient-to-br from-primary to-[#7B0019] rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg shadow-primary/30">
            V
          </div>
          <span className="text-base font-black text-white tracking-tight">
            Viettel<span className="text-primary">AI</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-400">Online 24/7</span>
          </span>
        </div>

        <MobileSection title="Tiện Ích & AI">
          <ul className="space-y-2 pl-2">
            <li><NavLink to="/packages">Xem tất cả gói cước</NavLink></li>
            <li><NavLink to="/compare">So sánh gói cước thông minh</NavLink></li>
            <li><NavLink to="/survey">Khảo sát chọn gói</NavLink></li>
            <li><NavLink to="/chatbot">Chatbot tư vấn</NavLink></li>
            <li><NavLink to="/profile/subscriptions">Lịch sử đăng ký gói cước</NavLink></li>
            <li><NavLink to="/profile/deposit">Nạp tiền</NavLink></li>
          </ul>
        </MobileSection>

        <MobileSection title="Hỗ Trợ CSKH">
          <ul className="space-y-2 pl-2">
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Tổng đài: <strong className="text-primary">198</strong> · <strong className="text-yellow-400">1800 8098</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-slate-400">cskh@viettel.com.vn</span>
            </li>
            <li><NavLink to="/contact">Gửi yêu cầu hỗ trợ</NavLink></li>
          </ul>
        </MobileSection>

        <MobileSection title="Pháp Lý & Điều Khoản">
          <ul className="space-y-2 pl-2">
            <li><NavLink to="/terms">Điều khoản sử dụng</NavLink></li>
            <li><NavLink to="/privacy">Chính sách bảo mật</NavLink></li>
          </ul>
        </MobileSection>
      </div>

      {/* ═══ TẦNG 3: BOTTOM BAR ══════════════════════════════════════════════ */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Left: Copyright */}
          <p className="text-[11px] text-slate-600 font-medium text-center sm:text-left">
            © 2026 Viettel Telecom.
          </p>

          {/* Right: Blockchain tag + Socials */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {/* Blockchain network badge */}
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span className="text-[10px] font-bold text-violet-400">Sepolia Network ID: 11155111</span>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              <SocialBtn href="https://www.facebook.com/fp.viettel.cantho?locale=vi_VN" label="Facebook" hoverClass="hover:bg-[#1877F2] hover:text-white">
                <IconFacebook />
              </SocialBtn>
              <SocialBtn href="https://www.youtube.com/user/Viettelchannels" label="Youtube" hoverClass="hover:bg-[#FF0000] hover:text-white">
                <IconYoutube />
              </SocialBtn>
              <SocialBtn href="https://www.tiktok.com/@viettelvn" label="TikTok" hoverClass="hover:bg-black hover:text-white hover:border-white/20">
                <IconTiktok />
              </SocialBtn>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-[150] w-10 h-10 rounded-xl bg-slate-900 border border-white/10 text-white flex items-center justify-center shadow-2xl hover:bg-primary transition-all duration-300 cursor-pointer ${showBackToTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }`}
        aria-label="Cuộn về đầu trang"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </footer>
  );
}
