"use client";

import { formatNumber } from "@/lib/utils/metrics";
import { DashboardFinancialMetricsSkeleton } from "@/components/ui/skeletons/DashboardSkeletons";
import { getFinancialColorClass } from "@/lib/utils/financialColors";

type FinancialMetricsCardsProps = {
  totals: {
    moneyIn: number;
    moneyOut: number;
    gross: number;
  } | null;
  loading?: boolean;
  title?: string;
  className?: string;
};

export default function FinancialMetricsCards({
  totals,
  loading = false,
  title = "Financial Metrics",
  className = "",
}: FinancialMetricsCardsProps) {
  if (loading) {
    return <DashboardFinancialMetricsSkeleton />;
  }

  // Helper function to determine responsive font size based on number length
  const getResponsiveFontSize = (value: number): string => {
    const formatted = formatNumber(value);
    const length = formatted.length;
    
    if (length <= 8) return "text-lg sm:text-xl md:text-2xl lg:text-3xl";
    if (length <= 12) return "text-base sm:text-lg md:text-xl lg:text-2xl";
    if (length <= 16) return "text-sm sm:text-base md:text-lg lg:text-xl";
    return "text-xs sm:text-sm md:text-base lg:text-lg";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg text-gray-700 font-semibold">{title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Money In Card */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
          <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
            Money In
          </p>
          <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
          <div className="flex-1 flex items-center justify-center">
            <p className={`font-bold break-words overflow-hidden ${getResponsiveFontSize(totals?.moneyIn || 0)} ${getFinancialColorClass(totals?.moneyIn)}`}>
              {totals ? formatNumber(totals.moneyIn) : "--"}
            </p>
          </div>
        </div>

        {/* Money Out Card */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
          <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
            Money Out
          </p>
          <div className="w-full h-[4px] rounded-full my-2 bg-lighterBlueHighlight"></div>
          <div className="flex-1 flex items-center justify-center">
            <p className={`font-bold break-words overflow-hidden ${getResponsiveFontSize(totals?.moneyOut || 0)} ${getFinancialColorClass(totals?.moneyOut)}`}>
              {totals ? formatNumber(totals.moneyOut) : "--"}
            </p>
          </div>
        </div>

        {/* Gross Card */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
          <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">Gross</p>
          <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
          <div className="flex-1 flex items-center justify-center">
            <p className={`font-bold break-words overflow-hidden ${getResponsiveFontSize(totals?.gross || 0)} ${getFinancialColorClass(totals?.gross)}`}>
              {totals ? formatNumber(totals.gross) : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
