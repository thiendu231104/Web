import { create } from 'zustand';
import type { User, Package, Transaction, ChatMessage, SurveyAnswers, Notification } from '../types';
import { packageApi, authApi, transactionApi, chatbotApi, surveyApi, notificationApi } from '../services/api';

export function isAllowedForUser(pkg: Package, user: any): boolean {
  // Hiện tại vẫn hiển thị bình thường.
  // Ở Sprint sau, có thể mở rộng:
  // if (pkg.doi_tuong_ap_dung?.includes('khach_hang_than_thiet') && user?.role !== 'loyalty') return false;
  if (pkg && user) {
    return true;
  }
  return true;
}

// ==========================================
// 1. AUTH STORE
// ==========================================
interface AuthState {
  currentUser: User | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  authChecked: boolean;
  login: (phoneNumber: string, password?: string) => Promise<boolean>;
  registerUser: (name: string, phoneNumber: string, email: string, password?: string, subscriptionType?: string) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<boolean>;
  changePassword: (oldPw: string, newPw: string) => Promise<boolean>;
  deposit: (amount: number, method: string) => Promise<boolean>;
  depositBlockchain: (amount: number, txHash: string, walletAddress: string, network: string, depositId?: string | number) => Promise<{ success: boolean; message: string; balance?: number }>;
  subscribePackage: (pkg: Package) => Promise<{ success: boolean; message: string }>;
  registerSubscription: (packageId: number, cycle: 'DAY' | 'MONTH' | 'YEAR') => Promise<{ success: boolean; message: string }>;
  unsubscribePackage: (packageId: string) => Promise<boolean>;
  toggleAutoRenew: (subscriptionId: string, autoRenew: boolean) => Promise<boolean>;
  cancelSubscription: (subscriptionId: string) => Promise<boolean>;
  clearSubscriptionHistory: () => Promise<boolean>;
  clearTransactionsHistory: () => Promise<boolean>;
  createPendingDeposit: (amount: number, network?: string, walletAddress?: string, txHash?: string) => Promise<any>;
  cancelPendingDeposit: (depositId?: string, txHash?: string) => Promise<boolean>;
  linkWalletAddress: (walletAddress: string) => Promise<{ success: boolean; message: string }>;
  activeSubscriptions: any[];
  subscriptionHistory: any[];
  checkSubscription: (packageId: number, cycle: 'DAY' | 'MONTH' | 'YEAR') => Promise<any>;
  fetchActiveSubscriptions: () => Promise<void>;
  fetchSubscriptionHistory: () => Promise<void>;
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAllNotificationsAsRead: () => Promise<boolean>;
  markNotificationAsRead: (id: string) => Promise<boolean>;
  clearNotifications: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  transactions: [],
  faqs: [],
  activeSubscriptions: [],
  subscriptionHistory: [],
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  authChecked: typeof window !== 'undefined' ? !localStorage.getItem('token') : true,

  login: async (phoneNumber, password) => {
    set({ loading: true, error: null });
    try {
      const data = await authApi.login(phoneNumber, password);
      localStorage.setItem('token', data.token);

      set({ currentUser: data.user, authChecked: true, loading: false });

      // Automatically fetch active subscriptions & history into global state
      await get().fetchActiveSubscriptions().catch(() => { });
      await get().fetchSubscriptionHistory().catch(() => { });

      // Auto fetch other details
      get().fetchTransactions().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });

