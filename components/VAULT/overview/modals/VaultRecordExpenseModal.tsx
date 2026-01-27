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

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import type { ExpenseCategory } from '@/shared/types/vault';

type VaultRecordExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    category: ExpenseCategory;
    amount: number;
    description: string;
    date: Date;
  }) => Promise<void>;
};

// ============================================================================
// Constants
// ============================================================================
/**
 * Available expense categories for recording vault expenses
 */
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Supplies',
  'Repairs',
  'Bills',
  'Licenses',
  'Other',
];

export default function VaultRecordExpenseModal({
  open,
  onClose,
  onConfirm,
}: VaultRecordExpenseModalProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Parse amount string to number
   * Returns 0 if parsing fails
   */
  const amountNum = parseFloat(amount) || 0;

  /**
   * Check if form is valid for submission
   * Requires category selection, amount > 0, and non-empty description
   */
  const isValid =
    category !== '' && amountNum > 0 && description.trim().length > 0;

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle amount input change
   * Validates input to allow only numbers and one decimal point
   * Clears amount error when user starts typing
   *
   * @param value - Input value as string
   */
  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const formatted =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setAmount(formatted);
    if (errors.amount) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.amount;
        return newErrors;
      });
    }
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
        description: description.trim(),
        date,
      });
      // Reset form on success
      setCategory('');
      setAmount('');
      setDescription('');
      setDate(new Date());
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error recording expense:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   * Resets form state and calls onClose callback
   * Prevents closing while submission is in progress
   */
  const handleClose = () => {
    if (loading) return;
    setCategory('');
    setAmount('');
    setDescription('');
    setDate(new Date());
    setErrors({});
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
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category:</Label>
            <Select
              value={category}
              onValueChange={value => {
                setCategory(value as ExpenseCategory);
                if (errors.category) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.category;
                    return newErrors;
                  });
                }
              }}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select Category:" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map(cat => (
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

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount:</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="Enter expense amount"
              value={amount}
              onChange={e => handleAmountChange(e.target.value)}
              className="w-full"
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

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
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
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
