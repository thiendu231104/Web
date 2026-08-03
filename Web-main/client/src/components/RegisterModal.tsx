import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CreditCard } from 'lucide-react';
import type { Package } from '../types';
import { useAuthStore } from '../store';

interface RegisterModalProps {
  isOpen: boolean;
  pkg: Package | null;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

/**
 * Chuyển reasonCode + conflictingPackage → thông báo văn bản thân thiện.
 * Chỉ trả về string, không có button hay action nào.
 */
function resolveConflictText(
  action: string,
  reasonCode: string | undefined,
  rawMessage: string,
  conflictingPkg?: { ma_goi?: string; ten?: string; chu_ky_ngay?: string | number }
): string {
  const pkgLabel = conflictingPkg
    ? [conflictingPkg.ma_goi || conflictingPkg.ten, conflictingPkg.chu_ky_ngay ? `${conflictingPkg.chu_ky_ngay} ngày` : '']
        .filter(Boolean).join(' ')
    : '';

  switch (reasonCode) {
    case 'DUPLICATE_LONG_TERM':
      return 'Bạn đã đăng ký gói này. Gói tháng, gói quý và gói năm không hỗ trợ đăng ký nhiều lần cùng lúc.';

    case 'LONG_TERM_CONFLICT':
      return pkgLabel
        ? `Bạn đang sử dụng gói ${pkgLabel}. Theo quy định, mỗi thuê bao chỉ được sử dụng một gói dài hạn tại một thời điểm. Vui lòng hủy gói hiện tại hoặc chờ hết hạn.`
        : 'Thuê bao của bạn đang có một gói dài hạn khác đang hoạt động. Theo quy định, mỗi thuê bao chỉ được sử dụng một gói dài hạn tại một thời điểm. Vui lòng hủy gói hiện tại hoặc chờ hết hạn.';

    case 'BASE_PACKAGE_REQUIRED':
      return 'Gói này yêu cầu thuê bao đang sử dụng một gói Data hoặc Combo phù hợp. Vui lòng đăng ký gói Data trước.';

    case 'REPLACE_REQUIRED':
      return pkgLabel
        ? `Bạn đang sử dụng gói ${pkgLabel}. Vui lòng hủy gói hiện tại trước khi đăng ký gói mới.`
        : 'Vui lòng hủy gói hiện tại trước khi đăng ký gói mới.';

    case 'SAME_SYSTEM_CONFLICT':
      return 'Bạn đang sử dụng một gói có ưu đãi tương tự. Vui lòng hủy gói hiện tại hoặc chờ hết hạn trước khi đăng ký gói mới.';

    default:
      // Fallback: dùng message từ backend nếu có, hoặc text mặc định theo action
      if (rawMessage && rawMessage.length > 0) return rawMessage;
      if (action === 'REJECT') return 'Không thể đăng ký đồng thời với các gói đang sử dụng. Vui lòng hủy gói hiện tại trước khi đăng ký gói này.';
      return rawMessage;
  }
}

export default function RegisterModal({
  isOpen,
  pkg,
  onClose,
  onSuccess,
  onError
}: RegisterModalProps) {
  const { currentUser, registerSubscription, checkSubscription } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [frozenBalance, setFrozenBalance] = useState<number | null>(null);
  const [registerTab, setRegisterTab] = useState<'online' | 'sms'>('online');
  const [checkResult, setCheckResult] = useState<{
    action: 'ALLOW' | 'REPLACE' | 'REJECT' | 'RENEW_SHORT';
    message: string;
    reasonCode?: string;
    conflictingPackage?: {
      ma_goi?: string;
      ten?: string;
      chu_ky_ngay?: string | number;
    };
    replaceSubscriptions?: any[];
    conflictSubscriptions?: any[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (frozenBalance === null && currentUser) {
        setFrozenBalance(currentUser.balance);
      }
    } else {
      setFrozenBalance(null);
    }
  }, [isOpen, currentUser, frozenBalance]);

  const currentDisplayBalance = frozenBalance !== null ? frozenBalance : (currentUser?.balance || 0);

  // ESC keypress handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting && !checkLoading) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting, checkLoading]);

  // Scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset checking states on close or package change
  useEffect(() => {
    if (!isOpen) {
      setCheckResult(null);
      setIsSubmitting(false);
      setCheckLoading(false);
      setLocalError(null);
    }
  }, [isOpen]);

  if (!isOpen || !pkg || !currentUser) return null;

