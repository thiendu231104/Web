import { HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  onReset: () => void;
}

export default function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center flex flex-col items-center max-w-md mx-auto space-y-5 animate-scale-up text-xs font-semibold text-left">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-primary border border-red-100/50">
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>
      <div className="space-y-1.5 text-center">
        <h3 className="text-sm font-extrabold text-slate-900">Không tìm thấy gói cước</h3>
        <p className="text-slate-500 font-semibold leading-relaxed text-[11px] max-w-sm">
          Rất tiếc! Không có gói cước Viettel nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại của bạn.
        </p>
      </div>
      <button
        onClick={onReset}
        className="bg-primary hover:bg-primary-hover text-white font-extrabold px-5 py-3 rounded-xl transition-colors focus:outline-none cursor-pointer shadow-sm hover:shadow"
        type="button"
      >
        Đặt lại bộ lọc
      </button>
    </div>
  );
}
