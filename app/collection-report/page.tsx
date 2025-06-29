"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import Image from "next/image";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import type { LocationSelectItem } from "@/lib/types/location";
import type { SchedulerTableRow } from "@/lib/types/componentProps";
import {
  fetchMonthlyReportSummaryAndDetails,
  fetchAllLocationNames,
  getLocationsWithMachines,
} from "@/lib/helpers/collectionReport";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";
import { DateRange as RDPDateRange } from "react-day-picker";
import { fetchCollectionReportsByLicencee } from "@/lib/helpers/collectionReport";
import type { CollectionReportLocationWithMachines } from "@/lib/types/api";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  animatePagination,
  animateTableRows,
  animateCards,
  animateContentTransition,
  filterCollectionReports,
  calculatePagination,
  fetchAndFormatSchedulers,
  setLastMonthDateRange,
  triggerSearchAnimation,
} from "@/lib/helpers/collectionReportPage";

import CollectionMobileUI from "@/components/collectionReport/CollectionMobileUI";
import CollectionDesktopUI from "@/components/collectionReport/CollectionDesktopUI";
import MonthlyMobileUI from "@/components/collectionReport/MonthlyMobileUI";
import MonthlyDesktopUI from "@/components/collectionReport/MonthlyDesktopUI";
import ManagerMobileUI from "@/components/collectionReport/ManagerMobileUI";
import ManagerDesktopUI from "@/components/collectionReport/ManagerDesktopUI";
import CollectorMobileUI from "@/components/collectionReport/CollectorMobileUI";
import CollectorDesktopUI from "@/components/collectionReport/CollectorDesktopUI";
import { EmptyState } from "@/components/ui/EmptyState";

// Skeleton components
import {
  MonthlyTableSkeleton,
  MonthlySummarySkeleton,
  ManagerTableSkeleton,
  CardSkeleton,
} from "@/components/ui/skeletons/CollectionReportSkeletons";

/**
 * Main page component for the Collection Report.
 * Handles tab switching, data fetching, filtering, and pagination for:
 * - Collection Reports
 * - Monthly Reports
 * - Manager Schedules
 * - Collector Schedules
 */
