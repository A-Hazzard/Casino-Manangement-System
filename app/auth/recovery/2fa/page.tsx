'use client';

import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string; username: string } | null>(null);
  const [code, setCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

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
        body: JSON.stringify({ token: code }),
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Verifying recovery link...</p>
        </div>
      </div>
    );
  }

  if (!setupData && !isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-100 shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">Invalid Link</CardTitle>
            <CardDescription>
              This recovery link is either invalid or has expired. Please request a new one from the login screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full bg-slate-800">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">All Set!</h1>
            <p className="text-slate-500 font-medium text-lg">
              Your 2FA has been successfully reset. Redirecting you to the dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Setup New Authenticator</h1>
          <p className="text-slate-500 text-lg font-medium">
            Scan the QR code below to connect your account <strong>{setupData?.username}</strong>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-100">
          <div className="flex justify-center flex-col items-center">
             <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm">
                <img src={setupData?.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
             </div>
             <p className="mt-4 text-[10px] font-mono text-slate-400 select-all uppercase">{setupData?.secret}</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">Verification Code</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter the 6-digit code from your app to verify that the setup was successful.
              </p>
              <Input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-3xl font-black h-16 tracking-[0.2em] border-2 border-slate-200 focus:border-violet-500 rounded-xl"
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={code.length !== 6 || verifyingCode}
              className="w-full h-14 bg-violet-600 text-white font-black text-lg rounded-xl shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all"
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

        <p className="text-center text-slate-400 text-sm font-medium">
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
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Loading recovery session...</p>
        </div>
      </div>
    }>
      <TwoFactorRecoveryContent />
    </Suspense>
  );
}
