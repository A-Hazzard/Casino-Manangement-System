"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { ReportView, ReportTab } from "@/lib/types/reports";

interface ReportsNavigationProps {
  availableTabs: ReportTab[];
  activeView: ReportView;
  onTabChange: (tabId: ReportView) => void;
  isLoading: boolean;
  realTimeMetrics?: {
    activeTerminals: number;
  } | null;
}

/**
 * Reports Navigation Component
 * Handles tab navigation for the reports page with responsive design
 */
export default function ReportsNavigation({
  availableTabs,
  activeView,
  onTabChange,
  isLoading,
  realTimeMetrics,
}: ReportsNavigationProps) {
  // Filter out dashboard tab for navigation (it's not shown in tabs)
  const visibleTabs = availableTabs.filter((tab) => tab.id !== "dashboard");

  return (
    <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
      {/* Desktop Navigation */}
      <nav className="hidden xl:flex space-x-8 overflow-x-auto px-6">
        {visibleTabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
          onChange={(e) => onTabChange(e.target.value as ReportView)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          disabled={isLoading}
        >
          {visibleTabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.icon} {tab.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600 mt-2">
          {visibleTabs.find((tab) => tab.id === activeView)?.description}
        </p>
      </div>
    </div>
  );
}
