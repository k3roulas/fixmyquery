import type { ReactNode } from 'react';

export default function PageContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-7xl p-4 sm:p-6 ${className}`}>{children}</div>;
}
