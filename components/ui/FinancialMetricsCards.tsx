"use client";

import { formatNumber } from "@/lib/utils/metrics";
import StatCardSkeleton from "@/components/ui/SkeletonLoader";

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
    return (
      <div className={`space-y-4 ${className}`}>
        {title && (
          <h2 className="text-lg text-gray-700 font-semibold">{title}</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg text-gray-700 font-semibold">{title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Money In Card */}
        <div className="px-6 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
          <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium">
            Money In
          </p>
          <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
          <p className="font-bold text-lg md:text-xl">
            {totals ? formatNumber(totals.moneyIn) : "--"}
          </p>
        </div>

        {/* Money Out Card */}
        <div className="px-6 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
          <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium">
            Money Out
          </p>
          <div className="w-full h-[4px] rounded-full my-2 bg-lighterBlueHighlight"></div>
          <p className="font-bold text-lg md:text-xl">
            {totals ? formatNumber(totals.moneyOut) : "--"}
          </p>
        </div>

        {/* Gross Card */}
        <div className="px-6 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
          <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium">Gross</p>
          <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
          <p className="font-bold text-lg md:text-xl">
            {totals ? formatNumber(totals.gross) : "--"}
          </p>
        </div>
      </div>
    </div>
  );
}
