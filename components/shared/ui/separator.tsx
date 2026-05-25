/**
 * Separator Component
 * Reusable separator component for dividing content sections.
 *
 * Features:
 * - Horizontal or vertical orientation
 * - Decorative option for accessibility
 * - Consistent styling
 */
'use client';

import { Ref } from 'react';
import { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

const Separator = ({ ref,  className, orientation = 'horizontal', decorative = true, ...props }: ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & { ref?: Ref<ElementRef<typeof SeparatorPrimitive.Root>> }) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  );
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
