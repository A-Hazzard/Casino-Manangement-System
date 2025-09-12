"use client";

import { Suspense } from "react";

// Components
import ReportsContent from "@/components/reports/ReportsContent";
import { ReportsPageSkeleton } from "@/components/ui/skeletons/ReportsSkeletons";

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
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
