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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type VaultMetricCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
  tooltipContent?: string;
  onClick?: () => void;
};

export default function VaultMetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  className,
  tooltipContent,
  onClick,
}: VaultMetricCardProps) {
  // ===================================
  // Hooks
  // ===================================
  const { formatAmount } = useCurrencyFormat();
  const formattedValue = formatAmount(value);

  // Helper for dynamic font size
  const getDynamicFontSize = (text: string) => {
    if (text.length > 15) return 'text-base sm:text-lg';
    if (text.length > 12) return 'text-lg sm:text-xl';
    return 'text-xl sm:text-2xl';
  };

  // ===================================
  // Render
  // ===================================
  const cardContent = (
    <Card 
      className={cn(
        'w-full rounded-lg bg-container shadow-md transition-all hover:shadow-lg cursor-help', 
        onClick && 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-blue-200 ring-offset-2 focus-visible:ring-2',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
            <p className={cn(
                "font-bold text-gray-900 leading-tight transition-all truncate",
                getDynamicFontSize(formattedValue)
            )}>
              {formattedValue}
            </p>
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
        <TooltipContent side="top" className="max-w-[250px] text-center p-3">
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-muted-foreground whitespace-pre-line">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
