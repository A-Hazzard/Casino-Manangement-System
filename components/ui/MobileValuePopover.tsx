'use client';

import * as React from 'react';
import { Maximize2 } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type PopoverSide = 'top' | 'bottom' | 'left' | 'right';
type PopoverAlign = 'start' | 'center' | 'end';

type MobileValuePopoverProps = {
  displayValue: string;
  fullValue?: string;
  className?: string;
  triggerClassName?: string;
  popoverLabel?: string;
  disabled?: boolean;
  side?: PopoverSide;
  align?: PopoverAlign;
  showIcon?: boolean;
  desktopBreakpoint?: 'md' | 'lg';
};

export function MobileValuePopover({
  displayValue,
  fullValue,
  className,
  triggerClassName,
  popoverLabel = 'Full value',
  disabled = false,
  side = 'top',
  align = 'center',
  showIcon = true,
  desktopBreakpoint = 'md',
}: MobileValuePopoverProps) {
  const safeFullValue = fullValue ?? displayValue;
  const shouldDisable =
    disabled || !safeFullValue || safeFullValue === '--' || displayValue === '--';

  if (shouldDisable) {
    return (
      <span className={cn('inline-block max-w-full', className)}>
        {displayValue}
      </span>
    );
  }

  const desktopVisibilityClass =
    desktopBreakpoint === 'lg' ? 'lg:inline' : 'md:inline';
  const mobileHiddenClass =
    desktopBreakpoint === 'lg' ? 'lg:hidden' : 'md:hidden';

  return (
    <span className={cn('inline-block max-w-full', className)}>
      <span className={cn('hidden', desktopVisibilityClass)}>{displayValue}</span>
      <span className={cn('block', mobileHiddenClass)}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex w-full items-center justify-center gap-1 truncate rounded-sm px-1 py-0.5 text-inherit underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                triggerClassName
              )}
              aria-label={`${popoverLabel}: ${safeFullValue}`}
            >
              <span className="inline-flex min-w-0 flex-1 truncate">
                {displayValue}
              </span>
              {showIcon ? (
                <Maximize2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side={side}
            align={align}
            className="w-[min(320px,calc(100vw-2.5rem))] max-w-sm space-y-2 rounded-lg border-border bg-background p-4 text-center shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {popoverLabel}
            </p>
            <p className="break-words font-mono text-base font-semibold text-foreground">
              {safeFullValue}
            </p>
            <p className="text-[11px] text-muted-foreground">Tap outside to close</p>
          </PopoverContent>
        </Popover>
      </span>
    </span>
  );
}

export default MobileValuePopover;
