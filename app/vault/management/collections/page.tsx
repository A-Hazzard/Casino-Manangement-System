/**
 * Machine Collections Page
 *
 * Page for Vault Managers to record cash collections from machines.
 *
 * @module app/vault/management/collections/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import MachineCollectionForm from '@/components/VAULT/machine/MachineCollectionForm';
import type { Denomination } from '@/shared/types/vault';
import { useState } from 'react';
import { toast } from 'sonner';

export default function MachineCollectionsPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    machineId: string,
    amount: number,
    denominations: Denomination[]
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/vault/machine-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          amount,
          denominations,
          notes: 'Manual collection entry', // Default note
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Collection recorded for ${machineId}: $${amount}`);
        // Optional: Redirect back to dashboard or stay to enter more
      } else {
        toast.error(data.error || 'Failed to record collection');
      }
    } catch (error) {
      console.error('Error recording collection:', error);
      toast.error('An error occurred while recording collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <PageLayout showHeader={false}>
          <div className="space-y-6">
            <VaultManagerHeader
                title="Machine Collections"
                description="Record cash collected from gaming machines"
            />

            <div className="mx-auto max-w-2xl">
              <MachineCollectionForm
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
