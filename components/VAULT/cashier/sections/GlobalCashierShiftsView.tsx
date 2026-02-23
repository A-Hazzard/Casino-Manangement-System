/**
 * Global Cashier Shifts View Section
 * 
 * Redesigned view for Administrators and Developers to monitor all ongoing cashier shifts.
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
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
  refreshing: _refreshing,
}: GlobalCashierShiftsViewProps) {
  const { formatAmount } = useCurrencyFormat();

  return (
    <div className="space-y-6">
      <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-orangeHighlight" />
              Active Cashier Shifts
            </CardTitle>
            <Badge variant="outline" className="bg-orangeHighlight/10 text-orangeHighlight border-orangeHighlight/20">
               {cashDesks.length} Shifts In Progress
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {cashDesks.length > 0 ? (
              cashDesks.map((desk) => (
                <div key={desk._id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {desk.cashierName || desk.name}
                        {desk.status === 'pending_start' && (
                          <Badge variant="secondary" className="text-[10px] h-4 bg-yellow-100 text-yellow-800 border-yellow-200">
                            Pending Start
                          </Badge>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {new Date(desk.lastAudit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {desk.locationName && (
                          <span className="text-xs text-blue-600 font-medium">
                            @{desk.locationName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500 font-medium mb-1">Current Balance</div>
                    <div className={cn(
                        "text-lg font-bold text-gray-900 leading-none",
                        desk.balance < 0 ? "text-red-500" : "text-emerald-600"
                    )}>
                      {formatAmount(desk.balance)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="p-12 text-center text-gray-400 italic">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    No cashiers currently on shift.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="rounded-lg bg-container shadow-md border-t-4 border-blue-500">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pooled Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                       {formatAmount(cashDesks.reduce((sum, d) => sum + (d.balance || 0), 0))}
                    </p>
                  </div>
                </div>
            </CardContent>
         </Card>
         
         <Card className="rounded-lg bg-container shadow-md border-t-4 border-indigo-500">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Shift Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                       {formatAmount(cashDesks.length > 0 ? cashDesks.reduce((sum, d) => sum + (d.balance || 0), 0) / cashDesks.length : 0)}
                    </p>
                  </div>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
