import { Link, useLocation } from 'react-router-dom';
import { X, ArrowRightLeft, Trash2 } from 'lucide-react';
import { usePackageStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompareDrawer() {
  const { compareList, removeFromCompare, clearCompare } = usePackageStore();
  const location = useLocation();

  if (location.pathname === '/compare') return null;
  if (compareList.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200/60 shadow-2xl py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 select-none text-xs font-semibold"
      >
        {/* Left Side: Summary text */}
        <div className="flex items-center space-x-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center border border-red-100/60 text-primary">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-slate-900 font-bold">So sánh gói cước</h4>
            <p className="text-[10px] text-slate-400 font-bold">
              Đang chọn <span className="text-primary">{compareList.length}</span> / 3 gói cước
            </p>
          </div>
        </div>

        {/* Center: List of Capsule Cards */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {compareList.map((pkg) => {
            const keyVal = pkg.ma_goi || pkg.id || '';
            return (
              <motion.div
                layout
                key={keyVal}
                className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-full pl-3.5 pr-2.5 py-1 text-slate-700 font-bold transition-all hover:bg-slate-100"
              >
                <span>{pkg.ten}</span>
                <span className="text-slate-400 font-medium">({new Intl.NumberFormat('vi-VN').format(pkg.gia)}đ)</span>
                <button
                  onClick={() => removeFromCompare(keyVal)}
                  className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                  title="Xóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={clearCompare}
            className="inline-flex items-center space-x-1 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-550 rounded-xl transition-colors font-bold focus:outline-none cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa hết</span>
          </button>

          <Link
            to="/compare"
            className="inline-flex items-center space-x-1 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors font-bold focus:outline-none cursor-pointer shadow-sm"
          >
            <span>So sánh ngay</span>
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
