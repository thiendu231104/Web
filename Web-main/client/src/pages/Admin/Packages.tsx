import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Wifi, Plus, Edit2, Trash2, X, AlertCircle, Sparkles } from 'lucide-react';
import { usePackageStore } from '../../store';
import type { Package } from '../../types';

// Zod Validation Schema for CRUD Packages in Vietnamese
const packageFormSchema = z.object({
  ma_goi: z.string().min(2, { message: 'Mã gói phải chứa từ 2 ký tự' }),
  ten: z.string().min(2, { message: 'Tên gói phải chứa từ 2 ký tự' }),
  gia: z.number().min(0, { message: 'Giá cước không được là số âm' }),
  phan_loai_goi: z.enum(['Data', 'Combo', 'Social', 'Thoại']),
  data_theo_ngay: z.string().min(1, { message: 'Giới hạn dung lượng không được để trống' }),
  free_noi_mang: z.string(),
  free_ngoai_mang: z.string(),
  sms: z.string(),
  tienich: z.string(),
  dieu_kien_dang_ky: z.string().min(2, { message: 'Điều kiện đăng ký không được để trống' }),
  chinh_sach_ap_dung: z.string().min(5, { message: 'Chính sách áp dụng không được để trống' }),
  noi_dung_ngoai: z.string(),
  tien_ich_free: z.string(),
  data_meta: z.string().optional(),
  uudaitrong: z.string().min(5, { message: 'Mô tả chi tiết tối thiểu 5 ký tự' }),
  chu_ky_ngay: z.string().min(1, { message: 'Chu kỳ không được để trống' }),
  dangky: z.string(),
  huygiahan: z.string(),
  huygoicuoc: z.string(),
  dohot: z.enum(['Hot', 'normal']),
  system_type: z.string().min(1, { message: 'Loại hệ thống không được để trống' }),
  benefit_group: z.string().min(1, { message: 'Nhóm ưu đãi không được để trống' }),
  is_addon: z.boolean(),
  is_long_term: z.boolean(),
  requires_base_package: z.boolean(),
  allow_parallel_with_str: z.string()
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

function LoadingSkeleton() {
  return (
    <tbody className="divide-y divide-slate-100 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <tr key={n}>
          <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
          <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
          <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
          <td className="p-4"><div className="h-4 bg-slate-200 rounded w-12" /></td>
          <td className="p-4"><div className="h-4 bg-slate-200 rounded w-28" /></td>
          <td className="p-4 flex items-center justify-center space-x-2"><div className="h-7 bg-slate-200 rounded w-16" /></td>
        </tr>
      ))}
    </tbody>
  );
}

