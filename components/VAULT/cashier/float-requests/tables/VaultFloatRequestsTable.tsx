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
  sortOption: _sortOption,
  sortOrder: _sortOrder = 'asc',
  onSort,
  onApprove,
  onReject,
  showActions = false,
  showHistory = false,
  disabled = false,
}: VaultFloatRequestsTableProps) {
  const { formatAmount } = useCurrencyFormat();

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
        hour12: true
      }).format(date);
    } catch {
      return dateString;
    }
  };

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
      <div className="hidden lg:block overflow-x-auto rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button text-white">
              <TableHead 
                isFirstColumn
                className={cn('font-semibold text-white text-center', onSort && 'cursor-pointer hover:bg-button/90')}
                onClick={onSort ? () => onSort('type') : undefined}
              >
                Type
              </TableHead>
              <TableHead 
                className={cn('font-semibold text-white text-center', onSort && 'cursor-pointer hover:bg-button/90')}
                onClick={onSort ? () => onSort('amount') : undefined}
              >
                Amount
              </TableHead>
              {!showHistory && (
                <>
                  <TableHead className="font-semibold text-white text-center">Current Float</TableHead>
                  <TableHead className="font-semibold text-white text-center">New Float</TableHead>
                </>
              )}
              <TableHead className="font-semibold text-white text-center">Reason</TableHead>
              <TableHead 
                className={cn('font-semibold text-white text-center', onSort && 'cursor-pointer hover:bg-button/90')}
                onClick={onSort ? () => onSort('requested') : undefined}
              >
                Requested
              </TableHead>
              {showHistory && (
                <>
                  <TableHead 
                    className={cn('font-semibold text-white text-center', onSort && 'cursor-pointer hover:bg-button/90')}
                    onClick={onSort ? () => onSort('processed') : undefined}
                  >
                    Processed
                  </TableHead>
                  <TableHead 
                    className={cn('font-semibold text-white text-center', onSort && 'cursor-pointer hover:bg-button/90')}
                    onClick={onSort ? () => onSort('status') : undefined}
                  >
                    Status
                  </TableHead>
                </>
              )}
              {showActions && <TableHead className="font-semibold text-white text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(request => {
              const isIncrease = request.type === 'Increase';
              const isApproved = request.status === 'approved';
              const isRejected = request.status === 'rejected';
              const isPending = !isApproved && !isRejected;

              return (
                <TableRow key={request.id} className="transition-colors hover:bg-muted/30">
                  <TableCell isFirstColumn className="text-center">
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isIncrease ? 'bg-button text-white' : 'bg-lighterBlueHighlight text-white')}>
                      {isIncrease ? 'Increase' : 'Decrease'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-center font-bold', isIncrease ? 'text-button' : 'text-lighterBlueHighlight')}>
                    {formatAmount(request.amount)}
                  </TableCell>
                  {!showHistory && (
                    <>
                      <TableCell className="text-center text-sm">{formatAmount(request.currentFloat || 0)}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-orangeHighlight">
                        {formatAmount(request.newFloat || 0)}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-center text-xs text-gray-500 max-w-[150px] truncate">{request.reason || '-'}</TableCell>
                  <TableCell className="text-center text-xs text-gray-400 whitespace-nowrap">{formatDate(request.requested)}</TableCell>
                  {showHistory && (
                    <>
                      <TableCell className="text-center text-xs text-gray-400 whitespace-nowrap">{formatDate(request.processed)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn('px-2 py-0.5 text-[10px]', isApproved ? 'bg-green-600' : isRejected ? 'bg-red-600' : 'bg-orangeHighlight')}>
                          {request.status}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                  {showActions && (
                    <TableCell className="text-right">
                      {isPending && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => !disabled && onApprove?.(request.id)} 
                            disabled={disabled}
                            className={cn("p-1.5 rounded-full bg-button text-white hover:bg-button/80", disabled && "opacity-40 cursor-not-allowed")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => !disabled && onReject?.(request.id)} 
                            disabled={disabled}
                            className={cn("p-1.5 rounded-full bg-red-600 text-white hover:bg-red-500", disabled && "opacity-40 cursor-not-allowed")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {requests.map(request => {
          const isIncrease = request.type === 'Increase';
          const isApproved = request.status === 'approved';
          const isRejected = request.status === 'rejected';
          const isPending = !isApproved && !isRejected;

          return (
            <Card key={request.id} className={cn("overflow-hidden border-l-4 shadow-sm", isIncrease ? "border-l-button" : "border-l-lighterBlueHighlight")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={cn('px-2 py-1', isIncrease ? 'bg-button text-white' : 'bg-lighterBlueHighlight text-white')}>
                    {isIncrease ? 'Increase' : 'Decrease'}
                  </Badge>
                  <span className={cn("text-lg font-black", isIncrease ? "text-button" : "text-lighterBlueHighlight")}>
                    {formatAmount(request.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-gray-400">Current Float</span>
                    <span className="font-semibold">{formatAmount(request.currentFloat || 0)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-gray-400">New Float</span>
                    <span className="font-bold text-orangeHighlight">{formatAmount(request.newFloat || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span className="whitespace-nowrap">{formatDate(request.requested)}</span>
                  </div>
                  <div className="flex justify-end items-center gap-2 text-gray-400">
                    {showHistory && (
                      <span className="whitespace-nowrap">{formatDate(request.processed)}</span>
                    )}
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isApproved ? 'bg-green-600' : isRejected ? 'bg-red-600' : 'bg-orangeHighlight')}>
                      {request.status || 'Pending'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-start gap-2">
                   <Info className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                   <p className="text-[11px] text-gray-500 italic line-clamp-2">{request.reason || 'No reason provided'}</p>
                </div>

                {showActions && isPending && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                    <Button 
                      className={cn("flex-1 bg-button hover:bg-button text-xs h-8", disabled && "opacity-40 cursor-not-allowed")}
                      onClick={() => !disabled && onApprove?.(request.id)}
                      disabled={disabled}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      className={cn("flex-1 text-xs h-8", disabled && "opacity-40 cursor-not-allowed")}
                      onClick={() => !disabled && onReject?.(request.id)}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3 mr-1" /> Reject
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
