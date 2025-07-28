"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import type { MachineDropData } from "@/lib/types/reports";

type MachineDropTableProps = {
  data: MachineDropData[];
};

export default function MachineDropTable({ data }: MachineDropTableProps) {
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
          <DollarSign className="h-5 w-5 text-green-500" />
          Machine Drop Details
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
                  Bill Denominations
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((machine) => (
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
                    <div className="space-y-2">
                      {machine.bills.map((bill, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <span className="text-gray-600">
                            {bill.denomination}:
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {bill.count.toLocaleString()} bills
                            </span>
                            <span className="font-medium">{bill.total}</span>
                          </div>
                        </div>
                      ))}
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
                      Bill Denominations
                    </h4>
                    <div className="space-y-2">
                      {machine.bills.map((bill, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-600">
                            {bill.denomination}:
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-500">
                              {bill.count.toLocaleString()} bills
                            </span>
                            <span className="font-medium">{bill.total}</span>
                          </div>
                        </div>
                      ))}
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
