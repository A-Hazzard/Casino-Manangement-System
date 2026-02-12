import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, ArrowRightCircle, Calendar, Landmark, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';

type VaultInitializeModalProps = {
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

export default function VaultInitializeModal({
  open,
  onClose,
  onConfirm,
  expectedBalance,
  expectedDenominations,
  isInitial = false
}: VaultInitializeModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm({
        notes: notes.trim() || undefined,
        // We pass undefined for balance/denoms to let backend use previous close
      });
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error initializing vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            {isInitial ? <Sparkles className="h-5 w-5 text-amber-500" /> : <Calendar className="h-5 w-5 text-violet-600" />}
            {isInitial ? "Initialize New Vault" : "Open Vault Shift"}
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            {isInitial 
              ? "Setup your location's vault for the very first time."
              : "Verify balance and start the daily vault session."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Expected Balance Card - Premium Style */}
          {!isInitial && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-6 shadow-sm">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Expected Opening Balance</p>
                <p className="text-4xl font-black tracking-tight text-violet-700">{formatAmount(expectedBalance)}</p>
                
                {expectedDenominations && expectedDenominations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-violet-200/50 grid grid-cols-3 gap-2">
                    {expectedDenominations.filter(d => d.quantity > 0).map(d => (
                      <div key={d.denomination} className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-violet-400/80">${d.denomination} Bills</span>
                        <span className="text-sm font-bold text-violet-600">x{d.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 text-violet-100/50" />
            </div>
          )}

          {isInitial && (
            <div className="flex items-start gap-4 rounded-2xl bg-amber-50 p-5 border-2 border-amber-100/50 shadow-sm">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                 <AlertTriangle className="h-5 w-5 text-amber-600" />
               </div>
               <div className="space-y-1">
                 <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Zero Balance Start</p>
                 <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                   This vault is currently empty. Initialize to start with <span className="font-bold underline">$0.00</span>. 
                   You can add inventory immediately after.
                 </p>
               </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3 px-1">
            <Label htmlFor="init-notes" className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
               <MessageSquare className="h-3 w-3" />
               Opening Notes
            </Label>
            <Textarea
              id="init-notes"
              placeholder="e.g. Starting Monday morning shift..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="resize-none bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
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
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="w-full font-bold text-gray-500">
            Go Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Label } from '@/components/shared/ui/label';
