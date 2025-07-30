"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import NewCollectionModal from "@/components/collectionReport/NewCollectionModal";
import { gsap } from "gsap";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import type { LocationSelectItem } from "@/lib/types/location";
import type { SchedulerTableRow } from "@/lib/types/componentProps";
import {
  fetchMonthlyReportSummaryAndDetails,
  fetchAllLocationNames,
  getLocationsWithMachines,
  fetchCollectionReportsByLicencee,
} from "@/lib/helpers/collectionReport";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";
import { DateRange as RDPDateRange } from "react-day-picker";
import { usePathname } from "next/navigation";
import {
  animatePagination,
  animateTableRows,
  animateCards,
  animateContentTransition,
  filterCollectionReports,
  calculatePagination,
  fetchAndFormatSchedulers,
  setLastMonthDateRange,
} from "@/lib/helpers/collectionReportPage";
import { fetchAndFormatCollectorSchedules } from "@/lib/helpers/collectorSchedules";

import CollectionMobileUI from "@/components/collectionReport/CollectionMobileUI";
import CollectionDesktopUI from "@/components/collectionReport/CollectionDesktopUI";
import MonthlyMobileUI from "@/components/collectionReport/MonthlyMobileUI";
import MonthlyDesktopUI from "@/components/collectionReport/MonthlyDesktopUI";
import ManagerMobileUI from "@/components/collectionReport/ManagerMobileUI";
import ManagerDesktopUI from "@/components/collectionReport/ManagerDesktopUI";
import CollectorMobileUI from "@/components/collectionReport/CollectorMobileUI";
import CollectorDesktopUI from "@/components/collectionReport/CollectorDesktopUI";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import type { CollectionReportLocationWithMachines } from "@/lib/types/api";
import type { CollectorSchedule } from "@/lib/types/components";

/**
 * Main page component for the Collection Report.
 * Handles tab switching, data fetching, filtering, and pagination for:
 * - Collection Reports
 * - Monthly Reports
 * - Manager Schedules
 * - Collector Schedules
 */

// Tab option type definition
type TabOption = {
  value: "collection" | "monthly" | "manager" | "collector";
  label: string;
  disabled?: boolean;
  tooltip?: string;
};

// Tab type for clarity
const TAB_OPTIONS: TabOption[] = [
  { value: "collection", label: "Collection Reports" },
  { value: "monthly", label: "Monthly Report" },
  { value: "manager", label: "Manager Schedule" },
  { value: "collector", label: "Collectors Schedule" },
];

/**
 * Maps frontend time period values to backend API time period values
 */
const mapTimePeriodForAPI = (frontendTimePeriod: string): string => {
  switch (frontendTimePeriod) {
    case "last7days":
      return "7d";
    case "last30days":
      return "30d";
    case "Today":
    case "Yesterday":
    case "Custom":
    default:
      return frontendTimePeriod;
  }
};

