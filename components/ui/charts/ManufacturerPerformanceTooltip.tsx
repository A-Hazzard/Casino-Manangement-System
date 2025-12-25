/**
 * Manufacturer Performance Tooltip Component
 *
 * Custom tooltip for the manufacturer performance chart showing percentage metrics
 */

'use client';

import { formatCurrency } from '@/lib/utils/formatting';
import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type RawTotals = {
  coinIn: number;
  netWin: number;
  drop: number;
  gross: number;
  cancelledCredits: number;
  gamesPlayed: number;
};

type TotalMetrics = {
  coinIn: number;
  netWin: number;
  drop: number;
  gross: number;
  cancelledCredits: number;
  gamesPlayed: number;
};

type ManufacturerPerformanceTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    payload?: {
      fullManufacturerName?: string;
      rawTotals?: RawTotals;
      totalMetrics?: TotalMetrics;
      machineCount?: number;
      totalMachinesCount?: number;
    };
  }>;
  label?: string;
  coordinate?: { x?: number; y?: number };
  chartContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Helper to get raw value for a metric
 */
function getRawValue(dataKey: string, rawTotals?: RawTotals): number | null {
  if (!rawTotals) return null;

  const keyMap: Record<string, keyof RawTotals> = {
    'Floor Positions %': 'coinIn', // Not applicable, but we'll use coinIn as placeholder
    'Total Handle %': 'coinIn',
    'Total Win %': 'netWin',
    'Total Drop %': 'drop',
    'Total Canc. Cr. %': 'cancelledCredits',
    'Total Gross %': 'gross',
    'Total Games Played %': 'gamesPlayed',
  };

  const rawKey = keyMap[dataKey];
  return rawKey ? rawTotals[rawKey] : null;
}

/**
 * Helper to get total value for a metric
 */
function getTotalValue(
  dataKey: string,
  totalMetrics?: TotalMetrics
): number | null {
  if (!totalMetrics) return null;

  const keyMap: Record<string, keyof TotalMetrics> = {
    'Floor Positions %': 'coinIn', // Not applicable, but we'll use coinIn as placeholder
    'Total Handle %': 'coinIn',
    'Total Win %': 'netWin',
    'Total Drop %': 'drop',
    'Total Canc. Cr. %': 'cancelledCredits',
    'Total Gross %': 'gross',
    'Total Games Played %': 'gamesPlayed',
  };

  const totalKey = keyMap[dataKey];
  return totalKey ? totalMetrics[totalKey] : null;
}

export default function ManufacturerPerformanceTooltip({
  active,
  payload,
  label,
  coordinate,
  chartContainerRef,
}: ManufacturerPerformanceTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (active && coordinate && chartContainerRef?.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      // Scroll handling: getBoundingClientRect + window.scrollY/X gives absolute document position
      // But for fixed position portal, we just need ClientRect (viewport relative)
      
      const left = rect.left + (coordinate.x || 0);
      const top = rect.top + (coordinate.y || 0);

      setPosition({ left, top });
    }
  }, [active, coordinate, chartContainerRef]);

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Get full manufacturer name and verification data from payload
  const fullManufacturerName =
    payload[0]?.payload?.fullManufacturerName || label;
  const rawTotals = payload[0]?.payload?.rawTotals;
  const totalMetrics = payload[0]?.payload?.totalMetrics;
  const machineCount = payload[0]?.payload?.machineCount;

  // Render via Portal to escape overflow:hidden containers
  // Using fixed position relative to the viewport
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
      <div className="mb-2 font-semibold text-gray-900">
        {fullManufacturerName}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const rawValue = getRawValue(entry.dataKey, rawTotals);
          const totalValue = getTotalValue(entry.dataKey, totalMetrics);

          // For Floor Positions %, show machine count instead
          if (entry.dataKey === 'Floor Positions %') {
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
                  {machineCount !== undefined && (
                    <div className="text-xs text-gray-600">
                      Machines: {machineCount}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // For Total Games Played %, show count instead of currency
          if (entry.dataKey === 'Total Games Played %') {
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
                      {rawValue.toLocaleString()} /{' '}
                      {totalValue.toLocaleString()} games
                    </div>
                  )}
                </div>
              </div>
            );
          }

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

  // Check if we can use createPortal (client-side only)
  if (typeof document === 'undefined') return null;

  return createPortal(content, document.body);
}
