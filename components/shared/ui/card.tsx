/**
 * Card Components
 * Reusable card component with header, content, and footer sections.
 *
 * Features:
 * - Card container with border and shadow
 * - CardHeader for title and description
 * - CardTitle for main heading
 * - CardDescription for subtitle
 * - CardContent for main content
 * - CardFooter for actions
 */
import { HTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Card Components
// ============================================================================

const Card = ({ ref,  className, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm',
        className
      )}
      {...props}
    />
  );
Card.displayName = 'Card';

const CardHeader = ({ ref,  className, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
CardHeader.displayName = 'CardHeader';

const CardTitle = ({ ref,  className, ...props }: HTMLAttributes<HTMLHeadingElement> & { ref?: Ref<HTMLParagraphElement> }) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
);
CardTitle.displayName = 'CardTitle';

const CardDescription = ({ ref,  className, ...props }: HTMLAttributes<HTMLParagraphElement> & { ref?: Ref<HTMLParagraphElement> }) => (
  <p ref={ref} className={cn('text-sm text-gray-500', className)} {...props} />
);
CardDescription.displayName = 'CardDescription';

const CardContent = ({ ref,  className, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  );
CardContent.displayName = 'CardContent';

const CardFooter = ({ ref,  className, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
