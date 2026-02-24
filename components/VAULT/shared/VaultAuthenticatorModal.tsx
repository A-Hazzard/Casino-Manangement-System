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

  // Check setup status on open
  useEffect(() => {
    if (open) {
      checkSetup();
      setCode('');
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full h-full md:h-auto md:w-[95vw] md:max-w-md md:max-h-[90dvh] rounded-none md:rounded-3xl p-4 md:p-6 gap-0 flex flex-col overflow-y-auto transition-all duration-300 !z-[300]" backdropClassName="!z-[290] bg-black/60 backdrop-blur-sm">
        <DialogHeader className="pb-4 border-b border-gray-50">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-gray-900">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            Two-Factor Authentication
          </DialogTitle>
          {!checkingSetup && !needsSetup && (
            <DialogDescription className="text-sm font-medium text-gray-500 mt-2">
              Please enter the 6-digit code from your Google Authenticator app to perform <b>{actionName}</b>.
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
