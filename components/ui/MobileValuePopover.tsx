/**
 * Mobile Value Popover Component
 * Component for displaying truncated values with popover for full value on mobile.
 *
 * Features:
 * - Truncated value display
 * - Popover with full value on click
 * - Info icon indicator
 * - Conditional icon display
 *
 * @param displayValue - Truncated value to display
 * @param fullValue - Full value to show in popover
 * @param showIcon - Whether to show info icon
 * @param className - Additional CSS classes
 */
'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileValuePopoverProps = {
  displayValue: string;
  fullValue: string;
  showIcon: boolean;
  className?: string;
};

export default function MobileValuePopover({
  displayValue,
  fullValue,
  showIcon,
  className,
}: MobileValuePopoverProps) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {displayValue}
      {showIcon && (
        <Popover>
          <PopoverTrigger asChild>
            <Info className="h-3 w-3 text-gray-400 cursor-pointer hover:text-gray-600" />
          </PopoverTrigger>
          <PopoverContent className="w-auto text-sm">
            {fullValue}
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}

