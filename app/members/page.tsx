"use client";

import { Suspense } from "react";

// Components
import MembersContent from "@/components/members/MembersContent";

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
    <Suspense fallback={<div>Loading...</div>}>
      <MembersContent />
    </Suspense>
  );
}