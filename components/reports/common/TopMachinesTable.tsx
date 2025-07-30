"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { TopMachinesTableProps, TopMachine } from "@/lib/types/components";

export default function TopMachinesTable({
  timePeriod,
  locationIds,
  licencee,
  limit = 5,
  className = "",
}: TopMachinesTableProps) {
  const [machines, setMachines] = useState<TopMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          timePeriod,
          limit: limit.toString(),
          ...(licencee && { licencee }),
          ...(locationIds &&
            locationIds.length > 0 && { locationIds: locationIds.join(",") }),
        });

        const response = await fetch(`/api/metrics/top-machines?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch top machines data");
        }

        const result = await response.json();
        setMachines(result.data || []);
      } catch (err) {
        console.error("Error fetching top machines data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod, locationIds, licencee, limit]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top {limit} Machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top {limit} Machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <div className="text-sm font-medium">Error loading data</div>
            <div className="text-xs">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (machines.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top {limit} Machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <div className="text-sm font-medium">No data available</div>
            <div className="text-xs">
              No machine data for the selected time period
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Machine Card component for mobile view
  const MachineCard = ({
    machine,
    index,
  }: {
    machine: TopMachine;
    index: number;
  }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header with rank */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              index === 0
                ? "bg-yellow-500"
                : index === 1
                ? "bg-gray-400"
                : index === 2
                ? "bg-amber-600"
                : "bg-gray-300"
            }`}
          >
            {index + 1}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {machine.game}
            </h3>
            <p className="text-xs text-gray-500">{machine.locationName}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Machine ID</div>
          <div className="text-sm font-medium text-gray-900">
            {machine.machineId}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Handle</p>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(machine.handle ?? 0)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Win/Loss</p>
          <p
            className={`text-sm font-medium ${
              (machine.winLoss ?? 0) >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(machine.winLoss ?? 0)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Jackpot</p>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(machine.jackpot ?? 0)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Hold %</p>
          <p className="text-sm font-medium text-gray-900">
            {formatPercentage(machine.actualHold ?? 0)}
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Manufacturer: {machine.manufacturer ?? "N/A"}</span>
          <span>Avg Wag: {formatCurrency(machine.avgWagerPerGame ?? 0)}</span>
          <span>Games: {formatNumber(machine.gamesPlayed)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top {limit} Machines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Game
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturer
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handle
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win/Loss
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jackpot
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Wag.
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hold %
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Games
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {machines.map((machine, index) => (
                <tr
                  key={`${machine.locationId ?? machine.location}-${
                    machine.machineId ?? machine.id
                  }`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {machine.locationName}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {machine.machineId ?? "N/A"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {machine.game ?? "N/A"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {machine.manufacturer ?? "N/A"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(machine.handle ?? 0)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        (machine.winLoss ?? 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(machine.winLoss ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(machine.jackpot ?? 0)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(machine.avgWagerPerGame ?? 0)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        (machine.actualHold ?? 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatPercentage(machine.actualHold ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(machine.gamesPlayed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {machines.map((machine, index) => (
            <MachineCard
              key={`${machine.locationId ?? machine.location}-${
                machine.machineId ?? machine.id
              }`}
              machine={machine}
              index={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
