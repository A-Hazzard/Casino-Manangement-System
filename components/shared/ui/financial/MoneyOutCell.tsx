/**
 * MoneyOutCell Component
 *
 * Displays Money Out value with an underline when subtractJackpot is enabled
 * and jackpot > 0. Optionally shows a clickable info icon with a popover breakdown.
 */

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { getMoneyOutColorClass } from '@/lib/utils/financial/colors';
import { Info } from 'lucide-react';

interface MoneyOutCellProps {
  moneyOut: number;
  moneyIn: number;
  jackpot: number;
  displayValue: string;
  className?: string;
  underlineClass?: string;
  subtractJackpot?: boolean;
  showInfoIcon?: boolean; // Show clickable info icon (for cards). Tables should pass false.
}

export function MoneyOutCell({
  moneyOut,
  moneyIn,
  jackpot,
  displayValue,
  className = '',
  underlineClass = '',
  subtractJackpot = false,
  showInfoIcon = false,
}: MoneyOutCellProps) {
  const colorClass = getMoneyOutColorClass(moneyOut, moneyIn);

  if (!subtractJackpot || jackpot <= 0) {
    return <span className={`font-semibold ${colorClass} ${className}`}>{displayValue}</span>;
  }

  const netValue = moneyOut - jackpot;
  const totalValue = moneyOut;

  if (!showInfoIcon) {
    // Table view: underline only, no icon
    return (
      <span className={`font-semibold border-b border-dotted border-gray-400 ${colorClass} ${className} ${underlineClass}`}>
        {displayValue}
      </span>
    );
  }

  // Card view: underline + clickable info icon with popover
  return (
    <div className={`inline-flex items-center gap-1 ${underlineClass}`}>
      <span className={`font-semibold border-b border-dotted border-gray-400 ${colorClass} ${className}`}>
        {displayValue}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex flex-shrink-0 text-amber-500 hover:text-amber-600 focus:outline-none"
            aria-label="Money Out breakdown"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-xs p-3" side="top" align="center">
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-blue-600 flex items-center gap-1">
              Money Out Breakdown
            </p>
            <p>
              Money Out (Net): <span className="font-bold">{netValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
            <p>
              Jackpot: <span className="font-bold text-amber-600">{jackpot.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
            <p className="border-t border-gray-200 pt-1">
              Total Handpays (Incl. Jackpot): <span className="font-bold">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
            <p className="mt-2 text-[10px] text-gray-500 italic">
              * Gross subtracts Jackpot from revenue.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
