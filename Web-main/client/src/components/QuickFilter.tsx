import { usePackageStore } from '../store';
import { Layers, Wifi, PhoneCall, Heart, Sparkles } from 'lucide-react';

export default function QuickFilter() {
  const selectedCategory = usePackageStore((state) => state.filters.category);
  const setFilter = usePackageStore((state) => state.setFilter);
  const fetchPackages = usePackageStore((state) => state.fetchPackages);

  const categories = [
    { key: 'all', label: 'Tất cả', icon: Layers },
    { key: 'data', label: 'Chỉ DATA', icon: Wifi },
    { key: 'combo', label: 'Combo Thoại + Data', icon: Sparkles },
    { key: 'social', label: 'Mạng xã hội', icon: Heart },
    { key: 'voice', label: 'Ưu đãi thoại', icon: PhoneCall },
  ];

  const handleSelect = (key: string) => {
    setFilter('category', key);
    fetchPackages();
  };

  return (
    <div className="flex flex-col space-y-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
        Phân loại nhanh
      </span>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleSelect(cat.key)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100 ${
                isActive
                  ? 'bg-primary border-primary text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-350 hover:bg-slate-50'
              }`}
              type="button"
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