      // Automatically reset survey state to clean initial state
      useSurveyStore.getState().resetSurvey().catch(() => { });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Thông tin đăng nhập không chính xác.',
        authChecked: true,
        loading: false
      });
      return false;
    }
  },

  registerUser: async (name, phoneNumber, email, password, subscriptionType) => {
    set({ loading: true, error: null });
    try {
      const data = await authApi.register(name, phoneNumber, email, password, subscriptionType);
      localStorage.setItem('token', data.token);
      set({ currentUser: data.user, authChecked: true, loading: false });

      // Automatically fetch active subscriptions & history into global state
      await get().fetchActiveSubscriptions().catch(() => { });
      await get().fetchSubscriptionHistory().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });

      // Automatically reset survey state to clean initial state
      useSurveyStore.getState().resetSurvey().catch(() => { });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Đăng ký tài khoản thất bại.',
        authChecked: true,
        loading: false
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('chatbot_session_id');
    localStorage.removeItem('guestId');
    localStorage.removeItem('sessionId');
    set({ currentUser: null, authChecked: true, transactions: [], activeSubscriptions: [], subscriptionHistory: [], notifications: [], unreadCount: 0 });
    // Reset chatbot state & survey state to clean initial state
    useChatbotStore.getState().resetChatbotSession();
    useSurveyStore.getState().resetSurvey().catch(() => { });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ authChecked: true, currentUser: null, activeSubscriptions: [], subscriptionHistory: [], notifications: [], unreadCount: 0 });
      return;
    }
    try {
      const user = await authApi.getMe();
      set({ currentUser: user, authChecked: true });

      // Run all initial global state fetches concurrently without resetting activeSubscriptions/subscriptionHistory beforehand
      await Promise.all([
        get().fetchActiveSubscriptions().catch((err) => console.error("fetchActiveSubscriptions error", err)),
        get().fetchSubscriptionHistory().catch((err) => console.error("fetchSubscriptionHistory error", err)),
        get().fetchTransactions().catch((err) => console.error("fetchTransactions error", err)),
        get().fetchNotifications().catch((err) => console.error("fetchNotifications error", err)),
        get().fetchUnreadCount().catch((err) => console.error("fetchUnreadCount error", err))
      ]);
    } catch (err) {
      console.error("Error fetching current user profile:", err);
      set({ currentUser: null, authChecked: true, activeSubscriptions: [], subscriptionHistory: [], notifications: [], unreadCount: 0 });
    }
  },

  fetchTransactions: async () => {
    try {
      const txs = await transactionApi.fetchTransactions();
      set({ transactions: txs });
    } catch (err) {
      console.error("Error fetching transactions:", err);
      throw err;
    }
  },

  updateProfile: async (name, email) => {
    try {
      const user = await authApi.updateProfile(name, email);
      set({ currentUser: user });
      return true;
    } catch (err) {
      console.error("Error updating profile:", err);
      return false;
    }
  },

  changePassword: async (oldPw, newPw) => {
    try {
      return await authApi.changePassword(oldPw, newPw);
    } catch (err) {
      console.error("Error changing password:", err);
      return false;
    }
  },

  deposit: async (amount, method) => {
    try {
      const result = await authApi.deposit(amount, method);
      set(state => ({
        currentUser: state.currentUser ? {
          ...state.currentUser,
          balance: result.balance
        } : null
      }));
      get().fetchTransactions().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });
      return true;
    } catch (err) {
      console.error("Error depositing wallet:", err);
      return false;
    }
  },

  depositBlockchain: async (amount, txHash, walletAddress, network, depositId) => {
    set({ loading: true, error: null });
    try {
      const result = await authApi.depositBlockchain(amount, txHash, walletAddress, network, depositId);
      set(state => ({
        currentUser: state.currentUser ? {
          ...state.currentUser,
          balance: result.balance
        } : null,
        loading: false
      }));
      get().fetchTransactions().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });
      return { success: true, message: 'Nạp tiền qua blockchain thành công!', balance: result.balance };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Nạp tiền qua blockchain thất bại.';
      set({ error: errMsg, loading: false });
      return { success: false, message: errMsg };
    }
  },

  subscribePackage: async (pkg) => {
    let cycle: 'DAY' | 'MONTH' | 'YEAR' = 'MONTH';
    const dayCycle = typeof pkg.chu_ky_ngay === 'number' ? pkg.chu_ky_ngay : parseInt(String(pkg.chu_ky_ngay || '30'), 10);
    if (dayCycle === 1) {
      cycle = 'DAY';
    } else if (dayCycle >= 360) {
      cycle = 'YEAR';
    }
    const pkgId = pkg.package_id !== undefined && pkg.package_id !== null ? pkg.package_id : (pkg.numericId || Number(pkg.id) || 0);
    return get().registerSubscription(pkgId, cycle);
  },

  registerSubscription: async (packageId, cycle) => {
    try {
      const result = await authApi.registerSubscription(packageId, cycle);

      // Immediately update the balance in store to synchronize the state
      if (result && result.balance !== undefined) {
        set(state => ({
          currentUser: state.currentUser ? {
            ...state.currentUser,
            balance: result.balance
          } : null
        }));
      }

      // Reload entire state from server to synchronize after registration/replacement
      await get().fetchMe();
      await get().fetchActiveSubscriptions().catch(() => { });
      await get().fetchSubscriptionHistory().catch(() => { });
      await get().fetchTransactions().catch(() => { });

      return { 
        success: true, 
        message: result?.message || 'Đăng ký gói cước thành công!',
        balance: result?.balance
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi đăng ký gói cước.';
      return { success: false, message: msg };
    }
  },

  checkSubscription: async (packageId, cycle) => {
    try {
      return await authApi.checkSubscription(packageId, cycle);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Lỗi kiểm tra đăng ký.');
    }
  },

  fetchActiveSubscriptions: async () => {
    try {
      const result = await authApi.fetchActiveSubscriptions();
      if (result && result.activePackages) {
        set({ activeSubscriptions: result.activePackages });
      } else {
        set({ activeSubscriptions: [] });
      }
    } catch (err) {
      console.error("Error fetching active subscriptions:", err);
      set({ activeSubscriptions: [] });
    }
  },

  fetchSubscriptionHistory: async () => {
    try {
      const result = await authApi.fetchSubscriptionHistory();
      if (result && result.success) {
        set({ subscriptionHistory: result.history || [] });
      } else {
        set({ subscriptionHistory: [] });
      }
    } catch (err) {
      console.error("Error fetching subscription history:", err);
      set({ subscriptionHistory: [] });
    }
  },

  unsubscribePackage: async (packageId) => {
    try {
      const success = await authApi.unsubscribePackage(packageId);
      if (success) {
        await get().fetchActiveSubscriptions().catch(() => { });
        await get().fetchSubscriptionHistory().catch(() => { });
        get().fetchTransactions().catch(() => { });
        get().fetchNotifications().catch(() => { });
        get().fetchUnreadCount().catch(() => { });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error unsubscribing package:", err);
      return false;
    }
  },

  toggleAutoRenew: async (subscriptionId, autoRenew) => {
    try {
      await authApi.toggleAutoRenew(subscriptionId, autoRenew);
      await get().fetchActiveSubscriptions().catch(() => { });
      await get().fetchSubscriptionHistory().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });
      return true;
    } catch (err) {
      console.error("Error toggling auto renew:", err);
      return false;
    }
  },

  cancelSubscription: async (subscriptionId) => {
    try {
      await authApi.cancelSubscription(subscriptionId);
      await get().fetchActiveSubscriptions().catch(() => { });
      await get().fetchSubscriptionHistory().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });
      return true;
    } catch (err) {
      console.error("Error cancelling subscription:", err);
      return false;
    }
  },

  clearSubscriptionHistory: async () => {
    try {
      await authApi.clearSubscriptionHistory();
      await get().fetchSubscriptionHistory().catch(() => { });
      return true;
    } catch (err) {
      console.error("Error clearing subscription history:", err);
      return false;
    }
  },

  clearTransactionsHistory: async () => {
    try {
      await transactionApi.clearAllTransactions();
      await get().fetchTransactions().catch(() => { });
      return true;
    } catch (err) {
      console.error("Error clearing transactions history:", err);
      return false;
    }
  },

  createPendingDeposit: async (amount: number, network?: string, walletAddress?: string, txHash?: string) => {
    try {
      const res = await transactionApi.createPendingDeposit(amount, network, walletAddress, txHash);
      await get().fetchTransactions().catch(() => { });
      return res;
    } catch (err) {
      console.error("Error creating pending deposit:", err);
      return null;
    }
  },

  cancelPendingDeposit: async (depositId?: string, txHash?: string) => {
    try {
      await transactionApi.cancelPendingDeposit(depositId, txHash);
      await get().fetchTransactions().catch(() => { });
      get().fetchNotifications().catch(() => { });
      get().fetchUnreadCount().catch(() => { });
      return true;
    } catch (err) {
      console.error("Error cancelling pending deposit:", err);
      return false;
    }
  },

  linkWalletAddress: async (walletAddress: string) => {
    set({ loading: true, error: null });
    try {
      const user = await authApi.linkWallet(walletAddress);
      set({ currentUser: user, loading: false });
      return { success: true, message: 'Liên kết địa chỉ ví thành công!' };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Liên kết địa chỉ ví thất bại.';
      set({ error: errMsg, loading: false });
      return { success: false, message: errMsg };
    }
  },

  fetchNotifications: async () => {
    try {
      const list = await notificationApi.fetchNotifications();
      set({ notifications: list });
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationApi.fetchUnreadCount();
      set({ unreadCount: count });
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const success = await notificationApi.markAllAsRead();
      if (success) {
        set(state => ({
          unreadCount: 0,
          notifications: state.notifications.map(n => ({ ...n, status: 'READ' }))
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error marking all as read:", err);
      return false;
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      const success = await notificationApi.markAsRead(id);
      if (success) {
        set(state => ({
          unreadCount: Math.max(0, state.unreadCount - 1),
          notifications: state.notifications.map(n => n._id === id ? { ...n, status: 'READ' } : n)
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error marking single as read:", err);
      return false;
    }
  },

  clearNotifications: async () => {
    try {
      const success = await notificationApi.softDeleteAll();
      if (success) {
        set({ notifications: [], unreadCount: 0 });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error clearing notifications:", err);
      return false;
    }
  }
}));



// ==========================================
// 2. PACKAGE STORE
// ==========================================
interface PackageFilters {
  category: string;
  price: string;
  cycle: string;
  network: string;
  data: string;
  call: string;
  sms: string;
  hot: string;
  recommended: string;
  target: string;
  promo: string;
  keyword: string;
}

interface PackageState {
  packages: Package[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  totalItems: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
  filters: PackageFilters;
  search: string;
  sort: string;
  compareList: Package[];
  currentPackage: Package | null;
  addToCompare: (pkg: Package) => { success: boolean; message: string };
  removeFromCompare: (packageId: string) => void;
  clearCompare: () => void;
  fetchPackages: (params?: Record<string, any>) => Promise<void>;
  fetchPackageById: (id: string) => Promise<void>;
  addPackage: (pkg: Omit<Package, 'id' | 'phan_khuc_gia'>) => Promise<boolean>;
  updatePackage: (id: string, updated: Partial<Package>) => Promise<boolean>;
  deletePackage: (id: string) => Promise<boolean>;
  setFilter: (key: keyof PackageFilters, value: string) => void;
  setSearch: (value: string) => void;
  setSort: (value: string) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const INITIAL_FILTERS: PackageFilters = {
  category: 'all',
  price: 'all',
  cycle: 'all',
  network: 'all',
  data: 'all',
  call: 'all',
  sms: 'all',
  hot: 'all',
  recommended: 'all',
  target: '',
  promo: 'all',
  keyword: '',
};

const INITIAL_PAGINATION = {
  page: 1,
  limit: 8,
  totalPages: 1,
  totalItems: 0,
};

export const usePackageStore = create<PackageState>((set, get) => ({
  packages: [],
  loading: false,
  error: null,
  totalPages: 1,
  totalItems: 0,
  pagination: INITIAL_PAGINATION,
  filters: INITIAL_FILTERS,
  search: '',
  sort: 'popular',
  compareList: [],
  currentPackage: null,

  addToCompare: (pkg) => {
    let result = { success: true, message: 'Đã thêm vào danh sách so sánh.' };
    set(state => {
      const targetMaGoi = (pkg.ma_goi || pkg.id || '').trim();
      if (state.compareList.some(p => (p.ma_goi || p.id || '').trim() === targetMaGoi)) {
        result = { success: false, message: 'Gói cước này đã có trong danh sách so sánh.' };
        return state;
      }
      if (state.compareList.length >= 3) {
        result = { success: false, message: 'Bạn chỉ có thể so sánh tối đa 3 gói cước.' };
        return state;
      }
      return { compareList: [...state.compareList, pkg] };
    });
    return result;
  },

  removeFromCompare: (packageId) => {
    const targetKey = String(packageId).trim();
    set(state => ({
      compareList: state.compareList.filter(p => (p.ma_goi || p.id || '').trim() !== targetKey)
    }));
  },

  clearCompare: () => {
    set({ compareList: [] });
  },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
      pagination: { ...state.pagination, page: 1 }
    }));
  },

  setSearch: (value) => {
    set(state => ({
      search: value,
      pagination: { ...state.pagination, page: 1 }
    }));
  },

  setSort: (value) => {
    set({ sort: value });
  },

  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page }
    }));
  },

  reset: () => {
    set({
      filters: INITIAL_FILTERS,
      search: '',
      sort: 'popular',
      pagination: INITIAL_PAGINATION,
      totalPages: 1,
      totalItems: 0
    });
  },

  fetchPackages: async (params) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const mergedParams = {
        page: 1,
        limit: 999, // Fetch all packages so client can filter/paginate locally
        search: state.search,
        ...params
      };

      const data = await packageApi.fetchPackages(mergedParams);

      set({
        packages: data.packages || [],
        totalPages: data.totalPages || 1,
        totalItems: data.totalItems || 0,
        loading: false
      });
    } catch (err: any) {
      console.error("Error fetching packages from API:", err);
      set({
        error: err.response?.data?.message || 'Không thể tải danh sách gói cước.',
        packages: [],
        loading: false
      });
    }
  },

  fetchPackageById: async (id) => {
    set({ loading: true, error: null, currentPackage: null });
    try {
      const pkg = await packageApi.fetchPackageById(id);

      set({ currentPackage: pkg, loading: false });
    } catch (err: any) {
      console.error(`Error fetching package ${id} from API:`, err);
      set({
        error: err.response?.data?.message || 'Không thể tải chi tiết gói cước.',
        loading: false
      });
    }
  },

  addPackage: async (newPkg) => {
    set({ loading: true, error: null });
    try {
      const res = await packageApi.createPackage(newPkg);
      if (res.success) {
        set(state => ({
          packages: [res.package, ...state.packages],
          loading: false
        }));
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err: any) {
      console.error("Error creating package:", err);
      set({
        error: err.response?.data?.message || 'Không thể tạo gói cước mới.',
        loading: false
      });
      return false;
    }
  },

  updatePackage: async (id, updated) => {
    set({ loading: true, error: null });
    try {
      const res = await packageApi.updatePackage(id, updated);
      if (res.success) {
        set(state => ({
          packages: state.packages.map(p => p.id === id ? res.package : p),
          compareList: state.compareList.map(p => p.id === id ? res.package : p),
          loading: false
        }));
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err: any) {
      console.error("Error updating package:", err);
      set({
        error: err.response?.data?.message || 'Không thể cập nhật gói cước.',
        loading: false
      });
      return false;
    }
  },

  deletePackage: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await packageApi.deletePackage(id);
      if (res.success) {
        set(state => ({
          packages: state.packages.filter(p => p.id !== id),
          compareList: state.compareList.filter(p => p.id !== id),
          loading: false
        }));
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err: any) {
      console.error("Error deleting package:", err);
      set({
        error: err.response?.data?.message || 'Không thể xóa gói cước.',
        loading: false
      });
      return false;
    }
  }
}));

