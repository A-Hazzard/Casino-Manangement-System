"use client";

import React, { useEffect, useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { formatCurrency } from "@/lib/utils";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import { getFinancialColorClass } from "@/lib/utils/financialColors";
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat";
import Link from "next/link";
import LocationInfoSkeleton from "@/components/location/LocationInfoSkeleton";
import AccountingDetails from "@/components/cabinetDetails/AccountingDetails";
import { fetchLocationDetails, fetchCabinets } from "@/lib/helpers/locations";
import MetricsSummary from "@/components/locationDetails/MetricsSummary";
import CabinetTable from "@/components/ui/cabinets/CabinetTable";
import CabinetCard from "@/components/ui/cabinets/CabinetCard";
import { TimePeriod } from "@/lib/types/api";
import RefreshButton from "@/components/ui/RefreshButton";
import type { LocationInfo, ExtendedCabinetDetail } from "@/lib/types/pages";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { fetchLocationDetailsById } from "@/lib/helpers/locations";
// import type { GamingMachine } from "@/shared/types/entities";
type CabinetSortOption =
  | "assetNumber"
  | "locationName"
  | "moneyIn"
  | "moneyOut"
  | "jackpot"
  | "gross"
  | "cancelledCredits"
  | "game"
  | "smbId"
  | "serialNumber"
  | "lastOnline";
import { mapToCabinetProps } from "@/lib/utils/cabinet";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";

export default function LocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const {
    selectedLicencee,
    activeMetricsFilter,
    setActiveMetricsFilter,
    setSelectedLicencee,
  } = useDashBoardStore();

  const { formatAmount, shouldShowCurrency, displayCurrency } =
    useCurrencyFormat();

  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [cabinets, setCabinets] = useState<ExtendedCabinetDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCabinets, setFilteredCabinets] = useState<
    ExtendedCabinetDetail[]
  >([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Sorting state
  const [sortOption, setSortOption] = useState<CabinetSortOption>("moneyIn");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Cabinet actions store
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // State for AccountingDetails
  const [activeMetricsTabContent, setActiveMetricsTabContent] =
    useState("Range Metrics");
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [selectedCabinet, setSelectedCabinet] =
    useState<ExtendedCabinetDetail | null>(null);

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Floating refresh button state
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

  // Handle cabinet updates
  const handleCabinetUpdated = () => {
    // Refresh the data when a cabinet is updated
    handleRefresh();
  };

  // Sorting and pagination logic
  const handleColumnSort = (column: CabinetSortOption) => {
    if (sortOption === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortOption(column);
      setSortOrder("desc");
    }
  };

  const sorted = [...filteredCabinets].sort((a, b) => {
    const order = sortOrder === "desc" ? -1 : 1;
    const aValue = a[sortOption] || 0;
    const bValue = b[sortOption] || 0;
    return (aValue > bValue ? 1 : -1) * order;
  });

  const paginatedCabinets = sorted.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  // Edit and delete handlers
  const handleEdit = (cabinet: ExtendedCabinetDetail) => {
    openEditModal(cabinet);
  };

  const handleDelete = (cabinet: ExtendedCabinetDetail) => {
    openDeleteModal(cabinet);
  };

  // Transform cabinet for table props
  const transformCabinet = (cabinet: ExtendedCabinetDetail) => {
    return mapToCabinetProps(cabinet);
  };

  // Effect to handle licensee changes - refetch locations and update selection
  useEffect(() => {
    const handleLicenceeChange = async () => {
      try {
        // Check if current location exists for the new licensee by fetching location details
        const locationData = await fetchLocationDetailsById(
          slug,
          selectedLicencee
        );

        // If location data is null or the name is the slug (fallback), it means the location doesn't exist for this licensee
        if (!locationData.data || locationData.name === slug) {
          // Try to get the first available location for this licensee
          const formattedLocations = await fetchAllGamingLocations(
            selectedLicencee
          );

          if (formattedLocations.length > 0) {
            // Current location doesn't belong to new licensee, redirect to first available
            const firstLocation = formattedLocations[0];
            router.replace(`/locations/${firstLocation.id}/details`);
          } else {
            // No locations for this licensee, clear cabinets
            setCabinets([]);
            setFilteredCabinets([]);
            setSelectedCabinet(null);
          }
        }
      } catch (error) {
        console.error("Error handling licencee change:", error);
      }
    };

    // Only run if we have a licensee selected
    if (selectedLicencee) {
      handleLicenceeChange();
    }
  }, [selectedLicencee, router, slug]);

  // Use helpers to fetch data
  useEffect(() => {
    // Only proceed if we have a valid activeMetricsFilter - no fallback
    if (!activeMetricsFilter) {
      console.warn(
        "⚠️ No activeMetricsFilter available in location details, skipping data fetch"
      );
      setCabinets([]);
      setFilteredCabinets([]);
      setSelectedCabinet(null);
      setMetricsLoading(false);
      return;
    }

    setMetricsLoading(true);

    const initializePage = async () => {
      try {
        // Fetch location details and cabinets in parallel
        const [location, cabinets] = await Promise.all([
          fetchLocationDetails(slug, selectedLicencee, displayCurrency),
          fetchCabinets(
            slug,
            activeMetricsFilter,
            selectedLicencee,
            displayCurrency
          ),
        ]);

        if (location) setLocationInfo(location);
        setCabinets(cabinets);
        setFilteredCabinets(cabinets);
        setSelectedCabinet(cabinets[0] || null);
      } catch (error) {
        console.error("Error initializing page:", error);
        // Set empty arrays on error to prevent loading states
        setCabinets([]);
        setFilteredCabinets([]);
        setSelectedCabinet(null);
      } finally {
        setMetricsLoading(false);
      }
    };

    initializePage();
  }, [slug, activeMetricsFilter, selectedLicencee, displayCurrency]);

  // Add refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    setMetricsLoading(true);
    try {
      // Only proceed if we have a valid activeMetricsFilter - no fallback
      if (!activeMetricsFilter) {
        console.warn(
          "⚠️ No activeMetricsFilter available during refresh in location details, skipping data fetch"
        );
        setCabinets([]);
        setFilteredCabinets([]);
        setSelectedCabinet(null);
        setMetricsLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch location details and cabinets in parallel
      const [location, cabinets] = await Promise.all([
        fetchLocationDetails(slug, selectedLicencee, displayCurrency),
        fetchCabinets(
          slug,
          activeMetricsFilter,
          selectedLicencee,
          displayCurrency
        ),
      ]);

      if (location) setLocationInfo(location);
      setCabinets(cabinets);
      setFilteredCabinets(cabinets);
      setSelectedCabinet(cabinets[0] || null);
    } catch (error) {
      console.error("Error refreshing data:", error);
      // Set empty arrays on error to prevent loading states
      setCabinets([]);
      setFilteredCabinets([]);
      setSelectedCabinet(null);
    } finally {
      setMetricsLoading(false);
      setRefreshing(false);
    }
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

  // Utility function for proper alphabetical and numerical sorting
  const sortMachinesAlphabetically = (machines: ExtendedCabinetDetail[]) => {
    return machines.sort((a, b) => {
      const nameA = (
        a.assetNumber ||
        a.smbId ||
        a.serialNumber ||
        ""
      ).toString();
      const nameB = (
        b.assetNumber ||
        b.smbId ||
        b.serialNumber ||
        ""
      ).toString();

      // Extract the base name and number parts
      const matchA = nameA.match(/^(.+?)(\d+)?$/);
      const matchB = nameB.match(/^(.+?)(\d+)?$/);

      if (!matchA || !matchB) {
        return nameA.localeCompare(nameB);
      }

      const [, baseA, numA] = matchA;
      const [, baseB, numB] = matchB;

      // First compare the base part alphabetically
      const baseCompare = baseA.localeCompare(baseB);
      if (baseCompare !== 0) {
        return baseCompare;
      }

      // If base parts are the same, compare numerically
      const numAInt = numA ? parseInt(numA, 10) : 0;
      const numBInt = numB ? parseInt(numB, 10) : 0;

      return numAInt - numBInt;
    });
  };

  // Handle search filtering
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCabinets(cabinets);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = cabinets.filter(
        (cabinet) =>
          cabinet.assetNumber?.toLowerCase().includes(searchLower) ||
          cabinet.smbId?.toLowerCase().includes(searchLower) ||
          cabinet.serialNumber?.toLowerCase().includes(searchLower) ||
          cabinet.game?.toLowerCase().includes(searchLower) ||
          cabinet.locationName?.toLowerCase().includes(searchLower)
      );

      // Sort the filtered cabinets alphabetically and numerically
      const sortedFiltered = sortMachinesAlphabetically(filtered);
      setFilteredCabinets(sortedFiltered);
    }
  }, [searchTerm, cabinets]);

  return (
    <>
      <EditCabinetModal onCabinetUpdated={handleCabinetUpdated} />
      <DeleteCabinetModal />

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: metricsLoading || refreshing,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={false}
        mainClassName="flex flex-col flex-1 p-4 md:p-6 w-full max-w-full overflow-x-hidden"
        showToaster={false}
      >
        <div className="flex items-center mb-6">
          <Link href="/locations" className="mr-4">
            <Button
              variant="ghost"
              className="p-2 rounded-full border border-gray-200 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Location Details</h1>
          <div className="ml-auto">
            <RefreshButton
              onClick={handleRefresh}
              isSyncing={refreshing}
              disabled={metricsLoading || refreshing}
              label="Refresh"
            />
          </div>
        </div>

        {/* Time Period Filter Buttons */}
        <div className="mb-6 overflow-x-auto hide-scrollbar">
          <div className="flex flex-wrap gap-2 min-w-max">
            {[
              { label: "Today", value: "Today" as TimePeriod },
              { label: "Yesterday", value: "Yesterday" as TimePeriod },
              { label: "Last 7 days", value: "7d" as TimePeriod },
              { label: "30 days", value: "30d" as TimePeriod },
              { label: "All Time", value: "All Time" as TimePeriod },
            ].map((filter) => (
              <Button
                key={filter.value}
                onClick={() => setActiveMetricsFilter(filter.value)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  activeMetricsFilter === filter.value
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-button/90"
                }`}
                disabled={metricsLoading}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {locationInfo ? (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Location Information
                </h2>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {locationInfo.name}
                  </p>
                  <p>
                    <span className="font-medium">Address:</span>{" "}
                    {locationInfo.address || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Licensee:</span>{" "}
                    {locationInfo.licencee || "-"}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Metrics</h2>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Total Cabinets</p>
                    <p className="text-lg font-semibold">
                      {cabinets?.length || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Money In</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationInfo.moneyIn
                      )}`}
                    >
                      {shouldShowCurrency()
                        ? formatAmount(
                            locationInfo.moneyIn || 0,
                            displayCurrency
                          )
                        : formatCurrency(locationInfo.moneyIn || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Money Out</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationInfo.moneyOut
                      )}`}
                    >
                      {shouldShowCurrency()
                        ? formatAmount(
                            locationInfo.moneyOut || 0,
                            displayCurrency
                          )
                        : formatCurrency(locationInfo.moneyOut || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Performance</h2>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Gross</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationInfo.gross
                      )}`}
                    >
                      {formatCurrency(locationInfo.gross || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Net</p>
                    <p
                      className={`text-lg font-semibold ${getFinancialColorClass(
                        locationInfo.net
                      )}`}
                    >
                      {formatCurrency(locationInfo.net || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Cabinet Status</h2>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Online Cabinets</p>
                    <p className="text-lg font-semibold">
                      {cabinets?.filter((cabinet) => cabinet.isOnline).length ||
                        0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Offline Cabinets</p>
                    <p className="text-lg font-semibold">
                      {cabinets?.filter((cabinet) => !cabinet.isOnline)
                        .length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!locationInfo && <LocationInfoSkeleton />}

        {!locationInfo && (
          <MetricsSummary location={locationInfo} cabinets={cabinets} />
        )}
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
          <div className="relative flex-1 max-w-md min-w-0">
            <input
              type="text"
              placeholder="Search machines..."
              className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Cabinet Table and Cards - Exact same as cabinets page */}
        {filteredCabinets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
            <div className="text-gray-500 text-lg mb-2">No Data Available</div>
            <div className="text-gray-400 text-sm text-center">
              {searchTerm
                ? "No cabinets match your search criteria."
                : "No cabinets available for this location."}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View with green header and border styling */}
            <div className="hidden md:block">
              <CabinetTable
                data={paginatedCabinets.map(transformCabinet)}
                loading={metricsLoading}
                sortOption={sortOption}
                sortOrder={sortOrder}
                onSort={(column) =>
                  handleColumnSort(column as CabinetSortOption)
                }
                onPageChange={setCurrentPage}
                onEdit={(cabinetProps) => {
                  // Find the original cabinet
                  const cabinet = paginatedCabinets.find(
                    (c) => c._id === cabinetProps._id
                  );
                  if (cabinet) handleEdit(cabinet);
                }}
                onDelete={(cabinetProps) => {
                  // Find the original cabinet
                  const cabinet = paginatedCabinets.find(
                    (c) => c._id === cabinetProps._id
                  );
                  if (cabinet) handleDelete(cabinet);
                }}
              />
            </div>

            {/* Mobile Card View - Only show on small screens */}
            <div className="block md:hidden mt-4 px-1 sm:px-2 space-y-3 sm:space-y-4 w-full max-w-full">
              {paginatedCabinets.map((cabinet) => (
                <CabinetCard
                  key={cabinet._id}
                  _id={cabinet._id}
                  assetNumber={cabinet.assetNumber || ""}
                  game={cabinet.game || ""}
                  smbId={
                    cabinet.smbId || cabinet.smibBoard || cabinet.relayId || ""
                  }
                  serialNumber={getSerialNumberIdentifier(cabinet)}
                  locationId={cabinet.locationId || ""}
                  locationName={cabinet.locationName || ""}
                  moneyIn={cabinet.moneyIn || 0}
                  moneyOut={cabinet.moneyOut || 0}
                  cancelledCredits={cabinet.moneyOut || 0}
                  jackpot={cabinet.jackpot || 0}
                  gross={cabinet.gross || 0}
                  lastOnline={
                    cabinet.lastOnline instanceof Date
                      ? cabinet.lastOnline.toISOString()
                      : typeof cabinet.lastOnline === "string"
                      ? cabinet.lastOnline
                      : undefined
                  }
                  installedGame={cabinet.installedGame || cabinet.game || ""}
                  onEdit={() => handleEdit(cabinet)}
                  onDelete={() => handleDelete(cabinet)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <DoubleArrowLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-gray-700 text-sm">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage + 1}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > totalPages) val = totalPages;
                    setCurrentPage(val - 1);
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                  aria-label="Page number"
                />
                <span className="text-gray-700 text-sm">of {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={currentPage === totalPages - 1}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages - 1)}
                  disabled={currentPage === totalPages - 1}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <DoubleArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {selectedCabinet && (
          <AccountingDetails
            cabinet={selectedCabinet}
            loading={metricsLoading}
            activeMetricsTabContent={activeMetricsTabContent}
            setActiveMetricsTabContent={setActiveMetricsTabContent}
            activeMetricsFilter="All Time"
          />
        )}

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
