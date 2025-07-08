"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// Types
import type { ReportView } from "@/lib/types/reports";

// Constants
import {
  reportsTabsConfig,
  pageVariants,
  tabVariants,
} from "@/lib/constants/uiConstants";

// Tab components
import LocationsTab from "@/components/reports/tabs/LocationsTab";
import MachinesTab from "@/components/reports/tabs/MachinesTab";

// UI Components
import { Button } from "@/components/ui/button";
import RefreshButton from "@/components/ui/RefreshButton";
import { Badge } from "@/components/ui/badge";
import MachineComparisonModal from "@/components/reports/common/MachineComparisonModal";

// Icons
import {
  Settings,
  Download,
  Filter,
  Bell,
  Maximize,
  Minimize,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function ReportsPage() {
  const pathname = usePathname();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  const {
    activeView,
    setActiveView,
    isLoading,
    setLoading,
    setError,
    fullscreenMode,
    toggleFullscreen,
    refreshAllData,
  } = useReportsStore();

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isLicenseeReady, setIsLicenseeReady] = useState(false);

  useEffect(() => {
    const ensureLicenseeIsSelected = async () => {
      if (selectedLicencee) {
        setIsLicenseeReady(true);
        return;
      }
      try {
        const response = await fetch("/api/licensees");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        if (data.licensees && data.licensees.length > 0) {
          setSelectedLicencee(data.licensees[0]._id);
          setIsLicenseeReady(true);
        } else {
          setError("No licensees found");
          toast.error("No licensees available to display reports.");
          setIsLicenseeReady(false); // Can't proceed
        }
      } catch (error) {
        console.error("Failed to fetch licensees:", error);
        setError("Failed to load default licensee");
        toast.error("Failed to load default licensee");
        setIsLicenseeReady(false); // Can't proceed
      }
    };
    ensureLicenseeIsSelected();
  }, [selectedLicencee, setSelectedLicencee, setError]);

  // Handle tab change with loading state
  const handleTabChange = async (tabId: ReportView) => {
    if (tabId === activeView) return;

    setLoading(true);
    setActiveView(tabId);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setLoading(false);
      toast.success(
        `Switched to ${
          reportsTabsConfig.find((t) => t.id === tabId)?.label
        } view`
      );
    }, 300);
  };

  // Handle refresh all data
  const handleRefreshAll = async () => {
    try {
      await refreshAllData();
      toast.success("All data refreshed successfully");
    } catch {
      setError("Failed to refresh data");
      toast.error("Failed to refresh data");
    }
  };

  const renderTabContent = () => {
    const tabComponents: Record<string, React.ReactElement> = {
      locations: <LocationsTab />,
      machines: <MachinesTab />,
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
          {tabComponents[activeView] || <LocationsTab />}
        </motion.div>
      </AnimatePresence>
    );
  };

  const currentTab = reportsTabsConfig.find((tab) => tab.id === activeView);

  return (
    <>
      <Sidebar pathname={pathname} />
      <div
        className={`w-full max-w-full min-h-screen bg-background flex overflow-hidden transition-all duration-300 ${
          fullscreenMode ? "fixed inset-0 z-50" : ""
        }`}
      >
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
            disabled={isLoading || !isLicenseeReady}
            hideLicenceeFilter={false}
          />

          {/* Page Title and Actions */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile: Icon and Title */}
              <div className="flex lg:hidden items-center gap-3">
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
              <div className="hidden lg:flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  Casino Reports
                </h1>
                <Badge
                  variant="secondary"
                  className="bg-buttonActive text-white"
                >
                  {currentTab?.label}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Quick Actions Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="hidden md:flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Quick Actions
                </Button>

                {showQuickActions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20"
                  >
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Advanced Filters
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Set Alerts
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="hidden lg:flex items-center gap-2"
              >
                {fullscreenMode ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>

              {/* Refresh Button */}
              <RefreshButton
                onClick={handleRefreshAll}
                isSyncing={isLoading}
                disabled={isLoading}
                className="bg-button hover:bg-buttonActive text-white"
                label="Refresh"
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-8 overflow-x-auto px-6">
              {reportsTabsConfig.map((tab) => (
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
                  disabled={isLoading || !isLicenseeReady}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Mobile Navigation */}
            <div className="lg:hidden px-4 py-2">
              <select
                value={activeView}
                onChange={(e) => handleTabChange(e.target.value as ReportView)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                disabled={isLoading || !isLicenseeReady}
              >
                {reportsTabsConfig.map((tab) => (
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
          <div className="flex-1 min-h-0">
            {isLicenseeReady ? (
              renderTabContent()
            ) : (
              <div className="flex justify-center items-center h-full">
                <p>Loading reports...</p>
              </div>
            )}
          </div>
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
            color: "#374151",
          },
        }}
      />

      {/* Modals */}
      <MachineComparisonModal />
    </>
  );
}
