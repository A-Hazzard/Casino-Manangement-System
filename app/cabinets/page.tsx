/**
 * Cabinets Page
 *
 * Main page for managing cabinets/machines with multiple sections and filtering.
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { CabinetTableSkeleton } from '@/components/ui/cabinets/CabinetSkeletonLoader';

// Hooks
import { useCabinetsPageData } from '@/lib/hooks/cabinets/useCabinetsPageData';

// Components
import CabinetsNavigation from '@/components/cabinets/CabinetsNavigation';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import Chart from '@/components/ui/dashboard/Chart';
import { CabinetActions } from '@/components/cabinets/CabinetActions';
import { CabinetSearchFilters } from '@/components/cabinets/CabinetSearchFilters';
import { CabinetContentDisplay } from '@/components/cabinets/CabinetContentDisplay';

// Modals
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { NewCabinetModal } from '@/components/ui/cabinets/NewCabinetModal';
import NewMovementRequestModal from '@/components/ui/movements/NewMovementRequestModal';
import UploadSmibDataModal from '@/components/ui/firmware/UploadSmibDataModal';

// Tabs
const MovementRequests = dynamic(() => import('@/components/cabinets/MovementRequests'), { ssr: false });
const SMIBManagementTab = dynamic(() => import('@/components/cabinets/SMIBManagementTab'), { ssr: false });
const SMIBFirmwareSection = dynamic(() => import('@/components/ui/firmware/SMIBFirmwareSection'), { ssr: false });

const CABINET_TABS_CONFIG = [
  { id: 'cabinets' as const, label: 'Cabinets', icon: '🎰' },
  { id: 'movement' as const, label: 'Movement Requests', icon: '🔄' },
  { id: 'smib' as const, label: 'SMIB Management', icon: '🧩' },
  { id: 'firmware' as const, label: 'Firmware', icon: '🛠️' },
];

function CabinetsPageContent() {
  const hook = useCabinetsPageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, activeMetricsFilter, chartData, loadingChartData } = useDashBoardStore();

  const {
    activeSection, loading, refreshing, error, locations, gameTypes,
    financialTotals, metricsTotals, metricsTotalsLoading, machineStats,
    paginatedCabinets, allCabinets, filteredCabinets, initialLoading, currentPage, sortOption, sortOrder, searchTerm,
    selectedLocation, selectedGameType, selectedStatus,
    isNewMovementOpen, isUploadSmibOpen, refreshTrigger,
    setActiveSection, setSearchTerm, setSelectedLocation, setSelectedGameType,
    setSelectedStatus, setCurrentPage, handleColumnSort,
    handleRefresh, setIsNewMovementOpen, setIsUploadSmibOpen, loadCabinets, transformCabinet
  } = hook;

  if (shouldShowNoLicenseeMessage(user)) {
    return (
      <PageLayout headerProps={{ setSelectedLicencee }} mainClassName="flex flex-col flex-1 p-4 md:p-6" showToaster={false}>
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  return (
    <>
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
      <UploadSmibDataModal isOpen={isUploadSmibOpen} onClose={() => setIsUploadSmibOpen(false)} onRefresh={loadCabinets} />

      <PageLayout headerProps={{ setSelectedLicencee }} mainClassName="flex flex-col flex-1 p-4 md:p-6" showToaster={false}>
        <div className="flex items-center justify-between mt-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Cabinets</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing} className="p-2 text-gray-600">
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
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

        <CabinetsNavigation tabs={CABINET_TABS_CONFIG} activeSection={activeSection} onChange={setActiveSection} />

        {activeSection === 'cabinets' && (
          <div className="mt-6 space-y-6">
            <FinancialMetricsCards totals={metricsTotals || financialTotals} loading={loading || metricsTotalsLoading} title="Total for all Machines" />
            
            <Chart loadingChartData={loadingChartData} chartData={chartData} activeMetricsFilter={activeMetricsFilter} />

            <div className="flex flex-col md:flex-row justify-between gap-4">
              <DashboardDateFilters hideAllTime onCustomRangeGo={loadCabinets} enableTimeInputs />
              <MachineStatusWidget isLoading={refreshing} onlineCount={machineStats?.onlineMachines ?? 0} offlineCount={machineStats?.offlineMachines ?? 0} totalCount={machineStats?.totalMachines ?? 0} showTotal />
            </div>

            <CabinetSearchFilters
              searchTerm={searchTerm} onSearchChange={setSearchTerm}
              selectedLocation={selectedLocation} locations={locations} onLocationChange={setSelectedLocation}
              selectedGameType={selectedGameType} gameTypes={gameTypes} onGameTypeChange={setSelectedGameType}
              selectedStatus={selectedStatus} onStatusChange={setSelectedStatus}
              sortOption={sortOption} sortOrder={sortOrder} onSortChange={() => {}} 
              activeSection={activeSection}
              showLocationFilter={true}
            />

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
              totalPages={Math.ceil((allCabinets?.length || paginatedCabinets.length) / 10)}
              onPageChange={setCurrentPage}
              onSort={handleColumnSort}
              onEdit={() => {}}
              onDelete={() => {}}
              onRetry={loadCabinets}
              transformCabinet={transformCabinet}
            />
          </div>
        )}

        {activeSection === 'smib' && <SMIBManagementTab refreshTrigger={refreshTrigger} />}
        {activeSection === 'movement' && <MovementRequests locations={locations} refreshTrigger={refreshTrigger} />}
        {activeSection === 'firmware' && <SMIBFirmwareSection refreshTrigger={refreshTrigger} />}
      </PageLayout>
    </>
  );
}

import { RefreshCw } from 'lucide-react';

export default function CabinetsPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <Suspense fallback={<CabinetTableSkeleton />}>
        <CabinetsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
