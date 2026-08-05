import { ArrowRightLeft, Sparkles, Wifi, Phone, PhoneCall, MessageSquare, ArrowRight, Check, Gift, Globe } from 'lucide-react';
import type { Package } from '../types';
import { usePackageStore } from '../store';
import { isValidDailyData } from '../utils/filterHelper';
import React from 'react';
import { Link } from 'react-router-dom';

interface PackageCardProps {
  pkg: Package;
  onSubscribe?: (pkg: Package) => void;
}

const PackageCard = React.memo(function PackageCard({
  pkg,
  onSubscribe
}: PackageCardProps) {
  const { addToCompare, compareList, removeFromCompare } = usePackageStore();
  const isInCompare = compareList.some((p) => p.id === pkg.id || p.ma_goi === pkg.ma_goi);

  const isValid = (val: any) => {
    if (
      val === 0 ||
      val === '0' ||
      val === '0GB' ||
      val === '0 GB' ||
      val === '0gb' ||
      val === '0 gb' ||
      val === 'null' ||
      val === 'undefined' ||
      val === null ||
      val === undefined ||
      val === ''
    ) {
      return false;
    }
    return true;
  };

  const hasDailyData = isValidDailyData(pkg.data_theo_ngay);

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isInCompare) {
      removeFromCompare(pkg.ma_goi || pkg.id || '');
    } else {
      const res = addToCompare(pkg);
      if (res && !res.success) {
        alert(res.message);
      }
    }
  };

  const handleSubscribeClick = () => {
    if (onSubscribe) {
      onSubscribe(pkg);
    }
  };

  const isHot = pkg.dohot === 'Hot';

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-350 p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative text-xs font-semibold select-none text-left h-full min-h-[290px]">
      {/* Top Header Bar: Title on left, HOT Badge on right */}
      <div className="flex items-start justify-between gap-2 mb-2 z-10">
        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-2" title={pkg.ten}>
          {pkg.ten}
        </h3>
        {isHot && (
          <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-sm uppercase">
            <Sparkles className="w-3 h-3 fill-white text-white" />
            <span>HOT</span>
          </span>
        )}
      </div>

      {/* Main info block */}
      <div className="space-y-2 flex flex-col flex-1">
        {/* Pricing */}
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-black text-slate-900 tracking-tight">
            {typeof pkg.gia === 'number' && !isNaN(pkg.gia)
              ? new Intl.NumberFormat('vi-VN').format(pkg.gia)
              : pkg.gia || 0}đ
          </span>
          <span className="text-[10px] text-slate-500 font-bold">
            / {pkg.chu_ky_ngay || '30'} ngày
          </span>
        </div>

        {/* Benefits lists */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 flex-1 flex flex-col justify-start">
          {/* Data tốc độ cao theo ngày benefit */}
          {hasDailyData && (
            <div className="flex items-center text-slate-700 py-0">
              <Wifi className="w-3.5 h-3.5 text-primary mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-slate-900 truncate block max-w-full" title={pkg.data_theo_ngay}>
                {pkg.data_theo_ngay}
              </span>
            </div>
          )}

          {/* Data Meta / MXH chuyên sâu benefit */}
          {isValid(pkg.data_meta) && (
            <div className="flex items-center text-slate-700 py-0">
              <Globe className="w-3.5 h-3.5 text-blue-500 mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-blue-700 truncate block max-w-full" title={String(pkg.data_meta)}>
                {String(pkg.data_meta).toLowerCase().includes('meta') ? pkg.data_meta : `Meta: ${pkg.data_meta}`}
              </span>
            </div>
          )}

          {/* Internal Calls benefit */}
          {(isValid(pkg.free_noi_mang) || (pkg.has_voice && !isValid(pkg.free_ngoai_mang))) && (
            <div className="flex items-center text-slate-700 py-0">
              <PhoneCall className="w-3.5 h-3.5 text-primary mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-slate-900 truncate block max-w-full" title={typeof pkg.free_noi_mang === 'number' ? `${pkg.free_noi_mang} phút nội mạng` : String(pkg.free_noi_mang)}>
                {typeof pkg.free_noi_mang === 'number' && pkg.free_noi_mang > 0 ? `${pkg.free_noi_mang} phút nội mạng` : 'Miễn phí gọi nội mạng'}
              </span>
            </div>
          )}

          {/* External Calls benefit */}
          {isValid(pkg.free_ngoai_mang) && (
            <div className="flex items-center text-slate-700 py-0">
              <Phone className="w-3.5 h-3.5 text-primary mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-slate-900 truncate block max-w-full" title={typeof pkg.free_ngoai_mang === 'number' ? `${pkg.free_ngoai_mang} phút ngoại mạng` : String(pkg.free_ngoai_mang)}>
                {typeof pkg.free_ngoai_mang === 'number' ? `${pkg.free_ngoai_mang} phút ngoại mạng` : pkg.free_ngoai_mang}
              </span>
            </div>
          )}

          {/* SMS benefit */}
          {(isValid(pkg.sms) || pkg.has_sms) && (
            <div className="flex items-center text-slate-700 py-0">
              <MessageSquare className="w-3.5 h-3.5 text-primary mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-slate-900 truncate block max-w-full" title={typeof pkg.sms === 'number' ? `${pkg.sms} tin nhắn SMS` : String(pkg.sms)}>
                {typeof pkg.sms === 'number' && pkg.sms > 0 ? `${pkg.sms} tin nhắn SMS` : 'Miễn phí tin nhắn SMS'}
              </span>
            </div>
          )}

          {/* Utilities benefit (hiển thị 1 lần duy nhất) */}
          {isValid(pkg.tien_ich_free) && (
            <div className="flex items-center text-slate-700 py-0">
              <Gift className="w-3.5 h-3.5 text-amber-500 mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-slate-900 truncate block max-w-full" title={pkg.tien_ich_free || undefined}>
                {pkg.tien_ich_free}
              </span>
            </div>
          )}

          {/* Social Media Apps benefit - chỉ hiển thị nếu khác với tien_ich_free */}
          {isValid(pkg.noi_dung_ngoai) && pkg.noi_dung_ngoai !== pkg.tien_ich_free && (
            <div className="flex items-center text-slate-700 py-0">
              <Globe className="w-3.5 h-3.5 text-purple-500 mr-2.5 shrink-0" />
              <span className="font-extrabold text-[12px] text-slate-900 truncate block max-w-full" title={pkg.noi_dung_ngoai || undefined}>
                {pkg.noi_dung_ngoai}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Buttons Action bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
        <div className="flex items-center gap-2">
          {/* Subscribe trigger button */}
          <button
            onClick={handleSubscribeClick}
            className="flex-1 bg-primary hover:bg-primary-hover text-white font-extrabold py-2 px-4 rounded-xl text-xs transition-colors focus:outline-none cursor-pointer text-center"
            type="button"
          >
            Đăng ký
          </button>

          {/* Compare toggle button */}
          <button
            onClick={handleCompareToggle}
            title={isInCompare ? "Xóa khỏi so sánh" : "Thêm vào so sánh"}
            className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none ${isInCompare
              ? 'bg-red-50 border-red-200 text-primary'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-450 hover:text-slate-750'
              }`}
            type="button"
          >
            {isInCompare ? <Check className="w-3.5 h-3.5" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Details route button */}
        <Link
          to={`/goi-cuoc/${pkg.ma_goi || pkg.id}`}
          className="w-full flex items-center justify-center py-1 text-[10px] text-slate-400 hover:text-primary transition-colors font-bold group/lnk"
        >
          <span>Xem chi tiết gói cước</span>
          <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/lnk:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
});

export default PackageCard;
