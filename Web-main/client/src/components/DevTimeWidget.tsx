import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Calendar, X, FastForward, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store';

// Helper to format ISO date string for datetime-local input
const formatForInput = (dateInput: string | Date) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

// Helper to format date for display in VN format
const formatDisplayDateTime = (dateInput: string | Date): string => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('vi-VN', options);
  const parts = formatter.formatToParts(d);

  let hour = '00', minute = '00', second = '00', day = '01', month = '01', year = '2026';
  for (const part of parts) {
    if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
    else if (part.type === 'second') second = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'year') year = part.value;
  }

  return `${hour}:${minute}:${second} - ${day}/${month}/${year}`;
};

export default function DevTimeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [virtualTime, setVirtualTime] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [inputVal, setInputVal] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVirtualTime = async () => {
    try {
      const response = await fetch('/api/subscriptions/dev/virtual-time');
      const data = await response.json();
      if (data.success && data.virtualTime) {
        setVirtualTime(data.virtualTime);
        setIsCustom(!!data.isCustom);
        setInputVal(formatForInput(data.virtualTime));
      }
    } catch (err) {
      console.warn('Failed to fetch virtual time', err);
    }
  };

  useEffect(() => {
    fetchVirtualTime();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const triggerAppRefresh = (updatedBalance?: number) => {
    useAuthStore.getState().fetchActiveSubscriptions().catch(() => {});
    useAuthStore.getState().fetchSubscriptionHistory().catch(() => {});
    useAuthStore.getState().fetchMe().catch(() => {});
    if (updatedBalance !== undefined) {
      useAuthStore.setState((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, balance: updatedBalance } : null
      }));
    }
    window.dispatchEvent(new CustomEvent('virtualTimeChanged'));
  };

  const handleApplyCustomTime = async () => {
    if (!inputVal) return;
    setLoading(true);
    setMessage(null);
    try {
      const isoString = new Date(inputVal).toISOString();
      const response = await fetch('/api/subscriptions/dev/set-virtual-time', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ customTime: isoString })
      });
      const data = await response.json();
      if (data.success) {
        setVirtualTime(data.virtualTime);
        setIsCustom(data.isCustom);
        setMessage({ type: 'success', text: 'Đã áp dụng mốc giờ ảo mới!' });
        triggerAppRefresh(data.updatedBalance);
      } else {
        setMessage({ type: 'error', text: data.message || 'Cập nhật thất bại' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi gửi yêu cầu' });
    } finally {
      setLoading(false);
    }
  };

  const handleFastForward = async (days: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/subscriptions/dev/set-virtual-time', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ days })
      });
      const data = await response.json();
      if (data.success) {
        setVirtualTime(data.virtualTime);
        setIsCustom(data.isCustom);
        setInputVal(formatForInput(data.virtualTime));
        setMessage({ type: 'success', text: `Đã tua nhanh +${days} ngày!` });
        triggerAppRefresh(data.updatedBalance);
      } else {
        setMessage({ type: 'error', text: data.message || 'Tua nhanh thất bại' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi gửi yêu cầu' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRealTime = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/subscriptions/dev/reset-virtual-time', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setVirtualTime(data.virtualTime);
        setIsCustom(false);
        setInputVal(formatForInput(data.virtualTime));
        setMessage({ type: 'success', text: 'Đã khôi phục thời gian thực!' });
        triggerAppRefresh(data.updatedBalance);
      } else {
        setMessage({ type: 'error', text: data.message || 'Khôi phục thất bại' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi gửi yêu cầu' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 select-none">
      {/* Floating Button Icon */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            fetchVirtualTime();
            setIsOpen(true);
          }}
          className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-full shadow-xl text-white font-bold text-xs transition-all transform hover:scale-105 active:scale-95 cursor-pointer border ${
            isCustom
              ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-900 border-slate-700'
          }`}
          title="Trình điều khiển thời gian hệ thống ảo (Global Dev Test Tool)"
        >
          <Clock className="w-4 h-4 animate-spin-slow" />
          <span className="tracking-wide">DEV TIME</span>
          {isCustom && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          )}
        </button>
      )}

      {/* Floating Popup Drawer Panel */}
      {isOpen && (
        <div className="w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-scale-up text-xs font-semibold text-slate-800 text-left">
          {/* Header */}
          <div className={`p-4 flex items-center justify-between text-white ${
            isCustom ? 'bg-gradient-to-r from-amber-600 to-amber-700' : 'bg-gradient-to-r from-slate-800 to-slate-900'
          }`}>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-300" />
              <h3 className="font-bold text-sm">Điều Khiển Thời Gian Hệ Thống</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 space-y-4">
            {/* Virtual Time Status Display */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <span>Giờ Hệ Thống Hiện Tại:</span>
                {isCustom ? (
                  <span className="text-amber-600 font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">🔴 GIỜ ẢO DEV</span>
                ) : (
                  <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">🟢 GIỜ THỰC</span>
                )}
              </div>
              <p className="text-sm font-extrabold text-slate-900 font-mono">
                {formatDisplayDateTime(virtualTime)}
              </p>
            </div>

            {/* Manual Date Time Picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Chọn mốc thời gian mới</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="datetime-local"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomTime}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>

            {/* Fast-forward Preset Buttons */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
                <FastForward className="w-3 h-3 text-slate-500" />
                <span>Tua nhanh thời gian</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleFastForward(1)}
                  disabled={loading}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors text-center border border-slate-200 cursor-pointer"
                >
                  +1 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleFastForward(7)}
                  disabled={loading}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors text-center border border-slate-200 cursor-pointer"
                >
                  +7 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleFastForward(30)}
                  disabled={loading}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors text-center border border-slate-200 cursor-pointer"
                >
                  +30 Ngày
                </button>
              </div>
            </div>

            {/* Reset to Real Time Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetRealTime}
                disabled={loading || !isCustom}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Cài lại giờ thực</span>
              </button>
            </div>

            {/* Toast/Message display */}
            {message && (
              <div className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
