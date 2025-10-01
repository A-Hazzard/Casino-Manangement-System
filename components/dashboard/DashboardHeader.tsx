/**
 * Dashboard Header Component
 * Handles the header section with title, filters, and refresh functionality
 */

import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import RefreshButton from "@/components/ui/RefreshButton";
import DashboardDateFilters from "./DashboardDateFilters";

interface DashboardHeaderProps {
  // Loading states
  loadingChartData: boolean;
  refreshing: boolean;
  
  // Actions
  onRefresh: () => void;
  onCustomRangeGo: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export const DashboardHeader = ({
  loadingChartData,
  refreshing,
  onRefresh,
  onCustomRangeGo,
}: DashboardHeaderProps) => {
  // Handle refresh action
  const handleRefresh = () => {
    onRefresh();
  };

  if (loadingChartData && !refreshing) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      {/* Header with title and refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your gaming operations and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <RefreshButton
            onClick={handleRefresh}
            isSyncing={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </RefreshButton>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <DashboardDateFilters
            disabled={loadingChartData}
            hideAllTime={false}
            onCustomRangeGo={onCustomRangeGo}
          />
        </div>
      </div>
    </motion.div>
  );
};
