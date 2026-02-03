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
import ActivityLogPanel from '@/components/VAULT/shared/ActivityLogPanel';
import { useAuth } from '@/lib/hooks/useAuth';

export default function CashierActivityPage() {
  const { user } = useAuth();
  const locationId = user?.assignedLocations?.[0] || '';

  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <PageLayout showHeader={false}>
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My Activity</h1>
              <p className="mt-1 text-sm text-gray-600">
                View your historical transactions and float requests.
              </p>
            </div>

            <ActivityLogPanel 
              locationId={locationId} 
              userId={user?._id}
              title="Recent Transactions"
            />
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
