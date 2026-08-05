import axiosInstance from './axiosInstance';
import type { Package, User, Transaction, ChatMessage, Contact, Notification } from '../types';

const API_BASE_URL = '/api/packages';

export interface FetchPackagesResponse {
  packages: Package[];
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export interface FilterOptions {
  categories: { key: string; label: string }[];
  networks: string[];
  durations: { key: string; label: string }[];
  appPromos?: string[];
}

export function toVietnamesePackage(apiPkg: any): Package {
  if (!apiPkg) return {} as Package;

  // Nếu đối tượng đã là tiếng Việt (có trường ten và gia), trả về trực tiếp
  if (apiPkg.ten !== undefined && apiPkg.gia !== undefined) {
    return apiPkg as Package;
  }

  const price = apiPkg.price || 0;
  const termsList = apiPkg.terms || [];

  let dangky = apiPkg.dangky || '';
  let huygiahan = apiPkg.huygiahan || '';
  let huygoicuoc = apiPkg.huygoicuoc || '';

  termsList.forEach((term: string) => {
    if (term.toLowerCase().startsWith('cách đăng ký:')) {
      dangky = term.replace(/cách đăng ký:\s*/i, '').trim();
    } else if (term.toLowerCase().startsWith('hủy gia hạn:')) {
      huygiahan = term.replace(/hủy gia hạn:\s*/i, '').trim();
    } else if (term.toLowerCase().startsWith('hủy gói:')) {
      huygoicuoc = term.replace(/hủy gói:\s*/i, '').trim();
    } else if (term.toLowerCase().startsWith('hủy gói cước:')) {
      huygoicuoc = term.replace(/hủy gói cước:\s*/i, '').trim();
    }
  });

  if (!dangky) {
    dangky = `Soạn ${apiPkg.ma_goi || (apiPkg.id ? String(apiPkg.id).toUpperCase() : '')} gửi 191`;
  }
  if (!huygiahan) {
    huygiahan = 'Soạn HUY gửi 191';
  }
  if (!huygoicuoc) {
    huygoicuoc = 'Soạn HUYDATA gửi 191';
  }

  const vnPkg: any = {
    _id: apiPkg._id ? String(apiPkg._id) : (apiPkg.dbId ? String(apiPkg.dbId) : ''),
    package_id: apiPkg.package_id !== undefined && apiPkg.package_id !== null ? Number(apiPkg.package_id) : (apiPkg.numericId || Number(apiPkg.id) || 0),
    ma_goi: apiPkg.ma_goi || (apiPkg.id ? String(apiPkg.id).toUpperCase() : ''),
    ten: apiPkg.ten || apiPkg.name || '',
    gia: apiPkg.gia !== undefined ? Number(apiPkg.gia) : price,
    chu_ky_ngay: typeof apiPkg.chu_ky_ngay === 'number' ? apiPkg.chu_ky_ngay : (parseInt(apiPkg.chu_ky_ngay || apiPkg.durationDays || '30') || 30),
    data_theo_ngay: apiPkg.data_theo_ngay || apiPkg.dataLimit || '',
    free_ngoai_mang: typeof apiPkg.free_ngoai_mang === 'number' ? apiPkg.free_ngoai_mang : (parseInt(apiPkg.free_ngoai_mang) || 0),
    free_noi_mang: typeof apiPkg.free_noi_mang === 'number' ? apiPkg.free_noi_mang : (parseInt(apiPkg.free_noi_mang) || 0),
    sms: typeof apiPkg.sms === 'number' ? apiPkg.sms : (parseInt(apiPkg.sms) || 0),
    doi_tuong_ap_dung: apiPkg.doi_tuong_ap_dung || apiPkg.conditions || '',
    noi_dung_ngoai: apiPkg.noi_dung_ngoai || null,
    tien_ich_free: apiPkg.tien_ich_free || null,
    data_meta: apiPkg.data_meta || null,
    uudaitrong: apiPkg.uudaitrong || apiPkg.description || '',
    dangky: dangky || null,
    huygiahan: huygiahan || null,
    huygoicuoc: huygoicuoc || null,
    is_auto_renew: apiPkg.is_auto_renew !== undefined ? apiPkg.is_auto_renew : true,
    service_group: apiPkg.service_group || 'daily_data',
    registration_policy: apiPkg.registration_policy || 'ALLOW',
    allow_parallel_with: apiPkg.allow_parallel_with || [],
    system_type: apiPkg.system_type || 'DATA_BASE',
    is_addon: apiPkg.is_addon || false,
    requires_base_package: apiPkg.requires_base_package || false,
    benefit_group: apiPkg.benefit_group || 'DATA_MAIN',
    dohot: apiPkg.dohot || (apiPkg.isPopular ? 'Hot' : 'normal'),
    phan_loai_goi: apiPkg.phan_loai_goi || (apiPkg.category === 'combo' ? 'Combo' : apiPkg.category === 'social' ? 'Social' : 'Data'),
    id: apiPkg.ma_goi ? apiPkg.ma_goi.toLowerCase() : (apiPkg.id ? String(apiPkg.id) : `pkg_${apiPkg.package_id}`),
    numericId: apiPkg.package_id || apiPkg.numericId,
    dbId: apiPkg._id || apiPkg.dbId
  };

  return vnPkg as Package;
}

export function toEnglishPackage(vnPkg: Partial<Package>): any {
  const price = vnPkg.gia || 0;
  const durationDays = typeof vnPkg.chu_ky_ngay === 'number' ? vnPkg.chu_ky_ngay : parseInt(String(vnPkg.chu_ky_ngay || '30'), 10) || 30;
  let duration = 'monthly';
  if (durationDays <= 1) duration = 'daily';
  else if (durationDays <= 15) duration = 'weekly';
  else if (durationDays <= 90) duration = 'monthly';
  else duration = 'yearly';

  const voiceFreeInternalMin = typeof vnPkg.free_noi_mang === 'number' ? vnPkg.free_noi_mang : (vnPkg.free_noi_mang ? (parseInt(String(vnPkg.free_noi_mang).replace(/\D/g, '')) || 0) : 0);
  const voiceFreeExternalMin = typeof vnPkg.free_ngoai_mang === 'number' ? vnPkg.free_ngoai_mang : (vnPkg.free_ngoai_mang ? (parseInt(String(vnPkg.free_ngoai_mang).replace(/\D/g, '')) || 0) : 0);
  const socialFreeApps = vnPkg.noi_dung_ngoai && vnPkg.noi_dung_ngoai !== '0'
    ? vnPkg.noi_dung_ngoai.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const category = socialFreeApps.length > 0 ? 'social' : voiceFreeInternalMin > 0 ? 'combo' : 'data';

  return {
    ...vnPkg,
    id: vnPkg.id,
    name: vnPkg.ten,
    ten: vnPkg.ten,
    ma_goi: vnPkg.ma_goi || vnPkg.ten || '',
    price,
    gia: price,
    duration,
    durationDays,
    chu_ky_ngay: durationDays,
    dataLimit: vnPkg.data_theo_ngay || '0 GB',
    data_theo_ngay: vnPkg.data_theo_ngay || '',
    data_meta: vnPkg.data_meta || null,
    dataPerDayGb: vnPkg.data_theo_ngay ? (parseFloat(vnPkg.data_theo_ngay.replace(',', '.').match(/(\d+(\.\d+)?)/)?.[1] || '0')) : 0,
    voiceFreeInternalMin,
    voiceFreeExternalMin,
    free_noi_mang: voiceFreeInternalMin,
    free_ngoai_mang: voiceFreeExternalMin,
    sms: typeof vnPkg.sms === 'number' ? vnPkg.sms : (parseInt(String(vnPkg.sms || '0')) || 0),
    socialFreeApps,
    description: vnPkg.uudaitrong || '',
    uudaitrong: vnPkg.uudaitrong || '',
    conditions: vnPkg.dieu_kien_dang_ky || vnPkg.doi_tuong_ap_dung || '',
    doi_tuong_ap_dung: vnPkg.dieu_kien_dang_ky || vnPkg.doi_tuong_ap_dung || '',
    tien_ich_free: vnPkg.tien_ich_free || null,
    noi_dung_ngoai: vnPkg.noi_dung_ngoai || null,
    dangky: vnPkg.dangky || null,
    huygiahan: vnPkg.huygiahan || null,
    huygoicuoc: vnPkg.huygoicuoc || null,
    dohot: vnPkg.dohot || 'normal',
    phan_loai_goi: vnPkg.phan_loai_goi || 'Data',
    terms: [
      vnPkg.chinh_sach_ap_dung || 'Áp dụng cho thuê bao Viettel di động.',
      vnPkg.dangky ? `Cách đăng ký: ${vnPkg.dangky}` : '',
      vnPkg.huygiahan ? `Hủy gia hạn: ${vnPkg.huygiahan}` : '',
      vnPkg.huygoicuoc ? `Hủy gói: ${vnPkg.huygoicuoc}` : ''
    ].filter(Boolean),
    isPopular: vnPkg.dohot === 'Hot',
    category,
    tags: vnPkg.dohot === 'Hot' ? ['Hot'] : [],
    loai_mang: vnPkg.loai_mang || '',
    is_addon: vnPkg.is_addon || false,
    is_long_term: vnPkg.is_long_term || false,
    requires_base_package: vnPkg.requires_base_package || false,
    system_type: vnPkg.system_type || '',
    allow_parallel_with: vnPkg.allow_parallel_with || [],
    benefit_group: vnPkg.benefit_group || ''
  };
}

// 1. Package APIs
export const packageApi = {
  fetchPackages: async (params: Record<string, any>): Promise<FetchPackagesResponse> => {
    const response = await axiosInstance.get<any>(API_BASE_URL, { params });
    const rawData = response.data;


    return {
      packages: (rawData.packages || []).map(toVietnamesePackage),
      page: rawData.page,
      limit: rawData.limit,
      totalPages: rawData.totalPages,
      totalItems: rawData.totalItems,
    };
  },

  fetchPackageById: async (id: string): Promise<Package> => {
    const response = await axiosInstance.get<any>(`${API_BASE_URL}/${id}`);


    return toVietnamesePackage(response.data);
  },

  fetchFilterOptions: async (): Promise<FilterOptions> => {
    const response = await axiosInstance.get<FilterOptions>(`${API_BASE_URL}/filter`);
    return response.data;
  },

  fetchCategories: async (): Promise<{ id: string; name: string; count: number }[]> => {
    const response = await axiosInstance.get(`${API_BASE_URL}/categories`);
    return response.data;
  },

  createPackage: async (pkg: Omit<Package, 'id' | 'phan_khuc_gia'>): Promise<{ success: boolean; package: Package }> => {
    const englishPkg = toEnglishPackage(pkg);
    const response = await axiosInstance.post<{ success: boolean; package: any }>(API_BASE_URL, englishPkg);
    return {
      success: response.data.success,
      package: toVietnamesePackage(response.data.package),
    };
  },

  updatePackage: async (id: string, pkg: Partial<Package>): Promise<{ success: boolean; package: Package }> => {
    const englishPkg = toEnglishPackage(pkg);
    const response = await axiosInstance.put<{ success: boolean; package: any }>(`${API_BASE_URL}/${id}`, englishPkg);
    return {
      success: response.data.success,
      package: toVietnamesePackage(response.data.package),
    };
  },

  deletePackage: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete<{ success: boolean; message: string }>(`${API_BASE_URL}/${id}`);
    return response.data;
  },
};

