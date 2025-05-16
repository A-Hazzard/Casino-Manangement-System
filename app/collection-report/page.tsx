"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import styles from "./ReportPage.module.css";
import CollectionReportFilters from "@/components/collectionReport/CollectionReportFilters";
import CollectionReportDateButtons from "@/components/collectionReport/CollectionReportDateButtons";
import CollectionReportTable from "@/components/collectionReport/CollectionReportTable";
import CollectionReportCards from "@/components/collectionReport/CollectionReportCards";
import MonthlyReportSummaryTable from "@/components/collectionReport/MonthlyReportSummaryTable";
import MonthlyReportDetailsTable from "@/components/collectionReport/MonthlyReportDetailsTable";
import ManagerScheduleFilters from "@/components/collectionReport/ManagerScheduleFilters";
import ManagerScheduleTable from "@/components/collectionReport/ManagerScheduleTable";
import ManagerScheduleCards from "@/components/collectionReport/ManagerScheduleCards";
import NewCollectionModal from "@/components/collectionReport/NewCollectionModal";
import { gsap } from "gsap";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { fetchAllGamingLocations } from "@/lib/helpers/locations";
import type { LocationSelectItem } from "@/lib/types/location";
import { fetchSchedulersWithFilters } from "@/lib/helpers/schedulers";
import { formatDateString } from "@/lib/utils/dateUtils";
import type { SchedulerTableRow } from "@/lib/types/componentProps";
import { DateRangePicker } from "@/components/ui/dateRangePicker";
import {
  fetchMonthlyReportSummaryAndDetails,
  fetchAllLocationNames,
} from "@/lib/helpers/collectionReport";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from "@/lib/types/componentProps";
import { DateRange as RDPDateRange } from "react-day-picker";