// ==========================================
// 3. CHATBOT STORE
// ==========================================
interface ChatbotState {
  messages: ChatMessage[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  hydrateHistory: () => Promise<void>;
  resetChatbotSession: () => void;
}

const INITIAL_WELCOME_MSG: ChatMessage = {
  id: 'msg_welcome',
  sender: 'bot',
  text: 'Xin chào! Tôi là trợ lý ảo Viettel AI. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi về các gói cước như: thoại, data khủng, mạng xã hội, hoặc làm khảo sát nhu cầu nhé!',
  createdAt: new Date().toISOString()
};

export const useChatbotStore = create<ChatbotState>((set) => ({
  messages: [INITIAL_WELCOME_MSG],
  isOpen: false,

  setIsOpen: (isOpen) => set({ isOpen }),

  resetChatbotSession: () => {
    localStorage.removeItem('chatbot_session_id');
    localStorage.removeItem('guestId');
    localStorage.removeItem('sessionId');
    set({ messages: [INITIAL_WELCOME_MSG] });
  },

  sendMessage: async (text) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      sender: 'user',
      text,
      createdAt: new Date().toISOString()
    };

    set(state => ({ messages: [...state.messages, userMsg] }));

    try {
      let sessionId = null;
      const currentUser = useAuthStore.getState().currentUser;
      if (!currentUser) {
        sessionId = localStorage.getItem('chatbot_session_id');
        if (!sessionId) {
          sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
          localStorage.setItem('chatbot_session_id', sessionId);
        }
      }
      const botResponse = await chatbotApi.sendMessage(text, sessionId, null);
      const botMsg: ChatMessage = {
        id: `msg_${Date.now()}_bot`,
        sender: 'bot',
        text: botResponse.text,
        suggestedAction: botResponse.suggestedAction,
        packages: botResponse.packages,
        recommendedPackages: botResponse.recommendedPackages,
        createdAt: new Date().toISOString()
      };
      set(state => ({ messages: [...state.messages, botMsg] }));
    } catch (err) {
      console.error("Error sending message to chatbot:", err);
      const botMsg: ChatMessage = {
        id: `msg_${Date.now()}_bot_err`,
        sender: 'bot',
        text: 'Rất tiếc, tôi đang gặp lỗi kết nối hệ thống chatbot. Vui lòng thử lại sau ít phút.',
        createdAt: new Date().toISOString()
      };
      set(state => ({ messages: [...state.messages, botMsg] }));
    }
  },

  clearHistory: async () => {
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser) {
      try {
        await chatbotApi.clearHistory();
      } catch (err) {
        console.error("Error clearing chatbot history on server:", err);
      }
    }
    set({ messages: [INITIAL_WELCOME_MSG] });
  },

