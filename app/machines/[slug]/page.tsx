/**
 * Machine Detail Page
 *
 * This page displays detailed information about a specific machine/cabinet.
 * It acts as a lean wrapper around the MachineDetailsPageContent component.
 *
 * @module app/machines/[slug]/page
 */

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MachineDetailsPageContent from '@/components/machines/MachineDetailsPageContent';

export default function MachinePage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <MachineDetailsPageContent />
    </ProtectedRoute>
  );
}
