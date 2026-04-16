/**
 * Password Update Modal Component
 * Modal for updating user password on first login (cashier temp password change)
 * or when a weak password is detected.
 *
 * Requires:
 * - currentPassword: The temp password (cashiers) or existing password (others)
 * - newPassword + confirmPassword: The new strong password
 *
 * @module components/shared/ui/PasswordUpdateModal
 */
'use client';

import { FormEvent } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { validatePasswordStrength } from '@/lib/utils/validation';
import {
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ============================================================================
// Types & Constants
// ============================================================================

type PasswordUpdateModalProps = {
  open: boolean;
  onClose?: () => void;
  /** Called with (currentPassword, newPassword, phone?). Return error string or null. */
  onUpdate: (
    currentPassword: string,
    newPassword: string,
    phone?: string
  ) => Promise<string | null>;
  loading?: boolean;
  /** If true, the modal cannot be dismissed — cashier must change their temp password. */
  isForced?: boolean;
  /** If true, user is a cashier changing their temp password (different messaging). */
  isCashierTempChange?: boolean;
  /** Optional logout handler to show a logout button in the footer (usually for forced changes) */
  onLogout?: () => void;
  /** Optional initial phone number to pre-fill the field */
  initialPhone?: string;
};

const PASSWORD_REQUIREMENTS = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  {
    label: 'Special character',
    test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

function omitProperty<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => k !== key)
  ) as Omit<T, K>;
}

// ============================================================================
// Component
// ============================================================================

const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  error?: string;
}) => (
  <div className="space-y-1.5">
    <Label
      htmlFor={id}
      className={cn(error ? 'text-red-600' : 'text-slate-700')}
    >
      {label}
    </Label>
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'border-slate-200 bg-white pr-10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0',
          error && 'border-red-300'
        )}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    {error && (
      <p className="flex items-center gap-1 text-xs font-medium text-red-600">
        <XCircle className="h-3 w-3" /> {error}
      </p>
    )}
  </div>
);

