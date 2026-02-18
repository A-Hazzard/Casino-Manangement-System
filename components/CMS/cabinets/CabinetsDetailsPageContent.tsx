/**
 * Cabinets Details Page Content Component
 *
 * Handles all state management and data fetching for the cabinet details page.
 *
 * Features:
 * - Cabinet summary and status display
 * - SMIB management and configuration
 * - Financial metrics and charts
 * - Accounting and transaction history
 */

'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/shared/ui/NoLicenseeAssigned';
import { CabinetDetailsLoadingState } from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';

import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licensee';
import CabinetsDeleteCabinetModal from './modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from './modals/CabinetsEditCabinetModal';

// Custom Hooks
import { useCabinetPageData } from '@/lib/hooks/cabinets/useCabinetPageData';

// Extracted Sections
import CabinetsDetailsAccountingSection from '@/components/CMS/cabinets/details/CabinetsDetailsAccountingSection';
import CabinetsDetailsChartSection from '@/components/CMS/cabinets/details/CabinetsDetailsChartSection';
import CabinetsDetailsSMIBManagementSection from '@/components/CMS/cabinets/details/CabinetsDetailsSMIBManagementSection';
import CabinetsDetailsSummarySection from '@/components/CMS/cabinets/details/CabinetsDetailsSummarySection';

/**
 * Cabinets Details Page Content Component
 */
export default function CabinetsDetailsPageContent() {
  const hook = useCabinetPageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, selectedLicencee } = useDashBoardStore();
  const { openEditModal } = useCabinetsActionsStore();

  const {
    cabinet,
    locationName,
    error,
    isOnline,
    activeTab,
    refreshing,
    editingSection,
    chartData,
    loadingChart,
    chartGranularity,
    activeMetricsFilter,
    canAccessSmibConfig,
    canEditMachines,
    smibHook,
    setEditingSection,
    setChartGranularity,
    handleTabChange,
    handleRefresh,
    handleCabinetUpdated,
    copyToClipboard,
    onBack,
    onLocationClick,
  } = hook;

  // ============================================================================
  // Early Returns
  // ============================================================================
  if (shouldShowNoLicenseeMessage(user)) {
    return (
      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        pageTitle=""
        hideOptions
        hideLicenceeFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6"
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  if (!cabinet && !error) {
    return (
      <CabinetDetailsLoadingState
        selectedLicencee={selectedLicencee}
        setSelectedLicencee={setSelectedLicencee}
        error={error}
      />
    );
  }

  if (error || !cabinet) {
    return null; // Error handling handled by hook/page skeleton
  }

  return (
    <>
      <CabinetsEditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <CabinetsDeleteCabinetModal />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        pageTitle=""
        hideOptions
        hideLicenceeFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        onRefresh={handleRefresh}
        refreshing={refreshing}
      >
        <div className="flex w-full min-w-0 max-w-full flex-col gap-6">
          {/* Header & Summary */}
          <CabinetsDetailsSummarySection
            cabinet={cabinet}
            locationName={locationName}
            selectedLicencee={selectedLicencee}
            isOnline={isOnline}
            refreshing={refreshing}
            canEditMachines={canEditMachines}
            onBack={onBack}
            onRefresh={handleRefresh}
            onEdit={() => cabinet && openEditModal(cabinet)}
            onCopyToClipboard={copyToClipboard}
            onLocationClick={onLocationClick}
          />

          {/* SMIB Management */}
          <CabinetsDetailsSMIBManagementSection
            cabinet={cabinet}
            canAccessSmibConfig={canAccessSmibConfig}
            smibConfigExpanded={smibHook.smibConfigExpanded}
            mqttConfigData={smibHook.mqttConfigData}
            isConnectedToMqtt={smibHook.isConnectedToMqtt}
            hasConfigBeenFetched={smibHook.hasConfigBeenFetched}
            formData={smibHook.formData}
            isManuallyFetching={smibHook.isManuallyFetching}
            isEditMode={smibHook.isEditMode}
            editingSection={editingSection}
            smibConfig={{
              subscribeToMessages: smibHook.subscribeToMessages,
              isSSEConnected: smibHook.isSSEConnected,
            }}
            onToggleExpand={smibHook.toggleSmibConfig}
            onFetchConfig={smibHook.fetchSmibConfiguration}
            onResetFormData={smibHook.resetFormData}
            onSaveAll={async () => {
              const relayId = cabinet.relayId || cabinet.smibBoard;
              if (!relayId) return;
              await smibHook.saveConfiguration(cabinet._id);
            }}
            onSaveConfig={async cmd => {
              const relayId = cabinet.relayId || cabinet.smibBoard;
              if (!relayId) return;
              
              // Handle machine control commands
              if (cmd) {
                const success = await smibHook.saveConfiguration(
                  cabinet._id,
                  cmd
                );
                if (success) {
                  const { toast } = await import('sonner');
                  toast.success(
                    `Machine control command "${cmd}" sent successfully!`
                  );
                }
                return;
              }
              
              // Handle section-based configuration updates
              const { toast } = await import('sonner');
              
              if (editingSection === 'network') {
                try {
                  const networkData = {
                    netStaSSID:
                      smibHook.formData.networkSSID !== 'No Value Provided'
                      ? smibHook.formData.networkSSID
                      : undefined,
                    netStaPwd:
                      smibHook.formData.networkPassword !== 'No Value Provided'
                      ? smibHook.formData.networkPassword
                      : undefined,
                    netStaChan:
                      smibHook.formData.networkChannel !== 'No Value Provided'
                      ? parseInt(smibHook.formData.networkChannel)
                      : undefined,
                  };
                  
                  // If SMIB is online, send MQTT command
                  if (smibHook.isConnectedToMqtt) {
                    await smibHook.updateNetworkConfig(relayId, networkData);
                  }
                  
                  // Always update database
                  await fetch('/api/mqtt/update-machine-config', {
                    // Update to axios for consistency if needed, but fetch is fine for simple POST
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      relayId,
                      smibConfig: { net: networkData },
                    }),
                  });
                  
                  toast.success(
                    smibHook.isConnectedToMqtt
                      ? 'Network configuration sent to SMIB and saved to database'
                      : 'Network configuration saved to database (SMIB offline)'
                  );
                  
                  // Wait for SMIB to process, then request updated config
                  setTimeout(async () => {
                    await smibHook.requestLiveConfig(relayId, 'net');
                  }, 3000);
                  
                  setEditingSection(null);
                } catch (error) {
                  console.error('Failed to update network config:', error);
                  toast.error('Failed to update network configuration');
                }
              } else if (editingSection === 'coms') {
                setEditingSection(null);
              } else if (editingSection === 'mqtt') {
                setEditingSection(null);
              }
            }}
            onUpdateFormData={smibHook.updateFormData}
            onSetEditingSection={setEditingSection}
            onCopyToClipboard={copyToClipboard}
          />

          {/* Chart Section */}
          <CabinetsDetailsChartSection
            chartData={chartData}
            loadingChart={loadingChart}
            activeMetricsFilter={activeMetricsFilter || null}
            chartGranularity={chartGranularity}
            onGranularityChange={setChartGranularity}
            showGranularitySelector={hook.showGranularitySelector}
            availableGranularityOptions={hook.availableGranularityOptions}
          />

          {/* Accounting & Tabs */}
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

