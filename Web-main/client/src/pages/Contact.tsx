import {
  Mail, MapPin, Send, CheckCircle,
  Headphones, Loader2, XCircle, Clock,
  Package2, Wallet, UserRound, MessageCircleWarning,
  LifeBuoy, ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { contactApi } from '../services/api';
import SEO from '../components/SEO';
import ContactHistoryTab from '../components/ContactHistoryTab';
import { saveGuestContactId } from '../utils/guestContactTracker';

/* ────────────────────────── constants ────────────────────────── */
const TOPICS = [
  {
    id: 'register',
    label: 'Đăng ký gói cước',
    sub: 'Tư vấn & đăng ký gói mới',
    Icon: Package2,
    accent: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    id: 'topup',
    label: 'Nạp tiền & Số dư',
    sub: 'Sự cố thanh toán, số dư ví',
    Icon: Wallet,
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    id: 'account',
    label: 'Tài khoản thuê bao',
    sub: 'Quản lý thông tin tài khoản',
    Icon: UserRound,
    accent: '#0891b2',
    bg: '#ecfeff',
  },
  {
    id: 'complaint',
    label: 'Góp ý & Khiếu nại',
    sub: 'Phản ánh chất lượng dịch vụ',
    Icon: MessageCircleWarning,
    accent: '#d97706',
    bg: '#fffbeb',
  },
  {
    id: 'other',
    label: 'Vấn đề khác',
    sub: 'Hỗ trợ tổng hợp',
    Icon: LifeBuoy,
    accent: '#4b5563',
    bg: '#f9fafb',
  },
] as const;

const TOPIC_VALUE: Record<string, string> = {
  register: 'Tư vấn & Đăng ký gói cước',
  topup: 'Sự cố Nạp tiền & Số dư ví',
  account: 'Quản lý tài khoản thuê bao',
  complaint: 'Góp ý & Khiếu nại dịch vụ',
  other: 'Khác',
};

/* ────────────────────────── component ────────────────────────── */
export default function Contact() {
  const { currentUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  // form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ── sync effects ── */
  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'history' ? 'history' : 'new');
  }, [searchParams]);

  useEffect(() => {
    if (currentUser) { setFullName(currentUser.name || ''); setPhone(currentUser.phoneNumber || ''); }
    else { setFullName(''); setPhone(''); }
  }, [currentUser]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 110), 320)}px`; }
  }, [message]);

  /* ── topic select: scroll into form ── */
  useEffect(() => {
    if (topicId && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  }, [topicId]);

  /* ── helpers ── */
  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3800);
  };

  const topic = TOPIC_VALUE[topicId ?? 'other'] ?? 'Khác';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên.';
    if (!phone.trim()) e.phone = 'Vui lòng nhập số điện thoại.';
    else if (!/^0[0-9]{9}$/.test(phone.trim())) e.phone = '10 chữ số, bắt đầu bằng 0.';
    if (!message.trim()) e.message = 'Vui lòng nhập nội dung.';
    else if (message.trim().length < 10) e.message = 'Tối thiểu 10 ký tự.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await contactApi.createContact({
        full_name: fullName.trim(), phone: phone.trim(), topic,
        message: `[Chủ đề: ${topic}]\n${message.trim()}`,
      });
      if (res.success) {
        if (!currentUser && res.data?.contact_id) {
          saveGuestContactId(res.data.contact_id, phone.trim());
        }
        setSubmitDone(true); setMessage('');
        if (!currentUser) { setFullName(''); setPhone(''); }
        showToast('ok', 'Đã gửi thành công! CSKH Viettel sẽ liên hệ sớm.');
        setTimeout(() => setSubmitDone(false), 6000);
      } else { showToast('err', res.message || 'Gửi thất bại.'); }
    } catch (err: any) {
      showToast('err', err.response?.data?.message || 'Lỗi kết nối máy chủ.');
    } finally { setIsSubmitting(false); }
  };

  const handleTabChange = (t: 'new' | 'history') => { setActiveTab(t); setSearchParams({ tab: t }); };

  const breadcrumbsSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: typeof window !== 'undefined' ? window.location.origin : '' },
      { '@type': 'ListItem', position: 2, name: 'Liên hệ', item: typeof window !== 'undefined' ? `${window.location.origin}/contact` : '' },
    ],
  };

  /* ────── selected topic meta ────── */
  const activeTopic = TOPICS.find(t => t.id === topicId);

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <>
      <SEO
        title="Liên Hệ Hỗ Trợ CSKH - Viettel Telecom"
        description="Gửi phản hồi, tư vấn gói cước di động và giải đáp thắc mắc dịch vụ tổng đài CSKH Viettel 24/7."
        schema={breadcrumbsSchema}
      />

      {/* ── page-scoped styles ── */}
      <style>{`
        /* reset & tokens */
        .sp { --red:#ee0033; --red-light:#fff1f3; --ink:#0a0a0a; --muted:#64748b;
              --line:#e8eaed; --surface:#ffffff; --lift:#f7f8fa;
              font-family:inherit; box-sizing:border-box; }

        /* breakout: escape max-w-7xl main padding */
        .sp-breakout {
          margin-left: calc(-1rem);
          margin-right: calc(-1rem);
          margin-top: -2rem;
        }
        @media(min-width:768px){
          .sp-breakout { margin-left:calc(-2rem); margin-right:calc(-2rem); }
        }

        /* toast */
        .sp-toast {
          position:fixed; bottom:28px; right:24px; z-index:9999;
          display:flex; align-items:center; gap:10px;
          padding:13px 18px; border-radius:14px;
          font-size:13px; font-weight:600; max-width:360px;
          box-shadow:0 8px 40px rgba(0,0,0,.15);
          animation: sp-up .25s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes sp-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        /* topbar */
        .sp-bar {
          position:relative;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 32px; height:52px;
          background:#fff;
          border-bottom:1px solid var(--line);
          border-top:1px solid var(--line);
        }
        .sp-brand { display:flex; align-items:center; gap:10px; }
        .sp-brand-icon {
          width:32px; height:32px; border-radius:9px;
          background:var(--red); display:flex; align-items:center; justify-content:center;
        }
        .sp-brand-name { font-size:14px; font-weight:800; color:var(--ink); letter-spacing:-.01em; }
        .sp-brand-tag {
          font-size:10px; font-weight:700; color:var(--red); background:var(--red-light);
          border:1px solid #fecdd3; border-radius:999px; padding:2px 8px; letter-spacing:.06em;
        }
        .sp-switcher {
          display:flex; background:var(--lift); border:1px solid var(--line);
          border-radius:10px; padding:3px; gap:2px;
        }
        .sp-sw-btn {
          height:32px; padding:0 16px; border:none; border-radius:8px;
          font-size:12px; font-weight:700; cursor:pointer; transition:all .15s;
          background:transparent; color:var(--muted); font-family:inherit;
        }
        .sp-sw-btn.on {
          background:var(--surface); color:var(--ink);
          box-shadow:0 1px 4px rgba(0,0,0,.08);
        }

        /* workspace (new tab) */
        .sp-workspace {
          display:grid; grid-template-columns:1fr 360px;
          gap:0; min-height:calc(100vh - 112px);
        }

        /* left zone */
        .sp-left {
          padding:52px 48px 80px; border-right:1px solid var(--line);
          overflow-y:auto;
        }
        .sp-eyebrow {
          font-size:10px; font-weight:800; color:var(--red);
          text-transform:uppercase; letter-spacing:.12em; margin:0 0 12px;
        }
        .sp-headline {
          font-size:clamp(26px,3.5vw,38px); font-weight:900; color:var(--ink);
          letter-spacing:-.03em; line-height:1.15; margin:0 0 8px;
        }
        .sp-sub {
          font-size:14px; color:var(--muted); font-weight:500;
          margin:0 0 40px; line-height:1.6;
        }

        /* topic tiles */
        .sp-topic-grid {
          display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:40px;
        }
        .sp-topic-grid .sp-tile:last-child:nth-child(odd) {
          grid-column:1 / -1;
        }
        .sp-tile {
          display:flex; align-items:flex-start; gap:14px;
          padding:18px 20px; border-radius:14px; border:1.5px solid var(--line);
          background:var(--surface); cursor:pointer; text-align:left;
          transition:all .18s cubic-bezier(.16,1,.3,1);
          position:relative; overflow:hidden;
        }
        .sp-tile:hover { border-color:#d1d5db; box-shadow:0 4px 16px rgba(0,0,0,.06); transform:translateY(-1px); }
        .sp-tile.sel { border-color:var(--tile-accent,var(--red)); background:var(--tile-bg,var(--red-light)); box-shadow:0 0 0 3px color-mix(in srgb, var(--tile-accent,var(--red)) 12%, transparent); }
        .sp-tile-icon {
          width:38px; height:38px; border-radius:10px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:var(--tile-bg,#f1f5f9); transition:background .18s;
        }
        .sp-tile.sel .sp-tile-icon { background:color-mix(in srgb, var(--tile-accent,var(--red)) 15%, white); }
        .sp-tile-label { font-size:13px; font-weight:800; color:var(--ink); margin:0 0 2px; line-height:1.3; }
        .sp-tile-sub { font-size:11px; color:var(--muted); font-weight:500; margin:0; }
        .sp-tile-check {
          position:absolute; top:12px; right:12px; width:20px; height:20px;
          border-radius:50%; background:var(--tile-accent,var(--red));
          display:flex; align-items:center; justify-content:center;
        }

        /* form reveal */
        .sp-form-zone {
          animation: sp-up .3s cubic-bezier(.16,1,.3,1) both;
          border-top:1px solid var(--line); padding-top:36px;
        }
        .sp-form-header {
          display:flex; align-items:center; gap:10px; margin-bottom:28px;
        }
        .sp-form-badge {
          display:inline-flex; align-items:center; gap:6px;
          font-size:11px; font-weight:800; padding:5px 12px; border-radius:999px;
          background:var(--tile-bg,var(--red-light));
          color:var(--tile-accent,var(--red));
          border:1px solid color-mix(in srgb, var(--tile-accent,var(--red)) 20%, transparent);
        }
        .sp-form-title { font-size:16px; font-weight:800; color:var(--ink); margin:0; }

        /* fields */
        .sp-fields { display:flex; flex-direction:column; gap:24px; }
        .sp-field { display:flex; flex-direction:column; gap:7px; }
        .sp-label { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; }
        .sp-input {
          height:46px; padding:0 16px; border-radius:12px;
          border:1.5px solid var(--line); background:var(--lift);
          font-size:14px; font-weight:500; color:var(--ink); outline:none;
          transition:all .15s; font-family:inherit; width:100%; box-sizing:border-box;
        }
        .sp-input:focus { border-color:var(--red); background:#fff; box-shadow:0 0 0 3px rgba(238,0,51,.08); }
        .sp-input.err { border-color:#f87171; background:#fff5f5; }
        .sp-textarea {
          padding:14px 16px; border-radius:12px;
          border:1.5px solid var(--line); background:var(--lift);
          font-size:14px; font-weight:500; color:var(--ink); outline:none;
          transition:all .15s; font-family:inherit; width:100%; box-sizing:border-box;
          resize:none; min-height:110px; max-height:320px; overflow-y:auto;
        }
        .sp-textarea:focus { border-color:var(--red); background:#fff; box-shadow:0 0 0 3px rgba(238,0,51,.08); }
        .sp-textarea.err { border-color:#f87171; background:#fff5f5; }
        .sp-err-msg { font-size:11px; color:#ef4444; font-weight:600; }
        .sp-row2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .sp-actions { display:flex; align-items:center; gap:16px; margin-top:8px; }
        .sp-submit {
          display:inline-flex; align-items:center; gap:8px;
          height:48px; padding:0 28px; border-radius:12px; border:none;
          background:var(--ink); color:#fff; font-size:13px; font-weight:800;
          cursor:pointer; transition:all .2s; font-family:inherit; letter-spacing:.01em;
        }
        .sp-submit:hover:not(:disabled) { background:#1e293b; transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,0,0,.18); }
        .sp-submit:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .sp-submit-note { font-size:12px; color:#cbd5e1; font-weight:500; }

        /* success state */
        .sp-success {
          display:flex; flex-direction:column; align-items:flex-start; gap:16px;
          padding:32px; border-radius:20px;
          background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);
          border:1px solid #86efac;
          animation: sp-up .3s cubic-bezier(.16,1,.3,1) both;
        }
        .sp-success-ico {
          width:48px; height:48px; border-radius:14px; background:#dcfce7;
          display:flex; align-items:center; justify-content:center;
        }

        /* right bento */
        .sp-right {
          padding:36px 28px; background:var(--lift);
          display:flex; flex-direction:column; gap:12px;
          overflow-y:auto;
        }
        .sp-bento-label {
          font-size:10px; font-weight:800; color:#94a3b8;
          text-transform:uppercase; letter-spacing:.1em; margin-bottom:4px;
        }

        /* bento tiles */
        .sp-bt {
          border-radius:16px; padding:20px; border:1px solid var(--line);
          background:var(--surface); transition:box-shadow .15s;
        }
        .sp-bt:hover { box-shadow:0 4px 16px rgba(0,0,0,.06); }
        .sp-bt-phone {
          background:var(--ink); color:#fff; border-color:transparent;
          position:relative; overflow:hidden;
        }
        .sp-bt-phone-glow {
          position:absolute; top:-40px; right:-40px;
          width:120px; height:120px; border-radius:50%;
          background:radial-gradient(circle,rgba(238,0,51,.3) 0%,transparent 70%);
        }
        .sp-bt-phone-eye { font-size:10px; font-weight:700; color:rgba(255,255,255,.45); text-transform:uppercase; letter-spacing:.1em; margin:0 0 8px; }
        .sp-bt-phone-num { font-size:32px; font-weight:900; color:#fff; margin:0; letter-spacing:-.02em; line-height:1; }
        .sp-bt-phone-alt { font-size:12px; color:rgba(255,255,255,.5); font-weight:600; margin:6px 0 0; }
        .sp-bt-phone-tag {
          display:inline-flex; align-items:center; gap:5px;
          margin-top:12px; font-size:11px; font-weight:700; color:#4ade80;
          background:rgba(74,222,128,.12); border:1px solid rgba(74,222,128,.2);
          border-radius:999px; padding:4px 10px;
        }
        .sp-bt-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .sp-bt-icon-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .sp-bt-icon-wrap {
          width:28px; height:28px; border-radius:8px; background:var(--lift);
          border:1px solid var(--line); display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .sp-bt-val { font-size:13px; font-weight:800; color:var(--ink); margin:0 0 2px; }
        .sp-bt-note { font-size:11px; color:var(--muted); font-weight:500; margin:0; }
        .sp-bt-status {
          display:flex; align-items:center; gap:10px;
          background:linear-gradient(135deg,#f0fdf4,#dcfce7); border-color:#bbf7d0;
        }
        .sp-pulse-wrap { position:relative; width:10px; height:10px; flex-shrink:0; }
        .sp-pulse-dot { width:10px; height:10px; border-radius:50%; background:#22c55e; }
        .sp-pulse-ring {
          position:absolute; inset:0; border-radius:50%;
          background:rgba(34,197,94,.3);
          animation:sp-pulse 2s ease-out infinite;
        }
        @keyframes sp-pulse { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.5);opacity:0} }
        .sp-status-text { font-size:12px; font-weight:800; color:#16a34a; }
        .sp-status-sub { font-size:11px; color:#4ade80; font-weight:500; }

        /* history workspace */
        .sp-history {
          padding:48px 48px 80px; max-width:980px;
        }
        .sp-lookup-bar {
          display:flex; align-items:center; gap:12px; margin-bottom:40px;
          padding:14px 18px; border-radius:16px;
          background:#fff; border:1.5px solid var(--line);
          box-shadow:0 1px 4px rgba(0,0,0,.04);
        }
        .sp-lookup-input {
          flex:1; border:none; outline:none; background:transparent;
          font-size:14px; font-weight:500; color:var(--ink); font-family:inherit;
        }
        .sp-lookup-btn {
          display:inline-flex; align-items:center; gap:6px;
          height:36px; padding:0 16px; border-radius:9px; border:none;
          background:var(--ink); color:#fff; font-size:12px; font-weight:700;
          cursor:pointer; font-family:inherit; transition:all .15s;
        }
        .sp-lookup-btn:hover:not(:disabled) { background:#1e293b; }
        .sp-lookup-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* card board */
        .sp-board { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
        .sp-hcard {
          border-radius:20px; border:1.5px solid var(--line);
          background:var(--surface); overflow:hidden;
          transition:all .2s; position:relative;
        }
        .sp-hcard:hover { box-shadow:0 6px 24px rgba(0,0,0,.08); transform:translateY(-2px); }
        .sp-hcard.lit { border-color:var(--red); box-shadow:0 0 0 3px rgba(238,0,51,.1); transform:scale(1.01); }
        .sp-hcard-top {
          padding:16px 20px; border-bottom:1px solid var(--lift);
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .sp-hcard-id { font-size:10px; font-weight:800; color:#94a3b8; font-family:monospace; letter-spacing:.05em; }
        .sp-hcard-date { font-size:11px; color:#94a3b8; font-weight:500; }
        .sp-hcard-status {
          display:inline-flex; align-items:center; gap:5px;
          font-size:11px; font-weight:800; padding:4px 10px;
          border-radius:999px;
        }
        .sp-hcard-status.done { background:#f0fdf4; color:#16a34a; }
        .sp-hcard-status.wait { background:#fffbeb; color:#b45309; }
        .sp-hcard-body { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
        .sp-hcard-topic {
          display:inline-flex; font-size:11px; font-weight:700; color:#475569;
          background:var(--lift); border:1px solid var(--line);
          border-radius:7px; padding:3px 9px;
        }
        .sp-hcard-msglabel { font-size:10px; font-weight:700; color:#cbd5e1; text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }
        .sp-hcard-msg { font-size:13px; color:#475569; line-height:1.6; font-weight:500; white-space:pre-line; }
        .sp-hcard-reply {
          border-left:3px solid; padding-left:12px;
        }
        .sp-hcard-reply.done { border-color:#22c55e; }
        .sp-hcard-reply.wait { border-color:#fbbf24; }
        .sp-reply-head { display:flex; align-items:center; gap:6px; margin-bottom:5px; }
        .sp-reply-label { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; }
        .sp-hcard-reply.done .sp-reply-label { color:#16a34a; }
        .sp-hcard-reply.wait .sp-reply-label { color:#b45309; }
        .sp-reply-text { font-size:13px; color:#0f172a; font-weight:500; line-height:1.6; }
        .sp-reply-time { font-size:11px; color:#94a3b8; font-weight:500; margin-top:6px; }
        .sp-wait-msg { font-size:12px; font-weight:600; color:#92400e; }
        .sp-new-badge {
          position:absolute; top:0; right:0;
          font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
          color:#ee0033; background:#fff1f3; border:1px solid #fecdd3;
          border-radius:0 20px 0 10px; padding:4px 10px;
        }

        /* blank */
        .sp-blank {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:80px 24px; text-align:center; gap:12px;
          border:1.5px dashed var(--line); border-radius:20px;
          grid-column:1 / -1;
        }
        .sp-blank-ico {
          width:52px; height:52px; border-radius:14px; background:var(--lift);
          display:flex; align-items:center; justify-content:center; margin-bottom:4px;
        }
        .sp-blank-text { font-size:14px; font-weight:600; color:#94a3b8; max-width:280px; }

        /* skeleton */
        .sp-skel { border-radius:20px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sp-skel 1.4s infinite; }
        @keyframes sp-skel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* responsive */
        @media(max-width:900px){
          .sp-workspace{grid-template-columns:1fr;}
          .sp-right{border-top:1px solid var(--line);}
          .sp-board{grid-template-columns:1fr;}
        }
        @media(max-width:640px){
          .sp-left,.sp-history{padding:28px 20px 60px;}
          .sp-bar{padding:0 16px;}
          .sp-topic-grid{grid-template-columns:1fr;}
          .sp-tile:last-child:nth-child(odd){grid-column:auto;}
          .sp-row2{grid-template-columns:1fr;}
        }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className="sp-toast" style={{
          background: toast.type === 'ok' ? '#0a0a0a' : '#fff',
          color: toast.type === 'ok' ? '#fff' : '#be123c',
          border: toast.type === 'ok' ? 'none' : '1px solid #fecdd3',
        }}>
          {toast.type === 'ok'
            ? <CheckCircle size={15} style={{ color: '#4ade80', flexShrink: 0 }} />
            : <XCircle size={15} style={{ color: '#f43f5e', flexShrink: 0 }} />}
          {toast.text}
        </div>
      )}

      {/* breakout wrapper — escapes <main> padding */}
      <div className="sp-breakout sp">

      {/* ── Top Bar ── */}
      <header className="sp-bar sp">
        <div className="sp-brand">
          <div className="sp-brand-icon">
            <Headphones size={16} style={{ color: '#fff' }} />
          </div>
          <span className="sp-brand-name">Viettel Support</span>
          <span className="sp-brand-tag">CSKH 24/7</span>
        </div>
        <div className="sp-switcher">
          <button className={`sp-sw-btn ${activeTab === 'new' ? 'on' : ''}`} onClick={() => handleTabChange('new')}>
            Yêu cầu mới
          </button>
          <button className={`sp-sw-btn ${activeTab === 'history' ? 'on' : ''}`} onClick={() => handleTabChange('history')}>
            Lịch sử phản hồi
          </button>
        </div>
      </header>

      {/* ════════════ NEW REQUEST ════════════ */}
      {activeTab === 'new' && (
        <div className="sp-workspace sp">
          {/* ── Left: Intent + Form ── */}
          <div className="sp-left">
            <p className="sp-eyebrow">Trung tâm hỗ trợ</p>
            <h1 className="sp-headline">Chúng tôi có thể<br />giúp gì cho bạn?</h1>
            <p className="sp-sub">Chọn vấn đề phù hợp bên dưới. Đội ngũ CSKH sẽ phản hồi trong 24 giờ.</p>

            {/* Topic tiles */}
            <div className="sp-topic-grid">
              {TOPICS.map((t) => {
                const sel = topicId === t.id;
                return (
                  <button
                    key={t.id}
                    className={`sp-tile${sel ? ' sel' : ''}`}
                    style={{ '--tile-accent': t.accent, '--tile-bg': t.bg } as React.CSSProperties}
                    onClick={() => setTopicId(t.id)}
                    type="button"
                  >
                    <div className="sp-tile-icon">
                      <t.Icon size={19} style={{ color: sel ? t.accent : '#64748b' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="sp-tile-label">{t.label}</p>
                      <p className="sp-tile-sub">{t.sub}</p>
                    </div>
                    {sel && (
                      <div className="sp-tile-check">
                        <CheckCircle size={12} style={{ color: '#fff' }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Form — reveals after topic selected */}
            {topicId && (
              <div className="sp-form-zone" ref={formRef}>
                {submitDone ? (
                  <div className="sp-success">
                    <div className="sp-success-ico">
                      <CheckCircle size={24} style={{ color: '#16a34a' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Đã gửi thành công!</p>
                      <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 16px', fontWeight: 500, lineHeight: 1.6 }}>
                        CSKH Viettel đã nhận yêu cầu về chủ đề <strong>{activeTopic?.label}</strong>.
                        Chúng tôi sẽ liên hệ trong 24 giờ làm việc.
                      </p>
                      <button
                        className="sp-sw-btn on"
                        style={{ border: '1px solid #86efac', background: '#fff', color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}
                        onClick={() => { setSubmitDone(false); handleTabChange('history'); }}
                      >
                        Xem lịch sử phản hồi <ChevronRight size={13} style={{ display: 'inline' }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sp-form-header">
                      {activeTopic && (
                        <div
                          className="sp-form-badge"
                          style={{ '--tile-accent': activeTopic.accent, '--tile-bg': activeTopic.bg } as React.CSSProperties}
                        >
                          <activeTopic.Icon size={12} />
                          {activeTopic.label}
                        </div>
                      )}
                      <p className="sp-form-title">Điền thông tin liên hệ</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="sp-fields">
                        <div className="sp-row2">
                          <div className="sp-field">
                            <label className="sp-label">Họ và tên *</label>
                            <input
                              className={`sp-input${errors.fullName ? ' err' : ''}`}
                              type="text" placeholder="Nguyễn Văn A"
                              value={fullName} onChange={e => setFullName(e.target.value)}
                            />
                            {errors.fullName && <span className="sp-err-msg">{errors.fullName}</span>}
                          </div>
                          <div className="sp-field">
                            <label className="sp-label">Số điện thoại *</label>
                            <input
                              className={`sp-input${errors.phone ? ' err' : ''}`}
                              type="tel" inputMode="numeric" maxLength={10}
                              placeholder="0xxxxxxxxx"
                              value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                            {errors.phone && <span className="sp-err-msg">{errors.phone}</span>}
                          </div>
                        </div>

                        <div className="sp-field">
                          <label className="sp-label">Nội dung chi tiết *</label>
                          <textarea
                            ref={textareaRef}
                            className={`sp-textarea${errors.message ? ' err' : ''}`}
                            placeholder="Mô tả vấn đề bạn đang gặp phải..."
                            value={message} onChange={e => setMessage(e.target.value)}
                          />
                          {errors.message && <span className="sp-err-msg">{errors.message}</span>}
                        </div>

                        <div className="sp-actions">
                          <button type="submit" disabled={isSubmitting} className="sp-submit">
                            {isSubmitting
                              ? <><Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />Đang gửi…</>
                              : <><Send size={14} />Gửi yêu cầu</>}
                          </button>
                          <span className="sp-submit-note">Phản hồi trong 24 giờ</span>
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Bento Info ── */}
          <aside className="sp-right sp">
            <p className="sp-bento-label">Liên hệ trực tiếp</p>

            {/* Phone — hero tile */}
            <div className="sp-bt sp-bt-phone">
              <div className="sp-bt-phone-glow" />
              <p className="sp-bt-phone-eye">Tổng đài CSKH · Miễn phí</p>
              <p className="sp-bt-phone-num">198</p>
              <p className="sp-bt-phone-alt">hoặc 1800 8098</p>
              <div className="sp-bt-phone-tag">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                Miễn cước gọi 24/7
              </div>
            </div>

            {/* Email + Hours row */}
            <div className="sp-bt-row">
              <div className="sp-bt">
                <div className="sp-bt-icon-row">
                  <div className="sp-bt-icon-wrap"><Mail size={13} style={{ color: '#64748b' }} /></div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Email</span>
                </div>
                <p className="sp-bt-val" style={{ fontSize: 11, wordBreak: 'break-all' }}>cskh@viettel.com.vn</p>
                <p className="sp-bt-note">Phản hồi trong 24h</p>
              </div>
              <div className="sp-bt">
                <div className="sp-bt-icon-row">
                  <div className="sp-bt-icon-wrap"><Clock size={13} style={{ color: '#64748b' }} /></div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Giờ</span>
                </div>
                <p className="sp-bt-val">24/7</p>
                <p className="sp-bt-note">Kể cả Lễ / Tết</p>
              </div>
            </div>

            {/* Live status */}
            <div className="sp-bt sp-bt-status">
              <div className="sp-pulse-wrap">
                <div className="sp-pulse-dot" />
                <div className="sp-pulse-ring" />
              </div>
              <div>
                <p className="sp-status-text">Đang hoạt động</p>
                <p className="sp-status-sub">Sẵn sàng tiếp nhận hỗ trợ</p>
              </div>
            </div>

            {/* Address */}
            <div className="sp-bt" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div className="sp-bt-icon-wrap" style={{ flexShrink: 0, marginTop: 2 }}><MapPin size={13} style={{ color: '#64748b' }} /></div>
              <div>
                <p className="sp-bt-val">Tòa nhà Viettel Cần Thơ</p>
                <p className="sp-bt-note">210 Trần Phú, Ninh Kiều, Cần Thơ</p>
              </div>
            </div>

            {/* CTA hint */}
            <div style={{ marginTop: 'auto', padding: '16px 20px', background: '#fff8f0', border: '1px solid #fed7aa', borderRadius: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', margin: '0 0 4px' }}>💡 Cần hỗ trợ nhanh?</p>
              <p style={{ fontSize: 12, color: '#c2410c', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                Gọi <strong>198</strong> để được kết nối ngay với tư vấn viên — không cần chờ.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ════════════ HISTORY ════════════ */}
      {activeTab === 'history' && (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          <ContactHistoryTab
            onNavigateToNew={() => handleTabChange('new')}
            highlightedId={searchParams.get('id')}
          />
        </div>
      )}

      </div>{/* end sp-breakout */}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}
