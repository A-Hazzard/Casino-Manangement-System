/**
 * Cabinet Detail Page
 *
 * This page displays detailed information about a specific cabinet/machine.
 * It acts as a lean wrapper around the CabinetDetailsPageContent component.
 *
 * @module app/cabinets/[slug]/page
 */

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CabinetsDetailsPageContent from '@/components/cabinets/CabinetsDetailsPageContent';

export default function CabinetPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <CabinetsDetailsPageContent />
    </ProtectedRoute>
  );
}
