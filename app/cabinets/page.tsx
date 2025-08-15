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
import { fetchCabinets, fetchCabinetLocations } from "@/lib/helpers/cabinets";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";
import { Cabinet, CabinetProps, CabinetSortOption } from "@/lib/types/cabinets";
import { MachineMovementRecord } from "@/lib/types/reports";
import {
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import RefreshButton from "@/components/ui/RefreshButton";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import SMIBManagement from "@/components/cabinets/SMIBManagement";
import MovementRequests from "@/components/cabinets/MovementRequests";
import NewMovementRequestModal from "@/components/ui/movements/NewMovementRequestModal";
import UploadSmibDataModal from "@/components/ui/firmware/UploadSmibDataModal";
import SMIBFirmwareSection from "@/components/ui/firmware/SMIBFirmwareSection";
import { Toaster } from "sonner";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import ClientOnly from "@/components/ui/common/ClientOnly";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";
import CabinetsNavigation from "@/components/cabinets/CabinetsNavigation";
import { CABINET_TABS_CONFIG } from "@/lib/constants/cabinets";
import type { CabinetSection } from "@/lib/constants/cabinets";

function CabinetsPageContent() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    setLoadingChartData,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  const { openEditModal, openDeleteModal } = useCabinetActionsStore();
  const { openCabinetModal } = useNewCabinetStore();

  // State for New Movement Request Modal
  const [isNewMovementRequestModalOpen, setIsNewMovementRequestModalOpen] =
    useState(false);
  const openNewMovementRequestModal = () =>
    setIsNewMovementRequestModalOpen(true);
  const closeNewMovementRequestModal = () =>
    setIsNewMovementRequestModalOpen(false);

  const handleMovementRequestSubmit = (data: MachineMovementRecord) => {
    closeNewMovementRequestModal();
  };

  const [isUploadSmibDataModalOpen, setIsUploadSmibDataModalOpen] =
    useState(false);
  const openUploadSmibDataModal = () => setIsUploadSmibDataModalOpen(true);
  const closeUploadSmibDataModal = () => setIsUploadSmibDataModalOpen(false);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortOption, setSortOption] = useState<CabinetSortOption>("moneyIn");
  const [currentPage, setCurrentPage] = useState(0);

  const [locations, setLocations] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Get active section from URL search params, default to "cabinets"
  const getActiveSectionFromURL = useCallback((): CabinetSection => {
    const section = searchParams.get("section");
    if (section === "movement-requests") return "movement";
    if (section === "smib-firmware") return "firmware";
    if (section === "smib") return "smib";
    return "cabinets";
  }, [searchParams]);

  const [activeSection, setActiveSection] = useState<CabinetSection>(
    getActiveSectionFromURL()
  );

  // Handle section changes with URL updates
  const handleSectionChange = (section: CabinetSection) => {
    setActiveSection(section);

    // Update URL based on section
    const params = new URLSearchParams(searchParams.toString());
    if (section === "cabinets") {
      params.delete("section"); // Default section, no param needed
    } else if (section === "movement") {
      params.set("section", "movement-requests");
    } else if (section === "firmware") {
      params.set("section", "smib-firmware");
    } else if (section === "smib") {
      params.set("section", "smib");
    }

    const newURL = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.push(newURL, { scroll: false });
  };

  // Sync state with URL changes
  useEffect(() => {
    const newSection = getActiveSectionFromURL();
    if (newSection !== activeSection) {
      setActiveSection(newSection);
    }
  }, [searchParams, activeSection, getActiveSectionFromURL]);

  // Calculate financial totals from cabinet data
  const calculateFinancialTotals = () => {
    if (!allCabinets || allCabinets.length === 0) {
      return null;
    }

    const totals = allCabinets.reduce(
      (acc, cabinet) => {
        // Use calculatedMetrics if available, otherwise fall back to direct properties
        const moneyIn =
          cabinet.calculatedMetrics?.moneyIn || cabinet.moneyIn || 0;
        const moneyOut =
          cabinet.calculatedMetrics?.moneyOut || cabinet.moneyOut || 0;
        // Calculate gross as moneyIn - moneyOut, or use direct gross property if available
        const gross = cabinet.gross || moneyIn - moneyOut;

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

  // Load locations for filter dropdown
  const loadLocations = useCallback(async () => {
    try {
      const locationsData = await fetchCabinetLocations(selectedLicencee);
      if (Array.isArray(locationsData)) {
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
            cab.locationName?.toLowerCase().includes(searchLower) ||
            cab.serialNumber?.toLowerCase().includes(searchLower)
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

      const dateRangeForFetch =
        activeMetricsFilter === "Custom" &&
        customDateRange?.startDate &&
        customDateRange?.endDate
          ? {
              from: customDateRange.startDate,
              to: customDateRange.endDate,
            }
          : undefined;

      const cabinetsData = await fetchCabinets(
        selectedLicencee,
        activeMetricsFilter,
        dateRangeForFetch
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
    customDateRange,
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

  const handleEdit = useCallback(
    (cabinet: Cabinet) => openEditModal(cabinet),
    [openEditModal]
  );

  const handleDelete = useCallback(
    (cabinet: Cabinet) => openDeleteModal(cabinet),
    [openDeleteModal]
  );

  const mapToCabinetProps = useMemo(() => {
    return (cabinet: Cabinet): CabinetProps => {
      return {
        _id: cabinet._id,
        locationId: cabinet.locationId || "",
        locationName: cabinet.locationName || "",
        assetNumber: cabinet.assetNumber || "",
        smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || "",
        moneyIn: cabinet.moneyIn || cabinet.sasMeters?.drop || 0,
        moneyOut:
          cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0,
        gross:
          cabinet.gross ||
          (cabinet.moneyIn || cabinet.sasMeters?.drop || 0) -
            (cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0),
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
  }, [handleEdit, handleDelete]);

  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
    </div>
  );

  // Add animation for table and cards when data changes
  useEffect(() => {
    // Remove GSAP animations that cause flickering
    // The animations were causing conflicts with React's rendering cycle
  }, [filteredCabinets, sortOption, sortOrder, currentPage, loading]);

  // Handle location change
  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
    // Filter cabinets based on selected location
    if (locationId === "all") {
      // When switching to "all", reload locations to get all available locations
      loadLocations();
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
      <NewMovementRequestModal
        isOpen={isNewMovementRequestModalOpen}
        onClose={closeNewMovementRequestModal}
        locations={locations}
        onSubmit={handleMovementRequestSubmit}
      />
      <UploadSmibDataModal
        isOpen={isUploadSmibDataModalOpen}
        onClose={closeUploadSmibDataModal}
      />

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-x-hidden xl:w-full xl:mx-auto md:pl-36 transition-all duration-300">
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
            <div className="flex items-center gap-3 w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Machines
              </h1>
              <Image
                src="/cabinetsIcon.svg"
                alt="Machines Icon"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8 hidden lg:inline-block ml-2"
              />
            </div>
            {/* Add New Cabinet button (desktop only, only on certain tabs) */}
            {(activeSection === "cabinets" || activeSection === "movement") && (
              <Button
                onClick={() => {
                  if (activeSection === "cabinets") {
                    openCabinetModal();
                  } else if (activeSection === "movement") {
                    openNewMovementRequestModal();
                  }
                }}
                className="hidden md:flex bg-button hover:bg-button/90 text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
              >
                <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span>
                  {activeSection === "cabinets"
                    ? "Add New Cabinet"
                    : "Create Movement Request"}
                </span>
              </Button>
            )}
          </div>

          {/* Mobile: Add New Cabinet button below title */}
          {(activeSection === "cabinets" || activeSection === "movement") && (
            <div className="md:hidden mt-4 w-full">
              <Button
                onClick={() => {
                  if (activeSection === "cabinets") {
                    openCabinetModal();
                  } else if (activeSection === "movement") {
                    openNewMovementRequestModal();
                  }
                }}
                className="w-full bg-button hover:bg-button/90 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {activeSection === "cabinets"
                  ? "Add New Cabinet"
                  : "Create Movement Request"}
              </Button>
            </div>
          )}

          {/* Section Navigation */}
          <div className="mt-8 mb-6">
            <CabinetsNavigation
              tabs={CABINET_TABS_CONFIG}
              activeSection={activeSection}
              onChange={handleSectionChange}
              isLoading={loading}
            />
          </div>

          {/* Financial Metrics Cards - Only show on cabinets section */}
          {activeSection === "cabinets" && (
            <FinancialMetricsCards
              totals={financialTotals}
              loading={loading}
              title="Total for all Machines"
              className="mt-6"
            />
          )}

          {/* Date Filters Row - Visible on both mobile and desktop */}
          <div className="flex items-center justify-between mt-4 mb-0 gap-4">
            <div className="flex-1 min-w-0">
              <DashboardDateFilters
                disabled={loading || refreshing}
                hideAllTime={true}
              />
            </div>
          </div>
          {/* Mobile: Search, Location Filter, and Sort stacked - Only show on cabinets section */}
          {activeSection === "cabinets" && (
            <div className="lg:hidden flex flex-col gap-4 mt-4">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search machines..."
                  className="w-full pr-10 bg-white border border-gray-300 rounded-full h-11 px-4 shadow-sm text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <div className="relative w-full">
                <select
                  className="w-full h-11 bg-white border border-gray-300 rounded-full px-4 pr-10 text-gray-700 appearance-none focus:ring-buttonActive focus:border-buttonActive text-base"
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
              <div className="relative w-full">
                <select
                  className="w-full h-11 bg-white border border-gray-300 rounded-full px-4 pr-10 text-gray-700 appearance-none focus:ring-buttonActive focus:border-buttonActive text-base"
                  value={`${sortOption}-${sortOrder}`}
                  onChange={(e) => {
                    const [option, order] = e.target.value.split("-");
                    setSortOption(option as CabinetSortOption);
                    setSortOrder(order as "asc" | "desc");
                  }}
                >
                  <option value="moneyIn-desc">Money In (Highest First)</option>
                  <option value="moneyIn-asc">Money In (Lowest First)</option>
                  <option value="moneyOut-desc">
                    Money Out (Highest First)
                  </option>
                  <option value="moneyOut-asc">Money Out (Lowest First)</option>
                  <option value="gross-desc">
                    Gross Revenue (Highest First)
                  </option>
                  <option value="gross-asc">
                    Gross Revenue (Lowest First)
                  </option>
                  <option value="jackpot-desc">Jackpot (Highest First)</option>
                  <option value="jackpot-asc">Jackpot (Lowest First)</option>
                  <option value="assetNumber-asc">Asset Number (A to Z)</option>
                  <option value="assetNumber-desc">
                    Asset Number (Z to A)
                  </option>
                  <option value="locationName-asc">Location (A to Z)</option>
                  <option value="locationName-desc">Location (Z to A)</option>
                  <option value="lastOnline-desc">
                    Last Online (Most Recent)
                  </option>
                  <option value="lastOnline-asc">
                    Last Online (Oldest First)
                  </option>
                </select>
                <ArrowDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Search Row - Purple box - Only show on cabinets section */}
          {activeSection === "cabinets" && (
            <div className="hidden lg:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
              <div className="relative flex-1 max-w-md min-w-0">
                <Input
                  type="text"
                  placeholder="Search machines..."
                  className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              <select
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-auto h-9 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section Content */}
          {activeSection === "cabinets" ? (
            <>
              {initialLoading || loading ? (
                <>
                  {/* Table Skeleton for large screens */}
                  <div className="hidden lg:block">
                    <CabinetTableSkeleton />
                  </div>

                  {/* Card Skeleton for small screens only */}
                  <div className="block lg:hidden">
                    <ClientOnly
                      fallback={
                        <div className="space-y-4 mt-4">Loading...</div>
                      }
                    >
                      <CabinetCardSkeleton />
                    </ClientOnly>
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

                  {/* Mobile Card View - Only show on small screens */}
                  <div
                    className="block lg:hidden mt-4 px-1 sm:px-2 space-y-3 sm:space-y-4 w-full max-w-full"
                    ref={cardsRef}
                  >
                    <ClientOnly fallback={<div>Loading cabinets...</div>}>
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
                          serialNumber={
                            (cabinet as any).serialNumber ||
                            (cabinet as any).origSerialNumber ||
                            (cabinet as any).machineId ||
                            ""
                          }
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
                    </ClientOnly>
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
                        onClick={() =>
                          setCurrentPage((p) => Math.max(0, p - 1))
                        }
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
                      <span className="text-gray-700 text-sm">
                        of {totalPages}
                      </span>
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
            </>
          ) : activeSection === "smib" ? (
            <SMIBManagement />
          ) : activeSection === "movement" ? (
            <MovementRequests locations={locations} />
          ) : activeSection === "firmware" ? (
            <SMIBFirmwareSection />
          ) : (
            <SMIBManagement />
          )}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default function CabinetsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CabinetsPageContent />
    </Suspense>
  );
}
