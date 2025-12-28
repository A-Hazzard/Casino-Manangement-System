/**
 * Cabinets Page
 *
 * Main page for managing cabinets/machines with multiple sections and filtering.
 *
 * Features:
 * - Overview dashboard with financial metrics and performance charts
 * - Machine listing with search, filters, and sorting
 * - Tab-based navigation for different management sections
 * - CRUD operations for cabinets/machines
 * - Movement requests management
 * - SMIB device management
 * - Firmware management
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { CabinetTableSkeleton } from '@/components/ui/cabinets/CabinetSkeletonLoader';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { CabinetActions } from '@/components/cabinets/CabinetActions';
import { CabinetContentDisplay } from '@/components/cabinets/CabinetContentDisplay';
import { CabinetSearchFilters } from '@/components/cabinets/CabinetSearchFilters';
import CabinetsNavigation from '@/components/cabinets/CabinetsNavigation';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { NewCabinetModal } from '@/components/ui/cabinets/NewCabinetModal';
import Chart from '@/components/ui/dashboard/Chart';
import UploadSmibDataModal from '@/components/ui/firmware/UploadSmibDataModal';
import NewMovementRequestModal from '@/components/ui/movements/NewMovementRequestModal';
import { useCabinetsPageData } from '@/lib/hooks/cabinets/useCabinetsPageData';

const MovementRequests = dynamic(
  () => import('@/components/cabinets/MovementRequests'),
  { ssr: false }
);
const SMIBManagementTab = dynamic(
  () => import('@/components/cabinets/SMIBManagementTab'),
  { ssr: false }
);
const SMIBFirmwareSection = dynamic(
  () => import('@/components/ui/firmware/SMIBFirmwareSection'),
  { ssr: false }
);

const CABINET_TABS_CONFIG = [
  { id: 'cabinets' as const, label: 'Cabinets', icon: '🎰' },
  { id: 'movement' as const, label: 'Movement Requests', icon: '🔄' },
  { id: 'smib' as const, label: 'SMIB Management', icon: '🧩' },
  { id: 'firmware' as const, label: 'Firmware', icon: '🛠️' },
];

/**
 * Cabinets Page Content Component
 *
 * Main content component that orchestrates all data fetching, state management,
 * and renders the cabinets management interface.
 */
