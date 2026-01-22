/**
 * Cabinet Detail Page
 *
 * This page displays detailed information about a specific cabinet/machine.
 * It acts as a lean wrapper around the CabinetDetailsPageContent component.
 *
 * @module app/cabinets/[slug]/page
 */

export const dynamic = 'force-dynamic';

import CabinetsDetailsPageContent from '@/components/CMS/cabinets/CabinetsDetailsPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';

export default function CabinetPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <CabinetsDetailsPageContent />
    </ProtectedRoute>
  );
}
