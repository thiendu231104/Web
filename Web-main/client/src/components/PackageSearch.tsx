import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { usePackageStore } from '../store';

export default function PackageSearch() {
  const storeSearch = usePackageStore((state) => state.search);
  const setSearch = usePackageStore((state) => state.setSearch);
  const fetchPackages = usePackageStore((state) => state.fetchPackages);
  
  const [localSearch, setLocalSearch] = useState(storeSearch);

  // Sync state if store gets reset externally
  useEffect(() => {
    setLocalSearch(storeSearch);
  }, [storeSearch]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== storeSearch) {
        setSearch(localSearch);
        fetchPackages();
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, storeSearch, setSearch, fetchPackages]);

  const handleClear = () => {
    setLocalSearch('');
    setSearch('');
    fetchPackages();
  };

  return (
    <div className="flex flex-col space-y-2 w-full">
      <label htmlFor="package-search-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Tìm kiếm gói cước
      </label>
      <div className="relative flex items-center">
        <input
          id="package-search-input"
          type="text"
          placeholder="Tên gói, mã gói, tags..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-10 text-slate-700 placeholder-slate-450 focus:outline-none focus:border-primary/40 focus:bg-white transition-all text-xs font-semibold focus:ring-4 focus:ring-red-50"
          aria-label="Tìm kiếm gói cước"
        />
        <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
        {localSearch && (
          <button
            onClick={handleClear}
            className="absolute right-3.5 p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
            title="Xóa tìm kiếm"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
