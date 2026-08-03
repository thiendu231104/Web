interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPaginationRange(currentPage: number, totalPages: number) {
  const maxButtons = 7;
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const range: (number | string)[] = [];

  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) {
      range.push(i);
    }
    range.push('...');
    range.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    range.push(1);
    range.push('...');
    for (let i = totalPages - 4; i <= totalPages; i++) {
      range.push(i);
    }
  } else {
    range.push(1);
    range.push('...');
    range.push(currentPage - 1);
    range.push(currentPage);
    range.push(currentPage + 1);
    range.push('...');
    range.push(totalPages);
  }

  return range;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageSelect = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav aria-label="Pagination Navigation" className="flex items-center justify-center space-x-2 pt-8 border-t border-slate-100 text-xs font-semibold">
      {/* Previous Button */}
      <button
        disabled={currentPage === 1}
        onClick={() => handlePageSelect(currentPage - 1)}
        className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-550 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-350 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer focus:outline-none"
        type="button"
      >
        Trước
      </button>

      {/* Page Numbers */}
      {getPaginationRange(currentPage, totalPages).map((page, idx) => {
        if (page === '...') {
          return (
            <span
              key={`dots-${idx}`}
              className="px-3 py-2 text-slate-400 font-bold select-none"
              aria-hidden="true"
            >
              ...
            </span>
          );
        }

        const pageNum = page as number;
        const isCurrent = currentPage === pageNum;

        return (
          <button
            key={pageNum}
            onClick={() => handlePageSelect(pageNum)}
            aria-current={isCurrent ? 'page' : undefined}
            className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100 ${
              isCurrent
                ? 'bg-primary border-primary text-white shadow-sm'
                : 'bg-white border-slate-250 text-slate-550 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-350'
            }`}
            type="button"
          >
            {pageNum}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => handlePageSelect(currentPage + 1)}
        className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-550 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-350 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer focus:outline-none"
        type="button"
      >
        Sau
      </button>
    </nav>
  );
}
