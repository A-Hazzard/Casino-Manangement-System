/**
 * Machine Details Page Content Component
 *
 * Handles all state management and data fetching for the machine details page.
 *
 * Features:
 * - Machine summary and status display
 * - SMIB management and configuration
 * - Accounting and transaction history
 */

'use client';

import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import CabinetsDeleteCabinetModal from '@/components/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/cabinets/modals/CabinetsEditCabinetModal';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { CabinetDetailsLoadingState } from '@/components/ui/skeletons/CabinetDetailSkeletons';

// Custom Hooks
import { useMachinePageData } from '@/lib/hooks/machines/useMachinePageData';

// Reusable Sections
import CabinetsDetailsSummarySection from '@/components/cabinets/details/CabinetsDetailsSummarySection';
import CabinetsDetailsAccountingSection from '@/components/cabinets/details/CabinetsDetailsAccountingSection';
import CabinetsDetailsSMIBManagementSection from '@/components/cabinets/details/CabinetsDetailsSMIBManagementSection';

/**
 * Machine Detail Page Content Component
 */
export default function MachineDetailsPageContent() {
  const hook = useMachinePageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, selectedLicencee } = useDashBoardStore();

  const {
    cabinet,
    locationName,
    error,
    isOnline,
    activeTab,
    refreshing,
    canManageMachines,
    smibHook,
    handleTabChange,
    handleRefresh,
    handleCabinetUpdated,
    onBack,
    onLocationClick,
  } = hook;

  // Show "No Licensee Assigned" message for non-admin users without licensees
  if (shouldShowNoLicenseeMessage(user)) {
    return (
      <PageLayout headerProps={{ selectedLicencee, setSelectedLicencee }} pageTitle="Machine Details" hideOptions hideLicenceeFilter mainClassName="flex flex-col flex-1 p-4 md:p-6" showToaster>
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  // Show loading state while fetching cabinet data
  if (!cabinet && !error) {
    return <CabinetDetailsLoadingState selectedLicencee={selectedLicencee} setSelectedLicencee={setSelectedLicencee} error={error} />;
  }

  // Don't render if there's an error or no cabinet data
  if (error || !cabinet) return null;

  return (
    <>
      <CabinetsEditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <CabinetsDeleteCabinetModal />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        pageTitle=""
        hideOptions hideLicenceeFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        showToaster={false}
      >
        <div className="flex flex-col gap-6">
          <CabinetsDetailsSummarySection
            cabinet={cabinet}
            locationName={locationName}
            selectedLicencee={selectedLicencee}
            isOnline={isOnline}
            refreshing={refreshing}
            canEditMachines={canManageMachines}
            onBack={onBack}
            onRefresh={handleRefresh}
            onEdit={() => {}} // Handled by store
            onCopyToClipboard={(text) => navigator.clipboard.writeText(text)}
            onLocationClick={onLocationClick}
          />

          <CabinetsDetailsSMIBManagementSection
            cabinet={cabinet}
            canAccessSmibConfig={canManageMachines}
            smibConfigExpanded={smibHook.smibConfigExpanded}
            mqttConfigData={null} // Simplified for machine view
            isConnectedToMqtt={smibHook.isConnectedToMqtt}
            hasConfigBeenFetched={smibHook.hasConfigBeenFetched}
            formData={smibHook.formData}
            isManuallyFetching={smibHook.isManuallyFetching}
            editingSection={null}
            onToggleExpand={smibHook.toggleSmibConfig}
            onFetchConfig={smibHook.fetchSmibConfiguration}
            onSaveConfig={async () => {}}
            onUpdateFormData={smibHook.updateFormData}
            onSetEditingSection={() => {}}
            onCopyToClipboard={(text) => navigator.clipboard.writeText(text)}
          />

          <CabinetsDetailsAccountingSection
            cabinet={cabinet}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onRefresh={handleRefresh}
          />
        </div>
      </PageLayout>
    </>
  );
}
