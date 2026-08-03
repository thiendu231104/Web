import { Sparkles, Compass, ArrowLeft, RefreshCw, Check, Trash2, Wifi, PhoneCall, Globe, Video, DollarSign, ShieldCheck, Calendar, Layers } from 'lucide-react';
import { useSurveyStore, useAuthStore } from '../store';
import PackageCard from '../components/PackageCard';
import RegisterModal from '../components/RegisterModal';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import type { Package } from '../types';

export default function Survey() {
  const {
    answers,
    nextQuestion,
    recommendedPackages,
    isCompleted,
    remainingCount,
    currentStepNum,
    totalFixedSteps,
    isDynamicPhase,
    surveyMessage,
    loading,
    hasHistory,
    historyStack,
    setAnswerAndSubmit,
    goBack,
    resetSurvey,
    deleteHistory
  } = useSurveyStore();

  const { currentUser } = useAuthStore();
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Khởi tạo state rỗng sạch sẽ ở Bước 1 mỗi khi mount trang hoặc thay đổi Auth state
    resetSurvey();
  }, [currentUser, resetSurvey]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

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

  const handleRestart = async () => {
    await resetSurvey();
  };

  const handleDeleteHistory = async () => {
    if (!currentUser) return;
    await deleteHistory();
    showToast('success', 'Đã xóa lịch sử khảo sát thành công.');
  };

  const surveyBreadcrumbsSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Trang chủ",
        "item": typeof window !== 'undefined' ? window.location.origin : ''
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Khảo sát chọn gói",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/survey` : ''
      }
    ]
  };

  const getOptionIcon = (field: string, value: string) => {
    if (field === 'phan_loai_goi') {
      if (value === 'Data') return Wifi;
      if (value === 'Combo') return PhoneCall;
      return Globe;
    }
    if (field === 'phan_khuc_gia') {
      if (value === 'Gia_re') return DollarSign;
      if (value === 'Trung_binh') return ShieldCheck;
      return Sparkles;
    }
    if (field === 'chu_ky_ngay') return Calendar;
    if (field === 'tien_ich_free') {
      if (value === 'TikTok') return Sparkles;
      if (value === 'YouTube') return Video;
      if (value === 'Facebook') return Globe;
      return Layers;
    }
    if (field === 'loai_mang') return Wifi;
    return ShieldCheck;
  };

  if (loading && !nextQuestion && !isCompleted) {
    return (
      <div className="max-w-3xl mx-auto py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-slate-500 font-bold text-xs">Đang tải luồng Khảo sát Hybrid Adaptive Viettel AI...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 relative animate-fade-in text-xs font-semibold">
      <SEO
        title="Khảo Sát Chọn Gói Cước Viettel - Hybrid Adaptive Decision Tree"
        description="Khảo sát chọn gói cước thông minh theo quy trình 3 bước nền tảng kết hợp các bước tự sinh sinh động."
        schema={surveyBreadcrumbsSchema}
      />

      {toastMsg && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border-l-4 text-xs font-semibold bg-white text-slate-800 ${toastMsg.type === 'success' ? 'border-emerald-500' : 'border-red-500'}`}>
          {toastMsg.text}
        </div>
      )}

      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full text-[10px] font-bold text-primary mx-auto">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span>HỆ THỐNG KHẢO SÁT CHỌN GÓI VIETTEL AI</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Khảo sát chọn gói cước thích ứng</h1>
        <p className="text-slate-500 text-xs max-w-md mx-auto font-medium">
          3 bước khoanh vùng chuẩn nền tảng, tự động tối ưu các bước hỏi bổ sung nếu còn nhiều gói cước phù hợp.
        </p>
      </div>

      {/* Wizard Card Panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">

        {/* Step Question Mode (isCompleted === false) */}
        {!isCompleted && nextQuestion && (
          <div className="space-y-6">
            {/* Step Header & Progress Bar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div className="flex items-center space-x-3 text-left">
                  <span className="w-7 h-7 rounded-xl bg-red-50 border border-red-100 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {currentStepNum}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{nextQuestion.title}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{nextQuestion.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isDynamicPhase ? (
                    <div className="text-xs font-bold text-slate-400">
                      Bước <span className="text-primary">{currentStepNum}</span> / {totalFixedSteps}
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Thắc mắc bổ sung (Bước {currentStepNum})</span>
                    </div>
                  )}

                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                    <Layers className="w-3 h-3 text-slate-500" />
                    <span>Còn {remainingCount} gói phù hợp</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar for Fixed Phases (Steps 1, 2, 3) */}
              {!isDynamicPhase && (
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${(currentStepNum / totalFixedSteps) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Step Options Rendering */}
            <AnimatePresence mode="wait">
              <motion.div
                key={nextQuestion.field}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="space-y-4 text-left"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {nextQuestion.options.map((opt: any) => {
                    const isSelected = answers[nextQuestion.field] === opt.value;
                    const Icon = getOptionIcon(nextQuestion.field, opt.value);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setAnswerAndSubmit(nextQuestion.field, opt.value)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${isSelected
                            ? 'bg-red-50/70 border-primary text-slate-900 shadow-md ring-2 ring-primary/20'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{opt.label}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">{opt.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Back Button Footer */}
            {historyStack.length > 0 && (
              <div className="flex items-center justify-start mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={goBack}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-600 transition-colors font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại bước trước</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result Screen (isCompleted === true) */}
        {isCompleted && (
          <div className="space-y-8 py-2">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100 shadow-sm">
                <Sparkles className="w-6 h-6 fill-emerald-500 text-emerald-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Danh sách gói cước thỏa mãn tiêu chí của bạn</h3>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-center text-[11px] font-bold max-w-xl mx-auto shadow-sm">
                <p className="leading-relaxed font-semibold">
                  {surveyMessage || `✨ Hệ thống đã tìm thấy chính xác ${recommendedPackages.length} gói cước phù hợp nhất từ kết quả lọc.`}
                </p>
              </div>
            </div>

            {/* Suggested Packages Cards Grid */}
            {recommendedPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendedPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id || pkg.ma_goi}
                    pkg={pkg}
                    onSubscribe={handleSubscribeOpen}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 font-medium py-8 bg-slate-50 rounded-2xl border border-slate-200">
                Không tìm thấy gói cước phù hợp. Vui lòng thực hiện lại khảo sát.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleRestart}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:bg-slate-50 px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Làm lại khảo sát</span>
              </button>

              {hasHistory && currentUser && (
                <button
                  onClick={handleDeleteHistory}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa kết quả khảo sát</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedPkg && (
        <RegisterModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          pkg={selectedPkg}
          onSuccess={(msg) => showToast('success', msg)}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </div>
  );
}




