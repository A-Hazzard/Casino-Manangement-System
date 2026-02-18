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
import PaginationControls from '@/components/shared/ui/PaginationControls';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import { useUserStore } from '@/lib/store/userStore';
import { CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { FloatRequestSortOption } from './tables/VaultFloatRequestsTable';
import VaultFloatRequestsTable from './tables/VaultFloatRequestsTable';

export default function VaultFloatRequestsPageContent() {
  const { user, isVaultReconciled } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Sort states
  const [pendingSortOption, setPendingSortOption] = useState<FloatRequestSortOption>('requested');
  const [pendingSortOrder, setPendingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historySortOption, setHistorySortOption] = useState<FloatRequestSortOption>('processed');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRequests = async (isManual = false) => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;

    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
        const [pendingRes, historyRes] = await Promise.all([
            fetch(`/api/vault/float-request?locationId=${locationId}&status=pending`),
            fetch(`/api/vault/float-request?locationId=${locationId}&status=all&limit=${ITEMS_PER_PAGE}&page=${currentPage + 1}`)
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
                const historyRaw = data.data || [];
                const historyFiltered = historyRaw.filter((r: any) => r.status !== 'pending');
                setRequestHistory(mapRequests(historyFiltered));
                
                // Handle pagination info from API if available, otherwise estimate
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                    setTotalItems(data.pagination.totalItems || historyFiltered.length);
                } else if (data.total) { // Alternate structure
                    setTotalItems(data.total);
                    setTotalPages(Math.ceil(data.total / ITEMS_PER_PAGE));
                }
            }
        }

    } catch (error) {
        console.error('Failed to fetch requests', error);
        toast.error('Failed to load float requests');
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const mapRequests = (data: any[]) => {
      return data.map(r => ({
          id: r._id,
          cashier: r.cashierName || r.cashierId || 'Unknown',
          cashierId: r.cashierId,
          station: 'Cash Desk',
          type: r.type, // 'increase' or 'decrease'
          amount: r.requestedAmount,
          // currentFloat: r.currentFloat || 0, // Not always present in API?
          reason: r.requestNotes || '',
          status: r.status,
          requested: r.requestedAt || r.createdAt,
          processed: r.processedAt || r.updatedAt,
          processedBy: r.processedByName || r.processedBy || 'Vault Manager'
      }));
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.assignedLocations, currentPage]);

  // Periodic refresh only if at least 2 items
  useEffect(() => {
    const totalItems = pendingRequests.length + requestHistory.length;
    if (totalItems === 0) return;

    const interval = setInterval(() => {
        fetchRequests(true); // Silent refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.assignedLocations, currentPage, pendingRequests.length, requestHistory.length]);

  // Actions
  const handleApprove = async (requestId: string) => {
    if (!isVaultReconciled) {
      toast.error('Reconciliation Required', {
        description: 'Please perform the mandatory opening reconciliation before approving requests.'
      });
      return;
    }
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
    if (!isVaultReconciled) {
      toast.error('Reconciliation Required', {
        description: 'Please perform the mandatory opening reconciliation before rejecting requests.'
      });
      return;
    }
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
        <PageLayout>
             <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        </PageLayout>
      );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <VaultManagerHeader
          title="Float Requests"
          description="Review and process cashier float adjustment requests"
          backHref="/vault/management"
          onFloatActionComplete={() => fetchRequests(true)}
          showNotificationBell={false}
        >
          <Button
            onClick={() => fetchRequests(true)}
            disabled={refreshing}
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-gray-400 hover:text-blue-600"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </VaultManagerHeader>

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
            disabled={!isVaultReconciled}
          />


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

        {totalPages > 1 && (
            <div className="mt-4">
                <PaginationControls 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                    totalCount={totalItems}
                    limit={ITEMS_PER_PAGE}
                />
            </div>
        )}
      </div>
      </div>
    </PageLayout>
  );
}
