"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import PageLayout from "@/components/layout/PageLayout";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

import { gsap } from "gsap";

import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import { getLocationsWithMachines } from "@/lib/helpers/collectionReport";
import type { LocationSelectItem } from "@/lib/types/location";
import type { SchedulerTableRow } from "@/lib/types/componentProps";
import type { CollectionReportLocationWithMachines } from "@/lib/types/api";
import {
  fetchMonthlyReportSummaryAndDetails,
  fetchAllLocationNames,
  fetchCollectionReportsByLicencee,
} from "@/lib/helpers/collectionReport";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";
import { DateRange as RDPDateRange } from "react-day-picker";
import {
  animatePagination,
  animateContentTransition,
  filterCollectionReports,
  calculatePagination,
  fetchAndFormatSchedulers,
  setLastMonthDateRange,
  animateTableRows,
  animateCards,
} from "@/lib/helpers/collectionReportPageV2";
import { fetchAndFormatCollectorSchedules } from "@/lib/helpers/collectorSchedules";
import {
  handleTabChange,
  syncStateWithURL,
  handlePaginationWithAnimation,
  resetSchedulerFilters,
  resetCollectorFilters,
} from "@/lib/helpers/collectionReportPage";

import CollectionMobileUI from "@/components/collectionReport/CollectionMobileUI";
import CollectionDesktopUI from "@/components/collectionReport/CollectionDesktopUI";
import MonthlyMobileUI from "@/components/collectionReport/MonthlyMobileUI";
import MonthlyDesktopUI from "@/components/collectionReport/MonthlyDesktopUI";
import ManagerMobileUI from "@/components/collectionReport/ManagerMobileUI";
import ManagerDesktopUI from "@/components/collectionReport/ManagerDesktopUI";
import CollectorMobileUI from "@/components/collectionReport/CollectorMobileUI";
import CollectorDesktopUI from "@/components/collectionReport/CollectorDesktopUI";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import NewCollectionModal from "@/components/collectionReport/NewCollectionModal";
import EditCollectionModalV2 from "@/components/collectionReport/EditCollectionModalV2";
import ErrorBoundary from "@/components/ui/errors/ErrorBoundary";

import type { CollectorSchedule } from "@/lib/types/components";

// Icons
import CollectionNavigation from "@/components/collectionReport/CollectionNavigation";
import { COLLECTION_TABS_CONFIG } from "@/lib/constants/collection";
import type { CollectionView } from "@/lib/types/collection";
import { useCollectionNavigation } from "@/lib/hooks/useCollectionNavigation";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";
import "./animations.css";

/**
 * Main page component for the Collection Report.
 * Handles tab switching, data fetching, filtering, and pagination for:
 * - Collection Reports
 * - Monthly Reports
 * - Manager Schedules
 * - Collector Schedules
 */

// Collection tabs config is defined in lib/constants/collection.ts

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
    case "All Time":
    case "Custom":
    default:
      return frontendTimePeriod;
  }
};

export default function CollectionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CollectionReportContent />
    </Suspense>
  );
}

