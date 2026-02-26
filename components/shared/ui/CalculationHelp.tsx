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
      <PopoverContent className="w-80 p-4 shadow-xl z-[200]">
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-primary border-b pb-1">{title}</h4>
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <p className="text-xs font-mono break-words leading-relaxed">
              <span className="font-bold text-blue-600">Formula:</span><br />
              {formula}
            </p>
          </div>
          {description && (
            <p className="text-xs text-gray-600 leading-normal italic">
              {description}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