function CabinetsPageContent() {
  const cabinetsPageData = useCabinetsPageData();
  const { user } = useUserStore();
  const {
    setSelectedLicencee,
    activeMetricsFilter,
    chartData,
    loadingChartData,
  } = useDashBoardStore();

  const {
    activeSection,
    loading,
    refreshing,
    error,
    locations,
    gameTypes,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    paginatedCabinets,
    allCabinets,
    filteredCabinets,
    initialLoading,
    currentPage,
    sortOption,
    sortOrder,
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    isNewMovementOpen,
    isUploadSmibOpen,
    refreshTrigger,
    setActiveSection,
    setSearchTerm,
    setSelectedLocation,
    setSelectedGameType,
    setSelectedStatus,
    setCurrentPage,
    handleColumnSort,
    handleRefresh,
    setIsNewMovementOpen,
    setIsUploadSmibOpen,
    loadCabinets,
    transformCabinet,
  } = cabinetsPageData;

  // If user has no licensee assigned, show the "No Licensee Assigned" message
  if (shouldShowNoLicenseeMessage(user)) {
    return (
      <PageLayout
        headerProps={{ setSelectedLicencee }}
        mainClassName="flex flex-col flex-1 p-4 md:p-6"
        showToaster={false}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  return (
    <>
      {/* Modal Components */}
      <EditCabinetModal onCabinetUpdated={loadCabinets} />
      <DeleteCabinetModal onCabinetDeleted={loadCabinets} />
      <NewCabinetModal locations={locations} onCreated={loadCabinets} />
      <NewMovementRequestModal
        isOpen={isNewMovementOpen}
        onClose={() => setIsNewMovementOpen(false)}
        locations={locations}
        onSubmit={async () => {
          setIsNewMovementOpen(false);
          await loadCabinets();
        }}
      />
      <UploadSmibDataModal
        isOpen={isUploadSmibOpen}
        onClose={() => setIsUploadSmibOpen(false)}
        onRefresh={loadCabinets}
      />

      <PageLayout
        headerProps={{ setSelectedLicencee }}
        mainClassName="flex flex-col flex-1 p-4 md:p-6"
        showToaster={false}
      >
        {/* Page Header: Title, refresh button, and action buttons */}
        <div className="mb-6 mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            Cabinets
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <CabinetActions
              activeSection={activeSection}
              selectedLocation={selectedLocation}
              locations={locations}
              onMovementRequestClick={() => setIsNewMovementOpen(true)}
              onCabinetCreated={loadCabinets}
              onCabinetUpdated={loadCabinets}
              onCabinetDeleted={loadCabinets}
              loading={loading}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <CabinetsNavigation
          tabs={CABINET_TABS_CONFIG}
          activeSection={activeSection}
          onChange={setActiveSection}
        />

        {/* Main Content Area - Show cabinets tab content when cabinets section is active */}
        {activeSection === 'cabinets' && (
          <div className="mt-6">
            {/* Financial Metrics Summary Cards */}
            <div className="mb-6">
              <FinancialMetricsCards
                totals={metricsTotals || financialTotals}
                loading={loading || metricsTotalsLoading}
                title="Total for all Machines"
              />
            </div>

            {/* Performance Chart */}
            <div className="mb-6">
              <Chart
                loadingChartData={loadingChartData}
                chartData={chartData}
                activeMetricsFilter={activeMetricsFilter}
              />
            </div>

            {/* Controls Row: Date filters and machine status widget */}
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <DashboardDateFilters
                hideAllTime
                onCustomRangeGo={loadCabinets}
                enableTimeInputs
              />
              <MachineStatusWidget
                isLoading={refreshing}
                onlineCount={machineStats?.onlineMachines ?? 0}
                offlineCount={machineStats?.offlineMachines ?? 0}
                totalCount={machineStats?.totalMachines ?? 0}
                showTotal
              />
            </div>

            {/* Search & Filter Bar */}
            <CabinetSearchFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedLocation={selectedLocation}
              locations={locations}
              onLocationChange={setSelectedLocation}
              selectedGameType={selectedGameType}
              gameTypes={gameTypes}
              onGameTypeChange={setSelectedGameType}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              sortOption={sortOption}
              sortOrder={sortOrder}
              onSortChange={() => {}}
              activeSection={activeSection}
              showLocationFilter={true}
            />

            {/* Cabinet Table/Cards Display */}
            <CabinetContentDisplay
              paginatedCabinets={paginatedCabinets}
              filteredCabinets={filteredCabinets || paginatedCabinets}
              allCabinets={allCabinets || paginatedCabinets}
              initialLoading={initialLoading || false}
              loading={loading}
              error={error}
              sortOption={sortOption}
              sortOrder={sortOrder}
              currentPage={currentPage}
              totalPages={Math.ceil(
                (allCabinets?.length || paginatedCabinets.length) / 20
              )}
              onPageChange={setCurrentPage}
              onSort={handleColumnSort}
              onEdit={() => {}}
              onDelete={() => {}}
              onRetry={loadCabinets}
              transformCabinet={transformCabinet}
            />
          </div>
        )}

        {/* Show SMIB Management tab when SMIB section is active */}
        {activeSection === 'smib' && (
          <SMIBManagementTab refreshTrigger={refreshTrigger} />
        )}

        {/* Show Movement Requests tab when movement section is active */}
        {activeSection === 'movement' && (
          <MovementRequests
            locations={locations}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Show Firmware tab when firmware section is active */}
        {activeSection === 'firmware' && (
          <SMIBFirmwareSection refreshTrigger={refreshTrigger} />
        )}
      </PageLayout>
    </>
  );
}

/**
 * Cabinets Page (Root Component)
 *
 * Protected route wrapper for the cabinets page with suspense boundary.
 * Ensures user has proper permissions before rendering the page content.
 */
export default function CabinetsPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <Suspense fallback={<CabinetTableSkeleton />}>
        <CabinetsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
