'use client';

import { motion } from 'framer-motion';

// Layout components
import PageLayout from '@/components/layout/PageLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

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
import SessionsPagination from '@/components/sessions/SessionsPagination';
import { SessionsPageSkeleton } from '@/components/ui/skeletons/SessionsSkeletons';

// Constants
import { SESSIONS_ANIMATIONS } from '@/lib/constants/sessions';
import Image from 'next/image';
import { IMAGES } from '@/lib/constants/images';

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
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // Custom hooks for sessions functionality
  const { sessions, loading, error, pagination, handlePageChange } =
    useSessions();

  const { searchTerm, sortBy, sortOrder, setSearchTerm, setSortBy, setSortOrder, handleSort } =
    useSessionsFilters();

  const { navigateToSessionEvents } = useSessionsNavigation();

  /**
   * Navigate to session events page
   */
  const handleViewEvents = (sessionId: string, machineId: string) => {
    navigateToSessionEvents(sessionId, machineId);
  };

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
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

          {/* Loading State Section: Skeleton loader while data is fetching */}
          {loading && <SessionsPageSkeleton />}

          {/* Error State Section: Error display for failed requests */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Sessions Table Section: Main data display with table and pagination */}
          {!loading && !error && (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <SessionsTable
                  sessions={sessions}
                  onViewEvents={handleViewEvents}
                />
              </div>

              {/* Pagination Section: Navigation controls for session pages */}
              <SessionsPagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </motion.div>
      </PageLayout>
    </>
  );
}

export default function SessionsPage() {
  return (
    <ProtectedRoute requiredPage="sessions">
      <SessionsPageContent />
    </ProtectedRoute>
  );
}
