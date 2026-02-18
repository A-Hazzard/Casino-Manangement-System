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
import { ArrowLeftRight, ArrowRight, CheckCircle2, Clock, FileText, User, X } from 'lucide-react';

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
  sortOption: _sortOption,
  sortOrder: _sortOrder = 'asc',
  onSort: _onSort,
  onApprove,
  onReject,
  showActions = false,
}: VaultTransfersTableProps) {
  const { formatAmount } = useCurrencyFormat();

  const formatDate = (dateString: string | Date) => {
    return safeFormatDate(dateString);
  };

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
      <div className="hidden lg:block overflow-x-auto rounded-lg bg-container shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button text-white">
              <TableHead className="font-semibold text-white">Date/Time</TableHead>
              <TableHead className="font-semibold text-white">From</TableHead>
              <TableHead className="font-semibold text-white text-center"><ArrowLeftRight className="h-4 w-4 mx-auto" /></TableHead>
              <TableHead className="font-semibold text-white">To</TableHead>
              <TableHead className="font-semibold text-white text-right">Amount</TableHead>
              <TableHead className="font-semibold text-white">Status</TableHead>
              <TableHead className="font-semibold text-white">Notes</TableHead>
              {showActions && <TableHead className="font-semibold text-white text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map(transfer => {
              const isCompleted = transfer.status === 'completed';

              return (
                <TableRow key={transfer._id} className="transition-colors hover:bg-muted/30">
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(transfer.createdAt || transfer.date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{transfer.from}</TableCell>
                  <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-gray-300 mx-auto" /></TableCell>
                  <TableCell className="text-sm font-medium">{transfer.to}</TableCell>
                  <TableCell className="text-right font-bold text-orangeHighlight">
                    {formatAmount(transfer.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('px-2 py-0.5 text-[10px]', isCompleted ? 'bg-button' : 'bg-orangeHighlight')}>
                      {transfer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[120px] truncate">{transfer.notes || '-'}</TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {!isCompleted && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => onApprove?.(transfer._id)} className="p-1.5 rounded-full bg-button text-white"><CheckCircle2 className="h-4 w-4" /></button>
                          <button onClick={() => onReject?.(transfer._id)} className="p-1.5 rounded-full bg-red-600 text-white"><X className="h-4 w-4" /></button>
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
        {transfers.map(transfer => {
          const isCompleted = transfer.status === 'completed';

          return (
            <Card key={transfer._id} className="overflow-hidden border-l-4 border-l-button shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDate(transfer.createdAt || transfer.date)}
                  </div>
                  <span className="text-lg font-black text-orangeHighlight">{formatAmount(transfer.amount)}</span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 bg-gray-50 rounded px-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">Source</span>
                      <span className="font-semibold truncate max-w-[100px]">{transfer.from}</span>
                   </div>
                   <ArrowRight className="h-4 w-4 text-gray-300 mx-2" />
                   <div className="flex flex-col items-end text-right">
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">Destination</span>
                      <span className="font-semibold truncate max-w-[100px]">{transfer.to}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge className={cn('px-2 py-0.5 text-[10px]', isCompleted ? 'bg-button' : 'bg-orangeHighlight')}>
                      {transfer.status || 'Pending'}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate max-w-[150px]">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate italic">{transfer.notes || 'No notes'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                   <User className="h-3 w-3" />
                   <span>Initiated by: {transfer.initiatedBy}</span>
                </div>

                {showActions && !isCompleted && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                    <Button size="sm" className="flex-1 bg-button h-8 text-xs" onClick={() => onApprove?.(transfer._id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => onReject?.(transfer._id)}>
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
