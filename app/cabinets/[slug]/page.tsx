/**
 * Cabinet Detail Page
 *
 * Displays detailed information about a specific cabinet/machine.
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { CabinetDetailsLoadingState } from '@/components/ui/skeletons/CabinetDetailSkeletons';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { useDashboardScroll } from '@/lib/hooks/data';

// Custom Hooks
import { useCabinetPageData } from '@/lib/hooks/cabinets/useCabinetPageData';

// Extracted Sections
import CabinetAccountingSection from '@/components/cabinets/details/CabinetAccountingSection';
import CabinetChartSection from '@/components/cabinets/details/CabinetChartSection';
import CabinetSMIBManagementSection from '@/components/cabinets/details/CabinetSMIBManagementSection';
import CabinetSummarySection from '@/components/cabinets/details/CabinetSummarySection';

/**
 * Cabinet Detail Page Content Component
 */
function CabinetDetailPageContent() {
  const hook = useCabinetPageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, selectedLicencee } = useDashBoardStore();
  const { showFloatingRefresh } = useDashboardScroll();

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
      <EditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <DeleteCabinetModal />

      <PageLayout
        headerProps={{ selectedLicencee, setSelectedLicencee }}
        pageTitle=""
        hideOptions
        hideLicenceeFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
      >
        <div className="flex w-full min-w-0 max-w-full flex-col gap-6">
          {/* Header & Summary */}
          <CabinetSummarySection
            cabinet={cabinet}
            locationName={locationName}
            selectedLicencee={selectedLicencee}
            isOnline={isOnline}
            refreshing={refreshing}
            canEditMachines={canEditMachines}
            onBack={onBack}
            onRefresh={handleRefresh}
            onEdit={() => {}} // Store handles modal
            onCopyToClipboard={copyToClipboard}
            onLocationClick={onLocationClick}
          />

          {/* SMIB Management */}
          <CabinetSMIBManagementSection
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
                // TODO: Implement COMS update when COMS section is added
                setEditingSection(null);
              } else if (editingSection === 'mqtt') {
                // TODO: Implement MQTT update when MQTT section is added
                setEditingSection(null);
              }
            }}
            onUpdateFormData={smibHook.updateFormData}
            onSetEditingSection={setEditingSection}
            onCopyToClipboard={copyToClipboard}
          />

          {/* Chart Section */}
          <CabinetChartSection
            chartData={chartData}
            loadingChart={loadingChart}
            activeMetricsFilter={activeMetricsFilter || null}
            chartGranularity={chartGranularity}
            onGranularityChange={setChartGranularity}
            showGranularitySelector={hook.showGranularitySelector}
            availableGranularityOptions={hook.availableGranularityOptions}
          />

          {/* Accounting & Tabs */}
          <CabinetAccountingSection
            cabinet={cabinet}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onRefresh={handleRefresh}
          />
              </div>
      </PageLayout>

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        showRefresh={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </>
  );
}

/**
 * Main Cabinet Detail Page
 */
export default function CabinetPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <CabinetDetailPageContent />
    </ProtectedRoute>
  );
}