// 2. Authentication and Profile APIs
export const authApi = {
  login: async (phoneNumber: string, password?: string): Promise<{ token: string; user: User }> => {
    const response = await axiosInstance.post<{ success: boolean; message: string; data: { token: string; user: User } }>('/api/auth/login', {
      phoneNumber,
      password: password || 'password123'
    });
    return response.data.data;
  },

  register: async (name: string, phoneNumber: string, email: string, password?: string, subscriptionType?: string): Promise<{ token: string; user: User }> => {
    const response = await axiosInstance.post<{ success: boolean; message: string; data: { token: string; user: User } }>('/api/auth/register', {
      name,
      phoneNumber,
      email,
      password: password || 'password123',
      subscription_type: subscriptionType || 'tra_truoc'
    });
    return response.data.data;
  },

  getMe: async (): Promise<User> => {
    const response = await axiosInstance.get<{ success: boolean; data: { user: User } }>('/api/auth/me');
    return response.data.data.user;
  },

  updateProfile: async (name: string, email: string): Promise<User> => {
    const response = await axiosInstance.put<{ success: boolean; data: { user: User } }>('/api/auth/profile', { name, email });
    return response.data.data.user;
  },

  changePassword: async (oldPw: string, newPw: string): Promise<boolean> => {
    const response = await axiosInstance.put<{ success: boolean }>('/api/auth/change-password', {
      oldPassword: oldPw,
      newPassword: newPw
    });
    return response.data.success;
  },

  sendForgotPasswordOTP: async (phoneNumber: string, email: string): Promise<boolean> => {
    const response = await axiosInstance.post<{ success: boolean }>('/api/auth/forgot-password', {
      phone_number: phoneNumber,
      email
    });
    return response.data.success;
  },

  verifyForgotPasswordOTP: async (phoneNumber: string, otp: string): Promise<boolean> => {
    const response = await axiosInstance.post<{ success: boolean }>('/api/auth/verify-otp', {
      phone_number: phoneNumber,
      otp
    });
    return response.data.success;
  },

  resetForgotPassword: async (phoneNumber: string, otp: string, newPassword?: string): Promise<boolean> => {
    const response = await axiosInstance.post<{ success: boolean }>('/api/auth/reset-password', {
      phone_number: phoneNumber,
      otp,
      new_password: newPassword
    });
    return response.data.success;
  },

  deposit: async (amount: number, method: string): Promise<{ balance: number }> => {
    const response = await axiosInstance.post<{ success: boolean; data: { balance: number } }>('/api/auth/deposit', { amount, method });
    return response.data.data;
  },

  depositBlockchain: async (amount: number, txHash: string, walletAddress: string, network: string, depositId?: string | number): Promise<{ balance: number }> => {
    const response = await axiosInstance.post<{ success: boolean; data: { balance: number } }>('/api/auth/deposit', { amount, txHash, walletAddress, network, depositId });
    return response.data.data;
  },

  subscribePackage: async (packageId: string): Promise<{ balance: number; activePackage: any }> => {
    const response = await axiosInstance.post<{ success: boolean; data: { balance: number; activePackage: any } }>('/api/auth/subscribe', { packageId });
    return response.data.data;
  },

  checkSubscription: async (packageId: number, cycle: 'DAY' | 'MONTH' | 'YEAR'): Promise<any> => {
    const response = await axiosInstance.post('/api/subscriptions/check', { packageId, cycle });
    return response.data;
  },

  registerSubscription: async (packageId: number, cycle: 'DAY' | 'MONTH' | 'YEAR'): Promise<any> => {
    const response = await axiosInstance.post('/api/subscriptions/register', { packageId, cycle });
    return response.data;
  },

  fetchActiveSubscriptions: async (): Promise<any> => {
    const response = await axiosInstance.get('/api/subscriptions/active');
    return response.data;
  },

  fetchSubscriptionHistory: async (): Promise<any> => {
    const response = await axiosInstance.get('/api/subscriptions/history');
    return response.data;
  },

  unsubscribePackage: async (packageId: string): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>(`/api/auth/unsubscribe/${packageId}`);
    return response.data.success;
  },

  toggleAutoRenew: async (subscriptionId: string, autoRenew: boolean): Promise<any> => {
    if (subscriptionId === undefined || subscriptionId === null || autoRenew === undefined) {
      throw new Error("Invalid request parameters: subscriptionId or autoRenew is missing");
    }
    const response = await axiosInstance.post('/api/subscriptions/toggle-auto-renew', { subscriptionId, autoRenew });
    return response.data;
  },

  cancelSubscription: async (subscriptionId: string): Promise<any> => {
    if (subscriptionId === undefined || subscriptionId === null) {
      throw new Error("Invalid request parameters: subscriptionId is missing");
    }
    const response = await axiosInstance.post('/api/subscriptions/cancel', { subscriptionId });
    return response.data;
  },

  clearSubscriptionHistory: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/subscriptions/history');
    return response.data;
  },

  linkWallet: async (walletAddress: string): Promise<User> => {
    const response = await axiosInstance.put<{ success: boolean; data: { user: User } }>('/api/auth/wallet', { walletAddress });
    return response.data.data.user;
  }
};

