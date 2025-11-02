"use client";

import { formatNumber } from "@/lib/utils/metrics";
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat";
import { DashboardFinancialMetricsSkeleton } from "@/components/ui/skeletons/DashboardSkeletons";

type FinancialMetricsCardsProps = {
  totals: {
    moneyIn: number;
    moneyOut: number;
    gross: number;
  } | null;
  loading?: boolean;
  title?: string;
  className?: string;
  disableCurrencyConversion?: boolean; // For specific location/cabinet pages
};

export default function FinancialMetricsCards({
  totals,
  loading = false,
  title = "Financial Metrics",
  className = "",
  disableCurrencyConversion = false,
}: FinancialMetricsCardsProps) {
  const { formatAmount, shouldShowCurrency, displayCurrency } =
    useCurrencyFormat();
  
  // On specific location/cabinet pages, don't apply currency conversion
  const shouldApplyCurrency = !disableCurrencyConversion && shouldShowCurrency();
  if (loading) {
    return <DashboardFinancialMetricsSkeleton />;
  }

  // Helper function to format numbers with proper scaling
  const formatNumberWithScaling = (value: number): { display: string; size: string } => {
    const absValue = Math.abs(value);
    
    if (absValue >= 1000000) {
      const millions = value / 1000000;
      return {
        display: `${millions.toFixed(1)}M`,
        size: "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
      };
    } else if (absValue >= 1000) {
      const thousands = value / 1000;
      return {
        display: `${thousands.toFixed(1)}K`,
        size: "text-lg sm:text-xl md:text-2xl lg:text-3xl"
      };
    } else {
      return {
        display: formatNumber(value),
        size: "text-lg sm:text-xl md:text-2xl lg:text-3xl"
      };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg text-gray-700 font-semibold">{title}</h2>
      )}
      
      {/* Mobile: New design */}
      <div className="block md:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Money In Card */}
          <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Background accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Money In
                </h3>
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              </div>
              
              <div className="space-y-2">
                <div className={`font-bold text-gray-900 ${formatNumberWithScaling(totals?.moneyIn || 0).size}`}>
                  {totals
                    ? (() => {
                        const formatted = formatNumberWithScaling(totals.moneyIn);
                        return shouldApplyCurrency 
                          ? formatAmount(totals.moneyIn, displayCurrency)
                          : formatted.display;
                      })()
                    : "--"}
                </div>
                
                {/* Full number tooltip on hover for large numbers */}
                {totals && Math.abs(totals.moneyIn) >= 1000 && (
                  <div className="text-xs text-gray-500 font-mono">
                    {formatNumber(totals.moneyIn)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Money Out Card */}
          <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Background accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Money Out
                </h3>
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
              
              <div className="space-y-2">
                <div className={`font-bold text-gray-900 ${formatNumberWithScaling(totals?.moneyOut || 0).size}`}>
                  {totals
                    ? (() => {
                        const formatted = formatNumberWithScaling(totals.moneyOut);
                        return shouldApplyCurrency 
                          ? formatAmount(totals.moneyOut, displayCurrency)
                          : formatted.display;
                      })()
                    : "--"}
                </div>
                
                {/* Full number tooltip on hover for large numbers */}
                {totals && Math.abs(totals.moneyOut) >= 1000 && (
                  <div className="text-xs text-gray-500 font-mono">
                    {formatNumber(totals.moneyOut)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gross Card */}
          <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Background accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Gross
                </h3>
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              </div>
              
              <div className="space-y-2">
                <div className={`font-bold text-gray-900 ${formatNumberWithScaling(totals?.gross || 0).size}`}>
                  {totals
                    ? (() => {
                        const formatted = formatNumberWithScaling(totals.gross);
                        return shouldApplyCurrency 
                          ? formatAmount(totals.gross, displayCurrency)
                          : formatted.display;
                      })()
                    : "--"}
                </div>
                
                {/* Full number tooltip on hover for large numbers */}
                {totals && Math.abs(totals.gross) >= 1000 && (
                  <div className="text-xs text-gray-500 font-mono">
                    {formatNumber(totals.gross)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop: Original centered design */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Money In Card */}
          <div className="px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
            <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
              Money In
            </p>
            <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
            <div className="flex-1 flex items-center justify-center">
              <p className="font-bold break-words overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl">
                {totals
                  ? shouldApplyCurrency
                    ? formatAmount(totals.moneyIn, displayCurrency)
                    : formatNumber(totals.moneyIn)
                  : "--"}
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
              <p className="font-bold break-words overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl">
                {totals
                  ? shouldApplyCurrency
                    ? formatAmount(totals.moneyOut, displayCurrency)
                    : formatNumber(totals.moneyOut)
                  : "--"}
              </p>
            </div>
          </div>
          
          {/* Gross Card */}
          <div className="px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center md:col-span-2 lg:col-span-2 xl:col-span-1">
            <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
              Gross
            </p>
            <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
            <div className="flex-1 flex items-center justify-center">
              <p className="font-bold break-words overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl">
                {totals
                  ? shouldApplyCurrency
                    ? formatAmount(totals.gross, displayCurrency)
                    : formatNumber(totals.gross)
                  : "--"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}