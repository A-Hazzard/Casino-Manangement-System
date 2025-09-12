import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import axios from "axios";
import { AccountingDetailsProps } from "@/lib/types/cabinetDetails";
import {
  containerVariants,
  itemVariants,
} from "@/lib/constants/animationVariants";
// import { BillValidatorTableV2 } from "./BillValidatorTableV2"; // Removed - using BillValidatorTableWithFilters instead
import { BillValidatorTableWithFilters } from "./BillValidatorTableWithFilters";
import ActivityLogSkeleton from "./ActivityLogSkeleton";
import { ActivityLogTable } from "./ActivityLogTable";
import { CollectionHistoryTable } from "./CollectionHistoryTable";
import CollectionHistorySkeleton from "./CollectionHistorySkeleton";
import ActivityLogDateFilter from "@/components/ui/ActivityLogDateFilter";
import type { MachineEvent } from "./ActivityLogTable";
import type { TimePeriod } from "@/app/api/lib/types";

import type { MachineDocument } from "@/shared/types";
import type { Cabinet } from "@/lib/types/cabinets";

// Bill Meters data type
type BillMetersData = {
  dollar1?: number;
  dollar2?: number;
  dollar5?: number;
  dollar10?: number;
  dollar20?: number;
  dollar50?: number;
  dollar100?: number;
  dollar500?: number;
  dollar1000?: number;
  dollar2000?: number;
  dollar5000?: number;
  dollarTotal?: number;
  dollarTotalUnknown?: number;
};

// Bill Meters data type - moved to shared types
// type BillMetersData = {
//   dollar1?: number;
//   dollar2?: number;
//   dollar5?: number;
//   dollar10?: number;
//   dollar20?: number;
//   dollar50?: number;
//   dollar100?: number;
//   dollar500?: number;
//   dollar1000?: number;
//   dollar2000?: number;
//   dollar5000?: number;
//   dollarTotal?: number;
//   dollarTotalUnknown?: number;
// };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Type for collection data from machine's embedded collectionMetersHistory
type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number; // This maps to prevMetersIn from the embedded data
  prevOut: number; // This maps to prevMetersOut from the embedded data
  locationReportId: string;
};

// Skeleton loaders for individual tabs
const MetricsSkeleton = () => (
  <div
    className="flex flex-wrap gap-3 md:gap-4 max-w-full w-full"
    style={{ rowGap: "1rem" }}
  >
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="bg-container p-4 md:p-6 rounded-lg shadow w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto"
      >
        <div className="h-4 bg-gray-200 rounded mb-2 md:mb-4 animate-pulse"></div>
        <div className="h-1 w-full bg-gray-300 mb-4 md:mb-6"></div>
        <div className="flex justify-center items-center h-6">
          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    ))}
  </div>
);

const LiveMetricsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-full">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="bg-container p-4 md:p-6 rounded-lg shadow">
        <div className="h-4 bg-gray-200 rounded mb-2 md:mb-4 animate-pulse"></div>
        <div className="h-1 w-full bg-gray-300 mb-4 md:mb-6"></div>
        <div className="flex justify-center items-center h-6">
          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    ))}
  </div>
);

