"use client";

import { useState, useEffect } from "react";
import axios from "axios";
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

        const response = await axios.get(`/api/metrics/top-machines?${params}`);
        const result = response.data;
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

  // Mobile Card Component
  const MachineCard = ({ machine, index }: { machine: TopMachine; index: number }) => {
    const holdPercentage = machine.handle && machine.handle > 0 
      ? ((machine.winLoss || 0) / machine.handle) * 100 
      : 0;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">#{index + 1}</span>
              <span className="truncate">{machine.game || "Unknown Game"}</span>
            </span>
            <span className="text-sm text-gray-500">#{machine.machineId || "N/A"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Location:</span>
              <span className="ml-2 font-medium">{machine.locationName}</span>
            </div>
            <div>
              <span className="text-gray-500">Manufacturer:</span>
              <span className="ml-2 font-medium">{machine.manufacturer || "N/A"}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Handle:</span>
              <span className="font-medium text-blue-600">{formatCurrency(machine.handle || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Win/Loss:</span>
              <span className={`font-medium ${(machine.winLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(machine.winLoss || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jackpot:</span>
              <span className="font-medium text-purple-600">{formatCurrency(machine.jackpot || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg. Wager:</span>
              <span className="font-medium">{formatCurrency(machine.avgWagerPerGame || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hold %:</span>
              <span className="font-medium">{formatPercentage(holdPercentage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Games Played:</span>
              <span className="font-medium">{formatNumber(machine.gamesPlayed || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
            <div className="text-sm font-medium">No machines found</div>
            <div className="text-xs">No machine data available for the selected criteria</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top {limit} Machines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {machines.map((machine, index) => (
            <MachineCard key={`${machine.locationId ?? machine.location}-${machine.machineId ?? machine.id}`} machine={machine} index={index} />
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine ID
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Game
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturer
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handle
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win/Loss
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jackpot
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Wag.
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hold %
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Games
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {machines.map((machine) => {
                const holdPercentage = machine.handle && machine.handle > 0 
                  ? ((machine.winLoss || 0) / machine.handle) * 100 
                  : 0;

                return (
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(holdPercentage)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(machine.gamesPlayed ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