  hydrateHistory: async () => {
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser) {
      try {
        const history = await chatbotApi.fetchHistory();
        if (history && history.length > 0) {
          set({ messages: history });
        } else {
          set({ messages: [INITIAL_WELCOME_MSG] });
        }
      } catch (err) {
        console.error("Error fetching chatbot history:", err);
      }
    } else {
      set({ messages: [INITIAL_WELCOME_MSG] });
    }
  }
}));

// ==========================================
// 4. SURVEY STORE
// ==========================================

interface SurveyState {
  answers: SurveyAnswers;
  nextQuestion: any;
  recommendedPackages: Package[];
  isCompleted: boolean;
  remainingCount: number;
  currentStepNum: number;
  totalFixedSteps: number;
  isDynamicPhase: boolean;
  surveyMessage: string;
  loading: boolean;
  hasHistory: boolean;
  historyStack: SurveyAnswers[];
  setAnswerAndSubmit: (field: string, value: any) => Promise<void>;
  goBack: () => Promise<void>;
  resetSurvey: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchHistory: () => Promise<boolean>;
  deleteHistory: () => Promise<void>;
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  answers: {},
  nextQuestion: null,
  recommendedPackages: [],
  isCompleted: false,
  remainingCount: 0,
  currentStepNum: 1,
  totalFixedSteps: 2,
  isDynamicPhase: false,
  surveyMessage: '',
  loading: false,
  hasHistory: false,
  historyStack: [],

