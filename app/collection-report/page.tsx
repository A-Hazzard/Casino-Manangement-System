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
import { Toaster } from "sonner";

import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

import { gsap } from "gsap";



import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import type { LocationSelectItem } from "@/lib/types/location";
import type { SchedulerTableRow } from "@/lib/types/componentProps";
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

import type { CollectorSchedule } from "@/lib/types/components";

// Icons
import CollectionNavigation from "@/components/collectionReport/CollectionNavigation";
import { COLLECTION_TABS_CONFIG } from "@/lib/constants/collection";
import type { CollectionView } from "@/lib/types/collection";
import { useCollectionNavigation } from "@/lib/hooks/useCollectionNavigation";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";

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
    <Suspense fallback={<div>Loading...</div>}>
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

  // Read initial view from URL and sync on change
  const { pushToUrl } = useCollectionNavigation(
    COLLECTION_TABS_CONFIG
  );

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
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as CollectionView;
      setActiveTab(newTab);
      pushToUrl(newTab);
    },
    [pushToUrl]
  );

  // Keep state in sync with URL changes (for browser back/forward)
  useEffect(() => {
    const section = searchParams?.get("section");
    if (section === "monthly" && activeTab !== "monthly") {
      setActiveTab("monthly");
    } else if (section === "manager" && activeTab !== "manager") {
      setActiveTab("manager");
    } else if (section === "collector" && activeTab !== "collector") {
      setActiveTab("collector");
    } else if (section === "collection" && activeTab !== "collection") {
      setActiveTab("collection");
    } else if (!section && activeTab !== "collection") {
      setActiveTab("collection");
    }
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

  // Fetch all gaming locations for filter dropdown
  useEffect(() => {
    fetchAllGamingLocations().then((locs) =>
      setLocations(locs.map((l) => ({ _id: l.id, name: l.name })))
    );
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
  // console.log("DEBUG: desktopData", desktopData);
  // console.log("DEBUG: mobileData", mobileData);
  // console.log("DEBUG: desktopPage", desktopPage);
  // console.log("DEBUG: mobilePage", mobilePage);

  return (
    <>

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-x-hidden md:w-11/12 md:ml-20 transition-all duration-300">
        <main className="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            disabled={false}
          />

          {/* Title Row */}
          <div className="flex items-center justify-between mt-4 w-full max-w-full">
            <div className="flex items-center gap-3 w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Collection Report
              </h1>
              <Image
                src={IMAGES.creditCardIcon}
                alt="Collection Report Icon"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
            </div>
          </div>

          {/* Section Navigation */}
          <div className="mt-8 mb-8">
            <CollectionNavigation
              tabs={COLLECTION_TABS_CONFIG}
              activeView={activeTab}
              onChange={(v) => handleTabChange(v)}
              isLoading={false}
            />
          </div>

          {/* Date Filters */}
          {/* Desktop Date Filters */}
          <div className="hidden xl:block">
            <DashboardDateFilters
              disabled={false}
              onCustomRangeGo={() => {
                // Trigger data fetch when custom range is applied
                if (activeTab === "collection") {
                  setLoading(true);
                  // The useEffect will handle the data fetching with the updated customDateRange
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
                // Trigger data fetch when custom range is applied
                if (activeTab === "collection") {
                  setLoading(true);
                  // The useEffect will handle the data fetching with the updated customDateRange
                }
              }}
            />
          </div>

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
                      onShowUncollectedOnlyChange={
                        handleShowUncollectedOnlyChange
                      }
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
              </motion.div>
            </AnimatePresence>
          </div>
          <Toaster richColors />
        </main>
      </div>
    </>
  );
}
