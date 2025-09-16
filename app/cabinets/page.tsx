"use client";

import PageLayout from "@/components/layout/PageLayout";

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
import { CustomSelect } from "@/components/ui/custom-select";
import { fetchCabinets, fetchCabinetLocations } from "@/lib/helpers/cabinets";
import { mapToCabinetProps } from "@/lib/utils/cabinet";
import {
  getActiveSectionFromURL,
  handleSectionChange as handleSectionChangeHelper,
  filterCabinets as filterCabinetsHelper,
} from "@/lib/helpers/cabinetsPage";
import { calculateCabinetFinancialTotals } from "@/lib/utils/financial";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";
import { Cabinet, CabinetProps, CabinetSortOption } from "@/lib/types/cabinets";
import { NetworkError } from "@/components/ui/errors";

import {
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import SMIBManagement from "@/components/cabinets/SMIBManagement";
import MovementRequests from "@/components/cabinets/MovementRequests";
import NewMovementRequestModal from "@/components/ui/movements/NewMovementRequestModal";
import UploadSmibDataModal from "@/components/ui/firmware/UploadSmibDataModal";
import SMIBFirmwareSection from "@/components/ui/firmware/SMIBFirmwareSection";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import ClientOnly from "@/components/ui/common/ClientOnly";
import FinancialMetricsCards from "@/components/ui/FinancialMetricsCards";
import CabinetsNavigation from "@/components/cabinets/CabinetsNavigation";
import { CABINET_TABS_CONFIG } from "@/lib/constants/cabinets";
import type { CabinetSection } from "@/lib/constants/cabinets";
import { IMAGES } from "@/lib/constants/images";

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
  const closeNewMovementRequestModal = () =>
    setIsNewMovementRequestModalOpen(false);

  const handleMovementRequestSubmit = () => {
    // Refresh the cabinets data to show updated movement requests
    loadCabinets();
    closeNewMovementRequestModal();
  };

  const [isUploadSmibDataModalOpen, setIsUploadSmibDataModalOpen] =
    useState(false);
  const closeUploadSmibDataModal = () => setIsUploadSmibDataModalOpen(false);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  // Get active section from URL search params, default to "cabinets"
  const getActiveSectionFromURLLocal = useCallback((): CabinetSection => {
    return getActiveSectionFromURL(searchParams);
  }, [searchParams]);

  const [activeSection, setActiveSection] = useState<CabinetSection>(
    getActiveSectionFromURLLocal()
  );

  // Handle section changes with URL updates
  const handleSectionChange = (section: CabinetSection) => {
    setActiveSection(section);
    handleSectionChangeHelper(section, searchParams, pathname, router);
  };

  // Sync state with URL changes
  useEffect(() => {
    const newSection = getActiveSectionFromURLLocal();
    if (newSection !== activeSection) {
      setActiveSection(newSection);
    }
  }, [searchParams, activeSection, getActiveSectionFromURLLocal]);

  // Calculate financial totals from cabinet data
  const financialTotals = calculateCabinetFinancialTotals(allCabinets);

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
      const filtered = filterCabinetsHelper(cabinets, search, selectedLocation);
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
      setError(err instanceof Error ? err.message : "Failed to load cabinets");
    } finally {
      setLoading(false);
      setInitialLoading(false); // Set initialLoading to false after the first load completes
    }
  }, [
    selectedLicencee,
    filterCabinets,
    searchTerm,
    activeMetricsFilter,
    customDateRange,
    setLoadingChartData,
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

  const transformCabinet = useMemo(() => {
    return (cabinet: Cabinet): CabinetProps => {
      return mapToCabinetProps(cabinet, {
        onEdit: handleEdit,
        onDelete: handleDelete,
      });
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
    // Filter cabinets basedallow the user to enter multiple links and let it download the videos simultaneously if they want on selected location
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

  return (
    <>
      <EditCabinetModal onCabinetUpdated={loadCabinets} />
      <DeleteCabinetModal onCabinetDeleted={loadCabinets} />
      <NewCabinetModal
        locations={locations}
        currentLocationName={
          selectedLocation !== "all"
            ? locations.find((loc) => loc._id === selectedLocation)?.name
            : undefined
        }
        onCreated={loadCabinets}
      />
      <NewMovementRequestModal
        isOpen={isNewMovementRequestModalOpen}
        onClose={closeNewMovementRequestModal}
        locations={locations}
        onSubmit={handleMovementRequestSubmit}
        onRefresh={loadCabinets}
      />
      <UploadSmibDataModal
        isOpen={isUploadSmibDataModalOpen}
        onClose={closeUploadSmibDataModal}
        onRefresh={loadCabinets}
      />

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        {/* Title and icon layout */}
        <div className="flex items-center justify-between mt-4 w-full max-w-full">
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Cabinets
            </h1>
            <Image
              src={IMAGES.cabinetsIcon}
              alt="Cabinet Icon"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 ml-2"
            />
          </div>
          {/* Desktop header action button */}
          {activeSection === "cabinets" && (
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <Button
                onClick={() =>
                  openCabinetModal(
                    selectedLocation !== "all" ? selectedLocation : undefined
                  )
                }
                className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
                title="Add Cabinet"
              >
                <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span>Add Cabinet</span>
              </Button>
            </div>
          )}
          {activeSection === "movement" && (
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <Button
                onClick={() => setIsNewMovementRequestModalOpen(true)}
                className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
              >
                <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span>Create Movement Request</span>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile header action button */}
        {activeSection === "cabinets" && (
          <div className="md:hidden mt-4 w-full">
            <Button
              onClick={() =>
                openCabinetModal(
                  selectedLocation !== "all" ? selectedLocation : undefined
                )
              }
              className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
              title="Add Cabinet"
            >
              <Plus size={20} />
              Add Cabinet
            </Button>
          </div>
        )}
        {activeSection === "movement" && (
          <div className="md:hidden mt-4 w-full">
            <Button
              onClick={() => setIsNewMovementRequestModalOpen(true)}
              className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Create Movement Request
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
              disabled={loading}
              hideAllTime={false}
              onCustomRangeGo={loadCabinets}
            />
          </div>
        </div>
        {/* Mobile: Search, Location Filter, and Sort stacked - Only show on cabinets section */}
        {activeSection === "cabinets" && (
          <div className="md:hidden flex flex-col gap-4 mt-4">
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
              <CustomSelect
                value={selectedLocation}
                onValueChange={handleLocationChange}
                options={[
                  { value: "all", label: "All Locations" },
                  ...locations.map((location) => ({
                    value: location._id,
                    label: location.name,
                  })),
                ]}
                placeholder="All Locations"
                className="w-full"
                triggerClassName="h-11 bg-white border border-gray-300 rounded-full px-4 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-base"
                searchable={true}
                emptyMessage="No locations found"
              />
            </div>
            <div className="relative w-full">
              <CustomSelect
                value={`${sortOption}-${sortOrder}`}
                onValueChange={(value) => {
                  const [option, order] = value.split("-");
                  setSortOption(option as CabinetSortOption);
                  setSortOrder(order as "asc" | "desc");
                }}
                options={[
                  { value: "moneyIn-desc", label: "Money In (Highest First)" },
                  { value: "moneyIn-asc", label: "Money In (Lowest First)" },
                  {
                    value: "moneyOut-desc",
                    label: "Money Out (Highest First)",
                  },
                  { value: "moneyOut-asc", label: "Money Out (Lowest First)" },
                  {
                    value: "gross-desc",
                    label: "Gross Revenue (Highest First)",
                  },
                  { value: "gross-asc", label: "Gross Revenue (Lowest First)" },
                  { value: "jackpot-desc", label: "Jackpot (Highest First)" },
                  { value: "jackpot-asc", label: "Jackpot (Lowest First)" },
                  { value: "assetNumber-asc", label: "Asset Number (A to Z)" },
                  { value: "assetNumber-desc", label: "Asset Number (Z to A)" },
                  { value: "locationName-asc", label: "Location (A to Z)" },
                  { value: "locationName-desc", label: "Location (Z to A)" },
                  {
                    value: "lastOnline-desc",
                    label: "Last Online (Most Recent)",
                  },
                  {
                    value: "lastOnline-asc",
                    label: "Last Online (Oldest First)",
                  },
                ]}
                placeholder="Sort by"
                className="w-full"
                triggerClassName="h-11 bg-white border border-gray-300 rounded-full px-4 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-base"
                searchable={true}
                emptyMessage="No sort options found"
              />
            </div>
          </div>
        )}

        {/* Search Row - Purple box - Only show on cabinets section */}
        {activeSection === "cabinets" && (
          <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
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
            {error ? (
              <NetworkError
                title="Failed to Load Cabinets"
                message="Unable to load cabinet data. Please check your connection and try again."
                onRetry={loadCabinets}
                isRetrying={loading}
                errorDetails={error}
              />
            ) : initialLoading || loading ? (
              <>
                {/* Table Skeleton for large screens */}
                <div className="hidden md:block">
                  <ClientOnly fallback={<CabinetTableSkeleton />}>
                    <CabinetTableSkeleton />
                  </ClientOnly>
                </div>

                {/* Card Skeleton for small screens only */}
                <div className="block md:hidden">
                  <ClientOnly fallback={<CabinetCardSkeleton />}>
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
                <div className="hidden md:block" ref={tableRef}>
                  <CabinetTable
                    cabinets={paginatedCabinets.map(transformCabinet)}
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
                  className="block md:hidden mt-4 px-1 sm:px-2 space-y-3 sm:space-y-4 w-full max-w-full"
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
                        serialNumber={getSerialNumberIdentifier(cabinet)}
                        locationId={cabinet.locationId || ""}
                        locationName={cabinet.locationName || ""}
                        moneyIn={cabinet.moneyIn || 0}
                        moneyOut={cabinet.moneyOut || 0}
                        cancelledCredits={cabinet.moneyOut || 0}
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
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
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
      </PageLayout>
    </>
  );
}

export default function CabinetsPage() {
  return (
    <Suspense fallback={<CabinetTableSkeleton />}>
      <CabinetsPageContent />
    </Suspense>
  );
}
