/**
 * Reviewer Debug Panel Component
 * 
 * Displays raw vs. scaled financial values for users with the 'reviewer' role.
 * Helps visualize how the data is being scaled by the reviewer multiplier.
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

  if (!user?.roles?.includes('reviewer')) return null;

  const format = (val: number) => formatCurrencyWithCodeString(val, displayCurrency || 'USD');

  return (
    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
      <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
          DEBUG
        </span>
        Reviewer Data Scaling (Multiplier: {(multiplier * 100).toFixed(0)}%)
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-3">
        {/* Money In */}
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">Money In</p>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 line-through">
              {rawValues ? format(rawValues.moneyIn) : '...'}
            </span>
            <span className="text-blue-700 font-bold">
              {format(finalValues.moneyIn || 0)}
            </span>
          </div>
        </div>

        {/* Money Out */}
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">Money Out</p>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 line-through">
              {rawValues ? format(rawValues.moneyOut) : '...'}
            </span>
            <span className="text-blue-700 font-bold">
              {format(finalValues.moneyOut || 0)}
            </span>
          </div>
        </div>

        {/* Jackpot */}
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">Jackpot</p>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 line-through">
              {rawValues ? format(rawValues.jackpot || 0) : '...'}
            </span>
            <span className="text-blue-700 font-bold">
              {format(finalValues.jackpot || 0)}
            </span>
          </div>
        </div>

        {/* Gross */}
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">Gross</p>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 line-through">
              {rawValues ? format(rawValues.gross ?? (rawValues.moneyIn - rawValues.moneyOut)) : '...'}
            </span>
            <span className="text-green-700 font-bold">
              {format(finalValues.gross ?? ((finalValues.moneyIn || 0) - (finalValues.moneyOut || 0)))}
            </span>
          </div>
        </div>
      </div>
      
      <p className="mt-3 text-[10px] text-orange-600 italic">
        * Admin Note: These values are derived server-side. Reviewer multiplier is applied after currency conversion.
      </p>
    </div>
  );
}
