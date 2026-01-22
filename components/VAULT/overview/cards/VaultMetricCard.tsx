/**
 * Vault Metric Card Component
 *
 * Reusable metric card for displaying vault metrics (Machine Cash, Desk Float, Total On Premises).
 *
 * Features:
 * - Icon display
 * - Metric value with currency formatting
 * - Title/label
 * - Color-coded styling
 *
 * @module components/VAULT/cards/VaultMetricCard
 */
'use client';

import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type VaultMetricCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
};

export default function VaultMetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  className,
}: VaultMetricCardProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Card className={cn('w-full rounded-lg bg-container shadow-md transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
              {formatAmount(value)}
            </p>
          </div>
          <div className={cn('flex-shrink-0 rounded-lg p-3', iconBgColor)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
