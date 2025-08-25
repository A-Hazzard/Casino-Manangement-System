import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { TimePeriod } from "@/lib/types/api";

type ExtendedTimeFilterButtonsProps = {
  activeMetricsFilter: TimePeriod;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  lastFilterChangeTimeRef: React.RefObject<number>;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: TimePeriod) => void;
};

const TimeFilterButtons: React.FC<ExtendedTimeFilterButtonsProps> = ({
  activeMetricsFilter,
  metricsLoading,
  isFilterChangeInProgress,
  lastFilterChangeTimeRef,
  setIsFilterChangeInProgress,
  setActiveMetricsFilter,
}) => {
  const timeFilters = [
    { label: "Today", value: "Today" as TimePeriod },
    { label: "Yesterday", value: "Yesterday" as TimePeriod },
    { label: "Last 7 days", value: "7d" as TimePeriod },
    { label: "30 days", value: "30d" as TimePeriod },
    { label: "Custom", value: "Custom" as TimePeriod },
  ];

  // Check if any loading state is active
  const isLoading = metricsLoading || isFilterChangeInProgress;

  return (
    <div className="flex flex-wrap justify-center md:justify-end gap-2 mb-4">
      {/* Mobile and md/lg: Select dropdown */}
      <div className="w-full xl:hidden">
        <select
          value={activeMetricsFilter}
          onChange={(e) => {
            // Prevent changing filter if already loading
            if (isLoading) {
              return;
            }

            // Throttle filter changes
            const now = Date.now();
            if (now - lastFilterChangeTimeRef.current < 1000) {
              return;
            }

            lastFilterChangeTimeRef.current = now;
            setIsFilterChangeInProgress(true);
            setActiveMetricsFilter(e.target.value as TimePeriod);
          }}
          className={`w-full md:w-48 rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isLoading}
        >
          {timeFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* xl and above: Filter buttons */}
      <div className="hidden xl:flex flex-wrap justify-center md:justify-end gap-2">
        {timeFilters.map((filter, index) => (
          <motion.div
            key={filter.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              className={`px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-white rounded-full flex items-center gap-1 md:gap-2 ${
                isLoading && activeMetricsFilter === filter.value
                  ? "opacity-80"
                  : ""
              } ${
                activeMetricsFilter === filter.value
                  ? "bg-purple-700"
                  : "bg-button"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => {
                // Prevent changing filter if already loading
                if (isLoading) {
                  return;
                }

                // Prevent clicking on already active filter
                if (activeMetricsFilter === filter.value) {
                  return;
                }

                // Throttle filter changes
                const now = Date.now();
                if (now - lastFilterChangeTimeRef.current < 1000) {
                  return;
                }

                lastFilterChangeTimeRef.current = now;
                setIsFilterChangeInProgress(true);
                setActiveMetricsFilter(filter.value);
              }}
              disabled={isLoading}
            >
              {metricsLoading && activeMetricsFilter === filter.value ? (
                <span className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              {filter.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TimeFilterButtons;
