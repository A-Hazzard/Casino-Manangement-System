/**
 * Vault Float Requests Desktop Table Component
 *
 * Desktop table component for displaying float requests.
 * Used on large screens (lg and above).
 *
 * Features:
 * - Sortable columns (click headers to sort)
 * - Cashier/Station column
 * - Type column (Increase/Decrease)
 * - Amount column
 * - Current Float and New Float columns
 * - Reason column
 * - Requested/Processed timestamp columns
 * - Action buttons for pending requests
 * - Responsive design (hidden on mobile/tablet)
 *
 * @module components/VAULT/cashier/float-requests/tables/VaultFloatRequestsTable
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
import { CheckCircle2, Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type FloatRequest = {
  id: string;
  cashier: string;
  station: string;
  type: 'Increase' | 'Decrease';
  amount: number;
  currentFloat?: number;
  newFloat?: number;
  reason?: string;
  requested?: string;
  processed?: string;
  processedBy?: string;
  status?: 'completed' | 'pending';
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
};

/**
 * Vault Float Requests Desktop Table
 * Displays float requests in a sortable table format for desktop screens
 */
export default function VaultFloatRequestsTable({
  requests,
  sortOption,
  sortOrder = 'asc',
  onSort,
  onApprove,
  onReject,
  showActions = false,
  showHistory = false,
}: VaultFloatRequestsTableProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (requests.length === 0) {
    return (
      <div className="hidden rounded-lg bg-container p-8 text-center shadow-md lg:block">
        <p className="text-gray-500">No float requests found</p>
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
              onClick={onSort ? () => onSort('cashier') : undefined}
            >
              Cashier
              {sortOption === 'cashier' && (
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
              onClick={onSort ? () => onSort('type') : undefined}
            >
              Type
              {sortOption === 'type' && (
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
            {!showHistory && (
              <>
                <TableHead
                  className={cn(
                    'relative cursor-pointer select-none font-semibold text-white',
                    onSort && 'hover:bg-button/90'
                  )}
                  onClick={onSort ? () => onSort('currentFloat') : undefined}
                >
                  Current Float
                  {sortOption === 'currentFloat' && (
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
                  onClick={onSort ? () => onSort('newFloat') : undefined}
                >
                  New Float
                  {sortOption === 'newFloat' && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                      {sortOrder === 'desc' ? '▼' : '▲'}
                    </span>
                  )}
                </TableHead>
              </>
            )}
            <TableHead className="font-semibold text-white">Reason</TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('requested') : undefined}
            >
              {showHistory ? 'Requested' : 'Requested'}
              {sortOption === 'requested' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            {showHistory && (
              <>
                <TableHead
                  className={cn(
                    'relative cursor-pointer select-none font-semibold text-white',
                    onSort && 'hover:bg-button/90'
                  )}
                  onClick={onSort ? () => onSort('processed') : undefined}
                >
                  Processed
                  {sortOption === 'processed' && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                      {sortOrder === 'desc' ? '▼' : '▲'}
                    </span>
                  )}
                </TableHead>
                <TableHead className="font-semibold text-white">Processed By</TableHead>
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
              </>
            )}
            {showActions && <TableHead className="font-semibold text-white">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(request => {
            const isIncrease = request.type === 'Increase';
            const isCompleted = request.status === 'completed';

            return (
              <TableRow key={request.id} className="transition-colors hover:bg-muted/30">
                <TableCell isFirstColumn className="font-medium">
                  {request.cashier} / {request.station}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'px-2 py-1',
                      isIncrease
                        ? 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                        : 'bg-lighterBlueHighlight text-white hover:bg-lighterBlueHighlight/90'
                    )}
                  >
                    {isIncrease ? (
                      <>
                        <Plus className="mr-1 h-3 w-3" />
                        Increase
                      </>
                    ) : (
                      <>
                        <Minus className="mr-1 h-3 w-3" />
                        Decrease
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'font-semibold',
                      isIncrease ? 'text-button' : 'text-lighterBlueHighlight'
                    )}
                  >
                    {isIncrease ? '+' : ''}
                    {formatAmount(Math.abs(request.amount))}
                  </span>
                </TableCell>
                {!showHistory && (
                  <>
                    <TableCell className="font-semibold">
                      {request.currentFloat !== undefined
                        ? formatAmount(request.currentFloat)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-orangeHighlight">
                        {request.newFloat !== undefined ? formatAmount(request.newFloat) : '-'}
                      </span>
                    </TableCell>
                  </>
                )}
                <TableCell className="text-sm text-gray-600">{request.reason || '-'}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {request.requested || '-'}
                </TableCell>
                {showHistory && (
                  <>
                    <TableCell className="text-sm text-gray-600">
                      {request.processed || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {request.processedBy || '-'}
                    </TableCell>
                    <TableCell>
                      {request.status && (
                        <Badge
                          className={cn(
                            'px-2 py-1',
                            isCompleted
                              ? 'bg-button text-white hover:bg-button/90'
                              : 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                          )}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Approved
                            </>
                          ) : (
                            'Pending'
                          )}
                        </Badge>
                      )}
                    </TableCell>
                  </>
                )}
                {showActions && (
                  <TableCell>
                    {!isCompleted && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onApprove?.(request.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-button text-white hover:bg-button/90"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onReject?.(request.id)}
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
