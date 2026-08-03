import { usePackageStore } from '../store';
import { RotateCcw } from 'lucide-react';

export default function PackageToolbar() {
  const totalItems = usePackageStore((state) => state.totalItems);
  const pagination = usePackageStore((state) => state.pagination);
  const fetchPackages = usePackageStore((state) => state.fetchPackages);
  const reset = usePackageStore((state) => state.reset);

  const handleReset = () => {
    reset();
    fetchPackages();
  };

  const startIdx = Math.min(totalItems, (pagination.page - 1) * pagination.limit + 1);
  const endIdx = Math.min(totalItems, pagination.page * pagination.limit);

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs font-semibold text-left">
      {/* Metrics */}
      <div className="text-slate-500 font-medium">
        {totalItems > 0 ? (
          <span>
            Hiển thị <strong className="text-slate-900 font-extrabold">{startIdx}-{endIdx}</strong> trong{' '}
            <strong className="text-primary font-black">{totalItems}</strong> gói cước di động
          </span>
        ) : (
          <span>Không tìm thấy kết quả phù hợp</span>
        )}
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-350 transition-all font-bold cursor-pointer focus:outline-none"
        type="button"
        title="Đặt lại tất cả bộ lọc"
      >
        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
        <span>Đặt lại bộ lọc</span>
      </button>
    </div>
  );
}
