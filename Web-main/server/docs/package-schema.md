# Package Schema

Collection: goi_cuoc
interface Package {
  package_id: number;
  ma_goi: string;
  ten: string;
  gia: number;
  phan_loai_goi: string;
  chu_ky_ngay: number;
  data_theo_ngay: string;
  free_noi_mang: string;
  free_ngoai_mang: string;
  sms: string;
  tien_ich_free: string;
  dieu_kien_dang_ky: string;
  service_group: string;
  system_type: string;
  registration_policy: string;
  allow_parallel_with: string[];
  is_addon: boolean;
  is_long_term: boolean;
  requires_base_package: boolean;
}