  const handleConfirm = async () => {
    if (!currentUser) {
      if (onError) onError('Vui lòng đăng nhập trước khi đăng ký gói cước.');
      onClose();
      return;
    }

    if (currentDisplayBalance < pkg.gia) {
      setLocalError('Số dư tài khoản không đủ để đăng ký gói cước này.');
      if (onError) onError('Số dư tài khoản không đủ để đăng ký gói cước này.');
      return;
    }

    let cycle: 'DAY' | 'MONTH' | 'YEAR' = 'MONTH';
    const dayCycle = typeof pkg.chu_ky_ngay === 'number' ? pkg.chu_ky_ngay : parseInt(String(pkg.chu_ky_ngay || '30'), 10);
    if (dayCycle === 1) {
      cycle = 'DAY';
    } else if (dayCycle >= 360) {
      cycle = 'YEAR';
    }

    setLocalError(null);

    const pkgId = pkg.package_id !== undefined && pkg.package_id !== null ? pkg.package_id : (pkg.numericId || Number(pkg.id) || 0);

    const executeRegistration = async () => {
      setIsSubmitting(true);
      try {
        const regRes = await registerSubscription(pkgId, cycle);
        if (regRes.success) {
          const msg = regRes.message || 'Đăng ký gói cước thành công!';
          if (onSuccess) onSuccess(msg);
          onClose();
        } else {
          setLocalError(regRes.message);
          if (onError) onError(regRes.message);
        }
      } catch (err: any) {
        const errMsg = err.message || 'Lỗi đăng ký gói cước.';
        setLocalError(errMsg);
        if (onError) onError(errMsg);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!checkResult) {
      // Step 1: Run check API
      setCheckLoading(true);
      try {
        const res = await checkSubscription(pkgId, cycle);
        if (res.hasActive === false) {
          setCheckLoading(false);
          await executeRegistration();
        } else {
          setCheckResult(res);
          setCheckLoading(false);
        }
      } catch (err: any) {
        const errMsg = err.message || 'Lỗi kiểm tra xung đột gói cước.';
        setLocalError(errMsg);
        if (onError) onError(errMsg);
        setCheckLoading(false);
      }
    } else {
      // Step 2: User confirmed check warnings, call register API
      if (checkResult.action === 'ALLOW' || checkResult.action === 'REPLACE' || checkResult.action === 'RENEW_SHORT') {
        await executeRegistration();
      }
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={isSubmitting || checkLoading ? undefined : onClose}
          className="absolute inset-0 bg-black/45 backdrop-blur-sm pointer-events-auto"
        />

        {/* Modal Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-slate-250 shadow-2xl rounded-2xl p-6 max-w-md w-full relative z-[1000] text-xs font-semibold text-slate-800 text-left pointer-events-auto space-y-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-register-title"
        >
          <h4 id="confirm-register-title" className="text-base font-extrabold text-slate-900 border-b border-slate-50 pb-2">
            Xác nhận đăng ký
          </h4>

          {/* Tab Selector */}
          {pkg && (
            <div className="flex border-b border-slate-100 pb-1 gap-2">
              <button
                type="button"
                onClick={() => setRegisterTab('online')}
                className={`flex-1 pb-2 text-center text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                  registerTab === 'online'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-450 hover:text-slate-700'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Đăng ký Online</span>
              </button>
              <button
                type="button"
                onClick={() => setRegisterTab('sms')}
                className={`flex-1 pb-2 text-center text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                  registerTab === 'sms'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-450 hover:text-slate-700'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Quét mã QR SMS</span>
              </button>
            </div>
          )}

          {/* Nhóm 1 – Thông tin gói cước */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin gói cước</h5>
            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Tên gói cước:</span>
                <span className="font-extrabold text-slate-900">{pkg.ten} ({pkg.ma_goi})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Giá gói:</span>
                <span className="font-extrabold text-slate-900">{pkg.gia.toLocaleString()} VNĐ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Chu kỳ sử dụng:</span>
                <span className="font-extrabold text-slate-900">
                  {typeof pkg.chu_ky_ngay === 'number' ? `${pkg.chu_ky_ngay} ngày` : String(pkg.chu_ky_ngay).includes('ngày') ? pkg.chu_ky_ngay : `${pkg.chu_ky_ngay} ngày`}
                </span>
              </div>
            </div>
          </div>

          {registerTab === 'online' ? (
            <>
              {/* Nhóm 2 – Thanh toán */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thanh toán</h5>
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Phương thức:</span>
                    <span className="font-bold text-slate-900">Số dư tài khoản</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Số dư hiện tại:</span>
                    <span className="font-bold text-slate-900">{currentDisplayBalance.toLocaleString()} VNĐ</span>
                  </div>
                  {currentDisplayBalance >= pkg.gia ? (
                    <div className="flex justify-between border-t border-slate-100/50 pt-1.5 mt-1.5">
                      <span className="text-slate-500 font-semibold">Số dư dự kiến:</span>
                      <span className="font-bold text-emerald-600">{(currentDisplayBalance - pkg.gia).toLocaleString()} VNĐ</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-red-650 bg-red-50/60 border border-red-100 rounded-lg p-2 leading-relaxed font-semibold">
                      Số dư hiện tại có thể không đủ để đăng ký gói cước này. Hệ thống sẽ kiểm tra lại khi bạn xác nhận.
                    </div>
                  )}
                </div>
              </div>

              {/* Nhóm 3 - Cảnh báo Xung đột Gói cước */}
              {checkResult && (
                <div className={`p-4 rounded-xl border text-[11px] leading-relaxed font-semibold ${
                  checkResult.action === 'REJECT'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : checkResult.action === 'REPLACE'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-250 text-emerald-800'
                }`}>
                  <p className="font-extrabold text-xs mb-1.5">
                    {checkResult.action === 'REJECT'
                      ? '⚠️ Không thể đăng ký'
                      : checkResult.action === 'REPLACE'
                        ? '⚠️ Cảnh báo thay thế gói'
                        : '✅ Đăng ký song song'}
                  </p>

                  {checkResult.action === 'ALLOW' && (
                    <p>
                      Gói cước này có thể sử dụng song song với các gói hiện tại.
                      <br />
                      Bạn có muốn tiếp tục đăng ký không?
                    </p>
                  )}

                  {checkResult.action === 'RENEW_SHORT' && (
                    <p>
                      Gói cước sẽ được gia hạn ngay lập tức. Thời gian và ưu đãi sẽ được tính lại từ đầu.
                      <br />
                      Bạn có muốn tiếp tục không?
                    </p>
                  )}

                  {checkResult.action === 'REPLACE' && (
                    <div>
                      <p className="mb-2">Gói cước này sẽ thay thế các gói đang sử dụng.</p>
                      <p className="font-extrabold mb-1">Khi tiếp tục:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Các gói hiện tại sẽ bị hủy ngay lập tức.</li>
                        <li>Quyền lợi còn lại sẽ kết thúc.</li>
                        <li>Gói mới sẽ được kích hoạt.</li>
                      </ul>
                      <p className="mt-2 font-bold">Bạn có muốn tiếp tục không?</p>
                    </div>
                  )}

                  {checkResult.action === 'REJECT' && (
                    <p>
                      {resolveConflictText(
                        checkResult.action,
                        checkResult.reasonCode,
                        checkResult.message,
                        checkResult.conflictingPackage ||
                          checkResult.conflictSubscriptions?.[0] ||
                          checkResult.replaceSubscriptions?.[0]
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Nhóm 4 – Lưu ý */}
              {!checkResult && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lưu ý</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Sau khi xác nhận đăng ký, hệ thống sẽ tiến hành kiểm tra xung đột gói cước và trừ số dư trong tài khoản để kích hoạt gói mới.
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {localError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-650 text-[10px] leading-relaxed font-semibold">
                  ⚠️ {localError}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  disabled={isSubmitting || checkLoading}
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-605 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none cursor-pointer disabled:opacity-50"
                  type="button"
                >
                  {checkResult?.action === 'REJECT' ? 'Đóng' : 'Hủy'}
                </button>
                {(!checkResult || checkResult.action !== 'REJECT') && (
                  <button
                    disabled={isSubmitting || checkLoading}
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 focus:outline-none cursor-pointer disabled:opacity-50 shadow-sm"
                    type="button"
                  >
                    {(checkLoading || isSubmitting) && (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span>
                      {checkLoading ? 'Đang kiểm tra...' : isSubmitting ? 'Đang xử lý...' : checkResult ? 'Xác nhận' : 'Xác nhận đăng ký'}
                    </span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Nhóm 2 – Đăng ký qua SMS QR Code */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đăng ký nhanh qua SMS QR Code</h5>
                
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl gap-4">
                  {/* QR Code Container */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-1.5 transition-all hover:shadow-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`sms:191?body=${pkg.ma_goi}`)}`}
                      alt={`Mã QR Đăng ký gói ${pkg.ma_goi}`}
                      className="w-28 h-28 object-contain select-none"
                      loading="lazy"
                    />
                    <div className="text-[9px] font-black text-slate-500 tracking-wider">SMS: {pkg.ma_goi} &rarr; 191</div>
                  </div>

                  {/* Instruction text */}
                  <div className="text-center space-y-1.5 max-w-[280px]">
                    <p className="text-[11px] text-slate-600 leading-normal font-semibold">
                      Quét mã QR trên bằng camera điện thoại hoặc Zalo. Điện thoại của bạn sẽ tự động soạn tin nhắn gửi tới **191** với nội dung cú pháp **{pkg.ma_goi}** điền sẵn.
                    </p>
                    <div className="text-[10px] text-slate-450 mt-1">
                      Cú pháp thủ công: Soạn <span className="font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">{pkg.ma_goi}</span> gửi <span className="font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">191</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions for SMS */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-605 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none cursor-pointer"
                  type="button"
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
