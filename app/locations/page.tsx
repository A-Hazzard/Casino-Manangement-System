"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import {
  fetchAggregatedLocationsData,
  searchAllLocations,
} from "@/lib/helpers/locations";
import { AggregatedLocation } from "@/lib/types/location";
import { LocationFilter, LocationSortOption } from "@/lib/types/location";
import { TimePeriod } from "@/lib/types/api";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Plus, RefreshCw } from "lucide-react";
import MachineStatusWidget from "@/components/ui/MachineStatusWidget";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import CabinetTableSkeleton from "@/components/ui/locations/CabinetTableSkeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/number";
import RefreshButton from "@/components/ui/RefreshButton";
import { motion, AnimatePresence } from "framer-motion";

import PageLayout from "@/components/layout/PageLayout";

import { Button } from "@/components/ui/button";
import EditLocationModal from "@/components/ui/locations/EditLocationModal";
import DeleteLocationModal from "@/components/ui/locations/DeleteLocationModal";
import LocationCard from "@/components/ui/locations/LocationCard";
import LocationSkeleton from "@/components/ui/locations/LocationSkeleton";
import LocationTable from "@/components/ui/locations/LocationTable";
import NewLocationModal from "@/components/ui/locations/NewLocationModal";
import Image from "next/image";
import ClientOnly from "@/components/ui/common/ClientOnly";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";
import { IMAGES } from "@/lib/constants/images";
import { calculateLocationFinancialTotals } from "@/lib/utils/financial";
import { useDebounce } from "@/lib/utils/hooks";
import { fetchMachineStats } from "@/lib/helpers/machineStats";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NetworkError } from "@/components/ui/errors";

