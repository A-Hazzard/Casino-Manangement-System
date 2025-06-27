"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import gsap from "gsap";
import { fetchCollectionReportById } from "@/lib/helpers/collectionReport";
import { validateCollectionReportData } from "@/lib/utils/validation";
import type { CollectionReportData } from "@/lib/types/index";
import { fetchCollectionsByLocationReportId } from "@/lib/helpers/collections";
import type { CollectionDocument } from "@/lib/types/collections";
import { calculateSasGross, calculateVariation } from "@/lib/utils/metrics";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

// Skeleton Components
const CollectionReportSkeleton = () => (
  <div className="w-full md:w-[90%] lg:w-full md:mx-auto md:pl-28 lg:pl-36 min-h-screen bg-background flex flex-col overflow-hidden">
    <Sidebar pathname="/collection-report/report/loading" />
    <main className="flex-1 lg:ml-4">
      <Header
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
        disabled={true}
      />

      {/* Back button skeleton - Desktop only */}
      <div className="px-2 lg:px-6 pt-6 hidden lg:block">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 skeleton-bg rounded-md"></div>
          <div className="h-8 w-8 skeleton-bg rounded-md"></div>
        </div>
      </div>

      {/* Collection Header Card Skeleton */}
      <div className="px-2 lg:px-6 pt-2 lg:pt-4 pb-6">
        <div className="bg-white lg:bg-container rounded-lg shadow lg:border-t-4 lg:border-lighterBlueHighlight py-4 lg:py-8">
          <div className="text-center py-2 lg:py-4 px-4">
            <div className="h-4 w-20 skeleton-bg rounded mx-auto mb-2 lg:hidden"></div>
            <div className="h-8 lg:h-12 w-48 lg:w-64 skeleton-bg rounded mx-auto mb-2"></div>
            <div className="h-4 lg:h-5 w-32 lg:w-40 skeleton-bg rounded mx-auto mb-4"></div>
            {/* Location Total Skeleton */}
            <div className="h-6 w-40 skeleton-bg rounded mx-auto mb-4"></div>
          </div>
        </div>
      </div>

      {/* Desktop: Tabs Skeleton */}
      <div className="px-2 lg:px-6 pb-6 hidden lg:flex lg:flex-row lg:space-x-6">
        <div className="lg:w-1/4 mb-6 lg:mb-0">
          <div className="space-y-2 bg-white p-3 rounded-lg shadow">
            <div className="h-10 w-full skeleton-bg rounded"></div>
            <div className="h-10 w-full skeleton-bg rounded"></div>
            <div className="h-10 w-full skeleton-bg rounded"></div>
          </div>
        </div>
        <div className="lg:w-3/4">
          <TabContentSkeleton />
        </div>
      </div>

      {/* Mobile: Stacked Sections Skeleton */}
      <div className="px-2 lg:px-6 pb-6 lg:hidden space-y-6">
        <MobileSectionSkeleton />
        <MobileSectionSkeleton />
        <MobileSectionSkeleton />
      </div>
    </main>
  </div>
);

const TabContentSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md">
    <div className="h-12 w-full skeleton-bg rounded-t-lg mb-4"></div>
    <div className="p-6 space-y-4">
      <div className="h-6 w-1/3 skeleton-bg rounded"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 w-full skeleton-bg rounded"></div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-6 w-32 skeleton-bg rounded"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 skeleton-bg rounded"></div>
          <div className="h-8 w-8 skeleton-bg rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

const MobileSectionSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md">
    <div className="h-12 w-full skeleton-bg rounded-t-lg mb-4"></div>
    <div className="p-4 space-y-4">
      <div className="h-5 w-1/2 skeleton-bg rounded"></div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-1/3 skeleton-bg rounded"></div>
            <div className="h-4 w-1/4 skeleton-bg rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Main component for the report page
