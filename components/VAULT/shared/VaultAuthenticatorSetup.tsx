import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Copy, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type VaultAuthenticatorSetupProps = {
  initialShowQr?: boolean;
  onConfirmed: () => void;
  onCancel: () => void;
};

export default function VaultAuthenticatorSetup({
  initialShowQr = true,
  onConfirmed,
  onCancel,
}: VaultAuthenticatorSetupProps) {
  const [data, setData] = useState<{
    qrCodeUrl: string;
    secret: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(initialShowQr);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    fetchSetup();
  }, []);

  const fetchSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/totp/setup', { method: 'POST' });
      const resData = await response.json();
      if (response.ok) {
        setData(resData);
        // If they already have a secret (implied by secret persistence in DB)
        // we might want to hide QR, but the setup API always returns the current secret.
        // We can't easily know if they scanned it before from THIS endpoint alone,
        // but we can default to showing it and let them hide it, or use the status endpoint.
      } else {
        toast.error(resData.error || 'Failed to initiate setup');
      }
    } catch {
      toast.error('Connection error while setting up authenticator');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    setConfirming(true);
    try {
      const response = await fetch('/api/auth/totp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success('Authenticator successfully enabled');
        onConfirmed();
      } else {
        toast.error(resData.error || 'Invalid code. Please try again.');
      }
    } catch {
      toast.error('Failed to confirm setup');
    } finally {
      setConfirming(false);
    }
  };

  const copySecret = () => {
    if (data?.secret) {
      navigator.clipboard.writeText(data.secret);
      toast.success('Secret copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="px-4 text-center text-sm font-medium text-gray-500">
          Preparing your secure authentication...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <div className="space-y-2 px-1">
        <p className="text-sm leading-relaxed text-gray-500">
          {showQr
            ? 'Scan this QR code with Google Authenticator or your preferred 2FA app to get started.'
            : 'Enter the verification code from your authenticator app to complete setup.'}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-1">
        {showQr && data?.qrCodeUrl && (
          <div className="rounded-2xl border-2 border-violet-100 bg-white p-2 shadow-sm transition-all duration-300 sm:p-3">
            <img
              src={data.qrCodeUrl}
              alt="2FA QR Code"
              className="h-40 w-40 sm:h-48 sm:w-48"
            />
          </div>
        )}

        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {showQr ? 'Manual Setup Key' : 'Your Setup Key'}
            </p>
            <button
              onClick={() => setShowQr(!showQr)}
              className="text-[10px] font-bold text-violet-600 underline-offset-2 hover:underline"
            >
              {showQr ? 'Hide QR' : 'Show QR Code'}
            </button>
          </div>
          <div className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
            <code className="flex-1 select-all truncate font-mono text-[11px] font-bold text-gray-700 sm:text-xs">
              {data?.secret}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-violet-600 transition-colors hover:bg-violet-100"
              onClick={copySecret}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-4 border-t border-gray-100 pt-6">
        <div className="space-y-2">
          <p className="px-1 text-xs font-black uppercase tracking-wider text-gray-500">
            Verification Code
          </p>
          <Input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="0 0 0 0 0 0"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="h-12 rounded-xl border-2 border-violet-100 bg-violet-50/30 text-center text-2xl font-black tracking-[0.2em] transition-all focus:border-violet-500 sm:h-14 sm:text-3xl sm:tracking-[0.4em]"
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="order-2 flex-1 py-6 font-bold text-gray-500 sm:order-1 sm:py-2"
          >
            Later
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming || code.length !== 6}
            className="order-1 flex-1 bg-violet-600 py-6 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700 sm:order-2 sm:py-2"
          >
            {confirming ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Confirming...</span>
              </div>
            ) : (
              'Confirm Setup'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
