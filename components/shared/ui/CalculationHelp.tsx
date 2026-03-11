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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`ml-1.5 inline-flex items-center text-gray-400 hover:text-blue-500 transition-colors ${className}`}
          title={`Calculation Info for ${title}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 max-w-[calc(100vw-40px)] p-4 shadow-2xl z-[100003] bg-white border-2"
        align="center"
        side="top"
        sideOffset={8}
      >
        <div className="space-y-3">
          <h4 className="font-extrabold text-sm text-blue-900 border-b border-blue-100 pb-2 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-500" />
            {title}
          </h4>
          <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <p className="text-[11px] font-mono break-words leading-relaxed text-blue-900">
              <span className="font-bold text-blue-700 uppercase tracking-wider text-[9px]">The Formula:</span><br />
              {formula}
            </p>
          </div>
          {description && (
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-700 leading-normal">
                <span className="font-bold text-gray-900 mr-1">Explanation:</span>
                {description}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
