/**
 * Cabinets Page Content Component
 *
 * Main content component that orchestrates all data fetching, state management,
 * and renders the cabinets management interface.
 *
 * @module components/cabinets/CabinetsPageContent
 */
'use client';

import { CabinetsActions } from '@/components/CMS/cabinets/CabinetsActions';
import { CabinetsCabinetContentDisplay } from '@/components/CMS/cabinets/CabinetsCabinetContentDisplay';
import { CabinetsCabinetSearchFilters } from '@/components/CMS/cabinets/CabinetsCabinetSearchFilters';
import CabinetsNavigation from '@/components/CMS/cabinets/CabinetsNavigation';
import DashboardChart from '@/components/CMS/dashboard/DashboardChart';
import PageLayout from '@/components/shared/layout/PageLayout';
import { AccessRestricted } from '@/components/shared/ui/AccessRestricted';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import UploadSmibDataModal from '@/components/shared/ui/firmware/UploadSmibDataModal';
import MachineStatusWidget from '@/components/shared/ui/MachineStatusWidget';
import NewMovementRequestModal from '@/components/shared/ui/movements/NewMovementRequestModal';
import { NoLicenceeAssigned } from '@/components/shared/ui/NoLicenceeAssigned';
import { useCabinetsPageData } from '@/lib/hooks/cabinets/useCabinetsPageData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenceeMessage } from '@/lib/utils/licencee';
import { Info, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import CabinetsDeleteCabinetModal from './modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from './modals/CabinetsEditCabinetModal';
import CabinetsNewCabinetModal from './modals/CabinetsNewCabinetModal';

const CabinetsMovementRequests = dynamic(
  () => import('@/components/CMS/cabinets/CabinetsMovementRequests'),
  { ssr: false }
);
const CabinetsSMIBManagementTab = dynamic(
  () => import('@/components/CMS/cabinets/CabinetsSMIBManagementTab'),
  { ssr: false }
);
const SMIBFirmwareSection = dynamic(
  () => import('@/components/shared/ui/firmware/SMIBFirmwareSection'),
  { ssr: false }
);

const CABINET_TABS_CONFIG = [
  { id: 'cabinets' as const, label: 'Cabinets', icon: '🎰' },
  { id: 'movement' as const, label: 'Movement Requests', icon: '🔄' },
  { id: 'smib' as const, label: 'SMIB Management', icon: '🧩' },
  { id: 'firmware' as const, label: 'Firmware', icon: '🛠️' },
];

const EXCLUDED_MOVEMENT_ROLES = ['collector'];

export default function CabinetsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const cabinetsPageData = useCabinetsPageData();
  const { user } = useUserStore();
  const {
    setSelectedLicencee,
    activeMetricsFilter,
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
    chartData,
    loadingChart,
    totalPages,
    totalCount,
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

  const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
  const isTechnicianOnly = userRoles.includes('technician') && !userRoles.some(r => ['admin', 'developer', 'manager', 'location admin'].includes(r));

  const shouldHideFinancials = (_u: { roles?: string[] } | null | undefined) => {
    return false;
  };

  // ============================================================================
  // Permission Checks
  // ============================================================================
  // If user has no licencee assigned, show the "No Licencee Assigned" message
  if (shouldShowNoLicenceeMessage(user)) {
    return (
      <PageLayout
        headerProps={{ setSelectedLicencee }}
        mainClassName="flex flex-col flex-1 p-4 md:p-6"
        showToaster={false}
      >
        <NoLicenceeAssigned />
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Modal Components */}
      <CabinetsEditCabinetModal onCabinetUpdated={handleRefresh} />
      <CabinetsDeleteCabinetModal onCabinetDeleted={handleRefresh} />
      <CabinetsNewCabinetModal locations={locations} onCreated={handleRefresh} />
      <NewMovementRequestModal
        isOpen={isNewMovementOpen}
        onClose={() => setIsNewMovementOpen(false)}
        locations={locations}
        onSubmit={async () => {
          setIsNewMovementOpen(false);
          await handleRefresh();
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
        onRefresh={handleRefresh}
        refreshing={refreshing}
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
          tabs={CABINET_TABS_CONFIG.filter(tab => {
            if (tab.id === 'movement') {
              const userRoles = user?.roles?.map((r: string) => r.toLowerCase()) || [];
              return !userRoles.some((role: string) => EXCLUDED_MOVEMENT_ROLES.includes(role));
            }
            return true;
          })}
          activeSection={activeSection}
          onChange={setActiveSection}
        />

        {/* Subtract Jackpot Indicator */}
        {cabinetsPageData.subtractJackpot && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Info className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-medium text-amber-800">
              Jackpot is subtracted from Money Out for this licencee
            </p>
          </div>
        )}

        {/* ============================================================================
           Tab Content: Main Cabinets View
           ============================================================================ */}
        {activeSection === 'cabinets' && (
          <div className="mt-6 w-full max-w-full overflow-x-hidden">
            {/* Financial Metrics Summary Cards */}
            {!shouldHideFinancials(user) && (
              <div className="mb-6 w-full max-w-full">
                <FinancialMetricsCards
                  totals={metricsTotals || financialTotals}
                  loading={loading || metricsTotalsLoading}
                  title="Total for all Machines"
                />
              </div>
            )}

            {/* Performance Visualization Chart */}
            {!shouldHideFinancials(user) && (
              <div className="mb-6 w-full max-w-full">
                {/* Granularity Selector for Last 30 Days and Quarterly */}
                {((activeMetricsFilter === '30d' || activeMetricsFilter === 'last30days' || activeMetricsFilter === 'Quarterly') && !loadingChart) && (
                  <div className="mb-3 flex items-center justify-end gap-2">
                    <label
                      htmlFor="chart-granularity-cabinets"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Granularity:
                    </label>
                    <select
                      id="chart-granularity-cabinets"
                      value={cabinetsPageData.chartGranularity}
                      onChange={e =>
                        cabinetsPageData.setChartGranularity(
                          e.target.value as 'daily' | 'weekly' | 'monthly'
                        )
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {activeMetricsFilter === 'Quarterly' ? (
                        <>
                          <option value="monthly">Monthly</option>
                          <option value="weekly">Weekly</option>
                        </>
                      ) : (
                        <>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </>
                      )}
                    </select>
                  </div>
                )}
                <DashboardChart
                  loadingChartData={loadingChart}
                  chartData={chartData}
                  activeMetricsFilter={activeMetricsFilter}
                  granularity={cabinetsPageData.chartGranularity}
                />
              </div>
            )}

            {/* Filter Controls Row: Date selection and machine status widget */}
            <div className="mb-6 mt-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div className="order-1">
                {isTechnicianOnly ? (
                  <div className="flex h-10 items-center rounded-lg bg-blue-50 px-4 text-sm font-medium text-blue-700">
                    <span className="mr-2 italic">Showing data within the last hour</span>
                  </div>
                ) : (
                  <DateFilters
                    hideAllTime
                    showQuarterly
                    onCustomRangeGo={loadCabinets}
                    enableTimeInputs
                  />
                )}
              </div>
              <div className="order-2">
                <MachineStatusWidget
                  isLoading={refreshing}
                  onlineCount={machineStats?.onlineMachines ?? 0}
                  offlineCount={machineStats?.offlineMachines ?? 0}
                  totalCount={machineStats?.totalMachines ?? 0}
                  showTotal
                />
              </div>
            </div>

            {/* Search & Advanced Filters */}
            <div className="relative w-full max-w-full overflow-visible">
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
                onSortChange={handleColumnSort}
                activeSection={activeSection}
                showLocationFilter={true}
              />
            </div>

            {/* Cabinet Listing: Table and Mobile Card Views */}
            <div className="mt-4 w-full max-w-full overflow-x-hidden">
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
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={setCurrentPage}
                onSort={handleColumnSort}
                onEdit={() => {}}
                onDelete={() => {}}
                onRetry={loadCabinets}
                transformCabinet={transformCabinet}
                subtractJackpot={cabinetsPageData.subtractJackpot}
                showArchived={selectedStatus === 'Archived'}
              />
            </div>
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
          (() => {
            const userRoles = user?.roles?.map((r: string) => r.toLowerCase()) || [];
            const isAuthorized = !userRoles.some((role: string) => EXCLUDED_MOVEMENT_ROLES.includes(role));
            
            if (!isAuthorized) {
              return <AccessRestricted sectionName="Movement Requests" />;
            }
            
            return (
              <CabinetsMovementRequests
                locations={locations}
                refreshTrigger={refreshTrigger}
              />
            );
          })()
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
