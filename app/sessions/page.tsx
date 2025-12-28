/**
 * Sessions Page
 *
 * Displays all gaming sessions with filtering, search, and pagination.
 *
 * Features:
 * - Session listing with responsive design
 * - Search and filtering capabilities
 * - Date range filtering
 * - Pagination for large datasets
 * - Navigation to session events
 */

'use client';

import { motion } from 'framer-motion';

// Layout components
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';

// Store
import { useDashBoardStore } from '@/lib/store/dashboardStore';

// Hooks
import {
  useSessions,
  useSessionsFilters,
  useSessionsNavigation,
} from '@/lib/hooks/data';

// Components
import SessionsFilters from '@/components/sessions/SessionsFilters';
import SessionsTable from '@/components/sessions/SessionsTable';
import PaginationControls from '@/components/ui/PaginationControls';
import { SessionsPageSkeleton } from '@/components/ui/skeletons/SessionsSkeletons';

// Constants
import { IMAGES } from '@/lib/constants/images';
import { SESSIONS_ANIMATIONS } from '@/lib/constants/sessions';
import { RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

/**
 * Sessions Page
 * Displays all gaming sessions with filtering, search, and pagination
 *
 * Features:
 * - Session listing with responsive design
 * - Search and filtering capabilities
 * - Date range filtering
 * - Pagination for large datasets
 * - Navigation to session events
 */
function SessionsPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const {
    sessions,
    loading,
    error,
    pagination,
    currentPage,
    handlePageChange,
    refreshSessions,
  } = useSessions();

  const {
    searchTerm,
    sortBy,
    sortOrder,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    handleSort,
  } = useSessionsFilters();

  const { navigateToSessionEvents } = useSessionsNavigation();

  // ============================================================================
  // State Management
  // ============================================================================
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Navigate to session events page
   */
  const handleViewEvents = (sessionId: string, machineId: string) => {
    navigateToSessionEvents(sessionId, machineId);
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        hideCurrencyFilter={true}
        showToaster={false}
      >
        {/* Main Content Section: Sessions page with animations */}
        <motion.div
          className="mt-8 w-full"
          variants={SESSIONS_ANIMATIONS.pageVariants}
          initial="initial"
          animate="animate"
        >
          {/* Page Header Section: Title, icon, and description */}
          <div className="mb-6">
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
                onClick={async () => {
                  setRefreshing(true);
                  if (refreshSessions) {
                    await refreshSessions();
                  }
                  setRefreshing(false);
                }}
                disabled={loading || refreshing}
                className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${loading || refreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            <p className="text-gray-600">
              View all gaming sessions and their events
            </p>
          </div>

          {/* Filters Section: Search and sorting controls */}
          <SessionsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            sortOrder={sortOrder}
            setSortBy={setSortBy}
            setSortOrder={setSortOrder}
            onSortChange={handleSort}
          />

          {/* Show loading skeleton while data is fetching */}
          {loading && <SessionsPageSkeleton />}

          {/* Show error message if request failed */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Show sessions table when data is loaded successfully */}
          {!loading && !error && (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <SessionsTable
                  sessions={sessions}
                  onViewEvents={handleViewEvents}
                />
              </div>

              {/* Show pagination only if there are multiple pages */}
              {pagination && pagination.totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  setCurrentPage={handlePageChange}
                />
              )}
            </>
          )}
        </motion.div>
      </PageLayout>
    </>
  );
}

/**
 * Sessions Page Component
 * Thin wrapper that handles routing and authentication
 */
export default function SessionsPage() {
  return (
    <ProtectedRoute requiredPage="sessions">
      <SessionsPageContent />
    </ProtectedRoute>
  );
}
