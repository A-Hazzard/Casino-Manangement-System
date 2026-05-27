'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * 2FA Recovery Page Content
 * Extracted to allow wrapping with Suspense for useSearchParams()
 */
function TwoFactorRecoveryContent() {
  // ============================================================================
  // Router & Params
  // ============================================================================
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // ============================================================================
  // State
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [setupData, setSetupData] = useState<{
    qrCodeUrl: string;
    secret: string;
    username: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  // ============================================================================
  // Handlers & API
  // ============================================================================

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/auth/totp/recover/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (response.ok) {
        setSetupData(data);
      } else {
        toast.error(data.error || 'Invalid or expired recovery link');
      }
    } catch {
      toast.error('Connection error while verifying link');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    setVerifyingCode(true);
    try {
      const response = await fetch('/api/auth/totp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: code,
          recoveryToken: token, // Pass recovery token for identification
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        toast.success('Authenticator reset successfully');
        setTimeout(() => router.push('/'), 3000);
      } else {
        toast.error(data.error || 'Invalid verification code');
      }
    } catch {
      toast.error('Failed to confirm authenticator');
    } finally {
      setVerifyingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          <p className="font-medium text-slate-500">
            Verifying recovery link...
          </p>
        </div>
      </div>
    );
  }

  if (!setupData && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-red-100 shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <ShieldCheck className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">
              Invalid Link
            </CardTitle>
            <CardDescription>
              This recovery link is either invalid or has expired. Please
              request a new one from the login screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-slate-800"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-6 text-center duration-500 animate-in fade-in zoom-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">All Set!</h1>
            <p className="text-lg font-medium text-slate-500">
              Your 2FA has been successfully reset. Redirecting you to the
              dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 sm:p-8">
      <div className="w-full max-w-xl space-y-8">
        {/* Header Section */}
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Setup New Authenticator
          </h1>
          <p className="text-lg font-medium text-slate-500">
            Scan the QR code below to connect your account{' '}
            <strong>{setupData?.username}</strong>
          </p>
        </div>

        {/* QR Code and Form Section */}
        <div className="grid items-center gap-8 rounded-3xl border border-slate-100 bg-slate-50 p-6 sm:p-10 md:grid-cols-2">
          {/* QR Code Display */}
          <div className="flex flex-col items-center justify-center">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
              <img
                src={setupData?.qrCodeUrl}
                alt="QR Code"
                className="h-48 w-48"
              />
            </div>
            <p className="mt-4 select-all font-mono text-[10px] uppercase text-slate-400">
              {setupData?.secret}
            </p>
          </div>

          {/* Verification Code Form */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">Verification Code</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Enter the 6-digit code from your app to verify that the setup
                was successful.
              </p>
              <Input
                type="text"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-16 rounded-xl border-2 border-slate-200 text-center text-3xl font-black tracking-[0.2em] focus:border-violet-500"
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={code.length !== 6 || verifyingCode}
              className="h-14 w-full rounded-xl bg-violet-600 text-lg font-black text-white shadow-lg shadow-violet-100 transition-all hover:bg-violet-700"
            >
              {verifyingCode ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                'Finalize Setup'
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm font-medium text-slate-400">
          Need help? Contact system administration.
        </p>
      </div>
    </div>
  );
}

/**
 * 2FA Recovery Page
 *
 * Secure white page for Vault Managers to reset their 2FA.
 * Requires a valid token from the recovery email.
 */
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
      <TwoFactorRecoveryContent />
    </Suspense>
  );
}
