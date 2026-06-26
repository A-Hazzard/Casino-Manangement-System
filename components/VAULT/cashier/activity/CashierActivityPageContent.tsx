/**
 * Cashier Activity Page Content Component
 *
 * Displays the cashier's historical activity log with summary stats
 * for total activities, net volume, and last activity time.
 *
 * @module components/VAULT/cashier/activity/CashierActivityPageContent
 */
'use client';

// ============================================================================
// External Dependencies
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { DollarSign, History, TrendingUp } from 'lucide-react';

// ============================================================================
// Internal Components & Hooks
// ============================================================================
import PageLayout from '@/components/shared/layout/PageLayout';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import ActivityLogPanel from '@/components/VAULT/shared/ActivityLogPanel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

export default function CashierActivityPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const { user } = useAuth();
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Local State
  // ============================================================================
  const [stats, setStats] = useState({
    totalCount: 0,
    netVolume: 0,
    lastActivity: 'N/A',
  });

  // ============================================================================
  // Computed
  // ============================================================================
  const locationId = user?.assignedLocations?.[0] || '';

  // ============================================================================
  // Handlers & Helpers
  // ============================================================================
  const fetchStats = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await fetch(
        `/api/vault/activity-log?locationId=${locationId}&userId=${user?._id}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.activities.length > 0) {
          const activities = data.activities;
          const net = activities.reduce(
            (sum: number, activity: { amount?: number }) =>
              sum + (activity.amount || 0),
            0
          );
          setStats({
            totalCount: activities.length,
            netVolume: net,
            lastActivity: new Date(activities[0].timestamp).toLocaleTimeString(
              [],
              { hour: '2-digit', minute: '2-digit' }
            ),
          });
        }
      }
    } catch (e) {
      console.error('[fetchStats] Error:', e instanceof Error ? e.message : 'Unknown error');
    }
  }, [locationId, user?._id]);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
        {/* Header Section */}
        <VaultManagerHeader
          title="My Activity"
          description="Review your historical transactions and fund movements"
          backHref="/vault/cashier/shifts"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Activities Card */}
          <div className="rounded-lg border-t-4 border-button bg-container p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Activities
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalCount}
                </p>
              </div>
              <History className="h-8 w-8 text-button opacity-20" />
            </div>
          </div>

          {/* Net Volume Card */}
          <div className="rounded-lg border-t-4 border-orangeHighlight bg-container p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Net Volume (Recent)
                </p>
                <p
                  className={
                    stats.netVolume >= 0
                      ? 'text-2xl font-bold text-button'
                      : 'text-2xl font-bold text-orangeHighlight'
                  }
                >
                  {formatAmount(stats.netVolume)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orangeHighlight opacity-20" />
            </div>
          </div>

          {/* Last Activity Card */}
          <div className="rounded-lg border-t-4 border-blue-500 bg-container p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Last Activity
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.lastActivity}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Activity Log Table */}
        <ActivityLogPanel
          locationId={locationId}
          userId={user?._id}
          title="Recent Transactions History"
        />
      </div>
    </PageLayout>
  );
}