export default function CollectionReportPage() {
  const pathname = usePathname();
  // Dashboard store state
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "collection" | "monthly" | "manager" | "collector"
  >("collection");

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Refs for animation and pagination
  const contentRef = useRef<HTMLDivElement>(null);
  const mobilePaginationRef = useRef<HTMLDivElement>(null);
  const desktopPaginationRef = useRef<HTMLDivElement>(null);
  const mobileCardsRef = useRef<HTMLDivElement>(null);
  const desktopTableRef = useRef<HTMLDivElement>(null);
  const monthlyPaginationRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPage, setDesktopPage] = useState(1);
  const itemsPerPage = 10;

  // Collection report data state
  const [reports, setReports] = useState<CollectionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Filter state for collection reports
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);
  const [search, setSearch] = useState<string>("");

  // Manager Schedule state
  const [schedulers, setSchedulers] = useState<SchedulerTableRow[]>([]);
  const [loadingSchedulers, setLoadingSchedulers] = useState(true);
  const [selectedSchedulerLocation, setSelectedSchedulerLocation] =
    useState("all");
  const [selectedCollector, setSelectedCollector] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [collectors, setCollectors] = useState<string[]>([]);

  // Collector Schedule state
  const [collectorSchedules, setCollectorSchedules] = useState<
    CollectorSchedule[]
  >([]);
  const [loadingCollectorSchedules, setLoadingCollectorSchedules] =
    useState(true);
  const [selectedCollectorLocation, setSelectedCollectorLocation] =
    useState("all");
  const [selectedCollectorFilter, setSelectedCollectorFilter] = useState("all");
  const [selectedCollectorStatus, setSelectedCollectorStatus] = useState("all");
  const [collectorsList, setCollectorsList] = useState<string[]>([]);

  // Monthly Report state
  const [monthlySummary, setMonthlySummary] = useState<MonthlyReportSummary>({
    drop: "-",
    cancelledCredits: "-",
    gross: "-",
    sasGross: "-",
  });
  const [monthlyDetails, setMonthlyDetails] = useState<
    MonthlyReportDetailsRow[]
  >([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyLocation, setMonthlyLocation] = useState<string>("all");
  const now = new Date();
  const [monthlyDateRange, setMonthlyDateRange] = useState<RDPDateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [pendingRange, setPendingRange] = useState<RDPDateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [allLocationNames, setAllLocationNames] = useState<string[]>([]);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const monthlyItemsPerPage = 10;

  // Global locations with machines state
  const [locationsWithMachines, setLocationsWithMachines] = useState<
    CollectionReportLocationWithMachines[]
  >([]);

  // Fetch all gaming locations for filter dropdown
  useEffect(() => {
    fetchAllGamingLocations().then((locs) =>
      setLocations(locs.map((l) => ({ _id: l.id, name: l.name })))
    );
  }, []);

  // Fetch locations with machines globally on page load
  useEffect(() => {
    getLocationsWithMachines().then((data) => {
      setLocationsWithMachines(data);
      // Also set locations for the select dropdown
      setLocations(
        data.map((l: CollectionReportLocationWithMachines) => ({
          _id: l._id,
          name: l.name,
        }))
      );
    });
  }, []);

  // Fetch collection reports data when collection tab is active
  useEffect(() => {
    if (activeTab === "collection") {
      setLoading(true);

      // Determine parameters for fetch based on activeMetricsFilter
      let dateRangeForFetch = undefined;
      let timePeriodForFetch = undefined;

      if (activeMetricsFilter === "Custom") {
        // For custom filter, check if both dates are set
        if (customDateRange?.startDate && customDateRange?.endDate) {
          dateRangeForFetch = {
            from: customDateRange.startDate,
            to: customDateRange.endDate,
          };
          timePeriodForFetch = "Custom";
        } else {
          // Custom selected but no range: do not fetch
          setLoading(false);
          return;
        }
      } else {
        // For predefined periods (Today, Yesterday, last7days, last30days), pass the time period
        timePeriodForFetch = mapTimePeriodForAPI(activeMetricsFilter);
      }

      fetchCollectionReportsByLicencee(
        selectedLicencee === "" ? undefined : selectedLicencee,
        dateRangeForFetch,
        timePeriodForFetch
      )
        .then((data: CollectionReportRow[]) => {
          console.log("📊 Collection Reports API Response:", {
            licensee: selectedLicencee,
            timePeriod: timePeriodForFetch,
            dataLength: data.length,
            firstItem: data[0] || null,
          });
          setReports(data);
          setLoading(false);
        })
        .catch((error: unknown) => {
          console.error("❌ Error fetching collection reports:", error);
          setReports([]);
          setLoading(false);
        });
    }
  }, [activeTab, selectedLicencee, activeMetricsFilter, customDateRange]);

  // Animate content when tab changes
  useEffect(() => {
    if (contentRef.current) {
      animateContentTransition(contentRef);
    }
  }, [activeTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setDesktopPage(1);
    setMobilePage(1);
  }, [selectedLocation, search, showUncollectedOnly]);

  // Animate table/cards when data changes
  useEffect(() => {
    if (!loading && !isSearching) {
      if (desktopTableRef.current && activeTab === "collection") {
        animateTableRows(desktopTableRef);
      }
      if (mobileCardsRef.current && activeTab === "collection") {
        animateCards(mobileCardsRef);
      }
    }
  }, [loading, isSearching, mobilePage, desktopPage, activeTab]);

  const filteredReports = useMemo(() => {
    const filtered = filterCollectionReports(
      reports,
      selectedLocation,
      search,
      showUncollectedOnly,
      locations
    );

    if (reports.length > 0) {
      console.log("🔍 Collection Reports Filtering:", {
        originalCount: reports.length,
        filteredCount: filtered.length,
        filters: { selectedLocation, showUncollectedOnly, search },
      });
    }

    return filtered;
  }, [reports, selectedLocation, showUncollectedOnly, search, locations]);

  const fetchMonthlyData = useCallback(() => {
    if (!monthlyDateRange.from || !monthlyDateRange.to) return;
    setMonthlyLoading(true);
    setMonthlyPage(1);
    fetchMonthlyReportSummaryAndDetails({
      startDate: monthlyDateRange.from,
      endDate: monthlyDateRange.to,
      locationName: monthlyLocation !== "all" ? monthlyLocation : undefined,
    })
      .then(({ summary, details }) => {
        setMonthlySummary(summary);
        setMonthlyDetails(details);
        setMonthlyLoading(false);
      })
      .catch(() => {
        setMonthlySummary({
          drop: "-",
          cancelledCredits: "-",
          gross: "-",
          sasGross: "-",
        });
        setMonthlyDetails([]);
        setMonthlyLoading(false);
      });
  }, [monthlyDateRange, monthlyLocation]);

  // Pagination calculations for mobile and desktop
  const mobileData = calculatePagination(
    filteredReports,
    mobilePage,
    itemsPerPage
  );
  const desktopData = calculatePagination(
    filteredReports,
    desktopPage,
    itemsPerPage
  );

  // Pagination handlers with animation
  const paginateMobile = (pageNumber: number) => {
    setMobilePage(pageNumber);
    if (activeTab === "collection") {
      animatePagination(mobilePaginationRef);
    }
  };

  const paginateDesktop = (pageNumber: number) => {
    setDesktopPage(pageNumber);
    if (activeTab === "collection") {
      animatePagination(desktopPaginationRef);
    }
  };

  // Fetch manager schedules and collectors when manager tab is active or filters change
  useEffect(() => {
    if (activeTab === "manager") {
      setLoadingSchedulers(true);
      fetchAndFormatSchedulers(
        selectedSchedulerLocation,
        selectedCollector,
        selectedStatus,
        locations
      )
        .then(({ schedulers, collectors }) => {
          setCollectors(collectors);
          setSchedulers(schedulers);
          setLoadingSchedulers(false);
        })
        .catch((error) => {
          console.error("Error fetching schedulers:", error);
          setLoadingSchedulers(false);
        });
    }
  }, [
    activeTab,
    selectedSchedulerLocation,
    selectedCollector,
    selectedStatus,
    locations,
  ]);

  // Reset all manager schedule filters
  const handleResetSchedulerFilters = () => {
    setSelectedSchedulerLocation("all");
    setSelectedCollector("all");
    setSelectedStatus("all");
  };

  // Fetch collector schedules when collector tab is active or filters change
  useEffect(() => {
    if (activeTab === "collector") {
      setLoadingCollectorSchedules(true);
      fetchAndFormatCollectorSchedules(
        selectedLicencee === "" ? undefined : selectedLicencee,
        selectedCollectorLocation,
        selectedCollectorFilter,
        selectedCollectorStatus
      )
        .then(({ collectorSchedules, collectors }) => {
          setCollectorsList(collectors);
          setCollectorSchedules(collectorSchedules);
          setLoadingCollectorSchedules(false);
        })
        .catch((error) => {
          console.error("Error fetching collector schedules:", error);
          setLoadingCollectorSchedules(false);
        });
    }
  }, [
    activeTab,
    selectedLicencee,
    selectedCollectorLocation,
    selectedCollectorFilter,
    selectedCollectorStatus,
  ]);

  // Reset all collector schedule filters
  const handleResetCollectorFilters = () => {
    setSelectedCollectorLocation("all");
    setSelectedCollectorFilter("all");
    setSelectedCollectorStatus("all");
  };

  // Fetch all location names and monthly data when monthly tab is active
  useEffect(() => {
    if (activeTab === "monthly") {
      fetchAllLocationNames()
        .then((names: string[]) => {
          setAllLocationNames(names);
        })
        .catch((error: Error) => {
          console.error("Error fetching locations:", error);
          setAllLocationNames([]);
        });
      fetchMonthlyData();
    }
  }, [activeTab, fetchMonthlyData]);

  // Refetch monthly data when date range or location changes
  useEffect(() => {
    if (activeTab === "monthly") {
      fetchMonthlyData();
    }
  }, [monthlyDateRange, monthlyLocation, activeTab, fetchMonthlyData]);

  // Set date range to last month for monthly report
  const handleLastMonth = () => {
    setLastMonthDateRange(setMonthlyDateRange, setPendingRange);
  };

  // Apply the pending date range to the monthly report
  const applyPendingDateRange = () => {
    if (pendingRange?.from && pendingRange?.to) {
      setMonthlyDateRange(pendingRange);
    }
  };

  // Pagination for monthly report
  const paginateMonthly = (pageNumber: number) => {
    setMonthlyPage(pageNumber);
    if (monthlyPaginationRef.current && activeTab === "monthly") {
      gsap.fromTo(
        monthlyPaginationRef.current,
        { scale: 0.95, opacity: 0.8 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: "back.out(1.7)",
        }
      );
    }
  };

  // Paginated items for monthly report
  const monthlyCurrentItems = monthlyDetails.slice(
    (monthlyPage - 1) * monthlyItemsPerPage,
    monthlyPage * monthlyItemsPerPage
  );
  const monthlyTotalPages = Math.ceil(
    monthlyDetails.length / monthlyItemsPerPage
  );

  // Handle changes to the pending date range for monthly report
  const handlePendingRangeChange = (range?: RDPDateRange) => {
    if (range && range.from && range.to) {
      setPendingRange(range);
    } else if (range && range.from && !range.to) {
      setPendingRange({ from: range.from, to: undefined });
    } else {
      setPendingRange({ from: undefined, to: undefined });
    }
  };

  // Search functionality
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleSearchSubmit = () => {
    if (search.trim()) {
      setIsSearching(true);
      // Trigger search animation
      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
  };

  const handleShowUncollectedOnlyChange = (checked: boolean) => {
    setShowUncollectedOnly(checked);
  };

  // --- RENDER ---

  // Debugging: Log data and filters to diagnose empty UI
  // console.log("DEBUG: reports", reports);
  // console.log("DEBUG: filteredReports", filteredReports);
  // console.log("DEBUG: filters", { selectedLocation, showUncollectedOnly, collectionDateRange });

  return (
    <div className="w-full max-w-full min-h-screen bg-background flex flex-col overflow-hidden transition-all duration-300 xl:w-full xl:mx-auto xl:pl-36">
      {/* Sidebar */}
      <div className="hidden xl:block w-26">
        <Sidebar pathname={pathname} />
      </div>
      {/* Main content wrapper with responsive left margin */}
      <div className="flex-1 xl:ml-20 flex flex-col overflow-hidden">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            disabled={loading}
          />
          {/* Date Filter above purple filter/search container */}
          <div className="mb-2">
            <DashboardDateFilters disabled={loading} />
          </div>
          {/* Mobile Tab Selector */}
          <div className="w-fit mx-auto xl:hidden mb-4">
            <Select
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <SelectTrigger className="bg-buttonActive text-white text-lg font-semibold py-3 px-4 rounded-md h-auto">
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                {TAB_OPTIONS.map((tab) => (
                  <SelectItem
                    key={tab.value}
                    value={tab.value}
                    disabled={tab.disabled}
                  >
                    {tab.label}
                    {tab.disabled && tab.tooltip ? ` (${tab.tooltip})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Desktop Tab Buttons */}
          <div className="hidden xl:flex flex-col xl:flex-row flex-wrap gap-2 mb-6 w-full min-w-0">
            {TAB_OPTIONS.map((tab) => (
              <div key={tab.value} className="relative group">
                <button
                  className={
                    `px-4 py-2 rounded-md font-semibold ` +
                    (activeTab === tab.value
                      ? "bg-buttonActive text-white"
                      : "bg-button text-white") +
                    (tab.disabled ? " opacity-50 cursor-not-allowed" : "")
                  }
                  onClick={() =>
                    !tab.disabled && setActiveTab(tab.value as typeof activeTab)
                  }
                  disabled={!!tab.disabled}
                >
                  {tab.label}
                </button>
                {/* Tooltip for disabled tabs */}
                {tab.disabled && tab.tooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    {tab.tooltip}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Main Content Area with Animation */}
          <div ref={contentRef} className="relative w-full">
            {activeTab === "collection" && (
              <div className="tab-content-wrapper">
                {/* Desktop */}
                <CollectionDesktopUI
                  loading={loading}
                  filteredReports={filteredReports}
                  desktopCurrentItems={desktopData.currentItems}
                  desktopTotalPages={desktopData.totalPages}
                  desktopPage={desktopPage}
                  onPaginateDesktop={paginateDesktop}
                  desktopPaginationRef={desktopPaginationRef}
                  desktopTableRef={desktopTableRef}
                  itemsPerPage={itemsPerPage}
                  // Filter props
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationChange={handleLocationChange}
                  search={search}
                  onSearchChange={handleSearchChange}
                  onSearchSubmit={handleSearchSubmit}
                  showUncollectedOnly={showUncollectedOnly}
                  onShowUncollectedOnlyChange={handleShowUncollectedOnlyChange}
                  isSearching={isSearching}
                />
                {/* Mobile */}
                <CollectionMobileUI
                  loading={loading}
                  filteredReports={filteredReports}
                  mobileCurrentItems={mobileData.currentItems}
                  mobileTotalPages={mobileData.totalPages}
                  mobilePage={mobilePage}
                  onPaginateMobile={paginateMobile}
                  mobilePaginationRef={mobilePaginationRef}
                  mobileCardsRef={mobileCardsRef}
                  itemsPerPage={itemsPerPage}
                  // Filter props
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationChange={handleLocationChange}
                  search={search}
                  onSearchChange={handleSearchChange}
                  onSearchSubmit={handleSearchSubmit}
                  showUncollectedOnly={showUncollectedOnly}
                  onShowUncollectedOnlyChange={handleShowUncollectedOnlyChange}
                  isSearching={isSearching}
                />
              </div>
            )}
            {activeTab === "monthly" && (
              <div className="tab-content-wrapper">
                {/* Desktop */}
                <MonthlyDesktopUI
                  allLocationNames={allLocationNames}
                  monthlyLocation={monthlyLocation}
                  onMonthlyLocationChange={setMonthlyLocation}
                  pendingRange={pendingRange}
                  onPendingRangeChange={handlePendingRangeChange}
                  onApplyDateRange={applyPendingDateRange}
                  onSetLastMonth={handleLastMonth}
                  monthlySummary={monthlySummary}
                  monthlyDetails={monthlyDetails}
                  monthlyCurrentItems={monthlyCurrentItems}
                  monthlyLoading={monthlyLoading}
                  monthlyTotalPages={monthlyTotalPages}
                  monthlyPage={monthlyPage}
                  onPaginateMonthly={paginateMonthly}
                  monthlyPaginationRef={monthlyPaginationRef}
                  monthlyFirstItemIndex={
                    (monthlyPage - 1) * monthlyItemsPerPage
                  }
                  monthlyLastItemIndex={monthlyPage * monthlyItemsPerPage}
                />
                {/* Mobile */}
                <MonthlyMobileUI
                  allLocationNames={allLocationNames}
                  monthlyLocation={monthlyLocation}
                  onMonthlyLocationChange={setMonthlyLocation}
                  pendingRange={pendingRange}
                  onPendingRangeChange={handlePendingRangeChange}
                  onApplyDateRange={applyPendingDateRange}
                  monthlySummary={monthlySummary}
                  monthlyDetails={monthlyDetails}
                  monthlyLoading={monthlyLoading}
                />
              </div>
            )}
            {activeTab === "manager" && (
              <div className="tab-content-wrapper">
                {/* Desktop */}
                <ManagerDesktopUI
                  locations={locations}
                  collectors={collectors}
                  selectedSchedulerLocation={selectedSchedulerLocation}
                  onSchedulerLocationChange={setSelectedSchedulerLocation}
                  selectedCollector={selectedCollector}
                  onCollectorChange={setSelectedCollector}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  onResetSchedulerFilters={handleResetSchedulerFilters}
                  schedulers={schedulers}
                  loadingSchedulers={loadingSchedulers}
                />
                {/* Mobile */}
                <ManagerMobileUI
                  locations={locations}
                  collectors={collectors}
                  selectedSchedulerLocation={selectedSchedulerLocation}
                  onSchedulerLocationChange={setSelectedSchedulerLocation}
                  selectedCollector={selectedCollector}
                  onCollectorChange={setSelectedCollector}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  onResetSchedulerFilters={handleResetSchedulerFilters}
                  schedulers={schedulers}
                  loadingSchedulers={loadingSchedulers}
                />
              </div>
            )}
            {activeTab === "collector" && (
              <div className="tab-content-wrapper">
                {/* Desktop */}
                <CollectorDesktopUI
                  locations={locations}
                  collectors={collectorsList}
                  selectedLocation={selectedCollectorLocation}
                  onLocationChange={setSelectedCollectorLocation}
                  selectedCollector={selectedCollectorFilter}
                  onCollectorChange={setSelectedCollectorFilter}
                  selectedStatus={selectedCollectorStatus}
                  onStatusChange={setSelectedCollectorStatus}
                  onResetFilters={handleResetCollectorFilters}
                  collectorSchedules={collectorSchedules}
                  loadingCollectorSchedules={loadingCollectorSchedules}
                />
                {/* Mobile */}
                <CollectorMobileUI
                  locations={locations}
                  collectors={collectorsList}
                  selectedLocation={selectedCollectorLocation}
                  onLocationChange={setSelectedCollectorLocation}
                  selectedCollector={selectedCollectorFilter}
                  onCollectorChange={setSelectedCollectorFilter}
                  selectedStatus={selectedCollectorStatus}
                  onStatusChange={setSelectedCollectorStatus}
                  onResetFilters={handleResetCollectorFilters}
                  collectorSchedules={collectorSchedules}
                  loadingCollectorSchedules={loadingCollectorSchedules}
                />
              </div>
            )}
          </div>
          {/* Modal */}
          {showModal && (
            <NewCollectionModal
              show={showModal}
              onClose={() => setShowModal(false)}
              locations={locationsWithMachines}
            />
          )}
        </main>
      </div>
    </div>
  );
}
