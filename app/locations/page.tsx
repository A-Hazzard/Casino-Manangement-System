"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import {
  fetchLocationsData,
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
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import MachineStatusWidget from "@/components/ui/MachineStatusWidget";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import CabinetTableSkeleton from "@/components/ui/locations/CabinetTableSkeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/number";
import RefreshButton from "@/components/ui/RefreshButton";

import Header from "@/components/layout/Header";

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

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function LocationsPage() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const {
    isEditModalOpen,
    isDeleteModalOpen,
    openEditModal,
    openDeleteModal,
    closeEditModal,
    closeDeleteModal,
  } = useLocationActionsStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<LocationSortOption>("moneyIn");
  const [selectedFilters] = useState<LocationFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<AggregatedLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Handler for refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
  const calculateFinancialTotals = () => {
    if (!locationData || locationData.length === 0) {
      return null;
    }

    const totals = locationData.reduce(
      (acc, location) => {
        const moneyIn = location.moneyIn || 0;
        const moneyOut = location.moneyOut || 0;
        const gross = location.gross || moneyIn - moneyOut;

        return {
          moneyIn: acc.moneyIn + moneyIn,
          moneyOut: acc.moneyOut + moneyOut,
          gross: acc.gross + gross,
        };
      },
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    return totals;
  };

  const financialTotals = calculateFinancialTotals();

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
    const fetchMachineStats = async () => {
      setMachineStatsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("licensee", "all"); // Get all machines

        const res = await axios.get(
          `/api/analytics/machines/stats?${params.toString()}`
        );
        const data = res.data;
        if (!aborted) {
          setMachineStats({
            totalMachines: data.totalMachines || 0,
            onlineMachines: data.onlineMachines || 0,
            offlineMachines: data.offlineMachines || 0,
          });
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
    fetchMachineStats();
    return () => {
      aborted = true;
    };
  }, []);

  // Optimized data fetching with better error handling
  const fetchData = useCallback(async () => {
    setLoading(true);
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
      if (
        activeMetricsFilter === "Custom" &&
        customDateRange?.startDate &&
        customDateRange?.endDate
      ) {
        dateRangeForFetch = {
          from: customDateRange.startDate,
          to: customDateRange.endDate,
        };
      } else if (activeMetricsFilter === "All Time") {
        // For All Time, don't pass any date range to get all data
        dateRangeForFetch = undefined;
      }

      // Use empty string as fallback if selectedLicencee is empty
      const effectiveLicencee = selectedLicencee || "";

      const data = await fetchLocationsData(
        activeMetricsFilter as TimePeriod,
        effectiveLicencee,
        filterString,
        dateRangeForFetch
      );

      setLocationData(data);
    } catch (err) {
      console.error("❌ Locations Page Error:", err);
      setLocationData([]); // Set empty array on error
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

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-x-hidden md:w-11/12 md:ml-20 transition-all duration-300">
        <main className="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
          />

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
                className="ml-auto"
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
              <DashboardDateFilters hideAllTime={true} />
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
              <DashboardDateFilters hideAllTime={true} />
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
          </div>

          {/* Search Row - Purple box for md and lg */}
          <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
            <div className="relative flex-1 max-w-md min-w-0">
              <Input
                type="text"
                placeholder="Search locations..."
                className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 w-full">
            {isLoading ? (
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
            <div className="flex justify-center items-center space-x-2 mt-4">
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
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
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
          )}

          <Toaster richColors />
        </main>
      </div>
      <EditLocationModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onLocationUpdated={fetchData}
      />
      <DeleteLocationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onDelete={fetchData}
      />
      <NewLocationModal
        isOpen={isNewLocationModalOpen}
        onClose={closeLocationModal}
      />
    </>
  );
}
