"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { Button } from "@/components/ui/button";
import { CabinetDetail, TimePeriod } from "@/lib/types/cabinets";
import {
  fetchCabinetById,
  updateCabinetMetricsData,
} from "@/lib/helpers/cabinets";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";
import { differenceInMinutes } from "date-fns";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { toast } from "sonner";
import gsap from "gsap";
import RefreshButton from "@/components/ui/RefreshButton";
import AccountingDetails from "@/components/cabinetDetails/AccountingDetails";

// Extracted skeleton and error components
import {
  CabinetDetailsLoadingState,
  CabinetDetailsErrorState,
} from "@/components/ui/skeletons/CabinetDetailSkeletons";

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

export default function CabinetDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split("/").pop() || "";
  const [isClient, setIsClient] = useState(false);
  const hasMounted = useHasMounted();

  const {
    selectedLicencee,
    activeMetricsFilter,
    setActiveMetricsFilter,
    setSelectedLicencee,
  } = useDashBoardStore();

  const { openEditModal } = useCabinetActionsStore();

  const [cabinet, setCabinet] = useState<CabinetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isFilterChangeInProgress, setIsFilterChangeInProgress] =
    useState(false);
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState<string>("Range Metrics");
  const lastFilterChangeTimeRef = useRef<number>(0);

  // Communication mode and firmware selection states
  const [communicationMode, setCommunicationMode] = useState<string>("sas");
  const [firmwareVersion, setFirmwareVersion] =
    useState<string>("Cloudy v1.0.4");

  // Refs for animation
  const configSectionRef = useRef<HTMLDivElement>(null);

  // Add a ref to track if this is the initial render
  const initialRenderRef = useRef(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchCabinetDetailsData = useCallback(async () => {
    console.log("[DEBUG] fetchCabinetDetailsData called with slug:", slug);
    setLoading(true);
    setMetricsLoading(true);
    setError(null);
    try {
      const cabinetData = await fetchCabinetById(slug);
      console.log("[DEBUG] fetchCabinetById result:", cabinetData);
      setCabinet(cabinetData);
      if (cabinetData?.lastActivity) {
        const lastActive = new Date(cabinetData.lastActivity);
        setIsOnline(differenceInMinutes(new Date(), lastActive) <= 3);
      }
      setCommunicationModeFromData(cabinetData);
      setFirmwareVersionFromData(cabinetData);
    } catch (err: unknown) {
      setCabinet(null);
      setError((err as Error).message || "Failed to fetch cabinet details");
      toast.error("Failed to fetch cabinet details");
    } finally {
      setLoading(false);
      setMetricsLoading(false);
    }
  }, [slug]);

  const updateMetricsData = useCallback(async () => {
    console.log(
      "[DEBUG] updateMetricsData called with slug:",
      slug,
      "activeMetricsFilter:",
      activeMetricsFilter
    );
    if (!cabinet) return;
    setMetricsLoading(true);
    try {
      const updatedCabinet = await updateCabinetMetricsData(
        slug,
        activeMetricsFilter
      );
      console.log("[DEBUG] updateCabinetMetricsData result:", updatedCabinet);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update metrics");
      toast.error("Failed to update metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, [slug, activeMetricsFilter, cabinet]);

  // Create a reference to store the last metrics filter to prevent duplicate requests
  const lastMetricsFilterRef = useRef(activeMetricsFilter);

  // Store a reference to the current metrics request cleanup function
  const currentMetricsRequestRef = useRef<(() => void) | null>(null);

  // Make sure changing activeMetricsFilter doesn't trigger a full page reload
  useEffect(() => {
    // Skip if filter hasn't actually changed
    if (lastMetricsFilterRef.current === activeMetricsFilter) {
      return;
    }

    // Update the last filter reference
    lastMetricsFilterRef.current = activeMetricsFilter;

    // Skip the first render to avoid double-fetching
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    // Only update metrics when filter changes, not on initial load
    if (!loading && cabinet) {
      // Cancel any previous request
      if (currentMetricsRequestRef.current) {
        currentMetricsRequestRef.current();
        currentMetricsRequestRef.current = null;
      }

      // Set the loading state
      setMetricsLoading(true);

      // Create a timeout to debounce rapid changes
      const timeoutId = setTimeout(async () => {
        try {
          // Execute the metrics update
          await updateMetricsData();
        } finally {
          // Ensure loading state is reset
          setMetricsLoading(false);
          setIsFilterChangeInProgress(false);
        }
      }, 500); // Increased to 500ms debounce

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [activeMetricsFilter, updateMetricsData, loading, cabinet]);

  useEffect(() => {
    console.log("[DEBUG] useEffect (initial fetch) running with slug:", slug);
    fetchCabinetDetailsData();
  }, [fetchCabinetDetailsData, slug]);

  const handleBackToCabinets = () => {
    router.push(`/cabinets`);
  };

  const toggleSmibConfig = () => {
    setSmibConfigExpanded(!smibConfigExpanded);
  };

  // Set isClient to true once component mounts in the browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add animation hook for filtering and sorting where appropriate
  useEffect(() => {
    // Only run in browser environment
    if (typeof document === "undefined" || !cabinet || metricsLoading) return;

    // Animate table rows or cards when data changes or filter/sort changes
    // Table animation for any tables in the component
    const tables = document.querySelectorAll("table");
    tables.forEach((table) => {
      const tableRows = table.querySelectorAll("tbody tr");
      gsap.fromTo(
        tableRows,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
        }
      );
    });

    // Card animation for any card containers
    const cardContainers = document.querySelectorAll(".card-container");
    cardContainers.forEach((container) => {
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
          ease: "back.out(1.5)",
        }
      );
    });
  }, [metricsLoading, cabinet]);

  // Update the refresh handler to refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCabinetDetailsData();
    } finally {
      setRefreshing(false);
    }
  };

  // Add helper functions to set communication mode and firmware version
  const setCommunicationModeFromData = (data: CabinetDetail) => {
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === "object" &&
      "coms" in data.smibConfig
    ) {
      const mode = data.smibConfig.coms?.comsMode;
      if (mode !== undefined) {
        setCommunicationMode(
          mode === 0 ? "sas" : mode === 1 ? "non sas" : "IGT"
        );
      }
    }
  };

  const setFirmwareVersionFromData = (data: CabinetDetail) => {
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibVersion &&
      typeof data.smibVersion === "object" &&
      "firmware" in data.smibVersion
    ) {
      const firmware = data.smibVersion.firmware;
      if (typeof firmware === "string") {
        if (firmware.includes("v1-0-4-1")) {
          setFirmwareVersion("Cloudy v1.0.4.1");
        } else if (firmware.includes("v1-0-4")) {
          setFirmwareVersion("Cloudy v1.0.4");
        } else {
          setFirmwareVersion("Cloudy v1.0");
        }
      }
    }
  };

  // 1. FIRST: If loading, show skeleton loaders
  if (loading || (!cabinet && !loading && !error)) {
    return (
      <CabinetDetailsLoadingState
        pathname={pathname}
        selectedLicencee={selectedLicencee}
        setSelectedLicencee={setSelectedLicencee}
        error={error}
      />
    );
  }

  // 2. SECOND: If there was an error, show error message
  if (error) {
    return (
      <CabinetDetailsErrorState
        pathname={pathname}
        selectedLicencee={selectedLicencee}
        setSelectedLicencee={setSelectedLicencee}
        error={error}
        onRetry={fetchCabinetDetailsData}
      />
    );
  }

  // Main return statement should be here, AFTER all conditional returns
  return (
    <>
      <Sidebar pathname={pathname} />
      <EditCabinetModal />
      <DeleteCabinetModal />

      <div className="xl:w-full xl:mx-auto xl:pl-36 min-h-screen bg-background flex overflow-hidden">
        <main className="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden">
          <div className="flex justify-end mb-2">
            <RefreshButton
              onClick={handleRefresh}
              isSyncing={refreshing}
              label="Refresh"
            />
          </div>
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={false}
          />

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
                    Name: {cabinet?.serialNumber || "GMID1"}
                    <motion.button
                      className="ml-2 p-1"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (cabinet) {
                          openEditModal(cabinet);
                        }
                      }}
                    >
                      <Pencil2Icon className="text-button" />
                    </motion.button>
                  </h1>
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
                      {cabinet?.locationName || "Unknown Location"}
                    </span>
                    {cabinet?.locationName?.includes(",") ? (
                      <span className="text-grayHighlight">
                        ,{" "}
                        {cabinet.locationName?.split(",").slice(1).join(",") ||
                          "Trinidad and Tobago"}
                      </span>
                    ) : (
                      <span className="text-grayHighlight">
                        , Trinidad and Tobago
                      </span>
                    )}
                  </p>
                </div>

                {/* Only render this on client side to avoid hydration mismatch */}
                {isClient && (
                  <div className="md:absolute md:top-0 md:right-0 mt-2 md:mt-0">
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
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="mt-6 mb-6 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <h1 className="text-2xl font-bold flex items-center">
                    Name: {cabinet?.serialNumber || "GMID1"}
                  </h1>
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
                      {cabinet?.locationName || "Unknown Location"}
                    </span>
                    {cabinet?.locationName?.includes(",") ? (
                      <span className="text-grayHighlight">
                        ,{" "}
                        {cabinet.locationName?.split(",").slice(1).join(",") ||
                          "Trinidad and Tobago"}
                      </span>
                    ) : (
                      <span className="text-grayHighlight">
                        , Trinidad and Tobago
                      </span>
                    )}
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
              <div
                className="px-6 py-4 flex justify-between items-center cursor-pointer"
                onClick={toggleSmibConfig}
              >
                <h2 className="text-xl font-semibold">SMIB Configuration</h2>
                <motion.div
                  animate={{ rotate: smibConfigExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
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
                      SMIB ID:{" "}
                      {cabinet?.relayId || cabinet?.smibBoard || "e831cdfa8464"}
                    </p>
                    <p className="text-sm text-grayHighlight mt-1 md:mt-0">
                      {" "}
                      {/* Adjust margin */}
                      Connected to WiFi network{" "}
                      {cabinet?.smibConfig?.net?.netStaSSID ||
                        "Dynamic 1 - Staff Wifi"}
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
                      {cabinet?.smibVersion?.firmware || "FAC_v1-0-4(v1-0-4)"}
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
                    {/* Communication Mode */}
                    <motion.div variants={itemVariants}>
                      <h3 className="font-medium mb-2 text-foreground">
                        Communication Mode
                      </h3>
                      <div className="flex">
                        <select
                          className="w-60 border border-border rounded p-2 mr-2"
                          value={communicationMode}
                          onChange={(e) => setCommunicationMode(e.target.value)}
                        >
                          <option value="sas">sas</option>
                          <option value="non sas">non sas</option>
                          <option value="IGT">IGT</option>
                        </select>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button className="bg-buttonActive hover:bg-buttonActive/90 text-container">
                            UPDATE
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Firmware Update */}
                    <motion.div variants={itemVariants}>
                      <h3 className="font-medium mb-2 text-foreground">
                        Firmware Update
                      </h3>
                      <div className="flex">
                        <select
                          className="w-full border border-border rounded p-2 mr-2"
                          value={firmwareVersion}
                          onChange={(e) => setFirmwareVersion(e.target.value)}
                        >
                          <option value="Cloudy v1.0">Cloudy v1.0</option>
                          <option value="Cloudy v1.0.4">Cloudy v1.0.4</option>
                          <option value="Cloudy v1.0.4.1">
                            Cloudy v1.0.4.1
                          </option>
                        </select>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button className="ml-auto bg-muted hover:bg-accent text-foreground border border-border">
                            ⟳
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button className="ml-2 bg-buttonActive hover:bg-buttonActive/90 text-container">
                            UPDATE
                          </Button>
                        </motion.div>
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
                      <h3 className="font-medium mb-4 text-foreground">
                        Network/WiFi
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                        {" "}
                        {/* Responsive grid */}
                        <div className="flex">
                          <span className="text-sm font-medium text-grayHighlight w-24">
                            Name:
                          </span>
                          <span className="text-sm truncate">
                            {" "}
                            {/* Added truncate */}
                            {cabinet?.smibConfig?.net?.netStaSSID ||
                              "Dynamic 1 - Staff Wifi"}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-grayHighlight w-24">
                            Password:
                          </span>
                          <span className="text-sm">
                            {cabinet?.smibConfig?.net?.netStaPwd ||
                              "wordsapp!23"}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-grayHighlight w-24">
                            Channel:
                          </span>
                          <span className="text-sm">
                            {cabinet?.smibConfig?.net?.netStaChan || "1"}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {/* MQTT Section - Responsive */}
                    <motion.div
                      variants={itemVariants}
                      className="border-t border-border pt-6"
                    >
                      <h3 className="font-medium mb-4 text-foreground">MQTT</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {" "}
                        {/* Responsive grid */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Connection
                          </h4>
                          <div className="space-y-1">
                            <div className="flex">
                              <span className="text-sm text-grayHighlight w-24">
                                Host:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                            <div className="flex">
                              <span className="text-sm text-grayHighlight w-24">
                                Port:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                            <div className="flex">
                              <span className="text-sm text-grayHighlight w-24">
                                Use TLS:
                              </span>
                              <span className="text-sm">No</span>
                            </div>
                            <div className="flex">
                              <span className="text-sm text-grayHighlight w-24">
                                Idle Timeout:
                              </span>
                              <span className="text-sm">30 seconds</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Authentication
                          </h4>
                          <div className="space-y-1">
                            <div className="flex">
                              <span className="text-sm text-grayHighlight w-24">
                                Username:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                            <div className="flex">
                              <span className="text-sm text-grayHighlight w-24">
                                Password:
                              </span>
                              <span className="text-sm"></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Topics</h4>
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="text-sm text-grayHighlight w-24">
                              Server:
                            </span>
                            <span className="text-sm">sas/gy/server</span>
                          </div>
                          <div className="flex">
                            <span className="text-sm text-grayHighlight w-24">
                              Configuration:
                            </span>
                            <span className="text-sm">smib/config</span>
                          </div>
                          <div className="flex">
                            <span className="text-sm text-grayHighlight w-24">
                              SMIB:
                            </span>
                            <span className="text-sm">
                              sas/relay/
                              {cabinet?.relayId ||
                                cabinet?.smibBoard ||
                                "e831cdfa8464"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
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
                      SMIB ID:{" "}
                      {cabinet?.relayId || cabinet?.smibBoard || "e831cdfa8464"}
                    </p>
                    <p className="text-sm text-grayHighlight mt-1 md:mt-0">
                      Connected to WiFi network{" "}
                      {cabinet?.smibConfig?.net?.netStaSSID ||
                        "Dynamic 1 - Staff Wifi"}
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
                      {cabinet?.smibVersion?.firmware || "FAC_v1-0-4(v1-0-4)"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Horizontal metrics options slider - outside of white container but contained */}
          <div className="mt-4 mb-2 max-w-full">
            {/* Responsive time period filters - Hide on desktop (lg and up) */}
            <div className="hidden lg:flex flex-wrap justify-center lg:justify-end gap-2 mb-4">
              {[
                { label: "Today", value: "Today" as TimePeriod },
                { label: "Yesterday", value: "Yesterday" as TimePeriod },
                { label: "Last 7 days", value: "7d" as TimePeriod },
                { label: "30 days", value: "30d" as TimePeriod },
                { label: "Custom", value: "Custom" as TimePeriod },
              ].map((filter, index) => (
                <motion.div
                  key={filter.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className={`px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-container rounded-full flex items-center gap-1 md:gap-2 ${
                      (metricsLoading || isFilterChangeInProgress) &&
                      activeMetricsFilter === filter.value
                        ? "opacity-80"
                        : ""
                    } ${
                      activeMetricsFilter === filter.value
                        ? "bg-buttonActive"
                        : "bg-button"
                    }`}
                    onClick={() => {
                      // Prevent changing filter if already loading
                      if (metricsLoading || isFilterChangeInProgress) {
                        return;
                      }
                      if (activeMetricsFilter === filter.value) {
                        return;
                      }
                      const now = Date.now();
                      if (now - lastFilterChangeTimeRef.current < 1000) {
                        return;
                      }
                      lastFilterChangeTimeRef.current = now;
                      setIsFilterChangeInProgress(true);
                      setTimeout(async () => {
                        try {
                          await updateMetricsData();
                        } finally {
                          setIsFilterChangeInProgress(false);
                        }
                      }, 300);
                      setActiveMetricsFilter(filter.value);
                    }}
                    disabled={metricsLoading || isFilterChangeInProgress}
                  >
                    {(metricsLoading || isFilterChangeInProgress) &&
                    activeMetricsFilter === filter.value ? (
                      <span className="w-3 h-3 md:w-4 md:h-4 border-2 border-container border-t-transparent rounded-full animate-spin"></span>
                    ) : null}
                    {filter.label}
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Mobile and Tablet Sort By dropdown - visible below lg */}
            <div className="lg:hidden flex justify-center mb-4">
              <div className="relative inline-block w-full max-w-[200px]">
                <button
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-buttonActive text-container rounded-full shadow-sm"
                  onClick={() => {
                    const dropdown = document.getElementById(
                      "mobile-filter-dropdown"
                    );
                    if (dropdown) {
                      dropdown.classList.toggle("hidden");
                    }
                  }}
                >
                  <span>Sort by: {activeMetricsFilter}</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <div
                  id="mobile-filter-dropdown"
                  className="hidden absolute z-10 mt-1 w-full bg-container rounded-md shadow-lg py-1"
                >
                  {[
                    { label: "Today", value: "Today" as TimePeriod },
                    { label: "Yesterday", value: "Yesterday" as TimePeriod },
                    { label: "Last 7 days", value: "7d" as TimePeriod },
                    { label: "30 days", value: "30d" as TimePeriod },
                    { label: "Custom", value: "Custom" as TimePeriod },
                  ].map((filter) => (
                    <button
                      key={filter.label}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        activeMetricsFilter === filter.value
                          ? "bg-accent text-buttonActive font-medium"
                          : "text-grayHighlight hover:bg-muted"
                      }`}
                      onClick={() => {
                        // Don't update if already selected or loading
                        if (
                          activeMetricsFilter === filter.value ||
                          metricsLoading ||
                          isFilterChangeInProgress
                        ) {
                          document
                            .getElementById("mobile-filter-dropdown")
                            ?.classList.add("hidden");
                          return;
                        }
                        setIsFilterChangeInProgress(true);
                        setActiveMetricsFilter(filter.value);
                        document
                          .getElementById("mobile-filter-dropdown")
                          ?.classList.add("hidden");
                        setTimeout(async () => {
                          try {
                            await updateMetricsData();
                          } finally {
                            setIsFilterChangeInProgress(false);
                          }
                        }, 300);
                      }}
                      disabled={metricsLoading || isFilterChangeInProgress}
                    >
                      {filter.label}
                      {(metricsLoading || isFilterChangeInProgress) &&
                      activeMetricsFilter === filter.value ? (
                        <span className="ml-2 inline-block w-3 h-3 border-2 border-buttonActive border-t-transparent rounded-full animate-spin"></span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Horizontal Slider for Mobile and Tablet - visible below lg */}
            <div className="lg:hidden overflow-x-auto touch-pan-x pb-4 custom-scrollbar w-full p-2 rounded-md">
              <div className="flex space-x-2 min-w-max px-1 pb-1">
                {[
                  "Metrics",
                  "Live Metrics",
                  "Bill Validator",
                  "Activity Log",
                  "Collection History",
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
                      setActiveMetricsTabContent(
                        tab === "Metrics" ? "Range Metrics" : tab
                      )
                    }
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Accounting Details with Sidebar Menu */}
          {cabinet ? (
            <AccountingDetails
              cabinet={cabinet}
              metricsLoading={metricsLoading}
              activeMetricsTabContent={activeMetricsTabContent}
              setActiveMetricsTabContent={setActiveMetricsTabContent}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
