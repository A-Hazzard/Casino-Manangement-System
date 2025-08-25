import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TimePeriod } from "@/lib/types/api";

type ExtendedTimeFilterButtonsProps = {
  activeMetricsFilter: TimePeriod;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  lastFilterChangeTimeRef: React.RefObject<number>;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: TimePeriod) => void;
};

const filterOptions = [
  { label: "Today", value: "Today" as TimePeriod },
  { label: "Yesterday", value: "Yesterday" as TimePeriod },
  { label: "Last 7 days", value: "7d" as TimePeriod },
  { label: "30 days", value: "30d" as TimePeriod },
  { label: "Custom", value: "Custom" as TimePeriod },
];

export default function TimeFilterButtons({
  activeMetricsFilter,
  metricsLoading,
  isFilterChangeInProgress,
  lastFilterChangeTimeRef,
  setIsFilterChangeInProgress,
  setActiveMetricsFilter,
}: ExtendedTimeFilterButtonsProps) {
  // Check if any loading state is active
  const isLoading = metricsLoading || isFilterChangeInProgress;

  return (
    <motion.div
      className="mb-6 overflow-x-auto no-scrollbar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex space-x-3">
        {filterOptions.map((filter) => (
          <motion.div
            key={filter.label}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
          >
            <Button
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                activeMetricsFilter === filter.value
                  ? "bg-buttonActive text-white"
                  : "bg-button text-white hover:bg-buttonActive"
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
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : null}
              {filter.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
