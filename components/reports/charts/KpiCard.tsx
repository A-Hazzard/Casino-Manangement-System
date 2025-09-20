import { KpiMetric } from "@/lib/types/reports";
import { formatCurrency } from "@/lib/utils/currency";

// Helper functions for formatting
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const formatLargeNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type KpiCardProps = {
  metric: KpiMetric;
  isLoading?: boolean;
};

export default function KpiCard({ metric, isLoading = false }: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-container border border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="h-4 bg-gray-300 rounded skeleton-bg w-24"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-gray-300 rounded skeleton-bg w-32"></div>
            <div className="h-4 bg-gray-300 rounded skeleton-bg w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number, format: KpiMetric["format"]) => {
    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percentage":
        return formatPercentage(value);
      case "number":
        return formatLargeNumber(value);
      default:
        return value.toString();
    }
  };

  const getTrendIcon = () => {
    switch (metric.trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-greenHighlight" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-pinkHighlight" />;
      default:
        return <Minus className="w-4 h-4 text-grayHighlight" />;
    }
  };

  const getTrendColor = () => {
    switch (metric.trend) {
      case "up":
        return "text-greenHighlight";
      case "down":
        return "text-pinkHighlight";
      default:
        return "text-grayHighlight";
    }
  };

  return (
    <Card className="bg-container border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-grayHighlight">
          {metric.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
            {typeof metric.value === "number"
              ? formatValue(metric.value, metric.format)
              : metric.value}
          </div>

          {metric.change !== undefined && (
            <div
              className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}
            >
              {getTrendIcon()}
              <span>{metric.change.toFixed(1)}%</span>
              <span className="text-grayHighlight">vs previous period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
