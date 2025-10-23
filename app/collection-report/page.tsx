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
// Import Framer Motion with error handling
import dynamic from "next/dynamic";

// Dynamically import Framer Motion to avoid SSR issues
const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.div })),
  {
    ssr: false,
  }
);

const AnimatePresence = dynamic(
  () =>
    import("framer-motion").then((mod) => ({ default: mod.AnimatePresence })),
  {
    ssr: false,
  }
);
import axios from "axios";
import { toast } from "sonner";
import { useAsyncError } from "@/components/ui/ErrorBoundary";

import PageLayout from "@/components/layout/PageLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// GSAP will be loaded dynamically in useEffect

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
import EditCollectionModal from "@/components/collectionReport/EditCollectionModal";
import MobileCollectionModal from "@/components/collectionReport/mobile/MobileCollectionModal";
import MobileEditCollectionModal from "@/components/collectionReport/mobile/MobileEditCollectionModal";
import ErrorBoundary from "@/components/ui/errors/ErrorBoundary";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { CollectionReportPageSkeleton } from "@/components/ui/skeletons/CollectionReportPageSkeleton";

import type { CollectorSchedule } from "@/lib/types/components";

// Icons
import CollectionNavigation from "@/components/collectionReport/CollectionNavigation";
import { COLLECTION_TABS_CONFIG } from "@/lib/constants/collection";
import type { CollectionView } from "@/lib/types/collection";
import { useCollectionNavigation } from "@/lib/hooks/navigation";
import { useUrlProtection } from "@/lib/hooks/useUrlProtection";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";
import "./animations.css";
import { Button } from "@/components/ui/button";
import RefreshButton from "@/components/ui/RefreshButton";
/**
 * Main page component for the Collection Report.
 * Handles tab switching, data fetching, filtering, and pagination for:
 * - Collection Reports
 * - Monthly Reports
 * - Manager Schedules
 * - Collector Schedules
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

function CollectionReportPageContent() {
  return (
    <Suspense fallback={<CollectionReportPageSkeleton />}>
      <CollectionReportContent />
    </Suspense>
  );
}

function CollectionReportContent() {
  const searchParams = useSearchParams();
  const { handleError } = useAsyncError();
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // State for dynamically loaded GSAP
  const [gsap, setGsap] = useState<typeof import("gsap").gsap | null>(null);

  // Load GSAP dynamically
  useEffect(() => {
    import("gsap")
      .then((module) => {
        setGsap(module.gsap);
      })
      .catch((error) => {
        console.error("Failed to load GSAP:", error);
      });
  }, []);

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

  // URL protection for collection report tabs
  useUrlProtection({
    page: "collection-report",
    allowedTabs: ["collection", "monthly", "manager", "collector"],
    defaultTab: "collection",
    redirectPath: "/unauthorized",
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

  // Sorting state
  const [sortField, setSortField] = useState<keyof CollectionReportRow>("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sort handler
  const handleSort = (field: keyof CollectionReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setDesktopPage(1); // Reset to first page when sorting
    setMobilePage(1);
  };

  // Collection report data state
  const [reports, setReports] = useState<CollectionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Collection Modal states - separate for mobile and desktop
  const [showMobileCollectionModal, setShowMobileCollectionModal] =
    useState(false);
  const [showDesktopCollectionModal, setShowDesktopCollectionModal] =
    useState(false);

  // Edit Collection Modal states - separate for mobile and desktop
  const [showMobileEditCollectionModal, setShowMobileEditCollectionModal] =
    useState(false);
  const [showDesktopEditCollectionModal, setShowDesktopEditCollectionModal] =
    useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Delete Confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Filter state for collection reports
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);

  // Helper function to determine if mobile or desktop modal should be shown
  const isMobileSize = () => window.innerWidth < 1024;

  // Handle modal switching based on window size
  const handleModalResize = useCallback(() => {
    const isMobile = isMobileSize();

    if (showMobileCollectionModal && !isMobile) {
      setShowMobileCollectionModal(false);
      setShowDesktopCollectionModal(true);
    }

    if (showDesktopCollectionModal && isMobile) {
      setShowDesktopCollectionModal(false);
      setShowMobileCollectionModal(true);
    }
    if (showMobileEditCollectionModal && !isMobile) {
      setShowMobileEditCollectionModal(false);
      setShowDesktopEditCollectionModal(true);
    }

    if (showDesktopEditCollectionModal && isMobile) {
      setShowDesktopEditCollectionModal(false);
      setShowMobileEditCollectionModal(true);
    }
  }, [
    showMobileCollectionModal,
    showDesktopCollectionModal,
    showMobileEditCollectionModal,
    showDesktopEditCollectionModal,
  ]);

  // Add resize listener
  useEffect(() => {
    window.addEventListener("resize", handleModalResize);
    return () => window.removeEventListener("resize", handleModalResize);
  }, [handleModalResize]);

  // CRITICAL: Auto-reopen edit modal for reports with isEditing: true
  // This allows users to resume unfinished edits even after page refresh
  useEffect(() => {
    const checkForUnfinishedEdits = async () => {
      try {
        // Query for most recent report with isEditing: true
        const response = await axios.get("/api/collection-reports", {
          params: {
            isEditing: true,
            limit: 1,
            sortBy: "updatedAt",
            sortOrder: "desc",
          },
        });

        if (response.data && response.data.length > 0) {
          const unfinishedReport = response.data[0];
          console.warn(
            `🔄 Found unfinished edit for report ${unfinishedReport._id}, auto-opening edit modal`
          );

          // Set the report ID to edit
          setEditingReportId(unfinishedReport._id);

          // Show toast notification
          toast.info("Resuming unfinished edit...", {
            duration: 3000,
            position: "top-right",
          });

          // Open the appropriate modal based on screen size
          if (isMobileSize()) {
            setShowMobileEditCollectionModal(true);
          } else {
            setShowDesktopEditCollectionModal(true);
          }
        }
      } catch (error) {
        console.error("Error checking for unfinished edits:", error);
        // Don't show error to user - this is a background check
      }
    };

    // Run check on mount
    checkForUnfinishedEdits();
  }, []); // Empty dependency array - run once on mount

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
    fetchAllGamingLocations(selectedLicencee).then((locs) => {
      console.warn(
        "[LOCATIONS FETCH] Fetched locations for licensee:",
        selectedLicencee
      );
      console.warn(`[LOCATIONS FETCH] Got ${locs.length} locations`);
      setLocations(locs.map((l) => ({ _id: l.id, name: l.name })));

      // Reset selectedLocation to "all" when licensee changes to avoid filtering issues
      setSelectedLocation("all");
    });
  }, [selectedLicencee]);

  // Fetch locations with machines for the modal
  useEffect(() => {
    getLocationsWithMachines(selectedLicencee).then(setLocationsWithMachines);
  }, [selectedLicencee]);

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
        .then(async (data: CollectionReportRow[]) => {
          setReports(data);
          setLoading(false);

          // Report issues checking removed - no more global scans
        })
        .catch((error: unknown) => {
          // Error is already handled gracefully in fetchCollectionReportsByLicencee
          setReports([]);
          setLoading(false);
          if (error instanceof Error) {
            handleError(error);
          }
        });
    }
  }, [
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    handleError,
  ]);

  const refreshCollectionReports = useCallback(() => {
    if (activeTab === "collection") {
      setLoading(true);

      let dateRangeForFetch = undefined;
      let timePeriodForFetch = undefined;

      if (activeMetricsFilter === "Custom") {
        if (customDateRange?.startDate && customDateRange?.endDate) {
          dateRangeForFetch = {
            from: customDateRange.startDate,
            to: customDateRange.endDate,
          };
          timePeriodForFetch = "Custom";
        } else {
          setLoading(false);
          return;
        }
      } else {
        timePeriodForFetch = mapTimePeriodForAPI(activeMetricsFilter);
      }

      fetchCollectionReportsByLicencee(
        selectedLicencee === "" ? undefined : selectedLicencee,
        dateRangeForFetch,
        timePeriodForFetch
      )
        .then(async (data: CollectionReportRow[]) => {
          setReports(data);
          setLoading(false);

          // Report issues checking removed - no more global scans
        })
        .catch((error: unknown) => {
          // Error is already handled gracefully in fetchCollectionReportsByLicencee
          setReports([]);
          setLoading(false);
          if (error instanceof Error) {
            handleError(error);
          }
        });
    }
  }, [
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    handleError,
  ]);

  useEffect(() => {
    if (contentRef.current) {
      animateContentTransition(contentRef);
    }
  }, [activeTab]);

  useEffect(() => {
    setDesktopPage(1);
    setMobilePage(1);
  }, [selectedLocation, search, showUncollectedOnly, selectedFilters]);
  useEffect(() => {
    if (!loading && !isSearching && activeTab === "collection") {
      if (desktopTableRef.current) {
        animateTableRows(desktopTableRef);
      }
      if (mobileCardsRef.current) {
        animateCards(mobileCardsRef);
      }
    }
  }, [loading, isSearching, mobilePage, desktopPage, activeTab]);

  const filteredReports = useMemo(() => {
    console.warn("[COLLECTION REPORT FILTERING - LICENSEE CHANGE DEBUG]");
    console.warn(`Selected licensee: "${selectedLicencee}"`);
    console.warn(`Reports count: ${reports?.length || 0}`);
    console.warn(`Selected location: "${selectedLocation}"`);
    console.warn(`Locations count: ${locations?.length || 0}`);
    console.warn(`Search term: "${search}"`);
    console.warn(`Show uncollected only: ${showUncollectedOnly}`);
    console.warn(`Selected filters: ${JSON.stringify(selectedFilters)}`);

    if (!reports || !Array.isArray(reports)) {
      console.warn("No reports or reports is not an array");
      return [];
    }

    // Log first few reports to see what data we have
    if (reports.length > 0) {
      console.warn("First 3 reports:");
      reports.slice(0, 3).forEach((report, index) => {
        console.warn(
          `  ${index + 1}. Location: "${report.location}", Collector: "${
            report.collector
          }"`
        );
      });
    }

    // Log available locations
    if (locations.length > 0) {
      console.warn("Available locations:");
      locations.slice(0, 5).forEach((location, index) => {
        console.warn(
          `  ${index + 1}. ID: "${location._id}", Name: "${location.name}"`
        );
      });
      if (locations.length > 5) {
        console.warn(`  ... and ${locations.length - 5} more locations`);
      }
    }

    const filtered = filterCollectionReports(
      reports,
      selectedLocation,
      search,
      showUncollectedOnly,
      locations
    );

    console.warn(`After filterCollectionReports: ${filtered.length} reports`);

    // Apply SMIB filters
    if (selectedFilters.length > 0) {
      const smibFiltered = filtered.filter((report) => {
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
      console.warn(`After SMIB filters: ${smibFiltered.length} reports`);
      return smibFiltered;
    }

    console.warn(`Final filtered reports: ${filtered.length}`);

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Special handling for time field - desc should show most recent first
      if (sortField === "time") {
        const aTime =
          typeof aValue === "string" || typeof aValue === "number"
            ? new Date(aValue).getTime()
            : 0;
        const bTime =
          typeof bValue === "string" || typeof bValue === "number"
            ? new Date(bValue).getTime()
            : 0;
        return sortDirection === "desc" ? bTime - aTime : aTime - bTime;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return sorted;
  }, [
    reports,
    selectedLocation,
    showUncollectedOnly,
    search,
    locations,
    selectedFilters,
    selectedLicencee, // Add selectedLicencee to dependencies
    sortField,
    sortDirection,
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
        // Calculate drop values for verification (development only)
        if (
          process.env.NODE_ENV === "development" &&
          details &&
          details.length > 0
        ) {
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
          if (process.env.NODE_ENV === "development") {
            console.error("Error fetching schedulers:", error);
          }
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
          if (process.env.NODE_ENV === "development") {
            console.error("Error fetching collector schedules:", error);
          }
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
          if (process.env.NODE_ENV === "development") {
            console.error("Error fetching locations:", error);
          }
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
      try {
        if (gsap) {
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
      } catch (error) {
        console.error("GSAP animation error:", error);
      }
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
  const handleEditCollectionReport = async (reportId: string) => {
    setEditingReportId(reportId);
    
    // Ensure locations are loaded before opening modal
    if (locationsWithMachines.length === 0) {
      console.warn("Locations not loaded yet, loading them now...");
      try {
        const locations = await getLocationsWithMachines(selectedLicencee);
        setLocationsWithMachines(locations);
      } catch (error) {
        console.error("Failed to load locations:", error);
        toast.error("Failed to load locations. Please try again.");
        return;
      }
    }
    
    // Check if mobile or desktop and show appropriate modal
    if (isMobileSize()) {
      setShowMobileEditCollectionModal(true);
    } else {
      setShowDesktopEditCollectionModal(true);
    }
  };

  // Handle delete collection report
  const handleDeleteCollectionReport = (reportId: string) => {
    setReportToDelete(reportId);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete collection report
  const confirmDeleteCollectionReport = async () => {
    if (!reportToDelete) return;

    try {
      // Delete the collection report and all associated collections
      const response = await axios.delete(
        `/api/collection-report/${reportToDelete}`
      );

      if (response.data.success) {
        toast.success("Collection report deleted successfully!");
        // Refresh the reports list
        refreshCollectionReports();
      } else {
        toast.error("Failed to delete collection report");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error deleting collection report:", error);
      }
      toast.error("Failed to delete collection report. Please try again.");
    } finally {
      setShowDeleteConfirmation(false);
      setReportToDelete(null);
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = useCallback(() => {
    setShowMobileEditCollectionModal(false);
    setShowDesktopEditCollectionModal(false);
    // Delay clearing reportId to allow modal to cleanup properly
    setTimeout(() => {
      setEditingReportId(null);
    }, 300); // Wait for modal close animation
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCollectionReports();
    setRefreshing(false);
  };

  // Debugging: Log data and filters to diagnose empty UI (development only)
  // if (process.env.NODE_ENV === "development") {
  //   console.log("DEBUG: reports", reports);
  //   console.log("DEBUG: filteredReports", filteredReports);
  //   console.log("DEBUG: desktopData", desktopData);
  //   console.log("DEBUG: mobileData", mobileData);
  //   console.log("DEBUG: desktopPage", desktopPage);
  //   console.log("DEBUG: mobilePage", mobilePage);
  // }

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
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 w-full max-w-full gap-3 sm:gap-0"
          suppressHydrationWarning
        >
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              Collection Report
            </h1>
            <Image
              src={IMAGES.creditCardIcon}
              alt="Collection Report Icon"
              width={32}
              height={32}
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"
              suppressHydrationWarning
            />
            <RefreshButton
              onClick={handleRefresh}
              isSyncing={refreshing}
              disabled={loading}
              label="Refresh"
              className="ml-auto mr-2"
            />
          </div>

          {activeTab === "collection" && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => {
                  if (isMobileSize()) {
                    setShowMobileCollectionModal(true);
                  } else {
                    setShowDesktopCollectionModal(true);
                  }
                }}
                className="bg-buttonActive text-white px-3 py-2 sm:px-4 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center sm:justify-start"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  suppressHydrationWarning
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                    suppressHydrationWarning
                  />
                </svg>
                <span className="hidden sm:inline">
                  Create Collection Report
                </span>
                <span className="sm:hidden">Create Collection Report</span>
              </Button>

            </div>
          )}
        </div>

        <div className="mt-8 mb-8">
          <CollectionNavigation
            tabs={COLLECTION_TABS_CONFIG}
            activeView={activeTab}
            onChange={(v) => handleTabChangeLocal(v)}
            isLoading={false}
          />
        </div>

        {activeTab !== "monthly" && (
          <>
            <div className="hidden xl:block">
              <DashboardDateFilters
                disabled={false}
                onCustomRangeGo={() => {
                  if (activeTab === "collection") {
                    setLoading(true);
                  }
                }}
                hideAllTime={false}
              />
            </div>
            <div className="xl:hidden mt-4">
              <DashboardDateFilters
                mode="auto"
                disabled={false}
                onCustomRangeGo={() => {
                  if (activeTab === "collection") {
                    setLoading(true);
                  }
                }}
                hideAllTime={false}
              />
            </div>
          </>
        )}

        <div className="flex-1 overflow-hidden mt-6">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === "collection" && (
                <div className="tab-content-wrapper">
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
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={handleLocationChange}
                    search={search}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={handleSearchSubmit}
                    showUncollectedOnly={showUncollectedOnly}
                    reportIssues={{}}
                    onShowUncollectedOnlyChange={
                      handleShowUncollectedOnlyChange
                    }
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    isSearching={isSearching}
                    onEdit={handleEditCollectionReport}
                    onDelete={handleDeleteCollectionReport}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
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
                    reportIssues={{}}
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
                    onDelete={handleDeleteCollectionReport}
                  />
                </div>
              )}
              {activeTab === "monthly" && (
                <div className="tab-content-wrapper">
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
            </MotionDiv>
          </AnimatePresence>
        </div>
      </PageLayout>

      <MobileCollectionModal
        show={showMobileCollectionModal}
        onClose={() => setShowMobileCollectionModal(false)}
        locations={locationsWithMachines}
        onRefresh={refreshCollectionReports}
      />

      <NewCollectionModal
        show={showDesktopCollectionModal}
        onClose={() => setShowDesktopCollectionModal(false)}
        locations={locationsWithMachines}
        onRefresh={refreshCollectionReports}
      />

      {editingReportId && (
        <MobileEditCollectionModal
          show={showMobileEditCollectionModal}
          onClose={handleCloseEditModal}
          locations={locationsWithMachines}
          onRefresh={refreshCollectionReports}
          reportId={editingReportId}
        />
      )}

      {editingReportId && (
        <ErrorBoundary>
          <EditCollectionModal
            show={showDesktopEditCollectionModal}
            onClose={handleCloseEditModal}
            reportId={editingReportId}
            locations={locationsWithMachines}
            onRefresh={refreshCollectionReports}
          />
        </ErrorBoundary>
      )}

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setReportToDelete(null);
        }}
        onConfirm={confirmDeleteCollectionReport}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection report? This will also delete all associated collections, remove them from machine history, and revert collection meters to their previous values. This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={false}
      />

    </>
  );
}

export default function CollectionReportPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <CollectionReportPageContent />
    </ProtectedRoute>
  );
}
