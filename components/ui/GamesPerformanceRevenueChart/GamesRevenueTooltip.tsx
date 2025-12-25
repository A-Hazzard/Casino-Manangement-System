/**
 * Games Revenue Chart Tooltip Component
 *
 * Custom tooltip for the games performance revenue chart
 */

'use client';

import { formatCurrency } from '@/lib/utils/formatting';
import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GamesPerformanceData } from '../GamesPerformanceRevenueChart';

type GamesRevenueTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    payload?: {
      fullGameName?: string;
      rawTotals?: GamesPerformanceData['rawTotals'];
      totalMetrics?: GamesPerformanceData['totalMetrics'];
      machineCount?: number;
      totalMachinesCount?: number;
    };
  }>;
  label?: string;
  coordinate?: { x?: number; y?: number };
  chartContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Games Revenue Chart Tooltip Component
 */
export function GamesRevenueTooltip({
  active,
  payload,
  label,
  coordinate,
  chartContainerRef,
}: GamesRevenueTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (active && coordinate && chartContainerRef?.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      
      const left = rect.left + (coordinate.x || 0);
      const top = rect.top + (coordinate.y || 0);

      setPosition({ left, top });
    }
  }, [active, coordinate, chartContainerRef]);

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Get full game name and verification data from payload
  const fullGameName = payload[0]?.payload?.fullGameName || label;
  const rawTotals = payload[0]?.payload?.rawTotals;
  const totalMetrics = payload[0]?.payload?.totalMetrics;
  const machineCount = payload[0]?.payload?.machineCount;

  // Helper to get raw value for a metric
  const getRawValue = (dataKey: string): number | null => {
    if (!rawTotals) return null;

    const keyMap: Record<string, keyof typeof rawTotals> = {
      'Total Drop %': 'drop',
      'Total Canc. Cr. %': 'cancelledCredits',
      'Total Gross %': 'gross',
    };

    const rawKey = keyMap[dataKey];
    return rawKey ? rawTotals[rawKey] : null;
  };

  // Helper to get total value for a metric
  const getTotalValue = (dataKey: string): number | null => {
    if (!totalMetrics) return null;

    const keyMap: Record<string, keyof typeof totalMetrics> = {
      'Total Drop %': 'drop',
      'Total Canc. Cr. %': 'cancelledCredits',
      'Total Gross %': 'gross',
    };

    const totalKey = keyMap[dataKey];
    return totalKey ? totalMetrics[totalKey] : null;
  };

  // Render via Portal to escape overflow:hidden containers
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: position ? `${position.left}px` : '-9999px',
    top: position ? `${position.top}px` : '-9999px',
    transform: 'translate(-50%, calc(-100% - 10px))', // Move up and center
    zIndex: 99999,
    pointerEvents: 'none',
    maxWidth: 'none',
    width: 'auto',
    opacity: position ? 1 : 0,
    transition: 'top 0.1s ease, left 0.1s ease',
  };

  const content = (
    <div
      className="rounded-lg border bg-white p-3 shadow-lg"
      style={tooltipStyle}
    >
      <div className="mb-2 font-semibold text-gray-900">{fullGameName}</div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const rawValue = getRawValue(entry.dataKey);
          const totalValue = getTotalValue(entry.dataKey);

          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {entry.dataKey}: {entry.value.toFixed(2)}%
                </div>
                {rawValue !== null && totalValue !== null && (
                  <div className="text-xs text-gray-600">
                    {formatCurrency(rawValue)} / {formatCurrency(totalValue)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {machineCount !== undefined && (
        <div className="mt-2 border-t pt-2 text-xs text-gray-500">
          Machines: {machineCount}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(content, document.body);
}
