'use client';

// ============================================================================
// External Dependencies
// ============================================================================
import { useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Internal Components & Hooks
// ============================================================================
import PageLayout from '@/components/shared/layout/PageLayout';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import SoftCountForm from '@/components/VAULT/machine/SoftCountForm';
import type { Denomination } from '@/shared/types/vault';

export default function SoftCountsPageContent() {
  // ============================================================================
  // State
  // ============================================================================
  const [loading, setLoading] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================
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

  // ============================================================================
  // Render
  // ============================================================================
  return (
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
  );
}
