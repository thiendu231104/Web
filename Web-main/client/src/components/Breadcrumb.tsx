import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-semibold mb-4">
      <Link
        to="/"
        className="flex items-center hover:text-primary transition-colors duration-150 py-1"
        aria-label="Trang chủ"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="flex items-center space-x-1.5">
            <ChevronRight className="w-3 h-3 text-slate-300" />
            {isLast || !item.path ? (
              <span className="text-slate-600 font-bold select-none py-1" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-primary transition-colors duration-150 py-1"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