function CollectionReportContent() {
  const searchParams = useSearchParams();
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // Animation functions are now imported directly from V2 helpers

  // Read initial view from URL and sync on change
  const { pushToUrl } = useCollectionNavigation(COLLECTION_TABS_CONFIG);

  // Initialize activeTab from URL on first load
  const [activeTab, setActiveTab] = useState<CollectionView>(() => {
    const section = searchParams?.get("section");
    if (section === "monthly") return "monthly";
    if (section === "manager") return "manager";
    if (section === "collector") return "collector";
    if (section === "collection") return "collection";
    return "collection"; // default
  });

  // Update URL when tab changes
  const handleTabChangeLocal = useCallback(
    (value: string) => {
      handleTabChange(value, setActiveTab, pushToUrl);
    },
    [pushToUrl]
  );

  // Keep state in sync with URL changes (for browser back/forward)
  useEffect(() => {
    syncStateWithURL(searchParams, activeTab, setActiveTab);
  }, [searchParams, activeTab]);

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

  // New Collection Modal state
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);

  // Edit Collection Modal state
  const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Filter state for collection reports
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [locationsWithMachines, setLocationsWithMachines] = useState<
    CollectionReportLocationWithMachines[]
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

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

  // Fetch all gaming locations for filter dropdown
  useEffect(() => {
    fetchAllGamingLocations().then((locs) =>
      setLocations(locs.map((l) => ({ _id: l.id, name: l.name })))
    );
  }, []);

  // Fetch locations with machines for the modal
  useEffect(() => {
    getLocationsWithMachines().then(setLocationsWithMachines);
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

  // Function to refresh collection reports data
  const refreshCollectionReports = useCallback(() => {
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
  }, [selectedLocation, search, showUncollectedOnly, selectedFilters]);

  // Animate table/cards when data changes with CSS animations
  useEffect(() => {
    if (!loading && !isSearching && activeTab === "collection") {
      // Use CSS-based animation functions
      if (desktopTableRef.current) {
        animateTableRows(desktopTableRef);
      }
      if (mobileCardsRef.current) {
        animateCards(mobileCardsRef);
      }
    }
  }, [loading, isSearching, mobilePage, desktopPage, activeTab]);

  const filteredReports = useMemo(() => {
    if (!reports || !Array.isArray(reports)) {
      return [];
    }

    const filtered = filterCollectionReports(
      reports,
      selectedLocation,
      search,
      showUncollectedOnly,
      locations
    );

    // Apply SMIB filters
    if (selectedFilters.length > 0) {
      return filtered.filter((report) => {
        return selectedFilters.some((filter) => {
          if (filter === "SMIBLocationsOnly" && !report.noSMIBLocation)
            return true;
          if (filter === "NoSMIBLocation" && report.noSMIBLocation === true)
            return true;
          if (filter === "LocalServersOnly" && report.isLocalServer)
            return true;
          return false;
        });
      });
    }

    return filtered;
  }, [
    reports,
    selectedLocation,
    showUncollectedOnly,
    search,
    locations,
    selectedFilters,
  ]);

  const fetchMonthlyData = useCallback(() => {
    if (!monthlyDateRange.from || !monthlyDateRange.to) return;
    setMonthlyLoading(true);
    setMonthlyPage(1);
    fetchMonthlyReportSummaryAndDetails({
      startDate: monthlyDateRange.from,
      endDate: monthlyDateRange.to,
      locationName: monthlyLocation !== "all" ? monthlyLocation : undefined,
      licencee: selectedLicencee,
    })
      .then(({ summary, details }) => {
        // Console log the drop calculation for verification
        if (details && details.length > 0) {
          const dropValues = details.map(
            (detail) => parseInt(detail.drop) || 0
          );
          const dropSum = dropValues.reduce((sum, drop) => sum + drop, 0);
          console.warn(
            "DROP CALCULATION:",
            `${dropValues.join(" + ")} = ${dropSum}`
          );
        }

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
  }, [monthlyDateRange, monthlyLocation, selectedLicencee]);

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
    handlePaginationWithAnimation(
      pageNumber,
      setMobilePage,
      activeTab,
      mobilePaginationRef,
      animatePagination
    );
  };

  const paginateDesktop = (pageNumber: number) => {
    handlePaginationWithAnimation(
      pageNumber,
      setDesktopPage,
      activeTab,
      desktopPaginationRef,
      animatePagination
    );
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
    resetSchedulerFilters(
      setSelectedSchedulerLocation,
      setSelectedCollector,
      setSelectedStatus
    );
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
    resetCollectorFilters(
      setSelectedCollectorLocation,
      setSelectedCollectorFilter,
      setSelectedCollectorStatus
    );
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

  const handleFilterChange = (filter: string, checked: boolean) => {
    if (checked) {
      setSelectedFilters((prev) => [...prev, filter]);
    } else {
      setSelectedFilters((prev) => prev.filter((f) => f !== filter));
    }
  };

  const handleClearFilters = () => {
    setSelectedLocation("all");
    setShowUncollectedOnly(false);
    setSearch("");
    setSelectedFilters([]);
  };

  // Handle edit collection report
  const handleEditCollectionReport = (reportId: string) => {
    setEditingReportId(reportId);
    setShowEditCollectionModal(true);
  };

  // Handle close edit modal
  const handleCloseEditModal = useCallback(() => {
    setShowEditCollectionModal(false);
    // Delay clearing reportId to allow modal to cleanup properly
    setTimeout(() => {
      setEditingReportId(null);
    }, 300); // Wait for modal close animation
  }, []);

  // --- RENDER ---

  // Debugging: Log data and filters to diagnose empty UI
  // console.log("DEBUG: reports", reports);
  // console.log("DEBUG: filteredReports", filteredReports);
  // console.log("DEBUG: desktopData", desktopData);
  // console.log("DEBUG: mobileData", mobileData);
  // console.log("DEBUG: desktopPage", desktopPage);
  // console.log("DEBUG: mobilePage", mobilePage);

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >

        {/* Title Row - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 w-full max-w-full gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">

        {/* Title Row */}
        <div className="flex items-center justify-between mt-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Collection Report
            </h1>
            <Image
              src={IMAGES.creditCardIcon}
              alt="Collection Report Icon"
              width={32}
              height={32}

              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"

              className="w-6 h-6 sm:w-8 sm:h-8"
            />
          </div>

          {/* Create Collection Report Button - Only show on collection tab */}
          {activeTab === "collection" && (
            <button
              onClick={() => setShowNewCollectionModal(true)}

              className="bg-buttonActive text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm font-medium w-full sm:w-auto"
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4"

              className="bg-buttonActive text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>

              <span className="hidden xs:inline">Create Collection Report</span>
              <span className="xs:hidden">Create Report</span>

              Create Collection Report
            </button>
          )}
        </div>

        {/* Section Navigation */}
        <div className="mt-8 mb-8">
          <CollectionNavigation
            tabs={COLLECTION_TABS_CONFIG}
            activeView={activeTab}
            onChange={(v) => handleTabChangeLocal(v)}
            isLoading={false}
          />
        </div>

        {/* Date Filters */}
        {/* Show standard filters only for collection/manager/collector. Monthly uses its own controls */}
        {activeTab !== "monthly" && (
          <>
            {/* Desktop Date Filters */}
            <div className="hidden xl:block">
              <DashboardDateFilters
                disabled={false}
                onCustomRangeGo={() => {
                  if (activeTab === "collection") {
                    setLoading(true);
                  }
                }}
              />
            </div>
            {/* Mobile Date Filters */}
            <div className="xl:hidden mt-4">
              <DashboardDateFilters
                mode="auto"
                disabled={false}
                onCustomRangeGo={() => {
                  if (activeTab === "collection") {
                    setLoading(true);
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {/* Your existing tab content logic here */}
              {/* This is where you'll render the different tab components */}
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
                    onShowUncollectedOnlyChange={
                      handleShowUncollectedOnlyChange
                    }
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    isSearching={isSearching}
                    onEdit={handleEditCollectionReport}
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
                    onShowUncollectedOnlyChange={
                      handleShowUncollectedOnlyChange
                    }
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    isSearching={isSearching}
                    onEdit={handleEditCollectionReport}
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
                    onSetLastMonth={handleLastMonth}
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
            </motion.div>
          </AnimatePresence>
        </div>
      </PageLayout>

      {/* New Collection Modal */}
      <NewCollectionModal
        show={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        locations={locationsWithMachines}
        onRefresh={refreshCollectionReports}
      />

      {/* Edit Collection Modal V2 */}
      {editingReportId && (
        <ErrorBoundary>
          <EditCollectionModalV2
            show={showEditCollectionModal}
            onClose={handleCloseEditModal}
            reportId={editingReportId}
            locations={locationsWithMachines}
            onRefresh={refreshCollectionReports}
          />
        </ErrorBoundary>
      )}
    </>
  );
}