export default function LocationsPage() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const { openEditModal, openDeleteModal } = useLocationActionsStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<LocationSortOption>("moneyIn");
  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<AggregatedLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);
  const router = useRouter();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Handler for refresh button
  const handleRefresh = async () => {
    console.warn("Refresh button clicked");
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    console.warn("Refresh completed");
  };

  // Machine stats state for online/offline counts (like dashboard)
  const [machineStats, setMachineStats] = useState<{
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
  } | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);

  // Add isOpen state for NewLocationModal
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);

  // Calculate financial totals from location data
  const financialTotals = calculateLocationFinancialTotals(locationData);

  // Replace openLocationModal with our local state handler
  const openLocationModalLocal = () => setIsNewLocationModalOpen(true);
  const closeLocationModal = () => setIsNewLocationModalOpen(false);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee("");
    }
  }, [selectedLicencee, setSelectedLicencee]);

  // Fetch machine stats (like dashboard) for online/offline counts
  useEffect(() => {
    let aborted = false;
    const loadMachineStats = async () => {
      setMachineStatsLoading(true);
      try {
        const stats = await fetchMachineStats("all");
        if (!aborted) {
          setMachineStats(stats);
        }
      } catch {
        if (!aborted) {
          setMachineStats({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
        }
      } finally {
        if (!aborted) setMachineStatsLoading(false);
      }
    };
    loadMachineStats();
    return () => {
      aborted = true;
    };
  }, []);

  // Optimized data fetching with better error handling
  const fetchData = useCallback(async () => {
    console.warn("fetchData called - locations page");
    setLoading(true);
    setError(null);
    try {
      // If there's a search term, use the search function to get ALL locations
      if (debouncedSearchTerm.trim()) {
        setSearchLoading(true);
        const effectiveLicencee = selectedLicencee || "";
        const searchData = await searchAllLocations(
          debouncedSearchTerm,
          effectiveLicencee
        );
        setLocationData(searchData);
        setSearchLoading(false);
        return;
      }

      // Otherwise, use the normal fetchLocationsData for metrics-based data
      const filterString = selectedFilters.length
        ? selectedFilters.join(",")
        : "";

      let dateRangeForFetch = undefined;
      const effectiveFilter = activeMetricsFilter || "Today";
      if (effectiveFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
        dateRangeForFetch = {
          from: customDateRange.startDate,
          to: customDateRange.endDate,
        };
      }
      // For "Today", "Yesterday", "7d", "30d", and "All Time", let the API handle the date logic
      // by passing the timePeriod directly without a custom dateRange

      // Use empty string as fallback if selectedLicencee is empty
      const effectiveLicencee = selectedLicencee || "";

      const data = await fetchAggregatedLocationsData(
        (activeMetricsFilter || "Today") as TimePeriod,
        effectiveLicencee,
        filterString,
        dateRangeForFetch
      );

      setLocationData(data);
    } catch (err) {
      setLocationData([]); // Set empty array on error
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    selectedFilters,
    customDateRange,
    debouncedSearchTerm, // Use debounced search term
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when user returns to the page (e.g., after updating a machine elsewhere)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Refresh data when the page becomes visible again (user navigated back)
      if (!document.hidden) {
        // Add a small delay to ensure the page is fully loaded
        setTimeout(() => {
          fetchData();
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchTerm, selectedFilters]);

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const handleColumnSort = (column: LocationSortOption) => {
    if (sortOption === column) {
      handleSortToggle();
    } else {
      setSortOption(column);
      setSortOrder("desc");
    }
  };

  // Memoized filtered data to prevent unnecessary recalculations
  const filtered = useMemo(() => {
    const result = locationData.filter((loc) => {
      // Filter by selected filters only (search is now handled by backend)
      if (selectedFilters.length === 0) return true;
      return selectedFilters.some((filter) => {
        if (filter === "LocalServersOnly" && loc.isLocalServer) return true;
        if (filter === "SMIBLocationsOnly" && !loc.noSMIBLocation) return true;
        if (filter === "NoSMIBLocation" && loc.noSMIBLocation === true)
          return true;
        return false;
      });
    });
    return result;
  }, [locationData, selectedFilters]);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const valA = a[sortOption] ?? 0;
      const valB = b[sortOption] ?? 0;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      } else {
        // Fallback for mixed types or other types
        return 0;
      }
    });
  }, [filtered, sortOrder, sortOption]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentItems = sortedData.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Reset current page if it exceeds total pages
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(0);
    }
  }, [currentPage, totalPages]);

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

  const handleFirstPage = () => setCurrentPage(0);
  const handleLastPage = () => setCurrentPage(totalPages - 1);
  const handlePrevPage = () =>
    currentPage > 0 && setCurrentPage((prev) => prev - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage((prev) => prev + 1);

  const handleLocationClick = (locationId: string): void => {
    router.push(`/locations/${locationId}`);
  };

  const handleTableAction = (
    action: "edit" | "delete",
    location: AggregatedLocation
  ) => {
    if (action === "edit") {
      openEditModal(location);
    } else if (action === "delete") {
      openDeleteModal(location);
    }
  };

  // Show loading state for search
  const isLoading = loading || searchLoading;

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        {/* Title Row */}
        <div className="flex items-center justify-between mt-4 w-full max-w-full">
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Locations
            </h1>
            <Image
              src={IMAGES.locationIcon}
              alt="Location Icon"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 ml-2"
            />
            <RefreshButton
              onClick={handleRefresh}
              isSyncing={refreshing}
              disabled={isLoading}
              label="Refresh"
              className="ml-auto mr-2"
            />
          </div>
          {/* Desktop: New Location button */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <Button
              onClick={openLocationModalLocal}
              className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
            >
              <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span>New Location</span>
            </Button>
          </div>
        </div>

        {/* Mobile: New Location button below title */}
        <div className="md:hidden mt-4 w-full">
          <Button
            onClick={openLocationModalLocal}
            className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            New Location
          </Button>
        </div>

        {/* Financial Metrics Cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={financialTotals}
            loading={isLoading}
            title="Total for all Locations"
          />
        </div>

        {/* Date Filters Row - Desktop and md */}
        <div className="hidden md:flex items-center justify-between mt-4 mb-0 gap-4">
          <div className="flex-1 min-w-0">
            <DashboardDateFilters 
              onCustomRangeGo={fetchData}
              disabled={isLoading}
            />
          </div>
          <div className="flex-shrink-0 ml-4 w-auto">
            <MachineStatusWidget
              isLoading={machineStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
            />
          </div>
        </div>

        {/* Mobile/Tablet: Date Filters and Machine Status stacked */}
        <div className="md:hidden flex flex-col gap-4 mt-4">
          <div className="w-full">
            <DashboardDateFilters 
              onCustomRangeGo={fetchData}
              disabled={isLoading}
            />
          </div>
          <div className="w-full">
            <MachineStatusWidget
              isLoading={machineStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
            />
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Search locations..."
              className="w-full pr-10 bg-white border border-gray-300 rounded-full h-11 px-4 shadow-sm text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          {/* Mobile SMIB Filter Checkboxes */}
          <div className="flex items-center justify-center gap-4 w-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobileSmibFilter"
                checked={selectedFilters.includes("SMIBLocationsOnly")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFilters((prev) => [
                      ...prev,
                      "SMIBLocationsOnly",
                    ]);
                  } else {
                    setSelectedFilters((prev) =>
                      prev.filter((f) => f !== "SMIBLocationsOnly")
                    );
                  }
                }}
                className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
              />
              <Label
                htmlFor="mobileSmibFilter"
                className="text-sm font-medium text-gray-700"
              >
                SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobileNoSmibFilter"
                checked={selectedFilters.includes("NoSMIBLocation")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFilters((prev) => [...prev, "NoSMIBLocation"]);
                  } else {
                    setSelectedFilters((prev) =>
                      prev.filter((f) => f !== "NoSMIBLocation")
                    );
                  }
                }}
                className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
              />
              <Label
                htmlFor="mobileNoSmibFilter"
                className="text-sm font-medium text-gray-700"
              >
                No SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobileLocalServerFilter"
                checked={selectedFilters.includes("LocalServersOnly")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFilters((prev) => [...prev, "LocalServersOnly"]);
                  } else {
                    setSelectedFilters((prev) =>
                      prev.filter((f) => f !== "LocalServersOnly")
                    );
                  }
                }}
                className="text-grayHighlight border-buttonActive focus:ring-buttonActive"
              />
              <Label
                htmlFor="mobileLocalServerFilter"
                className="text-sm font-medium text-gray-700"
              >
                Local Server
              </Label>
            </div>
          </div>
        </div>

        {/* Search Row - Purple box for md and lg */}
        <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
          <div className="relative flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Search locations..."
              className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          {/* SMIB Filter Checkboxes */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smibFilter"
                checked={selectedFilters.includes("SMIBLocationsOnly")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFilters((prev) => [
                      ...prev,
                      "SMIBLocationsOnly",
                    ]);
                  } else {
                    setSelectedFilters((prev) =>
                      prev.filter((f) => f !== "SMIBLocationsOnly")
                    );
                  }
                }}
                className="text-white border-white focus:ring-white"
              />
              <Label
                htmlFor="smibFilter"
                className="text-white text-sm font-medium whitespace-nowrap"
              >
                SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="noSmibFilter"
                checked={selectedFilters.includes("NoSMIBLocation")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFilters((prev) => [...prev, "NoSMIBLocation"]);
                  } else {
                    setSelectedFilters((prev) =>
                      prev.filter((f) => f !== "NoSMIBLocation")
                    );
                  }
                }}
                className="text-white border-white focus:ring-white"
              />
              <Label
                htmlFor="noSmibFilter"
                className="text-white text-sm font-medium whitespace-nowrap"
              >
                No SMIB
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="localServerFilter"
                checked={selectedFilters.includes("LocalServersOnly")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFilters((prev) => [...prev, "LocalServersOnly"]);
                  } else {
                    setSelectedFilters((prev) =>
                      prev.filter((f) => f !== "LocalServersOnly")
                    );
                  }
                }}
                className="text-white border-white focus:ring-white"
              />
              <Label
                htmlFor="localServerFilter"
                className="text-white text-sm font-medium whitespace-nowrap"
              >
                Local Server
              </Label>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 w-full">
          {error ? (
            <NetworkError
              title="Failed to Load Locations"
              message="Unable to load location data. Please check your connection and try again."
              onRetry={fetchData}
              isRetrying={refreshing}
              errorDetails={error}
            />
          ) : isLoading ? (
            <>
              {/* Mobile: show 3 card skeletons */}
              <div className="block md:hidden">
                <ClientOnly
                  fallback={
                    <div className="grid grid-cols-1 gap-4">
                      {[...Array(3)].map((_, i) => (
                        <LocationSkeleton key={i} />
                      ))}
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <LocationSkeleton key={i} />
                    ))}
                  </div>
                </ClientOnly>
              </div>
              {/* Desktop: show 1 table skeleton */}
              <div className="hidden md:block">
                <ClientOnly fallback={<CabinetTableSkeleton />}>
                  <CabinetTableSkeleton />
                </ClientOnly>
              </div>
            </>
          ) : currentItems.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <span className="text-gray-500 text-lg">
                {searchTerm
                  ? "No locations found matching your search."
                  : "No locations found."}
              </span>
            </div>
          ) : (
            <>
              {/* Mobile: show cards */}
              <div className="block md:hidden">
                <ClientOnly
                  fallback={
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {[...Array(3)].map((_, i) => (
                        <LocationSkeleton key={i} />
                      ))}
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {!isLoading ? (
                      currentItems.map((location) => (
                        <LocationCard
                          key={location.location}
                          location={location}
                          onLocationClick={handleLocationClick}
                          onEdit={() => openEditModal(location)}
                        />
                      ))
                    ) : (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <LocationSkeleton key={i} />
                        ))}
                      </>
                    )}
                  </div>
                </ClientOnly>
              </div>
              {/* Desktop: show table */}
              <div className="hidden md:block">
                <LocationTable
                  locations={currentItems}
                  sortOption={sortOption}
                  sortOrder={sortOrder}
                  onSort={handleColumnSort}
                  onLocationClick={handleLocationClick}
                  onAction={handleTableAction}
                  formatCurrency={formatCurrency}
                />
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            {/* Mobile Pagination */}
            <div className="flex flex-col space-y-3 mt-4 sm:hidden">
              <div className="text-xs text-gray-600 text-center">
                Page {currentPage + 1} of {totalPages} ({sortedData.length}{" "}
                locations)
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFirstPage}
                  disabled={currentPage === 0}
                  className="px-2 py-1 text-xs"
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="px-2 py-1 text-xs"
                >
                  ‹
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">Page</span>
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
                    className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                    aria-label="Page number"
                  />
                  <span className="text-xs text-gray-600">of {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  className="px-2 py-1 text-xs"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLastPage}
                  disabled={currentPage === totalPages - 1}
                  className="px-2 py-1 text-xs"
                >
                  »»
                </Button>
              </div>
            </div>
            {/* Desktop Pagination */}
            <div className="hidden sm:flex justify-center items-center space-x-2 mt-4">
              <Button
                onClick={handleFirstPage}
                disabled={currentPage === 0}
                variant="ghost"
              >
                <DoubleArrowLeftIcon />
              </Button>
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                variant="ghost"
              >
                <ChevronLeftIcon />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Page</span>
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
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </div>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                variant="ghost"
              >
                <ChevronRightIcon />
              </Button>
              <Button
                onClick={handleLastPage}
                disabled={currentPage === totalPages - 1}
                variant="ghost"
              >
                <DoubleArrowRightIcon />
              </Button>
            </div>
          </>
        )}
      </PageLayout>
      <EditLocationModal onLocationUpdated={fetchData} />
      <DeleteLocationModal onDelete={fetchData} />
      <NewLocationModal
        isOpen={isNewLocationModalOpen}
        onClose={closeLocationModal}
        onCreated={fetchData}
      />

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
    </>
  );
}
