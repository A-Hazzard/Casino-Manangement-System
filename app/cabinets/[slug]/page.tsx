'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { IMAGES } from '@/lib/constants/images';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import { Button } from '@/components/ui/button';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { useCabinetDetailsData, useSmibConfiguration } from '@/lib/hooks/data';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  Cross2Icon,
  Pencil2Icon,
} from '@radix-ui/react-icons';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
// GSAP import removed - animations were causing performance issues
import AccountingDetails from '@/components/cabinetDetails/AccountingDetails';
import { NetworkError, NotFoundError, UnauthorizedError } from '@/components/ui/errors';
import RefreshButton from '@/components/ui/RefreshButton';
import { format } from 'date-fns';
import { Check, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';

// Extracted skeleton and error components
import { MeterDataSection } from '@/components/cabinets/smibManagement/MeterDataSection';
import { OTAUpdateSection } from '@/components/cabinets/smibManagement/OTAUpdateSection';
import { RestartSection } from '@/components/cabinets/smibManagement/RestartSection';
import { CabinetDetailsLoadingState } from '@/components/ui/skeletons/CabinetDetailSkeletons';

// Animation variants
const configContentVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Custom hook to safely handle client-side animations
function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

function CabinetDetailPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = pathname.split('/').pop() || '';
  const [isClient, setIsClient] = useState(false);
  const hasMounted = useHasMounted();

  // Get current user for permission checking
  const { user } = useUserStore();
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  // Only Developer, Admin, and Technician can access SMIB Configuration
  const canAccessSmibConfig =
    user &&
    user.roles &&
    user.roles.length > 0 &&
    user.roles.some(role =>
      ['technician', 'admin', 'developer'].includes(role)
    );

  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // State for tracking date filter initialization
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);

  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter && !dateFilterInitialized) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter, dateFilterInitialized]);

  const { openEditModal } = useCabinetActionsStore();

  // Custom hooks for data management
  const {
    cabinet,
    locationName,
    error,
    errorType,
    metricsLoading,
    isOnline,
    fetchCabinetDetailsData,
    handleCabinetUpdated,
  } = useCabinetDetailsData({
    slug,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
  });

  const {
    smibConfigExpanded,
    isEditMode,
    mqttConfigData,
    isLoadingMqttConfig: _isLoadingMqttConfig,
    isConnectedToMqtt,
    hasConfigBeenFetched,
    formData,
    toggleSmibConfig,
    // setEditMode,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
    updateFormData,
    resetFormData,
    saveConfiguration,
    fetchMqttConfig,
    disconnectFromConfigStream,
    requestLiveConfig,
    fetchSmibConfiguration,
    isManuallyFetching,
    publishConfigUpdate: _publishConfigUpdate,
    updateNetworkConfig,
    updateMqttConfig,
    updateComsConfig,
    // _updateOtaConfig,
    // _updateAppConfig,
  } = useSmibConfiguration();

  // Initialize activeMetricsTabContent from URL on first load
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState<string>(() => {
      const section = searchParams?.get('section');
      if (section === 'live-metrics') return 'Live Metrics';
      if (section === 'bill-validator') return 'Bill Validator';
      if (section === 'activity-log') return 'Activity Log';
      if (section === 'collection-history') return 'Collection History';
      if (section === 'collection-settings') return 'Collection Settings';
      if (section === 'configurations') return 'Configurations';
      return 'Range Metrics'; // default
    });

  // Refs for animation
  const configSectionRef = useRef<HTMLDivElement>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

  // Update SMIB configuration when cabinet data changes
  useEffect(() => {
    if (cabinet) {
      setCommunicationModeFromData(cabinet);
      setFirmwareVersionFromData(cabinet);
      // Fetch MQTT configuration from API
      fetchMqttConfig(String(cabinet._id));

      // Note: SMIB connection is now manual - only when user clicks "Get SMIB Configuration"
    }

    // Cleanup on unmount or cabinet change
    return () => {
      disconnectFromConfigStream();
    };
  }, [
    cabinet,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
    fetchMqttConfig,
    disconnectFromConfigStream,
  ]);

  // Note: Date filter changes are now handled by the main useEffect above

  // Don't show loading state on initial load
  useEffect(() => {
    if (cabinet && !refreshing) {
      // Loading state is managed by the hook
    }
  }, [cabinet, refreshing]);

  const handleBackToCabinets = () => {
    router.push(`/cabinets`);
  };

  // Set isClient to true once component mounts in the browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Keep state in sync with URL changes (for browser back/forward)
  useEffect(() => {
    const section = searchParams?.get('section');
    if (
      section === 'live-metrics' &&
      activeMetricsTabContent !== 'Live Metrics'
    ) {
      setActiveMetricsTabContent('Live Metrics');
    } else if (
      section === 'bill-validator' &&
      activeMetricsTabContent !== 'Bill Validator'
    ) {
      setActiveMetricsTabContent('Bill Validator');
    } else if (
      section === 'activity-log' &&
      activeMetricsTabContent !== 'Activity Log'
    ) {
      setActiveMetricsTabContent('Activity Log');
    } else if (
      section === 'collection-history' &&
      activeMetricsTabContent !== 'Collection History'
    ) {
      setActiveMetricsTabContent('Collection History');
    } else if (
      section === 'collection-settings' &&
      activeMetricsTabContent !== 'Collection Settings'
    ) {
      setActiveMetricsTabContent('Collection Settings');
    } else if (
      section === 'configurations' &&
      activeMetricsTabContent !== 'Configurations'
    ) {
      setActiveMetricsTabContent('Configurations');
    } else if (!section && activeMetricsTabContent !== 'Range Metrics') {
      setActiveMetricsTabContent('Range Metrics');
    }
  }, [searchParams, activeMetricsTabContent]);

  // Handle tab change with URL update
  const handleTabChange = (tab: string) => {
    setActiveMetricsTabContent(tab);

    // Update URL based on tab selection
    const sectionMap: Record<string, string> = {
      'Range Metrics': '',
      'Live Metrics': 'live-metrics',
      'Bill Validator': 'bill-validator',
      'Activity Log': 'activity-log',
      'Collection History': 'collection-history',
      'Collection Settings': 'collection-settings',
      Configurations: 'configurations',
    };

    const params = new URLSearchParams(searchParams?.toString() || '');
    const sectionValue = sectionMap[tab];

    if (sectionValue) {
      params.set('section', sectionValue);
    } else {
      params.delete('section');
    }

    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  // Handle scroll to show/hide floating refresh button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setShowFloatingRefresh(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // PERFORMANCE OPTIMIZATION: Remove GSAP animations that run on every data change
  // These animations were causing performance issues by running on every cabinet data update
  // Animations should only run on user interactions, not on data changes

  // Update the refresh handler to refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCabinetDetailsData();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle SMIB configuration save
  const handleSaveSMIBConfig = async (machineControl?: string) => {
    if (!cabinet) return;

    const relayId = cabinet.relayId || cabinet.smibBoard;
    if (!relayId) {
      toast.error('No relay ID found for this cabinet');
      return;
    }

    try {
      // Handle machine control commands
      if (machineControl) {
        const success = await saveConfiguration(cabinet._id, machineControl);
        if (success) {
          toast.success(
            `Machine control command "${machineControl}" sent successfully!`
          );
        } else {
          toast.error('Failed to send machine control command');
        }
        return;
      }

      // Update configurations via MQTT based on current editing section
      const updatePromises = [];

      // Update network configuration if editing network section
      if (editingSection === 'network') {
        if (
          formData.networkSSID !== 'No Value Provided' ||
          formData.networkPassword !== 'No Value Provided' ||
          formData.networkChannel !== 'No Value Provided'
        ) {
          updatePromises.push(
            updateNetworkConfig(relayId, {
              netStaSSID:
                formData.networkSSID !== 'No Value Provided'
                  ? formData.networkSSID
                  : undefined,
              netStaPwd:
                formData.networkPassword !== 'No Value Provided'
                  ? formData.networkPassword
                  : undefined,
              netStaChan:
                formData.networkChannel !== 'No Value Provided'
                  ? parseInt(formData.networkChannel)
                  : undefined,
            })
          );
        }
      }

      // Update COMS configuration if editing coms section
      if (editingSection === 'coms') {
        if (
          formData.comsMode !== 'No Value Provided' ||
          formData.comsAddr !== 'No Value Provided' ||
          formData.comsRateMs !== 'No Value Provided' ||
          formData.comsRTE !== 'No Value Provided' ||
          formData.comsGPC !== 'No Value Provided'
        ) {
          updatePromises.push(
            updateComsConfig(relayId, {
              comsMode:
                formData.comsMode !== 'No Value Provided'
                  ? parseInt(formData.comsMode)
                  : undefined,
              comsAddr:
                formData.comsAddr !== 'No Value Provided'
                  ? parseInt(formData.comsAddr)
                  : undefined,
              comsRateMs:
                formData.comsRateMs !== 'No Value Provided'
                  ? parseInt(formData.comsRateMs)
                  : undefined,
              comsRTE:
                formData.comsRTE !== 'No Value Provided'
                  ? parseInt(formData.comsRTE)
                  : undefined,
              comsGPC:
                formData.comsGPC !== 'No Value Provided'
                  ? parseInt(formData.comsGPC)
                  : undefined,
            })
          );
        }
      }

      // Update MQTT configuration if editing mqtt section
      if (editingSection === 'mqtt') {
        if (
          formData.mqttPubTopic !== 'No Value Provided' ||
          formData.mqttCfgTopic !== 'No Value Provided' ||
          formData.mqttURI !== 'No Value Provided' ||
          formData.mqttTLS !== 'No Value Provided' ||
          formData.mqttIdleTimeout !== 'No Value Provided'
        ) {
          updatePromises.push(
            updateMqttConfig(relayId, {
              mqttPubTopic:
                formData.mqttPubTopic !== 'No Value Provided'
                  ? formData.mqttPubTopic
                  : undefined,
              mqttCfgTopic:
                formData.mqttCfgTopic !== 'No Value Provided'
                  ? formData.mqttCfgTopic
                  : undefined,
              mqttURI:
                formData.mqttURI !== 'No Value Provided'
                  ? formData.mqttURI
                  : undefined,
              mqttSecure:
                formData.mqttTLS !== 'No Value Provided'
                  ? parseInt(formData.mqttTLS)
                  : undefined,
              mqttIdleTimeS:
                formData.mqttIdleTimeout !== 'No Value Provided'
                  ? parseInt(formData.mqttIdleTimeout)
                  : undefined,
            })
          );
        }
      }

      // Execute updates for the current section
      if (updatePromises.length > 0) {
        console.warn(
          `📡 [PAGE] Sending ${updatePromises.length} configuration updates for ${editingSection} section to relayId: ${relayId}`
        );
        await Promise.all(updatePromises);
        toast.success(
          `${editingSection?.toUpperCase()} configuration update sent successfully!`
        );

        // Don't immediately refresh - let the SMIB device process the update
        // The SSE stream will receive the updated values when the SMIB responds
        console.warn(
          `📡 [PAGE] Configuration updates sent. Waiting for SMIB device to process and respond...`
        );

        // Optional: Add a delay and then request updated config
        setTimeout(async () => {
          console.warn(
            `📡 [PAGE] Requesting updated configuration after delay...`
          );
          try {
            await Promise.all([
              requestLiveConfig(relayId, 'net'),
              requestLiveConfig(relayId, 'mqtt'),
              requestLiveConfig(relayId, 'coms'),
            ]);
          } catch (error) {
            console.error('Error requesting updated config:', error);
          }
        }, 3000); // Wait 3 seconds for SMIB to process
      } else {
        toast.info('No configuration changes detected');
      }
    } catch (error) {
      console.error('Error updating SMIB configuration:', error);
      toast.error('Failed to update SMIB configuration');
    }
  };

  // 0. FIRST: Show "No Licensee Assigned" message for non-admin users without licensees
  if (showNoLicenseeMessage) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        showToaster={false}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  // 1. SECOND: If initial loading (no cabinet data yet), show skeleton loaders
  if (!cabinet && !error) {
    return (
      <CabinetDetailsLoadingState
        selectedLicencee={selectedLicencee}
        setSelectedLicencee={setSelectedLicencee}
        error={error}
      />
    );
  }

  // 2. SECOND: If there was an error, show appropriate error component
  if (error) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        showToaster={false}
      >
        {/* Back button */}
        <div className="mb-2 mt-4">
          <Button
            onClick={handleBackToCabinets}
            variant="outline"
            className="flex items-center border-buttonActive bg-container text-buttonActive transition-colors duration-300 hover:bg-buttonActive hover:text-container"
            size="sm"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Cabinets
          </Button>
        </div>

        {/* Error Component */}
        {errorType === 'unauthorized' ? (
          <UnauthorizedError
            title="Access Denied"
            message="You are not authorized to view details for this cabinet."
            resourceType="cabinet"
            onGoBack={handleBackToCabinets}
            customBackText="Back to Cabinets"
          />
        ) : errorType === 'not-found' ? (
          <NotFoundError
            title="Cabinet Not Found"
            message={`The cabinet "${slug}" could not be found. It may have been deleted or moved.`}
            resourceType="cabinet"
            onRetry={fetchCabinetDetailsData}
            onGoBack={handleBackToCabinets}
          />
        ) : errorType === 'network' ? (
          <NetworkError
            title="Connection Error"
            message="Unable to load cabinet details. Please check your connection and try again."
            onRetry={fetchCabinetDetailsData}
            isRetrying={refreshing}
            errorDetails={error}
          />
        ) : (
          <NetworkError
            title="Error Loading Cabinet"
            message="An unexpected error occurred while loading the cabinet details."
            onRetry={fetchCabinetDetailsData}
            isRetrying={refreshing}
            errorDetails={error}
          />
        )}
      </PageLayout>
    );
  }

  // Main return statement should be here, AFTER all conditional returns
  return (
    <>
      <EditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <DeleteCabinetModal />

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        showToaster={false}
      >
        {/* Back button */}
        {hasMounted ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-2 mt-4"
          >
            <Button
              onClick={handleBackToCabinets}
              variant="outline"
              className="flex items-center border-buttonActive bg-container text-buttonActive transition-colors duration-300 hover:bg-buttonActive hover:text-container"
              size="sm"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Cabinets
            </Button>
          </motion.div>
        ) : (
          <div className="mb-2 mt-4">
            <Button
              onClick={handleBackToCabinets}
              variant="outline"
              className="flex items-center border-buttonActive bg-container text-buttonActive transition-colors duration-300 hover:bg-buttonActive hover:text-container"
              size="sm"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Cabinets
            </Button>
          </div>
        )}

        {/* Cabinet Info Header */}
        {hasMounted ? (
          <motion.div
            className="relative mb-6 mt-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col justify-between md:flex-row md:items-center">
              <div className="mb-4 md:mb-0">
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  <Image
                    src={IMAGES.cabinetsIcon}
                    alt="Cabinet Icon"
                    width={32}
                    height={32}
                    className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
                  />
                  Name: {cabinet ? getSerialNumberIdentifier(cabinet) : 'GMID1'}
                  <motion.button
                    className="ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (cabinet) {
                        openEditModal(cabinet);
                      }
                    }}
                  >
                    <Pencil2Icon className="h-5 w-5 text-button" />
                  </motion.button>
                </h1>
                {/* Show deleted status if cabinet has deletedAt field and it's greater than year 2020 */}
                {cabinet?.deletedAt &&
                  new Date(cabinet.deletedAt).getFullYear() > 2020 && (
                    <div className="mb-2 mt-2">
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                        <span className="mr-2 h-2 w-2 rounded-full bg-red-400"></span>
                        DELETED -{' '}
                        {new Date(cabinet.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                <p className="mt-2 text-grayHighlight">
                  Manufacturer:{' '}
                  {cabinet?.gameConfig?.theoreticalRtp
                    ? 'Some Manufacturer'
                    : 'None'}
                </p>
                <p className="mt-1 text-grayHighlight">
                  Game Type: {cabinet?.gameType || 'None'}
                </p>
                <p className="mt-1">
                  <span className="text-button">
                    {locationName === 'Location Not Found' ? (
                      <span className="text-orange-600">
                        Location Not Found
                      </span>
                    ) : locationName === 'No Location Assigned' ? (
                      <span className="text-gray-500">
                        No Location Assigned
                      </span>
                    ) : (
                      locationName || 'Unknown Location'
                    )}
                  </span>
                  <span className="text-grayHighlight">
                    ,{' '}
                    {selectedLicencee === 'TTG'
                      ? 'Trinidad and Tobago'
                      : selectedLicencee === 'Cabanada'
                        ? 'Guyana'
                        : selectedLicencee === 'Barbados'
                          ? 'Barbados'
                          : 'Trinidad and Tobago'}
                  </span>
                </p>
              </div>

              {/* Only render this on client side to avoid hydration mismatch */}
              {isClient && (
                <div className="mt-2 flex items-center gap-2 md:absolute md:right-0 md:top-0 md:mt-0">
                  <motion.div
                    className="flex items-center rounded-lg border bg-container px-3 py-1.5 shadow-sm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className={`mr-2 h-2.5 w-2.5 rounded-full ${
                        isOnline ? 'bg-button' : 'bg-destructive'
                      }`}
                      animate={
                        isOnline
                          ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
                          : { scale: 1, opacity: 1 }
                      }
                      transition={
                        isOnline
                          ? { repeat: Infinity, duration: 2 }
                          : { duration: 0.3 }
                      }
                    ></motion.div>
                    <span
                      className={`text-sm font-semibold ${
                        isOnline ? 'text-button' : 'text-destructive'
                      }`}
                    >
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </motion.div>
                  <RefreshButton
                    onClick={handleRefresh}
                    isSyncing={refreshing}
                    label="Refresh"
                  />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="relative mb-6 mt-6">
            <div className="flex flex-col justify-between md:flex-row md:items-center">
              <div className="mb-4 md:mb-0">
                <h1 className="flex items-center text-2xl font-bold">
                  Name: {cabinet ? getSerialNumberIdentifier(cabinet) : 'GMID1'}
                </h1>
                {/* Show deleted status if cabinet has deletedAt field and it's greater than year 2020 */}
                {cabinet?.deletedAt &&
                  new Date(cabinet.deletedAt).getFullYear() > 2020 && (
                    <div className="mb-2 mt-2">
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                        <span className="mr-2 h-2 w-2 rounded-full bg-red-400"></span>
                        DELETED -{' '}
                        {new Date(cabinet.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                <p className="mt-2 text-grayHighlight">
                  Manufacturer:{' '}
                  {cabinet?.gameConfig?.theoreticalRtp
                    ? 'Some Manufacturer'
                    : 'None'}
                </p>
                <p className="mt-1 text-grayHighlight">
                  Game Type: {cabinet?.gameType || 'None'}
                </p>
                <p className="mt-1">
                  <span className="text-button">
                    {locationName === 'Location Not Found' ? (
                      <span className="text-orange-600">
                        Location Not Found
                      </span>
                    ) : locationName === 'No Location Assigned' ? (
                      <span className="text-gray-500">
                        No Location Assigned
                      </span>
                    ) : (
                      locationName || 'Unknown Location'
                    )}
                  </span>
                  <span className="text-grayHighlight">
                    ,{' '}
                    {selectedLicencee === 'TTG'
                      ? 'Trinidad and Tobago'
                      : selectedLicencee === 'Cabanada'
                        ? 'Guyana'
                        : selectedLicencee === 'Barbados'
                          ? 'Barbados'
                          : 'Trinidad and Tobago'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SMIB Configuration */}
        {hasMounted ? (
          <motion.div
            className="mt-4 rounded-lg bg-container shadow-md shadow-purple-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold sm:text-xl">
                  SMIB Configuration
                </h2>
                {/* SMIB Connection Status - only show after user clicks Get SMIB Configuration */}
                {hasConfigBeenFetched && (
                  <>
                    {isManuallyFetching ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            isConnectedToMqtt
                              ? 'animate-pulse bg-green-500'
                              : 'bg-red-500'
                          }`}
                        ></div>
                        <span
                          className={`text-sm font-medium ${
                            isConnectedToMqtt
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {isConnectedToMqtt ? 'SMIB Online' : 'SMIB Offline'}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {smibConfigExpanded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-2"
                  >
                    {isEditMode ? (
                      <>
                        <Button
                          onClick={resetFormData}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => await handleSaveSMIBConfig()}
                          variant="outline"
                          size="sm"
                          className="h-8 bg-button px-3 text-xs text-container hover:bg-buttonActive"
                        >
                          Save All
                        </Button>
                      </>
                    ) : null}
                  </motion.div>
                )}
              </div>
              <div className="flex w-full items-center justify-end sm:w-auto">
                {hasConfigBeenFetched ? (
                  <motion.div
                    className="cursor-pointer"
                    animate={{ rotate: smibConfigExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={toggleSmibConfig}
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </motion.div>
                ) : (
                  // Only show button if user has permission (Developer, Admin, or Technician)
                  canAccessSmibConfig && (
                    <Button
                      onClick={() =>
                        cabinet && fetchSmibConfiguration(cabinet.relayId)
                      }
                      disabled={isManuallyFetching}
                      className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4 sm:text-sm"
                    >
                      {isManuallyFetching ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          <span className="hidden sm:inline">Fetching...</span>
                          <span className="sm:hidden">Loading...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">
                            Get SMIB Configuration
                          </span>
                          <span className="sm:hidden">Get SMIB Config</span>
                        </>
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>

            <motion.div
              className="px-4 pb-2 sm:px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Show skeleton loader while fetching */}
              {isManuallyFetching ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                  </div>
                  <div className="space-y-2 sm:text-right">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 sm:ml-auto"></div>
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 sm:ml-auto"></div>
                  </div>
                </div>
              ) : (
                /* Responsive grid for SMIB details */
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <p className="text-xs text-grayHighlight sm:text-sm">
                      <span className="font-medium">SMIB ID:</span>{' '}
                      {cabinet?.relayId ||
                        cabinet?.smibBoard ||
                        'No Value Provided'}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-grayHighlight sm:text-sm">
                      <span className="font-medium">Communication Mode:</span>{' '}
                      {cabinet?.smibConfig?.coms?.comsMode ?? 'undefined'}
                    </p>
                    <p className="mt-1 text-xs text-grayHighlight sm:mt-0 sm:text-sm">
                      <span className="font-medium">Running firmware:</span>{' '}
                      {mqttConfigData?.firmwareVersion || 'No Value Provided'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Expanded Configuration Section */}
            <AnimatePresence>
              {smibConfigExpanded && (
                <motion.div
                  ref={configSectionRef}
                  className="space-y-6 overflow-hidden border-t border-gray-200 px-4 pb-6 pt-4 sm:px-6"
                  variants={configContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <TooltipProvider delayDuration={100}>
                    {/* Firmware Update - Temporarily commented out */}
                    {/* <motion.div variants={itemVariants}>
                      <h3 className="mb-2 font-medium text-foreground">
                        Firmware Update
                      </h3>
                      <div className="flex items-center gap-2">
                        <select
                          className={`flex-1 rounded border border-border p-2 ${
                            isEditMode
                              ? 'cursor-pointer bg-background text-foreground'
                              : 'cursor-not-allowed bg-gray-100 text-gray-500'
                          }`}
                          value={
                            isEditMode
                              ? formData.firmwareVersion
                              : firmwareVersion
                          }
                          disabled={!isEditMode}
                          onChange={e =>
                            updateFormData('firmwareVersion', e.target.value)
                          }
                        >
                          <option value="Cloudy v1.0">Cloudy v1.0</option>
                          <option value="Cloudy v1.0.4">Cloudy v1.0.4</option>
                          <option value="Cloudy v1.0.4.1">
                            Cloudy v1.0.4.1
                          </option>
                        </select>
                        {isEditMode && (
                          <Button
                            onClick={async () => await handleSaveSMIBConfig()}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE
                          </Button>
                        )}
                      </div>
                    </motion.div> */}

                    {/* Machine Control Buttons - Temporarily commented out */}
                    {/* <motion.div
                      variants={itemVariants}
                      className="flex flex-wrap gap-2 md:gap-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full border-lighterBlueHighlight text-lighterBlueHighlight hover:bg-accent md:w-auto"
                          onClick={async () =>
                            await handleSaveSMIBConfig('RESTART')
                          }
                          disabled={!isEditMode}
                        >
                          RESTART
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full border-orangeHighlight text-orangeHighlight hover:bg-accent md:w-auto"
                          onClick={async () =>
                            await handleSaveSMIBConfig('UNLOCK MACHINE')
                          }
                          disabled={!isEditMode}
                        >
                          UNLOCK MACHINE
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full border-destructive text-destructive hover:bg-accent md:w-auto"
                          onClick={async () =>
                            await handleSaveSMIBConfig('LOCK MACHINE')
                          }
                          disabled={!isEditMode}
                        >
                          LOCK MACHINE
                        </Button>
                      </motion.div>
                    </motion.div> */}

                    {/* Apply to all checkbox - Temporarily commented out */}
                    {/* <motion.div
                      variants={itemVariants}
                      className="flex items-center"
                    >
                      <Tooltip delayDuration={50}>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <input
                              type="checkbox"
                              id="applyToAll"
                              className="mr-2 cursor-not-allowed opacity-50"
                              disabled
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Under maintenance</p>
                        </TooltipContent>
                      </Tooltip>
                      <label htmlFor="applyToAll" className="ml-2 text-sm">
                        Apply to all SMIBs at this location (
                        {cabinet?.locationName || 'Unknown Location'})
                      </label>
                    </motion.div> */}

                    {/* Network/WiFi Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-medium text-foreground">
                            Network/WiFi
                          </h3>
                          <div className="text-xs text-gray-500">
                            Last configured:{' '}
                            {cabinet?.smibConfig?.net?.updatedAt
                              ? format(
                                  new Date(cabinet.smibConfig.net.updatedAt),
                                  'MMM do yyyy h:mm a'
                                )
                              : 'Unknown'}
                          </div>
                        </div>
                        {editingSection === 'network' ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditingSection(null)}
                              variant="outline"
                              size="sm"
                              className="border-gray-300"
                            >
                              <Cross2Icon className="h-4 w-4 md:hidden" />
                              <span className="hidden md:inline">CANCEL</span>
                            </Button>
                            <Button
                              onClick={async () => {
                                await handleSaveSMIBConfig();
                                setEditingSection(null);
                              }}
                              className="bg-button text-container hover:bg-buttonActive"
                              size="sm"
                            >
                              <Check className="h-4 w-4 lg:hidden" />
                              <span className="hidden lg:inline">
                                SAVE NETWORK
                              </span>
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Pencil
                              onClick={() => setEditingSection('network')}
                              className="h-5 w-5 cursor-pointer text-green-500 lg:hidden"
                            />
                            <Button
                              onClick={() => setEditingSection('network')}
                              className="hidden bg-button text-container hover:bg-buttonActive lg:inline-flex"
                              size="sm"
                            >
                              EDIT NETWORK
                            </Button>
                          </>
                        )}
                      </div>
                      {isManuallyFetching ? (
                        /* Skeleton loader while fetching */
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                            <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                            <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                            <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-grayHighlight">
                              Network Name{isConnectedToMqtt ? ' (live)' : ''}:
                            </label>
                            {editingSection === 'network' ? (
                              <input
                                type="text"
                                value={formData.networkSSID}
                                onChange={e =>
                                  updateFormData('networkSSID', e.target.value)
                                }
                                className="w-full rounded border border-border bg-background p-2 text-foreground"
                                placeholder="Enter network name"
                              />
                            ) : (
                              <div className="truncate text-sm">
                                {formData.networkSSID ||
                                  cabinet?.smibConfig?.net?.netStaSSID ||
                                  'No Value Provided'}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-grayHighlight">
                              Password{isConnectedToMqtt ? ' (live)' : ''}:
                            </label>
                            {editingSection === 'network' ? (
                              <input
                                type="password"
                                value={formData.networkPassword}
                                onChange={e =>
                                  updateFormData(
                                    'networkPassword',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-border bg-background p-2 text-foreground"
                                placeholder="Enter network password"
                              />
                            ) : (
                              <div className="text-sm">
                                {formData.networkPassword ||
                                  cabinet?.smibConfig?.net?.netStaPwd ||
                                  'No Value Provided'}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-grayHighlight">
                              Channel{isConnectedToMqtt ? ' (live)' : ''}:
                            </label>
                            {editingSection === 'network' ? (
                              <input
                                type="number"
                                value={formData.networkChannel}
                                onChange={e =>
                                  updateFormData(
                                    'networkChannel',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-border bg-background p-2 text-foreground"
                                placeholder="Enter channel"
                                min="1"
                                max="11"
                              />
                            ) : (
                              <div className="text-sm">
                                {formData.networkChannel ||
                                  cabinet?.smibConfig?.net?.netStaChan ||
                                  'No Value Provided'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* COMS and MQTT Grid - Side by Side */}
                    <div className="grid grid-cols-1 gap-6 border-t border-border pt-6 lg:grid-cols-2">
                      {/* COMS Section */}
                      <motion.div variants={itemVariants}>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <h3 className="font-medium text-foreground">
                              COMS
                            </h3>
                            <div className="text-xs text-gray-500">
                              Last configured:{' '}
                              {cabinet?.smibConfig?.coms?.updatedAt
                                ? format(
                                    new Date(cabinet.smibConfig.coms.updatedAt),
                                    'MMM do yyyy h:mm a'
                                  )
                                : 'Unknown'}
                            </div>
                          </div>
                          {editingSection === 'coms' ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingSection(null)}
                                variant="outline"
                                size="sm"
                                className="border-gray-300"
                              >
                                <Cross2Icon className="h-4 w-4 md:hidden" />
                                <span className="hidden md:inline">CANCEL</span>
                              </Button>
                              <Button
                                onClick={async () => {
                                  await handleSaveSMIBConfig();
                                  setEditingSection(null);
                                }}
                                className="bg-button text-container hover:bg-buttonActive"
                                size="sm"
                              >
                                <Check className="h-4 w-4 lg:hidden" />
                                <span className="hidden lg:inline">
                                  SAVE COMS
                                </span>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Pencil
                                onClick={() => setEditingSection('coms')}
                                className="h-5 w-5 cursor-pointer text-green-500 lg:hidden"
                              />
                              <Button
                                onClick={() => setEditingSection('coms')}
                                className="hidden bg-button text-container hover:bg-buttonActive lg:inline-flex"
                                size="sm"
                              >
                                EDIT COMS
                              </Button>
                            </>
                          )}
                        </div>
                        {isManuallyFetching ? (
                          /* Skeleton loader while fetching */
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                              <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                              <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                              <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                              <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                Address:
                              </label>
                              {editingSection === 'coms' ? (
                                <input
                                  type="text"
                                  value={formData.comsAddr || ''}
                                  onChange={e =>
                                    updateFormData('comsAddr', e.target.value)
                                  }
                                  className="w-full rounded border border-border bg-background p-2 text-foreground"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsAddr ||
                                    cabinet?.smibConfig?.coms?.comsAddr ||
                                    'No Value Provided'}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                Polling Rate:
                              </label>
                              {editingSection === 'coms' ? (
                                <input
                                  type="text"
                                  value={formData.comsRateMs || ''}
                                  onChange={e =>
                                    updateFormData('comsRateMs', e.target.value)
                                  }
                                  className="w-full rounded border border-border bg-background p-2 text-foreground"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsRateMs ||
                                    cabinet?.smibConfig?.coms?.comsRateMs ||
                                    'No Value Provided'}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                RTE:
                              </label>
                              {editingSection === 'coms' ? (
                                <select
                                  value={formData.comsRTE || '0'}
                                  onChange={e =>
                                    updateFormData('comsRTE', e.target.value)
                                  }
                                  className="w-full rounded border border-border bg-background p-2 text-foreground"
                                >
                                  <option value="0">Disabled</option>
                                  <option value="1">Enabled</option>
                                </select>
                              ) : (
                                <div className="text-sm">
                                  {formData.comsRTE === '1'
                                    ? 'Enabled'
                                    : formData.comsRTE === '0' ||
                                        cabinet?.smibConfig?.coms?.comsRTE === 0
                                      ? 'Disabled'
                                      : cabinet?.smibConfig?.coms?.comsRTE === 1
                                        ? 'Enabled'
                                        : 'No Value Provided'}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                GPC:
                              </label>
                              {editingSection === 'coms' ? (
                                <input
                                  type="text"
                                  value={formData.comsGPC || ''}
                                  onChange={e =>
                                    updateFormData('comsGPC', e.target.value)
                                  }
                                  className="w-full rounded border border-border bg-background p-2 text-foreground"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsGPC ||
                                    cabinet?.smibConfig?.coms?.comsGPC ||
                                    'No Value Provided'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>

                      {/* MQTT Section */}
                      <motion.div variants={itemVariants}>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <h3 className="font-medium text-foreground">
                              MQTT
                            </h3>
                            <div className="text-xs text-gray-500">
                              Last configured:{' '}
                              {cabinet?.smibConfig?.mqtt?.updatedAt
                                ? format(
                                    new Date(cabinet.smibConfig.mqtt.updatedAt),
                                    'MMM do yyyy h:mm a'
                                  )
                                : 'Unknown'}
                            </div>
                          </div>
                          {editingSection === 'mqtt' ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingSection(null)}
                                variant="outline"
                                size="sm"
                                className="border-gray-300"
                              >
                                <Cross2Icon className="h-4 w-4 md:hidden" />
                                <span className="hidden md:inline">CANCEL</span>
                              </Button>
                              <Button
                                onClick={async () => {
                                  await handleSaveSMIBConfig();
                                  setEditingSection(null);
                                }}
                                className="bg-button text-container hover:bg-buttonActive"
                                size="sm"
                              >
                                <Check className="h-4 w-4 lg:hidden" />
                                <span className="hidden lg:inline">
                                  SAVE MQTT
                                </span>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Pencil
                                onClick={() => setEditingSection('mqtt')}
                                className="h-5 w-5 cursor-pointer text-green-500 lg:hidden"
                              />
                              <Button
                                onClick={() => setEditingSection('mqtt')}
                                className="hidden bg-button text-container hover:bg-buttonActive lg:inline-flex"
                                size="sm"
                              >
                                EDIT MQTT
                              </Button>
                            </>
                          )}
                        </div>
                        {isManuallyFetching ? (
                          /* Skeleton loader while fetching */
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                              <div className="mb-2 h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <div className="h-4 w-36 animate-pulse rounded bg-gray-200"></div>
                                  <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                                  <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                                  <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="mb-2 h-4 w-36 animate-pulse rounded bg-gray-200"></div>
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                                  <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200"></div>
                                  <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                              <h4 className="mb-2 text-sm font-medium">
                                Topic Configuration
                              </h4>
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-grayHighlight">
                                    MQTT Public Topic:
                                  </label>
                                  {editingSection === 'mqtt' ? (
                                    <input
                                      type="text"
                                      value={formData.mqttPubTopic || ''}
                                      onChange={e =>
                                        updateFormData(
                                          'mqttPubTopic',
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-border bg-background p-2 text-foreground"
                                      placeholder="sas/gy/server"
                                    />
                                  ) : (
                                    <div className="text-sm">
                                      {formData.mqttPubTopic ||
                                        cabinet?.smibConfig?.mqtt
                                          ?.mqttPubTopic ||
                                        'No Value Provided'}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-grayHighlight">
                                    MQTT Config Topic:
                                  </label>
                                  {editingSection === 'mqtt' ? (
                                    <input
                                      type="text"
                                      value={formData.mqttCfgTopic || ''}
                                      onChange={e =>
                                        updateFormData(
                                          'mqttCfgTopic',
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-border bg-background p-2 text-foreground"
                                      placeholder="smib/config"
                                    />
                                  ) : (
                                    <div className="text-sm">
                                      {formData.mqttCfgTopic ||
                                        cabinet?.smibConfig?.mqtt
                                          ?.mqttCfgTopic ||
                                        'No Value Provided'}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-grayHighlight">
                                    MQTT URI:
                                  </label>
                                  {editingSection === 'mqtt' ? (
                                    <input
                                      type="text"
                                      value={formData.mqttURI || ''}
                                      onChange={e =>
                                        updateFormData(
                                          'mqttURI',
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-border bg-background p-2 text-foreground"
                                      placeholder="mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883"
                                    />
                                  ) : (
                                    <div className="text-sm">
                                      {formData.mqttURI ||
                                        cabinet?.smibConfig?.mqtt?.mqttURI ||
                                        'No Value Provided'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="mb-2 text-sm font-medium">
                                Additional Settings
                              </h4>
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-grayHighlight">
                                    QOS:
                                  </label>
                                  {editingSection === 'mqtt' ? (
                                    <select
                                      value={formData.mqttTLS || '2'}
                                      onChange={e =>
                                        updateFormData(
                                          'mqttTLS',
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-border bg-background p-2 text-foreground"
                                    >
                                      <option value="0">
                                        0 - At most once
                                      </option>
                                      <option value="1">
                                        1 - At least once
                                      </option>
                                      <option value="2">
                                        2 - Exactly once
                                      </option>
                                    </select>
                                  ) : (
                                    <div className="text-sm">
                                      {formData.mqttTLS === '0'
                                        ? '0 - At most once'
                                        : formData.mqttTLS === '1'
                                          ? '1 - At least once'
                                          : formData.mqttTLS === '2'
                                            ? '2 - Exactly once'
                                            : cabinet?.smibConfig?.mqtt
                                                  ?.mqttQOS === 0
                                              ? '0 - At most once'
                                              : cabinet?.smibConfig?.mqtt
                                                    ?.mqttQOS === 1
                                                ? '1 - At least once'
                                                : cabinet?.smibConfig?.mqtt
                                                      ?.mqttQOS === 2
                                                  ? '2 - Exactly once'
                                                  : formData.mqttTLS ||
                                                    'No Value Provided'}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-grayHighlight">
                                    Idle Timeout (s):
                                  </label>
                                  {editingSection === 'mqtt' ? (
                                    <input
                                      type="number"
                                      value={formData.mqttIdleTimeout || ''}
                                      onChange={e =>
                                        updateFormData(
                                          'mqttIdleTimeout',
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-border bg-background p-2 text-foreground"
                                      placeholder="30"
                                    />
                                  ) : (
                                    <div className="text-sm">
                                      {formData.mqttIdleTimeout ||
                                        cabinet?.smibConfig?.mqtt
                                          ?.mqttIdleTimeS ||
                                        'No Value Provided'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* Additional SMIB Management Features */}
                    <div className="mt-8 space-y-6 border-t border-border pt-6">
                      <h3 className="text-xl font-bold text-gray-800">
                        SMIB Operations & Management
                      </h3>

                      {/* Operations Grid - Horizontal layout on large screens */}
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Left Column */}
                        <div className="space-y-6">
                          <RestartSection
                            relayId={
                              cabinet?.relayId || cabinet?.smibBoard || null
                            }
                            isOnline={isConnectedToMqtt}
                            onRefreshData={async () => {
                              if (!cabinet?.relayId) {
                                console.error(
                                  '❌ [CABINET DETAILS] No relayId available!'
                                );
                                return;
                              }

                              console.log(
                                '🔄 [CABINET DETAILS] Refreshing SMIB data after restart...'
                              );

                              // 1. Refresh cabinet data from database
                              console.log(
                                '📊 [CABINET DETAILS] Refreshing cabinet data...'
                              );
                              await fetchCabinetDetailsData();

                              // 2. Wait for SMIB to fully restart and reconnect to MQTT
                              console.log(
                                '⏱️ [CABINET DETAILS] Waiting for SMIB to reconnect...'
                              );
                              await new Promise(resolve =>
                                setTimeout(resolve, 2000)
                              );

                              // 3. Re-request live config from SMIB (keeping SSE connection alive)
                              console.log(
                                '📡 [CABINET DETAILS] Re-requesting live config...'
                              );
                              try {
                                await Promise.all([
                                  requestLiveConfig(cabinet.relayId, 'mqtt'),
                                  requestLiveConfig(cabinet.relayId, 'net'),
                                  requestLiveConfig(cabinet.relayId, 'coms'),
                                ]);
                                console.log(
                                  '✅ [CABINET DETAILS] Config requests sent'
                                );
                              } catch (err) {
                                console.error(
                                  '❌ [CABINET DETAILS] Failed to request config:',
                                  err
                                );
                              }
                            }}
                          />
                          <MeterDataSection
                            relayId={
                              cabinet?.relayId || cabinet?.smibBoard || null
                            }
                            isOnline={isConnectedToMqtt}
                          />
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                          <OTAUpdateSection
                            relayId={
                              cabinet?.relayId || cabinet?.smibBoard || null
                            }
                            isOnline={isConnectedToMqtt}
                            firmwareUpdatedAt={
                              cabinet?.smibConfig?.ota?.firmwareUpdatedAt
                            }
                            onUpdateComplete={fetchCabinetDetailsData}
                          />
                        </div>
                      </div>
                    </div>
                  </TooltipProvider>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="mt-4 rounded-lg bg-container shadow-md shadow-purple-200">
            {/* Static version of the SMIB Configuration content - make responsive */}
            <div className="flex cursor-pointer items-center justify-between px-6 py-4">
              <h2 className="text-xl font-semibold">SMIB Configuration</h2>
              <div>
                <ChevronDownIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="px-6 pb-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:justify-between md:gap-4">
                <div>
                  <p className="text-sm text-grayHighlight">
                    SMIB ID: {mqttConfigData?.smibId || 'No Value Provided'}
                  </p>
                  <p className="mt-1 text-xs text-yellow-500">
                    ⚠️ Device is online but not responding to configuration
                    requests. Check SMIB device settings to enable config
                    responses.
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-sm text-grayHighlight">
                    Communication Mode:{' '}
                    {cabinet?.smibConfig?.coms?.comsMode ?? 'undefined'}
                  </p>
                  <p className="mt-1 text-sm text-grayHighlight md:mt-0">
                    Running firmware{' '}
                    {mqttConfigData?.firmwareVersion || 'No Value Provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Filters */}
        {hasMounted ? (
          <motion.div
            className="mb-4 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <DashboardDateFilters
              hideAllTime={false}
              onCustomRangeGo={fetchCabinetDetailsData}
              enableTimeInputs={true}
            />
          </motion.div>
        ) : (
          <div className="mb-4 mt-4">
            <DashboardDateFilters
              hideAllTime={false}
              onCustomRangeGo={fetchCabinetDetailsData}
              enableTimeInputs={true}
            />
          </div>
        )}

        {/* Horizontal Slider for Mobile and Tablet - visible below lg */}
        <div className="custom-scrollbar mb-2 mt-4 w-full touch-pan-x overflow-x-auto rounded-md p-2 pb-4 lg:hidden">
          <div className="flex min-w-max space-x-2 px-1 pb-1">
            {[
              'Metrics',
              'Live Metrics',
              'Bill Validator',
              'Activity Log',
              'Collection History',
              'Collection Settings',
            ].map(tab => (
              <Button
                key={tab}
                className={`whitespace-nowrap px-4 py-2 ${
                  activeMetricsTabContent ===
                  (tab === 'Metrics' ? 'Range Metrics' : tab)
                    ? 'bg-buttonActive text-container'
                    : 'bg-muted text-grayHighlight'
                }`}
                onClick={() =>
                  handleTabChange(tab === 'Metrics' ? 'Range Metrics' : tab)
                }
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {/* Accounting Details with Sidebar Menu */}
        {cabinet ? (
          <AccountingDetails
            cabinet={cabinet}
            loading={metricsLoading}
            activeMetricsTabContent={activeMetricsTabContent}
            disableCurrencyConversion={true}
            setActiveMetricsTabContent={handleTabChange}
            onDataRefresh={fetchCabinetDetailsData}
          />
        ) : null}

        {/* Floating Refresh Button */}
        <AnimatePresence>
          {showFloatingRefresh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <motion.button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-full bg-button p-3 text-container shadow-lg transition-colors duration-200 hover:bg-buttonActive disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw
                  className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`}
                />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </PageLayout>
    </>
  );
}

export default function CabinetDetailPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <CabinetDetailPageContent />
    </ProtectedRoute>
  );
}