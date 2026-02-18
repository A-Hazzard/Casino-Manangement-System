'use client';

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
import { Label } from '@/components/shared/ui/label';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { getDenominationValues, getInitialDenominationRecord, recordToDenominations } from '@/lib/utils/vault/denominations';
import { AlertCircle, MessageSquare, RotateCcw, ShieldAlert, UserMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VaultForceEndShiftModalProps {
  open: boolean;
  onClose: () => void;
  cashier: {
    _id: string; // shiftId
    cashierId?: string; // userId
    username: string;
    cashierName?: string;
  } | null;
  licenseeId?: string;
  locationId?: string;
  onSuccess: () => void;
}

export default function VaultForceEndShiftModal({
  open,
  onClose,
  cashier,
  licenseeId,
  locationId,
  onSuccess,
}: VaultForceEndShiftModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const [denominations, setDenominations] = useState<Record<string, number>>({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const denomValues = getDenominationValues(licenseeId);

  useEffect(() => {
    if (open) {
      setDenominations(getInitialDenominationRecord(licenseeId));
      setTouchedDenominations(new Set());
      setNotes('');
    }
  }, [open, licenseeId]);

  const shiftTotal = Object.entries(denominations).reduce(
    (sum, [val, qty]) => sum + (Number(val) * qty), 
    0
  );

  const handleSubmit = async () => {
    if (!cashier || !locationId) return;
    
    setLoading(true);
    try {
      const denoms = recordToDenominations(denominations);

      const res = await fetch('/api/vault/cashier-shift/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: cashier.cashierId || cashier._id, // Use cashierId if available
          locationId: locationId,
          denominations: denoms,
          physicalCount: shiftTotal,
          notes: notes.trim()
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Shift ended for ${cashier.username}. Move to Pending Review.`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to end shift');
      }
    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('An error occurred while ending shift');
    } finally {
      setLoading(false);
    }
  };

  const allTouched = denomValues.every(d => touchedDenominations.has(d.toString()));
  const isValid = (shiftTotal > 0 || allTouched);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent 
        className="sm:max-w-[500px] !z-[200]"
        backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-600" />
            Force End Shift
          </DialogTitle>
          <DialogDescription>
            Collect the remaining float from <strong>{cashier?.username}</strong> to end their shift.
            This will move the shift to <strong>Pending Review</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
           <div className="grid grid-cols-1 gap-y-4">
              {denomValues.map(denom => (
                <div key={denom} className="flex items-center gap-4">
                   <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`force-denom-${denom}`} className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        ${denom} Notes (Count)
                      </Label>
                      <Input
                        id={`force-denom-${denom}`}
                        type="number"
                        min="0"
                        className={`h-12 text-lg font-bold transition-all ${touchedDenominations.has(denom.toString()) ? 'border-green-500 bg-green-50' : ''}`}
                        value={denominations[denom.toString()] || ''}
                        onChange={(e) => {
                           const val = Math.max(0, parseInt(e.target.value) || 0);
                           setDenominations(prev => ({
                              ...prev,
                              [denom.toString()]: val
                            }));
                           setTouchedDenominations(prev => {
                              const next = new Set(prev);
                              next.add(denom.toString());
                              return next;
                           });
                        }}
                        placeholder="0"
                      />
                   </div>
                </div>
              ))}
           </div>

           <div className="bg-red-50 p-4 rounded-lg flex items-center justify-between border border-red-200">
              <span className="font-semibold text-red-800">Total Collected:</span>
              <span className="text-2xl font-black text-red-600">{formatAmount(shiftTotal)}</span>
           </div>

           <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Reason for Force Ending
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'No-Show', icon: UserMinus, color: 'text-orange-500', bg: 'hover:bg-orange-50' },
                  { label: 'Lockout', icon: ShieldAlert, color: 'text-red-500', bg: 'hover:bg-red-50' },
                  { label: 'Emergency', icon: AlertCircle, color: 'text-blue-500', bg: 'hover:bg-blue-50' },
                  { label: 'Other', icon: MessageSquare, color: 'text-gray-500', bg: 'hover:bg-gray-50' }
                ].map(item => {
                  const isSelected = notes === item.label || (item.label === 'Other' && notes.length > 0 && !['No-Show', 'Lockout', 'Emergency'].includes(notes));
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setNotes(item.label === 'Other' ? '' : item.label)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                        notes === item.label 
                          ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-200" 
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
              {(notes === 'Other' || (notes.length > 0 && !['No-Show', 'Lockout', 'Emergency'].includes(notes))) && (
                <textarea
                  id="force-shift-notes"
                  className="w-full p-3 text-sm border-2 border-gray-100 rounded-xl min-h-[80px] focus:bg-white bg-gray-50/50 transition-all focus:border-red-500/30"
                  placeholder="Provide additional context for this force action..."
                  value={notes === 'Other' ? '' : notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}
           </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isValid}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Processing...' : 'Confirm & End Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
