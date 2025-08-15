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
import CollectionHistorySkeleton from "./CollectionHistorySkeleton";
import ActivityLogSkeleton from "./ActivityLogSkeleton";
import { CollectionHistoryTable } from "./CollectionHistoryTable";
import { ActivityLogTable } from "./ActivityLogTable";
import type { CollectionMetersHistoryEntry } from "@/lib/types/machines";
import type { MachineEvent } from "@/lib/types/api";
import type { BillValidatorData } from "@/lib/types/machines";
import type { MachineDocument } from "@/shared/types";

// Export the component as both default and named export
export const AccountingDetails: React.FC<AccountingDetailsProps> = ({
  cabinet,
  loading,
  activeMetricsTabContent,
  setActiveMetricsTabContent,
  activeMetricsFilter,
}: AccountingDetailsProps) => {
  const [collectionHistory, setCollectionHistory] = useState<
    CollectionMetersHistoryEntry[]
  >([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [machine, setMachine] = useState<MachineDocument | null>(null);

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        // Use the shared cabinet data - no duplicate API calls needed
        if (cabinet) {
          // Extract collection history from the cabinet prop
          const collectionHistory =
            (cabinet as any).collectionMetersHistory || [];
          setCollectionHistory(collectionHistory);

          // Set the machine data - the cabinet itself is the machine data
          setMachine(cabinet as any);

          // Fetch activity log data with date filtering
          const eventsParams = new URLSearchParams();
          if (activeMetricsFilter && activeMetricsFilter !== "All Time") {
            eventsParams.append("timePeriod", activeMetricsFilter);
          }

          const eventsRes = await axios.get(
            `/api/machines/${cabinet._id}/events?${eventsParams.toString()}`
          );
          const eventsData = eventsRes.data;
          setActivityLog(eventsData.events || []);
        }
      } catch {
        setCollectionHistory([]);
        setActivityLog([]);
        setMachine(null);
      } finally {
        setDataLoading(false);
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
                idx === 5
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-orangeHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blueHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-pinkHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blueHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
                    </motion.div>
                  </motion.div>
                ) : activeMetricsTabContent === "Live Metrics" ? (
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-greenHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-pinkHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blueHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-orangeHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
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
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-orangeHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {cabinet?.sasMeters?.gamesPlayed ??
                              cabinet?.meterData?.movement?.gamesPlayed ??
                              0}
                          </p>
                        </div>
                      )}
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
                      {loading ? (
                        <div className="flex justify-center items-center h-6">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blueHighlight border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base md:text-xl font-bold">
                            {cabinet?.sasMeters?.gamesWon ??
                              cabinet?.meterData?.movement?.gamesWon ??
                              0}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                ) : activeMetricsTabContent === "Bill Validator" ? (
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
                            ? machine.billValidator.notes.map((note: any) => ({
                                denomination: note.denomination,
                                quantity: note.quantity,
                                subtotal: note.denomination * note.quantity,
                              })) || []
                            : []
                        }
                      />
                    </div>
                  </motion.div>
                ) : activeMetricsTabContent === "Activity Log" ? (
                  <motion.div
                    key="activity-log"
                    className="bg-container p-6 rounded-lg shadow w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    {loading ? (
                      <ActivityLogSkeleton />
                    ) : (
                      <ActivityLogTable data={activityLog} />
                    )}
                  </motion.div>
                ) : activeMetricsTabContent === "Collection History" ? (
                  <motion.div
                    key="collection-history"
                    className="bg-container p-6 rounded-lg shadow flex items-center justify-center w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    {loading ? (
                      <CollectionHistorySkeleton />
                    ) : (
                      <CollectionHistoryTable data={collectionHistory} />
                    )}
                  </motion.div>
                ) : activeMetricsTabContent === "Configurations" ? (
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
