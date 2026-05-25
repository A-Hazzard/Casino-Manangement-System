/**
 * Label Component
 * Reusable label component for form inputs.
 *
 * Features:
 * - Accessible label implementation using Radix UI
 * - Consistent styling
 * - Disabled state support
 */
'use client';

import { Ref } from 'react';
import { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// ============================================================================
// Label Variants
// ============================================================================

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & { ref?: Ref<ElementRef<typeof LabelPrimitive.Root>> }) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
