import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import VaultAuthenticatorSetup from './VaultAuthenticatorSetup';

type VaultAuthenticatorModalProps = {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  actionName: string;
};

export default function VaultAuthenticatorModal({
  open,
  onClose,
  onVerified,
  actionName,
}: VaultAuthenticatorModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [hasSecret, setHasSecret] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'confirm' | 'edit'>(
    'none'
  );
  const [recoveryNewEmail, setRecoveryNewEmail] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Check setup status on open
  useEffect(() => {
    if (open) {
      checkSetup();
      setCode('');
      setRecoveryStep('none');
      setRecoveryNewEmail('');
      setRecoveryPassword('');
    }
  }, [open]);

  const checkSetup = async () => {
    setCheckingSetup(true);
    try {
      const response = await fetch('/api/auth/totp/status');
      const data = await response.json();

      if (response.ok) {
        setNeedsSetup(data.needsSetup);
        setHasSecret(data.hasSecret);
        setUserRole(data.role);
        setCurrentEmail(data.email);
      } else if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        onClose();
      }
    } catch (error) {
      console.error('Check Setup Error:', error);
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Authenticated successfully');
        onVerified();
        onClose();
        setCode('');
      } else {
        toast.error(data.error || 'Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Authenticator Error:', error);
      toast.error('Failed to verify code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    const isVM =
      userRole?.toLowerCase() === 'vault-manager' ||
      userRole?.toLowerCase() === 'admin' ||
      userRole?.toLowerCase() === 'developer' ||
      userRole?.toLowerCase() === 'manager' ||
      userRole?.toLowerCase() === 'location admin';

    if (isVM && recoveryStep === 'none') {
      setRecoveryStep('confirm');
      return;
    }

    const endpoint = isVM
      ? '/api/auth/totp/recover/vm'
      : '/api/auth/totp/recover/cashier';

    setRecoveryLoading(true);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        toast.success(
          isVM
            ? 'Recovery email sent. Please check your inbox.'
            : 'Help request sent to Vault Managers.'
        );
        setRecoveryStep('none');
      } else {
        toast.error(data.error || 'Recovery request failed');
      }
    } catch {
      toast.error('Connection error while requesting recovery');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleUpdateEmailAndRecover = async () => {
    if (!recoveryNewEmail || !recoveryPassword) {
      toast.error('New email and password are required');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const updateRes = await fetch('/api/auth/profile/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: recoveryNewEmail,
          password: recoveryPassword,
        }),
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        toast.error(updateData.error || 'Failed to update email');
        return;
      }

      toast.success('Email updated successfully');
      setCurrentEmail(recoveryNewEmail);

      // Now proceed with recovery
      const isVM =
        userRole?.toLowerCase() === 'vault-manager' ||
        userRole?.toLowerCase() === 'admin' ||
        userRole?.toLowerCase() === 'developer' ||
        userRole?.toLowerCase() === 'manager' ||
        userRole?.toLowerCase() === 'location admin';
      const endpoint = isVM
        ? '/api/auth/totp/recover/vm'
        : '/api/auth/totp/recover/cashier';

      const recoverRes = await fetch(endpoint, { method: 'POST' });
      const recoverData = await recoverRes.json();

      if (recoverRes.ok) {
        toast.success('Recovery email sent to your new address.');
        setRecoveryStep('none');
        setRecoveryNewEmail('');
        setRecoveryPassword('');
      } else {
        toast.error(recoverData.error || 'Recovery request failed');
      }
    } catch {
      toast.error('An error occurred during email update');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="!z-[300] flex h-full w-full flex-col gap-0 overflow-y-auto rounded-none p-4 transition-all duration-300 md:h-auto md:max-h-[90dvh] md:w-[95vw] md:max-w-lg md:rounded-3xl md:p-6"
        backdropClassName="!z-[290] bg-black/60 backdrop-blur-sm"
      >
        <DialogHeader className="border-b border-gray-50 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-gray-900">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            Two-Factor Authentication
          </DialogTitle>
          {!checkingSetup && !needsSetup && recoveryStep === 'none' && (
            <DialogDescription className="mt-2 text-sm font-medium text-gray-500">
              Please enter the 6-digit code from your Google Authenticator app
              to perform <b>{actionName}</b>.
            </DialogDescription>
          )}
          {recoveryStep === 'confirm' && (
            <DialogDescription className="mt-2 text-sm font-medium text-gray-500">
              Verify your email address to receive the 2FA reset link.
            </DialogDescription>
          )}
          {recoveryStep === 'edit' && (
            <DialogDescription className="mt-2 text-sm font-medium text-gray-500">
              Update your email address to regain access.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-1 flex-col py-4">
          {checkingSetup ? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm font-black uppercase tracking-widest text-gray-400">
                Verifying Security...
              </p>
            </div>
          ) : needsSetup ? (
            <VaultAuthenticatorSetup
              initialShowQr={!hasSecret}
              onConfirmed={() => {
                setNeedsSetup(false);
              }}
              onCancel={onClose}
            />
          ) : recoveryStep === 'confirm' ? (
            <div className="flex flex-1 flex-col space-y-6 py-4">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-gray-500">
                  A verification link will be sent to your registered email:
                </p>
                <p className="break-all text-lg font-black tracking-tight text-violet-600">
                  {currentEmail || 'No email on file'}
                </p>
                <p className="mt-4 text-xs italic text-gray-400">
                  Is this the correct email address for your account?
                </p>
              </div>

              <DialogFooter className="mt-auto flex flex-col gap-2 border-t border-gray-50 pt-6">
                <Button
                  onClick={handleRecovery}
                  disabled={recoveryLoading}
                  className="w-full bg-violet-600 py-4 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  {recoveryLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Yes, Send Recovery Link'
                  )}
                </Button>
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => setRecoveryStep('edit')}
                    disabled={recoveryLoading}
                    className="flex-1 border-2 border-violet-100 py-4 font-bold text-violet-600 hover:bg-violet-50"
                  >
                    No, Update Email
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setRecoveryStep('none')}
                    disabled={recoveryLoading}
                    className="flex-1 py-4 font-bold text-gray-400"
                  >
                    Cancel
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : recoveryStep === 'edit' ? (
            <div className="flex flex-1 flex-col space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    New Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your new email"
                    value={recoveryNewEmail}
                    onChange={e => setRecoveryNewEmail(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-100 bg-gray-50/50 focus:border-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Confirm Identity (Password)
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter login password"
                    value={recoveryPassword}
                    onChange={e => setRecoveryPassword(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-100 bg-gray-50/50 focus:border-violet-500"
                  />
                </div>
                <p className="px-1 text-[10px] leading-relaxed text-gray-400">
                  Updating your email requires your current account password for
                  security. Once updated, the 2FA recovery link will be sent to
                  the new address.
                </p>
              </div>

              <DialogFooter className="mt-auto flex flex-col gap-2 border-t border-gray-50 pt-6">
                <Button
                  onClick={handleUpdateEmailAndRecover}
                  disabled={
                    isUpdatingEmail || !recoveryNewEmail || !recoveryPassword
                  }
                  className="w-full bg-violet-600 py-4 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  {isUpdatingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update & Send Link'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setRecoveryStep('confirm')}
                  disabled={isUpdatingEmail}
                  className="w-full py-2 font-bold text-gray-400"
                >
                  Go Back
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col items-center justify-center space-y-6 py-6 md:py-10">
                <div className="w-full space-y-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">
                    Authenticator Code
                  </p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="000 000"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    className="mx-auto h-20 w-full max-w-[280px] rounded-2xl border-2 border-violet-100 bg-violet-50/30 text-center text-4xl font-black tracking-[0.3em] shadow-inner transition-all focus:border-violet-500 md:h-20 md:text-4xl"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && code.length === 6) {
                        handleVerify();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter className="mt-auto flex flex-col gap-2 border-t border-gray-50 pt-6 md:flex-row">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                  className="order-2 flex-1 py-6 font-bold text-gray-400 md:order-1 md:py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={loading || code.length !== 6}
                  className="order-1 flex-1 bg-violet-600 py-6 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 md:order-2 md:py-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify Session'
                  )}
                </Button>
              </DialogFooter>

              {!needsSetup && (
                <div className="px-6 pb-6 text-center">
                  <button
                    type="button"
                    onClick={handleRecovery}
                    disabled={recoveryLoading}
                    className="text-[11px] font-bold text-violet-500 underline underline-offset-4 hover:text-violet-700 disabled:opacity-50"
                  >
                    {recoveryLoading
                      ? 'Processing...'
                      : userRole?.toLowerCase() === 'cashier'
                        ? 'Help! I lost my authenticator'
                        : 'Lost Authenticator? Reset via Email'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
