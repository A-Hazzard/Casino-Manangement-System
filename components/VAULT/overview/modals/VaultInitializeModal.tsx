import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, ArrowRightCircle, Calendar, Cloud, Landmark, MessageSquare, Moon, RefreshCw, Sparkles, Sun } from 'lucide-react';
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

          {/* Shift Selection */}
          <div className="space-y-3 px-1">
            <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
               Select Shift Period
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Morning', icon: Sun, color: 'text-amber-500', bg: 'hover:bg-amber-50' },
                { label: 'Afternoon', icon: Cloud, color: 'text-blue-400', bg: 'hover:bg-blue-50' },
                { label: 'Night', icon: Moon, color: 'text-indigo-500', bg: 'hover:bg-indigo-50' },
                { label: 'Other', icon: MessageSquare, color: 'text-gray-500', bg: 'hover:bg-gray-50' }
              ].map(item => {
                const isSelected = notes === item.label || (item.label === 'Other' && notes.length > 0 && !['Morning', 'Afternoon', 'Night'].includes(notes));
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setNotes(item.label === 'Other' ? '' : item.label)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                      notes === item.label 
                        ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200" 
                        : "bg-white border-gray-100 text-gray-600",
                      !isSelected && item.bg
                    )}
                  >
                    <Icon className={cn("h-4 w-4", notes === item.label ? "text-white" : item.color)} />
                    <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            {(notes === 'Other' || (notes.length > 0 && !['Morning', 'Afternoon', 'Night'].includes(notes))) && (
              <Textarea
                id="init-notes"
                placeholder="e.g. Special event opening..."
                value={notes === 'Other' ? '' : notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="resize-none bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm mt-2"
              />
            )}
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

