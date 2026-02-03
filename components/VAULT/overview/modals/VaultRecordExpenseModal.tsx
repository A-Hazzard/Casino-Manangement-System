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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination, ExpenseCategory } from '@/shared/types/vault';
import { CameraIcon, UploadIcon } from '@radix-ui/react-icons';
import { useRef, useState } from 'react';

type VaultRecordExpenseModalProps = {
  open: boolean;
  onClose: () => void;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Operational Expense</DialogTitle>
          <DialogDescription>
            Record an operational expense that will be deducted from the vault
            balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left Column: Form Fields */}
            <div className="space-y-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="category">Category:</Label>
                <Select
                  value={category}
                  onValueChange={value => {
                    setCategory(value as ExpenseCategory);
                  }}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select Category:" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Supplies', 'Repairs', 'Bills', 'Licenses', 'Other'].map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Denomination Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                     <Label>Cash Paid (Required):</Label>
                     <span className="text-sm font-bold text-gray-900">{formatAmount(amountNum)}</span>
                </div>
                <div className="rounded-md border p-3 bg-gray-50/50">
                    <DenominationInputGrid
                        denominations={denominations}
                        onChange={setDenominations}
                    />
                </div>
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date:</Label>
                <Input
                  id="date"
                  type="date"
                  value={date.toISOString().split('T')[0]}
                  onChange={e => {
                    const newDate = new Date(e.target.value);
                    setDate(newDate);
                    if (errors.date) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.date;
                        return newErrors;
                      });
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Right Column: Description & Upload */}
            <div className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description:</Label>
                <Textarea
                  id="description"
                  placeholder="Bought printer paper..."
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value);
                    if (errors.description) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.description;
                        return newErrors;
                      });
                    }
                  }}
                  rows={3}
                  className="resize-none"
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* File Upload Area */}
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-700">
                  Receipt / Attachment (Optional)
                </Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                    dragActive
                      ? 'border-buttonActive bg-buttonActive/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-button">
                        <UploadIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="truncate text-sm font-medium text-gray-700 max-w-[180px]">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="mt-1 h-7 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <CameraIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-600">
                        <button
                          type="button"
                          onClick={handleChooseFileClick}
                          className="font-medium text-buttonActive hover:text-buttonActive/80"
                        >
                          Upload
                        </button>{' '}
                        or drag
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="bg-buttonActive text-white hover:bg-buttonActive/90"
          >
            {loading ? 'Recording...' : 'Record Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
