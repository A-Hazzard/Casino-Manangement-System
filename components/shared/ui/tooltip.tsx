/**
 * Tooltip Components
 * Reusable tooltip component using Radix UI primitives.
 *
 * Features:
 * - TooltipProvider for global tooltip configuration
 * - Tooltip root, trigger, content components
 * - Positional alignment
 * - Smooth animations
 * - Accessible implementation
 */
'use client';

import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

// ============================================================================
// Tooltip Components
// ============================================================================

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[9999] overflow-hidden rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

