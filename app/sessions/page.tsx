/**
 * Sessions Page
 * Main entry point for viewing and managing gaming sessions.
 *
 * This page displays all gaming sessions with filtering, search, and pagination.
 * It delegates core logic to SessionsPageContent.
 *
 * @module app/sessions/page
 */

import SessionsPageContent from '@/components/sessions/SessionsPageContent';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function SessionsPage() {
  return (
    <ProtectedRoute requiredPage="sessions">
      <SessionsPageContent />
    </ProtectedRoute>
  );
}