export default function AdminPackages() {
  const { packages, addPackage, updatePackage, deletePackage, fetchPackages, totalPages, totalItems, loading } = usePackageStore();
  
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [deleteConfirmPkg, setDeleteConfirmPkg] = useState<Package | null>(null);

  // Tab State inside Modal Form
  const [activeTab, setActiveTab] = useState<'general' | 'system' | 'policy'>('general');

  // Filter & Pagination states
  const [searchVal, setSearchVal] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'Data' | 'Combo' | 'Social' | 'Thoại'>('all');
  const [filterNetwork, setFilterNetwork] = useState<'all' | '4G' | '5G'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search debounce handler
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchVal);
      setCurrentPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Fetch package list on filter/page change
  useEffect(() => {
    fetchPackages({
      page: currentPage,
      limit: itemsPerPage,
      search: searchKeyword,
      category: filterCategory !== 'all' ? filterCategory : undefined,
      network: filterNetwork !== 'all' ? filterNetwork : undefined,
      sort: 'price_asc'
    });
  }, [currentPage, searchKeyword, filterCategory, filterNetwork, fetchPackages]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      ma_goi: '',
      ten: '',
      gia: 90000,
      phan_loai_goi: 'Data',
      data_theo_ngay: '30 GB (1 GB/ngày)',
      free_noi_mang: '0',
      free_ngoai_mang: '0',
      sms: '0',
      tienich: '0',
      dieu_kien_dang_ky: 'Dành cho tất cả thuê bao di động Viettel.',
      chinh_sach_ap_dung: 'Tự động gia hạn.',
      noi_dung_ngoai: '0',
      tien_ich_free: '0',
      uudaitrong: '',
      chu_ky_ngay: '30',
      dangky: '',
      huygiahan: '',
      huygoicuoc: '',
      dohot: 'normal',
      system_type: 'DATA_BASE',
      benefit_group: 'GENERAL_DATA',
      is_addon: false,
      is_long_term: false,
      requires_base_package: false,
      allow_parallel_with_str: ''
    }
  });

  const openAddModal = () => {
    setActiveTab('general');
    setEditingPkg(null);
    reset({
      ma_goi: '',
      ten: '',
      gia: 90000,
      phan_loai_goi: 'Data',
      data_theo_ngay: '30 GB (1 GB/ngày)',
      free_noi_mang: '0',
      free_ngoai_mang: '0',
      sms: '0',
      tienich: '0',
      dieu_kien_dang_ky: 'Dành cho tất cả thuê bao di động Viettel.',
      chinh_sach_ap_dung: 'Tự động gia hạn.',
      noi_dung_ngoai: '0',
      tien_ich_free: '0',
      uudaitrong: '',
      chu_ky_ngay: '30',
      dangky: '',
      huygiahan: '',
      huygoicuoc: '',
      dohot: 'normal',
      system_type: 'DATA_BASE',
      benefit_group: 'GENERAL_DATA',
      is_addon: false,
      is_long_term: false,
      requires_base_package: false,
      allow_parallel_with_str: ''
    });
    setShowModal(true);
  };

  const openEditModal = (pkg: Package) => {
    setActiveTab('general');
    setEditingPkg(pkg);
    reset({
      ma_goi: pkg.ma_goi || '',
      ten: pkg.ten,
      gia: pkg.gia,
      phan_loai_goi: (pkg.phan_loai_goi === 'Thoại' ? 'Thoại' : pkg.phan_loai_goi) as any,
      data_theo_ngay: pkg.data_theo_ngay,
      free_noi_mang: String(pkg.free_noi_mang ?? '0'),
      free_ngoai_mang: String(pkg.free_ngoai_mang ?? '0'),
      sms: String(pkg.sms ?? '0'),
      tienich: pkg.tienich || '0',
      dieu_kien_dang_ky: pkg.dieu_kien_dang_ky || pkg.doi_tuong_ap_dung || '',
      chinh_sach_ap_dung: pkg.chinh_sach_ap_dung || 'Tự động gia hạn.',
      data_meta: pkg.data_meta || '',
      noi_dung_ngoai: pkg.noi_dung_ngoai || '0',
      tien_ich_free: pkg.tien_ich_free || '0',
      uudaitrong: pkg.uudaitrong,
      chu_ky_ngay: String(pkg.chu_ky_ngay),
      dangky: pkg.dangky || '',
      huygiahan: pkg.huygiahan || '',
      huygoicuoc: pkg.huygoicuoc || '',
      dohot: (pkg.dohot === 'Hot' ? 'Hot' : 'normal') as any,
      system_type: pkg.system_type || 'DATA_BASE',
      benefit_group: pkg.benefit_group || 'GENERAL_DATA',
      is_addon: pkg.is_addon || false,
      is_long_term: pkg.is_long_term || false,
      requires_base_package: pkg.requires_base_package || false,
      allow_parallel_with_str: pkg.allow_parallel_with ? pkg.allow_parallel_with.join(', ') : ''
    });
    setShowModal(true);
  };

  const handleFormSubmit = (data: PackageFormValues) => {
    const formattedData: any = {
      ...data,
      allow_parallel_with: data.allow_parallel_with_str
        ? data.allow_parallel_with_str.split(',').map(s => s.trim()).filter(Boolean)
        : []
    };
    delete formattedData.allow_parallel_with_str;

    const runAsync = async () => {
      if (editingPkg) {
        const pkgKey = editingPkg.id || editingPkg._id || String(editingPkg.package_id);
        const success = await updatePackage(pkgKey, formattedData);
        if (success) {
          showToast('success', `Đã cập nhật thành công gói cước ${data.ten}!`);
          fetchPackages({
            page: currentPage,
            limit: itemsPerPage,
            search: searchKeyword,
            category: filterCategory !== 'all' ? filterCategory : undefined,
            network: filterNetwork !== 'all' ? filterNetwork : undefined,
            sort: 'price_asc'
          });
        } else {
          showToast('error', `Lỗi khi cập nhật gói cước ${data.ten}.`);
        }
      } else {
        const success = await addPackage(formattedData);
        if (success) {
          showToast('success', `Đã tạo thành công gói cước mới ${data.ten}!`);
          setCurrentPage(1);
          fetchPackages({
            page: 1,
            limit: itemsPerPage,
            search: searchKeyword,
            category: filterCategory !== 'all' ? filterCategory : undefined,
            network: filterNetwork !== 'all' ? filterNetwork : undefined,
            sort: 'price_asc'
          });
        } else {
          showToast('error', `Lỗi khi tạo gói cước mới ${data.ten}.`);
        }
      }
      setShowModal(false);
    };

    runAsync();
  };

  const handleDeleteClick = (pkg: Package) => {
    setDeleteConfirmPkg(pkg);
  };

  const confirmDelete = async () => {
    if (deleteConfirmPkg) {
      const pkgKey = deleteConfirmPkg.id || deleteConfirmPkg._id || String(deleteConfirmPkg.package_id);
      const success = await deletePackage(pkgKey);
      if (success) {
        showToast('success', `Đã xóa gói cước ${deleteConfirmPkg.ten} ra khỏi danh mục.`);
        const isLastItemOnPage = packages.length === 1 && currentPage > 1;
        const nextPage = isLastItemOnPage ? currentPage - 1 : currentPage;
        setCurrentPage(nextPage);
        fetchPackages({
          page: nextPage,
          limit: itemsPerPage,
          search: searchKeyword,
          category: filterCategory !== 'all' ? filterCategory : undefined,
          network: filterNetwork !== 'all' ? filterNetwork : undefined,
          sort: 'price_asc'
        });
      } else {
        showToast('error', `Lỗi khi xóa gói cước ${deleteConfirmPkg.ten}.`);
      }
      setDeleteConfirmPkg(null);
    }
  };

  const cleanSearchTerm = searchKeyword.toLowerCase().trim();
  const displayPackages = cleanSearchTerm
    ? packages.filter(pkg => pkg.ma_goi?.toLowerCase().includes(cleanSearchTerm) || pkg.ten?.toLowerCase().includes(cleanSearchTerm))
    : packages;

  return (
    <div className="space-y-6 relative animate-fade-in text-xs font-semibold">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border-l-4 text-xs font-semibold animate-scale-up bg-white text-slate-800 ${
          toastMsg.type === 'success' ? 'border-emerald-500' : 'border-red-500'
        }`}>
          {toastMsg.text}
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Wifi className="w-6 h-6 text-primary mr-2" />
            Danh sách quản lý gói cước
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Thực hiện CRUD gói cước di động Viettel kết nối API thật có tích hợp Conflict Engine.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-1 bg-primary hover:bg-primary-hover text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors focus:outline-none cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo gói mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-slate-200 shadow-sm p-4 rounded-xl">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Tìm theo Mã gói / Tên gói..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2.5 px-3 text-slate-700 focus:outline-none transition-colors"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Select */}
        <div>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2.5 px-3 text-slate-700 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="all">Tất cả Thể loại</option>
            <option value="Data">Chỉ DATA</option>
            <option value="Combo">Combo Thoại + Data</option>
            <option value="Social">Mạng xã hội</option>
            <option value="Thoại">Chỉ thoại</option>
          </select>
        </div>

        {/* Network Select */}
        <div>
          <select
            value={filterNetwork}
            onChange={(e) => {
              setFilterNetwork(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2.5 px-3 text-slate-700 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="all">Tất cả Mạng</option>
            <option value="4G">Công nghệ 4G</option>
            <option value="5G">Công nghệ 5G</option>
          </select>
        </div>
      </div>

      {/* Database Catalog Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative min-h-[220px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200 text-slate-600 font-bold">
                <th className="p-4">Mã / Tên gói</th>
                <th className="p-4">Thể loại</th>
                <th className="p-4">Giá cước</th>
                <th className="p-4">Chu kỳ</th>
                <th className="p-4">Data ưu đãi</th>
                <th className="p-4 text-center">Hành động</th>
              </tr>
            </thead>
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono text-slate-700 uppercase font-black">
                          {pkg.ma_goi || (pkg.id ? pkg.id.toUpperCase() : String(pkg.package_id || pkg._id || ''))}
                        </span>
                        <span>{pkg.ten}</span>
                        {pkg.dohot !== 'normal' && (
                          <span className="text-primary" title="Phổ biến">
                            <Sparkles className="w-3.5 h-3.5 fill-primary" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 uppercase font-bold text-[10px]">
                      {pkg.phan_loai_goi === 'Data' ? (
                        <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">DATA</span>
                      ) : pkg.phan_loai_goi === 'Combo' ? (
                        <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">COMBO</span>
                      ) : pkg.phan_loai_goi === 'Thoại' ? (
                        <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">THOẠI</span>
                      ) : (
                        <span className="text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">SOCIAL</span>
                      )}
                    </td>
                    <td className="p-4 font-black text-slate-900">
                      {new Intl.NumberFormat('vi-VN').format(pkg.gia)}đ
                    </td>
                    <td className="p-4 text-slate-500 font-semibold">{pkg.chu_ky_ngay} ngày</td>
                    <td className="p-4 text-slate-800 font-semibold">{pkg.data_theo_ngay}</td>
                    <td className="p-4 flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openEditModal(pkg)}
                        className="p-2 hover:bg-slate-50 rounded-lg text-blue-600 hover:text-blue-800 transition-colors focus:outline-none cursor-pointer"
                        title="Sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(pkg)}
                        className="p-2 hover:bg-red-50 rounded-lg text-primary hover:text-red-800 transition-colors focus:outline-none cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayPackages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                      Không tìm thấy gói cước nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!loading && packages.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold space-y-3 sm:space-y-0">
          <div>
            HIỂN THỊ TRANG <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{totalPages}</span> (TỔNG <span className="text-slate-800">{totalItems}</span> GÓI CƯỚC)
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trang trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <div key={p} className="flex items-center">
                    {showEllipsis && <span className="px-1.5 text-slate-400 font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg font-extrabold transition-all ${currentPage === p ? 'bg-primary text-white shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                      {p}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* CRUD Form overlay Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-lg overflow-hidden my-auto max-h-[90vh] flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingPkg ? `Sửa gói cước ${editingPkg.ten}` : 'Tạo gói cước di động mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form wrapper */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col min-h-0">
              {/* Modal Body (Scrollable container) */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar space-y-6 text-xs">
                
                {/* Tabs Navigation Header */}
                <div className="flex border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider shrink-0 pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 pb-2.5 text-center transition-colors border-b-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                  >
                    1. Thông tin & Ưu đãi
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('system')}
                    className={`flex-1 pb-2.5 text-center transition-colors border-b-2 ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                  >
                    2. Hệ thống & Quy tắc
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('policy')}
                    className={`flex-1 pb-2.5 text-center transition-colors border-b-2 ${activeTab === 'policy' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                  >
                    3. Mô tả & Cú pháp
                  </button>
                </div>

                {/* Tab Content Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TAB 1: General & Benefits */}
                  {activeTab === 'general' && (
                    <>
                      {/* Ma goi */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Mã gói cước (Duy nhất)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: SD135, MXH100..."
                          disabled={!!editingPkg}
                          {...register('ma_goi')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors disabled:opacity-60"
                        />
                        {errors.ma_goi && <p className="text-[10px] text-red-500 mt-0.5">{errors.ma_goi.message}</p>}
                      </div>

                      {/* Ten */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Tên hiển thị gói</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Siêu Tốc SD135..."
                          {...register('ten')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                        {errors.ten && <p className="text-[10px] text-red-500 mt-0.5">{errors.ten.message}</p>}
                      </div>

                      {/* Gia */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Giá cước (VND)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Ví dụ: 90000, 135000..."
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          {...register('gia', {
                            valueAsNumber: true,
                            onChange: (e) => {
                              const val = e.target.value;
                              if (val === '') return;
                              const num = Number(val);
                              if (num < 0) {
                                e.target.value = '0';
                              }
                            }
                          })}
                          className={`w-full bg-slate-50 border rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors ${
                            errors.gia ? 'border-red-500 focus:border-red-500 shadow-sm' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                          }`}
                        />
                        {errors.gia && <p className="text-[10px] text-red-500 mt-0.5">{errors.gia.message}</p>}
                      </div>

                      {/* Phan loai goi */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Thể loại gói</label>
                        <select
                          {...register('phan_loai_goi')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="Data">Chỉ DATA</option>
                          <option value="Combo">Combo Thoại + Data</option>
                          <option value="Social">Mạng xã hội</option>
                          <option value="Thoại">Chỉ thoại</option>
                        </select>
                      </div>

                      {/* Chu ky ngay */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Thời hạn (Ngày thực tế)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 30, 7, 1..."
                          {...register('chu_ky_ngay')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                        {errors.chu_ky_ngay && <p className="text-[10px] text-red-500 mt-0.5">{errors.chu_ky_ngay.message}</p>}
                      </div>

                      {/* Data theo ngay */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Mô tả dung lượng Data</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 150 GB (5 GB/ngày), 30 GB..."
                          {...register('data_theo_ngay')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                        {errors.data_theo_ngay && <p className="text-[10px] text-red-500 mt-0.5">{errors.data_theo_ngay.message}</p>}
                      </div>

                      {/* Free noi mang */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Gọi nội mạng miễn phí</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1000 phút nội mạng, hoặc 0"
                          {...register('free_noi_mang')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Free ngoai mang */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Gọi ngoại mạng miễn phí</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 50 phút ngoại mạng, hoặc 0"
                          {...register('free_ngoai_mang')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* SMS */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Tin nhắn SMS miễn phí</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 100 sms nội mạng, hoặc 0"
                          {...register('sms')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Tienich */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Tiện ích cơ bản</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Lifebox 100GB, hoặc 0"
                          {...register('tienich')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Free data apps */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Free Data Apps (TikTok, YouTube...)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: TikTok, YouTube, Facebook, hoặc 0"
                          {...register('noi_dung_ngoai')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Chi tiet tien ich free */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Tiện ích giải trí free (TV360...)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: TV360 Standard, hoặc 0"
                          {...register('tien_ich_free')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Dohot */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Độ nổi bật</label>
                        <select
                          {...register('dohot')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="normal">Bình thường (Normal)</option>
                          <option value="Hot">Gói nổi bật (Hot)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* TAB 2: System Rules & Conflict */}
                  {activeTab === 'system' && (
                    <>
                      {/* System Type */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Loại hệ thống (System Type)</label>
                        <select
                          {...register('system_type')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="DATA_BASE">Gói DATA nền chính (DATA_BASE)</option>
                          <option value="DATA_UTILITY">Gói DATA tiện ích bổ sung (DATA_UTILITY)</option>
                          <option value="COMBO">Gói COMBO Thoại + Data (COMBO)</option>
                          <option value="VOICE_SMS">Gói chuyên THOẠI/SMS (VOICE_SMS)</option>
                          <option value="ADDON">Gói nạp thêm lưu lượng (ADDON)</option>
                        </select>
                        {errors.system_type && <p className="text-[10px] text-red-500 mt-0.5">{errors.system_type.message}</p>}
                      </div>

                      {/* Benefit Group */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Nhóm ưu đãi (Benefit Group)</label>
                        <select
                          {...register('benefit_group')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="GENERAL_DATA">Ưu đãi DATA thông thường (GENERAL_DATA)</option>
                          <option value="FACEBOOK">Ưu đãi truy cập Facebook (FACEBOOK)</option>
                          <option value="YOUTUBE">Ưu đãi truy cập Youtube (YOUTUBE)</option>
                          <option value="TIKTOK">Ưu đãi truy cập TikTok (TIKTOK)</option>
                          <option value="SPORT">Xem thể thao giải trí (SPORT)</option>
                          <option value="MOVIE">Xem phim ảnh (MOVIE)</option>
                          <option value="VOICE_SMS">Liên lạc thoại & SMS (VOICE_SMS)</option>
                          <option value="COMBO">Hệ thống COMBO đa chức năng (COMBO)</option>
                          <option value="ADDON_DATA">Lưu lượng mua thêm (ADDON_DATA)</option>
                        </select>
                        {errors.benefit_group && <p className="text-[10px] text-red-500 mt-0.5">{errors.benefit_group.message}</p>}
                      </div>

                      {/* Allow parallel with */}
                      <div className="flex flex-col space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Được chạy song song (Phân tách dấu phẩy)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: DATA_UTILITY, ADDON..."
                          {...register('allow_parallel_with_str')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Checkbox rules card */}
                      <div className="md:col-span-2 bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3 mt-2">
                        <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Cấu hình quy tắc xung đột hệ thống</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <label className="flex items-center space-x-2 text-slate-700 font-extrabold cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('is_addon')}
                              className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            <span>Là gói tiện ích (Add-on)</span>
                          </label>

                          <label className="flex items-center space-x-2 text-slate-700 font-extrabold cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('is_long_term')}
                              className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            <span>Là gói dài hạn (Long-term)</span>
                          </label>

                          <label className="flex items-center space-x-2 text-slate-700 font-extrabold cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('requires_base_package')}
                              className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            <span>Yêu cầu gói nền chính</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* TAB 3: Policy & SMS Syntax */}
                  {activeTab === 'policy' && (
                    <>
                      {/* Dieu kien dang ky */}
                      <div className="flex flex-col space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Đối tượng áp dụng (Điều kiện đăng ký)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: SIM trả trước kích hoạt mới..."
                          {...register('dieu_kien_dang_ky')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                        {errors.dieu_kien_dang_ky && <p className="text-[10px] text-red-500 mt-0.5">{errors.dieu_kien_dang_ky.message}</p>}
                      </div>

                      {/* Chinh sach ap dung */}
                      <div className="flex flex-col space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Chính sách gia hạn & Sử dụng</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Tự động gia hạn khi có đủ tiền..."
                          {...register('chinh_sach_ap_dung')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                        {errors.chinh_sach_ap_dung && <p className="text-[10px] text-red-500 mt-0.5">{errors.chinh_sach_ap_dung.message}</p>}
                      </div>

                      {/* Uudaitrong */}
                      <div className="flex flex-col space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Mô tả tóm tắt ưu đãi hiển thị</label>
                        <textarea
                          placeholder="Nhập mô tả tóm tắt..."
                          rows={2}
                          {...register('uudaitrong')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none resize-none transition-colors"
                        />
                        {errors.uudaitrong && <p className="text-[10px] text-red-500 mt-0.5">{errors.uudaitrong.message}</p>}
                      </div>

                      {/* Dangky */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Cú pháp đăng ký SMS</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Soạn SD135 gửi 191"
                          {...register('dangky')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Huygiahan */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Cú pháp hủy gia hạn SMS</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Soạn HUY gửi 191"
                          {...register('huygiahan')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Huygoicuoc */}
                      <div className="flex flex-col space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-500 uppercase tracking-wider">Cú pháp hủy hoàn toàn gói cước SMS</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Soạn HUYDATA gửi 191"
                          {...register('huygoicuoc')}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2 px-3 text-slate-700 focus:outline-none transition-colors"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-bold focus:outline-none text-[11px]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors focus:outline-none cursor-pointer text-[11px]"
                >
                  {editingPkg ? 'Lưu cập nhật' : 'Tạo mới gói'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPkg && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full shadow-md animate-scale-up z-50">
            <h4 className="text-sm font-extrabold text-primary mb-2 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Xóa gói cước</span>
            </h4>
            <p className="text-xs text-slate-650 mb-5 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn xóa gói cước <strong className="text-primary">{deleteConfirmPkg.ten}</strong> hoàn toàn khỏi hệ thống di động Viettel? Hành động này không thể hoàn tác.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmPkg(null)}
                className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs transition-colors font-bold focus:outline-none"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs transition-colors focus:outline-none cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
