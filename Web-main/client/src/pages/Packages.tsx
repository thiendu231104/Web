import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePackageStore, useAuthStore } from '../store';
import type { Package } from '../types';
import { filterPackagesLocally } from '../utils/filterHelper';

// Component imports
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import AdvancedFilter from '../components/AdvancedFilter';
import PackageToolbar from '../components/PackageToolbar';
import PackageGrid from '../components/PackageGrid';
import PackageCard from '../components/PackageCard';
import RegisterModal from '../components/RegisterModal';
import Pagination from '../components/Pagination';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function Packages() {
  const {
    packages,
    loading,
    pagination,
    filters,
    sort,
    fetchPackages,
    setPage,
    reset
  } = usePackageStore();

  const { currentUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // State for Managing active Subscription Modal
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuccess = useCallback((msg: string) => {
    showToast('success', msg);
  }, []);

  const handleError = useCallback((msg: string) => {
    showToast('error', msg);
  }, []);

  const keywordParam = searchParams.get('keyword') || '';

  // 1. Sync URL keyword query parameter to store search & filter, then fetch packages from backend exactly once per change
  useEffect(() => {
    usePackageStore.getState().setSearch(keywordParam);
    usePackageStore.getState().setFilter('keyword', keywordParam);
    fetchPackages({ search: keywordParam });
  }, [keywordParam, fetchPackages]);

  // 4. Compute filtered packages entirely in memory on client-side
  const filteredPackages = useMemo(() => {
    return filterPackagesLocally(packages, filters, currentUser, sort);
  }, [packages, filters, currentUser, sort]);

  // 5. Initialize/align target audience filter options based on logged-in user subscription_type
  useEffect(() => {
    const storeState = usePackageStore.getState();
    if (currentUser && currentUser.role !== 'admin') {
      const defaultTarget = currentUser.subscription_type || 'tra_truoc';
      const validOptions = currentUser.is_loyal_customer 
        ? [defaultTarget, 'khach_hang_than_thiet'] 
        : [defaultTarget];
      if (!validOptions.includes(storeState.filters.target)) {
        storeState.setFilter('target', defaultTarget);
      }
    } else if (!currentUser || currentUser.role === 'admin') {
      storeState.setFilter('target', 'all');
    }
  }, [currentUser]);

  // 6. Update pagination statistics in store whenever filtered results count changes
  useEffect(() => {
    const totalItems = filteredPackages.length;
    const limit = 8;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = usePackageStore.getState().pagination.page;
    const nextPage = currentPage > totalPages ? 1 : currentPage;

    usePackageStore.setState({
      totalItems,
      totalPages,
      pagination: {
        page: nextPage,
        limit,
        totalPages,
        totalItems
      }
    });
  }, [filteredPackages.length]);

  // 7. Paginate the filtered packages list client-side
  const paginatedPackages = useMemo(() => {
    const page = pagination.page;
    const limit = 8;
    const startIndex = (page - 1) * limit;
    return filteredPackages.slice(startIndex, startIndex + limit);
  }, [filteredPackages, pagination.page]);

  const handleSubscribeOpen = (pkg: Package) => {
    if (!currentUser) {
      showToast('error', 'Vui lòng đăng nhập để đăng ký gói cước.');
      return;
    }
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedPkg(null);
    setIsModalOpen(false);
  };

  const handleResetAll = () => {
    reset();
    setSearchParams({}, { replace: true });
  };

  // Structured breadcrumbs schema for Packages Page (SEO)
  const packageBreadcrumbsSchema = {
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
        "name": "Danh mục gói cước di động",
        "item": `${window.location.origin}/packages`
      }
    ]
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in text-xs font-semibold max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* SEO Optimization */}
      <SEO
        title="Danh Mục Gói Cước Di Động Viettel - Đăng Ký 4G/5G Tốc Độ Cao"
        description="Tra cứu, chọn lọc, so sánh và đăng ký các gói cước siêu tốc data di động 4G/5G, combo thoại, social từ Viettel. Thông tin chính xác từ DB."
        schema={packageBreadcrumbsSchema}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-20 right-6 z-[9999] px-4.5 py-3.5 rounded-xl shadow-xl border-l-4 text-xs font-bold animate-scale-up bg-white text-slate-800 border ${toast.type === 'success' ? 'border-emerald-250 border-l-emerald-500' : 'border-red-250 border-l-red-500'
            }`}
        >
          <span>{toast.text}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: 'Gói cước di động', path: '/packages' }]} />

      {/* Hero Section */}
      <header className="relative bg-gradient-premium text-white rounded-3xl p-8 sm:p-12 overflow-hidden shadow-sm flex flex-col items-start justify-center min-h-[220px]">
        {/* Background visual details */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-red-600/10 to-transparent opacity-60 pointer-events-none" />

        <div className="max-w-2xl text-left space-y-3 relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Danh mục gói cước di động
          </h1>
          <p className="text-slate-350 text-xs sm:text-sm font-medium leading-relaxed">
            Khám phá và đăng ký các gói cước data 4G/5G siêu tốc, combo đàm thoại thả ga và giải trí không giới hạn từ nhà mạng Viettel với chi phí tối ưu nhất.
          </p>
        </div>
      </header>

      {/* Main Content Grid Layout */}
      <main className="space-y-6">
        {/* Unified Search & Filters Card */}
        <section>
          <AdvancedFilter />
        </section>

        {/* List Toolbar (Counts, Reset) */}
        <section>
          <PackageToolbar />
        </section>

        {/* Cards Grid / Shimmer Loading / Empty Alert */}
        <section className="min-h-[400px]">
          {loading ? (
            /* Render 8 Cards Skeleton */
            <PackageGrid>
              {Array.from({ length: 8 }).map((_, idx) => (
                <LoadingSkeleton key={idx} />
              ))}
            </PackageGrid>
          ) : paginatedPackages.length > 0 ? (
            /* Render Actual Package Cards list */
            <PackageGrid>
              {paginatedPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onSubscribe={handleSubscribeOpen}
                />
              ))}
            </PackageGrid>
          ) : (
            <EmptyState onReset={handleResetAll} />
          )}
        </section>

        {/* Catalog List Pagination Controls */}
        {filteredPackages.length > 0 && !loading && (
          <section className="flex justify-center pt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </section>
        )}
      </main>

      {/* Subscription Modal Overlays */}
      {selectedPkg && (
        <RegisterModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          pkg={selectedPkg}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </div>
  );
}
