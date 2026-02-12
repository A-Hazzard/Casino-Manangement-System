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
import type { CashDesk } from '@/shared/types/vault';
import { AlertCircle, User } from 'lucide-react';

type VaultCashDeskCardProps = {
  cashDesk: CashDesk;
  onViewDenominations: () => void;
};

export default function VaultCashDeskCard({ cashDesk, onViewDenominations: _onViewDenominations }: VaultCashDeskCardProps) {
  const { formatAmount } = useCurrencyFormat();

  const isActive = cashDesk.status === 'active';

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 border-l-4",
      isActive ? "border-l-emerald-500" : "border-l-gray-300"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isActive ? 'Cashier On Duty' : 'Status'}
          </span>
          <div className="flex items-center gap-2 mt-1">
             <div className={cn(
               "flex h-8 w-8 items-center justify-center rounded-full",
               isActive ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
             )}>
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
        <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <div>
            <p className="text-xs text-gray-500">Current Float</p>
            <p className="text-lg font-bold text-gray-900">
              {formatAmount(cashDesk.balance)}
            </p>
          </div>
        </div>

        {cashDesk.lastAudit && (
           <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
             <AlertCircle className="h-3 w-3" />
             <span>Last Audit: {new Date(cashDesk.lastAudit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
