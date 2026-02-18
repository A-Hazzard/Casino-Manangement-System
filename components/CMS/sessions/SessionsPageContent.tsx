/**
 * Sessions Page Content Component
 *
 * Handles state and data fetching for the sessions overview page.
 *
 * @module components/sessions/SessionsPageContent
 */

'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { IMAGES } from '@/lib/constants';
import { useSessions } from '@/lib/hooks/data/useSessions';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
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
    // Data operations
    currentPage,
    totalPages,
    handlePageChange,
    refreshSessions,
    // Status filter
    statusFilter,
    setStatusFilter,
    clearFilters,
    hasActiveFilters,
  } = useSessions();

  // Dashboard store specific for Licensee
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
if (refreshSessions) {
      await refreshSessions();
    }
    setRefreshing(false);
  };

  const handleSort = (field: string) => {
    const newSortOrder =
      sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newSortOrder);
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
      onRefresh={handleRefresh}
      refreshing={refreshing}
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
          <p className="mt-1 text-gray-600">
            View all gaming sessions and their events
          </p>
        </div>

        <div className="mt-4">
          <DateFilters hideAllTime={false} onCustomRangeGo={refreshSessions} />
        </div>

        {/* Filters row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4">
          <div className="relative min-w-0 max-w-md flex-1">
            <Input
              type="text"
              placeholder="Search sessions..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="flex items-center gap-4">
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-white hover:underline whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <SessionsTable
          sessions={sessions}
          isLoading={isLoading}
          sortOption={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {/* Pagination */}
        {!isLoading && sessions.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex justify-center pb-8">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={handlePageChange}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
