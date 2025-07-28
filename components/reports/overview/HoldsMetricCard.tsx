"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent } from "lucide-react";

type HoldsMetricCardProps = {
  data: {
    metricValue: string;
    metricSubtitle: string;
  };
};

export default function HoldsMetricCard({ data }: HoldsMetricCardProps) {
  const isNegative = data.metricValue.startsWith("-");
  const isPositive =
    data.metricValue.startsWith("+") ||
    (!isNegative && data.metricValue !== "0%");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-blue-500" />
          Holds
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            <span
              className={
                isNegative
                  ? "text-red-600"
                  : isPositive
                  ? "text-green-600"
                  : "text-gray-600"
              }
            >
              {data.metricValue}
            </span>
          </div>
          <p className="text-sm text-gray-600">{data.metricSubtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
