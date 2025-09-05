import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import axios from "axios";
import { AccountingDetailsProps } from "@/lib/types/cabinetDetails";
import {
  containerVariants,
  itemVariants,
} from "@/lib/constants/animationVariants";
import { BillValidatorTable } from "./BillValidatorTable";
import ActivityLogSkeleton from "./ActivityLogSkeleton";
import { ActivityLogTable } from "./ActivityLogTable";
import { CollectionHistoryTable } from "./CollectionHistoryTable";
import CollectionHistorySkeleton from "./CollectionHistorySkeleton";
import type { MachineEvent } from "./ActivityLogTable";

import type { MachineDocument } from "@/shared/types";

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

// Export the component as both default and named export
export const AccountingDetails: React.FC<AccountingDetailsProps> = ({
  cabinet,
  loading,
  activeMetricsTabContent,
  setActiveMetricsTabContent,
  activeMetricsFilter,
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

          // Fetch activity log data - no time filtering, show all events
          setActivityLogLoading(true);
          setActivityLogError(null);
          try {
            const eventsRes = await axios.get(
              `/api/machines/by-id/events?id=${cabinet._id}`
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
      } catch (error) {
        console.error("Error loading data:", error);
        setActivityLog([]);
        setMachine(null);
        setCollectionHistoryError("Failed to load collection history");
        setActivityLogError("Failed to load activity log");
      }
    }
    loadData();
  }, [cabinet, activeMetricsFilter]); // Depend on cabinet and activeMetricsFilter

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
                      {/* Handle (Money In) */}
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
                          Handle
                        </h4>
                        <div className="h-1 w-full bg-orangeHighlight mb-4 md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold break-words truncate max-w-full">
                            {formatCurrency(
                              Number(
                                cabinet?.sasMeters?.drop ??
                                  cabinet?.meterData?.movement?.drop ??
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
                                cabinet?.sasMeters?.totalCancelledCredits ??
                                  cabinet?.meterData?.movement
                                    ?.totalCancelledCredits ??
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
                          {(() => {
                            const drop = Number(cabinet?.sasMeters?.drop ?? 0);
                            const tcc = Number(
                              cabinet?.sasMeters?.totalCancelledCredits ?? 0
                            );
                            const grossValue = drop - tcc;
                            return (
                              <p className="text-center text-base md:text-xl font-bold break-words truncate max-w-full">
                                {formatCurrency(Number(grossValue))}
                              </p>
                            );
                          })()}
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
                                cabinet?.sasMeters?.jackpot ??
                                  cabinet?.meterData?.movement?.jackpot ??
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
                                cabinet?.sasMeters?.coinIn ??
                                  cabinet?.meterData?.movement?.coinIn ??
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
                                cabinet?.sasMeters?.coinOut ??
                                  cabinet?.meterData?.movement?.coinOut ??
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
                            {cabinet?.sasMeters?.gamesPlayed ??
                              cabinet?.meterData?.movement?.gamesPlayed ??
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
                            {cabinet?.sasMeters?.gamesWon ??
                              cabinet?.meterData?.movement?.gamesWon ??
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
                      <div className="w-full max-w-xl mx-auto">
                        {/* Current Balance */}
                        <div className="mb-4 text-center">
                          <p className="text-lg font-semibold">
                            Current Balance:{" "}
                            {formatCurrency(
                              Number(machine?.billValidator?.balance || 0)
                            )}
                          </p>
                        </div>

                        {/* Bill Validator Table */}
                        <BillValidatorTable
                          bills={
                            machine &&
                            machine.billValidator &&
                            typeof machine.billValidator === "object" &&
                            "notes" in machine.billValidator &&
                            Array.isArray(machine.billValidator.notes)
                              ? machine.billValidator.notes.map(
                                  (note: Record<string, unknown>) => ({
                                    denomination: note.denomination as number,
                                    quantity: note.quantity as number,
                                    subtotal:
                                      (note.denomination as number) *
                                      (note.quantity as number),
                                  })
                                ) || []
                              : []
                          }
                        />
                      </div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === "Activity Log" ? (
                  activityLogLoading ? (
                    <ActivityLogSkeleton />
                  ) : activityLogError ? (
                    <motion.div
                      key="activity-log-error"
                      className="bg-container p-6 rounded-lg shadow h-48 flex flex-col items-center justify-center w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="text-red-500 text-center mb-2">
                        Failed to load activity log
                      </p>
                      <p className="text-grayHighlight text-center text-sm">
                        {activityLogError}
                      </p>
                    </motion.div>
                  ) : activityLog.length > 0 ? (
                    <motion.div
                      key="activity-log"
                      className="bg-container p-6 rounded-lg shadow w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ActivityLogTable data={activityLog as MachineEvent[]} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="activity-log-empty"
                      className="bg-container p-6 rounded-lg shadow h-48 flex items-center justify-center w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="text-grayHighlight text-center">
                        No activity log data found for this machine.
                      </p>
                    </motion.div>
                  )
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
