/**
 * Alert Dialog Components
 * Reusable alert dialog component using Radix UI primitives.
 *
 * Features:
 * - AlertDialog root, trigger, portal components
 * - AlertDialogOverlay with backdrop
 * - AlertDialogContent with animations
 * - AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter
 * - AlertDialogAction and AlertDialogCancel buttons
 * - Accessible and keyboard-friendly
 * - Smooth animations
 */
'use client';

import { HTMLAttributes, Ref } from 'react';
import { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import { buttonVariants } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Alert Dialog Components
// ============================================================================

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & { ref?: Ref<ElementRef<typeof AlertDialogPrimitive.Overlay>> }) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-[100000] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
    ref={ref}
  />
);
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & { ref?: Ref<ElementRef<typeof AlertDialogPrimitive.Content>> }) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-[100001] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
);
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & { ref?: Ref<ElementRef<typeof AlertDialogPrimitive.Title>> }) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
);
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> & { ref?: Ref<ElementRef<typeof AlertDialogPrimitive.Description>> }) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
);
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & { ref?: Ref<ElementRef<typeof AlertDialogPrimitive.Action>> }) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
);
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = ({ ref,  className, ...props }: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> & { ref?: Ref<ElementRef<typeof AlertDialogPrimitive.Cancel>> }) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: 'outline' }),
      'mt-2 sm:mt-0',
      className
    )}
    {...props}
  />
);
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
};
