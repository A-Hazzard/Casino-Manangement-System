/**
 * Reviewer Debug Panel Component
 * 
 * Displays raw vs. scaled financial values for users with the 'reviewer' or 'developer' role.
 * Helps visualize the progression from base meters to final scaled values.
 */

import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';

type ReviewerDebugPanelProps = {
  rawValues: {
    moneyIn: number;
    moneyOut: number;
    jackpot?: number;
    gross?: number;
  } | null;
  finalValues: {
    moneyIn?: number;
    moneyOut?: number;
    jackpot?: number;
    gross?: number;
    includeJackpot?: boolean;
  };
  multiplier: number;
};

export default function ReviewerDebugPanel({
  rawValues,
  finalValues,
  multiplier
}: ReviewerDebugPanelProps) {
  const { user } = useUserStore();
  const { displayCurrency } = useCurrencyFormat();

  const normalizedRoles = (user?.roles || []).map(r => r.toLowerCase());
  const isAuthorized = normalizedRoles.includes('reviewer') || normalizedRoles.includes('developer');

  if (!isAuthorized) return null;

  const format = (val: number) => formatCurrencyWithCodeString(val, displayCurrency || 'USD');

  const includeJackpot = finalValues.includeJackpot || false;
  const rawJackpot = rawValues?.jackpot || 0;
  
  // Calculate Base values (before jackpot was added to mo/gross)
  // If includeJackpot is true, rawValues.moneyOut already contains the jackpot
  const baseMoneyOut = rawValues ? (includeJackpot ? rawValues.moneyOut - rawJackpot : rawValues.moneyOut) : 0;
  const baseGross = rawValues ? (rawValues.moneyIn - baseMoneyOut) : 0;

  return (
    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-orange-800 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
            DEBUG
          </span>
          Reviewer & Financial Logic Trace
        </h3>
        <div className="text-[10px] px-2 py-1 bg-orange-100 text-orange-700 rounded-md font-medium uppercase tracking-wider">
          Multiplier: {(multiplier * 100).toFixed(0)}% | Jackpot: {includeJackpot ? 'INCLUDED' : 'EXCLUDED'}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-gray-500 border-b border-orange-100">
              <th className="pb-2 font-medium">Metric</th>
              <th className="pb-2 font-medium">1. Base (Meters)</th>
              <th className="pb-2 font-medium">2. Raw (+Jackpot)</th>
              <th className="pb-2 font-medium text-orange-700">3. Final (Scaled)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50">
            {/* Money In */}
            <tr>
              <td className="py-2 font-semibold text-gray-700">Money In</td>
              <td className="py-2 text-gray-400">{rawValues ? format(rawValues.moneyIn) : '...'}</td>
              <td className="py-2 text-gray-600">{rawValues ? format(rawValues.moneyIn) : '...'}</td>
              <td className="py-2 text-blue-700 font-bold">{format(finalValues.moneyIn || 0)}</td>
            </tr>

            {/* Money Out */}
            <tr>
              <td className="py-2 font-semibold text-gray-700">Money Out</td>
              <td className="py-2 text-gray-400">{rawValues ? format(baseMoneyOut) : '...'}</td>
              <td className="py-2 text-gray-600">
                <span className={includeJackpot ? 'text-orange-600' : ''}>
                  {rawValues ? format(rawValues.moneyOut) : '...'}
                </span>
              </td>
              <td className="py-2 text-blue-700 font-bold">{format(finalValues.moneyOut || 0)}</td>
            </tr>

            {/* Jackpot */}
            <tr>
              <td className="py-2 font-semibold text-gray-700">Jackpot</td>
              <td className="py-2 text-gray-400">N/A</td>
              <td className="py-2 text-gray-600">{rawValues ? format(rawJackpot) : '...'}</td>
              <td className="py-2 text-blue-700 font-bold">{format(finalValues.jackpot || 0)}</td>
            </tr>

            {/* Gross */}
            <tr>
              <td className="py-2 font-semibold text-gray-700">Gross Revenue</td>
              <td className="py-2 text-gray-400">{rawValues ? format(baseGross) : '...'}</td>
              <td className="py-2 text-gray-600">
                <span className={includeJackpot ? 'text-orange-600' : ''}>
                  {rawValues ? format(rawValues.gross ?? (rawValues.moneyIn - rawValues.moneyOut)) : '...'}
                </span>
              </td>
              <td className="py-2 text-green-700 font-bold">
                {format(finalValues.gross ?? ((finalValues.moneyIn || 0) - (finalValues.moneyOut || 0)))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-3 flex flex-col gap-1">
        <p className="text-[10px] text-orange-600 italic">
          * Step 1: Base handpays/meters from machine events.
        </p>
        <p className="text-[10px] text-orange-600 italic">
          * Step 2: Addition of Jackpot to Money Out (if configured for licensee).
        </p>
        <p className="text-[10px] text-orange-600 italic">
          * Step 3: Application of Reviewer Multiplier ({(multiplier * 100).toFixed(0)}%) to raw values.
        </p>
      </div>
    </div>
  );
}