/**
 * No Licencee Assigned Component
 * Alert component displayed when user has no licencee assigned.
 *
 * Features:
 * - Warning alert styling
 * - Informative message
 * - Contact information guidance
 * - Centered layout
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/shared/ui/alert';
import { AlertCircle } from 'lucide-react';

export function NoLicenceeAssigned() {
  // ============================================================================
  // Render - Alert
  // ============================================================================
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert className="max-w-2xl border-orange-200 bg-orange-50">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-lg font-semibold text-orange-900">
          No Licencee Assigned
        </AlertTitle>
        <AlertDescription className="mt-2 text-orange-800">
          You have not been assigned to any licencee yet. Please contact your
          Administrator or Tech Support to be added to a licencee so you can access the system.
        </AlertDescription>
      </Alert>
    </div>
  );
}


