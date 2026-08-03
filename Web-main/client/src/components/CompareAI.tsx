import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import type { Package } from '../types';
import { compareApi } from '../services/api';

interface CompareAIProps {
  compareList: Package[];
  onSubscribe: (pkg: Package) => void;
}

export default function CompareAI({ compareList }: CompareAIProps) {
  const [loading, setLoading] = useState(false);
  const [adviceText, setAdviceText] = useState<string>('');

  useEffect(() => {
    if (compareList.length < 2) {
      setAdviceText('');
      return;
    }

    let isMounted = true;
    setLoading(true);

    const maGoiList = compareList.map(p => (p.ma_goi || p.id || '').trim()).filter(Boolean);

    compareApi.analyzeAI(maGoiList)
      .then((data: any) => {
        if (!isMounted) return;
        const text = data.advice || data.summary || data.recommendation || '';
        setAdviceText(typeof text === 'string' ? text : String(text));
      })
      .catch((err) => {
        console.error('Error fetching AI compare analysis:', err);
        if (!isMounted) return;
        setAdviceText('');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [compareList]);

  if (compareList.length < 2) return null;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 shadow-sm flex flex-col items-center justify-center min-h-[140px] transition-all duration-300">
        <div className="w-6 h-6 border-2 border-[#EE0033] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-[11px] font-bold text-gray-500 animate-pulse">Đang phân tích so sánh...</p>
      </div>
    );
  }

  if (!adviceText) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 shadow-sm relative overflow-hidden transition-all duration-300 animate-fade-in space-y-3.5 text-left">
      {/* Header Title */}
      <div className="flex items-center space-x-2 pb-3 border-b border-gray-150">
        <Sparkles className="w-5 h-5 text-[#EE0033]" />
        <h3 className="text-xs font-extrabold tracking-tight text-gray-900 uppercase">
          Gợi Ý:
        </h3>
      </div>

      {/* Concise Natural Advice Content */}
      <div className="text-xs text-gray-700 font-semibold leading-relaxed space-y-2 bg-slate-50/70 border border-slate-150 rounded-xl p-4">
        {adviceText.split('\n').filter(Boolean).map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
