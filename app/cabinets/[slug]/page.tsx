"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PageLayout from "@/components/layout/PageLayout";

import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { Button } from "@/components/ui/button";
import { CabinetDetail, TimePeriod } from "@/lib/types/cabinets";
import { fetchCabinetById } from "@/lib/helpers/cabinets";
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
import { RefreshCw } from "lucide-react";
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

  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  const { openEditModal } = useCabinetActionsStore();

  const [cabinet, setCabinet] = useState<CabinetDetail | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState<string>("Range Metrics");
  const [activeMetricsFilter, setActiveMetricsFilter] =
    useState<TimePeriod>("Today");
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Communication mode and firmware selection states
  const [communicationMode, setCommunicationMode] = useState<string>("sas");
  const [firmwareVersion, setFirmwareVersion] =
    useState<string>("Cloudy v1.0.4");

  // Refs for animation
  const configSectionRef = useRef<HTMLDivElement>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

  const fetchCabinetDetailsData = useCallback(async () => {
    setError(null);
    try {
      // Fetch cabinet data with date filtering
      const cabinetData = await fetchCabinetById(slug, activeMetricsFilter);
      setCabinet(cabinetData);

      // Use location name directly from cabinet data
      if (cabinetData?.locationName) {
        setLocationName(cabinetData.locationName);
      } else if (cabinetData?.locationId) {
        setLocationName("Location Not Found");
      } else {
        setLocationName("No Location Assigned");
      }

      if (cabinetData?.lastActivity) {
        const lastActive = new Date(cabinetData.lastActivity);
        setIsOnline(differenceInMinutes(new Date(), lastActive) <= 3);
      }
      setCommunicationModeFromData(cabinetData);
      setFirmwareVersionFromData(cabinetData);
    } catch {
      setCabinet(null);
      toast.error("Failed to fetch cabinet details");
    }
  }, [slug, activeMetricsFilter]);

  // Handle filter changes with debouncing
  const handleFilterChange = useCallback(
    async (newFilter: TimePeriod) => {
      if (newFilter === activeMetricsFilter) return;

      setActiveMetricsFilter(newFilter);
      setMetricsLoading(true);

      try {
        await fetchCabinetDetailsData();
      } finally {
        setMetricsLoading(false);
      }
    },
    [activeMetricsFilter, fetchCabinetDetailsData]
  );

  useEffect(() => {
    console.warn("[DEBUG] useEffect (initial fetch) running with slug:", slug);
    fetchCabinetDetailsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]); // Remove fetchCabinetDetailsData from dependencies to prevent infinite re-renders

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

  // Add animation hook for data changes
  useEffect(() => {
    // Only run in browser environment
    if (typeof document === "undefined" || !cabinet) return;

    // Animate table rows or cards when data changes
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

  // 2. SECOND: If there was an error, show error message
  if (error) {
    return (
      <CabinetDetailsErrorState
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
      <EditCabinetModal />
      <DeleteCabinetModal />

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={false}
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
                  Name:{" "}
                  {cabinet?.serialNumber ||
                    ((cabinet as Record<string, unknown>)
                      ?.origSerialNumber as string) ||
                    ((cabinet as Record<string, unknown>)
                      ?.machineId as string) ||
                    "GMID1"}
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
                {/* Show deleted status if cabinet has deletedAt field */}
                {cabinet?.deletedAt && (
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
                  Name:{" "}
                  {cabinet?.serialNumber ||
                    ((cabinet as Record<string, unknown>)
                      ?.origSerialNumber as string) ||
                    ((cabinet as Record<string, unknown>)
                      ?.machineId as string) ||
                    "GMID1"}
                </h1>
                {/* Show deleted status if cabinet has deletedAt field */}
                {cabinet?.deletedAt && (
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
                        <option value="Cloudy v1.0.4.1">Cloudy v1.0.4.1</option>
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
                          {cabinet?.smibConfig?.net?.netStaPwd || "wordsapp!23"}
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
                        <h4 className="text-sm font-medium mb-2">Connection</h4>
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

        {/* Date filtering UI */}
        <div className="mt-4 mb-2 max-w-full">
          {/* Mobile and md/lg: Select dropdown */}
          <div className="w-full xl:hidden mb-4">
            <select
              value={activeMetricsFilter}
              onChange={(e) => handleFilterChange(e.target.value as TimePeriod)}
              className="w-full md:w-48 rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              disabled={metricsLoading}
            >
              {[
                { label: "Today", value: "Today" as TimePeriod },
                { label: "Yesterday", value: "Yesterday" as TimePeriod },
                { label: "Last 7 days", value: "7d" as TimePeriod },
                { label: "30 days", value: "30d" as TimePeriod },
                { label: "All Time", value: "All Time" as TimePeriod },
              ].map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* xl and above: Desktop time period filters */}
          <div className="hidden xl:flex flex-wrap justify-center lg:justify-end gap-2 mb-4">
            {[
              { label: "Today", value: "Today" as TimePeriod },
              { label: "Yesterday", value: "Yesterday" as TimePeriod },
              { label: "Last 7 days", value: "7d" as TimePeriod },
              { label: "30 days", value: "30d" as TimePeriod },
              { label: "All Time", value: "All Time" as TimePeriod },
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
                    metricsLoading && activeMetricsFilter === filter.value
                      ? "opacity-80"
                      : ""
                  } ${
                    activeMetricsFilter === filter.value
                      ? "bg-buttonActive"
                      : "bg-button"
                  }`}
                  onClick={() => handleFilterChange(filter.value)}
                  disabled={metricsLoading}
                >
                  {metricsLoading && activeMetricsFilter === filter.value ? (
                    <span className="w-3 h-3 md:w-4 md:h-4 border-2 border-container border-t-transparent rounded-full animate-spin"></span>
                  ) : null}
                  {filter.label}
                </Button>
              </motion.div>
            ))}
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
            loading={metricsLoading}
            activeMetricsTabContent={activeMetricsTabContent}
            setActiveMetricsTabContent={setActiveMetricsTabContent}
            activeMetricsFilter={activeMetricsFilter}
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
