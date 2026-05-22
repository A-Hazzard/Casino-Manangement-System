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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type VaultMetricCardProps = {
  title: string;
  value: number;
  subValue?: number | string;
  subValueLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
  tooltipContent?: string;
  onClick?: () => void;
  formatType?: 'currency' | 'number';
};

export default function VaultMetricCard({
  title,
  value,
  subValue,
  subValueLabel = 'Count',
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  className,
  tooltipContent,
  onClick,
  formatType = 'currency',
}: VaultMetricCardProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Computed
  // ============================================================================
  const formattedValue =
    formatType === 'currency'
      ? formatAmount(value || 0)
      : (value || 0).toLocaleString();

  // ============================================================================
  // Handlers
  // ============================================================================
  // Helper for dynamic font size
  const getDynamicFontSize = (text: string) => {
    if (text.length > 15) return 'text-base sm:text-lg';
    if (text.length > 12) return 'text-lg sm:text-xl';
    return 'text-xl sm:text-2xl';
  };

  // ============================================================================
  // Render
  // ============================================================================
  const cardContent = (
    <Card
      className={cn(
        'w-full cursor-help rounded-lg bg-container shadow-md transition-all hover:shadow-lg',
        onClick &&
          'cursor-pointer border-blue-200 ring-offset-2 hover:scale-[1.02] focus-visible:ring-2 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate text-sm font-medium text-gray-600">
              {title}
            </p>
            {subValue !== undefined && subValue !== null ? (
              <div className="mt-1 grid grid-cols-2 divide-x divide-gray-200">
                <div className="pr-4">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Amount
                  </p>
                  <p
                    className={cn(
                      'truncate font-bold leading-tight text-gray-900 transition-all',
                      getDynamicFontSize(formattedValue)
                    )}
                  >
                    {formattedValue}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {subValueLabel}
                  </p>
                  <p
                    className={cn(
                      'truncate font-bold leading-tight text-gray-900 transition-all',
                      getDynamicFontSize(String(subValue))
                    )}
                  >
                    {subValue}
                  </p>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  'truncate font-bold leading-tight text-gray-900 transition-all',
                  getDynamicFontSize(formattedValue)
                )}
              >
                {formattedValue}
              </p>
            )}
          </div>
          <div className={cn('flex-shrink-0 rounded-lg p-3', iconBgColor)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!tooltipContent) return cardContent;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] p-3 text-center">
          <p className="mb-1 font-semibold">{title}</p>
          <p className="whitespace-pre-line text-muted-foreground">
            {tooltipContent}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
