/**
 * Soft Counts Page
 *
 * Page for Vault Managers to record soft count cash removals.
 *
 * @module app/vault/management/soft-counts/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import SoftCountForm from '@/components/VAULT/machine/SoftCountForm';
import type { Denomination } from '@/shared/types/vault';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SoftCountsPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    amount: number;
    denominations: Denomination[];
    notes?: string;
    meters?: { billIn: number; ticketIn: number; totalIn: number };
    expectedDrop: number;
    variance: number;
  }) => {
    const { amount, denominations, notes } = data;
    setLoading(true);
    try {
      const response = await fetch('/api/vault/soft-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          denominations,
          notes: notes || `Soft count recording`, 
        }),
      });

      const responseData = await response.json();

      if (responseData.success) {
        toast.success(`Soft count recorded: $${amount}`);
      } else {
        toast.error(responseData.error || 'Failed to record soft count');
      }
    } catch (error) {
      console.error('Error recording soft count:', error);
      toast.error('An error occurred while recording soft count');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <PageLayout>
          <div className="space-y-6">
            <VaultManagerHeader
                title="Soft Count"
                description="Record mid-shift cash removal to replenish vault"
                backHref="/vault/management"
            />

            <div className="mx-auto max-w-2xl">
              <SoftCountForm onSubmit={handleSubmit} loading={loading} />
            </div>
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
