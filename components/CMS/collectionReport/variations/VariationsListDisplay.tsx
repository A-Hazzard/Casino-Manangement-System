/**
 * VariationsListDisplay Component
 *
 * A detailed data display component that renders a comparison between Meter Gross and SAS Gross for discrepant machines.
 *
 * Features:
 * - Dual layout: Responsive cards for mobile and dense table for desktop
 * - Batch total footer for aggregate reconciliation
 * - SAS time period visualization for meter comparison
 * - Smart formatting for currency and date/time values
 *
 * @param machines - List of machines with their meter vs SAS data comparison
 * @param onMachineClick - Optional callback for machine navigation
 * @param isCompact - Force mobile card layout regardless of screen size
 */
'use client';

import { format } from 'date-fns';
import type { MachineVariationData } from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';

interface VariationsListDisplayProps {
  machines: MachineVariationData[];
  onMachineClick?: (machineId: string) => void;
  isCompact?: boolean;
}

export function VariationsListDisplay({
  machines,
  onMachineClick,
  isCompact = false,
}: VariationsListDisplayProps) {
  // Filter to only machines with actual variations (not "No SAS Data")
  const variationMachines = machines.filter(m => typeof m.variation === 'number' && Math.abs(m.variation) > 0.1);

  if (variationMachines.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
        No machines with variations
      </div>
    );
  }

  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || typeof value === 'string') return String(value || '-');
    return typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : String(value);
  };

  const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return '-';
    try {
      return format(new Date(timeString), 'MMM dd, yyyy HH:mm');
    } catch {
      return timeString;
    }
  };

  const getVariationColor = (variation: number | string): string => {
    if (typeof variation === 'string') return 'text-gray-600';
    if (variation < 0) return 'text-red-600 font-bold';
    if (variation > 0) return 'text-green-600 font-bold';
    return 'text-gray-600';
  };

  // Mobile view - stacked cards (always visible on small screens, hidden on desktop if not compact)
  const renderCards = () => (
    <div className={`space-y-4 ${isCompact ? '' : 'md:hidden'}`}>
      {variationMachines.map((machine, index) => (
        <div
          key={`${machine.machineId}-${index}`}
          className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm"
          onClick={() => onMachineClick?.(machine.machineId)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Machine Entry
              </p>
              <h4 className="text-base font-black text-gray-900">{machine.machineName}</h4>
              <p className="text-[10px] font-mono text-gray-400">ID: {machine.machineId.substring(0, 8)}</p>
            </div>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
              typeof machine.variation === 'number' && machine.variation < 0 
              ? 'bg-red-500 text-white' 
              : 'bg-green-500 text-white'
            }`}>
              {formatNumber(machine.variation)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-amber-100 pt-4">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase text-gray-400">Meter Gross</p>
              <p className="text-sm font-black text-gray-900">${formatNumber(machine.meterGross)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase text-gray-400">SAS Gross</p>
              <p className="text-sm font-black text-gray-900">{typeof machine.sasGross === 'string' ? machine.sasGross : `$${formatNumber(machine.sasGross)}`}</p>
            </div>
          </div>
          
          {machine.sasStartTime && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/50 p-2 border border-amber-100">
              <span className="text-[10px] font-bold uppercase text-amber-800 shrink-0">SAS Period</span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-mono font-bold text-gray-700">
                  {formatTime(machine.sasStartTime)}
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-400">
                  {formatTime(machine.sasEndTime)}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Desktop/Full table view (always hidden on mobile)
  const totalMeterGross = variationMachines.reduce((sum, m) => sum + (Number(m.meterGross) || 0), 0);
  const totalSasGross = variationMachines.reduce((sum, m) => sum + (Number(m.sasGross) || 0), 0);
  const totalVariation = variationMachines.reduce((sum, m) => {
    const v = typeof m.variation === 'number' ? m.variation : Number(m.variation) || 0;
    return sum + v;
  }, 0);

  return (
    <div className="w-full">
      {renderCards()}

      {!isCompact && (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 text-gray-500">
              <tr>
                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-[10px]">MACHINE / DEVICE</th>
                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">METER GROSS</th>
                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">SAS GROSS</th>
                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">VARIANCE</th>
                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-[10px]">SAS START AND END TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {variationMachines.map((machine, index) => (
                <tr
                  key={`${machine.machineId}-${index}`}
                  className="hover:bg-blue-50/30 cursor-pointer transition-all duration-200"
                  onClick={() => onMachineClick?.(machine.machineId)}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{machine.machineName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">ID: {machine.machineId.substring(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">
                    ${formatNumber(machine.meterGross)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">
                    {typeof machine.sasGross === 'string' ? machine.sasGross : `$${formatNumber(machine.sasGross)}`}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      typeof machine.variation === 'number' && machine.variation < 0 
                      ? 'bg-red-50 text-red-600' 
                      : typeof machine.variation === 'number' && machine.variation > 0
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-50 text-gray-600'
                    }`}>
                      {typeof machine.variation === 'number' && machine.variation > 0 ? '+' : ''}{formatNumber(machine.variation)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                    {machine.sasStartTime && machine.sasEndTime ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-700">{formatTime(machine.sasStartTime)}</div>
                        <div className="text-gray-400">{formatTime(machine.sasEndTime)}</div>
                      </div>
                    ) : (
                      <span className="italic text-gray-300">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50/50 font-black text-gray-900 border-t border-gray-100">
              <tr>
                <td className="px-6 py-4 text-left uppercase text-[10px] tracking-widest text-gray-400 font-bold">BATCH TOTALS</td>
                <td className="px-6 py-4 text-right">${formatNumber(totalMeterGross)}</td>
                <td className="px-6 py-4 text-right">${formatNumber(totalSasGross)}</td>
                <td className={`px-6 py-4 text-right ${getVariationColor(totalVariation)}`}>
                  ${formatNumber(totalVariation)}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
