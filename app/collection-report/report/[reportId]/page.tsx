"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Edit3,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import gsap from "gsap";

// Define types for the report data - replace with actual types
type ReportData = {
  reportId: string;
  locationName: string;
  collectionDate: string; // Should ideally be a Date object or string that can be formatted
  machineMetrics: MachineMetric[];
  locationMetrics: LocationMetric;
  sasMetrics?: SASMetric;
};

type MachineMetric = {
  id: string;
  machineId: string;
  dropCancelled: string;
  meterGross: number;
  sasGross?: number | string;
  variation?: number | string;
  sasTimes?: string;
  hasIssue?: boolean; // For the green checkmark icon
};

type LocationMetric = {
  droppedCancelled: string;
  metersGross: number;
  variation: number;
  sasGross: number;
  locationRevenue: number;
  amountUncollected: number;
  amountToCollect: number;
  machinesNumber: string;
  collectedAmount: number;
  reasonForShortage?: string;
  taxes: number;
  advance: number;
  previousBalanceOwed: number;
  balanceCorrection: number;
  currentBalanceOwed: number;
  correctionReason?: string;
  variance?: number | string;
  varianceReason?: string;
};

type SASMetric = {
  dropped: number;
  cancelled: number;
  gross: number;
};

// Static data based on the screenshot for d5bea168480629ae02261abc
// Moved outside the component to prevent re-creation on every render
const staticReportData: ReportData = {
  reportId: "d5bea168480629ae02261abc",
  locationName: "Harry's Snack Bar",
  collectionDate: "April 14, 04:41 pm",
  machineMetrics: [
    {
      id: "1",
      machineId: "GM8402",
      dropCancelled: "1021 / 830",
      meterGross: 191,
      sasGross: "-",
      variation: "-",
      sasTimes: "2025, Mar 10, 13:43:45\n2025, Apr 14, 16:35:07",
      hasIssue: true,
    },
    {
      id: "2",
      machineId: "GM6529",
      dropCancelled: "1406 / 1680",
      meterGross: -214,
      sasGross: "-",
      variation: "-",
      sasTimes: "2025, Mar 10, 13:34:30\n2025, Apr 14, 16:35:31",
    },
    {
      id: "3",
      machineId: "GM8402",
      dropCancelled: "1021 / 830",
      meterGross: 191,
      sasGross: "-",
      variation: "-",
      sasTimes: "2025, Mar 10, 13:43:45\n2025, Apr 14, 16:35:07",
      hasIssue: true,
    },
    {
      id: "4",
      machineId: "GM6529",
      dropCancelled: "1406 / 1680",
      meterGross: -214,
      sasGross: "-",
      variation: "-",
      sasTimes: "2025, Mar 10, 13:34:30\n2025, Apr 14, 16:35:31",
    },
  ],
  locationMetrics: {
    droppedCancelled: "8832/7997",
    metersGross: 835,
    variation: 835,
    sasGross: 0,
    locationRevenue: 417,
    amountUncollected: 0,
    amountToCollect: 418,
    machinesNumber: "6/6",
    collectedAmount: 309,
    reasonForShortage: "-",
    taxes: 0,
    advance: 0,
    previousBalanceOwed: 0,
    balanceCorrection: -109,
    currentBalanceOwed: 0,
    correctionReason: "More than one reading included",
    variance: "-",
    varianceReason: "-",
  },
  sasMetrics: {
    dropped: 0,
    cancelled: 0,
    gross: 0,
  },
};

