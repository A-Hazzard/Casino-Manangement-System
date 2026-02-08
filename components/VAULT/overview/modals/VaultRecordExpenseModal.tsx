/**
 * Vault Record Expense Modal Component
 *
 * Modal for recording operational expenses from the vault.
 *
 * Features:
 * - Category selection dropdown
 * - Amount input
 * - Description textarea
 * - Date picker (defaults to today)
 * - Form validation
 * - Loading state on submit
 *
 * @module components/VAULT/modals/VaultRecordExpenseModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import DenominationInputGrid from '@/components/shared/ui/DenominationInputGrid';
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
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { Denomination, ExpenseCategory } from '@/shared/types/vault';
import {
    Briefcase,
    Calendar as CalendarIcon,
    Camera,
    FileText,
    Lightbulb,
    Receipt,
    RefreshCw,
    ShieldCheck,
    Tag,
    Upload,
    Wrench
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type VaultRecordExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  vaultDenominations?: Denomination[];
  onConfirm: (data: {
    category: ExpenseCategory;
    amount: number;
    denominations: Denomination[];
    description: string;
    date: Date;
    file?: File;
  }) => Promise<void>;
};

// ... constants ...

export default function VaultRecordExpenseModal({
  open,
  onClose,
  vaultDenominations = [],
  onConfirm,
}: VaultRecordExpenseModalProps) {
  const { formatAmount } = useCurrencyFormat();
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  
  // Denomination State
  const [denominations, setDenominations] = useState<Denomination[]>([
    { denomination: 100, quantity: 0 },
    { denomination: 50, quantity: 0 },
    { denomination: 20, quantity: 0 },
    { denomination: 10, quantity: 0 },
    { denomination: 5, quantity: 0 },
    { denomination: 1, quantity: 0 },
  ]);

  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Calculate total amount from denominations
   */
  const amountNum = denominations.reduce(
    (acc, curr) => acc + curr.denomination * curr.quantity,
    0
  );

  /**
   * Check if form is valid for submission
   */
  const isValid =
    category !== '' && amountNum > 0 && description.trim().length > 0;

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  // File Upload Handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle form submission
   * Validates form data, calls onConfirm callback, and resets form on success
   */
  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!category) {
      newErrors.category = 'Please select a category';
    }
    if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (description.trim().length === 0) {
      newErrors.description = 'Description is required';
    }
    // Date validation - not in future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      newErrors.date = 'Date cannot be in the future';
    }

    // Real-time stock check
    const overages = denominations.some(requested => {
      if (requested.quantity <= 0) return false;
      const available = vaultDenominations.find(d => d.denomination === requested.denomination)?.quantity || 0;
      return requested.quantity > available;
    });

    if (overages) {
      toast.error('Insufficient Stock', {
        description: 'One or more denominations exceed the available vault inventory.'
      });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        category: category as ExpenseCategory,
        amount: amountNum,
        denominations, // Pass all denominations (including 0s, backend can filter if needed or we filter here)
        description: description.trim(),
        date,
        file: selectedFile || undefined,
      });
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error recording expense:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form state
   */
  const handleReset = () => {
    setCategory('');
    setDenominations([
      { denomination: 100, quantity: 0 },
      { denomination: 50, quantity: 0 },
      { denomination: 20, quantity: 0 },
      { denomination: 10, quantity: 0 },
      { denomination: 5, quantity: 0 },
      { denomination: 1, quantity: 0 },
    ]);
    setDescription('');
    setDate(new Date());
    setErrors({});
    setSelectedFile(null);
    setDragActive(false);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (loading) return;
    handleReset();
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Receipt className="h-5 w-5 text-violet-600" />
            Record Operation Expense
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Deduct operational costs from the vault inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Category Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Expense category
              </Label>
              {errors.category && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Supplies', icon: Tag },
                { label: 'Repairs', icon: Wrench },
                { label: 'Bills', icon: Lightbulb },
                { label: 'Licenses', icon: ShieldCheck },
                { label: 'Other', icon: Briefcase }
              ].map(cat => {
                const isSelected = category === cat.label;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategory(cat.label as ExpenseCategory)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2",
                      isSelected 
                        ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200" 
                        : "bg-white border-gray-100 text-gray-600 hover:border-violet-200 hover:bg-violet-50/30"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isSelected ? "text-white" : "text-violet-500")} />
                    <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left side - Cash and Date */}
            <div className="md:col-span-5 space-y-6">
              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Cash Paid & Date
                </Label>
                
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 shadow-inner">
                    <DenominationInputGrid
                      denominations={denominations}
                      onChange={setDenominations}
                      stock={vaultDenominations}
                    />
                  </div>
                  
                  <div className="relative group">
                    <Input
                      id="date"
                      type="date"
                      value={date.toISOString().split('T')[0]}
                      onChange={e => setDate(new Date(e.target.value))}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-10 pl-10 bg-white border-gray-200 rounded-xl focus:border-violet-500/50 transition-all font-bold text-sm"
                    />
                    <CalendarIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-gray-900 to-violet-900 rounded-2xl p-5 shadow-xl shadow-violet-900/10">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-violet-200 opacity-60">Payout Value</span>
                   <Receipt className="h-4 w-4 text-violet-400" />
                </div>
                <div className="space-y-0.5">
                   <span className="text-3xl font-black text-white tracking-tight">{formatAmount(amountNum)}</span>
                   <p className="text-[10px] text-violet-200/50 font-bold uppercase tracking-tight">Total Expense Amount</p>
                </div>
              </div>
            </div>

            {/* Right side - Description and Upload */}
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                   <FileText className="h-3 w-3" />
                   Expense Details
                </Label>
                <Textarea
                  id="description"
                  placeholder="What was this expense for? (e.g. Printer maintenance, office cleaning...)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none bg-gray-50/50 border-gray-100 rounded-2xl focus:bg-white transition-all text-sm border-2 focus:border-violet-500/30"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Receipt Attachment
                </Label>
                <div
                  className={cn(
                    "relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer group",
                    dragActive
                      ? 'border-violet-500 bg-violet-50/50 shadow-inner'
                      : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/10 bg-gray-50/30'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleChooseFileClick}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,application/pdf"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="truncate text-sm font-bold text-gray-700 max-w-[240px]">
                        {selectedFile.name}
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-red-500 hover:text-red-600 font-black uppercase text-[10px]"
                      >
                        Remove Attachment
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-200">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
                        <Camera className="h-6 w-6 text-violet-500" />
                      </div>
                      <div className="text-sm font-bold text-gray-500">
                        Drop receipt <span className="text-violet-600">here</span> or <span className="text-violet-600">click</span>
                      </div>
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        IMAGES OR PDF • MAX 10MB
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="order-2 sm:order-1 font-bold text-gray-500">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="order-1 sm:order-2 flex-1 h-12 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Recording Expense...
              </div>
            ) : 'Confirm Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
