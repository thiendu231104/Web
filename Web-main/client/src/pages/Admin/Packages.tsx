import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Wifi, Plus, Edit2, Trash2, X, AlertCircle, Sparkles,
  ChevronLeft, ChevronRight, Search, SlidersHorizontal
} from 'lucide-react';
import { usePackageStore } from '../../store';
import type { Package } from '../../types';

// ─── UI LOCALIZATION MAP (Từ Điển Việt Hóa Nhãn Hiển Thị) ─────────────────
const FIELD_LABELS: Record<string, string> = {
  ma_goi: 'Mã Gói Cước',
  ten: 'Tên Hiển Thị Gói Cước',
  gia: 'Giá Cước (VNĐ)',
  chu_ky_ngay: 'Chu Kỳ Sử Dụng (Ngày)',
  cycle_type: 'Loại Chu Kỳ',
  dohot: 'Mức Độ Nổi Bật',
  phan_loai_goi: 'Phân Loại Gói (Data / Combo)',
  data_theo_ngay: 'Data Đa Dụng (Ngày/Tháng)',
  data_meta: 'Data Mạng Xã Hội (Meta)',
  free_noi_mang: 'Phút Gọi Nội Mạng Miễn Phí',
  free_ngoai_mang: 'Phút Gọi Ngoại Mạng Miễn Phí',
  sms: 'SMS Miễn Phí',
  tien_ich_free: 'Ứng Dụng Miễn Phí Data',
  doi_tuong_ap_dung: 'Đối Tượng Thuê Bao Áp Dụng',
  uudaitrong: 'Mô Tả Chi Tiết Ưu Đãi',
  dangky: 'Cú Pháp Đăng Ký SMS',
  huygiahan: 'Cú Pháp Hủy Gia Hạn',
  huygoicuoc: 'Cú Pháp Hủy Gói Cước',
  is_auto_renew: 'Tự Động Gia Hạn',
  is_addon: 'Gói Cước Bổ Trợ (Add-on)',
  requires_base_package: 'Yêu Cầu Gói Nền',
  service_group: 'Nhóm Dịch Vụ',
  system_type: 'Phân Hệ Hệ Thống (system_type)',
  benefit_group: 'Nhóm Ưu Đãi Chính (benefit_group)',
  registration_policy: 'Chính Sách Đăng Ký (registration_policy)',
  allow_parallel_with: 'Phân Hệ Cho Phép Chạy Song Song (allow_parallel_with)',
};

const CYCLE_TYPE_LABELS: Record<string, string> = {
  DAY: 'Ngày (DAY)',
  MONTH: 'Tháng (MONTH)',
  YEAR: 'Năm (YEAR)',
};

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  DATA_BASE: 'DATA_BASE – Gói Data Nền Chính (Nền tảng chính)',
  DATA_UTILITY: 'DATA_UTILITY – Gói Phụ Meta/MXH (Tiện ích bổ sung)',
  VOICE_SMS: 'VOICE_SMS – Gói Chuyên Thoại & Tin Nhắn',
  COMBO: 'COMBO – Gói Combo Thoại + Data',
  ADDON: 'ADDON – Gói Nạp Thêm Lưu Lượng (Add-on)',
};

const REG_POLICY_LABELS: Record<string, string> = {
  ALLOW: 'ALLOW – Cho phép người dùng đăng ký chạy song song với gói khác',
  REJECT: 'REJECT – Hủy/Từ chối nếu người dùng đang dùng gói cùng nhóm',
  REPLACE: 'REPLACE – Cho phép đăng ký và tự động ghi đè/thay thế gói cũ',
};

const PARALLEL_OPTIONS = [
  { value: 'DATA_BASE', label: 'DATA_BASE – Gói Data Nền Chuẩn' },
  { value: 'DATA_UTILITY', label: 'DATA_UTILITY – Gói Data Tiện Ích Bổ Sung (Meta/TikTok/TV360)' },
  { value: 'VOICE_SMS', label: 'VOICE_SMS – Gói Thoại & Tin Nhắn' },
  { value: 'COMBO', label: 'COMBO – Gói Cước Combo' },
  { value: 'ADDON', label: 'ADD_ON – Gói Cước Mua Thêm' },
];

