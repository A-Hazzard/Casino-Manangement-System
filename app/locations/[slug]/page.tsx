"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { NoLicenseeAssigned } from "@/components/ui/NoLicenseeAssigned";

import { Button } from "@/components/ui/button";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { NewCabinetModal } from "@/components/ui/cabinets/NewCabinetModal";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";
import type { GamingMachine as Cabinet } from "@/shared/types/entities";
import { useParams, useRouter } from "next/navigation";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";
import CabinetGrid from "@/components/locationDetails/CabinetGrid";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import gsap from "gsap";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { ActionButtonSkeleton } from "@/components/ui/skeletons/ButtonSkeletons";
import LocationSingleSelect from "@/components/ui/common/LocationSingleSelect";
import {
  animateSortDirection,
  animateColumnSort,
  filterAndSortCabinets as filterAndSortCabinetsUtil,
} from "@/lib/utils/ui";
import { calculateCabinetFinancialTotals } from "@/lib/utils/financial";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import CabinetCardsSkeleton from "@/components/ui/locations/CabinetCardsSkeleton";
import CabinetTableSkeleton from "@/components/ui/locations/CabinetTableSkeleton";
import type { ExtendedCabinetDetail } from "@/lib/types/pages";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import NotFoundError from "@/components/ui/errors/NotFoundError";

