/**
 * CalculationHelp Component
 *
 * Provides a popover with information about how a value is calculated.
 */

'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { Info } from 'lucide-react';

type CalculationHelpProps = {
  title: string;
  formula: string;
  description?: string;
  className?: string;
};

export function CalculationHelp({
  title,
  formula,
  description,
  className = '',
}: CalculationHelpProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`ml-1.5 inline-flex items-center text-gray-400 transition-colors hover:text-blue-500 ${className}`}
          title={`Calculation Info for ${title}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100003] w-72 max-w-[calc(100vw-40px)] border-2 bg-white p-4 shadow-2xl"
        align="center"
        side="top"
        sideOffset={8}
      >
        <div className="space-y-3">
          <h4 className="flex items-center gap-1.5 border-b border-blue-100 pb-2 text-sm font-extrabold text-blue-900">
            <Info className="h-4 w-4 text-blue-500" />
            {title}
          </h4>
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
            <p className="break-words font-mono text-[11px] leading-relaxed text-blue-900">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700">
                The Formula:
              </span>
              <br />
              {formula}
            </p>
          </div>
          {description && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
              <p className="text-xs leading-normal text-gray-700">
                <span className="mr-1 font-bold text-gray-900">
                  Explanation:
                </span>
                {description}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
