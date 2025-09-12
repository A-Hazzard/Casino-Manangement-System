"use client";

import { Suspense } from "react";

// Components
import MembersContent from "@/components/members/MembersContent";
import { MembersPageSkeleton } from "@/components/ui/skeletons/MembersSkeletons";

/**
 * Members Page
 * Main entry point for member management and analytics
 * 
 * Features:
 * - Member listing and management
 * - Member session analytics and summaries
 * - Role-based access control
 * - Search, filter, and pagination capabilities
 * - Responsive design for desktop and mobile
 */
export default function MembersPage() {
  return (
    <Suspense fallback={<MembersPageSkeleton />}>
      <MembersContent />
    </Suspense>
  );
}