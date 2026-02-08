/**
 * Active Shift Dashboard Section
 *
 * Displays the main interface for a cashier with an active shift.
 * Includes shift metrics and quick action buttons.
 *
 * @module components/VAULT/cashier/sections/ActiveShiftDashboard
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CashierShift } from '@/shared/types/vault';
import { Clock, HandCoins, Minus, Receipt, TrendingUp } from 'lucide-react';

type ActiveShiftDashboardProps = {
  shift: CashierShift;
  currentBalance: number;
  refreshing: boolean;
  onTicketRedeem: () => void;
  onHandPay: () => void;
  onRequestFloat: (type: 'increase' | 'decrease') => void;
  isVaultReconciled: boolean;
};

export default function ActiveShiftDashboard({
  shift,
  currentBalance,
  refreshing,
  onTicketRedeem,
  onHandPay,
  onRequestFloat,
  isVaultReconciled,
}: ActiveShiftDashboardProps) {
  const { formatAmount } = useCurrencyFormat();

  return (
    <div className="space-y-6">
      {/* Shift Status Card */}
      <Card className="rounded-lg bg-container shadow-md border-t-4 border-emerald-500 overflow-hidden relative animate-in slide-in-from-top-4 duration-500">
        {refreshing && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
             <div className="w-full h-full p-6 space-y-4">
               <Skeleton className="h-6 w-32" />
               <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                 {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
               </div>
             </div>
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Shift
            </CardTitle>
            <Badge variant="default">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-gray-600">Current Float</p>
              <p className="text-xl font-bold text-green-600">
                {formatAmount(currentBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Opening Float</p>
              <p className="text-lg font-semibold">
                {formatAmount(shift.openingBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Payouts</p>
              <p className="text-lg font-semibold text-red-600">
                {formatAmount(shift.payoutsTotal)}
              </p>
              <p className="text-xs text-gray-500">count: {shift.payoutsCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Started At</p>
              <p className="font-mono text-sm">
                {new Date(shift.openedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="rounded-lg bg-container shadow-md border-t-4 border-button">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Button
              variant="outline"
              className={`flex h-20 flex-col gap-2 ${!isVaultReconciled ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={onTicketRedeem}
            >
              <Receipt className="h-6 w-6" />
              <span className="text-xs">Ticket Redemption</span>
            </Button>
            <Button
              variant="outline"
              className={`flex h-20 flex-col gap-2 ${!isVaultReconciled ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={onHandPay}
            >
              <HandCoins className="h-6 w-6" />
              <span className="text-xs">Hand Pay</span>
            </Button>
            <Button
              variant="outline"
              className={`flex h-20 flex-col gap-2 ${!isVaultReconciled ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isVaultReconciled) {
                  return; // Toast handled by parent or just block
                }
                onRequestFloat('increase');
              }}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs">Request More Float</span>
            </Button>
            <Button
              variant="outline"
              className={`flex h-20 flex-col gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 ${!isVaultReconciled ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isVaultReconciled) {
                  return;
                }
                onRequestFloat('decrease');
              }}
            >
              <Minus className="h-6 w-6" />
              <span className="text-xs">Return Float</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
