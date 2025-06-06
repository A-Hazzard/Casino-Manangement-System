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
import { fetchSchedulersWithFilters } from "@/lib/helpers/schedulers";
import { formatDateString } from "@/lib/utils/dateUtils";
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

// Import new UI components
import CollectionMobileUI from "@/components/collectionReport/CollectionMobileUI";
import CollectionDesktopUI from "@/components/collectionReport/CollectionDesktopUI";
import MonthlyMobileUI from "@/components/collectionReport/MonthlyMobileUI";
import MonthlyDesktopUI from "@/components/collectionReport/MonthlyDesktopUI";
import ManagerMobileUI from "@/components/collectionReport/ManagerMobileUI";
import ManagerDesktopUI from "@/components/collectionReport/ManagerDesktopUI";
import CollectorMobileUI from "@/components/collectionReport/CollectorMobileUI";
import CollectorDesktopUI from "@/components/collectionReport/CollectorDesktopUI";

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

  // Add skeleton loader and empty state components at the top
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-6 bg-gray-200 rounded w-full" />
        ))}
      </div>
    </div>
  );
  const CardSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-lg h-24 w-full" />
      ))}
    </div>
  );
  const SectionSkeleton = () => (
    <div className="animate-pulse bg-white rounded-lg shadow-md p-6">
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
  const EmptyState = ({
    icon,
    title,
    message,
  }: {
    icon: string;
    title: string;
    message: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-lg text-gray-600 font-semibold mb-2">{title}</p>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );

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
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
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
        const tableRows = desktopTableRef.current.querySelectorAll("tbody tr");
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
      if (mobileCardsRef.current && activeTab === "collection") {
        const cards = Array.from(
          mobileCardsRef.current?.querySelectorAll(".card-item") || []
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
  }, [loading, isSearching, mobilePage, desktopPage, activeTab]);

  // Filter reports based on location, search, and uncollected status
  const filteredReports = reports.filter((r) => {
    const matchesLocation =
      selectedLocation === "all" ||
      r.location === locations.find((l) => l._id === selectedLocation)?.name;
    const matchesSearch =
      !search ||
      r.collector.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase());
    const uncollectedStr = String(r.uncollected).trim();
    const matchesUncollected =
      !showUncollectedOnly || Number(uncollectedStr) > 0;
    return matchesLocation && matchesSearch && matchesUncollected;
  });

  // Pagination calculations for mobile and desktop
  const mobileLastItemIndex = mobilePage * itemsPerPage;
  const mobileFirstItemIndex = mobileLastItemIndex - itemsPerPage;
  const mobileCurrentItems = filteredReports.slice(
    mobileFirstItemIndex,
    mobileLastItemIndex
  );
  const mobileTotalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const desktopLastItemIndex = desktopPage * itemsPerPage;
  const desktopFirstItemIndex = desktopLastItemIndex - itemsPerPage;
  const desktopCurrentItems = filteredReports.slice(
    desktopFirstItemIndex,
    desktopLastItemIndex
  );
  const desktopTotalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Pagination handlers with animation
  const paginateMobile = (pageNumber: number) => {
    setMobilePage(pageNumber);
    if (mobilePaginationRef.current && activeTab === "collection") {
      gsap.fromTo(
        mobilePaginationRef.current,
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

  const paginateDesktop = (pageNumber: number) => {
    setDesktopPage(pageNumber);
    if (desktopPaginationRef.current && activeTab === "collection") {
      gsap.fromTo(
        desktopPaginationRef.current,
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

  // Triggers a search animation
  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  // Fetch manager schedules and collectors when manager tab is active or filters change
  useEffect(() => {
    if (activeTab === "manager") {
      setLoadingSchedulers(true);
      const locationName =
        selectedSchedulerLocation !== "all"
          ? locations.find((loc) => loc._id === selectedSchedulerLocation)?.name
          : undefined;
      fetchSchedulersWithFilters({
        location: locationName,
        collector: selectedCollector !== "all" ? selectedCollector : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      })
        .then((data) => {
          // Extract unique collectors for filter dropdown
          const uniqueCollectors = Array.from(
            new Set(data.map((item) => item.collector))
          ).filter(Boolean);
          setCollectors(uniqueCollectors);
          // Format scheduler data for table
          const formattedData: SchedulerTableRow[] = data.map((item) => ({
            id: item._id,
            collector: item.collector,
            location: item.location,
            creator: item.creator,
            visitTime: formatDateString(item.startTime),
            createdAt: formatDateString(item.createdAt),
            status: item.status,
          }));
          setSchedulers(formattedData);
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
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingRange({ from: first, to: last });
    setMonthlyDateRange({ from: first, to: last });
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
                {/* Plus icon is always visible next to the title now, acting as main "add" for mobile too */}
                <Image
                  src="/plusButton.svg" // Green plus icon from your image
                  alt="Add New Collection"
                  width={28}
                  height={28}
                  className="cursor-pointer h-7 w-7" // h-7 w-7 for consistent sizing
                  onClick={() => setShowModal(true)} // Make the icon itself trigger modal
                />
              </div>
            </div>

            {/* Desktop: Separate "New Collection" Button (on the right) */}
            {/* This button is only for desktop, providing a larger click target with text */}
            <button
              className="hidden lg:flex bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-lg items-center gap-2 mt-4 lg:mt-0"
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
                      <TableSkeleton />
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
                      mobileCurrentItems={mobileCurrentItems}
                      mobileTotalPages={mobileTotalPages}
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
                      desktopCurrentItems={desktopCurrentItems}
                      desktopTotalPages={desktopTotalPages}
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
                {loading ? (
                  <SectionSkeleton />
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
                  <SectionSkeleton />
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
