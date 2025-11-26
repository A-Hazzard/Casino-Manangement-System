/**
 * Machine Detail Page
 *
 * Displays detailed information about a specific machine/cabinet.
 * This page is similar to the cabinet detail page but accessed via /machines route.
 *
 * Features:
 * - Machine information display
 * - SMIB configuration and management
 * - Accounting details
 * - Meter data section
 * - OTA update section
 * - Restart section
 * - Role-based access control
 * - Responsive design for mobile and desktop
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { Button } from '@/components/ui/button';
import { useCabinetDetailsData, useSmibConfiguration } from '@/lib/hooks/data';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  Pencil2Icon,
} from '@radix-ui/react-icons';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import gsap from 'gsap';
import RefreshButton from '@/components/ui/RefreshButton';
import { RefreshCw } from 'lucide-react';
import AccountingDetails from '@/components/cabinetDetails/AccountingDetails';
import { NotFoundError, NetworkError, UnauthorizedError } from '@/components/ui/errors';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Extracted skeleton and error components
import { CabinetDetailsLoadingState } from '@/components/ui/skeletons/CabinetDetailSkeletons';

// ============================================================================
// Animation Variants
// ============================================================================
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

// ============================================================================
// Custom Hooks
// ============================================================================
/**
 * Custom hook to safely handle client-side animations
 * Prevents hydration mismatches by only enabling animations after mount
 */
function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

// ============================================================================
// Page Components
// ============================================================================
/**
 * Machine Detail Page Content Component
 * Handles all state management and data fetching for the machine detail page
 */
function CabinetDetailPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = pathname.split('/').pop() || '';
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const { openEditModal } = useCabinetActionsStore();
  const hasMounted = useHasMounted();

  // ============================================================================
  // State Management
  // ============================================================================
  const [isClient, setIsClient] = useState(false);
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);

  // ============================================================================
  // Effects - Initialization
  // ============================================================================
  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter && !dateFilterInitialized) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter, dateFilterInitialized]);

  // ============================================================================
  // Custom Hooks - Data Management
  // ============================================================================
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
    communicationMode,
    firmwareVersion,
    isEditMode,
    formData,
    toggleSmibConfig,
    setEditMode,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
    updateFormData,
    resetFormData,
    saveConfiguration,
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
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

  // Update SMIB configuration when cabinet data changes
  useEffect(() => {
    if (cabinet) {
      setCommunicationModeFromData(cabinet);
      setFirmwareVersionFromData(cabinet);
    }
  }, [cabinet, setCommunicationModeFromData, setFirmwareVersionFromData]);

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

  // Add animation hook for data changes
  useEffect(() => {
    // Only run in browser environment
    if (typeof document === 'undefined' || !cabinet) return;

    // Animate table rows or cards when data changes
    // Table animation for any tables in the component
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const tableRows = table.querySelectorAll('tbody tr');
      gsap.fromTo(
        tableRows,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
        }
      );
    });

    // Card animation for any card containers
    const cardContainers = document.querySelectorAll('.card-container');
    cardContainers.forEach(container => {
      const cards = Array.from(container.children);
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.95, y: 15 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.08,
          ease: 'back.out(1.5)',
        }
      );
    });
  }, [cabinet]);

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
  const handleSaveSMIBConfig = async () => {
    if (!cabinet) return;

    const success = await saveConfiguration(cabinet._id);
    if (success) {
      // Refresh cabinet data to show updated configuration
      await fetchCabinetDetailsData();
    }
  };

  // ============================================================================
  // Early Returns
  // ============================================================================
  // If initial loading (no cabinet data yet), show skeleton loaders
  if (!cabinet && !error) {
    return (
      <CabinetDetailsLoadingState
        selectedLicencee={selectedLicencee}
        setSelectedLicencee={setSelectedLicencee}
        error={error}
      />
    );
  }

  // If there was an error, show appropriate error component
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
            message="You are not authorized to view details for this machine."
            resourceType="machine"
            onGoBack={handleBackToCabinets}
            customBackText="Back to Cabinets"
          />
        ) : errorType === 'not-found' ? (
          <NotFoundError
            title="Machine Not Found"
            message={`The machine "${slug}" could not be found. It may have been deleted or moved.`}
            resourceType="machine"
            onRetry={fetchCabinetDetailsData}
            onGoBack={handleBackToCabinets}
          />
        ) : errorType === 'network' ? (
          <NetworkError
            title="Connection Error"
            message="Unable to load machine details. Please check your connection and try again."
            onRetry={fetchCabinetDetailsData}
            isRetrying={refreshing}
            errorDetails={error}
          />
        ) : (
          <NetworkError
            title="Error Loading Machine"
            message="An unexpected error occurred while loading the machine details."
            onRetry={fetchCabinetDetailsData}
            isRetrying={refreshing}
            errorDetails={error}
          />
        )}
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
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
                <h1 className="flex items-center text-2xl font-bold">
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
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">SMIB Configuration</h2>
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
                          onClick={handleSaveSMIBConfig}
                          variant="outline"
                          size="sm"
                          className="h-8 bg-button px-3 text-xs text-container hover:bg-buttonActive"
                        >
                          Save All
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setEditMode(true)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        Edit
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
              <motion.div
                className="cursor-pointer"
                animate={{ rotate: smibConfigExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                onClick={toggleSmibConfig}
              >
                <ChevronDownIcon className="h-5 w-5" />
              </motion.div>
            </div>

            <motion.div
              className="px-6 pb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Responsive grid for SMIB details */}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:justify-between md:gap-4">
                <div>
                  <p className="text-sm text-grayHighlight">
                    SMIB ID:{' '}
                    {cabinet?.relayId || cabinet?.smibBoard || 'e831cdfa8464'}
                  </p>
                  <p className="mt-1 text-sm text-grayHighlight md:mt-0">
                    {' '}
                    {/* Adjust margin */}
                    Connected to WiFi network{' '}
                    {cabinet?.smibConfig?.net?.netStaSSID ||
                      'Dynamic 1 - Staff Wifi'}
                  </p>
                </div>
                <div className="md:text-right">
                  {' '}
                  {/* Align text right on medium screens and up */}
                  <p className="text-sm text-grayHighlight">
                    Communication Mode:{' '}
                    {cabinet?.smibConfig?.coms?.comsMode !== undefined
                      ? cabinet?.smibConfig?.coms?.comsMode === 0
                        ? 'sas'
                        : cabinet?.smibConfig?.coms?.comsMode === 1
                          ? 'non sas'
                          : 'IGT'
                      : 'undefined'}
                  </p>
                  <p className="mt-1 text-sm text-grayHighlight md:mt-0">
                    {' '}
                    {/* Adjust margin */}
                    Running firmware{' '}
                    {cabinet?.smibVersion?.firmware || 'FAC_v1-0-4(v1-0-4)'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Expanded Configuration Section */}
            <AnimatePresence>
              {smibConfigExpanded && (
                <motion.div
                  ref={configSectionRef}
                  className="space-y-6 overflow-hidden border-t border-gray-200 px-6 pb-6 pt-4"
                  variants={configContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <TooltipProvider delayDuration={100}>
                    {/* Communication Mode */}
                    <motion.div variants={itemVariants}>
                      <h3 className="mb-2 font-medium text-foreground">
                        Communication Mode
                      </h3>
                      <div className="flex items-center gap-2">
                        <select
                          className={`w-60 rounded border border-border p-2 ${
                            isEditMode
                              ? 'cursor-pointer bg-background text-foreground'
                              : 'cursor-not-allowed bg-gray-100 text-gray-500'
                          }`}
                          value={
                            isEditMode
                              ? formData.communicationMode
                              : communicationMode
                          }
                          disabled={!isEditMode}
                          onChange={e =>
                            updateFormData('communicationMode', e.target.value)
                          }
                        >
                          <option value="sas">sas</option>
                          <option value="non sas">non sas</option>
                          <option value="IGT">IGT</option>
                        </select>
                        {isEditMode && (
                          <Button
                            onClick={handleSaveSMIBConfig}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE
                          </Button>
                        )}
                        {!isEditMode && (
                          <Tooltip delayDuration={50}>
                            <TooltipTrigger asChild>
                              <Button
                                className="cursor-not-allowed bg-gray-400 text-gray-600"
                                disabled
                                size="sm"
                              >
                                UPDATE
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click Edit to enable updates</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </motion.div>

                    {/* Firmware Update */}
                    <motion.div variants={itemVariants}>
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
                            onClick={handleSaveSMIBConfig}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE
                          </Button>
                        )}
                        {!isEditMode && (
                          <Tooltip delayDuration={50}>
                            <TooltipTrigger asChild>
                              <Button
                                className="cursor-not-allowed bg-gray-400 text-gray-600"
                                disabled
                                size="sm"
                              >
                                UPDATE
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click Edit to enable updates</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </motion.div>

                    {/* Machine Control Buttons - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="flex flex-wrap gap-2 md:gap-4"
                    >
                      <Tooltip delayDuration={50}>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              className="w-full cursor-not-allowed border-gray-400 bg-gray-100 text-gray-500 md:w-auto"
                              disabled
                            >
                              RESTART
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Under maintenance</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={50}>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              className="w-full cursor-not-allowed border-gray-400 bg-gray-100 text-gray-500 md:w-auto"
                              disabled
                            >
                              UNLOCK MACHINE
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Under maintenance</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={50}>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              className="w-full cursor-not-allowed border-gray-400 bg-gray-100 text-gray-500 md:w-auto"
                              disabled
                            >
                              LOCK MACHINE
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Under maintenance</p>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>

                    {/* Apply to all checkbox */}
                    <motion.div
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
                      <input type="checkbox" id="applyToAll" className="mr-2" />
                      <label htmlFor="applyToAll" className="text-sm">
                        Apply to all SMIBs at this location (
                        {cabinet?.locationName || 'Unknown Location'})
                      </label>
                    </motion.div>

                    {/* Network/WiFi Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-medium text-foreground">
                          Network/WiFi
                        </h3>
                        {isEditMode && (
                          <Button
                            onClick={handleSaveSMIBConfig}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE NETWORK
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-grayHighlight">
                            Network Name:
                          </label>
                          {isEditMode ? (
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
                              {cabinet?.smibConfig?.net?.netStaSSID ||
                                'Dynamic 1 - Staff Wifi'}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-grayHighlight">
                            Password:
                          </label>
                          {isEditMode ? (
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
                              {cabinet?.smibConfig?.net?.netStaPwd ||
                                'wordsapp!23'}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-grayHighlight">
                            Channel:
                          </label>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={formData.networkChannel}
                              onChange={e =>
                                updateFormData('networkChannel', e.target.value)
                              }
                              className="w-full rounded border border-border bg-background p-2 text-foreground"
                              placeholder="Enter channel"
                              min="1"
                              max="11"
                            />
                          ) : (
                            <div className="text-sm">
                              {cabinet?.smibConfig?.net?.netStaChan || '1'}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* MQTT Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <h3 className="mb-4 font-medium text-foreground">MQTT</h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {' '}
                        {/* Responsive grid */}
                        <div>
                          <h4 className="mb-2 text-sm font-medium">
                            Connection
                          </h4>
                          <div className="space-y-1">
                            <div className="flex">
                              <span className="w-24 text-sm text-grayHighlight">
                                Host:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                            <div className="flex">
                              <span className="w-24 text-sm text-grayHighlight">
                                Port:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                            <div className="flex">
                              <span className="w-24 text-sm text-grayHighlight">
                                Use TLS:
                              </span>
                              <span className="text-sm">No</span>
                            </div>
                            <div className="flex">
                              <span className="w-24 text-sm text-grayHighlight">
                                Idle Timeout:
                              </span>
                              <span className="text-sm">30 seconds</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2 text-sm font-medium">
                            Authentication
                          </h4>
                          <div className="space-y-1">
                            <div className="flex">
                              <span className="w-24 text-sm text-grayHighlight">
                                Username:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                            <div className="flex">
                              <span className="w-24 text-sm text-grayHighlight">
                                Password:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-medium">Topics</h4>
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="w-24 text-sm text-grayHighlight">
                              Server:
                            </span>
                            <span className="text-sm">sas/gy/server</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 text-sm text-grayHighlight">
                              Configuration:
                            </span>
                            <span className="text-sm">smib/config</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 text-sm text-grayHighlight">
                              SMIB:
                            </span>
                            <span className="text-sm">
                              sas/relay/
                              {cabinet?.relayId ||
                                cabinet?.smibBoard ||
                                'e831cdfa8464'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
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
                    SMIB ID:{' '}
                    {cabinet?.relayId || cabinet?.smibBoard || 'e831cdfa8464'}
                  </p>
                  <p className="mt-1 text-sm text-grayHighlight md:mt-0">
                    Connected to WiFi network{' '}
                    {cabinet?.smibConfig?.net?.netStaSSID ||
                      'Dynamic 1 - Staff Wifi'}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-sm text-grayHighlight">
                    Communication Mode:{' '}
                    {cabinet?.smibConfig?.coms?.comsMode !== undefined
                      ? cabinet?.smibConfig?.coms?.comsMode === 0
                        ? 'sas'
                        : cabinet?.smibConfig?.coms?.comsMode === 1
                          ? 'non sas'
                          : 'IGT'
                      : 'undefined'}
                  </p>
                  <p className="mt-1 text-sm text-grayHighlight md:mt-0">
                    Running firmware{' '}
                    {cabinet?.smibVersion?.firmware || 'FAC_v1-0-4(v1-0-4)'}
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
            setActiveMetricsTabContent={handleTabChange}
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

/**
 * Machine Detail Page Component
 * Thin wrapper that handles routing and authentication
 */
export default function CabinetDetailPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <CabinetDetailPageContent />
    </ProtectedRoute>
  );
}
