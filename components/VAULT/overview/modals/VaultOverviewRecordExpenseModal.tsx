/**
 * Vault Overview Record Expense Modal Component
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
 * @module components/VAULT/overview/modals/VaultOverviewRecordExpenseModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import MultiSelectDropdown from '@/components/shared/ui/common/MultiSelectDropdown';
import SearchableSelect from '@/components/shared/ui/common/SearchableSelect';
import { DatePicker } from '@/components/shared/ui/date-picker';
import DenominationInputGrid from '@/components/shared/ui/DenominationInputGrid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { Textarea } from '@/components/shared/ui/textarea';
import { CARIBBEAN_BANKS } from '@/lib/constants/banks';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination, ExpenseCategory } from '@/shared/types/vault';
import axios from 'axios';
import {
    Briefcase,
    Coffee,
    FileText,
    Landmark,
    Lightbulb,
    Loader2,
    Receipt,
    RefreshCw,
    User,
    Wrench
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type VaultOverviewRecordExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  vaultDenominations?: Denomination[];
  onConfirm: (data: {
    category: ExpenseCategory;
    amount: number;
    denominations: Denomination[];
    description?: string;
    date: Date;
    file?: File;
    bankDetails?: Record<string, string>;
    expenseDetails?: Record<string, unknown>;
  }) => Promise<void>;
};

export default function VaultOverviewRecordExpenseModal({
  open,
  onClose,
  vaultDenominations = [],
  onConfirm,
}: VaultOverviewRecordExpenseModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  
  // Denomination State
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(new Set());

  const denomsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);

  // Update denominations when licencee changes or modal opens
  useEffect(() => {
    if (open) {
      setDenominations(denomsList.map(denom => ({ 
        denomination: denom as Denomination['denomination'], 
        quantity: 0 
      })));
      setTouchedDenominations(new Set());
    }
  }, [denomsList, open]);

  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  // Category Specific State
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountType: '',
    transit: '',
    branch: '',
    nameOnAccount: '',
  });
  const [expenseDetails, setExpenseDetails] = useState({
    vendor: '',
    invoiceNumber: '',
    serviceProvider: '',
    isMachineRepair: false,
    machineIds: [] as string[],
    billerName: '',
    billingPeriod: '',
    referenceNumber: '',
    workerName: '',
  });

  const [machines, setMachines] = useState<{id: string, label: string, displayNode?: React.ReactNode}[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);

  useEffect(() => {
    if (open && category === 'Repairs' && expenseDetails.isMachineRepair) {
      const fetchMachines = async () => {
        setLoadingMachines(true);
        try {
          const response = await axios.get('/api/reports/machines', {
            params: {
              type: 'overview',
              limit: 1000,
              licencee: selectedLicencee !== 'all' ? selectedLicencee : undefined,
            },
          });
          const fetchedMachines = response.data.data || [];
          interface APIMachine {
            machineId?: string;
            _id?: string;
            serialNumber?: string;
            customName?: string;
            custom?: { name: string };
            gameTitle?: string;
            game?: string;
          }
          setMachines(
            fetchedMachines.map((m: APIMachine) => ({
               id: m.machineId || m._id || m.serialNumber || '',
               label: m.serialNumber || m.customName || m.custom?.name || 'N/A', // fallback text label for dropdown search filter
               displayNode: formatMachineDisplayNameWithBold({
                   ...m,
                   game: m.gameTitle === '(game name not provided)' ? '' : (m.gameTitle || m.game),
                   custom: m.custom || (m.customName ? { name: m.customName } : undefined)
               })
            }))
          );
        } catch (error) {
          console.error('Failed to fetch machines:', error);
        } finally {
          setLoadingMachines(false);
        }
      };
      
      fetchMachines();
    }
  }, [open, category, expenseDetails.isMachineRepair, selectedLicencee]);

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
  const isAllTouched = useMemo(() => denomsList.every(d => touchedDenominations.has(Number(d))), [denomsList, touchedDenominations]);
  const isValid =
    category !== '' && (amountNum > 0 || isAllTouched);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
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
    if (category === 'Repairs' && expenseDetails.isMachineRepair && expenseDetails.machineIds.length === 0) {
      newErrors.machines = 'Please select at least one machine';
    }
    if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    // Date validation - not in future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      newErrors.date = 'Date cannot be in the future';
    }

    if (category === 'Bank Account') {
      if (!bankDetails.nameOnAccount.trim()) newErrors.nameOnAccount = 'Required';
      if (!bankDetails.bankName.trim()) newErrors.bankName = 'Required';
      if (!bankDetails.accountNumber.trim()) newErrors.accountNumber = 'Required';
      if (!bankDetails.accountType.trim()) newErrors.accountType = 'Required';
    }

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

    // Trigger TOTP verification
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    setLoading(true);
    try {
      await onConfirm({
        category: category as ExpenseCategory,
        amount: amountNum,
        denominations,
        description: description.trim(),
        date,
        bankDetails,
        expenseDetails,
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
    setDenominations(denomsList.map(denom => ({
      denomination: denom as Denomination['denomination'],
      quantity: 0,
    })));
    setTouchedDenominations(new Set());
    setDescription('');
    setDate(new Date());
    setBankDetails({
      bankName: '',
      accountNumber: '',
      accountType: '',
      transit: '',
      branch: '',
      nameOnAccount: '',
    });
    setExpenseDetails({
      vendor: '',
      invoiceNumber: '',
      serviceProvider: '',
      isMachineRepair: false,
      machineIds: [],
      billerName: '',
      billingPeriod: '',
      referenceNumber: '',
      workerName: '',
    });
    setErrors({});
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
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="md:max-w-3xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Receipt className="h-5 w-5 text-violet-600" />
            Record Operation Expense
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Deduct operational costs from the vault inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 md:max-h-[75vh] custom-scrollbar">
          {/* Category Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Expense category
              </Label>
              {errors.category && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
              {[
                { label: 'Food/Drinks', icon: Coffee },
                { label: 'Repairs', icon: Wrench },
                { label: 'Bills', icon: Lightbulb },
                { label: 'Worker/Employee', icon: User },
                { label: 'Bank Account', icon: Landmark },
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
            {/* Left side - Cash/Bank and Date */}
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
                      touchedDenominations={touchedDenominations}
                      onTouchedChange={setTouchedDenominations}
                    />
                  </div>
                  
                    <DatePicker 
                      date={date}
                      setDate={(d: Date | undefined) => setDate(d || new Date())}
                      disabledDates={{ after: new Date() }}
                    />
                  </div>
                </div>

                {/* Summary Card */}
                <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-sm text-violet-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Payout Value</span>
                    <Receipt className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-3xl font-black tracking-tight text-violet-700">{formatAmount(amountNum)}</span>
                    <p className="text-[10px] text-violet-600/60 font-bold uppercase tracking-tight">Total Expense Amount</p>
                  </div>
                </div>
              </div>

            {/* Right side - Dynamic Details */}
            <div className="md:col-span-7 space-y-6">
              {category === 'Bank Account' && (
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                   <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Bank Details</Label>
                   <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Name on Account <span className="text-red-500">*</span></Label>
                        <input
                          type="text" placeholder="John Doe"
                          value={bankDetails.nameOnAccount} onChange={e => setBankDetails({...bankDetails, nameOnAccount: e.target.value})}
                          className={cn("w-full px-3 py-2 rounded-xl border text-sm focus:border-violet-500 outline-none", errors.nameOnAccount ? "border-red-500" : "border-gray-200")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Bank Name <span className="text-red-500">*</span></Label>
                        <SearchableSelect
                          options={CARIBBEAN_BANKS}
                          value={bankDetails.bankName}
                          onChange={val => setBankDetails({...bankDetails, bankName: val})}
                          placeholder="Select Bank..."
                          searchPlaceholder="Search banks..."
                          error={!!errors.bankName}
                        />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Account Number <span className="text-red-500">*</span></Label>
                        <input
                          type="text" placeholder="123456789"
                          value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                          className={cn("w-full px-3 py-2 rounded-xl border text-sm focus:border-violet-500 outline-none", errors.accountNumber ? "border-red-500" : "border-gray-200")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Account Type <span className="text-red-500">*</span></Label>
                        <input
                          type="text" placeholder="Chequing"
                          value={bankDetails.accountType} onChange={e => setBankDetails({...bankDetails, accountType: e.target.value})}
                          className={cn("w-full px-3 py-2 rounded-xl border text-sm focus:border-violet-500 outline-none", errors.accountType ? "border-red-500" : "border-gray-200")}
                        />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Transit Number (Optional)</Label>
                        <input
                          type="text" placeholder="Transit Number"
                          value={bankDetails.transit} onChange={e => setBankDetails({...bankDetails, transit: e.target.value})}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-violet-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Branch (Optional)</Label>
                        <input
                          type="text" placeholder="Branch Name/Code"
                          value={bankDetails.branch} onChange={e => setBankDetails({...bankDetails, branch: e.target.value})}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-violet-500 outline-none"
                        />
                      </div>
                   </div>
                </div>
              )}

              {/* Category specifics */}
              {category && category !== 'Other' && category !== 'Bank Account' && category !== 'Food/Drinks' && (
                <div className="space-y-4 rounded-2xl border border-gray-100 p-4">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{category} Details</Label>
                  <div className="space-y-3">
                    {category === 'Worker/Employee' && (
                      <input type="text" placeholder="Worker / Employee Name" value={expenseDetails.workerName} onChange={e => setExpenseDetails({...expenseDetails, workerName: e.target.value})} className="w-full px-3 py-2 rounded-xl border text-sm" />
                    )}
                    {category === 'Repairs' && (
                      <>
                        {!expenseDetails.isMachineRepair && (
                          <input type="text" placeholder="Service Provider" value={expenseDetails.serviceProvider} onChange={e => setExpenseDetails({...expenseDetails, serviceProvider: e.target.value})} className="w-full px-3 py-2 rounded-xl border" />
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" checked={expenseDetails.isMachineRepair} onChange={e => setExpenseDetails({...expenseDetails, isMachineRepair: e.target.checked})} className="rounded text-violet-600 focus:ring-violet-500" />
                          Is this a machine-related repair?
                        </label>
                        {expenseDetails.isMachineRepair && (
                          <div className="space-y-2 mt-2">
                             <div className="flex items-center justify-between px-1">
                               <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Select Machine(s)</Label>
                               {errors.machines && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
                             </div>
                             {loadingMachines ? (
                               <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 font-medium">
                                 <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                                 Machine selection loading...
                               </div>
                             ) : (
                               <MultiSelectDropdown
                                 options={machines}
                                 selectedIds={expenseDetails.machineIds}
                                 onChange={(ids) => setExpenseDetails({...expenseDetails, machineIds: ids})}
                                 placeholder="Select machines that were repaired..."
                                 label="machines"
                               />
                             )}
                          </div>
                        )}
                      </>
                    )}
                    {category === 'Bills' && (
                      <>
                        <input type="text" placeholder="Biller Name" value={expenseDetails.billerName} onChange={e => setExpenseDetails({...expenseDetails, billerName: e.target.value})} className="w-full px-3 py-2 rounded-xl border" />
                        <input type="text" placeholder="Billing Period" value={expenseDetails.billingPeriod} onChange={e => setExpenseDetails({...expenseDetails, billingPeriod: e.target.value})} className="w-full px-3 py-2 rounded-xl border" />
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                   <FileText className="h-3 w-3" />
                   {category === 'Other' ? 'Detailed Description' : 'Additional Notes (Optional)'}
                </Label>
                <Textarea
                  id="description"
                  placeholder={category === 'Other' ? "Please provide full details..." : "What was this expense for?"}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none bg-gray-50/50 border-gray-100 rounded-2xl focus:bg-white transition-all text-sm border-2 focus:border-violet-500/30"
                />
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
    <VaultAuthenticatorModal
      open={showAuthenticator}
      onClose={() => setShowAuthenticator(false)}
      onVerified={handleAuthVerified}
      actionName="Record Expense"
    />
    </>
  );
}