  setAnswerAndSubmit: async (field, value) => {
    set({ loading: true });
    try {
      const currentAnswers = get().answers;
      const currentStack = get().historyStack;
      
      const newAnswers = {
        ...currentAnswers,
        [field]: value
      };

      const res = await surveyApi.submitAnswers(newAnswers);
      
      set({
        answers: res.answers,
        nextQuestion: res.nextQuestion,
        recommendedPackages: res.packages,
        isCompleted: res.isCompleted,
        remainingCount: res.remainingCount,
        currentStepNum: res.currentStepNum || 1,
        totalFixedSteps: res.totalFixedSteps || 2,
        isDynamicPhase: res.isDynamicPhase || false,
        surveyMessage: res.message || '',
        historyStack: [...currentStack, currentAnswers],
        loading: false
      });
    } catch (err) {
      console.error("Error submitting survey answer:", err);
      set({ loading: false });
    }
  },

  goBack: async () => {
    const stack = get().historyStack;
    if (stack.length === 0) return;
    
    set({ loading: true });
    const prevAnswers = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);

    try {
      const res = await surveyApi.submitAnswers(prevAnswers);
      set({
        answers: res.answers,
        nextQuestion: res.nextQuestion,
        recommendedPackages: res.packages,
        isCompleted: res.isCompleted,
        remainingCount: res.remainingCount,
        currentStepNum: res.currentStepNum || 1,
        totalFixedSteps: res.totalFixedSteps || 2,
        isDynamicPhase: res.isDynamicPhase || false,
        surveyMessage: res.message || '',
        historyStack: newStack,
        loading: false
      });
    } catch (err) {
      console.error("Error going back in survey:", err);
      set({ loading: false });
    }
  },

  resetSurvey: async () => {
    set({ loading: true, answers: {}, historyStack: [], isCompleted: false, recommendedPackages: [], nextQuestion: null, remainingCount: 0, currentStepNum: 1, totalFixedSteps: 2, isDynamicPhase: false });
    try {
      const res = await surveyApi.fetchConfig({});
      set({
        nextQuestion: res.nextQuestion,
        recommendedPackages: res.packages,
        isCompleted: res.isCompleted,
        remainingCount: res.remainingCount,
        currentStepNum: res.currentStepNum || 1,
        totalFixedSteps: res.totalFixedSteps || 2,
        isDynamicPhase: res.isDynamicPhase || false,
        surveyMessage: res.message || '',
        loading: false
      });
    } catch (err) {
      console.error("Error resetting survey:", err);
      set({ loading: false });
    }
  },

  fetchConfig: async () => {
    set({ loading: true });
    try {
      const res = await surveyApi.fetchConfig(get().answers);
      set({
        nextQuestion: res.nextQuestion,
        recommendedPackages: res.packages,
        isCompleted: res.isCompleted,
        remainingCount: res.remainingCount,
        currentStepNum: res.currentStepNum || 1,
        totalFixedSteps: res.totalFixedSteps || 3,
        isDynamicPhase: res.isDynamicPhase || false,
        surveyMessage: res.message || '',
        loading: false
      });
    } catch (err) {
      console.error("Error fetching survey config:", err);
      set({ loading: false });
    }
  },

  fetchHistory: async () => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) return false;

    set({ loading: true });
    try {
      const res = await surveyApi.fetchHistory();
      if (res.hasHistory && res.packages && res.packages.length > 0) {
        set({
          answers: res.answers || {},
          recommendedPackages: res.packages,
          isCompleted: true,
          hasHistory: true,
          remainingCount: res.packages.length,
          surveyMessage: res.message || '',
          loading: false
        });
        return true;
      }
      set({ hasHistory: false, loading: false });
      return false;
    } catch (err) {
      console.error("Error fetching survey history:", err);
      set({ hasHistory: false, loading: false });
      return false;
    }
  },

  deleteHistory: async () => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) return;

    set({ loading: true });
    try {
      await surveyApi.deleteHistory();
      set({
        answers: {},
        historyStack: [],
        recommendedPackages: [],
        nextQuestion: null,
        isCompleted: false,
        hasHistory: false,
        remainingCount: 0,
        currentStepNum: 1,
        totalFixedSteps: 2,
        isDynamicPhase: false,
        loading: false
      });
      get().fetchConfig();
    } catch (err) {
      console.error("Error deleting survey history:", err);
      set({ loading: false });
    }
  }
}));

