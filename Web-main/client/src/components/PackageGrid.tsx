import React from 'react';

interface PackageGridProps {
  children: React.ReactNode;
}

export default function PackageGrid({ children }: PackageGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {children}
    </div>
  );
}
