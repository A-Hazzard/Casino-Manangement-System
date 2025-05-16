import React from "react";
import { formatCurrency } from "@/lib/utils";
import type {
  CabinetDetail,
  // CabinetPerformanceMetrics, // This import is unused and should be removed
} from "@/lib/types/cabinets";

type LocationInfo = {
  _id: string;
  name: string;
  address?: string;
  contactName?: string;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  net?: number;
};

type ExtendedCabinetDetail = CabinetDetail & {
  isOnline?: boolean;
};

type MetricsSummaryProps = {
  location: LocationInfo | null;
  cabinets: ExtendedCabinetDetail[];
};

const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  location,
  cabinets,
}) => {
  if (!location) return null;
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-4">Location Information</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Name:</span> {location.name}
            </p>
            <p>
              <span className="font-medium">Address:</span>{" "}
              {location.address || "N/A"}
            </p>
            <p>
              <span className="font-medium">Licensee:</span>{" "}
              {location.contactName || "N/A"}
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Metrics</h2>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Total Cabinets</p>
              <p className="text-lg font-semibold">{cabinets?.length || 0}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Money In</p>
              <p className="text-lg font-semibold">
                {formatCurrency(location.moneyIn || 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Money Out</p>
              <p className="text-lg font-semibold">
                {formatCurrency(location.moneyOut || 0)}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Performance</h2>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Gross</p>
              <p className="text-lg font-semibold">
                {formatCurrency(location.gross || 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Net</p>
              <p className="text-lg font-semibold">
                {formatCurrency(location.net || 0)}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Cabinet Status</h2>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Online Cabinets</p>
              <p className="text-lg font-semibold">
                {cabinets?.filter((cabinet) => cabinet.isOnline).length || 0}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Offline Cabinets</p>
              <p className="text-lg font-semibold">
                {cabinets?.filter((cabinet) => !cabinet.isOnline).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsSummary;
