import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, CreditCard, History, Check, Eye, EyeOff, Copy, ExternalLink, Clock, KeyRound, RotateCcw, X } from 'lucide-react';
import { useAuthStore } from '../store';
import SEO from '../components/SEO';
import { useWeb3 } from '../hooks/useWeb3';
import { getBlockchainConfig } from '../services/web3Service';
import type { Transaction, Package } from '../types';
import RegisterModal from '../components/RegisterModal';
import { packageApi } from '../services/api';

// Format datetime in Asia/Ho_Chi_Minh timezone
const formatDateTime = (dateInput: string | Date | number): string => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('vi-VN', options);
  const parts = formatter.formatToParts(d);

  let hour = '00', minute = '00', day = '01', month = '01', year = '2026';
  for (const part of parts) {
    if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'year') year = part.value;
  }

  return `${hour}:${minute} - ${day}/${month}/${year}`;
};

// Schemas for forms
const profileSchema = z.object({
  name: z.string().min(2, { message: 'Họ tên phải chứa ít nhất 2 ký tự' }),
  email: z.string().email({ message: 'Địa chỉ email không hợp lệ' })
});

const passwordSchema = z.object({
  oldPassword: z.string().min(6, { message: 'Mật khẩu cũ phải từ 6 ký tự' }),
  newPassword: z.string().min(6, { message: 'Mật khẩu mới phải từ 6 ký tự' }),
  confirmNewPassword: z.string().min(6, { message: 'Nhập lại mật khẩu mới' })
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Mật khẩu mới nhập lại không trùng khớp',
  path: ['confirmNewPassword']
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;



export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    authChecked,
    transactions,
    fetchTransactions,
    updateProfile,
    changePassword,
    depositBlockchain,
    activeSubscriptions,
    subscriptionHistory,
    cancelSubscription,
    toggleAutoRenew,
    clearSubscriptionHistory,
    clearTransactionsHistory,
    createPendingDeposit,
    cancelPendingDeposit
  } = useAuthStore();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.endsWith('/deposit')) return 'topup';
    if (path.endsWith('/subscriptions') || path.endsWith('/subscription-history')) return 'subscriptions';
    if (path.endsWith('/history')) return 'history';
    if (path.endsWith('/change-password')) return 'change-password';
    return 'info';
  };
  const activeTab = getActiveTab();


  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Wallet states
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);


  // Subscription cancellation states
  const [cancellingPkgId, setCancellingPkgId] = useState<string | null>(null);
  const [cancellingAutoRenewPkgId, setCancellingAutoRenewPkgId] = useState<string | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  // Show/Hide password states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submitting states to prevent double submits
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isTogglingRenew, setIsTogglingRenew] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);
  const showDetailModal = !!selectedTxDetail;

  // Re-registration & Filter states
  const [selectedRegisterPkg, setSelectedRegisterPkg] = useState<Package | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'CANCELLED' | 'EXPIRED' | 'REPLACED'>('ALL');

  // Transaction History Filter & Soft Delete States
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'purchase' | 'cancelled'>('all');
  const [showClearTxModal, setShowClearTxModal] = useState(false);
  const [isClearingTx, setIsClearingTx] = useState(false);

  const handleConfirmClearTxHistory = async () => {
    setIsClearingTx(true);
    try {
      const success = await clearTransactionsHistory();
      if (success) {
        showToast('success', 'Xóa tất cả lịch sử giao dịch thành công.');
        await fetchTransactions().catch(() => {});
      } else {
        showToast('error', 'Xóa lịch sử giao dịch thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Xóa lịch sử giao dịch thất bại.');
    } finally {
      setIsClearingTx(false);
      setShowClearTxModal(false);
    }
  };

  const handleCancelPendingTransaction = async (tx: Transaction) => {
    try {
      const success = await cancelPendingDeposit(tx.id, tx.txHash);
      if (success) {
        showToast('success', 'Đã hủy lệnh nạp tiền thành công.');
        await fetchTransactions().catch(() => {});
      } else {
        showToast('error', 'Hủy lệnh nạp tiền thất bại.');
      }
    } catch (err: any) {
      showToast('error', 'Hủy lệnh nạp tiền thất bại.');
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (txFilter === 'cancelled') {
      return transactions.filter(t => t.status === 'cancelled' || t.status === 'failed');
    }
    const activeOrPending = transactions.filter(t => t.status !== 'cancelled' && t.status !== 'failed');
    if (txFilter === 'deposit') {
      return activeOrPending.filter(t => t.type === 'deposit' || t.direction === 'PLUS');
    }
    if (txFilter === 'purchase') {
      return activeOrPending.filter(t => t.type === 'purchase' || t.type === 'subscribe' || t.direction === 'MINUS');
    }
    return activeOrPending;
  }, [transactions, txFilter]);

  const handleReRegisterClick = async (sub: any) => {
    try {
      const pkgId = sub.packageId || sub.packageCode;
      if (pkgId) {
        const fullPkg = await packageApi.fetchPackageById(String(pkgId));
        if (fullPkg && fullPkg.ten) {
          setSelectedRegisterPkg(fullPkg);
          setIsRegisterModalOpen(true);
          return;
        }
      }
    } catch (err) {
      console.warn("Fetch package by id failed, using fallback sub details:", err);
    }

    const fallbackPkg: any = {
      id: sub.packageId,
      numericId: Number(sub.packageId) || 0,
      ten: sub.packageName || String(sub.packageId).toUpperCase(),
      ma_goi: String(sub.packageId).toUpperCase(),
      gia: sub.price || 0,
      chu_ky_ngay: sub.cycle === 'DAY' ? '1' : sub.cycle === 'YEAR' ? '365' : '30',
      dieu_kien_dang_ky: 'Áp dụng cho thuê bao Viettel di động.'
    };
    setSelectedRegisterPkg(fallbackPkg);
    setIsRegisterModalOpen(true);
  };

  // Web3 MetaMask hook and integration states
  const { isInstalled, isConnected, walletAddress, isSepolia, connect, switchToSepolia, checkConnection } = useWeb3();
  const { linkWalletAddress } = useAuthStore();

  useEffect(() => {
    if (activeTab === 'topup') {
      checkConnection();
    }
  }, [activeTab, checkConnection]);

  // React Hook Forms (Declared at the top before any conditional returns to respect hook order)
  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfileForm, formState: { errors: profileErrors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: ''
    }
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema)
  });

  // Reset profile form values when currentUser is populated/changed
  useEffect(() => {
    if (currentUser) {
      resetProfileForm({
        name: currentUser.name ?? '',
        email: currentUser.email ?? ''
      });
    }
  }, [currentUser, resetProfileForm]);

  // Lớp 1: Khóa hành vi F5 / Tắt Tab / Đóng trình duyệt khi đang nạp tiền
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDepositing) {
        e.preventDefault();
        e.returnValue = 'Giao dịch đang được xử lý trên Blockchain. Vui lòng không đóng hoặc tải lại trang để tránh mất tiền tài khoản!';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDepositing]);

  // Lớp 2: Chặn điều hướng nội bộ trong ứng dụng (Click Navbar, Footer, Chuyển trang...) khi đang nạp tiền
  useEffect(() => {
    if (!isDepositing) return;

    const handleInternalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button, [role="button"], [href]');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        setToastMsg({ type: 'error', text: 'Giao dịch nạp tiền đang được xử lý, bạn không thể rời trang lúc này.' });
        setTimeout(() => setToastMsg(null), 3000);
      }
    };

    window.addEventListener('click', handleInternalClick, true);
    return () => window.removeEventListener('click', handleInternalClick, true);
  }, [isDepositing]);

  const handleConnectWallet = async () => {
    const res = await connect();
    const config = getBlockchainConfig();
    if (res.success && res.address) {
      showToast('success', 'Kết nối MetaMask thành công!');
      if (!res.isSepolia) {
        showToast('error', `Vui lòng chuyển mạng sang ${config.networkName} để tiếp tục.`);
        return;
      }

      // Auto-link to account on backend!
      const linkRes = await linkWalletAddress(res.address);

      if (linkRes.success) {
        showToast('success', 'Liên kết ví thành công!');
      } else {
        showToast('error', linkRes.message || 'Liên kết ví thất bại.');
      }
    } else {
      showToast('error', res.error || 'Kết nối ví bị từ chối hoặc thất bại.');
    }
  };

  const handleSwitchNetwork = async () => {
    const success = await switchToSepolia();
    const config = getBlockchainConfig();
    if (success) {
      showToast('success', `Chuyển sang mạng ${config.networkName} thành công!`);
    } else {
      showToast('error', 'Chuyển mạng thất bại. Vui lòng thử lại.');
    }
  };

  const handlePresetSelect = (presetVal: number) => {
    setSelectedPreset(presetVal);
    setCustomAmountStr(String(presetVal));
  };

  const handleCustomAmountInput = (val: string) => {
    const numericString = val.replace(/\D/g, '');
    setSelectedPreset(null);
    setCustomAmountStr(numericString);
  };

  const getSummaryAmount = () => {
    if (selectedPreset !== null) {
      return selectedPreset.toLocaleString('vi-VN') + ' VNĐ';
    }
    if (!customAmountStr) {
      return '0 VNĐ';
    }
    return Number(customAmountStr).toLocaleString('vi-VN') + ' VNĐ';
  };

  const handleBlockchainDeposit = async () => {
    let vndAmount = 0;
    if (selectedPreset !== null) {
      vndAmount = selectedPreset;
    } else if (customAmountStr) {
      vndAmount = parseInt(customAmountStr, 10) || 0;
    }

    if (vndAmount < 10000) {
      showToast('error', 'Số tiền nạp tối thiểu là 10.000 VNĐ');
      return;
    }

    if (!isConnected || !walletAddress || !isSepolia) {
      showToast('error', 'Vui lòng kết nối ví MetaMask trên đúng mạng Sepolia.');
      return;
    }

    setIsDepositing(true);
    let pendingDepId: any = undefined;
    try {
      const pendingRes = await createPendingDeposit(vndAmount, 'Sepolia', walletAddress);
      if (pendingRes && pendingRes.success && pendingRes.data) {
        pendingDepId = pendingRes.data.deposit_id || pendingRes.data._id;
      }
    } catch (pendingErr) {
      console.warn("Failed to create pending deposit:", pendingErr);
    }
    try {
      const config = getBlockchainConfig();
      const provider = new ethers.BrowserProvider((window as any).ethereum);

      const networkObj = await provider.getNetwork();
      if (String(networkObj.chainId) !== String(config.chainIdDecimal)) {
        showToast('error', `Vui lòng chuyển mạng sang ${config.networkName} để thực hiện giao dịch.`);
        setIsDepositing(false);
        return;
      }

      const balance = await provider.getBalance(walletAddress);

      const exchangeRate = parseFloat(import.meta.env.VITE_ETH_EXCHANGE_RATE || '75000000');
      const ethAmountVal = vndAmount / exchangeRate;
      const ethAmountString = ethAmountVal.toFixed(18);
      const valueWei = ethers.parseEther(ethAmountString);

      const signer = await provider.getSigner();
      let gasEstimate = 21000n;
      try {
        gasEstimate = await signer.estimateGas({
          to: config.receiverWallet,
          value: valueWei
        });
      } catch (gasErr) {
        console.warn('Gas estimation failed, using standard transaction gas limit', gasErr);
      }

      let feeData = null;
      let gasPrice = ethers.parseUnits('10', 'gwei');
      try {
        feeData = await provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('10', 'gwei');
      } catch (feeErr) {
        console.warn('Failed to get fee data, falling back to legacy gas price:', feeErr);
        try {
          const rawGasPrice = await provider.send('eth_gasPrice', []);
          gasPrice = BigInt(rawGasPrice);
        } catch (innerErr) {
          console.warn('Fallback to static gas price of 10 gwei');
        }
      }

      const totalGasCost = gasEstimate * gasPrice;
      const totalRequired = valueWei + totalGasCost;

      if (balance < totalRequired) {
        showToast('error', 'Số dư tài khoản ETH không đủ để thanh toán giá trị giao dịch và phí gas.');
        setIsDepositing(false);
        return;
      }

      let txResponse;
      try {
        if (feeData && feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          txResponse = await signer.sendTransaction({
            to: config.receiverWallet,
            value: valueWei,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
          });
        } else {
          txResponse = await signer.sendTransaction({
            to: config.receiverWallet,
            value: valueWei,
            gasPrice: gasPrice
          });
        }
      } catch (txErr: any) {
        console.warn('EIP-1559 transaction failed or maxPriorityFeePerGas unsupported, falling back to legacy transaction:', txErr);
        txResponse = await signer.sendTransaction({
          to: config.receiverWallet,
          value: valueWei,
          gasPrice: gasPrice
        });
      }

      showToast('success', 'Giao dịch đã được gửi lên Blockchain. Vui lòng chờ xác nhận...');

      const receipt = await txResponse.wait();
      if (!receipt || receipt.status !== 1) {
        throw new Error('Giao dịch Blockchain thất bại hoặc không được xác nhận.');
      }

      const res = await depositBlockchain(vndAmount, receipt.hash, walletAddress, config.networkName, pendingDepId);

      if (res.success) {
        showToast('success', `Nạp tiền thành công! Đã cộng ${vndAmount.toLocaleString('vi-VN')} VNĐ vào số dư tài khoản.`);
        setSelectedPreset(null);
        setCustomAmountStr('');
      } else {
        showToast('error', res.message || 'Xác nhận nạp tiền thất bại.');
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      if (pendingDepId) {
        await cancelPendingDeposit(pendingDepId.toString()).catch(() => {});
      } else {
        await cancelPendingDeposit().catch(() => {});
      }
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('User denied')) {
        showToast('error', 'Giao dịch đã bị hủy bởi người dùng.');
      } else {
        showToast('error', err.message || 'Có lỗi xảy ra trong quá trình nạp tiền.');
      }
    } finally {
      setIsDepositing(false);
    }
  };

  // If user is not logged in, redirect to login
  useEffect(() => {
    if (!authChecked) return;

    if (!currentUser) {
      navigate('/login');
    } else {
      useAuthStore.getState().fetchTransactions().catch(() => { });
    }
  }, [currentUser, authChecked, navigate]);

  useEffect(() => {
    if (activeTab === 'subscriptions' && currentUser) {
      useAuthStore.getState().fetchActiveSubscriptions().catch(() => { });
      useAuthStore.getState().fetchSubscriptionHistory().catch(() => { });
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeTab === 'history' && currentUser) {
      const loadHistory = async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
          await useAuthStore.getState().fetchTransactions();
        } catch (err: any) {
          setHistoryError(err.response?.data?.message || err.message || 'Không thể tải lịch sử giao dịch. Vui lòng thử lại sau.');
        } finally {
          setHistoryLoading(false);
        }
      };
      loadHistory();
    }
  }, [activeTab, currentUser]);



  const formatHash = (hash: string) => {
    if (!hash) return '—';
    if (hash.length <= 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const handleCopyHash = async (hash: string) => {
    if (!hash) {
      showToast('error', 'Không tìm thấy mã giao dịch.');
      return;
    }
    try {
      await navigator.clipboard.writeText(hash);
      showToast('success', 'Đã sao chép mã giao dịch!');
    } catch (err) {
      showToast('error', 'Không thể sao chép mã giao dịch.');
    }
  };

  const handleOpenExplorer = (hash: string) => {
    if (!hash || !hash.startsWith('0x')) {
      showToast('error', 'Mã giao dịch không hợp lệ hoặc không có trên Explorer.');
      return;
    }
    window.open(`https://sepolia.etherscan.io/tx/${hash}`, '_blank', 'noopener,noreferrer');
  };


  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Đang xác thực tài khoản...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-sm space-y-4">
          <p className="text-slate-555 text-xs font-bold">Không thể tải thông tin tài khoản. Vui lòng đăng nhập lại.</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl transition-all text-xs focus:outline-none"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsSubmittingProfile(true);
    try {
      const success = await updateProfile(data.name, data.email);
      if (success) {
        showToast('success', 'Cập nhật thông tin cá nhân thành công!');
      } else {
        showToast('error', 'Cập nhật thông tin cá nhân thất bại.');
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast('error', 'Cập nhật thông tin cá nhân thất bại.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsSubmittingPassword(true);
    try {
      const success = await changePassword(data.oldPassword, data.newPassword);
      if (success) {
        showToast('success', 'Thay đổi mật khẩu thành công!');
        resetPasswordForm();
      } else {
        showToast('error', 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.');
      }
    } catch (err) {
      console.error("Error changing password:", err);
      showToast('error', 'Đổi mật khẩu thất bại.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };



  const handleToggleAutoRenew = async (pkgId: string, autoRenewVal: boolean) => {
    setIsTogglingRenew(true);
    try {
      const success = await toggleAutoRenew(pkgId, autoRenewVal);
      if (success) {
        showToast('success', autoRenewVal ? 'Đã bật gia hạn tự động.' : 'Đã tắt gia hạn tự động.');
      } else {
        showToast('error', 'Thay đổi gia hạn tự động thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Thay đổi gia hạn tự động thất bại.');
    } finally {
      setIsTogglingRenew(false);
      setCancellingAutoRenewPkgId(null);
    }
  };

  const handleConfirmToggleAutoRenewFalse = async () => {
    if (cancellingAutoRenewPkgId) {
      await handleToggleAutoRenew(cancellingAutoRenewPkgId, false);
    }
  };

  const handleConfirmCancel = async () => {
    if (cancellingPkgId) {
      setIsCancellingSubscription(true);
      try {
        const success = await cancelSubscription(cancellingPkgId);
        if (success) {
          showToast('success', 'Đã hủy đăng ký gói cước thành công.');
        } else {
          showToast('error', 'Hủy đăng ký gói cước thất bại.');
        }
      } catch (err: any) {
        console.error(err);
        showToast('error', 'Hủy đăng ký gói cước thất bại.');
      } finally {
        setIsCancellingSubscription(false);
        setCancellingPkgId(null);
      }
    }
  };

  const handleConfirmClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      const success = await clearSubscriptionHistory();
      if (success) {
        showToast('success', 'Xóa lịch sử đăng ký thành công.');
        await useAuthStore.getState().fetchSubscriptionHistory().catch(() => { });
        await useAuthStore.getState().fetchActiveSubscriptions().catch(() => { });
      } else {
        showToast('error', 'Xóa lịch sử đăng ký thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Xóa lịch sử đăng ký thất bại.');
    } finally {
      setIsClearingHistory(false);
      setShowClearHistoryModal(false);
    }
  };

  const getCancellingPkgCode = (subId: string | null) => {
    if (!subId) return '';
    const sub = activeSubscriptions.find(s => s.subscriptionId === subId);
    return sub ? (sub.packageName || sub.packageId).toUpperCase() : '';
  };

  const tabs = [
    { id: 'info', label: 'Hồ sơ cá nhân', icon: User, path: '/profile' },
    { id: 'topup', label: 'Nạp tiền tài khoản', icon: CreditCard, path: '/profile/deposit' },
    { id: 'subscriptions', label: 'Lịch sử đăng ký gói cước', icon: Clock, path: '/profile/subscriptions' },
    { id: 'history', label: 'Lịch sử giao dịch', icon: History, path: '/profile/history' },
    { id: 'change-password', label: 'Đổi mật khẩu', icon: KeyRound, path: '/profile/change-password' }
  ];

  // Breadcrumbs schema for Profile Page
  const profileBreadcrumbsSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Trang chủ",
        "item": window.location.origin
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Hồ sơ cá nhân",
        "item": `${window.location.origin}/profile`
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-16 relative animate-fade-in text-xs font-semibold">
      {/* SEO configuration */}
      <SEO
        title="Quản Lý Tài Khoản Khách Hàng - Cổng Thông Tin Viettel AI"
        description="Quản lý hồ sơ cá nhân, đổi mật khẩu bảo mật, xem các gói cước đang hoạt động và nạp tiền tài khoản ảo phục vụ đăng ký gói cước Viettel di động."
        schema={profileBreadcrumbsSchema}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{ zIndex: 9999 }}
          className={`fixed top-20 right-6 px-4 py-3 rounded-lg shadow-lg border-l-4 text-xs font-semibold bg-white text-slate-800 ${toastMsg.type === 'success' ? 'border-emerald-500' : 'border-red-500'
            }`}>
          {toastMsg.text}
        </div>
      )}

      {/* Left Column: Navigation Tabs Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl space-y-4 text-left">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-white text-base">
              {(currentUser?.name || 'U').charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">{currentUser?.name || ''}</h3>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">{currentUser?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</span>
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left focus:outline-none cursor-pointer ${isSelected
                    ? 'bg-red-50/70 text-primary border-l-2 border-primary pl-4'
                    : 'text-slate-550 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Tabs Content Area */}
      <div className="lg:col-span-3">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
          {/* Tab 1: Profile Info & Change Password */}
          {activeTab === 'info' && (
            <div className="space-y-8 text-left">
              <div className="border-b border-slate-50 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Hồ sơ cá nhân</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Quản lý và điều chỉnh thông tin liên lạc của bạn.</p>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.phoneNumber || ''}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-405 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại tài khoản</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.role === 'admin' ? 'Quản trị viên (Admin)' : 'Thuê bao di động'}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-405 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại thuê bao</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.subscription_type === 'tra_sau' ? 'Trả sau' : 'Trả trước'}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-405 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái KHTT</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.is_loyal_customer ? 'Khách hàng thân thiết (KHTT)' : 'Thành viên thường'}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-405 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái tài khoản</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.status === 'blocked' ? 'Bị khóa' : currentUser?.status === 'pending' ? 'Chờ kích hoạt' : 'Đang hoạt động'}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-405 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ và tên</label>
                  <input
                    type="text"
                    {...registerProfile('name')}
                    className={`w-full bg-slate-50 border ${profileErrors.name ? 'border-red-500' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                      } rounded-xl py-2.5 px-3.5 text-xs text-slate-700 focus:outline-none transition-colors input-premium-focus`}
                  />
                  {profileErrors.name && <p className="text-[9px] text-red-500 mt-0.5">{profileErrors.name.message}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa chỉ Email</label>
                  <input
                    type="text"
                    {...registerProfile('email')}
                    className={`w-full bg-slate-50 border ${profileErrors.email ? 'border-red-500' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                      } rounded-xl py-2.5 px-3.5 text-xs text-slate-700 focus:outline-none transition-colors input-premium-focus`}
                  />
                  {profileErrors.email && <p className="text-[9px] text-red-500 mt-0.5">{profileErrors.email.message}</p>}
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile}
                    className="bg-primary hover:bg-primary-hover disabled:bg-slate-150 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
                  >
                    {isSubmittingProfile ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: MetaMask Topup & Connection */}
          {activeTab === 'topup' && (
            <div className="space-y-6 text-left max-w-xl">
              <div className="border-b border-slate-50 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Cổng nạp tiền ví</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">
                  Kết nối ví MetaMask và nạp tiền vào tài khoản.
                </p>
              </div>

              {/* 1. Card kết nối MetaMask */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-lg select-none">
                    🦊
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Ví MetaMask</h3>
                    {isConnected && walletAddress && (
                      <p className="text-xs font-mono text-slate-500 mt-0.5 break-all select-all leading-normal">
                        {walletAddress}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  {!isInstalled ? (
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-xs border border-slate-200"
                    >
                      Cài đặt MetaMask
                    </a>
                  ) : !isConnected ? (
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                    >
                      Kết nối MetaMask
                    </button>
                  ) : !isSepolia ? (
                    <button
                      type="button"
                      onClick={handleSwitchNetwork}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                    >
                      Chuyển mạng sang {getBlockchainConfig().networkName}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-default"
                    >
                      <Check className="w-4 h-4 text-emerald-650" />
                      <span>Đã kết nối</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Thiết kế khu vực nạp tiền */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Nạp tiền vào tài khoản</h3>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">
                    Chọn số tiền bạn muốn nạp vào tài khoản.
                  </p>
                </div>

                {/* 3. Các mức tiền có sẵn */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Mức tiền có sẵn
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`py-2.5 px-2 text-center rounded-xl border text-xs font-bold transition-all focus:outline-none cursor-pointer ${selectedPreset === preset
                          ? 'bg-red-50 border-primary text-primary shadow-sm'
                          : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                      >
                        {preset.toLocaleString('vi-VN')} VNĐ
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Nhập số tiền tùy chỉnh */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Số tiền muốn nạp
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Nhập số tiền..."
                      value={customAmountStr ? Number(customAmountStr).toLocaleString('vi-VN') : ''}
                      onChange={(e) => handleCustomAmountInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2.5 pl-3.5 pr-14 text-xs text-slate-700 focus:outline-none transition-colors input-premium-focus font-bold"
                    />
                    <span className="absolute right-4 text-slate-500 font-bold text-xs pointer-events-none select-none">
                      VNĐ
                    </span>
                  </div>
                </div>

                {/* 6. Tóm tắt giao dịch & 7. Nút thanh toán */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      Số tiền sẽ nạp:
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {getSummaryAmount()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBlockchainDeposit}
                    disabled={!(isConnected && walletAddress && isSepolia) || isDepositing}
                    className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer animate-scale-up"
                  >
                    {isDepositing ? 'Đang nạp tiền...' : 'Nạp tiền'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unified Tab: Subscription Management & History */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-8 text-left">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Lịch sử & Quản lý đăng ký gói cước</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Danh sách gói cước đang hoạt động và toàn bộ lịch sử đăng ký của thuê bao.</p>
              </div>

              {/* ⚡ PHẦN 1: GÓI CƯỚC ĐANG HOẠT ĐỘNG */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-base">⚡</span>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Gói cước đang hoạt động
                  </h3>
                </div>

                {(activeSubscriptions || []).length > 0 ? (
                  <div className="space-y-4">
                    {(activeSubscriptions || []).map((ap) => {
                      const cycleText = ap.cycle === 'DAY' ? '1 ngày' : ap.cycle === 'YEAR' ? '365 ngày' : '30 ngày';
                      return (
                        <div
                          key={ap.packageId}
                          className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 relative overflow-hidden"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-base font-extrabold text-slate-900 uppercase">{ap.packageName || ap.packageId.toUpperCase()}</h4>
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                ĐANG HOẠT ĐỘNG
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <p>Kích hoạt: <span className="text-slate-800 font-extrabold">{formatDateTime(ap.activatedAt)}</span></p>
                              <p>Hết hạn: <span className="text-slate-800 font-extrabold">{formatDateTime(ap.expiresAt)}</span></p>
                              <p>Chu kỳ: <span className="text-slate-800 font-extrabold">{cycleText}</span></p>
                              {ap.data_theo_ngay && ap.data_theo_ngay !== '0' && (
                                <p>Data chính: <span className="text-slate-800 font-extrabold">{ap.data_theo_ngay}</span></p>
                              )}
                              {ap.data_meta && ap.data_meta !== '0' && (
                                <p>Data MXH: <span className="text-blue-600 font-extrabold">{ap.data_meta}</span></p>
                              )}
                              {ap.support_auto_renew !== false && (
                                ap.autoRenew !== false ? (
                                  <p>Gia hạn: <span className="text-primary font-extrabold">TỰ ĐỘNG</span></p>
                                ) : (
                                  <p>Gia hạn: <span className="text-amber-600 font-extrabold">ĐÃ TẮT GIA HẠN TỰ ĐỘNG</span></p>
                                )
                              )}
                            </div>
                            {ap.support_auto_renew !== false && ap.autoRenew === false && (
                              <div className="mt-2 flex items-center space-x-1.5 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                <span>🟠 Sẽ ngừng sử dụng khi hết hạn</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0 md:items-center">
                            {ap.support_auto_renew !== false ? (
                              ap.autoRenew !== false ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setCancellingAutoRenewPkgId(ap.subscriptionId)}
                                    className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-all text-center focus:outline-none cursor-pointer"
                                  >
                                    Hủy gia hạn
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCancellingPkgId(ap.subscriptionId)}
                                    className="text-xs font-bold text-primary hover:bg-red-50 border border-red-150 px-4 py-2.5 rounded-xl transition-all text-center focus:outline-none cursor-pointer"
                                  >
                                    Hủy đăng ký
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAutoRenew(ap.subscriptionId, true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl transition-all text-center focus:outline-none cursor-pointer"
                                  >
                                    Gia hạn lại
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCancellingPkgId(ap.subscriptionId)}
                                    className="text-xs font-bold text-primary hover:bg-red-50 border border-red-150 px-4 py-2.5 rounded-xl transition-all text-center focus:outline-none cursor-pointer"
                                  >
                                    Hủy đăng ký
                                  </button>
                                </>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCancellingPkgId(ap.subscriptionId)}
                                className="text-xs font-bold text-primary hover:bg-red-50 border border-red-150 px-4 py-2.5 rounded-xl transition-all text-center focus:outline-none cursor-pointer"
                              >
                                Hủy đăng ký
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200/50 p-8 rounded-2xl text-center max-w-md mx-auto space-y-3">
                    <p className="text-slate-500 text-xs font-medium">Bạn hiện chưa đăng ký gói cước di động nào đang hoạt động.</p>
                    <button
                      onClick={() => navigate('/packages')}
                      className="bg-primary hover:bg-primary-hover text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors focus:outline-none cursor-pointer shadow-sm"
                    >
                      Xem các gói cước ngay
                    </button>
                  </div>
                )}
              </div>

              {/* 📜 PHẦN 2: LỊCH SỬ DÙNG GÓI CƯỚC */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">📜</span>
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Lịch sử đăng ký gói cước
                    </h3>
                  </div>

                  {(() => {
                    const rawHistory = (subscriptionHistory || []).filter(sub => {
                      const isExpired = sub.status === 'ACTIVE' && new Date(sub.expiresAt) <= new Date();
                      return sub.status === 'CANCELLED' || sub.status === 'EXPIRED' || sub.status === 'REPLACED' || isExpired;
                    });
                    if (rawHistory.length > 0) {
                      return (
                        <button
                          type="button"
                          onClick={() => setShowClearHistoryModal(true)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-150 px-3.5 py-1.5 rounded-xl transition-all focus:outline-none cursor-pointer"
                        >
                          Xóa tất cả lịch sử đã hủy/hết hạn
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Filter Bar */}
                <div className="flex items-center">
                  <div className="bg-gray-100/80 p-1 inline-flex gap-1 rounded-lg">
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'CANCELLED', label: 'Đã hủy' },
                      { key: 'EXPIRED', label: 'Hết hạn' },
                      { key: 'REPLACED', label: 'Bị thay thế' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setHistoryStatusFilter(f.key as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${historyStatusFilter === f.key
                            ? 'bg-red-600 text-white font-medium shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Data */}
                {(() => {
                  const historyList = (subscriptionHistory || [])
                    .filter(sub => {
                      const isExpired = sub.status === 'ACTIVE' && new Date(sub.expiresAt) <= new Date();
                      const subStatus = isExpired ? 'EXPIRED' : sub.status;

                      if (!['CANCELLED', 'EXPIRED', 'REPLACED'].includes(subStatus)) return false;

                      if (historyStatusFilter === 'ALL') return true;
                      return subStatus === historyStatusFilter;
                    })
                    .sort((a, b) => new Date(b.activatedAt || b.registeredAt || 0).getTime() - new Date(a.activatedAt || a.registeredAt || 0).getTime());

                  if (historyList.length > 0) {
                    return (
                      <div 
                        className="overflow-x-auto overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-sm custom-scrollbar" 
                        style={{ maxHeight: '485px' }}
                      >
                        <style>{`
                          .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                            height: 6px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 3px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                          }
                        `}</style>
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_rgba(229,231,235,1)]">
                            <tr className="text-gray-500 font-semibold text-xs uppercase tracking-wider">
                              <th className="py-3.5 px-4 text-left bg-gray-50">Tên gói</th>
                              <th className="py-3.5 px-4 text-left bg-gray-50">Ngày đăng ký</th>
                              <th className="py-3.5 px-4 text-left bg-gray-50">Ngày hết hạn</th>
                              <th className="py-3.5 px-4 text-left bg-gray-50">Chu kỳ</th>
                              <th className="py-3.5 px-4 text-center bg-gray-50">Trạng thái</th>
                              <th className="py-3.5 px-4 text-center bg-gray-50">Hành động</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-slate-700 font-semibold">
                            {historyList.map((sub) => {
                              const isExpired = sub.status === 'ACTIVE' && new Date(sub.expiresAt) <= new Date();
                              const subStatus = isExpired ? 'EXPIRED' : sub.status;
                              const subId = String(sub.subscriptionId || sub._id);

                              return (
                                <tr key={subId} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-3.5 px-4 text-left font-bold text-slate-900 uppercase">
                                    {sub.packageName || sub.packageId}
                                  </td>
                                  <td className="py-3.5 px-4 text-left text-slate-550">
                                    {formatDateTime(sub.activatedAt)}
                                  </td>
                                  <td className="py-3.5 px-4 text-left text-slate-550">
                                    {formatDateTime(sub.expiresAt)}
                                  </td>
                                  <td className="py-3.5 px-4 text-left text-slate-800">
                                    {sub.cycle === 'DAY' ? '1 ngày' : sub.cycle === 'YEAR' ? '365 ngày' : '30 ngày'}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {subStatus === 'REPLACED' ? (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                                        Bị thay thế
                                      </span>
                                    ) : subStatus === 'CANCELLED' ? (
                                      <span className="bg-red-50 text-red-700 border border-red-100 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                                        Đã hủy
                                      </span>
                                    ) : (
                                      <span className="bg-slate-50 text-slate-500 border border-slate-205 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                                        Hết hạn
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleReRegisterClick(sub)}
                                      className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all font-medium px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Đăng ký lại</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-slate-50 border border-slate-200/50 p-8 rounded-2xl text-center max-w-md mx-auto space-y-3">
                        <p className="text-slate-500 text-xs font-semibold">Chưa có lịch sử các gói cước đã hủy hoặc hết hạn.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* Tab 5: Change Password */}
          {activeTab === 'change-password' && (
            <div className="space-y-6 text-left">
              <div className="border-b border-slate-50 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Thay đổi mật khẩu</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Mật khẩu mới phải dài tối thiểu 6 ký tự để bảo mật.</p>
              </div>

              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu hiện tại</label>
                  <div className="relative flex items-center">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu cũ..."
                      {...registerPassword('oldPassword')}
                      className={`w-full bg-slate-50 border ${passwordErrors.oldPassword ? 'border-red-500' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                        } rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-700 focus:outline-none transition-colors input-premium-focus`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      aria-label={showOldPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.oldPassword && <p className="text-[9px] text-red-500 mt-0.5">{passwordErrors.oldPassword.message}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu mới</label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Mật khẩu mới..."
                      {...registerPassword('newPassword')}
                      className={`w-full bg-slate-50 border ${passwordErrors.newPassword ? 'border-red-500' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                        } rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-700 focus:outline-none transition-colors input-premium-focus`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && <p className="text-[9px] text-red-500 mt-0.5">{passwordErrors.newPassword.message}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhập lại mật khẩu</label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới..."
                      {...registerPassword('confirmNewPassword')}
                      className={`w-full bg-slate-50 border ${passwordErrors.confirmNewPassword ? 'border-red-500' : 'border-slate-200 focus:border-primary/50 focus:bg-white'
                        } rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-700 focus:outline-none transition-colors input-premium-focus`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmNewPassword && <p className="text-[9px] text-red-500 mt-0.5">{passwordErrors.confirmNewPassword.message}</p>}
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-605 hover:text-slate-950 px-5 py-2.5 rounded-xl text-xs transition-colors font-bold focus:outline-none cursor-pointer"
                  >
                    {isSubmittingPassword ? 'Đang thay đổi...' : 'Thay đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 4: Transaction Ledger History */}
          {activeTab === 'history' && (
            <div className="space-y-6 text-left">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lịch sử giao dịch</h2>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">
                    Xem lại nhật ký các biến động nạp tiền và thanh toán gói cước của bạn.
                  </p>
                </div>

                {transactions && transactions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearTxModal(true)}
                    className="px-3.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Xóa tất cả lịch sử giao dịch
                  </button>
                )}
              </div>

              {/* Filter Chips / Bar */}
              <div className="flex items-center space-x-2">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'deposit', label: 'Nạp tiền (+)' },
                  { key: 'purchase', label: 'Trừ tiền (-)' },
                  { key: 'cancelled', label: 'Đã hủy' }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTxFilter(f.key as any)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer border ${
                      txFilter === f.key
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {historyLoading ? (
                /* Skeleton Loading state */
                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-4 whitespace-nowrap">Thời gian</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Loại giao dịch</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Mô tả</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Số tiền</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[1, 2, 3].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                          <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                          <td className="p-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                          <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                          <td className="p-4"><div className="h-5 bg-slate-100 rounded-full w-16"></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : historyError ? (
                /* Error State */
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center space-x-2 font-medium">
                  <span>⚠️ Lỗi tải dữ liệu: {historyError}</span>
                </div>
              ) : filteredTransactions.length > 0 ? (
                /* Data State */
                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-4 whitespace-nowrap">Thời gian</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Loại giao dịch</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Mô tả</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Số tiền</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {filteredTransactions.map((tx) => {
                        const isPlus = tx.type === 'deposit' || tx.direction === 'PLUS';
                        const isCancelled = tx.status === 'cancelled' || tx.status === 'failed';
                        const isPending = tx.status === 'pending';

                        return (
                          <tr
                            key={tx.id}
                            onClick={() => setSelectedTxDetail(tx)}
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="py-2.5 px-4 text-slate-500 font-semibold whitespace-nowrap text-xs">
                              {formatDateTime(tx.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 font-bold whitespace-nowrap text-xs">
                              {isPlus ? (
                                <span className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                                  💰 Nạp tiền
                                </span>
                              ) : (
                                <span className="text-rose-700 font-extrabold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px]">
                                  📱 Mua gói
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap text-xs font-bold text-slate-900">
                              {tx.packageName || tx.description || (isPlus ? 'Nạp tiền vào tài khoản' : 'Thanh toán gói cước')}
                            </td>
                            <td className={`py-2.5 px-4 font-bold text-xs whitespace-nowrap ${
                              isCancelled
                                ? 'text-slate-400 line-through font-semibold'
                                : isPlus
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}>
                              {isCancelled ? '' : isPlus ? '+' : '-'}
                              {tx.amount ? tx.amount.toLocaleString('vi-VN') : 0} VNĐ
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap text-xs">
                              {tx.status === 'success' ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                  Thành công
                                </span>
                              ) : isPending ? (
                                <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                                  Đang xử lý
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                  Đã hủy
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="text-2xl mb-2">💳</div>
                  <p className="text-xs font-bold text-slate-700">Chưa có lịch sử giao dịch nào</p>
                  <p className="text-[11px] text-slate-400 mt-1">Các giao dịch nạp tiền hoặc thanh toán gói cước sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {/* Subscription Full Cancel Confirmation Modal */}
      {cancellingPkgId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-md animate-scale-up z-50 text-left">
            <h4 className="text-base font-extrabold text-slate-900 mb-2">Hủy đăng ký gói cước</h4>
            <div className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold">
              <p>Bạn có chắc chắn muốn hủy gói cước <strong className="text-primary">{getCancellingPkgCode(cancellingPkgId)}</strong> không?</p>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                <li>Gói sẽ ngừng sử dụng ngay lập tức.</li>
                <li>Thao tác này không thể hoàn tác.</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button
                disabled={isCancellingSubscription}
                onClick={() => setCancellingPkgId(null)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                disabled={isCancellingSubscription}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isCancellingSubscription ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Unsubscribe Auto-Renew Confirmation Modal */}
      {cancellingAutoRenewPkgId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-md animate-scale-up z-50 text-left">
            <h4 className="text-base font-extrabold text-slate-900 mb-2">Hủy gia hạn gói cước</h4>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn hủy gia hạn gói cước <strong className="text-primary">{getCancellingPkgCode(cancellingAutoRenewPkgId)}</strong>?
              Bạn vẫn tiếp tục sử dụng dung lượng còn lại cho đến hết thời hạn chu kỳ hiện tại.
            </p>
            <div className="flex space-x-3">
              <button
                disabled={isTogglingRenew}
                onClick={() => setCancellingAutoRenewPkgId(null)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={isTogglingRenew}
                onClick={handleConfirmToggleAutoRenewFalse}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isTogglingRenew ? 'Đang tắt...' : 'Đồng ý hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Subscription History Confirmation Modal */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-md animate-scale-up z-50 text-left">
            <h4 className="text-base font-extrabold text-slate-900 mb-2">Xóa lịch sử đăng ký gói cước</h4>
            <div className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold space-y-2">
              <p>Bạn có chắc chắn muốn xóa lịch sử đăng ký gói cước không?</p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-amber-700 text-[10px] space-y-1">
                <p>Lưu ý:</p>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>Chỉ xóa lịch sử hiển thị.</li>
                  <li>Không ảnh hưởng đến các gói đang hoạt động.</li>
                  <li>Không ảnh hưởng đến số dư tài khoản.</li>
                  <li>Không ảnh hưởng đến dữ liệu thanh toán.</li>
                </ul>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                disabled={isClearingHistory}
                onClick={() => setShowClearHistoryModal(false)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                disabled={isClearingHistory}
                onClick={handleConfirmClearHistory}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isClearingHistory ? 'Đang xóa...' : 'Xóa lịch sử'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Transactions Confirmation Modal */}
      {showClearTxModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-md animate-scale-up z-50 text-left">
            <h4 className="text-base font-extrabold text-slate-900 mb-2">Xóa lịch sử giao dịch</h4>
            <div className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold space-y-2">
              <p>Bạn có chắc chắn muốn xóa toàn bộ lịch sử giao dịch không?</p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-amber-700 text-[10px] space-y-1">
                <p>Lưu ý:</p>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>Thao tác này chỉ ẩn lịch sử hiển thị của bạn.</li>
                  <li>Không ảnh hưởng đến số dư tài khoản hiện tại.</li>
                  <li>Không ảnh hưởng đến trạng thái các gói cước đang dùng.</li>
                </ul>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                disabled={isClearingTx}
                onClick={() => setShowClearTxModal(false)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl text-xs transition-colors font-bold focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                disabled={isClearingTx}
                onClick={handleConfirmClearTxHistory}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isClearingTx ? 'Đang xóa...' : 'Xóa tất cả'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDetailModal && selectedTxDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-up z-50 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Chi Tiết Giao Dịch</h3>
              <button
                type="button"
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-700 font-medium">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Trạng thái</span>
                <span>
                  {selectedTxDetail.status === 'success' ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                      Thành công
                    </span>
                  ) : selectedTxDetail.status === 'pending' ? (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] animate-pulse">
                      Đang xử lý
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                      Thất bại / Đã hủy
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Số tiền giao dịch</span>
                <span className={`font-extrabold text-sm ${
                  (selectedTxDetail.type === 'deposit' || selectedTxDetail.direction === 'PLUS')
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}>
                  {(selectedTxDetail.type === 'deposit' || selectedTxDetail.direction === 'PLUS') ? '+' : '-'}
                  {selectedTxDetail.amount ? selectedTxDetail.amount.toLocaleString('vi-VN') : 0} VNĐ
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mô tả / Nội dung</span>
                <span className="font-bold text-slate-900 text-right">
                  {selectedTxDetail.packageName || selectedTxDetail.description || ((selectedTxDetail.type === 'deposit' || selectedTxDetail.direction === 'PLUS') ? 'Nạp tiền vào tài khoản' : 'Thanh toán gói cước')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Thời gian chi tiết</span>
                <span className="font-bold text-slate-800 font-mono text-[11px]">
                  {formatDateTime(selectedTxDetail.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mã giao dịch / TxHash</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono font-bold text-slate-800 text-[11px] select-all">
                    {formatHash(selectedTxDetail.txHash || selectedTxDetail.id)}
                  </span>
                  {selectedTxDetail.txHash && (
                    <button
                      type="button"
                      onClick={() => handleCopyHash(selectedTxDetail.txHash || '')}
                      title="Sao chép mã giao dịch"
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {selectedTxDetail.walletAddress && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Ví gửi</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] select-all">
                    {formatHash(selectedTxDetail.walletAddress)}
                  </span>
                </div>
              )}

              {(selectedTxDetail.type === 'deposit' || selectedTxDetail.direction === 'PLUS') && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Ví nhận</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] select-all">
                    {formatHash(import.meta.env.VITE_RECEIVER_WALLET || '0x4f3e...5e89')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Phương thức / Mạng</span>
                <span className="font-bold text-slate-800">
                  {selectedTxDetail.network || selectedTxDetail.paymentMethod || 'Hệ thống'}
                </span>
              </div>
            </div>

            <div className="mt-5 flex space-x-3">
              {selectedTxDetail.status === 'pending' && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleCancelPendingTransaction(selectedTxDetail);
                    setSelectedTxDetail(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
                >
                  Hủy lệnh nạp này
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTxDetail(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
              >
                Đóng
              </button>
              {selectedTxDetail.txHash && selectedTxDetail.txHash.startsWith('0x') && (
                <button
                  type="button"
                  onClick={() => handleOpenExplorer(selectedTxDetail.txHash || '')}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Xem Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Re-Register Package Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        pkg={selectedRegisterPkg}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setSelectedRegisterPkg(null);
        }}
        onSuccess={(msg) => {
          showToast('success', msg || 'Đăng ký lại gói cước thành công!');
          useAuthStore.getState().fetchActiveSubscriptions().catch(() => { });
          useAuthStore.getState().fetchSubscriptionHistory().catch(() => { });
          useAuthStore.getState().fetchMe().catch(() => { });
        }}
        onError={(msg) => {
          showToast('error', msg || 'Đăng ký lại thất bại.');
        }}
      />
    </div>
  );
}