// Main component for the report page
export default function CollectionReportPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Machine Metrics" | "Location Metrics" | "SAS Metrics Compare"
  >("Machine Metrics");

  const tabContentRef = useRef<HTMLDivElement>(null); // For desktop GSAP

  useEffect(() => {
    setLoading(true);
    if (reportId === "d5bea168480629ae02261abc") {
      setReportData(staticReportData);
      setError(null);
    } else {
      setError("Report not found. Please use a valid report ID.");
      setReportData(null);
    }
    setLoading(false);
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

  if (loading) {
    // Common loader for both mobile and desktop
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar /> {/* Sidebar hidden on mobile by its own classes */}
        <main className="flex-1 lg:ml-[calc(7rem+1rem)]">
          <Header
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={true}
            containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
          />
          <div className="p-4 flex justify-center items-center h-[calc(100vh-theme_header_height)]">
            <p className="text-lg text-gray-700">Loading report...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    // Common error display
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:ml-[calc(7rem+1rem)]">
          <Header
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={true}
            containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
          />
          <div className="p-4 flex flex-col justify-center items-center h-[calc(100vh-theme_header_height)]">
            <p className="text-xl text-red-600 mb-4">Error: {error}</p>
            <Link href="/collections" legacyBehavior>
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
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:ml-[calc(7rem+1rem)]">
          <Header
            pageTitle=""
            hideOptions={true}
            hideLicenceeFilter={true}
            containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
          />
          <div className="p-4 flex flex-col justify-center items-center h-[calc(100vh-theme_header_height)]">
            <p className="text-xl text-gray-700 mb-4">Report not found.</p>
            <Link href="/collections" legacyBehavior>
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
      onClick={() => setActiveTab(label)}
      className={`px-4 py-3 text-sm font-medium rounded-md transition-colors w-full text-left ${
        activeTab === label
          ? "bg-buttonActive text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  const MachineMetricsContent = () => (
    <>
      {/* Mobile View (existing card layout - simplified here) */}
      <div className="lg:hidden space-y-4">
        <h2 className="text-xl font-bold text-center my-4">Machine Metrics</h2>
        {reportData.machineMetrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="bg-lighterBlueHighlight text-white p-3">
              <h3 className="font-semibold">Machine ID: {metric.machineId}</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Dropped / Cancelled</span>
                <span className="font-medium text-gray-800">
                  {metric.dropCancelled}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Meters Gross</span>
                <div className="flex items-center">
                  {metric.hasIssue && (
                    <Edit3 size={16} className="text-button mr-1" />
                  )}{" "}
                  {/* Green Check placeholder */}
                  <span className="font-medium text-gray-800">
                    {metric.meterGross}
                  </span>
                </div>
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
                <span className="font-medium text-gray-800 whitespace-pre-line text-right">
                  {metric.sasTimes}
                </span>
              </div>
            </div>
          </div>
        ))}
        {/* Pagination - Mobile styled, Desktop uses existing (or could be enhanced) */}
        <div className="flex items-center justify-center p-4 space-x-1 mt-4">
          <button
            className="p-2 rounded-md hover:bg-gray-200 text-lighterBlueHighlight disabled:opacity-50 disabled:text-gray-400"
            disabled
          >
            <ChevronsLeft size={20} />
          </button>
          <button
            className="p-2 rounded-md hover:bg-gray-200 text-lighterBlueHighlight disabled:opacity-50 disabled:text-gray-400"
            disabled
          >
            <ChevronLeft size={20} />
          </button>
          {[1, 2, 3, 4].map((page) => (
            <button
              key={page}
              className={`px-3 py-1 lg:px-4 lg:py-2 rounded-md text-sm font-medium ${
                page === 1
                  ? "bg-lighterBlueHighlight text-white"
                  : "hover:bg-gray-200 text-lighterBlueHighlight"
              }`}
              disabled={page !== 1}
            >
              {page}
            </button>
          ))}
          <span className="text-lighterBlueHighlight">...</span>
          <button className="p-2 rounded-md hover:bg-gray-200 text-lighterBlueHighlight">
            <ChevronRight size={20} />
          </button>
          <button className="p-2 rounded-md hover:bg-gray-200 text-lighterBlueHighlight">
            <ChevronsRight size={20} />
          </button>
        </div>
      </div>

      {/* Desktop View (Table layout to be restored/refined) */}
      <div className="hidden lg:block bg-white p-0 rounded-lg shadow-md overflow-x-auto">
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
            {reportData.machineMetrics.map((metric) => (
              <tr
                key={metric.id}
                className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
              >
                <td className="p-3 whitespace-nowrap">
                  <span className="bg-lighterBlueHighlight text-white px-3 py-1 rounded text-xs font-semibold">
                    {metric.machineId}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {metric.dropCancelled}
                </td>
                <td className="p-3 whitespace-nowrap">{metric.meterGross}</td>
                <td className="p-3 whitespace-nowrap">{metric.sasGross}</td>
                <td className="p-3 whitespace-nowrap">{metric.variation}</td>
                <td className="p-3 whitespace-pre-line text-xs">
                  {metric.sasTimes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Desktop Pagination (styled as per new screenshots) */}
        <div className="flex items-center justify-center p-4 space-x-1 border-t border-gray-200">
          <button
            className="p-2 rounded-md hover:bg-gray-200 text-buttonActive disabled:opacity-50 disabled:text-gray-400"
            disabled
          >
            <ChevronsLeft size={20} />
          </button>
          <button
            className="p-2 rounded-md hover:bg-gray-200 text-buttonActive disabled:opacity-50 disabled:text-gray-400"
            disabled
          >
            <ChevronLeft size={20} />
          </button>
          {[1, 2, 3, 4].map((page) => (
            <button
              key={page}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                page === 1
                  ? "bg-buttonActive text-white"
                  : "hover:bg-gray-200 text-buttonActive"
              }`}
              disabled={page !== 1}
            >
              {page}
            </button>
          ))}
          <span className="text-buttonActive">...</span>
          <button className="p-2 rounded-md hover:bg-gray-200 text-buttonActive">
            <ChevronRight size={20} />
          </button>
          <button className="p-2 rounded-md hover:bg-gray-200 text-buttonActive">
            <ChevronsRight size={20} />
          </button>
        </div>
      </div>
    </>
  );

  const LocationMetricsContent = () => {
    const lm = reportData.locationMetrics;
    return (
      <>
        {/* Mobile View (existing card layout - simplified here) */}
        <div className="lg:hidden space-y-4">
          <div className="border-t border-black mt-6 mb-4"></div>{" "}
          {/* Mobile Divider */}
          <h2 className="text-xl font-bold text-center my-4">Location Total</h2>
          <div className="bg-white p-4 rounded-lg shadow-md text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { label: "Dropped / Cancelled", value: lm.droppedCancelled },
                { label: "Meters Gross", value: lm.metersGross },
                { label: "SAS Gross", value: lm.sasGross },
                { label: "Variation", value: lm.variation },
              ].map((item) => (
                <div key={item.label} className="contents">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-800 text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            {/* Additional fields from desktop view, shown on mobile if needed, or adapt to screenshot more strictly */}
            {/* For now, keeping it concise like the screenshot */}
          </div>
          <div className="border-b border-black mt-4"></div>{" "}
          {/* Mobile Divider */}
        </div>

        {/* Desktop View (Section layout to be restored/refined) */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md">
          <h3 className="col-span-full text-lg font-semibold text-center py-3 bg-button text-white rounded-t-lg">
            Location Total
          </h3>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            {/* Left Column for Desktop */}
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Dropped / Cancelled</span>
                <span className="font-medium text-gray-800">
                  {lm.droppedCancelled}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Meters Gross</span>
                <span className="font-medium text-gray-800">
                  {lm.metersGross}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Variance</span>
                <span className="font-medium text-gray-800">
                  {lm.variation}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">SAS Gross</span>
                <span className="font-medium text-gray-800">{lm.sasGross}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Variance Reason</span>
                <span className="font-medium text-gray-800">
                  {lm.varianceReason || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Amount To Collect</span>
                <span className="font-medium text-gray-800">
                  {lm.amountToCollect}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Collected Amount</span>
                <span className="font-medium text-gray-800">
                  {lm.collectedAmount}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Taxes</span>
                <span className="font-medium text-gray-800">{lm.taxes}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Advance</span>
                <span className="font-medium text-gray-800">{lm.advance}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Previous Balance Owed</span>
                <span className="font-medium text-gray-800">
                  {lm.previousBalanceOwed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Balance Owed</span>
                <span className="font-medium text-gray-800">
                  {lm.currentBalanceOwed}
                </span>
              </div>
            </div>
            {/* Right Column for Desktop */}
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Location Revenue</span>
                <span className="font-medium text-gray-800">
                  {lm.locationRevenue}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Amount Uncollected</span>
                <span className="font-medium text-gray-800">
                  {lm.amountUncollected}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Machines Number</span>
                <span className="font-medium text-gray-800">
                  {lm.machinesNumber}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Reason For Shortage</span>
                <span className="font-medium text-gray-800">
                  {lm.reasonForShortage || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Balance Correction</span>
                <span className="font-medium text-gray-800">
                  {lm.balanceCorrection}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Correction Reason</span>
                <span className="font-medium text-gray-800">
                  {lm.correctionReason || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const SASMetricsCompareContent = () => {
    const sm = reportData.sasMetrics;
    if (!sm)
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          SAS Metrics not available.
        </div>
      ); // Fallback for both mobile/desktop if no data
    return (
      <>
        {/* Mobile View (existing card layout - simplified here) */}
        <div className="lg:hidden space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-center my-4">SAS Metrics</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Dropped:</span>
                <span className="font-medium text-gray-800">{sm.dropped}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cancelled:</span>
                <span className="font-medium text-gray-800">
                  {sm.cancelled}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gross:</span>
                <span className="font-medium text-gray-800">{sm.gross}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View (Section layout to be restored/refined) */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-center py-3 bg-button text-white rounded-t-lg">
            SAS Metrics Compare
          </h3>
          <div className="p-6 space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Dropped:</span>
              <span className="font-medium text-gray-800">{sm.dropped}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Cancelled:</span>
              <span className="font-medium text-gray-800">{sm.cancelled}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Gross:</span>
              <span className="font-medium text-gray-800">{sm.gross}</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Function to render content based on activeTab (for desktop)
  const renderDesktopTabContent = () => {
    switch (activeTab) {
      case "Machine Metrics":
        return <MachineMetricsContent />;
      case "Location Metrics":
        return <LocationMetricsContent />;
      case "SAS Metrics Compare":
        return <SASMetricsCompareContent />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar /> {/* Hidden on mobile via its own classes */}
      <main className="flex-1 lg:ml-[calc(7rem+1rem)]">
        <Header
          pageTitle=""
          hideOptions={true}
          hideLicenceeFilter={true}
          containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
        />

        {/* "Back to Collections" Link - Adjusted padding */}
        <div className="px-2 lg:px-6 pt-6 hidden lg:block">
          <Link href="/collections" legacyBehavior>
            <a className="inline-flex items-center text-buttonActive hover:text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm border border-buttonActive">
              <ArrowLeft size={16} className="mr-2" />
              Back to Collections
            </a>
          </Link>
        </div>

        {/* Collection Header Card - Adjusted padding */}
        <div className="px-2 lg:px-6 pt-2 lg:pt-4 pb-6">
          <div className="bg-white lg:bg-container rounded-lg shadow lg:border-t-4 lg:border-lighterBlueHighlight py-4 lg:py-8">
            <div className="text-center py-2 lg:py-4 px-4">
              <p className="text-sm text-gray-600 lg:hidden">Collection</p>{" "}
              {/* Mobile "Collection" text */}
              <h1 className="text-xl lg:text-3xl font-bold text-gray-800">
                <span className="text-button">{reportData.locationName}</span>
              </h1>
              <p className="text-sm text-gray-600 lg:text-base">
                {reportData.collectionDate}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {/* Desktop: Tabs - Adjusted padding */}
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

        {/* Mobile: Stacked Sections - Adjusted padding */}
        <div className="px-2 lg:px-6 pb-6 lg:hidden space-y-6">
          <MachineMetricsContent />
          <LocationMetricsContent />
          <SASMetricsCompareContent />
        </div>
      </main>
    </div>
  );
}
