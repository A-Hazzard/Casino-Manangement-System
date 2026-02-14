/**
 * Vault Cashier Floats Table Component
 *
 * Displays cashier floats with responsive table/card views.
 *
 * @module components/VAULT/floats/tables/VaultCashierFloatsTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
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
import type { CashierFloat } from '@/shared/types/vault';
import { Clock, User } from 'lucide-react';

export type CashierFloatSortOption = 'cashierName' | 'balance' | 'status';

type VaultCashierFloatsTableProps = {
  floats: CashierFloat[];
  sortOption?: CashierFloatSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: CashierFloatSortOption) => void;
};

export default function VaultCashierFloatsTable({
  floats,
  sortOption: _sortOption,
  sortOrder: _sortOrder = 'asc',
  onSort,
}: VaultCashierFloatsTableProps) {
  const { formatAmount } = useCurrencyFormat();

  if (floats.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center shadow-md">
        <p className="text-gray-500">No cashier floats found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto rounded-lg bg-container shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              <TableHead
                isFirstColumn
                className={cn(
                  'relative cursor-pointer select-none font-semibold text-white',
                  onSort && 'hover:bg-button/90'
                )}
                onClick={onSort ? () => onSort('cashierName') : undefined}
              >
                Cashier
              </TableHead>
              <TableHead className="text-center font-semibold text-white">Start Time</TableHead>
              <TableHead className="text-center font-semibold text-white">End Time</TableHead>
              <TableHead className="text-right font-semibold text-white">Opening Float</TableHead>
              <TableHead className="text-right font-semibold text-white">Current Float</TableHead>
              <TableHead className="text-right font-semibold text-white">Payouts</TableHead>
              <TableHead className="font-semibold text-white text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {floats.map(float => (
              <TableRow key={float._id} className="transition-colors hover:bg-muted/30">
                <TableCell isFirstColumn className="font-medium">{float.cashierName}</TableCell>
                <TableCell className="text-center text-xs text-gray-500">
                  {float.openedAt ? new Date(float.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </TableCell>
                <TableCell className="text-center text-xs text-gray-500">
                  {float.closedAt ? new Date(float.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-gray-600">
                  {formatAmount(float.openingBalance || 0)}
                </TableCell>
                <TableCell className="text-right font-bold text-button">
                  {formatAmount(float.balance)}
                </TableCell>
                <TableCell className="text-right font-bold text-orangeHighlight">
                  {formatAmount(float.payoutsTotal || 0)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn('px-2 py-0.5 text-[10px]', float.status === 'active' ? 'bg-orangeHighlight' : 'bg-gray-400')}>
                    {float.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {floats.map(float => (
          <Card key={float._id} className="overflow-hidden border-l-4 border-l-button shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                   <User className="h-5 w-5 text-button" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 truncate max-w-[150px]">{float.cashierName}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>{float.openedAt ? new Date(float.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </div>
                    {float.closedAt && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 border-l pl-2">
                        <span className="text-[8px] font-black uppercase">End</span>
                        <span>{new Date(float.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Badge className={cn('px-2 py-0.5 text-[10px]', float.status === 'active' ? 'bg-orangeHighlight' : 'bg-gray-400')}>
                {float.status}
              </Badge>
            </CardContent>

            <div className="grid grid-cols-3 gap-2 border-t bg-gray-50/50 px-4 py-3">
               <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Opening</span>
                  <span className="text-xs font-bold text-gray-600 truncate">{formatAmount(float.openingBalance || 0)}</span>
               </div>
               <div className="flex flex-col border-x border-gray-100 px-3">
                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Payouts</span>
                  <span className="text-xs font-bold text-orangeHighlight truncate">{formatAmount(float.payoutsTotal || 0)}</span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Current</span>
                  <span className="text-sm font-black text-button truncate">{formatAmount(float.balance)}</span>
               </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
