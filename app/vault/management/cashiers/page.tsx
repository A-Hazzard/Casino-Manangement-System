/**
 * Cashier Management Page
 *
 * Page for Vault Managers to manage cashier accounts.
 * Provides interface for creating, viewing, and resetting cashier passwords.
 *
 * @module app/vault/management/cashiers/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import PageLayout from '@/components/shared/layout/PageLayout';
import CashierManagementPanel from '@/components/VAULT/admin/CashierManagementPanel';
import { Button } from '@/components/shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CashierManagementPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <PageLayout showHeader={false}>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Link href="/vault/management">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Manage Cashiers
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Create and manage cashier accounts for your location
                </p>
              </div>
            </div>

            <CashierManagementPanel />
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
