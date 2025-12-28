/**
 * Machine Detail Page
 *
 * Displays detailed information about a specific machine/cabinet.
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { CabinetDetailsLoadingState } from '@/components/ui/skeletons/CabinetDetailSkeletons';

// Custom Hooks
import { useMachinePageData } from '@/lib/hooks/machines/useMachinePageData';

// Reusable Sections
import CabinetSummarySection from '@/components/cabinets/details/CabinetSummarySection';
import CabinetAccountingSection from '@/components/cabinets/details/CabinetAccountingSection';
import CabinetSMIBManagementSection from '@/components/cabinets/details/CabinetSMIBManagementSection';

/**
 * Machine Detail Page Content Component
 */
function MachineDetailPageContent() {
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
      <EditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <DeleteCabinetModal />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        pageTitle=""
        hideOptions hideLicenceeFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        showToaster={false}
      >
        <div className="flex flex-col gap-6">
          <CabinetSummarySection
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

          <CabinetSMIBManagementSection
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

          <CabinetAccountingSection
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

export default function MachinePage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <MachineDetailPageContent />
    </ProtectedRoute>
  );
}