import Link from "next/link";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import MachineStatusWidget from "@/components/ui/MachineStatusWidget";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";
import { useUserStore } from "@/lib/store/userStore";
import { shouldShowNoLicenseeMessage } from "@/lib/utils/licenseeAccess";

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

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.slug as string;

  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  
  const user = useUserStore(state => state.user);
  const isAdminUser = Boolean(
    user?.roles?.some(role => role === 'admin' || role === 'developer')
  );

  // State for tracking date filter initialization
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);

  // Detect when date filter is properly initialized
  useEffect(() => {
    if (activeMetricsFilter && !dateFilterInitialized) {
      setDateFilterInitialized(true);
    }
  }, [activeMetricsFilter, dateFilterInitialized]);

  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabinetsLoading, setCabinetsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "All" | "Online" | "Offline"
  >("All");
  const [selectedGameType, setSelectedGameType] = useState<string>("all");

  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<CabinetSortOption>("moneyIn");
  const [currentPage, setCurrentPage] = useState(0);

  const tableRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Add back error state
  const [error, setError] = useState<string | null>(null);

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Calculate financial totals from cabinet data
  const financialTotals = calculateCabinetFinancialTotals(allCabinets);

  // Calculate machine status from cabinet data
  const machineStats = {
    onlineMachines: allCabinets.filter((cabinet) => cabinet.online === true)
      .length,
    offlineMachines: allCabinets.filter((cabinet) => cabinet.online === false)
      .length,
  };

  // Extract game types from cabinets
  const gameTypes = useMemo(() => {
    const uniqueGameTypes = Array.from(
      new Set(
        allCabinets
          .map((cabinet) => cabinet.game || cabinet.installedGame)
          .filter((game) => game && game.trim() !== "")
      )
    ).sort();
    return uniqueGameTypes;
  }, [allCabinets]);

  // ====== Filter Cabinets by search and sort ======
  const applyFiltersAndSort = useCallback(() => {
    let filtered = filterAndSortCabinetsUtil(
      allCabinets,
      searchTerm,
      sortOption,
      sortOrder
    );
    
    // Apply game type filter
    if (selectedGameType && selectedGameType !== "all") {
      filtered = filtered.filter((cabinet) => {
        const cabinetGame = cabinet.game || cabinet.installedGame;
        return cabinetGame === selectedGameType;
      });
    }
    
    // Apply status filter
    if (selectedStatus && selectedStatus !== "All") {
      filtered = filtered.filter((cabinet) => {
        if (selectedStatus === "Online") {
          return cabinet.online === true;
        } else if (selectedStatus === "Offline") {
          return cabinet.online === false;
        }
        return true;
      });
    }
    
    setFilteredCabinets(filtered);
    setCurrentPage(0); // Reset to first page when filters change
  }, [allCabinets, searchTerm, sortOption, sortOrder, selectedStatus, selectedGameType]);

  // Consolidated data fetch - single useEffect to prevent duplicate requests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCabinetsLoading(true);
      try {
        // Only proceed if we have a valid activeMetricsFilter and it's been properly initialized
        if (!activeMetricsFilter || !dateFilterInitialized) {
          setAllCabinets([]);
          setError("No time period filter selected");
          setLoading(false);
          setCabinetsLoading(false);
          return;
        }

        // Fetch locations for the selected licensee
        const formattedLocations = await fetchAllGamingLocations(
          isAdminUser ? 'all' : selectedLicencee
        );
        setLocations(formattedLocations);

        // Find the current location in the licensee's locations
        const currentLocation = formattedLocations.find(
          (loc) => loc.id === locationId
        );

        // Also check with toString() in case of ObjectId issues
        const currentLocationAlt = formattedLocations.find(
          (loc) => loc.id.toString() === locationId
        );

        // Use the first match found
        const foundLocation = currentLocation || currentLocationAlt;

        // Check if current location exists in new licensee's locations
        let shouldBypassLicenseeFilter = isAdminUser;

        if (!foundLocation) {
          // Location doesn't exist for this licensee, try to find it in all locations
          console.warn(
            `Location ${locationId} not found for licensee ${selectedLicencee}, trying all locations...`
          );

          // Try fetching all locations to find this specific location
          const allLocations = await fetchAllGamingLocations("all");
          const locationInAllLocations = allLocations.find(
            (loc) => loc.id === locationId || loc.id.toString() === locationId
          );

          if (locationInAllLocations) {
            // Location exists but belongs to a different licensee
            console.warn(
              `Location found in all locations, but belongs to different licensee than ${selectedLicencee}`
            );
            console.warn(
              "Setting location from all locations:",
              locationInAllLocations.name
            );
            setLocationName(locationInAllLocations.name);
            setSelectedLocationId(locationInAllLocations.id);

            // Set a flag to indicate we should bypass licensee filtering for API calls
            shouldBypassLicenseeFilter = true;
            setError(
              "Location belongs to different licensee - showing limited data"
            );
          } else {
            // Location truly doesn't exist
            setSelectedLocationId("");
            setLocationName("");
            setAllCabinets([]);
            setError("Location not found");
            setLoading(false);
            setCabinetsLoading(false);
            return;
          }
        } else if (formattedLocations.length === 0) {
          // No locations for this licensee, clear selection
          setSelectedLocationId("");
          setLocationName("");
          setAllCabinets([]);
          setError("No locations found for the selected licensee.");
          return;
        }

        // Use the found location data instead of making another API call
        if (foundLocation) {
          console.warn(
            "Setting location from found location:",
            foundLocation.name
          );
          setLocationName(foundLocation.name);
          setSelectedLocationId(foundLocation.id);
        } else if (shouldBypassLicenseeFilter) {
          // Location was found in all locations but belongs to different licensee
          // selectedLocationId and locationName were already set above
          console.warn(
            "Using location from all locations due to licensee mismatch"
          );
        } else {
          // Fallback if location truly not found - use a more descriptive name
          const fallbackName = `Unknown Location (${locationId})`;
          console.warn("Using fallback location name:", fallbackName);
          setLocationName(fallbackName);
          setSelectedLocationId(locationId);
        }

        // Fetch cabinets data for the location
        try {
          // Only fetch if we have a valid activeMetricsFilter - no fallback
          if (!activeMetricsFilter) {
            setAllCabinets([]);
            setError("No time period filter selected");
            return;
          }

          // Check if we should bypass licensee filtering (location belongs to different licensee)
          const licenseeForCabinets = shouldBypassLicenseeFilter
            ? undefined
            : selectedLicencee;

          const cabinetsData = await fetchCabinetsForLocation(
            locationId, // Always use the URL slug for cabinet fetching
            licenseeForCabinets, // Use undefined if location belongs to different licensee
            activeMetricsFilter, // Pass the selected filter directly
            undefined, // Don't pass searchTerm (4th parameter)

            activeMetricsFilter === "Custom" && customDateRange
              ? { from: customDateRange.startDate, to: customDateRange.endDate }
              : undefined // Only pass customDateRange when filter is "Custom"
          );
          setAllCabinets(cabinetsData);

          // Clear error only if we successfully fetched data or if it's a licensee mismatch
          if (shouldBypassLicenseeFilter) {
            setError(
              "Location belongs to different licensee - showing limited data"
            );
          } else {
            setError(null);
          }
        } catch (error) {
          // Error handling for cabinet data fetch
          if (process.env.NODE_ENV === "development") {
            console.error("Error fetching cabinets:", error);
          }
          setAllCabinets([]);
          setError("Failed to fetch cabinets data.");
        }
      } finally {
        setLoading(false);
        setCabinetsLoading(false);
      }
    };

    fetchData();
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    router,
    isAdminUser,
  ]);

  // Effect to re-run filtering and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // ====== Sorting / Pagination Logic ======
  const handleSortToggle = () => {
    animateSortDirection(sortOrder);
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const handleColumnSort = (column: CabinetSortOption) => {
    animateColumnSort(tableRef, column);

    if (sortOption === column) {
      handleSortToggle();
    } else {
      setSortOption(column);
      setSortOrder("desc"); // Default to desc when changing column
    }
  };

  // Pagination Calculations
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCabinets?.length || 0 / itemsPerPage);

  // Animation hooks for filtering and sorting
  useEffect(() => {
    if (!loading && !cabinetsLoading && filteredCabinets.length > 0) {
      // Small delay to ensure DOM is updated before animation
      const timeoutId = setTimeout(() => {
        if (tableRef.current) {
          // Try to animate table rows (for desktop view)
          const tableRows = tableRef.current.querySelectorAll('tbody tr');
          if (tableRows.length > 0) {
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
          }
          
          // Try to animate cards (for mobile view)
          const cardsContainer = tableRef.current.querySelector('.grid');
          if (cardsContainer) {
            const cards = Array.from(cardsContainer.children);
            if (cards.length > 0) {
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
            }
          }
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [
    filteredCabinets,
    selectedStatus,
    selectedGameType,
    searchTerm,
    sortOption,
    sortOrder,
    currentPage,
    loading,
    cabinetsLoading,
  ]);

  const handleFirstPage = () => setCurrentPage(0);
  const handleLastPage = () => setCurrentPage(totalPages - 1);
  const handlePrevPage = () =>
    currentPage > 0 && setCurrentPage(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage(currentPage + 1);

  // ====== Event Handlers ======
  const handleFilterChange = (status: "All" | "Online" | "Offline") => {
    setSelectedStatus(status);
    // Status filter is now handled in applyFiltersAndSort
  };

  // Add a refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setCabinetsLoading(true);
    try {
      // Fetch cabinets data for the SELECTED location
      try {
        // Only fetch if we have a valid activeMetricsFilter and it's been properly initialized
        if (!activeMetricsFilter || !dateFilterInitialized) {
          setAllCabinets([]);
          setError("No time period filter selected");
          return;
        }

        const cabinetsData = await fetchCabinetsForLocation(
          locationId, // Always use the URL slug for cabinet fetching
          selectedLicencee,
          activeMetricsFilter,
          undefined, // Don't pass searchTerm

          activeMetricsFilter === "Custom" && customDateRange
            ? { from: customDateRange.startDate, to: customDateRange.endDate }
            : undefined // Only pass customDateRange when filter is "Custom"
        );
        setAllCabinets(cabinetsData);
        setError(null); // Clear any previous errors on successful refresh
      } catch {
        setAllCabinets([]);
        setError("Failed to refresh cabinets. Please try again later.");
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
      setCabinetsLoading(false);
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    locationId,
  ]);

  // Handle location change without navigation - just update the selected location
  const handleLocationChangeInPlace = (newLocationId: string) => {
    if (newLocationId === "all") {
      setSelectedLocationId("all");
      router.push("/locations");
      return;
    }

    setSelectedLocationId(newLocationId);
    router.push(`/locations/${newLocationId}`);
  };

  const { openCabinetModal } = useNewCabinetStore();

  const locationSelectOptions = useMemo(
    () => locations.map(loc => ({ id: loc.id, name: loc.name })),
    [locations]
  );
  const showLocationSelect = locationSelectOptions.length > 1;

  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: loading || cabinetsLoading || refreshing,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        {/* Header Section: Title, back button, and action buttons */}
        <div className="mt-4 w-full max-w-full">
          {/* Mobile Layout (below sm) */}
          <div className="sm:hidden">
            {/* Back button, title, and action icons aligned */}
            <div className="flex items-center gap-2">
              <Link href="/locations">
                <Button
                  variant="ghost"
                  className="p-1.5 h-8 w-8 rounded-full border border-gray-200 hover:bg-gray-100 flex-shrink-0"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-bold text-gray-800 flex-1 min-w-0 truncate flex items-center gap-2">
                Location Details
                <Image
                  src={IMAGES.locationIcon}
                  alt="Location Icon"
                  width={32}
                  height={32}
                  className="w-4 h-4 flex-shrink-0"
                />
              </h1>
              {/* Refresh icon */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
              {/* Create icon */}
              {loading || cabinetsLoading ? (
                <div className="h-4 w-4 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => openCabinetModal(locationId)}
                  disabled={refreshing}
                  className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  aria-label="Create Machine"
                >
                  <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Layout (sm and above) */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-3 w-full">
              <Link href="/locations" className="mr-2">
                <Button
                  variant="ghost"
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex-1 min-w-0 truncate flex items-center gap-2">
                Location Details
                <Image
                  src={IMAGES.locationIcon}
                  alt="Location Icon"
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
                />
              </h1>
              {/* Mobile: Refresh icon */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            {/* Desktop: Refresh icon and Create button on far right */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-4">
              {/* Refresh icon */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
              {loading || cabinetsLoading ? (
                <ActionButtonSkeleton width="w-36" showIcon={false} />
              ) : (
                <Button
                  variant="default"
                  className="bg-button text-white"
                  disabled={refreshing}
                  onClick={() => openCabinetModal(locationId)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Machine
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Financial Metrics Section: Location-specific financial overview */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={financialTotals}
            loading={loading || cabinetsLoading}
            title={`Financial Metrics for ${locationName || "Location"}`}
            disableCurrencyConversion={true}
          />
        </div>

        {/* Date Filters and Machine Status Section: Responsive layout for filters and status */}
        <div className="mt-4">
          {/* Desktop and md: Side by side layout */}
          <div className="hidden md:flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DashboardDateFilters
                disabled={loading || cabinetsLoading || refreshing}
                onCustomRangeGo={handleRefresh}
                hideAllTime={false}
                enableTimeInputs={true}
              />
            </div>
            <div className="flex-shrink-0 ml-4 w-auto">
              <MachineStatusWidget
                isLoading={loading || cabinetsLoading}
                onlineCount={machineStats.onlineMachines}
                offlineCount={machineStats.offlineMachines}
              />
            </div>
          </div>

          {/* Mobile: Stacked layout */}
          <div className="md:hidden flex flex-col gap-4">
            <div className="w-full">
              <DashboardDateFilters
                disabled={loading || cabinetsLoading || refreshing}
                onCustomRangeGo={handleRefresh}
                hideAllTime={false}
                enableTimeInputs={true}
              />
            </div>
            <div className="w-full">
              <MachineStatusWidget
                isLoading={loading || cabinetsLoading}
                onlineCount={machineStats.onlineMachines}
                offlineCount={machineStats.offlineMachines}
              />
            </div>
          </div>
        </div>

        {/* Search and Location Selection Section: Desktop search bar with location dropdown */}
        <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive mt-4">
          <div className="relative flex-1 max-w-md min-w-0">
            <Input
              type="text"
              placeholder="Search machines (Asset, SMID, Serial, Game)..."
              className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
              value={searchTerm}
              disabled={loading || cabinetsLoading || refreshing}
              onChange={(e) => {
                if (loading || cabinetsLoading || refreshing) return;
                setSearchTerm(e.target.value);

                // Highlight matched items when searching
                if (tableRef.current && e.target.value.trim() !== "") {
                  // Add a subtle highlight pulse animation
                  gsap.to(tableRef.current, {
                    backgroundColor: "rgba(59, 130, 246, 0.05)",
                    duration: 0.2,
                    onComplete: () => {
                      gsap.to(tableRef.current, {
                        backgroundColor: "transparent",
                        duration: 0.5,
                      });
                    },
                  });
                }
              }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          {showLocationSelect && (
            <div className="w-auto min-w-[220px] max-w-[260px]">
              <LocationSingleSelect
                locations={locationSelectOptions}
                selectedLocation={selectedLocationId || locationId}
                onSelectionChange={handleLocationChangeInPlace}
                includeAllOption={true}
                allOptionLabel="All Locations"
                showSasBadge={false}
              />
            </div>
          )}

          {/* Game Type Filter */}
          <CustomSelect
            value={selectedGameType}
            onValueChange={setSelectedGameType}
            options={[
              { value: "all", label: "All Games" },
              ...gameTypes
                .filter((gameType): gameType is string => !!gameType)
                .map((gameType) => ({
                  value: gameType,
                  label: gameType,
                })),
            ]}
            placeholder="All Games"
            className="w-auto min-w-[180px] max-w-[200px]"
            triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm truncate"
            searchable={true}
            emptyMessage="No game types found"
          />

          {/* Status Filter */}
          <CustomSelect
            value={selectedStatus}
            onValueChange={(value) =>
              handleFilterChange(value as "All" | "Online" | "Offline")
            }
            options={[
              { value: "All", label: "All Machines" },
              { value: "Online", label: "Online" },
              { value: "Offline", label: "Offline" },
            ]}
            placeholder="All Status"
            className="w-auto min-w-[140px] max-w-[150px]"
            triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm truncate"
            searchable={true}
            emptyMessage="No status options found"
          />
        </div>

        {/* Mobile: Horizontal scrollable filters - Same layout as cabinets page */}
        <div className="md:hidden mt-4">
          {/* Search Input - Full width */}
          <div className="relative mb-3 w-full">
            <Input
              type="text"
              placeholder="Search machines..."
              className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={(e) => {
                if (loading || cabinetsLoading || refreshing) return;
                setSearchTerm(e.target.value);

                // Highlight matched items when searching
                if (tableRef.current && e.target.value.trim() !== "") {
                  gsap.to(tableRef.current, {
                    backgroundColor: "rgba(59, 130, 246, 0.05)",
                    duration: 0.2,
                    onComplete: () => {
                      gsap.to(tableRef.current, {
                        backgroundColor: "transparent",
                        duration: 0.5,
                      });
                    },
                  });
                }
              }}
              disabled={loading || cabinetsLoading || refreshing}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filters - Horizontal scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="flex gap-2 min-w-max">
              {showLocationSelect && (
                <div className="w-40 flex-shrink-0">
                  <LocationSingleSelect
                    locations={locationSelectOptions}
                    selectedLocation={selectedLocationId || locationId}
                    onSelectionChange={handleLocationChangeInPlace}
                    includeAllOption={true}
                    allOptionLabel="All Locations"
                    showSasBadge={false}
                    className="w-full"
                  />
                </div>
              )}
              <div className="w-36 flex-shrink-0 relative">
                <CustomSelect
                  value={selectedGameType}
                  onValueChange={setSelectedGameType}
                  options={[
                    { value: "all", label: "All Games" },
                    ...gameTypes
                      .filter((gameType): gameType is string => !!gameType)
                      .map((gameType) => ({
                        value: gameType,
                        label: gameType,
                      })),
                  ]}
                  placeholder="All Games"
                  className="w-full"
                  triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                  searchable={true}
                  emptyMessage="No game types found"
                />
                </div>
              <div className="w-32 flex-shrink-0 relative">
                <CustomSelect
                  value={selectedStatus}
                  onValueChange={(value) =>
                    handleFilterChange(value as "All" | "Online" | "Offline")
                  }
                  options={[
                    { value: "All", label: "All Machines" },
                    { value: "Online", label: "Online" },
                    { value: "Offline", label: "Offline" },
                  ]}
                  placeholder="All Status"
                  className="w-full"
                  triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                  searchable={true}
                  emptyMessage="No status options found"
                />
              </div>
              <div className="w-40 flex-shrink-0 relative">
                <CustomSelect
                  value={`${sortOption}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [option, order] = value.split("-");
                    handleColumnSort(option as CabinetSortOption);
                    setSortOrder(order as "asc" | "desc");
                  }}
                  options={[
                    { value: "moneyIn-desc", label: "Money In (Highest First)" },
                    { value: "moneyIn-asc", label: "Money In (Lowest First)" },
                    { value: "moneyOut-desc", label: "Money Out (Highest First)" },
                    { value: "moneyOut-asc", label: "Money Out (Lowest First)" },
                    { value: "gross-desc", label: "Gross Revenue (Highest First)" },
                    { value: "gross-asc", label: "Gross Revenue (Lowest First)" },
                    { value: "jackpot-desc", label: "Jackpot (Highest First)" },
                    { value: "jackpot-asc", label: "Jackpot (Lowest First)" },
                    { value: "assetNumber-asc", label: "Asset Number (A to Z)" },
                    { value: "assetNumber-desc", label: "Asset Number (Z to A)" },
                    { value: "locationName-asc", label: "Location (A to Z)" },
                    { value: "locationName-desc", label: "Location (Z to A)" },
                    { value: "lastOnline-desc", label: "Last Online (Most Recent)" },
                    { value: "lastOnline-asc", label: "Last Online (Oldest First)" },
                  ]}
                  placeholder="Sort by"
                  className="w-full"
                  triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
                  searchable={true}
                  emptyMessage="No sort options found"
            />
          </div>
        </div>
            </div>
            </div>


        {/* Content Section: Main cabinet data display with responsive layouts */}
        <div className="flex-1 w-full">
          {loading || cabinetsLoading ? (
            <>
              {/* Use CabinetTableSkeleton for lg+ only */}
              <div className="hidden lg:block">
                <CabinetTableSkeleton />
              </div>
              {/* Use CabinetCardsSkeleton for mobile and tablet (up to md) */}
              <div className="block lg:hidden">
                <CabinetCardsSkeleton />
              </div>
            </>
          ) : filteredCabinets.length === 0 ? (
            <div className="mt-10 text-center text-gray-500">
              No cabinets found{searchTerm ? " matching your search" : ""}.
            </div>
          ) : filteredCabinets == null ? (
            <div className="mt-10 text-center text-gray-500">
              Loading cabinets...
            </div>
          ) : (
            <>
              <div ref={tableRef}>
                <CabinetGrid
                  filteredCabinets={
                    filteredCabinets
                      .filter((cab) => getSerialNumberIdentifier(cab) !== "N/A")
                      .map((cab) => ({
                        ...cab,
                        isOnline: cab.online,
                      })) as ExtendedCabinetDetail[]
                  }
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  router={router}
                />
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6 pb-6">
                  <Button
                    onClick={handleFirstPage}
                    disabled={currentPage === 0}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
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
                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                    aria-label="Page number"
                  />
                  <span className="text-gray-700 text-sm">of {totalPages}</span>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages - 1}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages - 1}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {error === "Location not found" ? (
          <NotFoundError
            title="Location Not Found"
            message={`The location with ID "${locationId}" could not be found for the selected licensee.`}
            resourceType="location"
            showRetry={false}
            customBackText="Back to Locations"
            customBackHref="/locations"
          />
        ) : error ? (
          <div className="mt-10 text-center text-red-500">{error}</div>
        ) : null}

        <NewCabinetModal
          currentLocationName={locationName}
          onCreated={handleRefresh}
        />
      </PageLayout>

      {/* Cabinet Action Modals */}
      <EditCabinetModal onCabinetUpdated={handleRefresh} />
      <DeleteCabinetModal onCabinetDeleted={handleRefresh} />
    </>
  );
}
