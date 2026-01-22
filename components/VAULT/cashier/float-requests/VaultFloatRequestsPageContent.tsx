/**
 * Vault Float Requests Page Content Component
 *
 * Float requests management page for the Vault Management application.
 *
 * Features:
 * - Pending Requests section with approve/reject actions
 * - Request History table
 *
 * @module components/VAULT/cashier/float-requests/VaultFloatRequestsPageContent
 */
'use client';

import { useState, useMemo } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import type { FloatRequestSortOption } from './tables/VaultFloatRequestsTable';
import VaultFloatRequestsTable from './tables/VaultFloatRequestsTable';
import VaultFloatRequestsMobileCards from './cards/VaultFloatRequestsMobileCards';
import { Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Mock data for float requests
const mockPendingRequests = [
  {
    id: '1',
    cashier: 'Sarah Johnson',
    station: 'Desk 1',
    type: 'Increase' as const,
    amount: 2500,
    currentFloat: 8500,
    newFloat: 11000,
    reason: 'High volume expected for weekend tournament',
    requested: '20/01/2024, 10:30:00 am',
  },
];

const mockRequestHistory = [
  {
    id: '2',
    cashier: 'Mike Chen',
    station: 'Desk 2',
    type: 'Decrease' as const,
    amount: -1000,
    status: 'completed' as const,
    requested: '20/01/2024, 9:45:00 am',
    processed: '20/01/2024, 10:00:00 am',
    processedBy: 'Vault Manager',
  },
];

export default function VaultFloatRequestsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [pendingSortOption, setPendingSortOption] = useState<FloatRequestSortOption>('requested');
  const [pendingSortOrder, setPendingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historySortOption, setHistorySortOption] = useState<FloatRequestSortOption>('processed');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle approve float request action
   * Placeholder for future API integration
   *
   * @param requestId - ID of float request to approve
   */
  const handleApprove = (requestId: string) => {
    toast.success(`Request ${requestId} approved`);
  };

  /**
   * Handle reject float request action
   * Placeholder for future API integration
   *
   * @param requestId - ID of float request to reject
   */
  const handleReject = (requestId: string) => {
    toast.error(`Request ${requestId} rejected`);
  };

  /**
   * Sort pending requests based on sort option and order
   */
  const sortedPendingRequests = useMemo(() => {
    const sorted = [...mockPendingRequests].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (pendingSortOption) {
        case 'cashier':
          aValue = a.cashier.toLowerCase();
          bValue = b.cashier.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'currentFloat':
          aValue = a.currentFloat || 0;
          bValue = b.currentFloat || 0;
          break;
        case 'newFloat':
          aValue = a.newFloat || 0;
          bValue = b.newFloat || 0;
          break;
        case 'requested':
          aValue = new Date(a.requested || '').getTime();
          bValue = new Date(b.requested || '').getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return pendingSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return pendingSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [pendingSortOption, pendingSortOrder]);

  /**
   * Sort request history based on sort option and order
   */
  const sortedRequestHistory = useMemo(() => {
    const sorted = [...mockRequestHistory].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (historySortOption) {
        case 'cashier':
          aValue = a.cashier.toLowerCase();
          bValue = b.cashier.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'requested':
          aValue = new Date(a.requested || '').getTime();
          bValue = new Date(b.requested || '').getTime();
          break;
        case 'processed':
          aValue = new Date(a.processed || '').getTime();
          bValue = new Date(b.processed || '').getTime();
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return historySortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return historySortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [historySortOption, historySortOrder]);

  /**
   * Handle pending requests table column sort
   *
   * @param column - Column to sort by
   */
  const handlePendingSort = (column: FloatRequestSortOption) => {
    if (pendingSortOption === column) {
      setPendingSortOrder(pendingSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPendingSortOption(column);
      setPendingSortOrder('asc');
    }
  };

  /**
   * Handle request history table column sort
   *
   * @param column - Column to sort by
   */
  const handleHistorySort = (column: FloatRequestSortOption) => {
    if (historySortOption === column) {
      setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setHistorySortOption(column);
      setHistorySortOrder('asc');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Float Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage cashier float increase and decrease requests
        </p>
      </div>

      {/* Pending Requests Section */}
      {sortedPendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orangeHighlight" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Requests ({sortedPendingRequests.length})
            </h2>
          </div>

          {/* Desktop Table View - lg and above */}
          <VaultFloatRequestsTable
            requests={sortedPendingRequests}
            sortOption={pendingSortOption}
            sortOrder={pendingSortOrder}
            onSort={handlePendingSort}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={true}
            showHistory={false}
          />

          {/* Mobile/Tablet Card View - below lg */}
          <VaultFloatRequestsMobileCards
            requests={sortedPendingRequests}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={true}
          />
        </div>
      )}

      {/* Request History Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-button" />
          <h2 className="text-lg font-semibold text-gray-900">Request History</h2>
        </div>

        {/* Desktop Table View - lg and above */}
        <VaultFloatRequestsTable
          requests={sortedRequestHistory}
          sortOption={historySortOption}
          sortOrder={historySortOrder}
          onSort={handleHistorySort}
          showHistory={true}
        />

        {/* Mobile/Tablet Card View - below lg */}
        <VaultFloatRequestsMobileCards requests={sortedRequestHistory} />
      </div>
      </div>
    </PageLayout>
  );
}
