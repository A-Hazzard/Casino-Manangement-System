"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import styles from "./ReportPage.module.css";
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
} from "@/lib/helpers/collectionReport";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";
import { DateRange as RDPDateRange } from "react-day-picker";

// Import new UI components
import CollectionMobileUI from "@/components/collectionReport/CollectionMobileUI";
import CollectionDesktopUI from "@/components/collectionReport/CollectionDesktopUI";
import MonthlyMobileUI from "@/components/collectionReport/MonthlyMobileUI";
import MonthlyDesktopUI from "@/components/collectionReport/MonthlyDesktopUI";
import ManagerMobileUI from "@/components/collectionReport/ManagerMobileUI";
import ManagerDesktopUI from "@/components/collectionReport/ManagerDesktopUI";
import CollectorMobileUI from "@/components/collectionReport/CollectorMobileUI";
import CollectorDesktopUI from "@/components/collectionReport/CollectorDesktopUI";

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
  const monthlyPaginationRef = useRef<HTMLDivElement>(null);

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
  const [monthlyPage, setMonthlyPage] = useState(1);
  const monthlyItemsPerPage = 10;

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

  useEffect(() => {
    setLoading(true);
    let url = "/api/collectionReport";
    if (selectedLicencee && selectedLicencee.toLowerCase() !== "all") {
      url += `?licencee=${encodeURIComponent(selectedLicencee)}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          res
            .text()
            .then((text) => console.error("Server error response:", text));
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: CollectionReportRow[]) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch collection reports:", error);
        setReports([]);
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

  useEffect(() => {
    setDesktopPage(1);
    setMobilePage(1);
  }, [selectedLocation, search, showUncollectedOnly, selectedLicencee]);

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

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

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
    selectedSchedulerLocation,
    selectedCollector,
    selectedStatus,
    locations,
  ]);

  const handleResetSchedulerFilters = () => {
    setSelectedSchedulerLocation("all");
    setSelectedCollector("all");
    setSelectedStatus("all");
  };

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

  useEffect(() => {
    if (activeTab === "monthly") {
      fetchMonthlyData();
    }
  }, [monthlyDateRange, monthlyLocation, activeTab, fetchMonthlyData]);

  const handleLastMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingRange({ from: first, to: last });
    setMonthlyDateRange({ from: first, to: last });
  };

  const applyPendingDateRange = () => {
    if (pendingRange?.from && pendingRange?.to) {
      setMonthlyDateRange(pendingRange);
    }
  };

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

  const monthlyCurrentItems = monthlyDetails.slice(
    (monthlyPage - 1) * monthlyItemsPerPage,
    monthlyPage * monthlyItemsPerPage
  );
  const monthlyTotalPages = Math.ceil(
    monthlyDetails.length / monthlyItemsPerPage
  );

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

            <div className="hidden lg:flex flex-col lg:flex-row flex-wrap gap-2 mb-6 space-y-2 lg:space-y-0 lg:space-x-2 w-full min-w-0">
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

            <div ref={contentRef} className="relative">
              {activeTab === "collection" && (
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

              {activeTab === "monthly" && (
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
                </>
              )}

              {activeTab === "manager" && (
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

              {activeTab === "collector" && (
                <>
                  <CollectorMobileUI />
                  <CollectorDesktopUI />
                </>
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