// ─── ZOD VALIDATION SCHEMA (Chuẩn goi_cuoc Mongo Schema) ───────────────────
export const packageFormSchema = z.object({
  // TAB 1: Thông Tin Cơ Bản & Cú Pháp SMS
  ma_goi: z.string().min(2, 'Mã gói tối thiểu 2 ký tự'),
  ten: z.string().min(2, 'Tên gói tối thiểu 2 ký tự'),
  gia: z.coerce.number().min(0, 'Giá cước không được âm'),
  chu_ky_ngay: z.coerce.number().min(1, 'Chu kỳ tối thiểu 1 ngày'),
  cycle_type: z.enum(['DAY', 'MONTH', 'YEAR']).default('MONTH'),
  dohot: z.enum(['Hot', 'normal']).default('normal'),
  phan_loai_goi: z.enum(['Data', 'Combo']).default('Data'),
  dangky: z.string().optional().default(''),
  huygiahan: z.string().optional().default(''),
  huygoicuoc: z.string().optional().default(''),

  // TAB 2: Thông Số Data & Ưu Đãi
  data_theo_ngay: z.string().optional().default('0 GB'),
  data_meta: z.string().optional().default(''),
  free_noi_mang: z.coerce.number().optional().default(0),
  free_ngoai_mang: z.coerce.number().optional().default(0),
  sms: z.coerce.number().optional().default(0),
  tien_ich_free: z.string().optional().default(''),
  doi_tuong_ap_dung: z.string().optional().default('pho_thong,tra_sau'),
  uudaitrong: z.string().min(2, 'Mô tả ưu đãi tối thiểu 2 ký tự'),

  // TAB 3: Cấu Hình Hệ Thống & Quy Tắc
  service_group: z.enum(['DATA', 'COMBO']).default('DATA'),
  system_type: z.enum(['DATA_BASE', 'COMBO', 'DATA_UTILITY', 'VOICE_SMS', 'ADDON']).default('DATA_BASE'),
  benefit_group: z.enum(['APP_META', 'DATA_MAIN', 'COMBO', 'APP_TV360', 'APP_YOUTUBE', 'APP_TIKTOK']).default('DATA_MAIN'),
  registration_policy: z.enum(['ALLOW', 'REJECT', 'REPLACE']).default('ALLOW'),
  allow_parallel_with: z.array(z.string()).default([]),
  is_auto_renew: z.boolean().default(true),
  is_addon: z.boolean().default(false),
  requires_base_package: z.boolean().default(false),
});

export type PackageFormData = z.infer<typeof packageFormSchema>;

// ─── DEFAULT FORM VALUES ───────────────────────────────────────────────────
const DEFAULT_FORM_VALUES: PackageFormData = {
  ma_goi: '',
  ten: '',
  gia: 90000,
  chu_ky_ngay: 30,
  cycle_type: 'MONTH',
  dohot: 'normal',
  phan_loai_goi: 'Data',
  dangky: '',
  huygiahan: '',
  huygoicuoc: '',
  data_theo_ngay: '0 GB',
  data_meta: '',
  free_noi_mang: 0,
  free_ngoai_mang: 0,
  sms: 0,
  tien_ich_free: '',
  doi_tuong_ap_dung: 'pho_thong,tra_sau',
  uudaitrong: '',
  service_group: 'DATA',
  system_type: 'DATA_BASE',
  benefit_group: 'DATA_MAIN',
  registration_policy: 'ALLOW',
  allow_parallel_with: [],
  is_auto_renew: true,
  is_addon: false,
  requires_base_package: false,
};

