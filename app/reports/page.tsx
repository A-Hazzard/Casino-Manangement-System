"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import type { ReactElement } from "react";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// Hooks
import { useAuth } from "@/lib/hooks/useAuth";

// Types
import type { ReportView, ReportTab } from "@/lib/types/reports";

// Tab components
import DashboardTab from "@/components/reports/tabs/DashboardTab";
import LocationsTab from "@/components/reports/tabs/LocationsTab";
import MachinesTab from "@/components/reports/tabs/MachinesTab";
import MetersTab from "@/components/reports/tabs/MetersTab";
// UI Components
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { getTimeFilterButtons } from "@/lib/helpers/dashboard";
import { TimePeriod } from "@/app/api/lib/types";

// Icons
import { RefreshCw, FileText, Bell } from "lucide-react";

const reportsTabsConfig: ReportTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    description: "Real-time overview of casino operations and KPIs",
  },
  {
    id: "locations",
    label: "Locations",
    icon: "🏢",
    description: "Location performance analysis and comparisons",
  },
  {
    id: "machines",
    label: "Machines",
    icon: "🎰",
    description: "Individual machine performance and revenue tracking",
  },
  {
    id: "meters",
    label: "Meters",
    icon: "📈",
    description: "Meter readings and financial data by location",
  },
];

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const tabVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Reports Date Filters Component - Syncs with both dashboard and reports stores
function ReportsDateFilters() {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
  } = useDashBoardStore();

  const { setDateRange } = useReportsStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const timeFilterButtons = getTimeFilterButtons();

  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.startDate && pendingCustomDateRange?.endDate) {
      // Update both stores
      setCustomDateRange({
        startDate: pendingCustomDateRange.startDate,
        endDate: pendingCustomDateRange.endDate,
      });
      setDateRange(
        pendingCustomDateRange.startDate,
        pendingCustomDateRange.endDate
      );
      setActiveMetricsFilter("Custom");
      setShowCustomPicker(false);
    }
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingCustomDateRange({ startDate: firstDay, endDate: lastDay });
  };

  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === "Custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);

      // Update reports store based on filter
      const now = new Date();
      let startDate: Date, endDate: Date;

      switch (filter) {
        case "Today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "Yesterday":
          startDate = new Date(now.setDate(now.getDate() - 1));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "last7days":
          startDate = new Date(now.setDate(now.getDate() - 7));
          endDate = new Date();
          break;
        case "last30days":
          startDate = new Date(now.setDate(now.getDate() - 30));
          endDate = new Date();
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
      }

      setDateRange(startDate, endDate);
    }
    setActiveMetricsFilter(filter);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {timeFilterButtons.map((filter) => (
        <Button
          key={filter.value}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeMetricsFilter === filter.value
              ? "bg-buttonActive text-white"
              : "bg-button text-white hover:bg-button/90"
          }`}
          onClick={() => handleFilterClick(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
      {showCustomPicker && activeMetricsFilter === "Custom" && (
        <ModernDateRangePicker
          value={
            pendingCustomDateRange
              ? {
                  from: pendingCustomDateRange.startDate,
                  to: pendingCustomDateRange.endDate,
                }
              : undefined
          }
          onChange={(range) =>
            setPendingCustomDateRange(
              range && range.from && range.to
                ? { startDate: range.from, endDate: range.to }
                : undefined
            )
          }
          onGo={handleApplyCustomRange}
          onSetLastMonth={handleSetLastMonth}
        />
      )}
    </div>
  );
}

function ReportsContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const {
    canAccessReport,
    getUserLocationIds,
    isLoading: authLoading,
  } = useAuth();

  const {
    activeView,
    setActiveView,
    isLoading,
    setLoading,
    setError,
    realTimeMetrics,
  } = useReportsStore();

  // Filter tabs based on user permissions
  const availableTabs = reportsTabsConfig.filter((tab) =>
    canAccessReport(tab.requiredRoles, tab.requiredPermissions)
  );

  // URL state management for tab selection
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "machines") {
      setActiveView("machines");
    } else if (section === "locations") {
      setActiveView("locations");
    } else if (section === "meters") {
      setActiveView("meters");
    } else if (section === "dashboard") {
      setActiveView("dashboard");
    } else {
      // Default to locations if no section specified
      setActiveView("locations");
    }
  }, [searchParams, setActiveView]);

  // Ensure user has access to current view, fallback to first available tab
  useEffect(() => {
    if (!authLoading && availableTabs.length > 0) {
      const currentTabExists = availableTabs.some(
        (tab) => tab.id === activeView
      );
      if (!currentTabExists) {
        setActiveView(availableTabs[0].id);
      }
    }
  }, [authLoading, availableTabs, activeView, setActiveView]);

  // Handle tab change with loading state and permission check
  const handleTabChange = async (tabId: ReportView) => {
    if (tabId === activeView) return;

    // Check if user has access to this tab
    const targetTab = availableTabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      toast.error("You don&apos;t have permission to access this report");
      return;
    }

    setLoading(true);
    setActiveView(tabId);

    // Update URL based on tab selection
    if (tabId === "machines") {
      router.push("/reports?section=machines");
    } else if (tabId === "locations") {
      router.push("/reports?section=locations");
    } else if (tabId === "meters") {
      router.push("/reports?section=meters");
    } else {
      router.push("/reports?section=dashboard");
    }

    // Simulate loading delay for better UX
    setTimeout(() => {
      setLoading(false);
      toast.success(`Switched to ${targetTab.label} view`);
    }, 300);
  };

  const renderTabContent = () => {
    const tabComponents: Record<ReportView, ReactElement> = {
      dashboard: <DashboardTab />,
      locations: <LocationsTab />,
      machines: <MachinesTab />,
      meters: <MetersTab />,
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="w-full h-full"
        >
          {tabComponents[activeView] || <DashboardTab />}
        </motion.div>
      </AnimatePresence>
    );
  };

  const currentTab = availableTabs.find((tab) => tab.id === activeView);

  // Show loading state while authentication is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-buttonActive" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no tabs are available
  if (availableTabs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access any reports. Please contact
            your administrator for access.
          </p>
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-buttonActive hover:bg-buttonActive/90"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden transition-all duration-300 xl:pl-36">
        <motion.main
          className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
            disabled={isLoading}
            hideLicenceeFilter={false}
          />

          {/* Page Title and Actions */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile: Icon and Title */}
              <div className="flex xl:hidden items-center gap-3">
                <div className="p-2 bg-buttonActive rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Casino Reports
                  </h1>
                  <p className="text-sm text-gray-600">
                    {currentTab?.description}
                  </p>
                </div>
              </div>

              {/* Desktop: Title and Badge */}
              <div className="hidden xl:flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  Casino Reports
                </h1>
                <Badge
                  variant="secondary"
                  className="bg-buttonActive text-white"
                >
                  {currentTab?.label}
                </Badge>
                {realTimeMetrics && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600"
                  >
                    Live • {realTimeMetrics.currentPlayers} players
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Date Filter - Global for all tabs */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Date Filter
            </h3>
            <ReportsDateFilters />
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
            {/* Desktop Navigation */}
            <nav className="hidden xl:flex space-x-8 overflow-x-auto px-6">
              {availableTabs
                .filter((tab) => tab.id !== "dashboard")
                .map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                    flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200
                    ${
                      activeView === tab.id
                        ? "border-buttonActive text-buttonActive bg-buttonActive/5"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.id === "dashboard" && realTimeMetrics && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {realTimeMetrics.activeTerminals}
                      </Badge>
                    )}
                  </motion.button>
                ))}
            </nav>

            {/* Mobile Navigation */}
            <div className="xl:hidden px-4 py-2">
              <select
                value={activeView}
                onChange={(e) => handleTabChange(e.target.value as ReportView)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                disabled={isLoading}
              >
                {availableTabs
                  .filter((tab) => tab.id !== "dashboard")
                  .map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.icon} {tab.label}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                {currentTab?.description}
              </p>
            </div>
          </div>

          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3"
                >
                  <RefreshCw className="w-6 h-6 animate-spin text-buttonActive" />
                  <span className="text-lg font-medium">
                    Loading reports...
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Content */}
          <div className="flex-1 min-h-0">{renderTabContent()}</div>
        </motion.main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          duration: 4000,
          style: {
            background: "white",
            border: "1px solid #e5e7eb",
          },
        }}
      />
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-buttonActive" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
