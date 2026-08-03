import { useState, useEffect } from 'react';
import { usePackageStore } from '../store';
import { Search, SlidersHorizontal } from 'lucide-react';
import { packageApi } from '../services/api';

export default function AdvancedFilter() {
  const { filters, sort, setFilter, setSort } = usePackageStore();

  // Local state for debounced search box (independent from Navbar Header search)
  const [localSearch, setLocalSearch] = useState(filters.keyword || '');

  // Local state for dynamically loaded filter options from database
  const [filterOptions, setFilterOptions] = useState<any>(null);

  // Sync local search when store keyword gets reset or updated
  useEffect(() => {
    setLocalSearch(filters.keyword || '');
  }, [filters.keyword]);

  // Load dynamic filter options on component mount
  useEffect(() => {
    packageApi.fetchFilterOptions()
      .then((data) => {
        setFilterOptions(data);
      })
      .catch((err) => {
        console.error("Error fetching dynamic filter options:", err);
      });
  }, []);

  // Debounced search trigger (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.keyword) {
        setFilter('keyword', localSearch);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, filters.keyword, setFilter]);

  const handleSelectChange = (key: any, value: string) => {
    setFilter(key, value);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
  };


  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 text-xs font-semibold text-left">
      {/* Title */}
      <div className="flex items-center space-x-2 text-slate-800 pb-3 border-b border-slate-100">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
          Bộ lọc tìm kiếm gói cước
        </h2>
      </div>

      {/* Row 1: Search, Category, Price, Cycle (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Debounced local search input */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-search" className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Từ khóa tìm kiếm
          </label>
          <div className="relative flex items-center">
            <input
              id="card-filter-search"
              type="text"
              placeholder="Tên gói, mã gói, tags..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary/45 focus:ring-4 focus:ring-red-50/20 transition-all font-semibold"
            />
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-category" className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Loại gói cước
          </label>
          <select
            id="card-filter-category"
            value={filters.category}
            onChange={(e) => handleSelectChange('category', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Tất cả thể loại</option>
            <option value="data">Data</option>
            <option value="combo">Combo</option>
            <option value="mxh">Mạng xã hội</option>
          </select>
        </div>

        {/* Price filter */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-price" className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Phân khúc giá cước
          </label>
          <select
            id="card-filter-price"
            value={filters.price}
            onChange={(e) => handleSelectChange('price', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Mọi mức giá</option>
            <option value="Gia_re">Giá rẻ (Dưới 50.000đ)</option>
            <option value="Trung_binh">Trung bình (50.000đ - 150.000đ)</option>
            <option value="Cao_cap">Cao cấp (Trên 150.000đ)</option>
          </select>
        </div>

        {/* Cycle filter */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-cycle" className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Chu kỳ sử dụng
          </label>
          <select
            id="card-filter-cycle"
            value={filters.cycle}
            onChange={(e) => handleSelectChange('cycle', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Mọi chu kỳ</option>
            {filterOptions?.durations?.map((dur: any) => (
              <option key={dur.key} value={dur.key}>
                {dur.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: network, data, call, sms, promo app, target, sort (Grid layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
        {/* Data benefit */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-data" className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
            Ưu đãi Data
          </label>
          <select
            id="card-filter-data"
            value={filters.data}
            onChange={(e) => handleSelectChange('data', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Không giới hạn</option>
            <option value="yes">Có dung lượng Data</option>
            <option value="no">Không có Data</option>
          </select>
        </div>

        {/* Call benefit */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-call" className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
            Đàm thoại miễn phí
          </label>
          <select
            id="card-filter-call"
            value={filters.call}
            onChange={(e) => handleSelectChange('call', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Không giới hạn</option>
            <option value="yes">Có miễn phí gọi thoại</option>
            <option value="no">Không miễn phí thoại</option>
          </select>
        </div>

        {/* SMS benefit */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-sms" className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
            Ưu đãi SMS
          </label>
          <select
            id="card-filter-sms"
            value={filters.sms}
            onChange={(e) => handleSelectChange('sms', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Không giới hạn</option>
            <option value="yes">Có Free SMS</option>
            <option value="no">Không có SMS</option>
          </select>
        </div>

        {/* Promo App */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-promo" className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
            Khuyến mãi App
          </label>
          <select
            id="card-filter-promo"
            value={filters.promo}
            onChange={(e) => handleSelectChange('promo', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer"
          >
            <option value="all">Tất cả tiện ích free</option>
            {filterOptions?.appPromos?.map((app: string) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>
        </div>
        {/* Sort Select */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="card-filter-sort" className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
            Sắp xếp theo
          </label>
          <select
            id="card-filter-sort"
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 px-3.5 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-50/20 transition-all cursor-pointer font-bold"
          >
            <option value="popular">Đăng ký nhiều nhất</option>
            <option value="newest">Mới cập nhật</option>
            <option value="price_asc">Giá cước: Thấp - Cao</option>
            <option value="price_desc">Giá cước: Cao - Thấp</option>
            <option value="name">Tên gói cước: A - Z</option>
          </select>
        </div>
      </div>
    </div>
  );
}
