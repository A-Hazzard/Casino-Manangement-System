"use client";

import React, { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageErrorBoundary from "@/components/ui/errors/PageErrorBoundary";
import { NoLicenseeAssigned } from "@/components/ui/NoLicenseeAssigned";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { LocationFilter } from "@/lib/types/location";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { RefreshCw, Plus, PlusCircle } from "lucide-react";
import MachineStatusWidget from "@/components/ui/MachineStatusWidget";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import CabinetTableSkeleton from "@/components/ui/locations/CabinetTableSkeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/number";
import { FloatingRefreshButton } from "@/components/ui/FloatingRefreshButton";
import { ActionButtonSkeleton } from "@/components/ui/skeletons/ButtonSkeletons";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NetworkError } from "@/components/ui/errors";
import {
  useLocationData,
  useLocationSorting,
  useLocationMachineStats,
  useLocationModals,
  useLocationPagination,
} from "@/lib/hooks/data";
import { useGlobalErrorHandler } from "@/lib/hooks/data/useGlobalErrorHandler";
import { animateTableRows, animateCards } from "@/lib/utils/ui";
import { getLicenseeName } from "@/lib/utils/licenseeMapping";
import { useUserStore } from "@/lib/store/userStore";
import { shouldShowNoLicenseeMessage } from "@/lib/utils/licenseeAccess";
import MaintenanceBanner from "@/components/ui/MaintenanceBanner";

function LocationsPageContent() {
  const { handleApiCallWithRetry: _handleApiCallWithRetry } =
    useGlobalErrorHandler();
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const user = useUserStore(state => state.user);
  const licenseeName = getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';

  const { openEditModal } = useLocationActionsStore();

  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Refs for animations
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Custom hooks for data management
  const { locationData, loading, searchLoading, error, fetchData } =
    useLocationData({
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      searchTerm,
      selectedFilters,
    });

  const {
    sortedData,
    sortOrder,
    sortOption,
    handleColumnSort,
    totalPages,
    currentItems,
  } = useLocationSorting({
    locationData,
    selectedFilters,
  });

  // Custom hooks for additional functionality
  const { machineStats, machineStatsLoading } = useLocationMachineStats();

  const {
    isNewLocationModalOpen,
    openNewLocationModal,
    closeNewLocationModal,
    handleLocationClick,
    handleTableAction,
  } = useLocationModals();

  const {
    currentPage,
    setCurrentPage,
    handleFirstPage,
    handleLastPage,
    handlePrevPage,
    handleNextPage,
  } = useLocationPagination({ totalPages });

  // Handler for refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Note: Machine stats and modal state are now managed by custom hooks

  // Calculate financial totals from location data
  const financialTotals = calculateLocationFinancialTotals(locationData);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee("");
    }
  }, [selectedLicencee, setSelectedLicencee]);

  // Note: Machine stats fetching is now handled by useLocationMachineStats hook

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedFilters, setCurrentPage]);

  // Note: Scroll handling is now managed by custom hooks

  // Note: Pagination and action handlers are now managed by custom hooks

  // Show loading state for search
  const isLoading = loading || searchLoading;

  // Animate when filtered data changes (filtering, sorting, search, pagination)
  useEffect(() => {
    if (!isLoading && currentItems.length > 0) {
      // Animate table rows for desktop view
      if (tableRef.current) {
        animateTableRows(tableRef);
      }
      // Animate cards for mobile view
      if (cardsRef.current) {
        animateCards(cardsRef);
      }
    }
  }, [currentItems, selectedFilters, searchTerm, sortOption, sortOrder, isLoading]);

  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return <NoLicenseeAssigned />;
  }

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
        <MaintenanceBanner />
        {/* Header Section: Title, refresh button, and new location button */}
        <div className="flex items-center justify-between mt-4 w-full max-w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 flex-1 min-w-0 truncate flex items-center gap-2">
              Locations
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
              className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            {/* Mobile: Create icon */}
            {!isLoading && (
              <button
                onClick={openNewLocationModal}
              disabled={isLoading}
                className="md:hidden p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="New Location"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 hover:text-green-700" />
              </button>
            )}
          </div>
          {/* Desktop: Refresh icon and Create button on far right */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
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
            {isLoading ? (
              <ActionButtonSkeleton width="w-36" showIcon={true} />
            ) : (
              <Button
                onClick={openNewLocationModal}
                className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
              >
                <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span>New Location</span>
              </Button>
            )}
          </div>
        </div>

        {/* Financial Metrics Section: Total financial overview cards */}
        <div className="mt-6">
          <FinancialMetricsCards
            totals={financialTotals}
            loading={isLoading}
            title="Total for all Locations"
          />
        </div>

        {/* Date Filters Section: Desktop layout with date filters and machine status */}
        <div className="hidden md:flex items-center justify-between mt-4 mb-0 gap-4">
          <div className="flex-1 min-w-0">
            <DashboardDateFilters
              hideAllTime={true}
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

        {/* Mobile/Tablet: Date Filters and Machine Status stacked layout */}
        <div className="md:hidden flex flex-col gap-4 mt-4">
          <div className="w-full">
            <DashboardDateFilters
              hideAllTime={true}
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

        {/* Search and Filter Section: Desktop search bar with SMIB filters */}
        <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive mt-4">
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

        {/* Content Section: Main data display with responsive layouts */}
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
                  : `No locations found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}.`}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4" ref={cardsRef}>
                    {!isLoading ? (
                      currentItems.map((location, index) => (
                        <LocationCard
                          key={`${location._id}-${index}`}
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
              <div className="hidden md:block" ref={tableRef}>
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

        {/* Pagination Section: Navigation controls for data pages */}
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
        onClose={closeNewLocationModal}
        onCreated={fetchData}
      />

      {/* Floating Refresh Button */}
      <FloatingRefreshButton
        show={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </>
  );
}

export default function LocationsPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <PageErrorBoundary>
        <LocationsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
