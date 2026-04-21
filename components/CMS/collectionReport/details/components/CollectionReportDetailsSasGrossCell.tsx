/**
 * CollectionReportDetailsSasGrossCell Component
 *
 * Renders the SAS Gross value, optionally deducting jackpots if the report
 * is configured to use Net Gross. Includes a detailed tooltip explaining the deduction.
 */

'use client';

import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/shared/ui/tooltip';
import type { MachineMetric } from '@/lib/types/api';
import Image from 'next/image';
import { FC } from 'react';

type CollectionReportDetailsSasGrossCellProps = {
  metric: MachineMetric;
  useNetGross: boolean;
};

export const CollectionReportDetailsSasGrossCell: FC<CollectionReportDetailsSasGrossCellProps> = ({
  metric,
  useNetGross,
}) => {
  // "No SAS Data" is a sentinel string — display as-is without any numeric processing
  if (metric.sasGross === 'No SAS Data') {
    return (
      <span className="font-medium text-gray-500 italic">No SAS Data</span>
    );
  }

  // formatSmartDecimal always returns a string — convert back to number for arithmetic
  const jackpot = metric.jackpot ?? 0;
  const hasJackpotDeduction = useNetGross && jackpot > 0;

  const rawSasGross = Number(metric.sasGross) || 0;
  const adjustedSasGross = hasJackpotDeduction ? rawSasGross - jackpot : rawSasGross;

  const fmt = (v: number) => {
    const frac = Math.abs(v % 1);
    return '$' + v.toLocaleString(undefined, frac >= 0.1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    );
  };

  const displayValue = fmt(hasJackpotDeduction ? adjustedSasGross : rawSasGross);

  if (!hasJackpotDeduction) {
    return (
      <span className={`font-medium ${rawSasGross < 0 ? 'text-red-600' : 'text-green-600'}`}>{displayValue}</span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-help border-b border-dotted border-gray-400">
            <span className={`font-medium ${adjustedSasGross < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {displayValue}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-amber-600 flex items-center gap-1">
              <Image src="/jackpot.svg" alt="Jackpot" width={12} height={12} className="inline-block" />
              Jackpot Deduction Applied
            </p>
            <p>
              SAS Gross (original):
              <span className="font-bold ml-1">{fmt(rawSasGross)}</span>
            </p>
            <p>
              Jackpot:
              <span className="font-bold text-red-500 ml-1">
                -{fmt(jackpot)}
              </span>
            </p>
            <p className="border-t border-gray-200 pt-1">
              Net SAS Gross: <span className="font-bold ml-1">{displayValue}</span>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