function LoadingSkeleton() {
  return (
    <tbody className="divide-y divide-slate-100 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <tr key={n}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(c => (
            <td key={c} className="p-3">
              <div className="h-3.5 bg-slate-200 rounded w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function FieldWrapper({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

const inputClass = "w-full bg-slate-50 border border-slate-200 focus:border-primary/60 focus:bg-white rounded-lg py-2 px-3 text-slate-700 text-xs focus:outline-none transition-colors";
const selectClass = "w-full bg-slate-50 border border-slate-200 focus:border-primary/60 focus:bg-white rounded-lg py-2 px-3 text-slate-700 text-xs focus:outline-none transition-colors cursor-pointer";

export default function AdminPackages() {
  const {
    packages, addPackage, updatePackage, deletePackage, fetchPackages,
    totalPages, totalItems, loading
  } = usePackageStore();

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [deleteConfirmPkg, setDeleteConfirmPkg] = useState<Package | null>(null);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // ─── TỰ DO LOCAL SEARCH ADMIN DÀNH RIÊNG ────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search nội bộ Admin (không gửi/ghi đè vào Global State của Client)
  useEffect(() => {
    const t = setTimeout(() => { setSearchKeyword(searchTerm); setCurrentPage(1); }, 420);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const buildFetchParams = (page = currentPage) => ({
    page, limit: itemsPerPage,
    search: searchKeyword,
    sort: 'price_asc',
  });

  useEffect(() => {
    fetchPackages(buildFetchParams());
  }, [currentPage, searchKeyword, fetchPackages]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(packageFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watchAllowParallelWith = watch('allow_parallel_with') || [];

  const handleParallelCheckboxChange = (val: string, checked: boolean) => {
    if (checked) {
      setValue('allow_parallel_with', [...watchAllowParallelWith, val]);
    } else {
      setValue('allow_parallel_with', watchAllowParallelWith.filter((v: string) => v !== val));
    }
  };

  // Modal Handlers
  const handleCreate = () => {
    setEditingPkg(null);
    setActiveTab(1);
    reset(DEFAULT_FORM_VALUES);
    setShowModal(true);
  };

  const handleEdit = (pkg: Package) => {
    setEditingPkg(pkg);
    setActiveTab(1);
    reset({
      ma_goi: pkg.ma_goi ?? '',
      ten: pkg.ten ?? '',
      gia: Number(pkg.gia) || 0,
      chu_ky_ngay: Number(pkg.chu_ky_ngay) || 30,
      cycle_type: (['DAY', 'MONTH', 'YEAR'].includes(pkg.cycle_type ?? '') ? pkg.cycle_type : 'MONTH') as 'DAY' | 'MONTH' | 'YEAR',
      dohot: pkg.dohot === 'Hot' ? 'Hot' : 'normal',
      phan_loai_goi: pkg.phan_loai_goi === 'Combo' ? 'Combo' : 'Data',
      dangky: pkg.dangky ?? '',
      huygiahan: pkg.huygiahan ?? '',
      huygoicuoc: pkg.huygoicuoc ?? '',
      data_theo_ngay: pkg.data_theo_ngay ?? '0 GB',
      data_meta: pkg.data_meta ?? '',
      free_noi_mang: Number(pkg.free_noi_mang) || 0,
      free_ngoai_mang: Number(pkg.free_ngoai_mang) || 0,
      sms: Number(pkg.sms) || 0,
      tien_ich_free: pkg.tien_ich_free ?? '',
      doi_tuong_ap_dung: pkg.doi_tuong_ap_dung ?? 'pho_thong,tra_sau',
      uudaitrong: pkg.uudaitrong ?? '',
      service_group: pkg.service_group === 'COMBO' ? 'COMBO' : 'DATA',
      system_type: (['DATA_BASE', 'COMBO', 'DATA_UTILITY', 'VOICE_SMS', 'ADDON'].includes(pkg.system_type ?? '') ? pkg.system_type : 'DATA_BASE') as any,
      benefit_group: (['APP_META', 'DATA_MAIN', 'COMBO', 'APP_TV360', 'APP_YOUTUBE', 'APP_TIKTOK'].includes(pkg.benefit_group ?? '') ? pkg.benefit_group : 'DATA_MAIN') as any,
      registration_policy: (['ALLOW', 'REJECT', 'REPLACE'].includes(pkg.registration_policy ?? '') ? pkg.registration_policy : 'ALLOW') as 'ALLOW' | 'REJECT' | 'REPLACE',
      allow_parallel_with: Array.isArray(pkg.allow_parallel_with) ? pkg.allow_parallel_with : [],
      is_auto_renew: pkg.is_auto_renew ?? true,
      is_addon: pkg.is_addon ?? false,
      requires_base_package: pkg.requires_base_package ?? false,
    });
    setShowModal(true);
  };

  const handleFormSubmit = (data: PackageFormData) => {
    const run = async () => {
      const refetch = () => fetchPackages(buildFetchParams());
      if (editingPkg) {
        const pkgKey = editingPkg._id || editingPkg.id || String(editingPkg.package_id ?? '');
        const ok = await updatePackage(pkgKey, data);
        if (ok) { showToast('success', `Cập nhật thành công gói ${data.ten}!`); refetch(); }
        else showToast('error', `Lỗi khi cập nhật gói ${data.ten}.`);
      } else {
        const ok = await addPackage(data as any);
        if (ok) { showToast('success', `Tạo mới thành công gói ${data.ten}!`); setCurrentPage(1); refetch(); }
        else showToast('error', `Lỗi khi tạo gói cước mới ${data.ten}.`);
      }
      setShowModal(false);
    };
    run();
  };

  const handleDeleteClick = (pkg: Package) => setDeleteConfirmPkg(pkg);

  const confirmDelete = async () => {
    if (!deleteConfirmPkg) return;
    const pkgKey = deleteConfirmPkg._id || deleteConfirmPkg.id || String(deleteConfirmPkg.package_id ?? '');
    const ok = await deletePackage(pkgKey);
    if (ok) {
      showToast('success', `Đã xóa gói ${deleteConfirmPkg.ten} khỏi hệ thống.`);
      const nextPage = packages.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      fetchPackages(buildFetchParams(nextPage));
    } else {
      showToast('error', `Lỗi khi xóa gói ${deleteConfirmPkg.ten}.`);
    }
    setDeleteConfirmPkg(null);
  };

  const getDataDisplay = (pkg: Package) => {
    if (pkg.data_theo_ngay && !['0', '0gb', '0 gb', 'null', 'undefined'].includes(pkg.data_theo_ngay.trim().toLowerCase())) {
      return pkg.data_theo_ngay;
    }
    if (pkg.data_meta && pkg.data_meta !== '0' && pkg.data_meta.trim()) return pkg.data_meta;
    if ((Number(pkg.free_noi_mang) > 0) || (Number(pkg.free_ngoai_mang) > 0) || pkg.phan_loai_goi === 'Thoại') return 'Theo phút gọi';
    return 'Không có';
  };

  // Local client-side search lọc theo Mã gói hoặc Tên gói
  const displayPackages = packages.filter(pkg => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const matchMaGoi = pkg.ma_goi && pkg.ma_goi.toLowerCase().includes(term);
    const matchTen = pkg.ten && pkg.ten.toLowerCase().includes(term);
    return matchMaGoi || matchTen;
  });

  const TABS = [
    { id: 1, label: '1. Thông Tin Cơ Bản & SMS' },
    { id: 2, label: '2. Thông Số Data & Ưu Đãi' },
    { id: 3, label: '3. Cấu Hình Hệ Thống & Quy Tắc' },
  ] as const;

  return (
    <div className="space-y-5 relative animate-fade-in text-xs font-semibold">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[60] px-4 py-3 rounded-xl shadow-xl border-l-4 text-xs font-bold animate-scale-up bg-white text-slate-800 ${toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'}`}>
          {toast.text}
        </div>
      )}

      {/* Header Trang Admin - Ngắn gọn, trang trọng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wifi className="w-6 h-6 text-primary" />
            Quản Lý Gói Cước Di Động
          </h1>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors self-start sm:self-auto cursor-pointer">
          <Plus className="w-4 h-4" />
          Tạo Gói Mới
        </button>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM ADMIN CỤC BỘ TỐI GIẢN */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã gói cước hoặc Tên gói cước..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/60 focus:bg-white transition-all text-slate-700 font-semibold"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              title="Xóa từ khóa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3">{FIELD_LABELS.ma_goi}</th>
                <th className="px-4 py-3">{FIELD_LABELS.ten}</th>
                <th className="px-4 py-3">{FIELD_LABELS.gia}</th>
                <th className="px-4 py-3">{FIELD_LABELS.chu_ky_ngay}</th>
                <th className="px-4 py-3">{FIELD_LABELS.phan_loai_goi}</th>
                <th className="px-4 py-3">{FIELD_LABELS.data_theo_ngay}</th>
                <th className="px-4 py-3">{FIELD_LABELS.benefit_group}</th>
                <th className="px-4 py-3">Trạng Thái</th>
                <th className="px-4 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayPackages.map(pkg => (
                  <tr key={pkg._id || pkg.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Mã Gói */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono text-slate-700 font-black uppercase">
                          {pkg.ma_goi}
                        </code>
                        {pkg.dohot === 'Hot' && (
                          <span title="Gói Nổi Bật">
                            <Sparkles className="w-3 h-3 text-primary fill-primary" />
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Tên Gói */}
                    <td className="px-4 py-3 font-bold text-slate-900 max-w-[160px]">
                      <span className="line-clamp-2 leading-snug">{pkg.ten}</span>
                    </td>
                    {/* Giá Cước */}
                    <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN').format(Number(pkg.gia))}đ
                    </td>
                    {/* Chu Kỳ */}
                    <td className="px-4 py-3 text-slate-500 font-semibold whitespace-nowrap">
                      {pkg.chu_ky_ngay || 30} ngày
                    </td>
                    {/* Phân Loại */}
                    <td className="px-4 py-3">
                      {pkg.phan_loai_goi === 'Combo' ? (
                        <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-black uppercase">COMBO</span>
                      ) : (
                        <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-black uppercase">DATA</span>
                      )}
                    </td>
                    {/* Data Ưu Đãi */}
                    <td className="px-4 py-3 text-slate-700 font-semibold">{getDataDisplay(pkg)}</td>
                    {/* Nhóm Ưu Đãi */}
                    <td className="px-4 py-3 text-slate-500 font-semibold text-[10px] uppercase">{pkg.benefit_group || '—'}</td>
                    {/* Trạng Thái */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {pkg.is_auto_renew && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">Tự Gia Hạn</span>
                        )}
                        {pkg.is_addon && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">Add-on</span>
                        )}
                      </div>
                    </td>
                    {/* Thao Tác */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(pkg)} title="Chỉnh sửa gói cước" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-800 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteClick(pkg)} title="Xóa gói cước" className="p-1.5 hover:bg-red-50 rounded-lg text-primary hover:text-red-800 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayPackages.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400 font-semibold">
                      <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Không tìm thấy gói cước nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold gap-3">
          <span>TRANG <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{totalPages}</span> — TỔNG <span className="text-slate-800">{totalItems}</span> GÓI CƯỚC</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <div key={p} className="flex items-center gap-1">
                  {idx > 0 && p - arr[idx - 1] > 1 && <span className="text-slate-400">…</span>}
                  <button onClick={() => setCurrentPage(p)} className={`w-7 h-7 rounded-lg font-extrabold transition-all ${currentPage === p ? 'bg-primary text-white shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50'}`}>{p}</button>
                </div>
              ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* CRUD Modal (Sạch sẽ, Tinh gọn chuẩn goi_cuoc Mongo Schema) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] animate-scale-up">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingPkg ? `Chỉnh Sửa: ${editingPkg.ten}` : 'Tạo Gói Cước Di Động Mới'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 pt-3 border-b border-slate-100 shrink-0 flex gap-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-none pb-3 px-4 text-[10px] font-extrabold uppercase tracking-wide border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col min-h-0">
              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">

                {/* ─── TAB 1: Thông Tin Cơ Bản & SMS ─── */}
                {activeTab === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldWrapper label={FIELD_LABELS.ma_goi} error={errors.ma_goi?.message}>
                      <input type="text" disabled={!!editingPkg} placeholder="VD: 12FB30, SD135..." {...register('ma_goi')} className={inputClass + (editingPkg ? ' opacity-60' : '')} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.ten} error={errors.ten?.message}>
                      <input type="text" placeholder="VD: 12FB30 360 ngày..." {...register('ten')} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.gia} error={errors.gia?.message}>
                      <input type="number" min="0" placeholder="VD: 360000, 135000..." {...register('gia', { valueAsNumber: true })} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.chu_ky_ngay} error={errors.chu_ky_ngay?.message}>
                      <input type="number" min="1" placeholder="VD: 360, 30, 7..." {...register('chu_ky_ngay', { valueAsNumber: true })} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.cycle_type}>
                      <select {...register('cycle_type')} className={selectClass}>
                        {Object.entries(CYCLE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.dohot}>
                      <select {...register('dohot')} className={selectClass}>
                        <option value="Hot">Gói Nổi Bật (Hot)</option>
                        <option value="normal">Gói Thường (normal)</option>
                      </select>
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.phan_loai_goi}>
                      <select {...register('phan_loai_goi')} className={selectClass}>
                        <option value="Data">Data (Dành cho gói Data/Meta)</option>
                        <option value="Combo">Combo (Dành cho gói Combo thoại + data)</option>
                      </select>
                    </FieldWrapper>
                    <div className="md:col-span-2 border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">Cú Pháp SMS Đăng Ký / Hủy</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <FieldWrapper label={FIELD_LABELS.dangky}>
                          <input type="text" placeholder="VD: 12FB30 gửi 191" {...register('dangky')} className={inputClass} />
                        </FieldWrapper>
                        <FieldWrapper label={FIELD_LABELS.huygiahan}>
                          <input type="text" placeholder="VD: HUY 12FB30 gửi 191" {...register('huygiahan')} className={inputClass} />
                        </FieldWrapper>
                        <FieldWrapper label={FIELD_LABELS.huygoicuoc}>
                          <input type="text" placeholder="VD: HUYDATA gửi 191" {...register('huygoicuoc')} className={inputClass} />
                        </FieldWrapper>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: Thông Số Data & Ưu Đãi ─── */}
                {activeTab === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldWrapper label={FIELD_LABELS.data_theo_ngay}>
                      <input type="text" placeholder="VD: 0 GB, 1 GB/ngày..." {...register('data_theo_ngay')} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.data_meta}>
                      <input type="text" placeholder="VD: 50GB/30 ngày, Miễn phí FB..." {...register('data_meta')} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.free_noi_mang}>
                      <input type="number" min="0" placeholder="VD: 0, 1000 (phút)" {...register('free_noi_mang', { valueAsNumber: true })} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.free_ngoai_mang}>
                      <input type="number" min="0" placeholder="VD: 0, 50 (phút)" {...register('free_ngoai_mang', { valueAsNumber: true })} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.sms}>
                      <input type="number" min="0" placeholder="VD: 0, 100 (tin nhắn)" {...register('sms', { valueAsNumber: true })} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.tien_ich_free}>
                      <input type="text" placeholder="VD: Facebook, TikTok, TV360..." {...register('tien_ich_free')} className={inputClass} />
                    </FieldWrapper>
                    <FieldWrapper label={FIELD_LABELS.doi_tuong_ap_dung}>
                      <input type="text" placeholder="VD: pho_thong,tra_sau..." {...register('doi_tuong_ap_dung')} className={inputClass} />
                    </FieldWrapper>
                    <div className="md:col-span-2">
                      <FieldWrapper label={FIELD_LABELS.uudaitrong} error={errors.uudaitrong?.message}>
                        <textarea rows={3} placeholder="Miễn phí truy cập Facebook và nhắn tin Messenger..." {...register('uudaitrong')} className={inputClass + ' resize-none'} />
                      </FieldWrapper>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: Cấu Hình Hệ Thống & Quy Tắc (Tái Thiết Kế Trực Quan) ─── */}
                {activeTab === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldWrapper label={FIELD_LABELS.service_group}>
                      <select {...register('service_group')} className={selectClass}>
                        <option value="DATA">DATA – Gói Dịch Vụ Data</option>
                        <option value="COMBO">COMBO – Gói Dịch Vụ Combo</option>
                      </select>
                    </FieldWrapper>

                    {/* system_type kèm mô tả chi tiết */}
                    <FieldWrapper label={FIELD_LABELS.system_type} error={errors.system_type?.message}>
                      <select {...register('system_type')} className={selectClass}>
                        {Object.entries(SYSTEM_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </FieldWrapper>

                    <FieldWrapper label={FIELD_LABELS.benefit_group} error={errors.benefit_group?.message}>
                      <select {...register('benefit_group')} className={selectClass}>
                        <option value="APP_META">APP_META – Facebook & Messenger</option>
                        <option value="DATA_MAIN">DATA_MAIN – Ưu Đãi Data Chính</option>
                        <option value="COMBO">COMBO – Combo Thoại & Data</option>
                        <option value="APP_TV360">APP_TV360 – TV360</option>
                        <option value="APP_YOUTUBE">APP_YOUTUBE – YouTube</option>
                        <option value="APP_TIKTOK">APP_TIKTOK – TikTok</option>
                      </select>
                    </FieldWrapper>

                    {/* registration_policy kèm hướng dẫn nghiệp vụ */}
                    <FieldWrapper label={FIELD_LABELS.registration_policy}>
                      <select {...register('registration_policy')} className={selectClass}>
                        {Object.entries(REG_POLICY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </FieldWrapper>

                    {/* Multi-Select Checkboxes cho allow_parallel_with */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{FIELD_LABELS.allow_parallel_with}</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                        {PARALLEL_OPTIONS.map(item => (
                          <label key={item.value} className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold bg-white border border-slate-200 rounded-lg p-2.5 hover:bg-slate-100/80 transition-colors text-xs">
                            <input
                              type="checkbox"
                              value={item.value}
                              checked={watchAllowParallelWith.includes(item.value)}
                              onChange={(e) => handleParallelCheckboxChange(item.value, e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Checkbox rules */}
                    <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cấu Hình Quy Tắc Hệ Thống</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { name: 'is_auto_renew' as const, label: FIELD_LABELS.is_auto_renew },
                          { name: 'is_addon' as const, label: FIELD_LABELS.is_addon },
                          { name: 'requires_base_package' as const, label: FIELD_LABELS.requires_base_package },
                        ].map(({ name, label }) => (
                          <label key={name} className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                            <input type="checkbox" {...register(name)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  {activeTab > 1 && (
                    <button type="button" onClick={() => setActiveTab(t => (t - 1) as 1 | 2 | 3)} className="px-3 py-2 text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      ← Tab Trước
                    </button>
                  )}
                  {activeTab < 3 && (
                    <button type="button" onClick={() => setActiveTab(t => (t + 1) as 1 | 2 | 3)} className="px-3 py-2 text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      Tab Sau →
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Hủy Bỏ
                  </button>
                  <button type="submit" className="px-4 py-2 text-[11px] font-bold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors">
                    {editingPkg ? 'Lưu Cập Nhật' : 'Tạo Gói Mới'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmPkg && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full shadow-xl animate-scale-up">
            <h4 className="text-sm font-extrabold text-primary mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Xác Nhận Xóa Gói Cước
            </h4>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed font-semibold">
              Bạn có chắc muốn xóa gói cước <strong className="text-primary">{deleteConfirmPkg.ten}</strong>? Hành động này sẽ xóa đồng thời khỏi cả 2 collection <code className="bg-slate-100 px-1 rounded">goi_cuoc</code> và <code className="bg-slate-100 px-1 rounded">package_features</code>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmPkg(null)} className="flex-1 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Hủy Bỏ
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors">
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
