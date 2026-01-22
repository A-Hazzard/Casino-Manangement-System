/**
 * Cashier Page
 *
 * Cashier interface for the Vault Management application.
 * Redirects to first available cashier page (payouts).
 *
 * Features:
 * - Redirects to cashier payouts page
 * - Same layout structure as Vault Manager
 *
 * @module app/vault/cashier/page
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/shared/layout/PageLayout';

export default function CashierPage() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const router = useRouter();

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    // Redirect to first available cashier page
    router.replace('/vault/cashier/payouts');
  }, [router]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout showHeader={false}>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    </PageLayout>
  );
}
