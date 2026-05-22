/**
 * Vault Float Requests Table Component
 *
 * Displays float requests with responsive table/card views.
 *
 * @module components/VAULT/cashier/float-requests/tables/VaultFloatRequestsTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, Info, X } from 'lucide-react';

type FloatRequest = {
  id: string;
  cashier: string;
  cashierId?: string;
  station: string;
  type: 'Increase' | 'Decrease';
  amount: number;
  currentFloat?: number;
  newFloat?: number;
  reason?: string;
  requested?: string;
  processed?: string;
  processedBy?: string;
  status?: 'approved' | 'rejected' | 'pending';
};

export type FloatRequestSortOption =
  | 'cashier'
  | 'type'
  | 'amount'
  | 'currentFloat'
  | 'newFloat'
  | 'requested'
  | 'processed'
  | 'status';

type VaultFloatRequestsTableProps = {
  requests: FloatRequest[];
  sortOption?: FloatRequestSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: FloatRequestSortOption) => void;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  showActions?: boolean;
  showHistory?: boolean;
  disabled?: boolean;
};

export default function VaultFloatRequestsTable({
  requests,
  onSort,
  onApprove,
  onReject,
  showActions = false,
  showHistory = false,
  disabled = false,
}: VaultFloatRequestsTableProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Computed
  // ============================================================================
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return dateString;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Guard: empty state
  if (requests.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center shadow-md">
        <p className="text-gray-500">No float requests found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden overflow-x-auto rounded-lg border-t-4 border-orangeHighlight bg-container shadow-md lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button text-white hover:bg-button">
              <TableHead
                isFirstColumn
                className={cn(
                  'text-center font-semibold text-white',
                  onSort && 'cursor-pointer hover:bg-button/90'
                )}
                onClick={onSort ? () => onSort('type') : undefined}
              >
                Type
              </TableHead>
              <TableHead
                className={cn(
                  'text-center font-semibold text-white',
                  onSort && 'cursor-pointer hover:bg-button/90'
                )}
                onClick={onSort ? () => onSort('amount') : undefined}
              >
                Amount
              </TableHead>
              {!showHistory && (
                <>
                  <TableHead className="text-center font-semibold text-white">
                    Current Float
                  </TableHead>
                  <TableHead className="text-center font-semibold text-white">
                    New Float
                  </TableHead>
                </>
              )}
              <TableHead className="text-center font-semibold text-white">
                Reason
              </TableHead>
              {showHistory && (
                <TableHead
                  className={cn(
                    'text-center font-semibold text-white',
                    onSort && 'cursor-pointer hover:bg-button/90'
                  )}
                  onClick={onSort ? () => onSort('status') : undefined}
                >
                  Status
                </TableHead>
              )}
              <TableHead
                className={cn(
                  'text-center font-semibold text-white',
                  onSort && 'cursor-pointer hover:bg-button/90'
                )}
                onClick={onSort ? () => onSort('requested') : undefined}
              >
                Requested
              </TableHead>
              {showHistory && (
                <TableHead
                  className={cn(
                    'text-center font-semibold text-white',
                    onSort && 'cursor-pointer hover:bg-button/90'
                  )}
                  onClick={onSort ? () => onSort('processed') : undefined}
                >
                  Processed
                </TableHead>
              )}
              {showActions && (
                <TableHead className="text-right font-semibold text-white">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {requests.map(request => {
                const isIncrease = request.type?.toLowerCase() === 'increase';
                const isApproved = request.status === 'approved';
                const isRejected = request.status === 'rejected';
                const isPending = !isApproved && !isRejected;

                return (
                  <motion.tr
                    key={request.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <TableCell isFirstColumn className="text-center">
                      <Badge
                        className={cn(
                          'border-none px-2 py-0.5 text-[10px]',
                          isIncrease
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        )}
                      >
                        {isIncrease ? 'Increase' : 'Decrease'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-center font-bold',
                        isIncrease ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {isIncrease
                        ? formatAmount(request.amount)
                        : `-${formatAmount(Math.abs(request.amount))}`}
                    </TableCell>
                    {!showHistory && (
                      <>
                        <TableCell className="text-center text-sm">
                          {formatAmount(request.currentFloat || 0)}
                        </TableCell>
                        <TableCell className="text-center text-sm font-semibold">
                          {formatAmount(request.newFloat || 0)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="max-w-[150px] truncate text-center text-xs text-gray-500">
                      {request.reason || '-'}
                    </TableCell>
                    {showHistory && (
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            'px-2 py-0.5 text-[10px]',
                            isApproved
                              ? 'bg-green-600'
                              : isRejected
                                ? 'bg-red-600'
                                : 'bg-orangeHighlight'
                          )}
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap text-center text-xs text-gray-400">
                      {formatDate(request.requested)}
                    </TableCell>
                    {showHistory && (
                      <TableCell className="whitespace-nowrap text-center text-xs text-gray-400">
                        {formatDate(request.processed)}
                      </TableCell>
                    )}
                    {showActions && (
                      <TableCell className="text-right">
                        {isPending && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                !disabled && onApprove?.(request.id)
                              }
                              disabled={disabled}
                              className={cn(
                                'rounded-full bg-button p-1.5 text-white hover:bg-button/80',
                                disabled && 'cursor-not-allowed opacity-40'
                              )}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                !disabled && onReject?.(request.id)
                              }
                              disabled={disabled}
                              className={cn(
                                'rounded-full bg-red-600 p-1.5 text-white hover:bg-red-500',
                                disabled && 'cursor-not-allowed opacity-40'
                              )}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        <AnimatePresence initial={false}>
          {requests.map(request => {
            const isIncrease = request.type?.toLowerCase() === 'increase';
            const isApproved = request.status === 'approved';
            const isRejected = request.status === 'rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Card
                  className={cn(
                    'h-full overflow-hidden border-l-4 shadow-sm',
                    isIncrease ? 'border-l-green-600' : 'border-l-red-600'
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          'border-none px-2 py-1',
                          isIncrease
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        )}
                      >
                        {isIncrease ? 'Increase' : 'Decrease'}
                      </Badge>
                      <span
                        className={cn(
                          'text-lg font-black',
                          isIncrease ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {isIncrease
                          ? formatAmount(request.amount)
                          : `-${formatAmount(Math.abs(request.amount))}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-400">Current Float</span>
                        <span className="font-semibold">
                          {formatAmount(request.currentFloat || 0)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-gray-400">New Float</span>
                        <span className="font-bold">
                          {formatAmount(request.newFloat || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="whitespace-nowrap">
                          {formatDate(request.requested)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-gray-400">
                        {showHistory && (
                          <span className="whitespace-nowrap">
                            {formatDate(request.processed)}
                          </span>
                        )}
                        <Badge
                          className={cn(
                            'px-2 py-0.5 text-[10px]',
                            isApproved
                              ? 'bg-green-600'
                              : isRejected
                                ? 'bg-red-600'
                                : 'bg-orangeHighlight'
                          )}
                        >
                          {request.status || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 border-t border-gray-100 pt-2">
                      <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" />
                      <p className="line-clamp-2 text-[11px] italic text-gray-500">
                        {request.reason || 'No reason provided'}
                      </p>
                    </div>

                    {showActions && isPending && (
                      <div className="mt-2 flex gap-2 border-t border-gray-100 pt-2">
                        <Button
                          className={cn(
                            'h-8 flex-1 bg-button text-xs hover:bg-button',
                            disabled && 'cursor-not-allowed opacity-40'
                          )}
                          onClick={() => !disabled && onApprove?.(request.id)}
                          disabled={disabled}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className={cn(
                            'h-8 flex-1 text-xs',
                            disabled && 'cursor-not-allowed opacity-40'
                          )}
                          onClick={() => !disabled && onReject?.(request.id)}
                          disabled={disabled}
                        >
                          <X className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
