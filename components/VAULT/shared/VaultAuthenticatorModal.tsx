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
  actionName
}: VaultAuthenticatorModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [hasSecret, setHasSecret] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'confirm' | 'edit'>('none');
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
    const isVM = userRole?.toLowerCase() === 'vault-manager' || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'developer' || userRole?.toLowerCase() === 'manager' || userRole?.toLowerCase() === 'location admin';
    
    if (isVM && recoveryStep === 'none') {
      setRecoveryStep('confirm');
      return;
    }

    const endpoint = isVM ? '/api/auth/totp/recover/vm' : '/api/auth/totp/recover/cashier';
    
    setRecoveryLoading(true);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast.success(isVM 
          ? 'Recovery email sent. Please check your inbox.' 
          : 'Help request sent to Vault Managers.');
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
        body: JSON.stringify({ newEmail: recoveryNewEmail, password: recoveryPassword }),
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        toast.error(updateData.error || 'Failed to update email');
        return;
      }

      toast.success('Email updated successfully');
      setCurrentEmail(recoveryNewEmail);
      
      // Now proceed with recovery
    const isVM = userRole?.toLowerCase() === 'vault-manager' || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'developer' || userRole?.toLowerCase() === 'manager' || userRole?.toLowerCase() === 'location admin';
      const endpoint = isVM ? '/api/auth/totp/recover/vm' : '/api/auth/totp/recover/cashier';
      
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
      <DialogContent className="w-full h-full md:h-auto md:w-[95vw] md:max-w-lg md:max-h-[90dvh] rounded-none md:rounded-3xl p-4 md:p-6 gap-0 flex flex-col overflow-y-auto transition-all duration-300 !z-[300]" backdropClassName="!z-[290] bg-black/60 backdrop-blur-sm">
        <DialogHeader className="pb-4 border-b border-gray-50">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-gray-900">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            Two-Factor Authentication
          </DialogTitle>
          {!checkingSetup && !needsSetup && recoveryStep === 'none' && (
            <DialogDescription className="text-sm font-medium text-gray-500 mt-2">
              Please enter the 6-digit code from your Google Authenticator app to perform <b>{actionName}</b>.
            </DialogDescription>
          )}
          {recoveryStep === 'confirm' && (
             <DialogDescription className="text-sm font-medium text-gray-500 mt-2">
               Verify your email address to receive the 2FA reset link.
             </DialogDescription>
          )}
          {recoveryStep === 'edit' && (
             <DialogDescription className="text-sm font-medium text-gray-500 mt-2">
               Update your email address to regain access.
             </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4 flex flex-col flex-1">
          {checkingSetup ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Verifying Security...</p>
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
            <div className="flex flex-col flex-1 py-4 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-500">
                  A verification link will be sent to your registered email:
                </p>
                <p className="text-lg font-black text-violet-600 tracking-tight break-all">
                  {currentEmail || 'No email on file'}
                </p>
                <p className="text-xs text-gray-400 mt-4 italic">
                  Is this the correct email address for your account?
                </p>
              </div>

              <DialogFooter className="flex flex-col gap-2 pt-6 border-t border-gray-50 mt-auto">
                <Button 
                  onClick={handleRecovery} 
                  disabled={recoveryLoading}
                  className="w-full bg-violet-600 text-white hover:bg-violet-700 font-black py-4 shadow-lg shadow-violet-200"
                >
                  {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Send Recovery Link'}
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setRecoveryStep('edit')}
                    disabled={recoveryLoading}
                    className="flex-1 border-2 border-violet-100 text-violet-600 font-bold hover:bg-violet-50 py-4"
                  >
                    No, Update Email
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setRecoveryStep('none')}
                    disabled={recoveryLoading}
                    className="flex-1 text-gray-400 font-bold py-4"
                  >
                    Cancel
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : recoveryStep === 'edit' ? (
            <div className="flex flex-col flex-1 py-4 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">New Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter your new email"
                    value={recoveryNewEmail}
                    onChange={(e) => setRecoveryNewEmail(e.target.value)}
                    className="h-12 border-2 border-gray-100 focus:border-violet-500 rounded-xl bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirm Identity (Password)</label>
                  <Input
                    type="password"
                    placeholder="Enter login password"
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    className="h-12 border-2 border-gray-100 focus:border-violet-500 rounded-xl bg-gray-50/50"
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed px-1">
                  Updating your email requires your current account password for security. Once updated, the 2FA recovery link will be sent to the new address.
                </p>
              </div>

              <DialogFooter className="flex flex-col gap-2 pt-6 border-t border-gray-50 mt-auto">
                <Button 
                  onClick={handleUpdateEmailAndRecover} 
                  disabled={isUpdatingEmail || !recoveryNewEmail || !recoveryPassword}
                  className="w-full bg-violet-600 text-white hover:bg-violet-700 font-black py-4 shadow-lg shadow-violet-200"
                >
                  {isUpdatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update & Send Link'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setRecoveryStep('confirm')}
                  disabled={isUpdatingEmail}
                  className="w-full text-gray-400 font-bold py-2"
                >
                  Go Back
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center flex-1 py-6 md:py-10 space-y-6">
                <div className="space-y-4 text-center w-full">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">Authenticator Code</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="000 000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-4xl md:text-4xl tracking-[0.3em] font-black h-20 md:h-20 w-full max-w-[280px] border-2 border-violet-100 focus:border-violet-500 rounded-2xl bg-violet-50/30 transition-all shadow-inner mx-auto"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && code.length === 6) {
                        handleVerify();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col md:flex-row gap-2 mt-auto pt-6 border-t border-gray-50">
                <Button variant="ghost" onClick={onClose} disabled={loading} className="order-2 md:order-1 flex-1 font-bold text-gray-400 py-6 md:py-2">
                  Cancel
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={loading || code.length !== 6}
                  className="order-1 md:order-2 flex-1 bg-violet-600 text-white hover:bg-violet-700 font-black py-6 md:py-2 shadow-lg shadow-violet-200"
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
                    className="text-[11px] font-bold text-violet-500 hover:text-violet-700 underline underline-offset-4 disabled:opacity-50"
                  >
                    {recoveryLoading ? 'Processing...' : (userRole?.toLowerCase() === 'cashier' ? 'Help! I lost my authenticator' : 'Lost Authenticator? Reset via Email')}
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
