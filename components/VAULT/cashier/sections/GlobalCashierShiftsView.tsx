/**
 * Global Cashier Shifts View Section
 *
 * Redesigned view for Administrators and Developers to monitor all ongoing cashier shifts.
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { CashDesk } from '@/shared/types/vault';
import { ArrowRight, Clock, User, Users } from 'lucide-react';

type GlobalCashierShiftsViewProps = {
  cashDesks: CashDesk[];
  refreshing: boolean;
};

export default function GlobalCashierShiftsView({
  cashDesks,
}: GlobalCashierShiftsViewProps) {
  const { formatAmount } = useCurrencyFormat();

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border-t-4 border-orangeHighlight bg-container shadow-md">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-orangeHighlight" />
              Active Cashier Shifts
            </CardTitle>
            <Badge
              variant="outline"
              className="border-orangeHighlight/20 bg-orangeHighlight/10 text-orangeHighlight"
            >
              {cashDesks.length} Shifts In Progress
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {cashDesks.length > 0 ? (
              cashDesks.map(desk => (
                <div
                  key={desk._id}
                  className="group flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 font-bold text-gray-900">
                        {desk.cashierName || desk.name}
                        {desk.status === 'pending_start' && (
                          <Badge
                            variant="secondary"
                            className="h-4 border-yellow-200 bg-yellow-100 text-[10px] text-yellow-800"
                          >
                            Pending Start
                          </Badge>
                        )}
                      </h3>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          Started:{' '}
                          {new Date(desk.lastAudit).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {desk.locationName && (
                          <span className="text-xs font-medium text-blue-600">
                            @{desk.locationName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="mb-1 text-sm font-medium text-gray-500">
                      Current Balance
                    </div>
                    <div
                      className={cn(
                        'text-lg font-bold leading-none text-gray-900',
                        desk.balance < 0 ? 'text-red-500' : 'text-emerald-600'
                      )}
                    >
                      {formatAmount(desk.balance)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center italic text-gray-400">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-20" />
                No cashiers currently on shift.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-lg border-t-4 border-blue-500 bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                <ArrowRight className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Pooled Balance
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAmount(
                    cashDesks.reduce((sum, d) => sum + (d.balance || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-t-4 border-indigo-500 bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-indigo-100 p-3 text-indigo-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Shift Balance
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAmount(
                    cashDesks.length > 0
                      ? cashDesks.reduce(
                          (sum, d) => sum + (d.balance || 0),
                          0
                        ) / cashDesks.length
                      : 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
