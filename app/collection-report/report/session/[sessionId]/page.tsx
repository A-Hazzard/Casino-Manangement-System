/**
 * Collection Report V2 — Session Detail Page
 *
 * Displays a single capture session with its machine list,
 * allowing collectors to capture photos, confirm meters, and submit.
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import CollectionReportV2SessionDetail from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail';

export default function SessionDetailPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <CollectionReportV2SessionDetail />
    </ProtectedRoute>
  );
}
