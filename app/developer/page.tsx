/**
 * Developer Page
 *
 * Developer-only DB explorer. Gated by DeveloperRoute so only the developer role
 * can reach it — owner/admin and every other role are redirected away.
 *
 * @module app/developer/page
 */

export const dynamic = 'force-dynamic';

import DeveloperPageContent from '@/components/CMS/developer/DeveloperPageContent';
import DeveloperRoute from '@/components/shared/auth/DeveloperRoute';

export default function DeveloperPage() {
  return (
    <DeveloperRoute>
      <DeveloperPageContent />
    </DeveloperRoute>
  );
}
