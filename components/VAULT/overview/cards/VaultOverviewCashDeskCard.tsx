/**
 * Vault Cash Desk Card
 *
 * Displays individual cash desk status, assigned cashier, and current balance.
 *
 * @module components/VAULT/overview/cards/VaultCashDeskCard
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { CashDesk } from '@/shared/types/vault';
import { AlertCircle, User } from 'lucide-react';

type VaultCashDeskCardProps = {
  cashDesk: CashDesk;
  onViewDenominations: () => void;
};

export default function VaultCashDeskCard({
  cashDesk,
}: VaultCashDeskCardProps) {
  const { formatAmount } = useCurrencyFormat();

  const isActive = cashDesk.status === 'active';

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4 transition-all duration-200',
        isActive ? 'border-l-emerald-500' : 'border-l-gray-300'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2 pt-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isActive ? 'Cashier On Duty' : 'Status'}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                isActive
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 font-medium text-gray-900">
                {cashDesk.cashierName || 'Unassigned'}
                {/* If we had a username, we'd display it here */}
              </h3>
            </div>
          </div>
        </div>
        <Badge variant={isActive ? 'success' : 'secondary'}>
          {isActive ? 'Active' : 'Closed'}
        </Badge>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-2">
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-4 rounded-lg bg-gray-50 p-3">
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Opening Float
            </p>
            <p
              className={cn(
                'truncate font-black leading-none text-gray-900 transition-all',
                formatAmount(cashDesk.openingBalance || cashDesk.balance)
                  .length > 10
                  ? 'text-sm'
                  : 'text-base'
              )}
            >
              {formatAmount(cashDesk.openingBalance || cashDesk.balance)}
            </p>
          </div>

          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Payout
            </p>
            <p
              className={cn(
                'truncate font-black leading-none text-red-600 transition-all',
                formatAmount(cashDesk.payoutsTotal || 0).length > 10
                  ? 'text-sm'
                  : 'text-base'
              )}
            >
              {formatAmount(cashDesk.payoutsTotal || 0)}
            </p>
          </div>

          <div className="col-span-2 flex flex-col border-t border-gray-100 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Started At
                </p>
                <p className="font-mono text-xs text-gray-600">
                  {cashDesk.openedAt
                    ? new Date(cashDesk.openedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '---'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Net balance
                </p>
                <p className="text-sm font-black text-emerald-600">
                  {formatAmount(cashDesk.balance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {cashDesk.lastAudit && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
            <AlertCircle className="h-2.5 w-2.5" />
            <span>
              Last Activity:{' '}
              {safeFormatDate(cashDesk.lastAudit, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
