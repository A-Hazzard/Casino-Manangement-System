import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import {
  AlertTriangle,
  ArrowRightCircle,
  Calendar,
  Landmark,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type VaultOverviewInitializeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    denominations?: Denomination[];
    totalAmount?: number;
    notes?: string;
  }) => Promise<void>;
  expectedBalance: number;
  expectedDenominations: Denomination[];
  isInitial?: boolean;
};

export default function VaultOverviewInitializeModal({
  open,
  onClose,
  onConfirm,
  expectedBalance,
  expectedDenominations,
  isInitial = false,
}: VaultOverviewInitializeModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const [loading, setLoading] = useState(false);
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleSubmit = async () => {
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    setLoading(true);
    try {
      await onConfirm({});
    } catch (error) {
      console.error('Error initializing vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-md">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
            <DialogTitle className="flex items-center gap-2 text-violet-900">
              {isInitial ? (
                <Sparkles className="h-5 w-5 text-amber-500" />
              ) : (
                <Calendar className="h-5 w-5 text-violet-600" />
              )}
              {isInitial ? 'Initialize New Vault' : 'Open Vault Shift'}
            </DialogTitle>
            <DialogDescription className="text-violet-700/80">
              {isInitial
                ? "Setup your location's vault for the very first time."
                : 'Verify balance and start the daily vault session.'}
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[75vh]">
            {/* Expected Balance Card - Premium Style */}
            {!isInitial && (
              <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-sm">
                <div className="relative z-10">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-violet-400">
                    Expected Opening Balance
                  </p>
                  <p className="text-4xl font-black tracking-tight text-violet-700">
                    {formatAmount(expectedBalance)}
                  </p>

                  {expectedDenominations &&
                    expectedDenominations.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-violet-200/50 pt-4">
                        {expectedDenominations
                          .filter(denom => denom.quantity > 0)
                          .map(d => (
                            <div key={d.denomination} className="flex flex-col">
                              <span className="text-[9px] font-black uppercase text-violet-400/80">
                                ${d.denomination} Bills
                              </span>
                              <span className="text-sm font-bold text-violet-600">
                                x{d.quantity}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
                <Landmark className="absolute -bottom-4 -right-4 h-24 w-24 text-violet-100/50" />
              </div>
            )}

            {isInitial && (
              <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-100/50 bg-amber-50 p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight text-amber-900">
                    Zero Balance Start
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-amber-800/80">
                    This vault is currently empty. Initialize to start with{' '}
                    <span className="font-bold underline">$0.00</span>. You can
                    add inventory immediately after.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 border-t bg-gray-50 p-4">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-12 w-full rounded-xl bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Initializing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Start Vault Shift</span>
                  <ArrowRightCircle className="h-5 w-5" />
                </div>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
              className="w-full font-bold text-gray-500"
            >
              Go Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName={isInitial ? 'Initialize New Vault' : 'Open Vault Shift'}
      />
    </>
  );
}
