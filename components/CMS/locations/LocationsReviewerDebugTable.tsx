/**
 * LocationsReviewerDebugTable Component
 * 
 * Displays a detailed financial trace for multiple locations.
 * Visible only to users with the 'reviewer' or 'developer' role.
 * 
 * @param props - Component props
 */

import type { AggregatedLocation } from '@/shared/types';

type LocationsReviewerDebugTableProps = {
  locationData: AggregatedLocation[];
};

export default function LocationsReviewerDebugTable({ locationData }: LocationsReviewerDebugTableProps) {
  return (
    <div className="mt-4 rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
      <p className="mb-2 text-base font-bold text-yellow-800">
        🔍 REVIEWER DEBUG — RAW values (accounting denomination applied, reviewer multiplier NOT yet applied)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-mono">
          <thead>
            <tr className="border-b border-yellow-300 text-yellow-900">
              <th className="pr-4 pb-1">Location</th>
              <th className="pr-4 pb-1">Raw Money In</th>
              <th className="pr-4 pb-1">Final Money In</th>
              <th className="pr-4 pb-1">Raw Money Out</th>
              <th className="pr-4 pb-1">Final Money Out</th>
              <th className="pr-4 pb-1">Raw Jackpot</th>
              <th className="pr-4 pb-1">Final Jackpot</th>
              <th className="pr-4 pb-1">Raw Gross</th>
              <th className="pr-4 pb-1">Final Gross</th>
              <th className="pb-1">Multiplier</th>
            </tr>
          </thead>
          <tbody>
            {locationData.map(loc => {
              const raw = loc as unknown as Record<string, unknown>;
              const mult = raw._reviewerMultiplier as number | undefined;
              const rawMI = raw._rawMoneyIn as number | undefined;
              const rawMO = raw._rawMoneyOut as number | undefined;
              const rawJP = raw._rawJackpot as number | undefined;
              const rawGR = raw._rawGross as number | undefined;
              return (
                <tr key={String(loc._id || loc.location)} className="border-b border-yellow-200 text-yellow-900">
                  <td className="pr-4 py-1 font-semibold">{loc.name || '—'}</td>
                  <td className="pr-4 py-1 text-orange-700 font-bold">
                    {rawMI != null ? rawMI.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1">
                    {loc.moneyIn != null ? loc.moneyIn.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1 text-orange-700 font-bold">
                    {rawMO != null ? rawMO.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1">
                    {loc.moneyOut != null ? loc.moneyOut.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1 text-orange-700 font-bold">
                    {rawJP != null ? rawJP.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1">
                    {loc.jackpot != null ? loc.jackpot.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1 text-orange-700 font-bold">
                    {rawGR != null ? rawGR.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pr-4 py-1">
                    {loc.gross != null ? loc.gross.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="py-1 text-purple-700 font-bold">
                    {mult != null ? `×${mult}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-yellow-700">
        Orange = pre-multiplier (denominated). Black = post-multiplier (what you see in the UI). Expected: Final = Raw × Multiplier.
      </p>
    </div>
  );
}
