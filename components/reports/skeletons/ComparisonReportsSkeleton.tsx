"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ComparisonReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-80">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Machine Performance Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Machine Drop Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-20 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Machines Chart Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    </div>
  );
}