const BillValidatorSkeleton = () => (
  <div className="w-full max-w-xl mx-auto">
    <div className="mb-4 text-center">
      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
    </div>
    <div className="bg-container p-6 rounded-lg shadow">
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ConfigurationsSkeleton = () => (
  <div className="flex flex-col items-center sm:flex-row sm:justify-start sm:items-stretch flex-wrap gap-4 w-full">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="flex flex-col w-64 max-w-full rounded-lg shadow overflow-hidden"
      >
        <div className="bg-gray-400 p-3 flex items-center justify-center">
          <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="bg-white p-4 flex items-center justify-center">
          <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

// Collection Settings Content Component
const CollectionSettingsContent: React.FC<{ cabinet: Cabinet }> = ({
  cabinet,
}) => {
  const [isEditCollection, setIsEditCollection] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [collectionMetersIn, setCollectionMetersIn] = useState<string>("0");
  const [collectionMetersOut, setCollectionMetersOut] = useState<string>("0");
  const [collectionDate, setCollectionDate] = useState<Date | null>(null);
  const [collectionHour, setCollectionHour] = useState<number>(0);
  const [collectorDenomination, setCollectorDenomination] =
    useState<string>("1");

  // Hour options for collection time
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    text: `${i.toString().padStart(2, "0")}:00`,
    value: i,
  }));

  // Initialize collection settings from cabinet data
  React.useEffect(() => {
    if (cabinet.collectionMeters) {
      setCollectionMetersIn(String(cabinet.collectionMeters.metersIn || 0));
      setCollectionMetersOut(String(cabinet.collectionMeters.metersOut || 0));
    }
    if (cabinet.collectionTime) {
      const lastColTime = new Date(cabinet.collectionTime as string | Date);
      setCollectionDate(lastColTime);
      setCollectionHour(lastColTime.getHours());
    }
    if (cabinet.collectorDenomination) {
      setCollectorDenomination(String(cabinet.collectorDenomination));
    }
  }, [cabinet]);

  // Handle collection settings save
  const handleSaveCollectionSettings = async () => {
    if (!isEditCollection) {
      setIsEditCollection(true);
      return;
    }

    if (!collectionDate) {
      toast.error("Please select last collection time and save again.");
      return;
    }

    setIsUpdatingCollection(true);
    try {
      // Create the collection time with the selected hour
      const prevCollectionTime = new Date(collectionDate);
      prevCollectionTime.setHours(collectionHour, 0, 0, 0);

      // Update cabinet data
      const updateData = {
        collectionMeters: {
          metersIn: parseInt(collectionMetersIn) || 0,
          metersOut: parseInt(collectionMetersOut) || 0,
        },
        collectionTime: prevCollectionTime.toISOString(),
        collectorDenomination: parseFloat(collectorDenomination) || 1,
      };

      // Make API call to update cabinet
      const response = await fetch(`/api/cabinets/${cabinet._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update collection settings");
      }

      setIsEditCollection(false);
      toast.success("Collection settings updated successfully!");
    } catch (error) {
      console.error("Error saving collection settings:", error);
      toast.error("Failed to save collection settings");
    } finally {
      setIsUpdatingCollection(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-6 text-gray-800">
          Collection Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Last Meters In */}
          <div className="space-y-2">
            <Label
              htmlFor="metersIn"
              className="text-sm font-medium text-gray-700"
            >
              Last Meters In
            </Label>
            <Input
              id="metersIn"
              type="number"
              value={collectionMetersIn}
              onChange={(e) => setCollectionMetersIn(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Last Meters Out */}
          <div className="space-y-2">
            <Label
              htmlFor="metersOut"
              className="text-sm font-medium text-gray-700"
            >
              Last Meters Out
            </Label>
            <Input
              id="metersOut"
              type="number"
              value={collectionMetersOut}
              onChange={(e) => setCollectionMetersOut(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Collection Date */}
          <div className="space-y-2">
            <Label
              htmlFor="collectionDate"
              className="text-sm font-medium text-gray-700"
            >
              Last Collection Date
            </Label>
            <Input
              id="collectionDate"
              type="date"
              value={
                collectionDate ? collectionDate.toISOString().split("T")[0] : ""
              }
              onChange={(e) =>
                setCollectionDate(
                  e.target.value ? new Date(e.target.value) : null
                )
              }
              disabled={!isEditCollection}
              className="w-full"
            />
          </div>

          {/* Collection Hour */}
          <div className="space-y-2">
            <Label
              htmlFor="collectionHour"
              className="text-sm font-medium text-gray-700"
            >
              Collection Hour
            </Label>
            <Select
              value={collectionHour.toString()}
              onValueChange={(value) => setCollectionHour(parseInt(value))}
              disabled={!isEditCollection}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select hour" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collector Denomination */}
          <div className="space-y-2">
            <Label
              htmlFor="denomination"
              className="text-sm font-medium text-gray-700"
            >
              Collector Denomination
            </Label>
            <Input
              id="denomination"
              type="number"
              step="0.01"
              value={collectorDenomination}
              onChange={(e) => setCollectorDenomination(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="1.00"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveCollectionSettings}
            disabled={isUpdatingCollection}
            className="bg-buttonActive hover:bg-buttonActive/90 text-white px-6 py-2"
          >
            {isUpdatingCollection ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : isEditCollection ? (
              "Save"
            ) : (
              "Edit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Export the component as both default and named export
export const AccountingDetails: React.FC<AccountingDetailsProps> = ({
  cabinet,
  loading,
  activeMetricsTabContent,
  setActiveMetricsTabContent,
}: AccountingDetailsProps) => {
  const [collectionHistory, setCollectionHistory] = useState<CollectionData[]>(
    []
  );
  const [activityLog, setActivityLog] = useState<Record<string, unknown>[]>([]);

  const [machine, setMachine] = useState<MachineDocument | null>(null);
  // Loading states for individual tabs
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  // Error states for individual tabs
  const [collectionHistoryError, setCollectionHistoryError] = useState<
    string | null
  >(null);
  const [activityLogError, setActivityLogError] = useState<string | null>(null);

  // Separate date filter states for Activity Log and Bill Validator
  const [activityLogDateRange, setActivityLogDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [activityLogTimePeriod, setActivityLogTimePeriod] = useState<TimePeriod>("7d");
  const [billValidatorDateRange, setBillValidatorDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [billValidatorTimePeriod, setBillValidatorTimePeriod] = useState<TimePeriod>("7d");
  const [billValidatorTimeRange, setBillValidatorTimeRange] = useState<{ startTime: string; endTime: string } | undefined>();


  // Convert billMeters data to bills array format
  const convertBillMetersToBills = (billMeters: BillMetersData) => {
    const bills: Array<{
      denomination: number;
      quantity: number;
      timestamp: string;
      location: string;
      machineId: string;
    }> = [];
    
    const denominationMap: Array<{ key: keyof BillMetersData; value: number }> = [
      { key: 'dollar1', value: 1 },
      { key: 'dollar2', value: 2 },
      { key: 'dollar5', value: 5 },
      { key: 'dollar10', value: 10 },
      { key: 'dollar20', value: 20 },
      { key: 'dollar50', value: 50 },
      { key: 'dollar100', value: 100 },
      { key: 'dollar500', value: 500 },
      { key: 'dollar1000', value: 1000 },
      { key: 'dollar2000', value: 2000 },
      { key: 'dollar5000', value: 5000 },
    ];

    denominationMap.forEach(({ key, value }) => {
      const quantity = billMeters[key] || 0;
      if (quantity > 0) {
        bills.push({
          denomination: value,
          quantity: quantity,
          timestamp: machine?.lastActivity ? new Date(machine.lastActivity).toISOString() : new Date().toISOString(),
          location: cabinet?.locationName || "Unknown",
          machineId: cabinet?._id || "Unknown",
        });
      }
    });

    return bills;
  };

  // Debug logging for filter states
  console.warn("Activity Log Filters:", { activityLogDateRange, activityLogTimePeriod });
  console.warn("Bill Validator Filters:", { billValidatorDateRange, billValidatorTimePeriod, billValidatorTimeRange });
  console.warn("Machine billMeters data:", machine?.billMeters);
  console.warn("Converted bills data:", machine?.billMeters ? convertBillMetersToBills(machine.billMeters) : []);

  useEffect(() => {
    async function loadData() {
      try {
        // Use the shared cabinet data - no duplicate API calls needed
        if (cabinet) {
          // Set the machine data - the cabinet itself is the machine data
          setMachine(cabinet as MachineDocument);

          // Extract collection history directly from cabinet data
          if (
            cabinet.collectionMetersHistory &&
            Array.isArray(cabinet.collectionMetersHistory)
          ) {
            // Collection history should show ALL historical data, not filtered by current time periods
            const collectionHistoryData = cabinet.collectionMetersHistory;

            // Transform the data to match the expected format
            const transformedHistory = collectionHistoryData.map(
              (entry: Record<string, unknown>) => {
                const id = entry._id;
                const timestamp = entry.timestamp;

                // Handle MongoDB ObjectId format: { $oid: "STRING" }
                let entryId: string;
                if (id && typeof id === "object" && "$oid" in id) {
                  entryId = (id as { $oid: string }).$oid;
                } else {
                  entryId = String(id || "");
                }

                let entryTimestamp: string | Date;
                if (
                  timestamp &&
                  typeof timestamp === "object" &&
                  "$date" in timestamp
                ) {
                  entryTimestamp = (timestamp as { $date: string }).$date;
                } else {
                  entryTimestamp = timestamp as string | Date;
                }

                return {
                  _id: entryId,
                  timestamp: entryTimestamp,
                  metersIn: (entry.metersIn as number) || 0,
                  metersOut: (entry.metersOut as number) || 0,
                  prevIn: (entry.prevMetersIn as number) || 0,
                  prevOut: (entry.prevMetersOut as number) || 0,
                  locationReportId: (entry.locationReportId as string) || "",
                };
              }
            );

            setCollectionHistory(transformedHistory);
            setCollectionHistoryError(null);
          } else {
            setCollectionHistory([]);
            setCollectionHistoryError(null);
          }

          // Only fetch activity log data when Activity Log tab is active
          if (activeMetricsTabContent === "Activity Log") {
            setActivityLogLoading(true);
            setActivityLogError(null);
            try {
              // Build query parameters for date filtering
              const params = new URLSearchParams();
              params.append("id", cabinet._id);
              
              // Add date range parameters if custom date range is selected
              if (activityLogTimePeriod === "Custom" && activityLogDateRange) {
                params.append("startDate", activityLogDateRange.from.toISOString());
                params.append("endDate", activityLogDateRange.to.toISOString());
              } else if (activityLogTimePeriod && activityLogTimePeriod !== "All Time") {
                // Add time period parameter for predefined periods
                params.append("timePeriod", activityLogTimePeriod);
              }
              
              const eventsRes = await axios.get(
                `/api/machines/by-id/events?${params.toString()}`
              );
              const eventsData = eventsRes.data;
              setActivityLog(eventsData.events || []);
              setActivityLogError(null);
            } catch (error) {
              console.error("Failed to fetch machine events:", error);
              setActivityLog([]);
              setActivityLogError(
                error instanceof Error
                  ? error.message
                  : "Failed to fetch activity log"
              );
            } finally {
              setActivityLogLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setActivityLog([]);
        setMachine(null);
        setCollectionHistoryError("Failed to load collection history");
        setActivityLogError("Failed to load activity log");
      }
    }
    loadData();
  }, [cabinet, activeMetricsTabContent, activityLogTimePeriod, activityLogDateRange]); // Depend on cabinet, activeMetricsTabContent, and filter states

  return (
    <motion.div
      className="mt-2 bg-container rounded-lg shadow-md shadow-purple-200 p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-xl font-semibold mb-4">Accounting Details</h2>

      <div className="flex flex-col md:flex-row mt-4">
        <motion.aside
          className="hidden lg:block w-48 flex-shrink-0 mb-4 lg:mb-0 lg:mr-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="bg-buttonActive text-container py-2 px-4 rounded-t-md md:rounded-md"
            variants={itemVariants}
          >
            <span>Meters</span>
          </motion.div>
          {[
            "Metrics",
            "Live Metrics",
            "Bill Validator",
            "Activity Log",
            "Collection History",
            "Collection Settings",
            "Configurations",
          ].map((menuItem, idx) => (
            <motion.button
              key={menuItem}
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className={`block w-full text-left py-2.5 px-4 text-sm ${
                activeMetricsTabContent ===
                (menuItem === "Metrics" ? "Range Metrics" : menuItem)
                  ? "text-buttonActive font-semibold bg-accent"
                  : "text-grayHighlight hover:bg-muted"
              } ${
                idx === 4
                  ? "md:rounded-b-md"
                  : "border-b md:border-b-0 border-border"
              }`}
              onClick={() =>
                setActiveMetricsTabContent(
                  menuItem === "Metrics" ? "Range Metrics" : menuItem
                )
              }
            >
              {menuItem}
            </motion.button>
          ))}
        </motion.aside>

        <div className="flex-grow w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key="meters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h3 className="font-medium mb-4 text-center md:text-left hidden md:block">
                {activeMetricsTabContent === "Range Metrics"
                  ? "Metrics"
                  : activeMetricsTabContent}
              </h3>
              <AnimatePresence mode="wait">
                {activeMetricsTabContent === "Range Metrics" ? (
                  loading ? (
                    <MetricsSkeleton />
                  ) : (
                    <motion.div
                      key="range-metrics"
                      className="flex flex-wrap gap-3 md:gap-4 max-w-full w-full"
                      style={{ rowGap: "1rem" }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Money In */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4 truncate">
                          Money In
                        </h4>
                        <div className="h-1 w-full bg-orangeHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold break-words truncate max-w-full">
                            {formatCurrency(
                              Number(
                                cabinet?.moneyIn ??
                                  cabinet?.sasMeters?.drop ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Total Cancelled Credits */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4 truncate">
                          Total Cancelled Credits
                        </h4>
                        <div className="h-1 w-full bg-blueHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold break-words truncate max-w-full">
                            {formatCurrency(
                              Number(
                                cabinet?.moneyOut ??
                                  cabinet?.sasMeters?.totalCancelledCredits ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Gross */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4 truncate">
                          Gross
                        </h4>
                        <div className="h-1 w-full bg-pinkHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold break-words truncate max-w-full">
                            {formatCurrency(
                              Number(
                                cabinet?.gross ??
                                  Number(cabinet?.moneyIn ?? 0) -
                                    Number(cabinet?.moneyOut ?? 0)
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Jackpot */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4 truncate">
                          Jackpot
                        </h4>
                        <div className="h-1 w-full bg-blueHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold break-words truncate max-w-full">
                            {formatCurrency(
                              Number(
                                cabinet?.jackpot ??
                                  cabinet?.sasMeters?.jackpot ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === "Live Metrics" ? (
                  loading ? (
                    <LiveMetricsSkeleton />
                  ) : (
                    <motion.div
                      key="live-metrics"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Coin In */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4">
                          Coin In
                        </h4>
                        <div className="h-1 w-full bg-greenHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {formatCurrency(
                              Number(
                                cabinet?.coinIn ??
                                  cabinet?.handle ??
                                  cabinet?.sasMeters?.coinIn ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Coin Out */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4">
                          Coin Out
                        </h4>
                        <div className="h-1 w-full bg-pinkHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {formatCurrency(
                              Number(
                                cabinet?.coinOut ??
                                  cabinet?.sasMeters?.coinOut ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Total Hand Paid Cancelled Credits */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4">
                          Total Hand Paid Cancelled Credits
                        </h4>
                        <div className="h-1 w-full bg-blueHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {formatCurrency(
                              Number(
                                cabinet?.sasMeters
                                  ?.totalHandPaidCancelledCredits ??
                                  cabinet?.meterData?.movement
                                    ?.totalHandPaidCancelledCredits ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Current Credits */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4">
                          Current Credits
                        </h4>
                        <div className="h-1 w-full bg-orangeHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {formatCurrency(
                              Number(
                                cabinet?.sasMeters?.currentCredits ??
                                  cabinet?.meterData?.movement
                                    ?.currentCredits ??
                                  0
                              )
                            )}
                          </p>
                        </div>
                      </motion.div>

                      {/* Games Played */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4">
                          Games Played
                        </h4>
                        <div className="h-1 w-full bg-orangeHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {cabinet?.gamesPlayed ??
                              cabinet?.sasMeters?.gamesPlayed ??
                              0}
                          </p>
                        </div>
                      </motion.div>

                      {/* Games Won */}
                      <motion.div
                        className="bg-container p-4 md:p-6 rounded-lg shadow"
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <h4 className="text-center text-xs md:text-sm mb-2 md:mb-4">
                          Games Won
                        </h4>
                        <div className="h-1 w-full bg-blueHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {cabinet?.gamesWon ??
                              cabinet?.sasMeters?.gamesWon ??
                              0}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === "Bill Validator" ? (
                  loading ? (
                    <BillValidatorSkeleton />
                  ) : (
                    <motion.div
                      key="bill-validator"
                      className="w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="w-full max-w-4xl mx-auto">
                        {/* Bill Validator Table with Filters */}
                        <BillValidatorTableWithFilters
                          bills={machine?.billMeters ? convertBillMetersToBills(machine.billMeters) : []}
                          onDateRangeChange={setBillValidatorDateRange}
                          onTimePeriodChange={setBillValidatorTimePeriod}
                          onTimeRangeChange={setBillValidatorTimeRange}
                          dateRange={billValidatorDateRange}
                          timePeriod={billValidatorTimePeriod}
                          timeRange={billValidatorTimeRange}
                          loading={loading}
                        />
                      </div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === "Activity Log" ? (
                  <motion.div
                    key="activity-log"
                    className="bg-container p-6 rounded-lg shadow w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Activity Log Date Filter - Always show */}
                    <div className="mb-6">
                      <ActivityLogDateFilter
                        onDateRangeChange={setActivityLogDateRange}
                        onTimePeriodChange={setActivityLogTimePeriod}
                        disabled={activityLogLoading}
                      />
                    </div>
                    
                    {/* Activity Log Content */}
                    {activityLogLoading ? (
                      <ActivityLogSkeleton />
                    ) : activityLogError ? (
                      <div className="h-48 flex flex-col items-center justify-center w-full">
                        <p className="text-red-500 text-center mb-2">
                          Failed to load activity log
                        </p>
                        <p className="text-grayHighlight text-center text-sm">
                          {activityLogError}
                        </p>
                      </div>
                    ) : activityLog.length > 0 ? (
                      <ActivityLogTable data={activityLog as MachineEvent[]} />
                    ) : (
                      <div className="h-48 flex items-center justify-center w-full">
                        <p className="text-grayHighlight text-center">
                          No activity log data found for this machine.
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : activeMetricsTabContent === "Collection History" ? (
                  loading ? (
                    <CollectionHistorySkeleton />
                  ) : collectionHistoryError ? (
                    <motion.div
                      key="collection-history-error"
                      className="bg-container p-6 rounded-lg shadow h-48 flex flex-col items-center justify-center w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="text-red-500 text-center mb-2">
                        Failed to load collection history
                      </p>
                      <p className="text-grayHighlight text-center text-sm">
                        {collectionHistoryError}
                      </p>
                    </motion.div>
                  ) : collectionHistory.length > 0 ? (
                    <motion.div
                      key="collection-history"
                      className="bg-container p-6 rounded-lg shadow w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <CollectionHistoryTable data={collectionHistory} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="collection-history-empty"
                      className="bg-container p-6 rounded-lg shadow h-48 flex items-center justify-center w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="text-grayHighlight text-center">
                        No collection history data found for this machine.
                      </p>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === "Collection Settings" ? (
                  <motion.div
                    key="collection-settings"
                    className="w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <CollectionSettingsContent cabinet={cabinet} />
                  </motion.div>
                ) : activeMetricsTabContent === "Configurations" ? (
                  loading ? (
                    <ConfigurationsSkeleton />
                  ) : (
                    <motion.div
                      key="configurations"
                      className="flex flex-col items-center sm:flex-row sm:justify-start sm:items-stretch flex-wrap gap-4 w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Accounting Denomination */}
                      {machine?.gameConfig?.accountingDenomination !==
                        undefined && (
                        <div className="flex flex-col w-64 max-w-full rounded-lg shadow overflow-hidden">
                          <div className="bg-blue-500 p-3 flex items-center justify-center">
                            <span className="text-white font-semibold text-base text-center w-full">
                              Accounting Denomination
                            </span>
                          </div>
                          <div className="bg-white p-4 flex items-center justify-center">
                            <span className="text-gray-800 text-base font-medium">
                              $
                              {machine.gameConfig.accountingDenomination?.toFixed(
                                2
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Theoretical RTP */}
                      {machine?.gameConfig?.accountingDenomination !==
                        undefined &&
                        machine?.gameConfig?.theoreticalRtp !== undefined && (
                          <div className="flex flex-col w-64 max-w-full rounded-lg shadow overflow-hidden">
                            <div className="bg-green-400 p-3 flex items-center justify-center">
                              <span className="text-white font-semibold text-base text-center w-full">
                                Theoretical RTP
                              </span>
                            </div>
                            <div className="bg-white p-4 flex items-center justify-center">
                              <span className="text-gray-800 text-base font-medium">
                                {machine.gameConfig.theoreticalRtp}%
                              </span>
                            </div>
                          </div>
                        )}
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key={activeMetricsTabContent}
                    className="bg-container p-6 rounded-lg shadow h-48 flex items-center justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-grayHighlight">
                      No content available for {activeMetricsTabContent}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AccountingDetails;
