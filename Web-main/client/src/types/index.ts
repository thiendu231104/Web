export interface Package {
  _id: string;
  package_id: number;
  ma_goi: string;
  ten: string;
  dohot: 'Hot' | 'normal' | string;
  phan_loai_goi: 'Combo' | 'Data' | 'Social' | 'Thoại' | string;
  gia: number;
  data_theo_ngay: string;
  free_ngoai_mang: number;
  free_noi_mang: number;
  sms: number;
  doi_tuong_ap_dung: string;
  noi_dung_ngoai?: string | null;
  tien_ich_free?: string | null;
  data_meta?: string | null;
  uudaitrong: string;
  chu_ky_ngay: number;
  dangky?: string | null;
  huygiahan?: string | null;
  huygoicuoc?: string | null;
  is_auto_renew: boolean;
  service_group: 'combo' | 'app_data' | 'daily_data' | 'monthly_data' | string;
  registration_policy: 'ALLOW' | 'REPLACE' | 'REJECT' | string;
  allow_parallel_with: string[];
  system_type: 'COMBO' | 'DATA_BASE' | 'ADD_ON' | string;
  is_addon: boolean;
  requires_base_package: boolean;
  benefit_group?: 'COMBO' | 'APP_TV360' | 'DATA_MAIN' | 'APP_TIKTOK' | 'APP_META' | 'APP_YOUTUBE' | string;
  updatedAt?: string;
  __v?: number;
  id?: string;
  numericId?: number;
  matchScore?: number;
  recommendationTag?: string;
  dieu_kien_dang_ky?: string;
  chinh_sach_ap_dung?: string;
  tienich?: string;
  is_long_term?: boolean;
  loai_mang?: string;
  has_data?: boolean;
  has_voice?: boolean;
  has_sms?: boolean;
  has_tiktok?: boolean;
  has_youtube?: boolean;
  has_facebook?: boolean;
  has_tv360?: boolean;
  has_movie?: boolean;
  has_social?: boolean;
  is_combo?: boolean;
  is_social?: boolean;
  price_level?: 'cheap' | 'medium' | 'expensive' | string;
  data_level?: 'none' | 'low' | 'medium' | 'high' | 'unlimited' | string;
  voice_level?: 'none' | 'low' | 'high' | string;
  sms_level?: 'none' | 'low' | 'high' | string;
  searchable_tags?: string[];
}

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
  paymentMethod?: string; // e.g. "VietQR", "Momo", "ATM Card"
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
    payload: string; // package ID or redirect link
    label: string;
  };
  matchedPackages?: Package[];
  packages?: Package[]; // Hoặc sử dụng Type Package định nghĩa sẵn của dự án
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
