'use client';

import { Suspense } from 'react';

// Components
import MembersPageContent from '@/components/CMS/members/MembersPageContent';
import { MembersPageSkeleton } from '@/components/shared/ui/skeletons/MembersSkeletons';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';

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
    <ProtectedRoute requiredPage="members">
      <Suspense fallback={<MembersPageSkeleton />}>
        <MembersPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

