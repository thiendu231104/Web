export default function LoadingSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-5 flex flex-col justify-between text-left h-[340px]">
      <div className="space-y-4">
        {/* Category tag skeleton */}
        <div className="h-3.5 bg-slate-100 rounded-lg w-20" />
        
        {/* Name skeleton */}
        <div className="h-6 bg-slate-100 rounded-lg w-3/4" />
        
        {/* Price skeleton */}
        <div className="h-8 bg-slate-100 rounded-lg w-1/2 pt-1" />
        
        {/* Benefits lists skeleton */}
        <div className="space-y-3 pt-4 border-t border-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-slate-100 rounded-full shrink-0" />
            <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-slate-100 rounded-full shrink-0" />
            <div className="h-4 bg-slate-100 rounded-lg w-5/6" />
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-slate-100 rounded-full shrink-0" />
            <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
          </div>
        </div>
      </div>
      
      {/* Buttons skeleton */}
      <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
        <div className="h-10 bg-slate-100 rounded-xl flex-1" />
        <div className="h-10 bg-slate-100 rounded-xl w-10 shrink-0" />
      </div>
    </div>
  );
}