// 3. Transactions APIs
export const transactionApi = {
  fetchTransactions: async (): Promise<Transaction[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Transaction[] }>('/api/transactions');
    return response.data.data;
  },

  createPendingDeposit: async (amount: number, network?: string, walletAddress?: string, txHash?: string): Promise<any> => {
    const response = await axiosInstance.post('/api/transactions/deposit/pending', { amount, network, walletAddress, txHash });
    return response.data;
  },

  cancelPendingDeposit: async (depositId?: string, txHash?: string): Promise<any> => {
    const response = await axiosInstance.post('/api/transactions/deposit/cancel', { depositId, txHash });
    return response.data;
  },

  clearAllTransactions: async (): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>('/api/transactions');
    return response.data.success;
  },

  fetchAdminStats: async (): Promise<{
    totalUsersCount: number;
    totalPackagesCount: number;
    totalRevenueVal: number;
    totalSubscriptionsCount: number;
    recentTransactions: any[];
    revenueTrends: { label: string; val: number }[];
  }> => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: any }>('/api/transactions/admin/stats');
      return response.data.data;
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=unauthorized';
      }
      throw error;
    }
  },

  fetchAdminStatsCards: async (): Promise<{
    totalUsersCount: number;
    totalPackagesCount: number;
    totalRevenueVal: number;
    totalSubscriptionsCount: number;
  }> => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: any }>('/api/transactions/admin/stats-cards');
      return response.data.data;
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=unauthorized';
      }
      throw error;
    }
  },

  fetchAdminRevenueChart: async (): Promise<{ label: string; val: number }[]> => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: any }>('/api/transactions/admin/revenue-chart');
      return response.data.data;
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=unauthorized';
      }
      throw error;
    }
  },

  fetchAdminRecentTransactions: async (page: number = 1, limit: number = 5, totalItems?: number): Promise<{ transactions: any[]; pagination: { currentPage: number; totalPages: number; totalItems: number; limit: number } }> => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: any; pagination: any }>('/api/transactions/admin/recent-transactions', {
        params: { page, limit, totalItems }
      });
      return {
        transactions: response.data.data || [],
        pagination: response.data.pagination || { currentPage: page, totalPages: 1, totalItems: 0, limit }
      };
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=unauthorized';
      }
      throw error;
    }
  },

  fetchAdminDeposits: async (params?: Record<string, any>): Promise<{ data: any[]; pagination: { currentPage: number; totalPages: number; totalItems: number; limit: number } }> => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: any[]; pagination: any }>('/api/transactions/admin/deposits', { params });
      return {
        data: response.data.data || [],
        pagination: response.data.pagination
      };
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=unauthorized';
      }
      throw error;
    }
  }
};



