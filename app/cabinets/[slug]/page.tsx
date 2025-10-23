"use client";

import React, { useEffect, useRef, useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { Button } from "@/components/ui/button";
import { useCabinetDetailsData, useSmibConfiguration } from "@/lib/hooks/data";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
// GSAP import removed - animations were causing performance issues
import RefreshButton from "@/components/ui/RefreshButton";
import { RefreshCw } from "lucide-react";
import AccountingDetails from "@/components/cabinetDetails/AccountingDetails";
import { NotFoundError, NetworkError } from "@/components/ui/errors";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Extracted skeleton and error components
import { CabinetDetailsLoadingState } from "@/components/ui/skeletons/CabinetDetailSkeletons";

// Animation variants
const configContentVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
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
  const slug = pathname.split("/").pop() || "";
  const [isClient, setIsClient] = useState(false);
  const hasMounted = useHasMounted();

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
    communicationMode,
    firmwareVersion,
    isEditMode,
    mqttConfigData,
    isLoadingMqttConfig: _isLoadingMqttConfig,
    isConnectedToMqtt,
    formData,
    toggleSmibConfig,
    setEditMode,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
    updateFormData,
    resetFormData,
    saveConfiguration,
    fetchMqttConfig,
    connectToConfigStream,
    disconnectFromConfigStream,
    requestLiveConfig,
    publishConfigUpdate: _publishConfigUpdate,
  } = useSmibConfiguration();

  // Initialize activeMetricsTabContent from URL on first load
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState<string>(() => {
      const section = searchParams?.get("section");
      if (section === "live-metrics") return "Live Metrics";
      if (section === "bill-validator") return "Bill Validator";
      if (section === "activity-log") return "Activity Log";
      if (section === "collection-history") return "Collection History";
      if (section === "collection-settings") return "Collection Settings";
      if (section === "configurations") return "Configurations";
      return "Range Metrics"; // default
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
      // Fetch MQTT configuration from API
      fetchMqttConfig(String(cabinet._id));

      // Extract relayId from cabinet data
      const relayId = cabinet.relayId || cabinet.smibBoard;
      if (relayId) {
        // Connect to live MQTT config stream
        connectToConfigStream(relayId);

        // Request initial config data after SSE connection is established
        // Use a small delay to ensure the connection is ready
        setTimeout(() => {
          console.log(
            `🔍 [PAGE] Requesting initial config for relayId: ${relayId}`
          );
          Promise.all([
            requestLiveConfig(relayId, "net"), // Network config
            requestLiveConfig(relayId, "mqtt"), // MQTT config
            requestLiveConfig(relayId, "coms"), // Communication config
            requestLiveConfig(relayId, "ota"), // OTA config
            requestLiveConfig(relayId, "app"), // App config
          ]).catch((error) => {
            console.error("Error requesting live config:", error);
          });
        }, 2000); // Wait 2 seconds for SSE connection to be established
      }
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
    connectToConfigStream,
    disconnectFromConfigStream,
    requestLiveConfig,
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
    const section = searchParams?.get("section");
    if (
      section === "live-metrics" &&
      activeMetricsTabContent !== "Live Metrics"
    ) {
      setActiveMetricsTabContent("Live Metrics");
    } else if (
      section === "bill-validator" &&
      activeMetricsTabContent !== "Bill Validator"
    ) {
      setActiveMetricsTabContent("Bill Validator");
    } else if (
      section === "activity-log" &&
      activeMetricsTabContent !== "Activity Log"
    ) {
      setActiveMetricsTabContent("Activity Log");
    } else if (
      section === "collection-history" &&
      activeMetricsTabContent !== "Collection History"
    ) {
      setActiveMetricsTabContent("Collection History");
    } else if (
      section === "collection-settings" &&
      activeMetricsTabContent !== "Collection Settings"
    ) {
      setActiveMetricsTabContent("Collection Settings");
    } else if (
      section === "configurations" &&
      activeMetricsTabContent !== "Configurations"
    ) {
      setActiveMetricsTabContent("Configurations");
    } else if (!section && activeMetricsTabContent !== "Range Metrics") {
      setActiveMetricsTabContent("Range Metrics");
    }
  }, [searchParams, activeMetricsTabContent]);

  // Handle tab change with URL update
  const handleTabChange = (tab: string) => {
    setActiveMetricsTabContent(tab);

    // Update URL based on tab selection
    const sectionMap: Record<string, string> = {
      "Range Metrics": "",
      "Live Metrics": "live-metrics",
      "Bill Validator": "bill-validator",
      "Activity Log": "activity-log",
      "Collection History": "collection-history",
      "Collection Settings": "collection-settings",
      Configurations: "configurations",
    };

    const params = new URLSearchParams(searchParams?.toString() || "");
    const sectionValue = sectionMap[tab];

    if (sectionValue) {
      params.set("section", sectionValue);
    } else {
      params.delete("section");
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

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

    const success = await saveConfiguration(cabinet._id, machineControl);
    if (success) {
      // Refresh cabinet data to show updated configuration
      await fetchCabinetDetailsData();

      // Show success message
      if (machineControl) {
        toast.success(
          `Machine control command "${machineControl}" sent successfully!`
        );
      } else {
        toast.success("SMIB configuration updated successfully!");
      }
    } else {
      toast.error("Failed to update SMIB configuration");
    }
  };

  // 1. FIRST: If initial loading (no cabinet data yet), show skeleton loaders
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
        <div className="mt-4 mb-2">
          <Button
            onClick={handleBackToCabinets}
            variant="outline"
            className="flex items-center bg-container border-buttonActive text-buttonActive hover:bg-buttonActive hover:text-container transition-colors duration-300"
            size="sm"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Cabinets
          </Button>
        </div>

        {/* Error Component */}
        {errorType === "not-found" ? (
          <NotFoundError
            title="Cabinet Not Found"
            message={`The cabinet "${slug}" could not be found. It may have been deleted or moved.`}
            resourceType="cabinet"
            onRetry={fetchCabinetDetailsData}
            onGoBack={handleBackToCabinets}
          />
        ) : errorType === "network" ? (
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
            className="mt-4 mb-2"
          >
            <Button
              onClick={handleBackToCabinets}
              variant="outline"
              className="flex items-center bg-container border-buttonActive text-buttonActive hover:bg-buttonActive hover:text-container transition-colors duration-300"
              size="sm"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Cabinets
            </Button>
          </motion.div>
        ) : (
          <div className="mt-4 mb-2">
            <Button
              onClick={handleBackToCabinets}
              variant="outline"
              className="flex items-center bg-container border-buttonActive text-buttonActive hover:bg-buttonActive hover:text-container transition-colors duration-300"
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
            className="mt-6 mb-6 relative"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold flex items-center">
                  Name: {cabinet ? getSerialNumberIdentifier(cabinet) : "GMID1"}
                  <motion.button
                    className="ml-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (cabinet) {
                        openEditModal(cabinet);
                      }
                    }}
                  >
                    <Pencil2Icon className="text-button w-5 h-5" />
                  </motion.button>
                </h1>
                {/* Show deleted status if cabinet has deletedAt field and it's greater than year 2020 */}
                {cabinet?.deletedAt &&
                  new Date(cabinet.deletedAt).getFullYear() > 2020 && (
                    <div className="mt-2 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                        DELETED -{" "}
                        {new Date(cabinet.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                <p className="text-grayHighlight mt-2">
                  Manufacturer:{" "}
                  {cabinet?.gameConfig?.theoreticalRtp
                    ? "Some Manufacturer"
                    : "None"}
                </p>
                <p className="text-grayHighlight mt-1">
                  Game Type: {cabinet?.gameType || "None"}
                </p>
                <p className="mt-1">
                  <span className="text-button">
                    {locationName === "Location Not Found" ? (
                      <span className="text-orange-600">
                        Location Not Found
                      </span>
                    ) : locationName === "No Location Assigned" ? (
                      <span className="text-gray-500">
                        No Location Assigned
                      </span>
                    ) : (
                      locationName || "Unknown Location"
                    )}
                  </span>
                  <span className="text-grayHighlight">
                    ,{" "}
                    {selectedLicencee === "TTG"
                      ? "Trinidad and Tobago"
                      : selectedLicencee === "Cabanada"
                      ? "Guyana"
                      : selectedLicencee === "Barbados"
                      ? "Barbados"
                      : "Trinidad and Tobago"}
                  </span>
                </p>
              </div>

              {/* Only render this on client side to avoid hydration mismatch */}
              {isClient && (
                <div className="md:absolute md:top-0 md:right-0 mt-2 md:mt-0 flex items-center gap-2">
                  <motion.div
                    className="flex items-center px-3 py-1.5 rounded-lg bg-container shadow-sm border"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className={`w-2.5 h-2.5 rounded-full mr-2 ${
                        isOnline ? "bg-button" : "bg-destructive"
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
                        isOnline ? "text-button" : "text-destructive"
                      }`}
                    >
                      {isOnline ? "ONLINE" : "OFFLINE"}
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
          <div className="mt-6 mb-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold flex items-center">
                  Name: {cabinet ? getSerialNumberIdentifier(cabinet) : "GMID1"}
                </h1>
                {/* Show deleted status if cabinet has deletedAt field and it's greater than year 2020 */}
                {cabinet?.deletedAt &&
                  new Date(cabinet.deletedAt).getFullYear() > 2020 && (
                    <div className="mt-2 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                        DELETED -{" "}
                        {new Date(cabinet.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                <p className="text-grayHighlight mt-2">
                  Manufacturer:{" "}
                  {cabinet?.gameConfig?.theoreticalRtp
                    ? "Some Manufacturer"
                    : "None"}
                </p>
                <p className="text-grayHighlight mt-1">
                  Game Type: {cabinet?.gameType || "None"}
                </p>
                <p className="mt-1">
                  <span className="text-button">
                    {locationName === "Location Not Found" ? (
                      <span className="text-orange-600">
                        Location Not Found
                      </span>
                    ) : locationName === "No Location Assigned" ? (
                      <span className="text-gray-500">
                        No Location Assigned
                      </span>
                    ) : (
                      locationName || "Unknown Location"
                    )}
                  </span>
                  <span className="text-grayHighlight">
                    ,{" "}
                    {selectedLicencee === "TTG"
                      ? "Trinidad and Tobago"
                      : selectedLicencee === "Cabanada"
                      ? "Guyana"
                      : selectedLicencee === "Barbados"
                      ? "Barbados"
                      : "Trinidad and Tobago"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SMIB Configuration */}
        {hasMounted ? (
          <motion.div
            className="mt-4 bg-container rounded-lg shadow-md shadow-purple-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">SMIB Configuration</h2>
                {/* MQTT Connection Status */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnectedToMqtt ? "bg-green-500" : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {isConnectedToMqtt ? "Live" : "Offline"}
                  </span>
                </div>
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
                          className="h-8 px-3 text-xs bg-button text-container hover:bg-buttonActive"
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
              <div className="grid grid-cols-1 md:grid-cols-2 md:justify-between gap-2 md:gap-4">
                <div>
                  <p className="text-sm text-grayHighlight">
                    SMIB ID: {mqttConfigData?.smibId || "No Value Provided"}
                  </p>
                  <p className="text-sm text-grayHighlight mt-1 md:mt-0">
                    {" "}
                    {/* Adjust margin */}
                    Connected to WiFi network{" "}
                    {mqttConfigData?.networkSSID || "No Value Provided"}
                  </p>
                </div>
                <div className="md:text-right">
                  {" "}
                  {/* Align text right on medium screens and up */}
                  <p className="text-sm text-grayHighlight">
                    Communication Mode:{" "}
                    {cabinet?.smibConfig?.coms?.comsMode !== undefined
                      ? cabinet?.smibConfig?.coms?.comsMode === 0
                        ? "sas"
                        : cabinet?.smibConfig?.coms?.comsMode === 1
                        ? "non sas"
                        : "IGT"
                      : "undefined"}
                  </p>
                  <p className="text-sm text-grayHighlight mt-1 md:mt-0">
                    {" "}
                    {/* Adjust margin */}
                    Running firmware{" "}
                    {mqttConfigData?.firmwareVersion || "No Value Provided"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Expanded Configuration Section */}
            <AnimatePresence>
              {smibConfigExpanded && (
                <motion.div
                  ref={configSectionRef}
                  className="px-6 pb-6 space-y-6 border-t border-gray-200 pt-4 overflow-hidden"
                  variants={configContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <TooltipProvider delayDuration={100}>
                    {/* Communication Mode */}
                    <motion.div variants={itemVariants}>
                      <h3 className="font-medium mb-2 text-foreground">
                        Communication Mode
                      </h3>
                      <div className="flex items-center gap-2">
                        <select
                          className={`w-60 border border-border rounded p-2 ${
                            isEditMode
                              ? "bg-background text-foreground cursor-pointer"
                              : "bg-gray-100 text-gray-500 cursor-not-allowed"
                          }`}
                          value={
                            isEditMode
                              ? formData.communicationMode
                              : communicationMode
                          }
                          disabled={!isEditMode}
                          onChange={(e) =>
                            updateFormData("communicationMode", e.target.value)
                          }
                        >
                          <option value="sas">sas</option>
                          <option value="non sas">non sas</option>
                          <option value="IGT">IGT</option>
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
                        {!isEditMode && (
                          <Button
                            onClick={() => setEditMode(true)}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            EDIT
                          </Button>
                        )}
                      </div>
                    </motion.div>

                    {/* Firmware Update */}
                    <motion.div variants={itemVariants}>
                      <h3 className="font-medium mb-2 text-foreground">
                        Firmware Update
                      </h3>
                      <div className="flex items-center gap-2">
                        <select
                          className={`flex-1 border border-border rounded p-2 ${
                            isEditMode
                              ? "bg-background text-foreground cursor-pointer"
                              : "bg-gray-100 text-gray-500 cursor-not-allowed"
                          }`}
                          value={
                            isEditMode
                              ? formData.firmwareVersion
                              : firmwareVersion
                          }
                          disabled={!isEditMode}
                          onChange={(e) =>
                            updateFormData("firmwareVersion", e.target.value)
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
                        {!isEditMode && (
                          <Button
                            onClick={() => setEditMode(true)}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            EDIT
                          </Button>
                        )}
                      </div>
                    </motion.div>

                    {/* Machine Control Buttons - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="flex flex-wrap gap-2 md:gap-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className="border-lighterBlueHighlight text-lighterBlueHighlight hover:bg-accent w-full md:w-auto"
                          onClick={async () =>
                            await handleSaveSMIBConfig("RESTART")
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
                          className="border-orangeHighlight text-orangeHighlight hover:bg-accent w-full md:w-auto"
                          onClick={async () =>
                            await handleSaveSMIBConfig("UNLOCK MACHINE")
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
                          className="border-destructive text-destructive hover:bg-accent w-full md:w-auto"
                          onClick={async () =>
                            await handleSaveSMIBConfig("LOCK MACHINE")
                          }
                          disabled={!isEditMode}
                        >
                          LOCK MACHINE
                        </Button>
                      </motion.div>
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
                        {cabinet?.locationName || "Unknown Location"})
                      </label>
                    </motion.div>

                    {/* Network/WiFi Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-foreground">
                          Network/WiFi
                        </h3>
                        {isEditMode && (
                          <Button
                            onClick={async () => await handleSaveSMIBConfig()}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE NETWORK
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-grayHighlight">
                            Network Name (live):
                          </label>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={formData.networkSSID}
                              onChange={(e) =>
                                updateFormData("networkSSID", e.target.value)
                              }
                              className="w-full border border-border rounded p-2 bg-background text-foreground"
                              placeholder="Enter network name"
                            />
                          ) : (
                            <div className="text-sm truncate">
                              {formData.networkSSID ||
                                "Device Online - Config Not Supported"}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-grayHighlight">
                            Password (live):
                          </label>
                          {isEditMode ? (
                            <input
                              type="password"
                              value={formData.networkPassword}
                              onChange={(e) =>
                                updateFormData(
                                  "networkPassword",
                                  e.target.value
                                )
                              }
                              className="w-full border border-border rounded p-2 bg-background text-foreground"
                              placeholder="Enter network password"
                            />
                          ) : (
                            <div className="text-sm">
                              {formData.networkPassword ||
                                "Device Online - Config Not Supported"}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-grayHighlight">
                            Channel (live):
                          </label>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={formData.networkChannel}
                              onChange={(e) =>
                                updateFormData("networkChannel", e.target.value)
                              }
                              className="w-full border border-border rounded p-2 bg-background text-foreground"
                              placeholder="Enter channel"
                              min="1"
                              max="11"
                            />
                          ) : (
                            <div className="text-sm">
                              {formData.networkChannel ||
                                "Device Online - Config Not Supported"}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* COMS Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-foreground">COMS</h3>
                        {isEditMode && (
                          <Button
                            onClick={async () => await handleSaveSMIBConfig()}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE COMS
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Communication Settings
                          </h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                Mode:
                              </label>
                              {isEditMode ? (
                                <select
                                  value={formData.comsMode || "0"}
                                  onChange={(e) =>
                                    updateFormData("comsMode", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                >
                                  <option value="0">SAS</option>
                                  <option value="1">Non-SAS</option>
                                  <option value="2">IGT</option>
                                </select>
                              ) : (
                                <div className="text-sm">
                                  {formData.comsMode === "0"
                                    ? "SAS"
                                    : formData.comsMode === "1"
                                    ? "Non-SAS"
                                    : formData.comsMode === "2"
                                    ? "IGT"
                                    : formData.comsMode || "No Value Provided"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                Address:
                              </label>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={formData.comsAddr || ""}
                                  onChange={(e) =>
                                    updateFormData("comsAddr", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="1"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsAddr || "No Value Provided"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                Rate (ms):
                              </label>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={formData.comsRateMs || ""}
                                  onChange={(e) =>
                                    updateFormData("comsRateMs", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="200"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsRateMs || "No Value Provided"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Advanced Settings
                          </h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                RTE:
                              </label>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={formData.comsRTE || ""}
                                  onChange={(e) =>
                                    updateFormData("comsRTE", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="0"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsRTE || "No Value Provided"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                GPC:
                              </label>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={formData.comsGPC || ""}
                                  onChange={(e) =>
                                    updateFormData("comsGPC", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="0"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.comsGPC || "No Value Provided"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* MQTT Topics Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-foreground">
                          MQTT Topics
                        </h3>
                        {isEditMode && (
                          <Button
                            onClick={async () => await handleSaveSMIBConfig()}
                            className="bg-button text-container hover:bg-buttonActive"
                            size="sm"
                          >
                            SAVE MQTT TOPICS
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Topic Configuration
                          </h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                MQTT Public Topic:
                              </label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={formData.mqttPubTopic || ""}
                                  onChange={(e) =>
                                    updateFormData(
                                      "mqttPubTopic",
                                      e.target.value
                                    )
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="sas/gy/server"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.mqttPubTopic || "No Value Provided"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                MQTT Config Topic:
                              </label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={formData.mqttCfgTopic || ""}
                                  onChange={(e) =>
                                    updateFormData(
                                      "mqttCfgTopic",
                                      e.target.value
                                    )
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="smib/config"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.mqttCfgTopic || "No Value Provided"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                MQTT URI:
                              </label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={formData.mqttURI || ""}
                                  onChange={(e) =>
                                    updateFormData("mqttURI", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.mqttURI || "No Value Provided"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Additional Settings
                          </h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                QOS:
                              </label>
                              {isEditMode ? (
                                <select
                                  value={formData.mqttTLS || "2"}
                                  onChange={(e) =>
                                    updateFormData("mqttTLS", e.target.value)
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                >
                                  <option value="0">0 - At most once</option>
                                  <option value="1">1 - At least once</option>
                                  <option value="2">2 - Exactly once</option>
                                </select>
                              ) : (
                                <div className="text-sm">
                                  {formData.mqttTLS === "0"
                                    ? "0 - At most once"
                                    : formData.mqttTLS === "1"
                                    ? "1 - At least once"
                                    : formData.mqttTLS === "2"
                                    ? "2 - Exactly once"
                                    : formData.mqttTLS || "No Value Provided"}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-grayHighlight">
                                Idle Timeout (s):
                              </label>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={formData.mqttIdleTimeout || ""}
                                  onChange={(e) =>
                                    updateFormData(
                                      "mqttIdleTimeout",
                                      e.target.value
                                    )
                                  }
                                  className="w-full border border-border rounded p-2 bg-background text-foreground"
                                  placeholder="30"
                                />
                              ) : (
                                <div className="text-sm">
                                  {formData.mqttIdleTimeout ||
                                    "No Value Provided"}
                                </div>
                              )}
                            </div>
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
          <div className="mt-4 bg-container rounded-lg shadow-md shadow-purple-200">
            {/* Static version of the SMIB Configuration content - make responsive */}
            <div className="px-6 py-4 flex justify-between items-center cursor-pointer">
              <h2 className="text-xl font-semibold">SMIB Configuration</h2>
              <div>
                <ChevronDownIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="px-6 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 md:justify-between gap-2 md:gap-4">
                <div>
                  <p className="text-sm text-grayHighlight">
                    SMIB ID: {mqttConfigData?.smibId || "No Value Provided"}
                  </p>
                  <p className="text-sm text-grayHighlight mt-1 md:mt-0">
                    Connected to WiFi network{" "}
                    {mqttConfigData?.networkSSID ||
                      "Device Online - Config Not Supported"}
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">
                    ⚠️ Device is online but not responding to configuration
                    requests. Check SMIB device settings to enable config
                    responses.
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-sm text-grayHighlight">
                    Communication Mode:{" "}
                    {cabinet?.smibConfig?.coms?.comsMode !== undefined
                      ? cabinet?.smibConfig?.coms?.comsMode === 0
                        ? "sas"
                        : cabinet?.smibConfig?.coms?.comsMode === 1
                        ? "non sas"
                        : "IGT"
                      : "undefined"}
                  </p>
                  <p className="text-sm text-grayHighlight mt-1 md:mt-0">
                    Running firmware{" "}
                    {mqttConfigData?.firmwareVersion || "No Value Provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Filters */}
        {hasMounted ? (
          <motion.div
            className="mt-4 mb-4"
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
          <div className="mt-4 mb-4">
            <DashboardDateFilters
              hideAllTime={false}
              onCustomRangeGo={fetchCabinetDetailsData}
              enableTimeInputs={true}
            />
          </div>
        )}

        {/* Horizontal Slider for Mobile and Tablet - visible below lg */}
        <div className="lg:hidden overflow-x-auto touch-pan-x pb-4 custom-scrollbar w-full p-2 rounded-md mt-4 mb-2">
          <div className="flex space-x-2 min-w-max px-1 pb-1">
            {[
              "Metrics",
              "Live Metrics",
              "Bill Validator",
              "Activity Log",
              "Collection History",
              "Collection Settings",
            ].map((tab) => (
              <Button
                key={tab}
                className={`whitespace-nowrap px-4 py-2 ${
                  activeMetricsTabContent ===
                  (tab === "Metrics" ? "Range Metrics" : tab)
                    ? "bg-buttonActive text-container"
                    : "bg-muted text-grayHighlight"
                }`}
                onClick={() =>
                  handleTabChange(tab === "Metrics" ? "Range Metrics" : tab)
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
                className="bg-button text-container p-3 rounded-full shadow-lg hover:bg-buttonActive transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw
                  className={`w-6 h-6 ${refreshing ? "animate-spin" : ""}`}
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
