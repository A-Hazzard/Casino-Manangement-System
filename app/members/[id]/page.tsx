/**
 * Member Details Page
 *
 * This page displays detailed information about a specific member including sessions and statistics.
 * It acts as a lean wrapper around the MembersDetailsPageContent component.
 *
 * @module app/members/[id]/page
 */

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MembersDetailsPageContent from '@/components/members/MembersDetailsPageContent';

export default function MemberDetailsPage() {
  return (
    <ProtectedRoute requiredPage="member-details">
      <MembersDetailsPageContent />
    </ProtectedRoute>
  );
}
