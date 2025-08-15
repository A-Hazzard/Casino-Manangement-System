"use client";

import { Suspense } from "react";
import { RefreshCw } from "lucide-react";

// Components
import ReportsContent from "@/components/reports/ReportsContent";

/**
 * Reports Page
 * Main entry point for the reports section with comprehensive analytics and reporting
 * 
 * Features:
 * - Multi-tab interface (Dashboard, Locations, Machines, Meters)
 * - Role-based access control and permissions
 * - Real-time data updates and filtering
 * - Responsive design for desktop and mobile
 * - Advanced filtering and export capabilities
 */
export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-buttonActive" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
