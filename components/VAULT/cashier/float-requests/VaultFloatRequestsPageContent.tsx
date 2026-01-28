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

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { useUserStore } from '@/lib/store/userStore';
import { CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultFloatRequestsMobileCards from './cards/VaultFloatRequestsMobileCards';
import type { FloatRequestSortOption } from './tables/VaultFloatRequestsTable';
import VaultFloatRequestsTable from './tables/VaultFloatRequestsTable';

export default function VaultFloatRequestsPageContent() {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);

  // Sort states
  const [pendingSortOption, setPendingSortOption] = useState<FloatRequestSortOption>('requested');
  const [pendingSortOrder, setPendingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historySortOption, setHistorySortOption] = useState<FloatRequestSortOption>('processed');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRequests = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;

    setLoading(true);
    try {
        const [pendingRes, historyRes] = await Promise.all([
            fetch(`/api/vault/float-request?locationId=${locationId}&status=pending`),
            fetch(`/api/vault/float-request?locationId=${locationId}&status=all&limit=50`)
        ]);

        if (pendingRes.ok) {
            const data = await pendingRes.json();
            if (data.success) {
                setPendingRequests(mapRequests(data.data || []));
            }
        }

        if (historyRes.ok) {
            const data = await historyRes.json();
            if (data.success) {
                // Filter out pending from history to avoid duplication if API returns them in 'all'
                const history = (data.data || []).filter((r: any) => r.status !== 'pending');
                setRequestHistory(mapRequests(history));
            }
        }

    } catch (error) {
        console.error('Failed to fetch requests', error);
        toast.error('Failed to load float requests');
    } finally {
        setLoading(false);
    }
  };

  const mapRequests = (data: any[]) => {
      return data.map(r => ({
          id: r._id,
          cashier: r.cashierId || 'Unknown', // Ideally fetch name
          station: 'Cash Desk',
          type: r.type, // 'increase' or 'decrease'
          amount: r.requestedAmount,
          // currentFloat: r.currentFloat || 0, // Not always present in API?
          reason: r.requestNotes || '',
          status: r.status,
          requested: r.requestedAt || r.createdAt,
          processed: r.processedAt || r.updatedAt,
          processedBy: r.processedBy || 'Vault Manager'
      }));
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.assignedLocations]);

  // Actions
  const handleApprove = async (requestId: string) => {
    try {
        const res = await fetch(`/api/vault/float-requests/${requestId}/approve`, {
            method: 'POST', // or PUT
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved: true }) // Body might be needed
        });
        const data = await res.json();
        if (data.success) {
            toast.success(`Request approved`);
            fetchRequests();
        } else {
            toast.error(data.error || 'Failed to approve');
        }
    } catch (error) {
        toast.error('Connection error');
        console.error('Failed to approve request', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
        const res = await fetch(`/api/vault/float-requests/${requestId}/reject`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ approved: false }) // Just in case
        });
        const data = await res.json();
        if (data.success) {
            toast.success(`Request rejected`);
            fetchRequests();
        } else {
            toast.error(data.error || 'Failed to reject');
        }
    } catch (error) {
        toast.error('Connection error');
        console.error('Failed to reject request', error);
    }
  };

  // Sorting Logic (Client Side)
  const sortData = (data: any[], option: FloatRequestSortOption, order: 'asc' | 'desc') => {
      return [...data].sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch(option) {
              case 'amount': aValue = Math.abs(a.amount); bValue = Math.abs(b.amount); break;
              case 'requested': aValue = new Date(a.requested).getTime(); bValue = new Date(b.requested).getTime(); break;
              case 'processed': aValue = new Date(a.processed).getTime(); bValue = new Date(b.processed).getTime(); break;
              case 'cashier': aValue = (a.cashier || '').toLowerCase(); bValue = (b.cashier || '').toLowerCase(); break;
              case 'type': aValue = (a.type || '').toLowerCase(); bValue = (b.type || '').toLowerCase(); break;
              case 'status': aValue = (a.status || '').toLowerCase(); bValue = (b.status || '').toLowerCase(); break;
              default: return 0;
          }

          if (aValue < bValue) return order === 'asc' ? -1 : 1;
          if (aValue > bValue) return order === 'asc' ? 1 : -1;
          return 0;
      });
  };

  const sortedPendingRequests = useMemo(() => sortData(pendingRequests, pendingSortOption, pendingSortOrder), [pendingRequests, pendingSortOption, pendingSortOrder]);
  const sortedRequestHistory = useMemo(() => sortData(requestHistory, historySortOption, historySortOrder), [requestHistory, historySortOption, historySortOrder]);

  const handlePendingSort = (column: FloatRequestSortOption) => {
     if (pendingSortOption === column) setPendingSortOrder(pendingSortOrder === 'asc' ? 'desc' : 'asc');
     else { setPendingSortOption(column); setPendingSortOrder('asc'); }
  };

  const handleHistorySort = (column: FloatRequestSortOption) => {
     if (historySortOption === column) setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
     else { setHistorySortOption(column); setHistorySortOrder('asc'); }
  };

  if (loading && pendingRequests.length === 0 && requestHistory.length === 0) {
      return (
        <PageLayout showHeader={false}>
             <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        </PageLayout>
      );
  }

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-semibold text-gray-900">Float Requests</h1>
            <p className="mt-1 text-sm text-gray-600">
            Manage cashier float increase and decrease requests
            </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRequests}><RefreshCw className="h-4 w-4 mr-2"/> Refresh</Button>
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

          <div className="block lg:hidden">
            <VaultFloatRequestsMobileCards
                requests={sortedPendingRequests}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions={true}
            />
          </div>
        </div>
      )}

      {/* Request History Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-button" />
          <h2 className="text-lg font-semibold text-gray-900">Request History</h2>
        </div>

        <VaultFloatRequestsTable
          requests={sortedRequestHistory}
          sortOption={historySortOption}
          sortOrder={historySortOrder}
          onSort={handleHistorySort}
          showHistory={true}
        />

        <div className="block lg:hidden">
             <VaultFloatRequestsMobileCards requests={sortedRequestHistory} />
        </div>
      </div>
      </div>
    </PageLayout>
  );
}
