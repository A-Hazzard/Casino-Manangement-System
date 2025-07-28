"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Monitor } from "lucide-react";
import type { MachinePerformance } from "@/lib/types/reports";

type MachinePerformanceTableProps = {
  data: MachinePerformance[];
};

export default function MachinePerformanceTable({
  data,
}: MachinePerformanceTableProps) {
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(
    new Set()
  );

  const toggleMachine = (machineId: string) => {
    const newExpanded = new Set(expandedMachines);
    if (newExpanded.has(machineId)) {
      newExpanded.delete(machineId);
    } else {
      newExpanded.add(machineId);
    }
    setExpandedMachines(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-blue-500" />
          Individual Machine Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Machine ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Hold Comparison
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Jackpot
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Net Win/Revenue
                </th>
              </tr>
              <tr className="border-b border-gray-200">
                <th></th>
                <th className="text-left py-2 px-4 text-xs text-gray-500">
                  Theoretical | Actual | Variance
                </th>
                <th className="text-left py-2 px-4 text-xs text-gray-500">
                  Metered | Actual | Variance
                </th>
                <th className="text-left py-2 px-4 text-xs text-gray-500">
                  Value | Range
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((machine, index) => (
                <tr
                  key={machine.machineId}
                  className="border-b border-gray-100"
                >
                  <td className="py-3 px-4 text-sm">
                    <span className="text-green-600 font-medium">
                      {machine.machineId}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Theoretical:</span>
                        <span className="font-medium">
                          {machine.holdComparison.theoretical}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual:</span>
                        <span className="font-medium">
                          {machine.holdComparison.actual}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Variance:</span>
                        <span
                          className={`font-medium ${
                            machine.holdComparison.variance.startsWith("-")
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {machine.holdComparison.variance}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Metered:</span>
                        <span className="font-medium">
                          {machine.jackpot.metered}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual:</span>
                        <span className="font-medium">
                          {machine.jackpot.actual}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Variance:</span>
                        <span
                          className={`font-medium ${
                            machine.jackpot.variance.startsWith("-")
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {machine.jackpot.variance}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {machine.netWinRevenue.value}
                      </div>
                      <div className="text-xs text-gray-500">
                        {machine.netWinRevenue.range}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden space-y-4">
          {data.map((machine) => (
            <div
              key={machine.machineId}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-600 font-medium text-sm">
                  {machine.machineId}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMachine(machine.machineId)}
                >
                  {expandedMachines.has(machine.machineId) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {expandedMachines.has(machine.machineId) && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Hold Comparison
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Theoretical:</span>
                        <span className="font-medium">
                          {machine.holdComparison.theoretical}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual:</span>
                        <span className="font-medium">
                          {machine.holdComparison.actual}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Variance:</span>
                        <span
                          className={`font-medium ${
                            machine.holdComparison.variance.startsWith("-")
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {machine.holdComparison.variance}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Jackpot
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Metered:</span>
                        <span className="font-medium">
                          {machine.jackpot.metered}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual:</span>
                        <span className="font-medium">
                          {machine.jackpot.actual}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Variance:</span>
                        <span
                          className={`font-medium ${
                            machine.jackpot.variance.startsWith("-")
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {machine.jackpot.variance}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Net Win/Revenue
                    </h4>
                    <div className="text-sm">
                      <div className="font-medium">
                        {machine.netWinRevenue.value}
                      </div>
                      <div className="text-xs text-gray-500">
                        {machine.netWinRevenue.range}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
