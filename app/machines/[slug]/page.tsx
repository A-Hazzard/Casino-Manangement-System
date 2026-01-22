/**
 * Machine Detail Page
 *
 * This page displays detailed information about a specific machine/cabinet.
 * It acts as a lean wrapper around the MachineDetailsPageContent component.
 *
 * @module app/machines/[slug]/page
 */

export const dynamic = 'force-dynamic';

import MachineDetailsPageContent from '@/components/CMS/machines/MachineDetailsPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';

export default function MachinePage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <MachineDetailsPageContent />
    </ProtectedRoute>
  );
}
