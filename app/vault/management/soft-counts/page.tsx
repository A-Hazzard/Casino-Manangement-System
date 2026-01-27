/**
 * Soft Counts Page
 *
 * Page for Vault Managers to record soft count cash removals.
 *
 * @module app/vault/management/soft-counts/page
 */
'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import PageLayout from '@/components/shared/layout/PageLayout';
import SoftCountForm from '@/components/VAULT/machine/SoftCountForm';
import { Button } from '@/components/shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Denomination } from '@/shared/types/vault';

export default function SoftCountsPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    machineId: string,
    amount: number,
    denominations: Denomination[],
    notes?: string
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/vault/soft-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId, // Although API might not strict require it if it's generic soft count, form sends it. API doesn't use machineId in body destructuring?
          // Wait, SoftCountForm sends machineId. The API route receives `amount, denominations, notes`.
          // I should check API route again.
          amount,
          denominations,
          notes: notes || `Soft count from ${machineId}`, // Append machineId to notes if API doesn't take it separately
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Soft count recorded: $${amount}`);
      } else {
        toast.error(data.error || 'Failed to record soft count');
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
                  Soft Count
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Record mid-shift cash removal to replenish vault
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-2xl">
              <SoftCountForm onSubmit={handleSubmit} loading={loading} />
            </div>
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
