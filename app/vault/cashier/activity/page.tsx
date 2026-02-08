/**
 * Cashier Activity Page
 *
 * Page for cashiers to view their historical float requests and payouts.
 *
 * @module app/vault/cashier/activity/page
 */

'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import ActivityLogPanel from '@/components/VAULT/shared/ActivityLogPanel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { DollarSign, History, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function CashierActivityPage() {
  const { user } = useAuth();
  const { formatAmount } = useCurrencyFormat();
  const locationId = user?.assignedLocations?.[0] || '';

  const [stats, setStats] = useState({
    totalCount: 0,
    netVolume: 0,
    lastActivity: 'N/A'
  });

  const fetchStats = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await fetch(`/api/vault/activity-log?locationId=${locationId}&userId=${user?._id}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.activities.length > 0) {
          const activities = data.activities;
          const net = activities.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
          setStats({
            totalCount: activities.length,
            netVolume: net,
            lastActivity: new Date(activities[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [locationId, user?._id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <PageLayout showHeader={false}>
          <div className="space-y-6">
            <VaultManagerHeader
              title="My Activity"
              description="Review your historical transactions and fund movements"
              backHref="/vault/cashier/shifts"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
               <div className="rounded-lg bg-container shadow-md p-6 border-t-4 border-button">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-gray-600">Total Activities</p>
                     <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
                   </div>
                   <History className="h-8 w-8 text-button opacity-20" />
                 </div>
               </div>

               <div className="rounded-lg bg-container shadow-md p-6 border-t-4 border-orangeHighlight">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-gray-600">Net Volume (Recent)</p>
                     <p className={stats.netVolume >= 0 ? "text-2xl font-bold text-button" : "text-2xl font-bold text-orangeHighlight"}>
                       {formatAmount(stats.netVolume)}
                     </p>
                   </div>
                   <TrendingUp className="h-8 w-8 text-orangeHighlight opacity-20" />
                 </div>
               </div>

               <div className="rounded-lg bg-container shadow-md p-6 border-t-4 border-blue-500">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-gray-600">Last Activity</p>
                     <p className="text-2xl font-bold text-gray-900">{stats.lastActivity}</p>
                   </div>
                   <DollarSign className="h-8 w-8 text-blue-500 opacity-20" />
                 </div>
               </div>
            </div>

            <ActivityLogPanel 
              locationId={locationId} 
              userId={user?._id}
              title="Recent Transactions History"
            />
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
