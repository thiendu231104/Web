// ─── GÓI CƯỚC: NGUỒN SỰ THẬT DUY NHẤT từ MongoDB collection goi_cuoc ──────────
export interface GoiCuocEntity {
  _id?: string;
  package_id?: number;
  id?: string;
  numericId?: number;

  // Khóa chính & nhận diện
  ma_goi: string;
  ten: string;

  // Tài chính & Chu kỳ
  gia: number;
  chu_ky_ngay: number;
  cycle_type?: 'DAY' | 'MONTH' | 'YEAR' | string;

  // Phân loại & Hệ thống
  dohot: 'Hot' | 'normal';
  phan_loai_goi: 'Data' | 'Combo' | 'Social' | 'Thoại' | string;
  service_group?: string;
  system_type?: string;
  benefit_group?: string;

  // Ưu đãi Data
  data_theo_ngay?: string;
  data_meta?: string | null;

  // Ưu đãi Thoại & SMS
  free_noi_mang?: number;
  free_ngoai_mang?: number;
  sms?: number;

  // Đối tượng & Mô tả
  doi_tuong_ap_dung?: string;
  dieu_kien_dang_ky?: string;
  chinh_sach_ap_dung?: string;
  tien_ich_free?: string | null;
  noi_dung_ngoai?: string | null;
  uudaitrong?: string;

  // Cú pháp SMS
  dangky?: string | null;
  huygiahan?: string | null;
  huygoicuoc?: string | null;

  // Quy tắc đăng ký & Xung đột
  is_auto_renew?: boolean;
  is_addon?: boolean;
  requires_base_package?: boolean;
  registration_policy?: 'ALLOW' | 'REJECT' | 'REPLACE' | string;
  allow_parallel_with?: string[];

  updatedAt?: string;
  createdAt?: string;
  __v?: number;
}

// ─── PACKAGE_FEATURES: Thuộc tính phục vụ Chatbot & Khảo sát AI ─────────────
export interface PackageFeaturesEntity {
  _id?: string;
  package_id: number;
  ma_goi: string;
  price?: number;
  cycle_days?: number;
  is_addon?: boolean;

  // Cờ Boolean đặc trưng AI
  has_data?: boolean;
  has_voice?: boolean;
  has_sms?: boolean;
  has_5g?: boolean;
  has_social?: boolean;
  has_facebook?: boolean;
  has_tiktok?: boolean;
  has_youtube?: boolean;
  has_tv360?: boolean;
  has_movie?: boolean;
  is_combo?: boolean;
  is_data_only?: boolean;
  is_social?: boolean;

  // Phân cấp định tính
  price_level?: 'cheap' | 'medium' | 'expensive';
  data_level?: 'none' | 'low' | 'medium' | 'high' | 'unlimited';
  voice_level?: 'none' | 'low' | 'high';
  sms_level?: 'none' | 'low' | 'high';

  // Tag tìm kiếm động
  searchable_tags?: string[];
}

// ─── AdminPackageAdminView: Hợp nhất GoiCuocEntity + PackageFeaturesEntity ───
export type AdminPackageAdminView = GoiCuocEntity & PackageFeaturesEntity & {
  // Extra display fields từ backend mapToEnglish()
  name?: string;
  duration?: string;
  durationDays?: number;
  dataLimit?: string;
  dataPerDayGb?: number;
  voiceFreeInternalMin?: number;
  voiceFreeExternalMin?: number;
  socialFreeApps?: string[];
  description?: string;
  terms?: string[];
  conditions?: string;
  category?: string;
  rating?: number;
  registrationsCount?: number;
  tags?: string[];
  isPopular?: boolean;
  loai_mang?: string;
  recommendationTag?: string;
  matchScore?: number;
  is_long_term?: boolean;
};

// ─── Package: Alias tương thích ngược cho toàn bộ codebase ──────────────────
export type Package = AdminPackageAdminView;

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  balance: number;
  activePackages: {
    packageId: string;
    activatedAt: string;
    expiresAt: string;
  }[];
  role: 'customer' | 'admin';
  subscription_type?: 'tra_truoc' | 'tra_sau';
  is_loyal_customer?: boolean;
  status?: 'active' | 'blocked' | 'pending';
  walletAddress?: string | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'subscribe' | 'purchase' | string;
  direction?: 'PLUS' | 'MINUS';
  amount: number;
  packageName?: string;
  paymentMethod?: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | string;
  createdAt: string;
  txHash?: string;
  walletAddress?: string;
  exchangeRate?: number;
  network?: string;
  amountETH?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt: string;
  suggestedAction?: {
    type: 'subscribe' | 'view_details' | 'survey';
    payload: string;
    label: string;
  };
  matchedPackages?: Package[];
  packages?: Package[];
  recommendedPackages?: Package[];
}

export interface ChatbotConfig {
  systemPrompt: string;
  trainingKeywords: {
    keyword: string;
    response: string;
    suggestedPackageId?: string;
  }[];
}

export interface SurveyAnswers {
  budget?: 'under_90' | '90_150' | 'above_150' | string;
  demand_branch?: 'DATA_ONLY' | 'COMBO' | 'SOCIAL_DEEP' | string;
  data_per_day?: '1GB' | '2_3GB' | 'UNLIMITED' | string;
  combo_priority?: 'DATA_FIRST' | 'VOICE_FIRST' | 'BALANCED' | string;
  primary_app?: 'TikTok' | 'YouTube' | 'Facebook' | 'ALL_SOCIAL' | string;
  cycle_preference?: 'MONTHLY' | 'LONG_TERM' | 'ANY' | string;
  [key: string]: any;
}

export type SubscriptionStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED';
export type SubscriptionCycle = 'DAY' | 'MONTH' | 'YEAR';

export interface UserSubscription {
  id?: string;
  userId: number;
  packageId: number;
  registeredAt: string;
  activatedAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  cycle: SubscriptionCycle;
  cancelledAt?: string | null;
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  contact_id: string;
  user_id: number | null;
  full_name: string;
  phone: string;
  message: string;
  topic: string;
  status: 'NEW' | 'READ' | 'PROCESSING' | 'DONE' | 'CLOSED';
  source: 'guest' | 'user';
  created_at?: string;
  updated_at?: string;
  handled_by?: number | null;
  handled_at?: string | null;
  admin_note?: string;
  is_deleted_by_user?: boolean;
  deleted_at_by_user?: string | null;
}

export interface Notification {
  _id: string;
  userId: number;
  title: string;
  content: string;
  type: 'SUBSCRIPTION' | 'TRANSACTION' | 'SYSTEM' | 'SUPPORT';
  status: 'UNREAD' | 'READ';
  link?: string;
  isDeleted: boolean;
  createdAt: string;
}
