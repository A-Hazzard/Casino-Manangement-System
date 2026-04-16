/**
 * MoneyOutCell Component
 *
 * Displays Money Out value with an underline when jackpot is included in money out
 * (includeJackpot flag) and jackpot > 0.
 * - Desktop: shows tooltip on hover over the value or info icon
 * - Mobile: shows popover on click of info icon
 */

'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { getMoneyOutColorClass } from '@/lib/utils/financial/colors';
import { Info } from 'lucide-react';

interface MoneyOutCellProps {
  moneyOut: number;
  moneyIn: number;
  jackpot: number;
  displayValue: string;
  className?: string;
  underlineClass?: string;
  includeJackpot?: boolean;
  showInfoIcon?: boolean; // Show clickable info icon (for cards). Tables use popover on value itself.
}

export function MoneyOutCell({
  moneyOut,
  moneyIn,
  jackpot,
  displayValue,
  className = '',
  underlineClass = '',
  includeJackpot = false,
  showInfoIcon = false,
}: MoneyOutCellProps) {
  const colorClass = getMoneyOutColorClass(moneyOut, moneyIn);

  if (!includeJackpot || jackpot <= 0) {
    return <span className={`font-semibold ${colorClass} ${className}`}>{displayValue}</span>;
  }

  // moneyOut from the API already includes jackpot when includeJackpot is true
  // So: baseMoneyOut = moneyOut - jackpot, and total = moneyOut
  const baseMoneyOut = moneyOut - jackpot;
  const adjustedMoneyOut = moneyOut;

  const breakdownContent = (
    <div className="space-y-1 text-xs">
      <p className="font-semibold text-blue-600 flex items-center gap-1">
        Money Out Breakdown
      </p>
      <p>
        Base Total Cancelled Credits: <span className="font-bold">{baseMoneyOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </p>
      <p>
        + Jackpot: <span className="font-bold text-amber-600">{jackpot.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </p>
      <p className="border-t border-gray-200 pt-1">
        Total Money Out: <span className="font-bold">{adjustedMoneyOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </p>
      <p className="mt-2 text-[10px] text-gray-500 italic">
        * Jackpot is included in Money Out for this licencee.
      </p>
    </div>
  );

  if (!showInfoIcon) {
    // Table view: hover tooltip on desktop, click popover as fallback
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`cursor-default font-semibold border-b border-dotted border-gray-400 ${colorClass} ${className} ${underlineClass}`}
            >
              {displayValue}
            </span>
          </TooltipTrigger>
          <TooltipContent className="w-auto max-w-xs p-3 bg-white text-gray-900 border shadow-lg" side="top" align="center">
            {breakdownContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Card view: hover tooltip on desktop for value + info icon, click popover on mobile
  return (
    <div className={`inline-flex items-center gap-1 ${underlineClass}`}>
      {/* Desktop: tooltip on hover over value */}
      <span className="hidden md:inline">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`cursor-default font-semibold border-b border-dotted border-gray-400 ${colorClass} ${className}`}>
                {displayValue}
              </span>
            </TooltipTrigger>
            <TooltipContent className="w-auto max-w-xs p-3 bg-white text-gray-900 border shadow-lg" side="top" align="center">
              {breakdownContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
      {/* Mobile: plain value + clickable info icon */}
      <span className={`md:hidden font-semibold border-b border-dotted border-gray-400 ${colorClass} ${className}`}>
        {displayValue}
      </span>
      {/* Info icon: tooltip on desktop hover, popover on mobile click */}
      <span className="hidden md:inline-flex">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex flex-shrink-0 cursor-default text-amber-500 hover:text-amber-600">
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="w-auto max-w-xs p-3 bg-white text-gray-900 border shadow-lg" side="top" align="center">
              {breakdownContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
      <span className="md:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex flex-shrink-0 cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none"
              aria-label="Money Out breakdown"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-xs p-3" side="top" align="center">
            {breakdownContent}
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}
