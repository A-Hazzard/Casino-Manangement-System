/**
 * Table Components
 * Reusable table component with header, body, footer, and cell components.
 *
 * Features:
 * - Table container with overflow handling
 * - TableHeader, TableBody, TableFooter sections
 * - TableRow, TableHead, TableCell components
 * - TableCaption for accessibility
 * - Centered/left alignment options
 * - Hover and selected states
 */

import { HTMLAttributes, Ref } from 'react';
import { TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Table Components
// ============================================================================

const Table = ({ ref,  className, ...props }: HTMLAttributes<HTMLTableElement> & { ref?: Ref<HTMLTableElement> }) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
Table.displayName = 'Table';

const TableHeader = ({ ref,  className, ...props }: HTMLAttributes<HTMLTableSectionElement> & { ref?: Ref<HTMLTableSectionElement> }) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
);
TableHeader.displayName = 'TableHeader';

const TableBody = ({ ref,  className, ...props }: HTMLAttributes<HTMLTableSectionElement> & { ref?: Ref<HTMLTableSectionElement> }) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
);
TableBody.displayName = 'TableBody';

const TableFooter = ({ ref,  className, ...props }: HTMLAttributes<HTMLTableSectionElement> & { ref?: Ref<HTMLTableSectionElement> }) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
);
TableFooter.displayName = 'TableFooter';

const TableRow = ({ ref,  className, ...props }: HTMLAttributes<HTMLTableRowElement> & { ref?: Ref<HTMLTableRowElement> }) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
);
TableRow.displayName = 'TableRow';

const TableHead = ({ ref,  className, centered = true, isFirstColumn = false, ...props }: ThHTMLAttributes<HTMLTableCellElement> & {
    centered?: boolean;
    isFirstColumn?: boolean;
  } & { ref?: Ref<HTMLTableCellElement> }) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      isFirstColumn ? 'text-left' : centered ? 'text-center' : 'text-left',
      className
    )}
    {...props}
  />
);
TableHead.displayName = 'TableHead';

const TableCell = ({ ref,  className, centered = true, isFirstColumn = false, ...props }: TdHTMLAttributes<HTMLTableCellElement> & {
    centered?: boolean;
    isFirstColumn?: boolean;
  } & { ref?: Ref<HTMLTableCellElement> }) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle [&:has([role=checkbox])]:pr-0',
      isFirstColumn ? 'text-left' : centered ? 'text-center' : 'text-left',
      className
    )}
    {...props}
  />
);
TableCell.displayName = 'TableCell';

const TableCaption = ({ ref,  className, ...props }: HTMLAttributes<HTMLTableCaptionElement> & { ref?: Ref<HTMLTableCaptionElement> }) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
);
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
