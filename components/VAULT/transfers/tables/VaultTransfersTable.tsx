/**
 * Vault Transfers Desktop Table Component
 *
 * Desktop table component for displaying vault transfers.
 * Used on large screens (lg and above).
 *
 * Features:
 * - Sortable columns (click headers to sort)
 * - From/To columns with transfer flow indicators
 * - Amount column
 * - Status column (completed/pending)
 * - Action buttons for pending transfers
 * - Responsive design (hidden on mobile/tablet)
 *
 * @module components/VAULT/transfers/tables/VaultTransfersTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { VaultTransfer } from '@/shared/types/vault';
import { ArrowLeftRight, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TransferSortOption =
  | 'dateTime'
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

/**
 * Vault Transfers Desktop Table
 * Displays transfers in a sortable table format for desktop screens
 */
export default function VaultTransfersTable({
  transfers,
  sortOption,
  sortOrder = 'asc',
  onSort,
  onApprove,
  onReject,
  showActions = false,
}: VaultTransfersTableProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (transfers.length === 0) {
    return (
      <div className="hidden rounded-lg bg-container p-8 text-center shadow-md lg:block">
        <p className="text-gray-500">No transfers found</p>
      </div>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-lg bg-container shadow-md lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead
              isFirstColumn
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('dateTime') : undefined}
            >
              Date/Time
              {sortOption === 'dateTime' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('from') : undefined}
            >
              From
              {sortOption === 'from' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead className="font-semibold text-white"></TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('to') : undefined}
            >
              To
              {sortOption === 'to' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('amount') : undefined}
            >
              Amount
              {sortOption === 'amount' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('initiatedBy') : undefined}
            >
              Initiated By
              {sortOption === 'initiatedBy' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('approvedBy') : undefined}
            >
              Approved By
              {sortOption === 'approvedBy' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('status') : undefined}
            >
              Status
              {sortOption === 'status' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead className="font-semibold text-white">Notes</TableHead>
            {showActions && (
              <TableHead className="font-semibold text-white">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map(transfer => {
            const isCompleted = transfer.status === 'completed';

            return (
              <TableRow key={transfer.id} className="transition-colors hover:bg-muted/30">
                <TableCell isFirstColumn className="font-medium">
                  {transfer.dateTime}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded border border-gray-300">
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                    </div>
                    {transfer.from}
                  </div>
                </TableCell>
                <TableCell>
                  <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded border border-gray-300">
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                    </div>
                    {transfer.to}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-orangeHighlight">
                  {formatAmount(transfer.amount)}
                </TableCell>
                <TableCell>{transfer.initiatedBy}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {transfer.approvedBy || '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'px-2 py-1',
                      isCompleted
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                    )}
                  >
                    {transfer.status === 'completed' ? 'Completed' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{transfer.notes || '-'}</TableCell>
                {showActions && (
                  <TableCell>
                    {!isCompleted && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApprove?.(transfer.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-button text-white hover:bg-button/90"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onReject?.(transfer.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-600/90"
                          title="Reject"
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
  );
}
