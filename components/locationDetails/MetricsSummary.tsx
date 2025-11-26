/**
 * Metrics Summary Component
 * Summary component displaying location information and aggregated metrics.
 *
 * Features:
 * - Location information display (name, address, licensee)
 * - Aggregated metrics (Total Cabinets, Money In, Money Out, Gross, Net)
 * - Currency formatting
 * - Responsive grid layout
 *
 * @param location - Location information object
 * @param cabinets - Array of cabinet details for aggregation
 */
import React from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  getMoneyInColorClass,
  getMoneyOutColorClass,
  getGrossColorClass,
} from '@/lib/utils/financialColors';
import type { LocationInfo, ExtendedCabinetDetail } from '@/lib/types/pages';

type ExtendedMetricsSummaryProps = {
  location: LocationInfo | null;
  cabinets: ExtendedCabinetDetail[];
};

const MetricsSummary: React.FC<ExtendedMetricsSummaryProps> = ({
  location,
  cabinets,
}) => {
  if (!location) return null;
  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow-sm md:p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Location Information</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Name:</span> {location.name}
            </p>
            <p>
              <span className="font-medium">Address:</span>{' '}
              {location.address || 'N/A'}
            </p>
            <p>
              <span className="font-medium">Licensee:</span>{' '}
              {location.contactName || 'N/A'}
            </p>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">Metrics</h2>
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Total Cabinets</p>
              <p className="text-lg font-semibold">{cabinets?.length || 0}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Money In</p>
              <p className={`text-lg font-semibold ${getMoneyInColorClass(location.moneyIn)}`}>
                {formatCurrency(location.moneyIn || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Money Out</p>
              <p className={`text-lg font-semibold ${getMoneyOutColorClass(location.moneyOut, location.moneyIn)}`}>
                {formatCurrency(location.moneyOut || 0)}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">Performance</h2>
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Gross</p>
              <p className={`text-lg font-semibold ${getGrossColorClass(location.gross)}`}>
                {formatCurrency(location.gross || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Net</p>
              <p className="text-lg font-semibold">
                {formatCurrency(location.net || 0)}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">Cabinet Status</h2>
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Online Cabinets</p>
              <p className="text-lg font-semibold">
                {cabinets?.filter(cabinet => cabinet.isOnline).length || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Offline Cabinets</p>
              <p className="text-lg font-semibold">
                {cabinets?.filter(cabinet => !cabinet.isOnline).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsSummary;
