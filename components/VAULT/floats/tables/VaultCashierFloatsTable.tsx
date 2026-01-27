/**
 * Vault Cashier Floats Desktop Table Component
 *
 * Desktop table component for displaying cashier floats.
 * Used on large screens (lg and above).
 *
 * Features:
 * - Sortable columns (click headers to sort)
 * - Cashier column
 * - Station column
 * - Current Float column
 * - Status column
 * - Responsive design (hidden on mobile/tablet)
 *
 * @module components/VAULT/floats/tables/VaultCashierFloatsTable
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
import type { CashierFloat } from '@/shared/types/vault';
import { cn } from '@/lib/utils';

export type CashierFloatSortOption = 'cashierName' | 'balance' | 'status';

type VaultCashierFloatsTableProps = {
  floats: CashierFloat[];
  sortOption?: CashierFloatSortOption;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: CashierFloatSortOption) => void;
};

/**
 * Vault Cashier Floats Desktop Table
 * Displays cashier floats in a sortable table format for desktop screens
 */
export default function VaultCashierFloatsTable({
  floats,
  sortOption,
  sortOrder = 'asc',
  onSort,
}: VaultCashierFloatsTableProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (floats.length === 0) {
    return (
      <div className="hidden rounded-lg bg-container p-8 text-center shadow-md lg:block">
        <p className="text-gray-500">No cashier floats found</p>
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
              onClick={onSort ? () => onSort('cashierName') : undefined}
            >
              Cashier
              {sortOption === 'cashierName' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className={cn(
                'relative cursor-pointer select-none text-right font-semibold text-white',
                onSort && 'hover:bg-button/90'
              )}
              onClick={onSort ? () => onSort('balance') : undefined}
            >
              Current Float
              {sortOption === 'balance' && (
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {floats.map(float => (
            <TableRow
              key={float._id}
              className="transition-colors hover:bg-muted/30"
            >
              <TableCell isFirstColumn className="font-medium">
                {float.cashierName}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatAmount(float.balance)}
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    'px-2 py-1',
                    float.status === 'active'
                      ? 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                      : 'bg-button text-white hover:bg-button/90'
                  )}
                >
                  {float.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