export default function PasswordUpdateModal({
  open,
  onClose,
  onUpdate,
  loading = false,
  isForced = false,
  isCashierTempChange = false,
  onLogout,
  initialPhone = '',
}: PasswordUpdateModalProps) {
  // === State ===
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // === Debouncing ===
  const debouncedPhone = useDebounce(phone, 2000);
  const debouncedNewPassword = useDebounce(newPassword, 2000);
  const debouncedConfirmPassword = useDebounce(confirmPassword, 2000);

  // === Effects ===
  // Initialize phone when modal opens or initialPhone changes
  useEffect(() => {
    if (open) {
      setPhone(''); // Keep empty to show placeholder by default
    }
  }, [open, initialPhone]);

  // === Computed ===
  const passwordStrength = newPassword
    ? validatePasswordStrength(newPassword)
    : null;

  // === Real-time Validation Effects ===
  // Phone validation
  useEffect(() => {
    if (!debouncedPhone.trim()) {
      setErrors(prev => omitProperty(prev, 'phone'));
      return;
    }

    const trimmedPhone = debouncedPhone.trim();
    const onlyAllowed = /^[0-9\s+()'\-]+$/.test(trimmedPhone);
    const plusCount = (trimmedPhone.match(/\+/g) || []).length;
    const openCount = (trimmedPhone.match(/\(/g) || []).length;
    const closeCount = (trimmedPhone.match(/\)/g) || []).length;
    const dashCount = (trimmedPhone.match(/-/g) || []).length;
    const plusAtStart =
      !trimmedPhone.includes('+') || trimmedPhone.indexOf('+') === 0;
    const digits = trimmedPhone.replace(/\D/g, '').length;
    const phoneOk =
      onlyAllowed &&
      plusCount <= 1 &&
      plusAtStart &&
      openCount <= 1 &&
      closeCount <= 1 &&
      dashCount <= 1 &&
      digits >= 7 &&
      digits <= 15;

    if (!phoneOk) {
      setErrors(prev => ({
        ...prev,
        phone:
          'Enter a valid phone number (e.g. +1 868 000-0000 or (868) 000-0000).',
      }));
    } else {
      setErrors(prev => omitProperty(prev, 'phone'));
    }
  }, [debouncedPhone]);

  useEffect(() => {
    if (!debouncedNewPassword) {
      setErrors(prev => omitProperty(prev, 'newPassword'));
      return;
    }

    const strength = validatePasswordStrength(debouncedNewPassword);
    if (!strength.isValid) {
      setErrors(prev => ({
        ...prev,
        newPassword: strength.feedback[0] || 'Password is too weak.',
      }));
    } else {
      setErrors(prev => omitProperty(prev, 'newPassword'));
    }
  }, [debouncedNewPassword]);

  useEffect(() => {
    if (!debouncedConfirmPassword) {
      setErrors(prev => omitProperty(prev, 'confirmPassword'));
      return;
    }

    if (newPassword !== debouncedConfirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match.',
      }));
    } else {
      setErrors(prev => omitProperty(prev, 'confirmPassword'));
    }
  }, [debouncedConfirmPassword, newPassword]);

  // === Handlers ===
  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPhone('');
    setErrors({});
    setServerError(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    if (isForced) return; // Block dismissal for forced changes
    reset();
    onClose?.();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = isCashierTempChange
        ? 'Enter your temporary password.'
        : 'Current password is required.';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (passwordStrength && !passwordStrength.isValid) {
      newErrors.newPassword =
        passwordStrength.feedback[0] || 'Password is too weak.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    // Phone: optional — only validate if something was typed
    if (phone.trim()) {
      const trimmedPhone = phone.trim();
      const onlyAllowed = /^[0-9\s+()'\-]+$/.test(trimmedPhone);
      const plusCount = (trimmedPhone.match(/\+/g) || []).length;
      const openCount = (trimmedPhone.match(/\(/g) || []).length;
      const closeCount = (trimmedPhone.match(/\)/g) || []).length;
      const dashCount = (trimmedPhone.match(/-/g) || []).length;
      const plusAtStart =
        !trimmedPhone.includes('+') || trimmedPhone.indexOf('+') === 0;
      const digits = trimmedPhone.replace(/\D/g, '').length;
      const phoneOk =
        onlyAllowed &&
        plusCount <= 1 &&
        plusAtStart &&
        openCount <= 1 &&
        closeCount <= 1 &&
        dashCount <= 1 &&
        digits >= 7 &&
        digits <= 15;
      if (!phoneOk) {
        newErrors.phone =
          'Enter a valid phone number (e.g. +1 868 000-0000 or (868) 000-0000).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const error = await onUpdate(
      currentPassword,
      newPassword,
      phone.trim() || undefined
    );
    if (error) {
      setServerError(error);
    } else {
      setIsSuccess(true);
      // Wait a moment for the user to see the success state before calling reset
      // (The parent component will likely unmount us anyway)
      setTimeout(() => {
        reset();
      }, 1500);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex h-fit flex-col overflow-hidden border-slate-200 bg-slate-50 p-0 shadow-xl md:max-h-[90vh] md:max-w-md [&>button]:hidden"
        onInteractOutside={isForced ? e => e.preventDefault() : undefined}
        onEscapeKeyDown={isForced ? e => e.preventDefault() : undefined}
        isMobileFullScreen={false}
      >
        {/* Header */}
        <div className="shrink-0 border-b bg-white px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  isCashierTempChange
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                )}
              >
                {isCashierTempChange ? (
                  <KeyRound className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </span>
              {isCashierTempChange
                ? 'Set Your Password'
                : 'Update Your Password'}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-slate-500">
              {isCashierTempChange
                ? 'You are using a temporary password assigned by your vault manager. For your security, you must set a personal password before continuing.'
                : 'Your current password does not meet security requirements. Please update it to continue.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form */}
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {isSuccess ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 px-6 py-12 text-center duration-300 animate-in fade-in zoom-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">
                  Password Updated!
                </h3>
                <p className="mx-auto max-w-xs text-slate-500">
                  Your new password has been saved. Redirecting you to the
                  dashboard...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {serverError && (
                <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <PasswordInput
                id="currentPassword"
                label={
                  isCashierTempChange
                    ? 'Temporary Password'
                    : 'Current Password'
                }
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent(v => !v)}
                placeholder={
                  isCashierTempChange
                    ? 'Enter the password given to you'
                    : 'Enter current password'
                }
                error={errors.currentPassword}
              />

              <div className="space-y-3 border-t border-slate-100 pt-2">
                <PasswordInput
                  id="newPassword"
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNew}
                  onToggle={() => setShowNew(v => !v)}
                  placeholder="Create a strong password"
                  error={errors.newPassword}
                />

                {/* Strength Requirements */}
                {newPassword && passwordStrength && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          passwordStrength.isValid
                            ? 'w-full bg-green-500'
                            : 'w-1/3 bg-red-400'
                        )}
                      />
                    </div>
                    <ul className="grid grid-cols-2 gap-1">
                      {PASSWORD_REQUIREMENTS.map(req => {
                        const met = req.test(newPassword);
                        return (
                          <li
                            key={req.label}
                            className={cn(
                              'flex items-center gap-1 text-[10px]',
                              met ? 'text-green-600' : 'text-slate-400'
                            )}
                          >
                            {met ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <div className="h-3 w-3 rounded-full border border-slate-300" />
                            )}
                            {req.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <PasswordInput
                  id="confirmPassword"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirm}
                  onToggle={() => setShowConfirm(v => !v)}
                  placeholder="Re-enter your new password"
                  error={errors.confirmPassword}
                />
              </div>

              {/* Phone: Optional */}
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <Label
                  htmlFor="phone"
                  className={cn(
                    'flex items-center gap-1.5 text-slate-700',
                    errors.phone && 'text-red-600'
                  )}
                >
                  Phone Number
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
                    Optional
                  </span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={initialPhone || '+1 868 000-0000'}
                  className={cn(
                    'border-slate-200 bg-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0',
                    errors.phone && 'border-red-300'
                  )}
                  autoComplete="tel"
                />
                {errors.phone ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <XCircle className="h-3 w-3 shrink-0" /> {errors.phone}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Accepted: +1 868 000-0000 · (868) 000-0000 · 18680000000
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="flex gap-3 border-t bg-slate-50 px-6 py-4">
            {!isForced && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
            )}
            {isForced && onLogout && (
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="flex-1 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Log Out
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={cn(
                'font-semibold text-white',
                isForced ? 'flex-[2]' : 'flex-[2]',
                isCashierTempChange
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {loading ? 'Saving...' : 'Save Password & Continue'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
