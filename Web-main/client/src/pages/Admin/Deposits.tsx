import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  X, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { transactionApi } from '../../services/api';
import { TableRowSkeleton } from '../../components/Skeleton';

interface DepositTransaction {
  deposit_id: number;
  user_id: number;
  phoneNumber: string;
  fullname: string;
  amountVND: number;
  amountETH: string;
  txHash: string;
  network: string;
  status: string;
  isDeleted?: boolean;
  created_at: string;
}

export default function AdminDeposits() {
  const [depositsList, setDepositsList] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Search & Filters states
  const [searchVal, setSearchVal] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' means All
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Search Debounce (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchVal);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const loadDeposits = async () => {
    setLoading(true);
    try {
      const response = await transactionApi.fetchAdminDeposits({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter,
        search: searchKeyword
      });
      setDepositsList(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.totalItems || 0);
    } catch (err: any) {
      console.error("Lỗi khi tải lịch sử nạp tiền:", err);
      showToast('error', 'Không thể tải lịch sử giao dịch nạp tiền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeposits();
  }, [currentPage, statusFilter, searchKeyword]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const formatHash = (hash: string) => {
    if (!hash) return '—';
    if (hash.length <= 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const formatETH = (amount: string | number): string => {
    const num = Number(amount);
    if (isNaN(num) || num === 0) return '—';
    const rounded = parseFloat(num.toFixed(6));
    return `${rounded} ETH`;
  };

  const isValidTxHash = (hash?: string): boolean => {
    if (!hash) return false;
    if (hash.startsWith('pending_')) return false;
    if (!hash.startsWith('0x')) return false;
    return hash.length > 10;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border bg-emerald-50 border-emerald-200 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Thành công</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border bg-amber-50 border-amber-200 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-550" />
            <span>Đang xử lý</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border bg-slate-50 border-slate-200 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Đã hủy</span>
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border bg-red-50 border-red-200 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Thất bại</span>
          </span>
        );
    }
  };

  // Exactly 4 Tabs/Chips as specified: Tất cả, Thành công, Đang xử lý, Đã hủy
  const filterChips = [
    { label: 'Tất cả', value: '' },
    { label: 'Thành công', value: 'success' },
    { label: 'Đang xử lý', value: 'pending' },
    { label: 'Đã hủy', value: 'cancelled' }
  ];

  return (
    <div className="space-y-6 relative animate-fade-in text-xs font-semibold max-w-7xl mx-auto px-2">
      {/* Toast Notification Container */}
      {toastMsg && (
        <div className={`fixed top-20 right-6 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl border transition-all duration-300 animate-scale-up bg-white text-slate-800 ${
          toastMsg.type === 'success' 
            ? 'border-emerald-500' 
            : 'border-red-500'
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 ${toastMsg.type === 'success' ? 'text-emerald-600' : 'text-primary'}`} />
          <span className="font-bold text-xs">{toastMsg.text}</span>
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Wallet className="w-6 h-6 text-primary mr-2" />
            Lịch sử nạp tiền thuê bao
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">Quản lý và đối soát các giao dịch nạp tiền ví di động qua MetaMask Blockchain và VietQR.</p>
        </div>
        <button
          onClick={loadDeposits}
          className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer text-xs shrink-0 self-start sm:self-center active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search and Status Chips Filter Row */}
      <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl space-y-4 text-left">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm theo Số điện thoại hoặc mã băm TxHash..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-lg py-2.5 px-3 pl-10 text-slate-700 focus:outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Tab Chips */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {filterChips.map(chip => (
            <button
              key={chip.value}
              onClick={() => {
                setStatusFilter(chip.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wider transition-all select-none active:scale-95 cursor-pointer ${
                statusFilter === chip.value
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deposits Table Container - exactly 6 columns */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden text-left">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs table-auto min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
              <tr className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4 bg-slate-50 w-24">Mã GD</th>
                <th className="p-4 bg-slate-50">SĐT Thuê bao</th>
                <th className="p-4 bg-slate-50">Số tiền VND</th>
                <th className="p-4 bg-slate-50">Số ETH</th>
                <th className="p-4 bg-slate-50">Mã băm Blockchain</th>
                <th className="p-4 bg-slate-50">Trạng thái & Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRowSkeleton key={idx} />
                ))
              ) : depositsList.length > 0 ? (
                depositsList.map((dep) => (
                  <tr key={dep.deposit_id} className="hover:bg-red-50/5 transition-colors">
                    {/* 1. Mã GD */}
                    <td className="p-4 font-mono font-bold text-slate-500">
                      #{dep.deposit_id}
                    </td>

                    {/* 2. SĐT Thuê bao */}
                    <td className="p-4 font-mono font-bold">
                      {dep.phoneNumber}
                    </td>

                    {/* 3. Số tiền VND */}
                    <td className="p-4 font-black text-slate-800 text-xs">
                      {new Intl.NumberFormat('vi-VN').format(dep.amountVND)} đ
                    </td>

                    {/* 4. Số ETH */}
                    <td className="p-4 font-mono text-slate-550">
                      {formatETH(dep.amountETH)}
                    </td>

                    {/* 5. Mã băm Blockchain */}
                    <td className="p-4 font-mono text-slate-600">
                      {isValidTxHash(dep.txHash) ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${dep.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline"
                          title="Xem trên Sepolia Etherscan Explorer"
                        >
                          <span>{formatHash(dep.txHash)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* 6. Trạng thái & Thời gian */}
                    <td className="p-4">
                      <div className="flex flex-col space-y-1 items-start">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {getStatusBadge(dep.status)}
                          {dep.isDeleted && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">
                              Đã ẩn bởi User
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDate(dep.created_at)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-semibold">
                    Không tìm thấy lịch sử giao dịch nạp tiền nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!loading && depositsList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold space-y-3 sm:space-y-0">
          <div>
            HIỂN THỊ TRANG <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{totalPages}</span> (TỔNG <span className="text-slate-800">{totalItems}</span> GIAO DỊCH)
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
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
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
