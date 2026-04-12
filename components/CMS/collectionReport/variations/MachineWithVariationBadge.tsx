'use client';

import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface MachineWithVariationBadgeProps {
  children: ReactNode;
  hasVariation: boolean;
  className?: string;
}

export function MachineWithVariationBadge({
  children,
  hasVariation,
  className = '',
}: MachineWithVariationBadgeProps) {
  if (!hasVariation) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      {/* Badge */}
      <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-white shadow-md">
        <AlertCircle className="h-4 w-4" />
        <span className="text-xs font-semibold">Variation</span>
      </div>
    </div>
  );
}
