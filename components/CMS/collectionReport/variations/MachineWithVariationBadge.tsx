/**
 * MachineWithVariationBadge Component
 *
 * A wrapper component that adds a visual "Variation" badge to its children when a discrepancy is detected.
 *
 * Features:
 * - Conditional badge rendering
 * - Responsive positioning using absolute layout
 * - Alert icon for quick visual identification
 *
 * @param children - The component(s) to be decorated with the badge
 * @param hasVariation - Flag indicating if a variation badge should be displayed
 * @param className - Optional CSS classes for the wrapper container
 */
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
