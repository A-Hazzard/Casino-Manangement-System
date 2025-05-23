"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { fetchLocationsData, searchLocations } from "@/lib/helpers/locations";
import { LocationData } from "@/lib/types";
import { TimePeriod } from "@/lib/types/api";
import {
  LocationFilter,
  LocationSortOption,
  LocationTableItem,
} from "@/lib/types/location";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { EditLocationModal } from "@/components/ui/locations/EditLocationModal";
import { DeleteLocationModal } from "@/components/ui/locations/DeleteLocationModal";
import LocationCard from "@/components/ui/locations/LocationCard";
import LocationSkeleton from "@/components/ui/locations/LocationSkeleton";
import LocationTable from "@/components/ui/locations/LocationTable";
import { NewLocationModal } from "@/components/ui/locations/NewLocationModal";
import Image from "next/image";
import { Plus } from "lucide-react";
import RefreshButton from "@/components/ui/RefreshButton";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";

export default function LocationsPage() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    setLoadingChartData,
    setActiveMetricsFilter,
  } = useDashBoardStore();
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<LocationSortOption>("moneyIn");
  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<LocationTableItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { openLocationModal } = useLocationStore();

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFilterChange = (filter: LocationFilter) => {
    setSelectedFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
    setCurrentPage(0);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterString = selectedFilters.length
        ? selectedFilters.join(",")
        : "";
      const data = await fetchLocationsData(
        activeMetricsFilter,
        selectedLicencee,
        filterString
      );
      const formattedData: LocationTableItem[] = data.map(
        (loc: LocationData) => ({
          location: loc.location || loc._id || "",
          locationName: loc.locationName || "(No Name)",
          moneyIn: loc.moneyIn,
          moneyOut: loc.moneyOut,
          gross: loc.gross,
          totalMachines: loc.totalMachines,
          onlineMachines: loc.onlineMachines,
          isSmibLocation: !loc.noSMIBLocation,
          isLocalServer: loc.isLocalServer,
        })
      );
      setLocationData(formattedData);
      setLoadingChartData(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    selectedFilters,
    setLoadingChartData,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(0);
  }, [sortOrder, sortOption, searchTerm, selectedFilters]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await fetchData();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const filterString = selectedFilters.length
        ? selectedFilters.join(",")
        : "";
      const data = await searchLocations(
        searchTerm,
        activeMetricsFilter,
        selectedLicencee,
        filterString
      );

      const formatted: LocationTableItem[] = data.map((loc: LocationData) => ({
        location: loc.location || loc._id || "",
        locationName: loc.locationName || "(No Name)",
        moneyIn: loc.moneyIn,
        moneyOut: loc.moneyOut,
        gross: loc.gross,
        totalMachines: loc.totalMachines,
        onlineMachines: loc.onlineMachines,
        isSmibLocation: !loc.noSMIBLocation,
        isLocalServer: loc.isLocalServer,
      }));

      setLocationData(formatted);
    } catch (error) {
      console.error("Failed to search locations:", error);
      await fetchData();
    } finally {
      setIsSearching(false);
    }
  };

  const handleSortToggle = () => {
    const sortIconElement = document.querySelector(".sort-icon");
    if (sortIconElement) {
      gsap.to(sortIconElement, {
        rotation: sortOrder === "desc" ? 0 : 180,
        duration: 0.3,
        ease: "back.out(1.7)",
      });
    }

    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const handleColumnSort = (column: LocationSortOption) => {
    if (tableRef.current) {
      const headers = tableRef.current.querySelectorAll("th");
      const targetHeader = Array.from(headers).find((header) =>
        header.textContent?.includes(column.toUpperCase())
      );

      if (targetHeader) {
        gsap.fromTo(
          targetHeader,
          { backgroundColor: "#008000" },
          {
            backgroundColor: "#142E44",
            duration: 0.5,
            ease: "power2.out",
          }
        );
      }
    }

    if (sortOption === column) {
      handleSortToggle();
    } else {
      setSortOption(column);
      setSortOrder("desc");
    }
  };

  const filtered = locationData.filter((loc) => {
    // If no filters are selected, show all locations
    if (selectedFilters.length === 0) return true;

    // Check each filter condition
    return selectedFilters.some((filter) => {
      if (filter === "LocalServersOnly" && loc.isLocalServer) return true;
      if (filter === "SMIBLocationsOnly" && loc.isSmibLocation) return true;
      if (filter === "NoSMIBLocation" && !loc.isSmibLocation) return true;
      return false;
    });
  });

  const sorted = [...filtered].sort((a, b) => {
    const order = sortOrder === "desc" ? -1 : 1;
    if (sortOption === "locationName") {
      return a.locationName.localeCompare(b.locationName) * order;
    } else {
      return ((a[sortOption] as number) - (b[sortOption] as number)) * order;
    }
  });

  const paginatedLocations = sorted.slice(
    currentPage * 10,
    (currentPage + 1) * 10
  );

  const totalPages = Math.ceil(sorted.length / 10);

  const getVisiblePages = () => {
    // Ensure totalPages is at least 1 to avoid issues
    const safePages = Math.max(1, totalPages);

    if (safePages <= 5) return Array.from({ length: safePages }, (_, i) => i);
    if (currentPage <= 2) return [0, 1, 2, 3, 4];
    if (currentPage >= safePages - 3)
      return [
        safePages - 5,
        safePages - 4,
        safePages - 3,
        safePages - 2,
        safePages - 1,
      ];
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  };

  const handleFirstPage = () => setCurrentPage(0);
  const handleLastPage = () => setCurrentPage(totalPages - 1);
  const handlePrevPage = () =>
    currentPage > 0 && setCurrentPage((prev) => prev - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage((prev) => prev + 1);

  const handleLocationClick = (locationId: string) => {
    router.push(`/locations/${locationId}`);
  };

  const openEditModal = (location: LocationTableItem) => {
    useLocationActionsStore.getState().openEditModal(location);
  };

  const openDeleteModal = (location: LocationTableItem) => {
    useLocationActionsStore.getState().openDeleteModal(location);
  };

  useEffect(() => {
    if (!loading && !isSearching) {
      if (tableRef.current) {
        const tableRows = tableRef.current.querySelectorAll("tbody tr");
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
      }

      if (cardsRef.current) {
        const cards = Array.from(
          cardsRef.current?.querySelectorAll("div") || []
        );
        gsap.fromTo(
          cards,
          { opacity: 0, scale: 0.95, y: 15 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.05,
            ease: "back.out(1.5)",
          }
        );
      }
    }
  }, [sorted, sortOption, sortOrder, currentPage, loading, isSearching]);

  // Handler for refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <>
      <Sidebar />
      <div className="w-full md:pl-[8rem] min-h-screen bg-background flex overflow-hidden mt-8">
        <main className="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full overflow-x-hidden">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={false}
            hideLicenceeFilter={false}
          />

          {/* Page title and Add Location button */}
          <div className="flex flex-col md:flex-row justify-between items-center mt-6">
            <div className="flex flex-col md:flex-row items-center">
              {/* Location Icon (mobile only) */}
              <Image
                src="/locationIcon.svg"
                width={30}
                height={30}
                alt="Locations"
                className="mb-1 md:hidden"
              />

              {/* Title and plus button row */}
              <div className="flex items-center justify-center">
                <h1 className="text-2xl font-bold text-center md:text-left">
                  Locations
                </h1>
                {/* Mobile Add Button (green circle with plus) */}
                <Image
                  src="/plusButton.svg"
                  width={20}
                  height={20}
                  alt="Add"
                  className="cursor-pointer md:hidden ml-2"
                  onClick={() => openLocationModal()}
                />
              </div>
            </div>

            {/* Desktop Add New button */}
            <Button
              onClick={() => openLocationModal()}
              className="hidden md:flex bg-button text-white px-4 py-2 rounded-md items-center"
            >
              <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                <Plus className="w-4 h-4 text-white" />
              </div>
              Add New Location
            </Button>
          </div>

          {/* Desktop Time Period Filters */}
          <div className="hidden lg:flex space-x-2 overflow-x-auto flex-wrap justify-start mt-4">
            {[
              { label: "Today", value: "Today" as TimePeriod },
              { label: "Yesterday", value: "Yesterday" as TimePeriod },
              { label: "Last 7 days", value: "7d" as TimePeriod },
              { label: "30 days", value: "30d" as TimePeriod },
              { label: "Custom", value: "Custom" as TimePeriod },
            ].map((filter) => (
              <Button
                key={filter.label}
                className={`px-2 py-1 text-xs lg:text-base rounded-full mb-1 whitespace-nowrap ${
                  activeMetricsFilter === filter.value
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-buttonActive"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !loading && setActiveMetricsFilter(filter.value)}
                disabled={loading}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Mobile Time Period Button - Show only on md screens, re-implemented like dashboard */}
          <div className="hidden md:flex lg:hidden justify-center mb-4 relative">
            <Button
              className={`bg-buttonActive hover:bg-buttonActive/90 text-white px-4 py-2 rounded-full text-sm flex items-center ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => !loading && setFilterOpen((open) => !open)}
              disabled={loading}
            >
              <span className="mr-2">Sort by: {activeMetricsFilter}</span>
              <ChevronRightIcon className="w-4 h-4 -rotate-90" />
            </Button>
            {filterOpen && (
              <div
                className="absolute z-10 mt-2 bg-white rounded-md shadow-lg py-1 w-48"
                style={{ left: 0, right: 0, margin: "auto" }}
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
                        ? "bg-purple-50 text-purple-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={async () => {
                      if (loading) return;
                      setActiveMetricsFilter(filter.value);
                      await fetchData();
                      setFilterOpen(false);
                    }}
                    disabled={loading}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Original Mobile Time Period Button - Show on sm only */}
          <div className="flex justify-center md:hidden mb-4">
            <Button
              className={`bg-buttonActive hover:bg-buttonActive/90 text-white px-4 py-2 rounded-full text-sm flex items-center ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (loading) return;
                const dropdown = document.getElementById(
                  "mobile-filter-dropdown-sm"
                );
                if (dropdown) {
                  dropdown.classList.toggle("hidden");
                }
              }}
              disabled={loading}
            >
              <span className="mr-2">Sort by: {activeMetricsFilter}</span>
              <ChevronRightIcon className="w-4 h-4 -rotate-90" />
            </Button>

            <div
              id="mobile-filter-dropdown-sm"
              className="hidden absolute z-10 mt-12 bg-white rounded-md shadow-lg py-1 w-48"
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
                      ? "bg-purple-50 text-purple-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    if (loading) return;
                    setActiveMetricsFilter(filter.value);
                    document
                      .getElementById("mobile-filter-dropdown-sm")
                      ?.classList.add("hidden");
                  }}
                  disabled={loading}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Only show RefreshButton after data is finished loading, below the date filters */}
          {!loading && (
            <div className="w-full flex lg:justify-start justify-center my-4">
              <RefreshButton
                onClick={handleRefresh}
                isRefreshing={refreshing}
              />
            </div>
          )}

          {/* Desktop Search and Filter Area (Hidden until md) */}
          <div
            className={`hidden md:block bg-buttonActive rounded-t-lg rounded-b-none p-3 mt-4 lg:p-4 ${
              loading || isSearching ? "search-flash" : ""
            }`}
          >
            <div className="flex flex-col md:flex-col lg:flex-row items-center gap-4">
              <div className="relative w-full lg:w-[45%] lg:max-w-md">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search by location name..."
                    className="w-full pr-10 bg-white border-none h-10 px-4 shadow-sm text-sm rounded-md lg:rounded-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    disabled={isSearching}
                  >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter Checkboxes - PC Version */}
              <div className="flex items-center space-x-6 md:mt-2 lg:mt-0">
                <label className="flex items-center space-x-2 cursor-pointer whitespace-nowrap">
                  <Checkbox
                    id="noSMIBLocation-desktop"
                    checked={selectedFilters.includes("NoSMIBLocation")}
                    onCheckedChange={() => handleFilterChange("NoSMIBLocation")}
                    className="bg-white data-[state=checked]:bg-[#5119e9] border border-[#5119e9]"
                  />
                  <span className="text-sm font-medium text-white">
                    NO SMIB LOCATION
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer whitespace-nowrap">
                  <Checkbox
                    id="SMIBLocationsOnly-desktop"
                    checked={selectedFilters.includes("SMIBLocationsOnly")}
                    onCheckedChange={() =>
                      handleFilterChange("SMIBLocationsOnly")
                    }
                    className="bg-white data-[state=checked]:bg-[#5119e9] border border-[#5119e9]"
                  />
                  <span className="text-sm font-medium text-white">
                    SMIB LOCATIONS ONLY
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer whitespace-nowrap">
                  <Checkbox
                    id="LocalServersOnly-desktop"
                    checked={selectedFilters.includes("LocalServersOnly")}
                    onCheckedChange={() =>
                      handleFilterChange("LocalServersOnly")
                    }
                    className="bg-white data-[state=checked]:bg-[#5119e9] border border-[#5119e9]"
                  />
                  <span className="text-sm font-medium text-white">
                    LOCAL SERVERS ONLY
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Mobile Search and Filter Area (Show on sm only) */}
          <div className="md:hidden mb-4">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search by location name..."
                className="w-full pr-10 bg-white border border-gray-300 rounded-full h-10 px-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                disabled={isSearching}
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Sort/Filter Buttons - Keep until lg */}
            <div className="grid grid-cols-2 gap-2 mb-4 max-w-xs mx-auto">
              {/* Sort Dropdown */}
              <Select
                value={sortOption + "-" + sortOrder}
                onValueChange={(val) => {
                  if (val === "asc-order") setSortOrder("asc");
                  else if (val === "desc-order") setSortOrder("desc");
                  else setSortOption(val as LocationSortOption);
                }}
              >
                <SelectTrigger className="bg-buttonActive text-white flex items-center justify-center px-4 py-2 rounded-lg text-sm w-full">
                  <span>Sort</span>
                </SelectTrigger>
                <SelectContent align="center">
                  <SelectGroup>
                    <SelectLabel>Sort by</SelectLabel>
                    <SelectItem value="moneyIn">Money In</SelectItem>
                    <SelectItem value="moneyOut">Money Out</SelectItem>
                    <SelectItem value="gross">Gross</SelectItem>
                    <SelectItem value="locationName">Location Name</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Order</SelectLabel>
                    <SelectItem value="asc-order">Ascending</SelectItem>
                    <SelectItem value="desc-order">Descending</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {/* Filter Dropdown */}
              <Select
                value={activeMetricsFilter}
                onValueChange={async (val) => {
                  setActiveMetricsFilter(val as TimePeriod);
                  await fetchData();
                }}
              >
                <SelectTrigger className="bg-buttonActive text-white flex items-center justify-center px-4 py-2 rounded-lg text-sm w-full mt-2 col-span-2">
                  <span>Filter</span>
                </SelectTrigger>
                <SelectContent align="center">
                  <SelectGroup>
                    <SelectLabel>Date Filter</SelectLabel>
                    <SelectItem value="Today">Today</SelectItem>
                    <SelectItem value="Yesterday">Yesterday</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading || isSearching ? (
            <LocationSkeleton />
          ) : (
            <>
              <div className="hidden lg:block" ref={tableRef}>
                <LocationTable
                  locations={paginatedLocations}
                  sortOption={sortOption}
                  sortOrder={sortOrder}
                  onColumnSort={handleColumnSort}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              </div>

              <div
                className="block lg:hidden mt-4 px-2 md:px-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                ref={cardsRef}
              >
                {paginatedLocations.map((loc, index) =>
                  loc.location &&
                  typeof loc.location === "string" &&
                  loc.location.trim() !== "" ? (
                    <div
                      key={`location-${loc.location}-${index}`}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                      onClick={() => handleLocationClick(loc.location)}
                    >
                      <LocationCard
                        _id={loc.location}
                        name={loc.locationName}
                        moneyIn={loc.moneyIn}
                        moneyOut={loc.moneyOut}
                        gross={loc.gross}
                        totalMachines={loc.totalMachines}
                        onlineMachines={loc.onlineMachines}
                        hasSmib={loc.isSmibLocation ?? false}
                        onEdit={(id: string) => {
                          const location = paginatedLocations.find(
                            (l) => l.location === id
                          );
                          if (location) openEditModal(location);
                        }}
                        onDelete={(id: string) => {
                          const location = paginatedLocations.find(
                            (l) => l.location === id
                          );
                          if (location) openDeleteModal(location);
                        }}
                      />
                    </div>
                  ) : null
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button
                    onClick={handleFirstPage}
                    disabled={currentPage === 0}
                    className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
                  >
                    <DoubleArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
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
                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                    aria-label="Page number"
                  />
                  <span className="text-gray-700 text-sm">of {totalPages}</span>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages - 1}
                    className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages - 1}
                    className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
                  >
                    <DoubleArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          <NewLocationModal />
          <EditLocationModal />
          <DeleteLocationModal />
        </main>
      </div>
      <style jsx global>{`
        .search-flash {
          animation: searchFlash 1s ease-in-out;
        }
        @keyframes searchFlash {
          0% {
            background-color: #6a11cb;
          }
          50% {
            background-color: #9900ff;
          }
          100% {
            background-color: #6a11cb;
          }
        }
      `}</style>
    </>
  );
}