// 5. Chatbot APIs
export const chatbotApi = {
  sendMessage: async (message: string, sessionId?: string | null, guestInfo?: any): Promise<{ text: string; suggestedAction?: any; packages?: Package[]; recommendedPackages?: Package[] }> => {
    const response = await axiosInstance.post<{ success: boolean; message: string; data: any }>('/api/chatbot/message', {
      message,
      sessionId,
      guestInfo
    });

    const rawData = response.data.data;
    // Backend trả data là string thô (reply từ Ollama) hoặc object { text, suggestedAction, packages }
    if (typeof rawData === 'string') {
      return { text: rawData };
    }
    if (rawData && typeof rawData === 'object' && (rawData.text || rawData.message)) {
      return {
        text: rawData.text || rawData.message || '',
        suggestedAction: rawData.suggestedAction,
        packages: (rawData.packages || []).map(toVietnamesePackage),
        recommendedPackages: (rawData.recommendedPackages || rawData.packages || []).map(toVietnamesePackage)
      };
    }
    // Fallback: thử đọc từ message field nếu data không hợp lệ
    if (response.data.message && response.data.success) {
      console.warn('[ChatbotAPI] Falling back to response.data.message');
    }
    return { text: String(rawData ?? '') };
  },


  fetchHistory: async (): Promise<ChatMessage[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: any[] }>('/api/chatbot/history');
    return (response.data.data || []).map(msg => ({
      ...msg,
      matchedPackages: (msg.matchedPackages || msg.packages || []).map(toVietnamesePackage),
      packages: (msg.packages || msg.matchedPackages || []).map(toVietnamesePackage),
      recommendedPackages: (msg.recommendedPackages || msg.matchedPackages || msg.packages || []).map(toVietnamesePackage)
    }));
  },

  clearHistory: async (): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>('/api/chatbot/history');
    return response.data.success;
  },

  getAdminHistory: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: any[];
    pagination: { total: number; page: number; limit: number; pages: number }
  }> => {
    const response = await axiosInstance.get<{ success: boolean; data: any[]; pagination: any }>('/api/chatbot/admin/history', { params });
    const formattedData = (response.data.data || []).map(item => ({
      ...item,
      packages: (item.packages || []).map(toVietnamesePackage)
    }));
    return {
      data: formattedData,
      pagination: response.data.pagination
    };
  },

  getAdminSessionDetails: async (params: { sessionId?: string; userId?: string }): Promise<any[]> => {
    const cleanParams: Record<string, string> = {};
    if (params.sessionId && params.sessionId.trim()) cleanParams.sessionId = params.sessionId.trim();
    if (params.userId && params.userId.trim()) cleanParams.userId = params.userId.trim();

    const response = await axiosInstance.get<{ success: boolean; data: any[] }>('/api/chatbot/admin/history/details', { params: cleanParams });
    const formattedData = (response.data.data || []).map(item => ({
      ...item,
      packages: (item.packages || []).map(toVietnamesePackage)
    }));
    return formattedData;
  }
};

