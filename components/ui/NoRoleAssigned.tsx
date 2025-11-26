/**
 * No Role Assigned Component
 * Alert component displayed when user has no role assigned.
 *
 * Features:
 * - Error alert styling
 * - Informative message
 * - Contact information guidance
 * - Centered layout
 */
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function NoRoleAssigned() {
  // ============================================================================
  // Render - Alert
  // ============================================================================
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert className="max-w-2xl border-red-200 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-lg font-semibold text-red-900">
          No Role Assigned
        </AlertTitle>
        <AlertDescription className="mt-2 text-red-800">
          You have not been assigned a role yet. Please contact your Manager or Customer Support to gain access to the system.
        </AlertDescription>
      </Alert>
    </div>
  );
}

