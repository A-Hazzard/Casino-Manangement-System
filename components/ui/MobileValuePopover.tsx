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