// 6. User Management APIs (Admin)
export const userApi = {
  fetchUsers: async (params?: Record<string, any>): Promise<{ data: User[]; page: number; limit: number; totalPages: number; totalItems: number }> => {
    const response = await axiosInstance.get<{ success: boolean; data: User[]; page: number; limit: number; totalPages: number; totalItems: number }>('/api/users', { params });
    return response.data;
  },

  updateUserBalance: async (userId: string, balance: number): Promise<boolean> => {
    const response = await axiosInstance.put<{ success: boolean }>(`/api/users/${userId}/balance`, { balance });
    return response.data.success;
  },

  updateUserStatus: async (userId: string, status: string): Promise<boolean> => {
    const response = await axiosInstance.put<{ success: boolean }>(`/api/users/${userId}/status`, { status });
    return response.data.success;
  },

  updateUser: async (userId: string, data: { subscription_type?: 'tra_truoc' | 'tra_sau'; is_loyal_customer?: boolean; status?: 'active' | 'blocked' | 'pending'; balance?: number }): Promise<boolean> => {
    const response = await axiosInstance.put<{ success: boolean }>(`/api/users/${userId}`, data);
    return response.data.success;
  }
};

// 7. Survey APIs
export const surveyApi = {
  fetchConfig: async (answers?: any): Promise<{ isCompleted: boolean; packages: Package[]; nextQuestion: any; remainingCount: number; currentStepNum?: number; totalFixedSteps?: number; isDynamicPhase?: boolean; message?: string }> => {
    const params = answers ? { answers: JSON.stringify(answers) } : undefined;
    const response = await axiosInstance.get<any>('/api/survey/config', { params });
    return {
      isCompleted: response.data.isCompleted,
      packages: (response.data.packages || []).map(toVietnamesePackage),
      nextQuestion: response.data.nextQuestion,
      remainingCount: response.data.remainingCount || 0,
      currentStepNum: response.data.currentStepNum || 1,
      totalFixedSteps: response.data.totalFixedSteps || 3,
      isDynamicPhase: response.data.isDynamicPhase || false,
      message: response.data.message
    };
  },

  submitAnswers: async (answers: any): Promise<{ isCompleted: boolean; answers: any; packages: Package[]; nextQuestion: any; remainingCount: number; currentStepNum?: number; totalFixedSteps?: number; isDynamicPhase?: boolean; message?: string }> => {
    const response = await axiosInstance.post<any>('/api/survey', { answers });
    return {
      isCompleted: response.data.isCompleted,
      answers: response.data.answers || answers,
      packages: (response.data.packages || []).map(toVietnamesePackage),
      nextQuestion: response.data.nextQuestion,
      remainingCount: response.data.remainingCount || 0,
      currentStepNum: response.data.currentStepNum || 1,
      totalFixedSteps: response.data.totalFixedSteps || 3,
      isDynamicPhase: response.data.isDynamicPhase || false,
      message: response.data.message
    };
  },

  fetchHistory: async (): Promise<{ hasHistory: boolean; answers?: any; packages?: Package[]; isCompleted?: boolean; message?: string }> => {
    const response = await axiosInstance.get<any>('/api/survey/history');
    return {
      hasHistory: response.data.hasHistory,
      answers: response.data.answers,
      packages: response.data.packages ? response.data.packages.map(toVietnamesePackage) : undefined,
      isCompleted: response.data.isCompleted,
      message: response.data.message
    };
  },

  deleteHistory: async (): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>('/api/survey/history');
    return response.data.success;
  },

  getAdminSurveys: async (params?: { search?: string }): Promise<any[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: any[] }>('/api/survey/admin/history', { params });
    return response.data.data;
  }
};