export default function CollectionReportPage() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const [activeTab, setActiveTab] = useState<
    "collection" | "monthly" | "manager" | "collector"
  >("collection");
  const [showModal, setShowModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const mobilePaginationRef = useRef<HTMLDivElement>(null);
  const desktopPaginationRef = useRef<HTMLDivElement>(null);
  const mobileCardsRef = useRef<HTMLDivElement>(null);
  const desktopTableRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPage, setDesktopPage] = useState(1);
  const itemsPerPage = 10;

  // Collection report data state
  const [reports, setReports] = useState<CollectionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Filter state
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
  // Monthly pagination state
  const [monthlyPage, setMonthlyPage] = useState(1);
  const monthlyItemsPerPage = 10;
  const monthlyLastItemIndex = monthlyPage * monthlyItemsPerPage;
  const monthlyFirstItemIndex = monthlyLastItemIndex - monthlyItemsPerPage;
  const monthlyTotalPages = Math.ceil(
    (monthlyDetails?.length || 0) / monthlyItemsPerPage
  );
  const monthlyCurrentItems = monthlyDetails.slice(
    monthlyFirstItemIndex,
    monthlyLastItemIndex
  );
  const monthlyPaginationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const isAllLicencee = !selectedLicencee || selectedLicencee === "all";
    const url = isAllLicencee
      ? "/api/collectionReport"
      : `/api/collectionReport?licencee=${selectedLicencee}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [selectedLicencee]);

  useEffect(() => {
    fetchAllGamingLocations().then((locs) =>
      setLocations(locs.map((l) => ({ _id: l.id, name: l.name })))
    );
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [activeTab]);

  // Reset to first page whenever filters change to avoid showing empty pages
  useEffect(() => {
    setDesktopPage(1);
    setMobilePage(1);
  }, [selectedLocation, search, showUncollectedOnly, selectedLicencee]);

  // Apply animations after data loads or filters change
  useEffect(() => {
    if (!loading && !isSearching) {
      // Animate desktop table rows
      if (desktopTableRef.current) {
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

      // Animate mobile cards
      if (mobileCardsRef.current) {
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
  }, [loading, isSearching, mobilePage, desktopPage]);

  // Filtering logic
  const filteredReports = reports.filter((r) => {
    const matchesLocation =
      selectedLocation === "all" ||
      r.location === locations.find((l) => l._id === selectedLocation)?.name;
    const matchesSearch =
      !search ||
      r.collector.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase());
    const uncollectedStr = String(r.uncollected);
    const matchesUncollected =
      !showUncollectedOnly ||
      (uncollectedStr !== "0" && uncollectedStr !== "-");
    return matchesLocation && matchesSearch && matchesUncollected;
  });

  // Mobile pagination
  const mobileLastItemIndex = mobilePage * itemsPerPage;
  const mobileFirstItemIndex = mobileLastItemIndex - itemsPerPage;
  const mobileCurrentItems = filteredReports.slice(
    mobileFirstItemIndex,
    mobileLastItemIndex
  );
  const mobileTotalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Desktop pagination
  const desktopLastItemIndex = desktopPage * itemsPerPage;
  const desktopFirstItemIndex = desktopLastItemIndex - itemsPerPage;
  const desktopCurrentItems = filteredReports.slice(
    desktopFirstItemIndex,
    desktopLastItemIndex
  );
  const desktopTotalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const paginateMobile = (pageNumber: number) => {
    setMobilePage(pageNumber);
    if (mobilePaginationRef.current) {
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
    if (desktopPaginationRef.current) {
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

  const handleSearch = () => {
    setIsSearching(true);
    // Simulate a search operation
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  // Fetch schedulers data based on active tab and filters
  useEffect(() => {
    // Only fetch if the manager tab is active
    if (activeTab === "manager") {
      setLoadingSchedulers(true);

      const locationName =
        selectedSchedulerLocation !== "all"
          ? locations.find((loc) => loc._id === selectedSchedulerLocation)?.name
          : undefined;

      // Fetch schedulers WITHOUT licencee filter for Manager Schedule
      fetchSchedulersWithFilters({
        // licencee: selectedLicencee, // Removed licencee filter for this tab
        location: locationName,
        collector: selectedCollector !== "all" ? selectedCollector : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      })
        .then((data) => {
          const uniqueCollectors = Array.from(
            new Set(data.map((item) => item.collector))
          ).filter(Boolean);
          setCollectors(uniqueCollectors);

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
    // selectedLicencee, // Removed licencee dependency
    selectedSchedulerLocation,
    selectedCollector,
    selectedStatus,
    locations,
  ]);

  // Reset filters handler
  const handleResetSchedulerFilters = () => {
    setSelectedSchedulerLocation("all");
    setSelectedCollector("all");
    setSelectedStatus("all");
  };

  // Fetch monthly report data when date range or location changes
  useEffect(() => {
    if (!monthlyDateRange.from || !monthlyDateRange.to) return;
    setMonthlyLoading(true);
    setMonthlyPage(1); // Reset to first page when filters change
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

  // Second effect to load data on initial render or when activeTab changes to 'monthly'
  useEffect(() => {
    if (activeTab === "monthly") {
      // Fetch all unique location names when tab changes to monthly
      fetchAllLocationNames()
        .then((locations: string[]) => {
          setAllLocationNames(locations);
        })
        .catch((error: Error) => {
          console.error("Error fetching locations:", error);
          setAllLocationNames([]);
        });

      // Load the report data
      if (monthlyDateRange.from && monthlyDateRange.to) {
        setMonthlyLoading(true);
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
      }
    }
  }, [activeTab, monthlyDateRange, monthlyLocation]);

  // Handler for Last Month button
  const handleLastMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);

    // Set both pending and actual range to directly trigger data fetch
    setPendingRange({ from: first, to: last });
    setMonthlyDateRange({ from: first, to: last });
  };

  // Paginate function for monthly report
  const paginateMonthly = (pageNumber: number) => {
    setMonthlyPage(pageNumber);
    if (monthlyPaginationRef.current) {
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

  const handlePendingRangeChange = (range?: RDPDateRange) => {
    if (range && range.from && range.to) {
      setPendingRange(range);
    } else if (range && range.from && !range.to) {
      setPendingRange({ from: range.from, to: undefined });
    } else {
      setPendingRange({ from: undefined, to: undefined });
    }
  };

  return (
    <div className="flex flex-row min-h-screen">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div
        className={`w-full p-6 lg:p-0 flex-grow bg-background flex flex-col items-center ${styles.containerCustom}`}
      >
        <div className={`w-full px-4 ${styles.containerLimited}`}>
          <main className="w-full min-w-0 space-y-6 mt-4">
            <Header
              selectedLicencee={selectedLicencee}
              setSelectedLicencee={setSelectedLicencee}
              pageTitle=""
            />
            {/* Top Row: Icon, Title, and New Collection Button (Desktop) */}
            <div className="hidden lg:flex flex-row items-center justify-between w-full mb-2">
              <div className="flex flex-row items-center gap-2">
                <h1 className="text-3xl font-bold">Collections</h1>
                <Image
                  src="/details.svg"
                  alt="Details"
                  className="h-8 w-8"
                  width={20}
                  height={20}
                />
              </div>

              <button
                className="bg-button text-white px-4 py-2 rounded-lg font-bold text-lg flex items-center"
                onClick={() => setShowModal(true)}
              >
                <Image
                  src="/plusButtonWhite.svg"
                  alt="Add"
                  width={16}
                  height={16}
                  className="mr-2 filter-white"
                />
                New Collection
              </button>
            </div>
            {/* Centered Icon and Title Area (Mobile only) */}
            <div className="flex flex-col items-center mb-2 md:mb-0 lg:hidden">
              <div className="flex items-center justify-center w-full md:w-auto">
                <h1 className="text-3xl font-bold">Collections</h1>
                <Image
                  src="/plusButton.svg"
                  alt="Add New Collection"
                  width={28}
                  height={28}
                  className="ml-2 cursor-pointer md:hidden"
                  onClick={() => setShowModal(true)}
                />
              </div>
            </div>

            {/* Mobile Report Type Dropdown - Disable Collector option */}
            <div className="lg:hidden w-full mb-4">
              <Select
                value={activeTab}
                onValueChange={(value) => {
                  if (value !== "collector") {
                    // Prevent selecting collector tab
                    setActiveTab(value as "collection" | "monthly" | "manager");
                  } else {
                    // Optionally show a toast or message here
                  }
                }}
              >
                <SelectTrigger className="w-full bg-buttonActive text-white text-lg font-semibold py-3 px-4 rounded-md h-auto">
                  <SelectValue placeholder="Select a report" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Collection Reports</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="manager">Manager Schedule</SelectItem>
                  <SelectItem value="collector" disabled>
                    Collectors Schedule (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* --- START WHITE MOBILE CARD for Collection Tab --- */}
            {activeTab === "collection" && (
              <div className="w-full absolute left-0 right-0 lg:hidden bg-white p-4 rounded-lg shadow-md mb-4 space-y-4">
                <CollectionReportFilters
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationChange={setSelectedLocation}
                  search={search}
                  onSearchChange={(val) => {
                    setSearch(val);
                    if (val === "") handleSearch();
                  }}
                  showUncollectedOnly={showUncollectedOnly}
                  onShowUncollectedOnlyChange={setShowUncollectedOnly}
                  isSearching={isSearching}
                />

                {/* Sort By Dropdown */}
                <Select defaultValue="today">
                  <SelectTrigger className="bg-buttonActive text-white text-md font-semibold py-2.5 px-4 rounded-md h-auto w-auto min-w-[180px]">
                    <SelectValue placeholder="Sort by: Today" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Sort by: Today</SelectItem>
                    <SelectItem value="yesterday">
                      Sort by: Yesterday
                    </SelectItem>
                    <SelectItem value="last7">Sort by: Last 7 Days</SelectItem>
                    {/* Add other sort options as needed */}
                  </SelectContent>
                </Select>

                {/* Date Pills for Collection Tab - Mobile (Hidden) */}
                <div className="hidden lg:block">
                  <CollectionReportDateButtons />
                </div>

                {/* Mobile Cards */}
                {loading ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-buttonActive"></div>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <p className="text-center text-gray-500">
                    No collection reports found.
                  </p>
                ) : (
                  <>
                    <div ref={mobileCardsRef}>
                      <CollectionReportCards data={mobileCurrentItems} />
                    </div>

                    {/* Pagination Controls for Mobile */}
                    {mobileTotalPages > 1 && (
                      <div
                        ref={mobilePaginationRef}
                        className="flex justify-center items-center space-x-2 mt-4"
                      >
                        <button
                          onClick={() => paginateMobile(mobilePage - 1)}
                          disabled={mobilePage === 1}
                          className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        {Array.from(
                          { length: Math.min(5, mobileTotalPages) },
                          (_, i) => {
                            // Logic to show pages around the current page
                            let pageToShow = i + 1;
                            if (mobileTotalPages > 5) {
                              if (mobilePage > 3) {
                                pageToShow = mobilePage - 2 + i;
                              }
                              if (mobilePage > mobileTotalPages - 2) {
                                pageToShow = mobileTotalPages - 4 + i;
                              }
                            }
                            return (
                              <button
                                key={pageToShow}
                                onClick={() => paginateMobile(pageToShow)}
                                className={`px-3 py-1 rounded-md ${
                                  mobilePage === pageToShow
                                    ? "bg-buttonActive text-white"
                                    : "bg-gray-200"
                                }`}
                              >
                                {pageToShow}
                              </button>
                            );
                          }
                        )}
                        <button
                          onClick={() => paginateMobile(mobilePage + 1)}
                          disabled={mobilePage === mobileTotalPages}
                          className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    )}

                    <p className="text-center text-gray-500 text-sm mt-3">
                      Showing {mobileFirstItemIndex + 1}-
                      {Math.min(mobileLastItemIndex, filteredReports.length)} of{" "}
                      {filteredReports.length} reports
                    </p>
                  </>
                )}
              </div>
            )}
            {/* --- END WHITE MOBILE CARD --- */}

            {/* Desktop Tab Buttons - Disable Collector button */}
            <div className="hidden lg:flex flex-col lg:flex-row flex-wrap gap-2 mb-6 space-y-2 lg:space-y-0 lg:space-x-2 w-full min-w-0">
              <button
                className={`${
                  activeTab === "collection" ? "bg-buttonActive" : "bg-button"
                } text-white px-4 py-2 rounded-md font-semibold`}
                onClick={() => setActiveTab("collection")}
              >
                Collection Reports
              </button>
              <button
                className={`${
                  activeTab === "monthly" ? "bg-buttonActive" : "bg-button"
                } text-white px-4 py-2 rounded-md font-semibold`}
                onClick={() => setActiveTab("monthly")}
              >
                Monthly Report
              </button>
              <button
                className={`${
                  activeTab === "manager" ? "bg-buttonActive" : "bg-button"
                } text-white px-4 py-2 rounded-md font-semibold`}
                onClick={() => setActiveTab("manager")}
              >
                Manager Schedule
              </button>
              <button
                className={`${
                  activeTab === "collector" ? "bg-buttonActive" : "bg-button"
                } text-white px-4 py-2 rounded-md font-semibold opacity-50 cursor-not-allowed`}
                onClick={() => {
                  /* Do nothing or show message */
                }}
                disabled // Disable the button
              >
                Collectors Schedule
              </button>
            </div>

            {/* Desktop Content (and content for other tabs on all_devices if not handled by mobile card) */}
            <div ref={contentRef}>
              {/* Desktop view for Collection Tab */}
              {activeTab === "collection" && (
                <div className="hidden lg:block">
                  <CollectionReportFilters
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={setSelectedLocation}
                    search={search}
                    onSearchChange={(val) => {
                      setSearch(val);
                      if (val === "") handleSearch();
                    }}
                    showUncollectedOnly={showUncollectedOnly}
                    onShowUncollectedOnlyChange={setShowUncollectedOnly}
                    isSearching={isSearching}
                  />
                  {/* Date buttons for desktop if needed differently or not already in the component */}
                  {/* <CollectionReportDateButtons /> Re-evaluate if needed for desktop if mobile version is different */}
                  {loading ? (
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-buttonActive"></div>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <p className="text-center text-gray-500">
                      No collection reports found.
                    </p>
                  ) : (
                    <>
                      <div ref={desktopTableRef}>
                        <CollectionReportTable data={desktopCurrentItems} />
                      </div>
                      <div className="flex flex-col items-center mt-4 space-y-3">
                        {/* Pagination Controls for Desktop */}
                        {desktopTotalPages > 1 && (
                          <div
                            ref={desktopPaginationRef}
                            className="flex justify-center items-center space-x-2"
                          >
                            {/* First page button */}
                            <button
                              onClick={() => paginateDesktop(1)}
                              disabled={desktopPage === 1}
                              className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                              title="First page"
                            >
                              <ChevronLeft
                                size={12}
                                className="inline mr-[-4px]"
                              />
                              <ChevronLeft size={12} className="inline" />
                            </button>

                            <button
                              onClick={() => paginateDesktop(desktopPage - 1)}
                              disabled={desktopPage === 1}
                              className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            {Array.from(
                              { length: Math.min(5, desktopTotalPages) },
                              (_, i) => {
                                // Logic to show pages around the current page
                                let pageToShow = i + 1;
                                if (desktopTotalPages > 5) {
                                  if (desktopPage > 3) {
                                    pageToShow = desktopPage - 2 + i;
                                  }
                                  if (desktopPage > desktopTotalPages - 2) {
                                    pageToShow = desktopTotalPages - 4 + i;
                                  }
                                }
                                return (
                                  <button
                                    key={pageToShow}
                                    onClick={() => paginateDesktop(pageToShow)}
                                    className={`px-3 py-1 rounded-md text-sm ${
                                      desktopPage === pageToShow
                                        ? "bg-buttonActive text-white scale-105"
                                        : "bg-gray-200"
                                    } transition-transform duration-200`}
                                  >
                                    {pageToShow}
                                  </button>
                                );
                              }
                            )}
                            <button
                              onClick={() => paginateDesktop(desktopPage + 1)}
                              disabled={desktopPage === desktopTotalPages}
                              className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                            >
                              <ChevronRight size={16} />
                            </button>

                            {/* Last page button */}
                            <button
                              onClick={() => paginateDesktop(desktopTotalPages)}
                              disabled={desktopPage === desktopTotalPages}
                              className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                              title="Last page"
                            >
                              <ChevronRight
                                size={12}
                                className="inline mr-[-4px]"
                              />
                              <ChevronRight size={12} className="inline" />
                            </button>
                          </div>
                        )}

                        <p className="text-gray-500 text-sm text-center">
                          Showing {desktopFirstItemIndex + 1}-
                          {Math.min(
                            desktopLastItemIndex,
                            filteredReports.length
                          )}{" "}
                          of {filteredReports.length} reports
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Monthly Report Tab */}
              {activeTab === "monthly" && (
                <div className="bg-white rounded-lg shadow-md space-y-4">
                  <div className="bg-buttonActive rounded-t-lg rounded-b-none p-4 flex flex-col md:flex-row md:items-center gap-4 mb-0 w-full">
                    <select
                      className="px-4 py-2 rounded-md text-sm w-full md:w-auto bg-white text-black border-none focus:ring-2 focus:ring-buttonActive"
                      value={monthlyLocation}
                      onChange={(e) => setMonthlyLocation(e.target.value)}
                    >
                      <option value="all">All Locations</option>
                      {allLocationNames.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2 ml-auto w-full md:w-auto justify-end">
                      <button className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-md font-semibold">
                        EXPORT PDF
                      </button>
                      <button className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-md font-semibold">
                        EXPORT EXCEL
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4 pt-4 pb-2 rounded-b-lg border-t-0">
                    <button
                      className="bg-button text-white px-4 py-2 rounded-lg text-xs font-semibold"
                      onClick={handleLastMonth}
                    >
                      Last Month
                    </button>
                    <span className="bg-grayHighlight text-white px-4 py-2 rounded-l-lg text-xs font-semibold">
                      Date Range
                    </span>
                    <DateRangePicker
                      value={pendingRange}
                      onChange={handlePendingRangeChange}
                      maxDate={new Date()}
                    />
                    <button
                      className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-lg text-xs font-semibold"
                      onClick={() => {
                        if (pendingRange?.from && pendingRange?.to) {
                          setMonthlyDateRange(pendingRange);
                        }
                      }}
                      disabled={!pendingRange?.from || !pendingRange?.to}
                    >
                      Go
                    </button>
                  </div>
                  <div className="px-4 space-y-4">
                    <h2 className="text-xl font-bold mt-4">
                      {monthlyLocation !== "all"
                        ? `${monthlyLocation} - Summary`
                        : "All Locations Total"}
                    </h2>
                    {monthlyLoading ? (
                      <div className="animate-pulse h-12 bg-gray-200 rounded w-full" />
                    ) : (
                      <MonthlyReportSummaryTable summary={monthlySummary} />
                    )}
                    {monthlyLoading ? (
                      <div className="animate-pulse h-32 bg-gray-200 rounded w-full" />
                    ) : monthlyDetails.length === 0 ? (
                      <p className="text-center text-gray-500">
                        No data returned.
                      </p>
                    ) : (
                      <>
                        <MonthlyReportDetailsTable
                          details={monthlyCurrentItems}
                        />

                        {/* Pagination controls for monthly report */}
                        {monthlyTotalPages > 1 && (
                          <div className="flex flex-col items-center mt-4 space-y-3">
                            <div
                              ref={monthlyPaginationRef}
                              className="flex justify-center items-center space-x-2"
                            >
                              {/* First page button */}
                              <button
                                onClick={() => paginateMonthly(1)}
                                disabled={monthlyPage === 1}
                                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                                title="First page"
                              >
                                <ChevronLeft
                                  size={12}
                                  className="inline mr-[-4px]"
                                />
                                <ChevronLeft size={12} className="inline" />
                              </button>

                              {/* Previous page button */}
                              <button
                                onClick={() => paginateMonthly(monthlyPage - 1)}
                                disabled={monthlyPage === 1}
                                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              {/* Page numbers */}
                              {Array.from(
                                { length: Math.min(5, monthlyTotalPages) },
                                (_, i) => {
                                  // Logic to show pages around the current page
                                  let pageToShow = i + 1;
                                  if (monthlyTotalPages > 5) {
                                    if (monthlyPage > 3) {
                                      pageToShow = monthlyPage - 2 + i;
                                    }
                                    if (monthlyPage > monthlyTotalPages - 2) {
                                      pageToShow = monthlyTotalPages - 4 + i;
                                    }
                                  }
                                  return (
                                    <button
                                      key={pageToShow}
                                      onClick={() =>
                                        paginateMonthly(pageToShow)
                                      }
                                      className={`px-3 py-1 rounded-md text-sm ${
                                        monthlyPage === pageToShow
                                          ? "bg-buttonActive text-white scale-105"
                                          : "bg-gray-200"
                                      } transition-transform duration-200`}
                                    >
                                      {pageToShow}
                                    </button>
                                  );
                                }
                              )}

                              {/* Next page button */}
                              <button
                                onClick={() => paginateMonthly(monthlyPage + 1)}
                                disabled={monthlyPage === monthlyTotalPages}
                                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                              >
                                <ChevronRight size={16} />
                              </button>

                              {/* Last page button */}
                              <button
                                onClick={() =>
                                  paginateMonthly(monthlyTotalPages)
                                }
                                disabled={monthlyPage === monthlyTotalPages}
                                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                                title="Last page"
                              >
                                <ChevronRight
                                  size={12}
                                  className="inline mr-[-4px]"
                                />
                                <ChevronRight size={12} className="inline" />
                              </button>
                            </div>

                            <p className="text-gray-500 text-sm text-center">
                              Showing {monthlyFirstItemIndex + 1}-
                              {Math.min(
                                monthlyLastItemIndex,
                                monthlyDetails.length
                              )}{" "}
                              of {monthlyDetails.length} records
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Manager Schedule Tab */}
              {activeTab === "manager" && (
                <div className="bg-white rounded-lg shadow-md">
                  <ManagerScheduleFilters
                    locations={locations}
                    collectors={collectors}
                    selectedLocation={selectedSchedulerLocation}
                    onLocationChange={setSelectedSchedulerLocation}
                    selectedCollector={selectedCollector}
                    onCollectorChange={setSelectedCollector}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                    onReset={handleResetSchedulerFilters}
                    loading={loadingSchedulers}
                  />
                  <div className="mt-4 px-4 pb-4 space-y-4">
                    <ManagerScheduleTable
                      data={schedulers}
                      loading={loadingSchedulers}
                    />
                    <ManagerScheduleCards
                      data={schedulers}
                      loading={loadingSchedulers}
                    />
                  </div>
                </div>
              )}
              {/* Collectors Schedule Tab - Replaced with Coming Soon */}
              {activeTab === "collector" && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-700">
                    Coming Soon...
                  </h2>
                  <p className="text-gray-500 mt-2">
                    Collectors Schedule functionality will be available in a
                    future update.
                  </p>
                  {/* 
                  ARCHIVED DESIGN FOR COLLECTOR SCHEDULE:
                  <CollectorScheduleFilters
                    locations={locations}
                    collectors={collectors}
                    selectedLocation={selectedSchedulerLocation}
                    onLocationChange={setSelectedSchedulerLocation}
                    selectedCollector={selectedCollector}
                    onCollectorChange={setSelectedCollector}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                    onReset={handleResetSchedulerFilters}
                    loading={loadingSchedulers}
                  />
                  <div className="px-4 pb-4 space-y-4">
                    <CollectorScheduleTable
                      data={schedulers.filter(item => item.collector !== "")}
                      loading={loadingSchedulers}
                    />
                    <CollectorScheduleCards
                      data={schedulers.filter(item => item.collector !== "")}
                      loading={loadingSchedulers}
                    />
                  </div>
                  */}
                </div>
              )}
            </div>

            <NewCollectionModal
              show={showModal}
              onClose={() => setShowModal(false)}
              locations={locations}
            />
          </main>
        </div>
      </div>

      {/* Add a style section at the end */}
      <style jsx global>{`
        .scale-animation {
          transition: transform 0.2s ease-out;
        }
        .scale-animation:hover {
          transform: scale(1.05);
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
    </div>
  );
}
