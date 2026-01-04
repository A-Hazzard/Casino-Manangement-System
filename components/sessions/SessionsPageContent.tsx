/**
 * Sessions Page Content Component
 *
 * Handles state and data fetching for the sessions overview page.
 *
 * @module components/sessions/SessionsPageContent
 */

'use client';

import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { IMAGES } from '@/lib/constants/images';
import { useSessions } from '@/lib/hooks/data/useSessions';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { SessionsFilters } from './SessionsFilters';
import { SessionsTable } from './SessionsTable';

export default function SessionsPageContent() {
  // Use the useSessions hook which exposes data and filter controls
  const {
    sessions,
    loading: isLoading,
    // Filter props
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilter,
    setStatusFilter,
    clearFilters,
    // Data operations
    currentPage,
    handlePageChange,
    pagination,
    refreshSessions,
  } = useSessions();
  
  // Dashboard store specific for Licensee
  const { 
    selectedLicencee,
    setSelectedLicencee,
  } = useDashBoardStore();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (refreshSessions) {
      await refreshSessions();
    }
    setRefreshing(false);
  };

  return (
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee,
        disabled: false,
      }}
      mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
      showToaster={false}
    >
      <div className="flex flex-col">
        {/* Page Header */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
              <Image
                src={IMAGES.activityLogIcon}
                alt="Sessions Icon"
                width={32}
                height={32}
                className="h-6 w-6 sm:h-8 sm:w-8"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading || refreshing}
              className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${isLoading || refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            View all gaming sessions and their events
          </p>
        </div>

        <SessionsFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          sortOrder={sortOrder}
          setSortBy={setSortBy}
          setSortOrder={setSortOrder}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={clearFilters}
        />

        <SessionsTable sessions={sessions} isLoading={isLoading} />
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            // Disable if current page has less items than expected AND we are at the end of known server pages
            // This is a rough check.
            disabled={sessions.length < 10 && !pagination?.hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
