"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { NewCabinetModal } from "@/components/ui/cabinets/NewCabinetModal";
import { Cabinet, CabinetSortOption } from "@/lib/types/cabinets";
import { useParams, useRouter, usePathname } from "next/navigation";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import CabinetGrid from "@/components/locationDetails/CabinetGrid";
import { Input } from "@/components/ui/input";
import gsap from "gsap";
import { RefreshButton } from "@/components/ui/RefreshButton";
import {
  fetchAllGamingLocations,
  fetchLocationDetailsById,
} from "@/lib/helpers/locations";
import {
  animateTableRows,
  animateSortDirection,
  animateColumnSort,
  filterAndSortCabinets as filterAndSortCabinetsUtil,
} from "@/lib/utils/ui";
import CabinetCardsSkeleton from "@/components/ui/locations/CabinetCardsSkeleton";
import CabinetTableSkeleton from "@/components/ui/locations/CabinetTableSkeleton";
import type { ExtendedCabinetDetail } from "@/lib/types/pages";
import {
  handleBackToLocations,
  handleLocationChange,
} from "@/lib/helpers/locationPage";

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.slug as string;
  const pathname = usePathname();

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
  const [selectedLocation, setSelectedLocation] =
    useState<string>("All Locations");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Add back error state
  const [error, setError] = useState<string | null>(null);

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // To prevent double fetch on initial load
  const hasFetchedOnce = useRef(false);

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

  // Use useEffect to update selectedLocation when locationName changes
  useEffect(() => {
    if (locationName) {
      setSelectedLocation(locationName);
    }
  }, [locationName]);

  // Consolidated data fetch - single useEffect to prevent duplicate requests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCabinetsLoading(true);
      try {
        // On initial load, fetch locations only ONCE
        if (!hasFetchedOnce.current) {
          try {
            const formattedLocations = await fetchAllGamingLocations();
            setLocations(formattedLocations);
          } catch {
            setError("Failed to load locations. Please try again later.");
          }
          hasFetchedOnce.current = true;
        }

        // Fetch location details
        try {
          const locationData = await fetchLocationDetailsById(locationId);
          setLocationName(locationData.name);
        } catch {
          setLocationName("Location"); // Default name on error
          setError("Failed to load location details. Please try again later.");
        }

        // Fetch cabinets data
        try {
          const cabinetsData = await fetchCabinetsForLocation(
            locationId,
            selectedLicencee,
            activeMetricsFilter
          );
          setAllCabinets(cabinetsData);
        } catch {
          setAllCabinets([]);
          setError("Failed to load cabinets. Please try again later.");
        }
      } finally {
        setLoading(false);
        setCabinetsLoading(false);
      }
    };

    fetchData();
  }, [locationId, selectedLicencee, activeMetricsFilter]);

  // Effect to re-run filtering and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [allCabinets, searchTerm, sortOption, sortOrder, applyFiltersAndSort]);

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
      // Fetch location details
      try {
        const locationData = await fetchLocationDetailsById(locationId);
        setLocationName(locationData.name);
      } catch {
        setLocationName("Location"); // Default name on error
        setError("Failed to load location details. Please try again later.");
      }

      // Fetch cabinets data
      try {
        const cabinetsData = await fetchCabinetsForLocation(
          locationId,
          selectedLicencee,
          activeMetricsFilter
        );
        setAllCabinets(cabinetsData);
      } catch {
        setAllCabinets([]);
        setError("Failed to refresh cabinets. Please try again later.");
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
      setCabinetsLoading(false);
    }
  }, [locationId, selectedLicencee, activeMetricsFilter]);

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="md:w-[80%] lg:w-full md:mx-auto md:pl-20 lg:pl-36 min-h-screen bg-background flex overflow-hidden">
        <main className="flex flex-col flex-1 p-6 w-full max-w-full overflow-x-hidden">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={false}
            disabled={loading || cabinetsLoading || refreshing}
          />

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => handleBackToLocations(router)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Locations
            </Button>

            <div className="hidden md:block">
              <RefreshButton
                onClick={handleRefresh}
                isSyncing={refreshing}
                disabled={loading || cabinetsLoading || refreshing}
                label="Refresh"
              />
            </div>
          </div>

          {/* Search bar and controls container */}
          <div className="mt-6 bg-buttonActive p-4 flex flex-col md:flex-row md:items-center gap-4">
            {/* Search Input */}
            <div className="relative md:w-1/2 lg:w-2/5">
              <Input
                type="text"
                placeholder="Search machines (Asset, SMID, Serial, Game)..."
                className={`w-full pr-10 bg-white border-border rounded-md ${
                  loading || cabinetsLoading || refreshing
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
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
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Locations Dropdown */}
            <div className="relative md:w-1/3" ref={locationDropdownRef}>
              <Button
                variant="outline"
                className={`w-full md:w-auto flex items-center justify-between gap-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-100 ${
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
                <span className="truncate">{selectedLocation}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    isLocationDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              {isLocationDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 mt-1 w-full md:w-56 bg-white rounded-md shadow-lg border border-gray-200 right-0"
                >
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() =>
                        handleLocationChange(
                          "all",
                          "All Locations",
                          params.slug as string,
                          router,
                          setSelectedLocation,
                          setIsLocationDropdownOpen
                        )
                      }
                    >
                      All Locations
                    </button>
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          selectedLocation === loc.name
                            ? "bg-gray-100 font-medium"
                            : ""
                        }`}
                        onClick={() =>
                          handleLocationChange(
                            loc.id,
                            loc.name,
                            params.slug as string,
                            router,
                            setSelectedLocation,
                            setIsLocationDropdownOpen
                          )
                        }
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
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

          {error && (
            <div className="mt-10 text-center text-red-500">{error}</div>
          )}

          <NewCabinetModal />
        </main>
      </div>
    </>
  );
}
