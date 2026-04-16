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
  if (typeof metric.sasGross === 'string') {
    return (
      <span className="font-medium text-gray-500 italic">{metric.sasGross}</span>
    );
  }

  const jackpot = metric.jackpot ?? 0;
  const hasJackpotDeduction = useNetGross && jackpot > 0;

  const rawSasGross = Number(metric.sasGross) || 0;
  const adjustedSasGross = hasJackpotDeduction ? rawSasGross - jackpot : rawSasGross;

  const displayValue = hasJackpotDeduction
    ? adjustedSasGross.toLocaleString(undefined, { minimumFractionDigits: 2 })
    : rawSasGross.toLocaleString(undefined, { minimumFractionDigits: 2 });

  if (!hasJackpotDeduction) {
    return (
      <span className="font-medium text-gray-900">{displayValue}</span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-help border-b border-dotted border-gray-400">
            <span className={`font-medium ${adjustedSasGross < 0 ? 'text-red-600' : 'text-gray-900'}`}>
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
              <span className="font-bold ml-1">
                {rawSasGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </p>
            <p>
              Jackpot: 
              <span className="font-bold text-red-500 ml-1">
                - {jackpot.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
