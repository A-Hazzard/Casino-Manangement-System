"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PageLayout from "@/components/layout/PageLayout";

import { Button } from "@/components/ui/button";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { NewCabinetModal } from "@/components/ui/cabinets/NewCabinetModal";
import { Cabinet, CabinetSortOption } from "@/lib/types/cabinets";
import { useParams, useRouter } from "next/navigation";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";
import CabinetGrid from "@/components/locationDetails/CabinetGrid";
import { Input } from "@/components/ui/input";
import gsap from "gsap";
import { RefreshButton } from "@/components/ui/RefreshButton";
import {
  fetchAllGamingLocations,
} from "@/lib/helpers/locations";
import {
  animateTableRows,
  animateSortDirection,
  animateColumnSort,
  filterAndSortCabinets as filterAndSortCabinetsUtil,
} from "@/lib/utils/ui";
import { calculateCabinetFinancialTotals } from "@/lib/utils/financial";
import CabinetCardsSkeleton from "@/components/ui/locations/CabinetCardsSkeleton";
import CabinetTableSkeleton from "@/components/ui/locations/CabinetTableSkeleton";
import type { ExtendedCabinetDetail } from "@/lib/types/pages";

import Link from "next/link";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { ChevronDown } from "lucide-react";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.slug as string;

  const { selectedLicencee, setSelectedLicencee, activeMetricsFilter } =
    useDashBoardStore();

  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabinetsLoading, setCabinetsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "All" | "Online" | "Offline"
  >("All");

  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<CabinetSortOption>("moneyIn");
  const [currentPage, setCurrentPage] = useState(0);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Add back error state
  const [error, setError] = useState<string | null>(null);

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Calculate financial totals from cabinet data
  const financialTotals = calculateCabinetFinancialTotals(allCabinets);

  // ====== Filter Cabinets by search and sort ======
  const applyFiltersAndSort = useCallback(() => {
    const filtered = filterAndSortCabinetsUtil(
      allCabinets,
      searchTerm,
      sortOption,
      sortOrder
    );
    setFilteredCabinets(filtered);
    setCurrentPage(0); // Reset to first page when filters change
  }, [allCabinets, searchTerm, sortOption, sortOrder]);

  // Consolidated data fetch - single useEffect to prevent duplicate requests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCabinetsLoading(true);
      try {
        // Check if store is properly hydrated
        if (!activeMetricsFilter) {
          // Wait a bit for store hydration
          await new Promise((resolve) => setTimeout(resolve, 100));
        }



        // Fetch locations for the selected licensee
        const formattedLocations = await fetchAllGamingLocations(
          selectedLicencee
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
        if (!foundLocation && formattedLocations.length > 0) {
          // Current location doesn't belong to new licensee, redirect to first available
          const firstLocation = formattedLocations[0];
          router.replace(`/locations/${firstLocation.id}`);
          return; // Exit early as we're redirecting
        } else if (formattedLocations.length === 0) {
          // No locations for this licensee, clear selection
          setSelectedLocation("");
          setLocationName("");
          setAllCabinets([]);
          setError("No locations found for the selected licensee.");
          return;
        }

        // Use the found location data instead of making another API call
        if (foundLocation) {
          setLocationName(foundLocation.name);
          setSelectedLocation(foundLocation.name);
        } else {
          // Fallback if location not found
          setLocationName(locationId);
          setSelectedLocation(locationId);
        }

        // Fetch cabinets data for the location
        try {
          // Ensure we have a valid activeMetricsFilter
          const timePeriod = activeMetricsFilter
            ? activeMetricsFilter
            : "today";
          console.warn(`🔍 Using timePeriod: ${timePeriod}`);

          const cabinetsData = await fetchCabinetsForLocation(
            locationId, // Always use the URL slug for cabinet fetching
            selectedLicencee,
            timePeriod, // Pass as timePeriod (3rd parameter)
            undefined // Don't pass searchTerm (4th parameter)
          );
          console.warn(`✅ Cabinets data received: ${JSON.stringify(cabinetsData)}`);
          setAllCabinets(cabinetsData);
          setError(null); // Clear any previous errors on successful fetch
        } catch (error) {
          console.error("Error fetching cabinets:", error);
          setAllCabinets([]);
          setError("Failed to fetch cabinets data.");
        }
      } finally {
        setLoading(false);
        setCabinetsLoading(false);
      }
    };

    fetchData();
  }, [locationId, selectedLicencee, activeMetricsFilter, router]);

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
    setIsFilterMenuOpen(false); // Close mobile menu on sort
  };

  // Pagination Calculations
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCabinets?.length || 0 / itemsPerPage);

  // Animation hooks for filtering and sorting
  useEffect(() => {
    if (!loading && !cabinetsLoading) {
      animateTableRows(tableRef);
    }
  }, [
    filteredCabinets,
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

    if (!allCabinets) return;

    if (status === "All") {
      setFilteredCabinets(allCabinets);
    } else if (status === "Online") {
      setFilteredCabinets(
        allCabinets.filter((cabinet) => cabinet.online === true)
      );
    } else if (status === "Offline") {
      setFilteredCabinets(
        allCabinets.filter((cabinet) => cabinet.online === false)
      );
    }
  };

  // Add a refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setCabinetsLoading(true);
    try {
      // Fetch cabinets data for the SELECTED location
      try {
        const cabinetsData = await fetchCabinetsForLocation(
          locationId, // Always use the URL slug for cabinet fetching
          selectedLicencee,
          activeMetricsFilter
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
  }, [selectedLicencee, activeMetricsFilter, locationId]);

  // Handle location change without navigation - just update the selected location
  const handleLocationChangeInPlace = (
    newLocationId: string
  ) => {
    // Navigate to the new location URL
    router.push(`/locations/${newLocationId}`);
    setIsLocationDropdownOpen(false);
  };

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
        hideLicenceeFilter={false}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >

          {/* Title Row */}
          <div className="flex items-center justify-between mt-4 w-full max-w-full">
            <div className="flex items-center gap-3 w-full">
              <Link href="/locations" className="mr-2">
                <Button
                  variant="ghost"
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Location Details
              </h1>
              <RefreshButton
                onClick={handleRefresh}
                isSyncing={refreshing}
                disabled={loading || cabinetsLoading || refreshing}
                label="Refresh"
                className="ml-auto"
              />
            </div>
          </div>

          {/* Financial Metrics Cards */}
          <div className="mt-6">
            <FinancialMetricsCards
              totals={financialTotals}
              loading={loading || cabinetsLoading}
              title={`Financial Metrics for ${locationName || "Location"}`}
            />
          </div>

          {/* Date Filters Row - Desktop and md */}
          <div className="hidden md:flex items-center justify-between mt-4 mb-0 gap-4">
            <div className="flex-1 min-w-0">
              <DashboardDateFilters
                disabled={loading || cabinetsLoading || refreshing}
                hideAllTime={true}
              />
            </div>
          </div>

          {/* Mobile/Tablet: Date Filters stacked */}
          <div className="md:hidden flex flex-col gap-4 mt-4">
            <div className="w-full">
              <DashboardDateFilters
                disabled={loading || cabinetsLoading || refreshing}
                hideAllTime={true}
              />
            </div>
          </div>

          {/* Search Row - Purple box for md and lg */}
          <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
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

            {/* Locations Dropdown */}
            <div className="relative flex-shrink-0" ref={locationDropdownRef}>
              <Button
                variant="outline"
                className={`flex items-center justify-between gap-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-100 ${
                  loading || cabinetsLoading || refreshing
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={loading || cabinetsLoading || refreshing}
                onClick={() =>
                  !(loading || cabinetsLoading || refreshing) &&
                  setIsLocationDropdownOpen(!isLocationDropdownOpen)
                }
              >
                <span className="truncate">
                  {selectedLocation || locationName || "Select Location"}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    isLocationDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              {isLocationDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 right-0">
                  <div className="max-h-60 overflow-y-auto">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          locationId === loc.id ? "bg-gray-100 font-medium" : ""
                        }`}
                        onClick={() =>
                          handleLocationChangeInPlace(loc.id)
                        }
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Search and Location Dropdown */}
          <div className="md:hidden flex flex-col gap-4 mt-4">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search machines (Asset, SMID, Serial, Game)..."
                className="w-full pr-10 bg-white border border-gray-300 rounded-full h-11 px-4 shadow-sm text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-base"
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
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            {/* Mobile: Location Dropdown */}
            <div className="relative w-full" ref={locationDropdownRef}>
              <Button
                variant="outline"
                className={`w-full flex items-center justify-between gap-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-100 ${
                  loading || cabinetsLoading || refreshing
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={loading || cabinetsLoading || refreshing}
                onClick={() =>
                  !(loading || cabinetsLoading || refreshing) &&
                  setIsLocationDropdownOpen(!isLocationDropdownOpen)
                }
              >
                <span className="truncate">
                  {selectedLocation || locationName || "Select Location"}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    isLocationDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              {isLocationDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                  <div className="max-h-60 overflow-y-auto">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          locationId === loc.id ? "bg-gray-100 font-medium" : ""
                        }`}
                        onClick={() =>
                          handleLocationChangeInPlace(loc.id)
                        }
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sort by dropdown with refresh button on mobile view */}
          <div className="mt-4 flex flex-col md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center rounded-md bg-buttonActive px-4 py-2">
                <span className="text-white text-sm mr-2">Sort by:</span>
                <div className="relative inline-block">
                  <select
                    value={sortOption}
                    onChange={(e) =>
                      handleColumnSort(e.target.value as CabinetSortOption)
                    }
                    className="appearance-none bg-buttonActive text-white border-none pr-6 text-sm font-medium focus:outline-none"
                  >
                    <option value="moneyIn">Today</option>
                    <option value="gross">Yesterday</option>
                    <option value="assetNumber">Last 7 days</option>
                    <option value="jackpot">Last 30 days</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white"
                  />
                </div>
              </div>

              <RefreshButton
                onClick={handleRefresh}
                isSyncing={refreshing}
                disabled={loading || cabinetsLoading || refreshing}
                label="Refresh"
                size="sm"
                className="px-3"
              />
            </div>
          </div>

          {/* Filter Radio Buttons - Matching image */}
          <div className="flex md:hidden mt-4 gap-4 justify-start">
            <label className="flex items-center space-x-2 cursor-pointer">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  selectedStatus === "All"
                    ? "bg-[#5119e9] border border-[#5119e9]"
                    : "bg-white border border-[#5119e9]"
                }`}
                onClick={() => handleFilterChange("All")}
              >
                {selectedStatus === "All" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700">All</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  selectedStatus === "Online"
                    ? "bg-[#5119e9] border border-[#5119e9]"
                    : "bg-white border border-[#5119e9]"
                }`}
                onClick={() => handleFilterChange("Online")}
              >
                {selectedStatus === "Online" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700">Online</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  selectedStatus === "Offline"
                    ? "bg-[#5119e9] border border-[#5119e9]"
                    : "bg-white border border-[#5119e9]"
                }`}
                onClick={() => handleFilterChange("Offline")}
              >
                {selectedStatus === "Offline" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700">Offline</span>
            </label>
          </div>

          {/* Sort and Filter buttons */}
          <div className="flex md:hidden justify-between mt-4">
            <Button
              variant="default"
              className="bg-button text-white rounded-full px-6 py-2 flex items-center gap-2"
              onClick={handleSortToggle}
            >
              <ArrowUpDown size={16} />
              <span>Sort</span>
            </Button>

            <Button
              variant="default"
              className="bg-button text-white rounded-full px-6 py-2 flex items-center gap-2"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            >
              <Filter size={16} />
              <span>Filter</span>
            </Button>

            {isFilterMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-4 z-10 mt-12 w-48 bg-white rounded-md shadow-lg border border-gray-200"
              >
                <div className="p-2 text-sm font-semibold border-b">
                  Sort by:
                </div>
                {[
                  { label: "Today", value: "moneyIn" },
                  { label: "Yesterday", value: "gross" },
                  { label: "Last 7 days", value: "assetNumber" },
                  { label: "Last 30 days", value: "jackpot" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      handleColumnSort(opt.value as CabinetSortOption)
                    }
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      sortOption === opt.value ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Content Section */}
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
                        .filter((cab) => cab.serialNumber)
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
                    <span className="text-gray-700 text-sm">
                      of {totalPages}
                    </span>
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

          {error && (
            <div className="mt-10 text-center text-red-500">{error}</div>
          )}

          <NewCabinetModal />
      </PageLayout>
    </>
  );
}
