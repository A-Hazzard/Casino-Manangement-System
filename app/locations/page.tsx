"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { fetchLocationsData } from "@/lib/helpers/locations";
import { AggregatedLocation } from "@/lib/types/location";
import { LocationFilter, LocationSortOption } from "@/lib/types/location";
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

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { EditLocationModal } from "@/components/ui/locations/EditLocationModal";
import { DeleteLocationModal } from "@/components/ui/locations/DeleteLocationModal";
import LocationCard from "@/components/ui/locations/LocationCard";
import LocationSkeleton from "@/components/ui/locations/LocationSkeleton";
import LocationTable from "@/components/ui/locations/LocationTable";
import NewLocationModal from "@/components/ui/locations/NewLocationModal";
import Image from "next/image";

export default function LocationsPage() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<LocationSortOption>("moneyIn");
  const [selectedFilters] = useState<LocationFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<AggregatedLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Add isOpen state for NewLocationModal
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);

  // Replace openLocationModal with our local state handler
  const openLocationModalLocal = () => setIsNewLocationModalOpen(true);
  const closeLocationModal = () => setIsNewLocationModalOpen(false);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee("");
    }
  }, [selectedLicencee, setSelectedLicencee]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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
      }

      // Use empty string as fallback if selectedLicencee is empty
      const effectiveLicencee = selectedLicencee || "";

      const data = await fetchLocationsData(
        activeMetricsFilter,
        effectiveLicencee,
        filterString,
        dateRangeForFetch
      );
      setLocationData(data);
    } catch (err) {
      console.error(err);
      setLocationData([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [selectedLicencee, activeMetricsFilter, selectedFilters, customDateRange]);

  useEffect(() => {
    // Always fetch data on mount and when dependencies change
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedFilters]);

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

  const filtered = useMemo(() => {
    const result = locationData.filter((loc) => {
      // Filter by search term
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const locationName = loc.locationName?.toLowerCase() || "";
        const locationId = loc.location?.toLowerCase() || "";
        if (
          !locationName.includes(searchLower) &&
          !locationId.includes(searchLower)
        ) {
          return false;
        }
      }

      // Filter by selected filters
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
  }, [locationData, selectedFilters, searchTerm]);

  const totalOnline = filtered.reduce(
    (sum, loc) => sum + (loc.onlineMachines || 0),
    0
  );
  const totalMachines = filtered.reduce(
    (sum, loc) => sum + (loc.totalMachines || 0),
    0
  );
  const totalOffline = totalMachines - totalOnline;

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

  const openEditModal = (location: AggregatedLocation): void => {
    useLocationActionsStore.getState().openEditModal(location);
  };

  const openDeleteModal = (location: AggregatedLocation): void => {
    useLocationActionsStore.getState().openDeleteModal(location);
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

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="w-full max-w-full min-h-screen bg-background flex overflow-x-hidden lg:w-full lg:mx-auto lg:pl-36 transition-all duration-300">
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
                src="/locationIcon.svg"
                alt="Location Icon"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8 hidden lg:inline-block ml-2"
              />
            </div>
            {/* Add New Location button (desktop only) */}
            <Button
              onClick={openLocationModalLocal}
              className="hidden lg:flex bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
            >
              <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span>New Location</span>
            </Button>
          </div>

          {/* Mobile: New Location button below title */}
          <div className="lg:hidden mt-4 w-full">
            <Button
              onClick={openLocationModalLocal}
              className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              New Location
            </Button>
          </div>

          {/* Date Filters Row - Desktop: filters left, machine status right */}
          <div className="hidden lg:flex items-center justify-between mt-4 mb-0 gap-4">
            <div className="flex-1 min-w-0">
              <DashboardDateFilters />
            </div>
            <div className="flex-shrink-0 ml-4 w-auto">
              <MachineStatusWidget
                onlineCount={totalOnline}
                offlineCount={totalOffline}
              />
            </div>
          </div>
          {/* Mobile: Search and Status stacked */}
          <div className="lg:hidden flex flex-col gap-4 mt-4">
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
            <div className="w-full">
              <MachineStatusWidget
                onlineCount={totalOnline}
                offlineCount={totalOffline}
              />
            </div>
          </div>

          {/* Search Row - Purple box */}
          <div className="hidden lg:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
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
            {loading ? (
              <>
                {/* Mobile: show 3 card skeletons */}
                <div className="block lg:hidden">
                  <div className="grid grid-cols-1 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <LocationSkeleton key={i} />
                    ))}
                  </div>
                </div>
                {/* Desktop: show 1 table skeleton */}
                <div className="hidden lg:block">
                  <CabinetTableSkeleton />
                </div>
              </>
            ) : currentItems.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <span className="text-gray-500 text-lg">
                  No locations found.
                </span>
              </div>
            ) : (
              <>
                {/* Mobile: show cards */}
                <div className="block lg:hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {!loading ? (
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
                </div>
                {/* Desktop: show table */}
                <div className="hidden lg:block">
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
      <EditLocationModal onLocationUpdated={fetchData} />
      <DeleteLocationModal onLocationDeleted={fetchData} />
      <NewLocationModal
        isOpen={isNewLocationModalOpen}
        onClose={closeLocationModal}
      />
    </>
  );
}