export default function CollectionReportPage() {
  const params = useParams();
  const pathname = usePathname();
  // reportId is the MongoDB _id (document ID)
  const reportId = params.reportId as string;
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Machine Metrics" | "Location Metrics" | "SAS Metrics Compare"
  >("Machine Metrics");
  const [collections, setCollections] = useState<CollectionDocument[]>([]);
  const ITEMS_PER_PAGE = 10;
  const [machinePage, setMachinePage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const tabContentRef = useRef<HTMLDivElement>(null); // For desktop GSAP

  // Fetch report data on mount or when reportId changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCollectionReportById(reportId)
      .then((data) => {
        if (!validateCollectionReportData(data)) {
          setError("Report not found. Please use a valid report ID.");
          setReportData(null);
        } else {
          setReportData(data);
        }
      })
      .catch(() => {
        setError("Failed to fetch report data.");
        setReportData(null);
      })
      .finally(() => setLoading(false));
    // Fetch collections for this report
    fetchCollectionsByLocationReportId(reportId)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [reportId]);

  // GSAP animation for desktop tab transitions
  useEffect(() => {
    if (tabContentRef.current && window.innerWidth >= 1024) {
      // 1024px is lg breakpoint for default Tailwind
      gsap.fromTo(
        tabContentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [activeTab]);

  // Calculate location total
  const calculateLocationTotal = () => {
    if (!collections || collections.length === 0) return 0;
    return collections.reduce((total, collection) => {
      const gross = (collection.metersOut || 0) - (collection.metersIn || 0);
      return total + gross;
    }, 0);
  };

  // Refetch handler
  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCollectionReportById(reportId);
      if (!validateCollectionReportData(data)) {
        setError("Report not found. Please use a valid report ID.");
        setReportData(null);
      } else {
        setReportData(data);
      }
      const collectionsData = await fetchCollectionsByLocationReportId(
        reportId
      );
      setCollections(collectionsData);
    } catch {
      setError("Failed to refresh report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return <CollectionReportSkeleton />;
  }

  if (error) {
    // Common error display
    return (
      <div className="w-full md:w-[90%] lg:w-full md:mx-auto md:pl-28 lg:pl-36 min-h-screen bg-background flex flex-col">
        <Sidebar pathname={pathname} />
        <main className="flex-1 lg:ml-4">
          <Header
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={true}
            containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
            disabled={loading}
          />
          <div className="p-4 flex flex-col justify-center items-center h-[calc(100vh-theme_header_height)]">
            <p className="text-xl text-red-600 mb-4">Error: {error}</p>
            <Link href="/collection-report" legacyBehavior>
              <a className="bg-buttonActive text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center">
                <ArrowLeft size={18} className="mr-2" />
                Back to Collections
              </a>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!reportData) {
    // Common not found display
    return (
      <div className="w-full md:w-[90%] lg:w-full md:mx-auto md:pl-28 lg:pl-36 min-h-screen bg-background flex flex-col">
        <Sidebar pathname={pathname} />
        <main className="flex-1 lg:ml-4">
          <Header
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={true}
            containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
            disabled={loading}
          />
          <div className="p-4 flex flex-col justify-center items-center h-[calc(100vh-theme_header_height)]">
            <p className="text-xl text-gray-700 mb-4">Report not found.</p>
            <Link href="/collection-report" legacyBehavior>
              <a className="bg-buttonActive text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center">
                <ArrowLeft size={18} className="mr-2" />
                Back to Collections
              </a>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Desktop Tab Button Component
  const TabButton = ({
    label,
  }: {
    label: "Machine Metrics" | "Location Metrics" | "SAS Metrics Compare";
  }) => (
    <button
      onClick={() => !loading && setActiveTab(label)}
      disabled={loading}
      className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-full text-left ${
        activeTab === label
          ? "bg-buttonActive text-white"
          : "text-gray-700 hover:bg-gray-100"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {label}
    </button>
  );

  const sortedCollections = [...collections].sort(
    (a, b) => (b.sasMeters?.drop || 0) - (a.sasMeters?.drop || 0)
  );
  const machineTotalPages = Math.ceil(
    sortedCollections.length / ITEMS_PER_PAGE
  );
  const machineCurrentItems = sortedCollections.slice(
    (machinePage - 1) * ITEMS_PER_PAGE,
    machinePage * ITEMS_PER_PAGE
  );

  const MachineMetricsContent = ({ loading }: { loading: boolean }) => {
    if (loading) {
      return (
        <>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        </>
      );
    }
    if (machineCurrentItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl mb-4">🛠️</div>
          <p className="text-lg text-gray-600 font-semibold mb-2">
            No machine metrics available for this report.
          </p>
          <p className="text-sm text-gray-400">
            Try another report or check back later.
          </p>
        </div>
      );
    }
    return (
      <>
        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          <h2 className="text-xl font-bold text-center my-4">
            Machine Metrics
          </h2>
          {machineCurrentItems.map((col) => (
            <div
              key={col._id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="bg-lighterBlueHighlight text-white p-3">
                <h3 className="font-semibold">
                  Machine ID: {col.machineCustomName}
                </h3>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dropped / Cancelled</span>
                  <span className="font-medium text-gray-800">
                    {col.movement.metersIn} / {col.movement.metersOut}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Meters Gross</span>
                  <span className="font-medium text-gray-800">
                    {col.movement.gross}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SAS Gross</span>
                  <span className="font-medium text-gray-800">
                    {calculateSasGross(col)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variation</span>
                  <span className="font-medium text-gray-800">
                    {calculateVariation(col)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SAS Times</span>
                  <div className="font-medium text-gray-800 text-right">
                    <div>{col.sasMeters?.sasStartTime || "-"}</div>
                    <div>{col.sasMeters?.sasEndTime || "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop View */}
        <div className="hidden lg:block bg-white p-0 rounded-lg shadow-md overflow-x-auto pb-6">
          <table className="w-full text-sm">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  MACHINE ID
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  DROP/CANCELLED
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  METER GROSS
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  SAS GROSS
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  VARIATION
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  SAS TIMES
                </th>
              </tr>
            </thead>
            <tbody>
              {machineCurrentItems.map((col) => (
                <tr
                  key={col._id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="p-3 whitespace-nowrap">
                    <span className="bg-lighterBlueHighlight text-white px-3 py-1 rounded text-xs font-semibold">
                      {col.machineCustomName}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {col.movement.metersIn} / {col.movement.metersOut}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {col.movement.gross}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {calculateSasGross(col)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {calculateVariation(col)}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    <div>{col.sasMeters?.sasStartTime || "-"}</div>
                    <div>{col.sasMeters?.sasEndTime || "-"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination for Machine Metrics */}
          <div className="mt-6 flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMachinePage(1)}
              disabled={machinePage === 1}
              className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
            >
              <DoubleArrowLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMachinePage((p) => Math.max(1, p - 1))}
              disabled={machinePage === 1}
              className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-gray-700 text-sm">Page</span>
            <input
              type="number"
              min={1}
              max={machineTotalPages}
              value={machinePage}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > machineTotalPages) val = machineTotalPages;
                setMachinePage(val);
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              aria-label="Page number"
            />
            <span className="text-gray-700 text-sm">
              of {machineTotalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setMachinePage((p) => Math.min(machineTotalPages, p + 1))
              }
              disabled={machinePage === machineTotalPages}
              className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMachinePage(machineTotalPages)}
              disabled={machinePage === machineTotalPages}
              className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
            >
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    );
  };

  const LocationMetricsContent = ({ loading }: { loading: boolean }) => {
    if (loading) {
      return (
        <>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        </>
      );
    }

    return (
      <>
        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          <h2 className="text-xl font-bold text-center my-4">
            Location Metrics
          </h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-lighterBlueHighlight text-white p-3">
              <h3 className="font-semibold">
                Location: {reportData?.locationName || "Unknown"}
              </h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Dropped / Cancelled</span>
                <span className="font-medium text-gray-800">
                  {reportData?.locationMetrics?.droppedCancelled || "0 / 0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Meters Gross</span>
                <span className="font-medium text-gray-800">
                  {reportData?.locationMetrics?.metersGross?.toLocaleString() ||
                    "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Gross</span>
                <span className="font-medium text-gray-800">
                  {reportData?.locationMetrics?.sasGross?.toLocaleString() ||
                    "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variation</span>
                <span className="font-medium text-gray-800">
                  {reportData?.locationMetrics?.variation?.toLocaleString() ||
                    "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Desktop View */}
        <div className="hidden lg:block bg-white p-0 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  LOCATION
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  DROPPED / CANCELLED
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  METERS GROSS
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  SAS GROSS
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  VARIATION
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">
                  <span className="bg-lighterBlueHighlight text-white px-3 py-1 rounded text-xs font-semibold">
                    {reportData?.locationName || "Unknown"}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {reportData?.locationMetrics?.droppedCancelled || "0 / 0"}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {reportData?.locationMetrics?.metersGross?.toLocaleString() ||
                    "0"}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {reportData?.locationMetrics?.sasGross?.toLocaleString() ||
                    "0"}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {reportData?.locationMetrics?.variation?.toLocaleString() ||
                    "0"}
                </td>
              </tr>
            </tbody>
          </table>
          {/* Pagination for Location Metrics - Single item, no pagination needed */}
        </div>
      </>
    );
  };

  const SASMetricsCompareContent = ({ loading }: { loading: boolean }) => {
    if (loading) {
      return (
        <>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        </>
      );
    }

    const totalSasDrop = collections.reduce(
      (sum, col) => sum + (col.sasMeters?.drop || 0),
      0
    );
    const totalSasCancelled = collections.reduce(
      (sum, col) => sum + (col.sasMeters?.totalCancelledCredits || 0),
      0
    );
    const totalSasGross = totalSasDrop - totalSasCancelled;

    return (
      <>
        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          <h2 className="text-xl font-bold text-center my-4">
            SAS Metrics Compare
          </h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-lighterBlueHighlight text-white p-3">
              <h3 className="font-semibold">SAS Totals</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Drop Total</span>
                <span className="font-medium text-gray-800">
                  {totalSasDrop.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Cancelled Total</span>
                <span className="font-medium text-gray-800">
                  {totalSasCancelled.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Gross Total</span>
                <span className="font-medium text-gray-800">
                  {totalSasGross.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Desktop View */}
        <div className="hidden lg:block bg-white p-0 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  METRIC
                </th>
                <th className="p-3 text-left font-semibold whitespace-nowrap">
                  VALUE
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap font-medium">
                  SAS Drop Total
                </td>
                <td className="p-3 whitespace-nowrap">
                  {totalSasDrop.toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap font-medium">
                  SAS Cancelled Total
                </td>
                <td className="p-3 whitespace-nowrap">
                  {totalSasCancelled.toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap font-medium">
                  SAS Gross Total
                </td>
                <td className="p-3 whitespace-nowrap">
                  {totalSasGross.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
          {/* Pagination for SAS Metrics - Single summary, no pagination needed */}
        </div>
      </>
    );
  };

  const renderDesktopTabContent = () => {
    switch (activeTab) {
      case "Machine Metrics":
        return <MachineMetricsContent loading={false} />;
      case "Location Metrics":
        return <LocationMetricsContent loading={false} />;
      case "SAS Metrics Compare":
        return <SASMetricsCompareContent loading={false} />;
      default:
        return <MachineMetricsContent loading={false} />;
    }
  };

  return (
    <div className="w-full md:w-[90%] lg:w-full md:mx-auto md:pl-28 lg:pl-36 min-h-screen bg-background flex flex-col">
      <Sidebar pathname={pathname} />
      <main className="flex-1 lg:ml-4">
        <Header
          pageTitle=""
          hideOptions={true}
          hideLicenceeFilter={true}
          containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
          disabled={loading || refreshing}
        />

        {/* Back button - Desktop only */}
        <div className="px-2 lg:px-6 pt-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <Link href="/collection-report" legacyBehavior>
              <a className="flex items-center text-gray-600 hover:text-gray-800 font-medium transition-colors">
                <ArrowLeft size={18} className="mr-2" />
                Back to Collections
              </a>
            </Link>
            <Button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className={`bg-buttonActive text-white px-4 py-2 rounded-md flex items-center gap-2 ${
                loading || refreshing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {refreshing ? (
                <span className="loader mr-2" />
              ) : (
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
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Collection Header Card */}
        <div className="px-2 lg:px-6 pt-2 lg:pt-4 pb-6">
          <div className="bg-white lg:bg-container rounded-lg shadow lg:border-t-4 lg:border-lighterBlueHighlight py-4 lg:py-8">
            <div className="text-center py-2 lg:py-4 px-4">
              <div className="lg:hidden text-xs text-gray-500 mb-2">
                COLLECTION REPORT
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold text-gray-800 mb-2">
                {reportData.locationName}
              </h1>
              <p className="text-sm lg:text-base text-gray-600 mb-4">
                Report ID: {reportData.reportId}
              </p>
              <p className="text-lg font-semibold text-gray-700">
                Location Total: ${calculateLocationTotal().toLocaleString()}
              </p>
              {/* Mobile refresh button */}
              <div className="lg:hidden mt-4">
                <Button
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  className={`bg-buttonActive text-white px-4 py-2 rounded-md flex items-center gap-2 w-full justify-center ${
                    loading || refreshing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {refreshing ? (
                    <span className="loader mr-2" />
                  ) : (
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
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Sidebar + Content Layout */}
        <div className="px-2 lg:px-6 pb-6 hidden lg:flex lg:flex-row lg:space-x-6">
          {/* Tab Navigation Sidebar */}
          <div className="lg:w-1/4 mb-6 lg:mb-0">
            <div className="space-y-2 bg-white p-3 rounded-lg shadow">
              <TabButton label="Machine Metrics" />
              <TabButton label="Location Metrics" />
              <TabButton label="SAS Metrics Compare" />
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:w-3/4" ref={tabContentRef}>
            {renderDesktopTabContent()}
          </div>
        </div>

        {/* Mobile: Stacked Sections */}
        <div className="px-2 lg:px-6 pb-6 lg:hidden space-y-6">
          <MachineMetricsContent loading={false} />
          <LocationMetricsContent loading={false} />
          <SASMetricsCompareContent loading={false} />
        </div>
      </main>
    </div>
  );
}

const TableSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 w-full skeleton-bg rounded"></div>
      ))}
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4">
    <div className="h-6 w-1/2 skeleton-bg rounded mb-4"></div>
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-4 w-full skeleton-bg rounded"></div>
      ))}
    </div>
  </div>
);