// 8. Compare APIs
export const compareApi = {
  saveSession: async (payload: any): Promise<any> => {
    const response = await axiosInstance.post('/api/compare/session', payload);
    return response.data;
  },
  closeSession: async (payload: any): Promise<any> => {
    const response = await axiosInstance.post('/api/compare/session/close', payload);
    return response.data;
  },
  analyzeAI: async (maGoiList: string[]): Promise<{ summary: string; differences?: string; cost_analysis?: string; best_value?: string; recommendation: string }> => {
    const response = await axiosInstance.post('/api/compare/ai-analyze', { maGoiList });
    return response.data.data;
  },
  fetchAnalytics: async (): Promise<any> => {
    try {
      const response = await axiosInstance.get('/api/compare/analytics');
      return response.data.data;
    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=unauthorized';
      }
      throw error;
    }
  }
};

// 9. Contact APIs
export const contactApi = {
  createContact: async (contactData: { full_name: string; phone: string; message: string; topic?: string }): Promise<{ success: boolean; message: string; data: Contact }> => {
    const response = await axiosInstance.post<{ success: boolean; message: string; data: Contact }>('/api/contact', contactData);
    return response.data;
  },

  fetchContacts: async (): Promise<Contact[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Contact[] }>('/api/contact');
    return response.data.data;
  },

  fetchContactById: async (id: string): Promise<Contact> => {
    const response = await axiosInstance.get<{ success: boolean; data: Contact }>(`/api/contact/${id}`);
    return response.data.data;
  },

  updateContactStatus: async (id: string, status: string): Promise<Contact> => {
    const response = await axiosInstance.patch<{ success: boolean; data: Contact }>(`/api/contact/${id}/status`, { status });
    return response.data.data;
  },

  updateContactNote: async (id: string, note: string): Promise<Contact> => {
    const response = await axiosInstance.patch<{ success: boolean; data: Contact }>(`/api/contact/${id}/note`, { admin_note: note });
    return response.data.data;
  },

  replyContact: async (contactId: string, admin_note: string, status?: string): Promise<Contact> => {
    const response = await axiosInstance.patch<{ success: boolean; data: Contact }>(`/api/contact/${contactId}/reply`, { admin_note, status });
    return response.data.data;
  },

  deleteAdminContact: async (contactId: string): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>(`/api/contact/${contactId}`);
    return response.data.success;
  },

  getAdminContacts: async (params?: { status?: string; search?: string; source?: string; is_deleted_by_user?: string }): Promise<Contact[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Contact[] }>('/api/contact', { params });
    return response.data.data;
  },

  getMyRequests: async (): Promise<Contact[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Contact[] }>('/api/contact/my-requests');
    return response.data.data;
  },

  getUserContactHistory: async (): Promise<Contact[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Contact[] }>('/api/contact/user-history');
    return response.data.data;
  },

  getGuestContactHistory: async (params: { contact_ids?: string[]; contact_id?: string; phone?: string }): Promise<Contact[]> => {
    const response = await axiosInstance.post<{ success: boolean; data: Contact[] }>('/api/contact/guest-history', params);
    return response.data.data;
  },

  softDeleteContact: async (id: string): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>(`/api/contact/history/${id}`);
    return response.data.success;
  },

  softDeleteAllContacts: async (contact_ids?: string[]): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>('/api/contact/history-all', {
      data: { contact_ids }
    });
    return response.data.success;
  },

  lookupContacts: async (phone: string, contactId?: string): Promise<Contact[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Contact[] }>('/api/contact/lookup', {
      params: { phone, contact_id: contactId }
    });
    return response.data.data;
  },

  guestLookup: async (phone: string, contactId?: string): Promise<Contact[]> => {
    const response = await axiosInstance.post<{ success: boolean; data: Contact[] }>('/api/contact/guest-lookup', {
      phone,
      contact_id: contactId
    });
    return response.data.data;
  }
};

// 10. Notification APIs
export const notificationApi = {
  fetchNotifications: async (): Promise<Notification[]> => {
    const response = await axiosInstance.get<{ success: boolean; data: Notification[] }>('/api/notifications');
    return response.data.data;
  },

  fetchUnreadCount: async (): Promise<number> => {
    const response = await axiosInstance.get<{ success: boolean; data: number }>('/api/notifications/unread/count');
    return response.data.data;
  },

  markAllAsRead: async (): Promise<boolean> => {
    const response = await axiosInstance.put<{ success: boolean }>('/api/notifications/read');
    return response.data.success;
  },

  markAsRead: async (id: string): Promise<boolean> => {
    const response = await axiosInstance.put<{ success: boolean }>(`/api/notifications/${id}/read`);
    return response.data.success;
  },

  softDeleteAll: async (): Promise<boolean> => {
    const response = await axiosInstance.delete<{ success: boolean }>('/api/notifications');
    return response.data.success;
  }
};



