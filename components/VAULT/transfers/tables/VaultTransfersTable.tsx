/**
 * Vault Transfers Table Component
 *
 * Displays vault transfers with responsive table/card views.
 *
 * @module components/VAULT/transfers/tables/VaultTransfersTable
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
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { VaultTransfer } from '@/shared/types/vault';
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  User,
  X,
} from 'lucide-react';

export type TransferSortOption =
  | 'date'
  | 'from'
  | 'to'
  | 'amount'
  | 'initiatedBy'
  | 'approvedBy'
  | 'status';

type VaultTransfersTableProps = {
  transfers: VaultTransfer[];
  sortOption?: TransferSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: TransferSortOption) => void;
  onApprove?: (transferId: string) => void;
  onReject?: (transferId: string) => void;
  showActions?: boolean;
};

export default function VaultTransfersTable({
  transfers,
  onApprove,
  onReject,
  showActions = false,
}: VaultTransfersTableProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Computed
  // ============================================================================
  const formatDate = (dateString: string | Date) => {
    return safeFormatDate(dateString);
  };

  // ============================================================================
  // Render
  // ============================================================================
  // Guard: No transfers to display
  if (transfers.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center shadow-md">
        <p className="text-gray-500">No transfers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden overflow-x-auto rounded-lg bg-container shadow-md lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button text-white hover:bg-button">
              <TableHead className="font-semibold text-white">
                Date/Time
              </TableHead>
              <TableHead className="font-semibold text-white">From</TableHead>
              <TableHead className="text-center font-semibold text-white">
                <ArrowLeftRight className="mx-auto h-4 w-4" />
              </TableHead>
              <TableHead className="font-semibold text-white">To</TableHead>
              <TableHead className="text-right font-semibold text-white">
                Amount
              </TableHead>
              <TableHead className="font-semibold text-white">Status</TableHead>
              <TableHead className="font-semibold text-white">Notes</TableHead>
              {showActions && (
                <TableHead className="text-right font-semibold text-white">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map(transfer => {
              const isCompleted = transfer.status === 'completed';

              return (
                <TableRow
                  key={transfer._id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(transfer.createdAt || transfer.date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {transfer.from}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="mx-auto h-3 w-3 text-gray-300" />
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {transfer.to}
                  </TableCell>
                  <TableCell className="text-right font-bold text-orangeHighlight">
                    {formatAmount(transfer.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'px-2 py-0.5 text-[10px]',
                        isCompleted ? 'bg-button' : 'bg-orangeHighlight'
                      )}
                    >
                      {transfer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs text-gray-500">
                    {transfer.notes || '-'}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {!isCompleted && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onApprove?.(transfer._id)}
                            className="rounded-full bg-button p-1.5 text-white"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onReject?.(transfer._id)}
                            className="rounded-full bg-red-600 p-1.5 text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        {transfers.map(transfer => {
          const isCompleted = transfer.status === 'completed';

          return (
            <Card
              key={transfer._id}
              className="overflow-hidden border-l-4 border-l-button shadow-sm"
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />{' '}
                    {formatDate(transfer.createdAt || transfer.date)}
                  </div>
                  <span className="text-lg font-black text-orangeHighlight">
                    {formatAmount(transfer.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded bg-gray-50 px-2 py-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                      Source
                    </span>
                    <span className="max-w-[100px] truncate font-semibold">
                      {transfer.from}
                    </span>
                  </div>
                  <ArrowRight className="mx-2 h-4 w-4 text-gray-300" />
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                      Destination
                    </span>
                    <span className="max-w-[100px] truncate font-semibold">
                      {transfer.to}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge
                    className={cn(
                      'px-2 py-0.5 text-[10px]',
                      isCompleted ? 'bg-button' : 'bg-orangeHighlight'
                    )}
                  >
                    {transfer.status || 'Pending'}
                  </Badge>
                  <div className="flex max-w-[150px] items-center gap-1.5 truncate text-xs text-gray-400">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate italic">
                      {transfer.notes || 'No notes'}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                  <User className="h-3 w-3" />
                  <span>Initiated by: {transfer.initiatedBy}</span>
                </div>

                {showActions && !isCompleted && (
                  <div className="mt-2 flex gap-2 border-t border-gray-100 pt-2">
                    <Button
                      size="sm"
                      className="h-8 flex-1 bg-button text-xs"
                      onClick={() => onApprove?.(transfer._id)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 flex-1 text-xs"
                      onClick={() => onReject?.(transfer._id)}
                    >
                      <X className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
