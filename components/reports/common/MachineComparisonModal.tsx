"use client";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GamingMachine } from "@/lib/types/reports";
import ComparisonChart from "../charts/ComparisonChart";
import { formatCurrency, formatPercentage } from "@/lib/helpers/reports";

export default function MachineComparisonModal() {
  const { isMachineComparisonModalOpen, setIsMachineComparisonModalOpen } =
    useReportsStore();
  const { machineComparisons } = useAnalyticsDataStore();

  const chartData = machineComparisons.map((machine) => ({
    name: machine.gameTitle,
    totalHandle: machine.totalHandle,
    totalWin: machine.totalWin,
  }));

  const chartKeys = {
    name: "name",
    bars: [
      { key: "totalHandle", color: "#3b82f6" },
      { key: "totalWin", color: "#10b981" },
    ],
  };

  return (
    <Dialog
      open={isMachineComparisonModalOpen}
      onOpenChange={setIsMachineComparisonModalOpen}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Machine Comparison
          </DialogTitle>
          <DialogDescription>
            Detailed side-by-side comparison of selected machines.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {machineComparisons.length > 0 ? (
            <>
              <div className="w-full">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  Performance Metrics
                </h3>
                <ComparisonChart data={chartData} keys={chartKeys} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {machineComparisons.map((machine: GamingMachine) => (
                  <div
                    key={machine.id}
                    className="p-4 bg-gray-50 rounded-lg border"
                  >
                    <h4 className="font-bold text-gray-900 truncate">
                      {machine.gameTitle}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {machine.manufacturer}
                    </p>
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Hold %:</span>{" "}
                        <span className="font-semibold">
                          {formatPercentage(machine.actualHold)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Games Played:</span>{" "}
                        <span className="font-semibold">
                          {machine.gamesPlayed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Bet:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(
                            machine.avgBet || machine.averageWager || 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Jackpot:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(machine.jackpot || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No machines selected for comparison.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
