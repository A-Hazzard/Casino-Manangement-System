"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// Skeleton components
import {
  CollectionReportSkeleton,
  TableSkeleton,
  CardSkeleton,
} from "@/components/ui/skeletons/CollectionReportDetailSkeletons";

// Helper functions
import { fetchCollectionReportById } from "@/lib/helpers/collectionReport";
import { fetchCollectionsByLocationReportId } from "@/lib/helpers/collections";
import { validateCollectionReportData } from "@/lib/utils/validation";
import {
  animateDesktopTabTransition,
  generateMachineMetricsData,
  calculateLocationTotal,
  calculateSasMetricsTotals,
} from "@/lib/helpers/collectionReportDetailPage";
import { formatCurrency } from "@/lib/utils/currency";

// Types
import type { CollectionReportData } from "@/lib/types/index";
import type { CollectionDocument } from "@/lib/types/collections";

export default function CollectionReportPage() {
  const params = useParams();
  const pathname = usePathname();
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

  const tabContentRef = useRef<HTMLDivElement>(null);

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

    fetchCollectionsByLocationReportId(reportId)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [reportId]);

  useEffect(() => {
    animateDesktopTabTransition(tabContentRef);
  }, [activeTab]);

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
    return <CollectionReportSkeleton pathname={pathname} />;
  }

  if (error) {
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

  const {
    metricsData,
    totalPages: machineTotalPages,
    hasData,
  } = generateMachineMetricsData(collections, machinePage, ITEMS_PER_PAGE);

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
    if (!hasData) {
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
        <div className="lg:hidden space-y-4">
          <h2 className="text-xl font-bold text-center my-4">
            Machine Metrics
          </h2>
          {metricsData.map((metric) => (
            <div
              key={metric.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="bg-lighterBlueHighlight text-white p-3">
                <h3 className="font-semibold">
                  Machine ID: {metric.machineCustomName}
                </h3>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dropped / Cancelled</span>
                  <span className="font-medium text-gray-800">
                    {metric.droppedCancelled}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Meters Gross</span>
                  <span className="font-medium text-gray-800">
                    {metric.metersGross}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SAS Gross</span>
                  <span className="font-medium text-gray-800">
                    {metric.sasGross}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variation</span>
                  <span className="font-medium text-gray-800">
                    {metric.variation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SAS Times</span>
                  <div className="font-medium text-gray-800 text-right">
                    <div>{metric.sasStartTime}</div>
                    <div>{metric.sasEndTime}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
              {metricsData.map((metric) => (
                <tr
                  key={metric.id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="p-3 whitespace-nowrap">
                    <span className="bg-lighterBlueHighlight text-white px-3 py-1 rounded text-xs font-semibold">
                      {metric.machineCustomName}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {metric.droppedCancelled}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {metric.metersGross}
                  </td>
                  <td className="p-3 whitespace-nowrap">{metric.sasGross}</td>
                  <td className="p-3 whitespace-nowrap">{metric.variation}</td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    <div>{metric.sasStartTime}</div>
                    <div>{metric.sasEndTime}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <span className="font-medium text-black">
                  {reportData?.locationMetrics?.droppedCancelled || "0 / 0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Meters Gross</span>
                <span className="font-medium text-green-600">
                  {reportData?.locationMetrics?.metersGross?.toLocaleString() ||
                    "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SAS Gross</span>
                <span className="font-medium text-green-600">
                  {reportData?.locationMetrics?.sasGross?.toLocaleString() ||
                    "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variation</span>
                <span className="font-medium text-yellow-600">
                  {reportData?.locationMetrics?.variation?.toLocaleString() ||
                    "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
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
                  <span className="font-medium text-black">
                    {reportData?.locationMetrics?.droppedCancelled || "0 / 0"}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span className="font-medium text-green-600">
                    {reportData?.locationMetrics?.metersGross?.toLocaleString() ||
                      "0"}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span className="font-medium text-green-600">
                    {reportData?.locationMetrics?.sasGross?.toLocaleString() ||
                      "0"}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span className="font-medium text-yellow-600">
                    {reportData?.locationMetrics?.variation?.toLocaleString() ||
                      "0"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
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

    const { totalSasDrop, totalSasCancelled, totalSasGross } =
      calculateSasMetricsTotals(collections);

    return (
      <>
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
                Location Total: $
                {formatCurrency(calculateLocationTotal(collections))}
              </p>
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

        <div className="px-2 lg:px-6 pb-6 hidden lg:flex lg:flex-row lg:space-x-6">
          <div className="lg:w-1/4 mb-6 lg:mb-0">
            <div className="space-y-2 bg-white p-3 rounded-lg shadow">
              <TabButton label="Machine Metrics" />
              <TabButton label="Location Metrics" />
              <TabButton label="SAS Metrics Compare" />
            </div>
          </div>

          <div className="lg:w-3/4" ref={tabContentRef}>
            {renderDesktopTabContent()}
          </div>
        </div>

        <div className="px-2 lg:px-6 pb-6 lg:hidden space-y-6">
          <MachineMetricsContent loading={false} />
          <LocationMetricsContent loading={false} />
          <SASMetricsCompareContent loading={false} />
        </div>
      </main>
    </div>
  );
}
