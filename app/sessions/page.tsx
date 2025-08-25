"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Layout components
import Header from "@/components/layout/Header";


// Store
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// Hooks
import { useSessions } from "@/lib/hooks/useSessions";

// Components
import SessionsFilters from "@/components/sessions/SessionsFilters";
import SessionsTable from "@/components/sessions/SessionsTable";
import SessionsPagination from "@/components/sessions/SessionsPagination";

// Constants
import { SESSIONS_ANIMATIONS } from "@/lib/constants/sessions";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";

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
export default function SessionsPage() {
  const router = useRouter();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  const {
    sessions,
    loading,
    error,
    searchTerm,
    sortBy,
    sortOrder,
    pagination,
    handleSearch,
    handleSort,
    handlePageChange,
  } = useSessions();

  /**
   * Navigate to session events page
   */
  const handleViewEvents = (sessionId: string, machineId: string) => {
    router.push(`/sessions/${sessionId}/${machineId}/events`);
  };

  return (
    <>

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden md:w-11/12 md:ml-20 transition-all duration-300">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
          />

          <motion.div
            className="w-full mt-8"
            variants={SESSIONS_ANIMATIONS.pageVariants}
            initial="initial"
            animate="animate"
          >
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
                <Image
                  src={IMAGES.activityLogIcon}
                  alt="Sessions Icon"
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
              </div>
              <p className="text-gray-600">
                View all gaming sessions and their events
              </p>
            </div>

            {/* Filters */}
            <SessionsFilters
              searchTerm={searchTerm}
              onSearchChange={handleSearch}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSort}
            />

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading sessions...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Sessions Table */}
            {!loading && !error && (
              <>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <SessionsTable
                    sessions={sessions}
                    onViewEvents={handleViewEvents}
                  />
                </div>

                {/* Pagination */}
                <SessionsPagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </motion.div>
        </main>
      </div>
    </>
  );
}
