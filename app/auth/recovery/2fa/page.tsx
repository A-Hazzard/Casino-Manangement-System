/**
 * 2FA Recovery Page
 *
 * Secure page for vault managers to reset their 2FA authenticator
 * via an emailed recovery link. Delegates all UI and verification logic
 * to TwoFactorAuthPageContent.
 *
 * @module app/auth/recovery/2fa/page
 */

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import TwoFactorAuthPageContent from '@/components/auth/recovery/TwoFactorAuthPageContent';

export default function TwoFactorRecoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
            <p className="font-medium text-slate-500">
              Loading recovery session...
            </p>
          </div>
        </div>
      }
    >
      <TwoFactorAuthPageContent />
    </Suspense>
  );
}
