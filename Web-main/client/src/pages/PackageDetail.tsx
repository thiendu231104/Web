import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Wifi,
  ArrowLeft,
  ArrowRightLeft,
  CreditCard,
  Copy,
  Check,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { usePackageStore, useAuthStore } from '../store';
import PackageCard from '../components/PackageCard';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import { calculateSimilarity } from '../utils/similarity';
import { canViewPackage } from '../utils/permission';
import type { Package } from '../types';
import RegisterModal from '../components/RegisterModal';

function DetailSkeleton() {
  return (
    <div className="space-y-6 pb-16 animate-pulse text-left">
      {/* Breadcrumb skeleton */}
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-6"></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-8 bg-slate-200 rounded w-2/3"></div>
          </div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            <div className="h-12 bg-slate-200 rounded w-full"></div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-16 bg-slate-50 rounded-xl"></div>
            <div className="h-16 bg-slate-50 rounded-xl"></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-20 bg-slate-50 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PackageDetail() {
  const { ma_goi } = useParams<{ ma_goi: string }>();
  const {
    currentPackage: pkg,
    loading,
    error,
    fetchPackageById,
    packages,
    fetchPackages,
    addToCompare,
    compareList,
    removeFromCompare
  } = usePackageStore();
  const { currentUser } = useAuthStore();
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  // Modal state for main package
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Modal state for related packages
  const [selectedRelatedPkg, setSelectedRelatedPkg] = useState<Package | null>(null);
  const [isRelatedModalOpen, setIsRelatedModalOpen] = useState(false);

  const handleSubscribeOpenForRelated = (rPkg: Package) => {
    if (!currentUser) {
      showToast('error', 'Vui lòng đăng nhập để đăng ký gói cước.');
      return;
    }
    setSelectedRelatedPkg(rPkg);
    setIsRelatedModalOpen(true);
  };

  // Auto scroll to top on router parameter change
  useEffect(() => {
    if (ma_goi) {
      const storedSearchKeyword = sessionStorage.getItem('last_search_keyword') || sessionStorage.getItem('active_search_keyword') || sessionStorage.getItem('current_search_keyword');
      fetchPackageById(ma_goi, storedSearchKeyword || undefined);
      sessionStorage.removeItem('last_search_keyword');
      sessionStorage.removeItem('active_search_keyword');
      sessionStorage.removeItem('current_search_keyword');
      sessionStorage.removeItem('active_flow_source');
    }
    if (packages.length === 0) {
      fetchPackages();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [ma_goi, fetchPackageById, packages.length, fetchPackages]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedText(type);
        showToast('success', `Đã sao chép: ${text}`);
        setTimeout(() => setCopiedText(null), 2000);
      })
      .catch(err => {
        console.error("Failed to copy:", err);
        showToast('error', 'Không thể sao chép.');
      });
  };

  const handleReload = () => {
    if (ma_goi) {
      fetchPackageById(ma_goi);
    }
  };

  const isValid = (val: any) => {
    if (
      val === 0 ||
      val === '0' ||
      val === '0GB' ||
      val === '0 GB' ||
      val === null ||
      val === undefined ||
      val === '' ||
      val === '_'
    ) {
      return false;
    }
    return true;
  };



  if (loading) {
    return <DetailSkeleton />;
  }

  if (error) {
    const isPermissionError = error.includes('không có quyền') || error.includes('quyền xem');
    return (
      <div className="bg-white border border-slate-200 p-12 rounded-2xl max-w-lg mx-auto text-center space-y-5 shadow-sm my-12 text-xs font-semibold animate-scale-up">
        <AlertCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="text-lg font-extrabold text-slate-900">
          {isPermissionError ? 'Từ chối truy cập' : 'Không thể tải dữ liệu'}
        </h3>
        <p className="text-slate-500 font-medium">
          {error || 'Đã xảy ra lỗi kết nối khi lấy thông tin gói cước từ hệ thống Viettel.'}
        </p>
        <div className="flex justify-center space-x-3 pt-2">
          <Link
            to="/packages"
            className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh mục</span>
          </Link>
          {!isPermissionError && (
            <button
              onClick={handleReload}
              className="inline-flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              type="button"
            >
              Tải lại
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="bg-white border border-slate-200 p-12 rounded-2xl max-w-lg mx-auto text-center space-y-5 shadow-sm my-12 text-xs font-semibold animate-scale-up">
        <AlertCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="text-lg font-extrabold text-slate-900">Không tìm thấy gói cước</h3>
        <p className="text-slate-500 font-medium">
          Gói cước di động bạn tìm kiếm không tồn tại trên hệ thống hoặc đã tạm ngừng đăng ký.
        </p>
        <Link
          to="/packages"
          className="inline-flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  if (!canViewPackage(currentUser, pkg)) {
    return (
      <div className="bg-white border border-slate-200 p-12 rounded-2xl max-w-lg mx-auto text-center space-y-5 shadow-sm my-12 text-xs font-semibold animate-scale-up text-left">
        <AlertCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="text-lg font-extrabold text-slate-900 text-center">Từ chối truy cập</h3>
        <p className="text-slate-500 font-medium text-center">
          Bạn không có quyền xem gói cước này.
        </p>
        <div className="flex justify-center pt-2">
          <Link
            to="/packages"
            className="inline-flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </Link>
        </div>
      </div>
    );
  }

  const isInCompare = compareList.some(p => (p.ma_goi || p.id || '').trim() === (pkg.ma_goi || pkg.id || '').trim());

  const handleCompareToggle = () => {
    if (isInCompare) {
      removeFromCompare(pkg.ma_goi || pkg.id || '');
      showToast('success', 'Đã xóa khỏi danh sách so sánh.');
    } else {
      const res = addToCompare(pkg);
      if (res.success) {
        showToast('success', res.message);
      } else {
        showToast('error', res.message);
      }
    }
  };

  const handleSubscribeClick = () => {
    if (!currentUser) {
      showToast('error', 'Vui lòng đăng nhập để đăng ký gói cước.');
      return;
    }
    setIsModalOpen(true);
  };

  // Find related packages sorted by similarity score + fallback to do_uu_tien
  const relatedPackages = packages
    .filter(p => p.id !== pkg.id && canViewPackage(currentUser, p))
    .map(p => ({
      pkg: p,
      score: calculateSimilarity(pkg, p)
    }))
    .sort((a, b) => b.score - a.score || parseInt(b.pkg.ma_goi || '0') - parseInt(a.pkg.ma_goi || '0'))
    .map(item => item.pkg)
    .slice(0, 3);

  // SEO dynamic values
  const formattedPrice = new Intl.NumberFormat('vi-VN').format(pkg.gia);
  const cycleLabel = `${pkg.chu_ky_ngay} ngày`;
  const seoTitle = `${pkg.ma_goi || pkg.ten} - Gói cước Viettel ${formattedPrice}đ | Website`;
  const seoDescription = `Đăng ký gói ${pkg.ma_goi || pkg.ten} Viettel giá ${formattedPrice}đ, nhận ưu đãi ${pkg.data_theo_ngay || 'data khủng'} trong chu kỳ ${cycleLabel}.`;
  const canonicalUrl = `${window.location.origin}/goi-cuoc/${pkg.ma_goi || pkg.id}`;

  const detailSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `Gói Cước ${pkg.ten} Viettel`,
      "description": pkg.uudaitrong || seoDescription,
      "image": `${window.location.origin}/og-image.jpg`,
      "brand": {
        "@type": "Brand",
        "name": "Viettel"
      },
      "offers": {
        "@type": "Offer",
        "url": canonicalUrl,
        "price": pkg.gia,
        "priceCurrency": "VND",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Viettel"
        }
      }
    }
  ];

  const breadcrumbItems = [
    { label: 'Gói cước', path: '/packages' },
    { label: pkg.ma_goi || pkg.ten }
  ];

  return (
    <div className="space-y-6 pb-16 relative animate-fade-in text-xs font-semibold text-left">
      {/* SEO configuration */}
      <SEO
        title={seoTitle}
        description={seoDescription}
        schema={detailSchemas}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border-l-4 text-xs font-bold bg-white text-slate-800 ${
          toastMsg.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'
        }`}>
          {toastMsg.text}
        </div>
      )}

      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Details Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Price and Primary Action Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between space-y-6 h-fit">
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
              {pkg.ma_goi ? `${pkg.ma_goi} - ${pkg.ten}` : pkg.ten}
            </h2>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-6">
            {/* Info Group 1: Thông tin cơ bản */}
            <div className="space-y-2 text-slate-600 font-medium">
              <div className="flex justify-between items-center">
                <span>Tên gói:</span>
                <span className="font-extrabold text-slate-950">{pkg.ten}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                <span>Giá cước:</span>
                <span className="font-extrabold text-slate-950 text-sm">{formattedPrice}đ</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                <span>Chu kỳ sử dụng:</span>
                <span className="font-extrabold text-slate-950">{cycleLabel}</span>
              </div>
              {isValid(pkg.data_theo_ngay) && (
                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-primary" />
                    <span>Data Web:</span>
                  </span>
                  <span className="font-extrabold text-slate-950">{pkg.data_theo_ngay}</span>
                </div>
              )}
              {isValid(pkg.data_meta) && (
                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-primary" />
                    <span>Data Meta:</span>
                  </span>
                  <span className="font-extrabold text-slate-950">{pkg.data_meta}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleSubscribeClick}
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 focus:outline-none cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Đăng ký ngay</span>
              </button>
              <button
                onClick={handleCompareToggle}
                className={`p-3.5 rounded-xl border transition-colors focus:outline-none cursor-pointer ${isInCompare
                  ? 'bg-red-50 border-red-150 text-primary'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                title={isInCompare ? "Xóa khỏi so sánh" : "Thêm vào so sánh"}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Benefits and Conditions */}
        <div className="lg:col-span-2 space-y-6 text-left">
          {/* Info Group 2: Nội dung ưu đãi */}
          {isValid(pkg.uudaitrong) && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Nội dung ưu đãi</h3>
              <p className="text-slate-600 text-xs leading-relaxed font-medium bg-red-50/10 p-4 rounded-xl border border-primary/10">
                {pkg.uudaitrong}
              </p>
            </div>
          )}

          {/* Info Group 3: Điều kiện đăng ký & chính sách sử dụng */}
          {(isValid(pkg.dieu_kien_dang_ky) || isValid(pkg.chinh_sach_ap_dung)) && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Điều kiện & quy định sử dụng</h3>

              <div className="space-y-4 text-xs text-slate-600 font-medium">
                {isValid(pkg.dieu_kien_dang_ky) && (
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-900">Điều kiện đăng ký:</h4>
                    <p className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed font-medium">
                      {pkg.dieu_kien_dang_ky}
                    </p>
                  </div>
                )}

                {isValid(pkg.chinh_sach_ap_dung) && (
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-900">Chính sách sử dụng:</h4>
                    <p className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed font-medium">
                      {pkg.chinh_sach_ap_dung}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Group 4: Cú pháp nhắn tin qua đầu số 191 */}
          {(isValid(pkg.dangky) || isValid(pkg.huygiahan) || isValid(pkg.huygoicuoc)) && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-4 font-medium text-slate-600">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Cú pháp sử dụng</h3>

              <div className="space-y-3 pt-2">
                {isValid(pkg.dangky) && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1">
                    <span>Đăng ký:</span>
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <span className="font-extrabold text-slate-900 font-mono select-all bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-[13px]">
                        {pkg.dangky}
                      </span>
                      <button
                        onClick={() => handleCopy(pkg.dangky || '', 'dangky')}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                        title="Sao chép cú pháp"
                      >
                        {copiedText === 'dangky' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {isValid(pkg.huygoicuoc) && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1 border-t border-slate-50 pt-3">
                    <span>Hủy gói:</span>
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <span className="font-extrabold text-slate-900 font-mono select-all bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-[13px]">
                        {pkg.huygoicuoc}
                      </span>
                      <button
                        onClick={() => handleCopy(pkg.huygoicuoc || '', 'huygoicuoc')}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                        title="Sao chép cú pháp"
                      >
                        {copiedText === 'huygoicuoc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {isValid(pkg.huygiahan) && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1 border-t border-slate-50 pt-3">
                    <span>Hủy gia hạn:</span>
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <span className="font-extrabold text-slate-900 font-mono select-all bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-[13px]">
                        {pkg.huygiahan}
                      </span>
                      <button
                        onClick={() => handleCopy(pkg.huygiahan || '', 'huygiahan')}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                        title="Sao chép cú pháp"
                      >
                        {copiedText === 'huygiahan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* QR Code Quick Register Section */}
                {isValid(pkg.ma_goi) && (
                  <div className="flex flex-col md:flex-row items-center gap-5 bg-slate-50/80 rounded-2xl p-4.5 border border-slate-100 mt-5 pt-4">
                    <div className="flex-1 space-y-1.5 text-left">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span>Đăng ký nhanh qua mã QR</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Sử dụng Camera điện thoại hoặc ứng dụng quét mã (như Zalo) để quét hình bên cạnh. Điện thoại sẽ tự động soạn tin nhắn SMS đăng ký gửi đến tổng đài 191 mà không cần nhập thủ công.
                      </p>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        Cú pháp SMS: <span className="font-mono font-bold text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded">{pkg.ma_goi}</span> gửi <span className="font-mono font-bold text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded">191</span>
                      </div>
                    </div>

                    <div className="shrink-0 bg-white p-3 rounded-xl border border-slate-250 shadow-sm flex flex-col items-center gap-2 group transition-all duration-300 hover:shadow-md hover:border-slate-300">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`sms:191?body=${pkg.ma_goi}`)}`}
                        alt={`Mã QR đăng ký gói ${pkg.ma_goi}`}
                        className="w-24 h-24 object-contain select-none"
                        loading="lazy"
                      />
                      <span className="text-[9px] font-black text-slate-500 tracking-wider">SMS: {pkg.ma_goi} &rarr; 191</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Packages Showcase */}
      {relatedPackages.length > 0 && (
        <section className="space-y-6 pt-6 text-left border-t border-slate-150">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Gói cước liên quan</h3>
            <p className="text-slate-500 text-xs font-semibold">Các gói cước cùng thể loại hoặc chu kỳ tương tự</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPackages.map(rPkg => (
              <PackageCard
                key={rPkg.id}
                pkg={rPkg}
                onSubscribe={handleSubscribeOpenForRelated}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Package RegisterModal */}
      <RegisterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pkg={pkg}
        onSuccess={(msg) => showToast('success', msg)}
        onError={(msg) => showToast('error', msg)}
      />

      {/* Related Package RegisterModal */}
      {selectedRelatedPkg && (
        <RegisterModal
          isOpen={isRelatedModalOpen}
          onClose={() => {
            setSelectedRelatedPkg(null);
            setIsRelatedModalOpen(false);
          }}
          pkg={selectedRelatedPkg}
          onSuccess={(msg) => showToast('success', msg)}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </div>
  );
}
