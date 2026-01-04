/**
 * Cabinets Page Content Component
 *
 * Main content component that orchestrates all data fetching, state management,
 * and renders the cabinets management interface.
 *
 * @module components/cabinets/CabinetsPageContent
 */
'use client';

import { CabinetsActions } from '@/components/cabinets/CabinetsActions';
import { CabinetsCabinetContentDisplay } from '@/components/cabinets/CabinetsCabinetContentDisplay';
import { CabinetsCabinetSearchFilters } from '@/components/cabinets/CabinetsCabinetSearchFilters';
import CabinetsNavigation from '@/components/cabinets/CabinetsNavigation';
import DashboardChart from '@/components/dashboard/DashboardChart';
import PageLayout from '@/components/layout/PageLayout';
import DateFilters from '@/components/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import UploadSmibDataModal from '@/components/ui/firmware/UploadSmibDataModal';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import NewMovementRequestModal from '@/components/ui/movements/NewMovementRequestModal';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { useCabinetsPageData } from '@/lib/hooks/cabinets/useCabinetsPageData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import CabinetsDeleteCabinetModal from './modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from './modals/CabinetsEditCabinetModal';
import CabinetsNewCabinetModal from './modals/CabinetsNewCabinetModal';

const CabinetsMovementRequests = dynamic(
  () => import('@/components/cabinets/CabinetsMovementRequests'),
  { ssr: false }
);
const CabinetsSMIBManagementTab = dynamic(
  () => import('@/components/cabinets/CabinetsSMIBManagementTab'),
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

export default function CabinetsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
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

  // ============================================================================
  // Permission Checks
  // ============================================================================
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

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Modal Components */}
      <CabinetsEditCabinetModal onCabinetUpdated={loadCabinets} />
      <CabinetsDeleteCabinetModal onCabinetDeleted={loadCabinets} />
      <CabinetsNewCabinetModal locations={locations} onCreated={loadCabinets} />
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
              className="p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <CabinetsActions
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

        {/* Tab Navigation Section */}
        <CabinetsNavigation
          tabs={CABINET_TABS_CONFIG}
          activeSection={activeSection}
          onChange={setActiveSection}
        />

        {/* ============================================================================
           Tab Content: Main Cabinets View
           ============================================================================ */}
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

            {/* Performance Visualization Chart */}
            <div className="mb-6">
              <DashboardChart
                loadingChartData={loadingChartData}
                chartData={chartData}
                activeMetricsFilter={activeMetricsFilter}
              />
            </div>

            {/* Filter Controls Row: Date selection and machine status widget */}
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <DateFilters
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

            {/* Search & Advanced Filters */}
            <CabinetsCabinetSearchFilters
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

            {/* Cabinet Listing: Table and Mobile Card Views */}
            <CabinetsCabinetContentDisplay
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

        {/* ============================================================================
           Tab Content: SMIB Management
           ============================================================================ */}
        {activeSection === 'smib' && (
          <CabinetsSMIBManagementTab refreshTrigger={refreshTrigger} />
        )}

        {/* ============================================================================
           Tab Content: Movement Requests
           ============================================================================ */}
        {activeSection === 'movement' && (
          <CabinetsMovementRequests
            locations={locations}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* ============================================================================
           Tab Content: Firmware Management
           ============================================================================ */}
        {activeSection === 'firmware' && (
          <SMIBFirmwareSection refreshTrigger={refreshTrigger} />
        )}
      </PageLayout>
    </>
  );
}