export default function CollectionReportPage() {
  const pathname = usePathname();
  // Dashboard store state
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

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
  const [search, setSearch] = useState("");
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);

  // Manager Schedule state
  const [schedulers, setSchedulers] = useState<SchedulerTableRow[]>([]);
  const [loadingSchedulers, setLoadingSchedulers] = useState(true);
  const [selectedSchedulerLocation, setSelectedSchedulerLocation] =
    useState("all");
  const [selectedCollector, setSelectedCollector] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [collectors, setCollectors] = useState<string[]>([]);

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

  // Refetch handler
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await fetchCollectionReportsByLicencee(selectedLicencee);
      setReports(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch {
      setReports([]);
      setLoading(false);
    }
  };

  /**
   * Fetches monthly report summary and details for the selected date range and location.
   */
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

  // Fetch collection reports when selectedLicencee changes
  useEffect(() => {
    setLoading(true);
    fetchCollectionReportsByLicencee(selectedLicencee)
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch collection reports:", error);
        setReports([]);
        setLoading(false);
      });
  }, [selectedLicencee]);

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
  }, [selectedLocation, search, showUncollectedOnly, selectedLicencee]);

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

  // Filter reports based on location, search, and uncollected status
  const filteredReports = filterCollectionReports(
    reports,
    selectedLocation,
    search,
    showUncollectedOnly,
    locations
  );

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

  // Triggers a search animation
  const handleSearch = () => {
    triggerSearchAnimation(setIsSearching);
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

  // --- RENDER ---

  return (
    <div className="flex flex-row min-h-screen bg-background">
      {/* Sidebar for desktop */}
      <div className="hidden md:block">
        <Sidebar pathname={pathname} />
      </div>
      {/* Adjusted main content wrapper: use ml-36 (9rem) based on sidebar's apparent width */}
      <div className="flex-1 md:ml-36 flex flex-col overflow-hidden">
        <main className="flex-1 p-4 lg:p-6 w-full overflow-x-auto">
          {/* Header with licencee selector */}
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            pageTitle=""
            disabled={loading}
          />

          {/* Page Title and "New Collection" Button Section */}
          {/* Mobile: Centered column. Desktop: Row with title/icon left, button right */}
          <div className="flex w-full mb-4 mt-4 px-1 flex-col items-center lg:flex-row lg:justify-between lg:items-center">
            {/* Content Block: (Icon + (Title + PlusIcon)) */}
            {/* This entire block is centered on mobile. On desktop, it's the left part of justify-between. */}
            <div className="flex flex-col items-center lg:flex-row lg:items-center lg:gap-2">
              {/* Document Icon - Centered above text on mobile, next to on desktop */}
              <Image
                src="/details.svg" // Assuming this is the green document icon from your image
                alt="Collections Icon"
                width={32} // Adjusted size to better match mobile image impression
                height={32}
                className="mb-1 lg:mb-0 h-8 w-8" // h-8 w-8 for consistent sizing if width/height props are for aspect ratio
              />
              {/* Title + Plus Icon (always together next to each other) */}
              <div className="flex flex-row items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-800">
                  Collections
                </h1>
                {/* Plus icon is visible on mobile/tablet, hidden on large screens */}
                <Image
                  src="/plusButton.svg" // Green plus icon from your image
                  alt="Add New Collection"
                  width={28}
                  height={28}
                  className="cursor-pointer h-7 w-7 lg:hidden" // Hidden on large screens
                  onClick={() => setShowModal(true)} // Make the icon itself trigger modal
                />
              </div>
            </div>

            {/* Desktop: Separate "New Collection" Button (on the right) */}
            {/* This button is only for desktop, providing a larger click target with text */}
            <div className="flex flex-row gap-2 items-center mt-4 lg:mt-0">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                className={`bg-buttonActive text-white px-4 py-2 rounded-md flex items-center gap-2 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582M20 20v-5h-.581M5.635 19.364A9 9 0 104.582 9.582"
                  />
                </svg>
                Refresh
              </Button>
              <button
                className="hidden lg:flex bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-lg items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <Image
                  src="/plusButtonWhite.svg"
                  alt="Add"
                  width={20}
                  height={20}
                  className="filter-white"
                />
                New Collection
              </button>
            </div>
          </div>

          {/* Mobile: Tab selector */}
          <div className="w-fit mx-auto lg:hidden mb-4">
            <Select
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(
                  value as "collection" | "monthly" | "manager" | "collector"
                );
              }}
            >
              <SelectTrigger className=" bg-buttonActive text-white text-lg font-semibold py-3 px-4 rounded-md h-auto">
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collection">Collection Reports</SelectItem>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="manager">Manager Schedule</SelectItem>
                <SelectItem value="collector">Collectors Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tab buttons */}
          <div className="hidden lg:flex flex-col lg:flex-row flex-wrap gap-2 mb-6 w-full min-w-0">
            {(["collection", "monthly", "manager", "collector"] as const).map(
              (tabName) => (
                <button
                  key={tabName}
                  className={`${
                    activeTab === tabName ? "bg-buttonActive" : "bg-button"
                  } text-white px-4 py-2 rounded-md font-semibold ${
                    tabName === "collector"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveTab(tabName);
                  }}
                  disabled={tabName === "collector"}
                >
                  {tabName === "collection" && "Collection Reports"}
                  {tabName === "monthly" && "Monthly Report"}
                  {tabName === "manager" && "Manager Schedule"}
                  {tabName === "collector" && "Collectors Schedule"}
                </button>
              )
            )}
          </div>

          {/* Main content area: renders the selected tab's UI */}
          <div ref={contentRef} className="relative w-full">
            {activeTab === "collection" && (
              <>
                {loading ? (
                  <>
                    <div className="lg:hidden">
                      <CardSkeleton />
                    </div>
                    <div className="hidden lg:block">
                      <MonthlyTableSkeleton />
                    </div>
                  </>
                ) : filteredReports.length === 0 ? (
                  <EmptyState
                    icon="📄"
                    title="No collection reports found"
                    message="Try adjusting your filters or check back later."
                  />
                ) : (
                  <>
                    <CollectionMobileUI
                      locations={locations}
                      selectedLocation={selectedLocation}
                      onLocationChange={setSelectedLocation}
                      search={search}
                      onSearchChange={setSearch}
                      onSearchSubmit={handleSearch}
                      showUncollectedOnly={showUncollectedOnly}
                      onShowUncollectedOnlyChange={setShowUncollectedOnly}
                      isSearching={isSearching}
                      loading={loading}
                      filteredReports={filteredReports}
                      mobileCurrentItems={mobileData.currentItems}
                      mobileTotalPages={mobileData.totalPages}
                      mobilePage={mobilePage}
                      onPaginateMobile={paginateMobile}
                      mobilePaginationRef={mobilePaginationRef}
                      mobileCardsRef={mobileCardsRef}
                      itemsPerPage={itemsPerPage}
                    />
                    <CollectionDesktopUI
                      locations={locations}
                      selectedLocation={selectedLocation}
                      onLocationChange={setSelectedLocation}
                      search={search}
                      onSearchChange={setSearch}
                      onSearchSubmit={handleSearch}
                      showUncollectedOnly={showUncollectedOnly}
                      onShowUncollectedOnlyChange={setShowUncollectedOnly}
                      isSearching={isSearching}
                      loading={loading}
                      filteredReports={filteredReports}
                      desktopCurrentItems={desktopData.currentItems}
                      desktopTotalPages={desktopData.totalPages}
                      desktopPage={desktopPage}
                      onPaginateDesktop={paginateDesktop}
                      desktopPaginationRef={desktopPaginationRef}
                      desktopTableRef={desktopTableRef}
                      itemsPerPage={itemsPerPage}
                    />
                  </>
                )}
              </>
            )}

            {activeTab === "monthly" && (
              <>
                {monthlyLoading ? (
                  <>
                    <div className="lg:hidden">
                      <MonthlySummarySkeleton />
                      <MonthlyTableSkeleton />
                    </div>
                    <div className="hidden lg:block">
                      <MonthlySummarySkeleton />
                      <MonthlyTableSkeleton />
                    </div>
                  </>
                ) : (
                  <>
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
                    {monthlyDetails.length === 0 && !monthlyLoading && (
                      <EmptyState
                        icon="📅"
                        title="No monthly report data found"
                        message="No data available for the selected period or location."
                      />
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === "manager" && (
              <>
                {loadingSchedulers ? (
                  <>
                    <div className="lg:hidden">
                      <CardSkeleton />
                    </div>
                    <div className="hidden lg:block">
                      <ManagerTableSkeleton />
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </>
            )}

            {activeTab === "collector" && (
              <>
                <CollectorMobileUI />
                <CollectorDesktopUI />
              </>
            )}
          </div>

          {/* Modal for creating a new collection */}
          <NewCollectionModal
            show={showModal}
            onClose={() => setShowModal(false)}
            locations={locationsWithMachines}
          />
        </main>
      </div>
    </div>
  );
}
