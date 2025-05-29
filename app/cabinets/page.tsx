"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import CabinetCard from "@/components/ui/cabinets/CabinetCard";
import {
  CabinetCardSkeleton,
  CabinetTableSkeleton,
} from "@/components/ui/cabinets/CabinetSkeletonLoader";
import CabinetTable from "@/components/ui/cabinets/CabinetTable";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { NewCabinetModal } from "@/components/ui/cabinets/NewCabinetModal";
import { Input } from "@/components/ui/input";
import { fetchCabinetLocations, fetchCabinets } from "@/lib/helpers/cabinets";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";
import { TimePeriod } from "@/lib/types/api";
import { Cabinet, CabinetProps, CabinetSortOption } from "@/lib/types/cabinets";
import {
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import gsap from "gsap";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import RefreshButton from "@/components/ui/RefreshButton";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function CabinetsPage() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    setLoadingChartData,
    activeMetricsFilter,
    setActiveMetricsFilter,
  } = useDashBoardStore();

  const { openEditModal, openDeleteModal } = useCabinetActionsStore();
  const { openCabinetModal } = useNewCabinetStore();

  const pathname = usePathname();

  // Add initialLoading state to control first load
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<CabinetSortOption>("moneyIn");
  const [currentPage, setCurrentPage] = useState(0);

  // Add states for locations and selectedLocation
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Section navigation state
  const [activeSection, setActiveSection] = useState<
    "cabinets" | "smib" | "firmware"
  >("cabinets");

  const loadLocations = useCallback(async () => {
    try {
      const locationsData = await fetchCabinetLocations(selectedLicencee);
      if (Array.isArray(locationsData)) {
        console.log("Locations data:", locationsData);
        setLocations(locationsData);
      } else {
        console.error("Locations data is not an array:", locationsData);
        setLocations([]);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      setLocations([]);
    }
  }, [selectedLicencee]);

  // Filter cabinets based on search term and selected location
  const filterCabinets = useCallback(
    (cabinets: Cabinet[], search: string) => {
      let filtered = [...cabinets];

      // Filter by location if a specific location is selected
      if (selectedLocation !== "all") {
        filtered = filtered.filter(
          (cab) => cab.locationId === selectedLocation
        );
      }

      // Filter by search term
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (cab) =>
            cab.assetNumber?.toLowerCase().includes(searchLower) ||
            cab.smbId?.toLowerCase().includes(searchLower) ||
            cab.locationName?.toLowerCase().includes(searchLower)
        );
      }

      setFilteredCabinets(filtered);
    },
    [selectedLocation]
  );

  const loadCabinets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingChartData(true);

      const cabinetsData = await fetchCabinets(
        selectedLicencee,
        activeMetricsFilter
      );

      if (!Array.isArray(cabinetsData)) {
        console.error("Cabinets data is not an array:", cabinetsData);
        setAllCabinets([]);
        setFilteredCabinets([]);
      } else {
        setAllCabinets(cabinetsData);
        filterCabinets(cabinetsData, searchTerm);
      }

      setLoadingChartData(false);
    } catch (err) {
      console.error("Error fetching cabinet data:", err);
      setAllCabinets([]);
      setFilteredCabinets([]);
    } finally {
      setLoading(false);
      setInitialLoading(false); // Set initialLoading to false after the first load completes
    }
  }, [
    selectedLicencee,
    filterCabinets,
    searchTerm,
    setLoadingChartData,
    activeMetricsFilter,
  ]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadCabinets();
  }, [loadCabinets]);

  useEffect(() => {
    filterCabinets(allCabinets, searchTerm);
  }, [searchTerm, allCabinets, filterCabinets]);

  // ====== Sorting / Pagination Logic ======
  const handleSortToggle = () =>
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));

  const handleColumnSort = (column: CabinetSortOption) => {
    if (sortOption === column) {
      handleSortToggle();
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
    currentPage * 10,
    (currentPage + 1) * 10
  );
  const totalPages = Math.ceil(sorted.length / 10);

  const handleEdit = (cabinet: Cabinet) => openEditModal(cabinet);

  const handleDelete = (cabinet: Cabinet) => openDeleteModal(cabinet);

  // Helper function to convert Cabinet to CabinetProps
  const mapToCabinetProps = (cabinet: Cabinet): CabinetProps => {
    return {
      _id: cabinet._id,
      locationId: cabinet.locationId || "",
      locationName: cabinet.locationName || "",
      assetNumber: cabinet.assetNumber || "",
      smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || "",
      moneyIn: cabinet.moneyIn || cabinet.sasMeters?.coinIn || 0,
      moneyOut: cabinet.moneyOut || cabinet.sasMeters?.coinOut || 0,
      gross:
        cabinet.gross ||
        (cabinet.moneyIn || cabinet.sasMeters?.coinIn || 0) -
          (cabinet.moneyOut || cabinet.sasMeters?.coinOut || 0) -
          (cabinet.jackpot || cabinet.sasMeters?.jackpot || 0),
      jackpot: cabinet.jackpot || cabinet.sasMeters?.jackpot || 0,
      lastOnline: cabinet.lastOnline
        ? cabinet.lastOnline.toString()
        : cabinet.lastActivity
        ? cabinet.lastActivity.toString()
        : "",
      installedGame: cabinet.installedGame || cabinet.game || "",
      accountingDenomination:
        cabinet.accountingDenomination ||
        cabinet.gameConfig?.accountingDenomination?.toString() ||
        "",
      collectionMultiplier: cabinet.collectionMultiplier || "",
      status: cabinet.status || cabinet.assetStatus || "",
      gameType: cabinet.gameType,
      isCronosMachine: cabinet.isCronosMachine,
      cabinetType: cabinet.cabinetType,
      onEdit: () => handleEdit(cabinet),
      onDelete: () => handleDelete(cabinet),
    };
  };

  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
    </div>
  );

  // Add animation for table and cards when data changes
  useEffect(() => {
    // Animate table rows and cards when filtered data changes
    if (!loading && filteredCabinets.length > 0) {
      if (tableRef.current) {
        // Table view animation
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
        // Card view animation
        const cards = Array.from(cardsRef.current.children);
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
      }
    }
  }, [filteredCabinets, sortOption, sortOrder, currentPage, loading]);

  // Handle location change
  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
    // Filter cabinets based on selected location
    if (locationId === "all") {
      filterCabinets(allCabinets, searchTerm);
    } else {
      const filtered = allCabinets.filter(
        (cabinet) => cabinet.locationId === locationId
      );
      setFilteredCabinets(filtered);
    }
  };

  // Handler for refresh button
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCabinets();
    setRefreshing(false);
  };

  return (
    <>
      <Sidebar pathname={pathname} />
      <EditCabinetModal />
      <DeleteCabinetModal />
      <NewCabinetModal />

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-x-hidden md:w-[80%] lg:w-full md:mx-auto md:pl-20 lg:pl-36">
        <main className="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            hideOptions={false}
            hideLicenceeFilter={false}
            disabled={loading || refreshing}
          />

          {/* Title and icon layout */}
          <div className="flex items-center justify-between mt-4 w-full max-w-full">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold">Cabinets</h1>
              <Image
                src="/cabinetsIcon.svg"
                alt="Cabinets Icon"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
            </div>
            {/* Add New Cabinet button (desktop only) */}
            <Button
              onClick={() => openCabinetModal()}
              className="hidden md:flex bg-button hover:bg-green-700 text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
            >
              <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span>Add New Cabinet</span>
            </Button>
          </div>

          {/* Section Navigation: Dropdown on mobile, button bar on desktop */}
          <div className="w-full max-w-full mt-6 mb-4">
            {/* Mobile: Dropdown */}
            <div className="md:hidden w-full">
              <select
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-base font-semibold bg-white shadow-sm"
                value={activeSection}
                onChange={(e) =>
                  setActiveSection(e.target.value as typeof activeSection)
                }
              >
                <option value="cabinets">Machines</option>
                <option value="smib">SMIB Management</option>
                <option value="firmware">SMIB Firmware</option>
              </select>
            </div>
            {/* Desktop: Button bar */}
            <div className="hidden md:flex flex-row gap-3 w-full">
              <Button
                className={`px-6 py-2 font-semibold ${
                  activeSection === "cabinets"
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-green-700"
                }`}
                onClick={() => setActiveSection("cabinets")}
              >
                Machines
              </Button>
              <Button
                className={`px-6 py-2 font-semibold ${
                  activeSection === "smib"
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-green-700"
                }`}
                onClick={() => setActiveSection("smib")}
              >
                SMIB Management
              </Button>
              <Button
                className={`px-6 py-2 font-semibold ${
                  activeSection === "firmware"
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-green-700"
                }`}
                onClick={() => setActiveSection("firmware")}
              >
                Movement Requests
              </Button>
              <Button
                className={`px-6 py-2 font-semibold ${
                  activeSection === "firmware"
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-green-700"
                }`}
                onClick={() => setActiveSection("firmware")}
              >
                Firmware Management
              </Button>
            </div>
          </div>

          {/* Desktop Time Period Filters */}
          <div className="hidden lg:flex items-center mt-4 w-full">
            <div className="flex space-x-2 overflow-x-auto flex-wrap justify-start">
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
                  onClick={() =>
                    !loading && setActiveMetricsFilter(filter.value)
                  }
                  disabled={loading}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex-1"></div>
            <div className="ml-8">
              <RefreshButton
                onClick={handleRefresh}
                isRefreshing={refreshing}
                disabled={loading}
              />
            </div>
          </div>

          {/* Section Content */}
          {activeSection === "cabinets" ? (
            <>
              {/* Mobile Search */}
              <div className="lg:hidden w-full relative">
                <Input
                  type="text"
                  placeholder="Search machines..."
                  className="w-full pr-10 bg-white border-none rounded-full h-11 px-4 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Mobile Sort and Location Select Below Search */}
              <div className="flex flex-wrap gap-2 w-full mb-4 lg:hidden mt-4 items-center sm:flex-row flex-col overflow-x-hidden">
                {/* Sort Button */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <button
                    className="w-full bg-buttonActive text-white rounded-full flex items-center justify-center gap-2 py-2 px-4"
                    onClick={() => {
                      const dropdown = document.getElementById(
                        "mobile-sort-dropdown"
                      );
                      if (dropdown) dropdown.classList.toggle("hidden");
                    }}
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                    <span>Sort</span>
                  </button>
                  <div
                    id="mobile-sort-dropdown"
                    className="hidden absolute left-0 right-0 z-10 mt-2 bg-white rounded-md shadow-lg py-2 w-full"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b">
                      <span className="font-semibold text-sm">Order:</span>
                      <button
                        className="ml-2 px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs flex items-center"
                        onClick={() => {
                          setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                          document
                            .getElementById("mobile-sort-dropdown")
                            ?.classList.add("hidden");
                        }}
                      >
                        {sortOrder === "desc" ? "Descending" : "Ascending"}
                      </button>
                    </div>
                    {[
                      { label: "Money In", value: "moneyIn" },
                      { label: "Gross", value: "gross" },
                      { label: "Asset #", value: "assetNumber" },
                      { label: "Game", value: "game" },
                      { label: "Last Online", value: "lastOnline" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleColumnSort(opt.value as CabinetSortOption);
                          document
                            .getElementById("mobile-sort-dropdown")
                            ?.classList.add("hidden");
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          sortOption === opt.value
                            ? "bg-gray-100 font-medium"
                            : ""
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Location Select */}
                <div className="flex-1 min-w-0 w-full sm:w-auto relative">
                  <select
                    className="w-full h-11 bg-white border border-gray-300 rounded-full px-4 pr-10 text-gray-700 appearance-none"
                    value={selectedLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                  >
                    <option value="all">All Locations</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <ArrowDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {/* Refresh Button to the right of Location select, only after data is loaded */}
                {!initialLoading && !loading && (
                  <div className="flex items-center w-full sm:w-auto">
                    <RefreshButton
                      onClick={handleRefresh}
                      isRefreshing={refreshing}
                      className="bg-buttonActive text-white rounded-full p-2 ml-2 w-full sm:w-auto"
                    />
                  </div>
                )}
              </div>

              {/* Desktop Search and Location Filter Row with purple background */}
              <div
                className={`hidden mt-4 lg:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none ${
                  loading || initialLoading ? "search-flash" : ""
                }`}
              >
                <div className="relative w-2/3">
                  <Input
                    type="text"
                    placeholder="Search machines..."
                    className="w-full pr-10 bg-white border border-gray-300 rounded-md h-10 px-4"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <div className="w-1/3">
                  <select
                    className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 text-gray-700 appearance-none"
                    value={selectedLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                  >
                    <option value="all">All Locations</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {initialLoading || loading ? (
                <>
                  {/* Table Skeleton for large screens */}
                  <div className="hidden lg:block">
                    <CabinetTableSkeleton />
                  </div>

                  {/* Card Skeleton for small and medium screens */}
                  <div className="block lg:hidden">
                    <CabinetCardSkeleton />
                  </div>
                </>
              ) : filteredCabinets.length === 0 ? (
                <div className="mt-6">
                  <NoDataMessage
                    message={
                      searchTerm
                        ? "No cabinets match your search criteria."
                        : "No cabinets available. Click 'Add New Cabinet' to add one."
                    }
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table View with green header and border styling */}
                  <div className="hidden lg:block" ref={tableRef}>
                    <CabinetTable
                      cabinets={paginatedCabinets.map(mapToCabinetProps)}
                      sortOption={sortOption}
                      sortOrder={sortOrder}
                      onColumnSort={handleColumnSort}
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

                  {/* Mobile and Tablet Card View */}
                  <div
                    className="block lg:hidden mt-4 px-1 sm:px-2 md:px-4 space-y-3 sm:space-y-4 w-full max-w-full"
                    ref={cardsRef}
                  >
                    {paginatedCabinets.map((cabinet) => (
                      <CabinetCard
                        key={cabinet._id}
                        _id={cabinet._id}
                        assetNumber={cabinet.assetNumber || ""}
                        game={cabinet.game || ""}
                        smbId={
                          cabinet.smbId ||
                          cabinet.smibBoard ||
                          cabinet.relayId ||
                          ""
                        }
                        serialNumber={cabinet.serialNumber || ""}
                        locationId={cabinet.locationId || ""}
                        locationName={cabinet.locationName || ""}
                        moneyIn={cabinet.moneyIn || 0}
                        moneyOut={cabinet.moneyOut || 0}
                        cancelledCredits={cabinet.cancelledCredits || 0}
                        jackpot={cabinet.jackpot || 0}
                        gross={cabinet.gross || 0}
                        lastOnline={
                          cabinet.lastOnline instanceof Date
                            ? cabinet.lastOnline.toISOString()
                            : typeof cabinet.lastOnline === "string"
                            ? cabinet.lastOnline
                            : undefined
                        }
                        installedGame={
                          cabinet.installedGame || cabinet.game || ""
                        }
                        onEdit={() => handleEdit(cabinet)}
                        onDelete={() => handleDelete(cabinet)}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(0)}
                        disabled={currentPage === 0}
                        className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
                      >
                        <DoubleArrowLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(0, p - 1))
                        }
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
                      <span className="text-gray-700 text-sm">
                        of {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                        }
                        disabled={currentPage === totalPages - 1}
                        className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages - 1)}
                        disabled={currentPage === totalPages - 1}
                        className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
                      >
                        <DoubleArrowRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center mx-auto my-12 max-w-xs p-4 bg-white rounded-lg shadow-md">
              <Image
                src="/coming-soon.svg"
                alt="Coming Soon"
                width={48}
                height={48}
                className="mb-4"
              />
              <h2 className="text-lg font-bold mb-2 text-center">
                Coming Soon
              </h2>
              <p className="text-gray-500 text-sm text-center">
                This feature is under development.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
