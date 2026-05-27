'use client';

import { FormEvent, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { logoutUser } from '@/lib/helpers/client';
import { useUserStore } from '@/lib/store/userStore';
import type {
  ProfileValidationFormData,
  ProfileValidationModalData,
} from '@/lib/types/auth';
import { cn } from '@/lib/utils';
import { validatePasswordStrength } from '@/lib/utils/validation';
import type {
  InvalidProfileFields,
  ProfileValidationReasons,
} from '@/shared/types/auth';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

type ProfileCompletionModalProps = {
  open: boolean;
  onUpdate: (data: ProfileValidationFormData) => Promise<{
    success: boolean;
    fieldErrors?: Record<string, string>;
    message?: string;
  }>;
  loading?: boolean;
  invalidFields: InvalidProfileFields;
  reasons?: ProfileValidationReasons;
  currentData: ProfileValidationModalData;
};

// ============================================================================
// Constants & Styles
// ============================================================================

const INPUT_CLASS =
  'border-slate-200 bg-white focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-blue-500';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

/**
 * ProfileCompletionModal
 *
 * A simplified "Smart Modal" that only asks for missing or invalid information.
 * Eliminates redundancy by hiding valid fields.
 */
export default function ProfileCompletionModal({
  open,
  onUpdate,
  loading = false,
  invalidFields,
  reasons = {},
  currentData,
}: ProfileCompletionModalProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [formData, setFormData] = useState<ProfileValidationFormData>({
    // Personal
    username: currentData.username,
    firstName: currentData.firstName,
    lastName: currentData.lastName,
    otherName: currentData.otherName,
    gender: currentData.gender,
    // Contact
    emailAddress: currentData.emailAddress,
    phone: currentData.phone,
    // Security
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    // Assignments (Pass-through)
    licenceeIds: (currentData.licenceeIds || []).map(id => String(id)),
    locationIds: (currentData.locationIds || []).map(id => String(id)),
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);

  const { clearUser } = useUserStore();

  // ============================================================================
  // Effects
  // ============================================================================
  // Sync state with props when modal opens or data changes
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        username: currentData.username,
        firstName: currentData.firstName,
        lastName: currentData.lastName,
        otherName: currentData.otherName,
        gender: currentData.gender,
        emailAddress: currentData.emailAddress,
        phone: currentData.phone,
        // Don't reset password fields if user is typing
        ...(prev.newPassword ? {} : { newPassword: '' }),
        ...(prev.confirmPassword ? {} : { confirmPassword: '' }),
        ...(prev.currentPassword ? {} : { currentPassword: '' }),
      }));
    }
  }, [open, currentData]);

  // ============================================================================
  // Computed
  // ============================================================================

  const needsPassword = !!invalidFields.password;

  // Calculate password strength for visual feedback
  const passwordStrength = useMemo(() => {
    if (!formData.newPassword) return null;
    return validatePasswordStrength(formData.newPassword);
  }, [formData.newPassword]);

  const hasPersonalErrors =
    invalidFields.username ||
    invalidFields.firstName ||
    invalidFields.lastName ||
    invalidFields.gender;

  const hasContactErrors = invalidFields.emailAddress || invalidFields.phone;

  // Always show contact section if we're showing the modal (user can optionally fill phone)
  const showContactSection =
    hasContactErrors || needsPassword || hasPersonalErrors;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleInputChange = (
    field: keyof ProfileValidationFormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setServerError(null);

    // Basic Client-Side Validation (Fast Feedback)
    const errors: Record<string, string> = {};

    // Phone validation removed - it is optional
    // if (invalidFields.phone && !formData.phone.trim()) {
    //   errors.phone = 'Phone number is required.';
    // }

    if (invalidFields.gender && !formData.gender) {
      errors.gender = 'Gender is required.';
    }

    if (needsPassword) {
      if (!formData.newPassword)
        errors.newPassword = 'New password is required.';
      if (formData.newPassword !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
      // If we have existing password strength errors, block them
      if (passwordStrength && !passwordStrength.isValid) {
        errors.newPassword = passwordStrength.feedback[0];
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Submit
    const result = await onUpdate(formData);

    if (!result.success) {
      if (result.fieldErrors) setValidationErrors(result.fieldErrors);

      let errorMessage = result.message;

      // If validation failed, check for errors on fields that aren't currently visible
      if (
        result.fieldErrors &&
        (errorMessage === 'Validation failed' || !errorMessage)
      ) {
        const hiddenErrors: string[] = [];
        const errors = result.fieldErrors;

        Object.entries(errors).forEach(([key, msg]) => {
          // 1. Password Fields
          if (
            ['currentPassword', 'newPassword', 'confirmPassword'].includes(key)
          ) {
            if (!needsPassword) hiddenErrors.push(msg);
            return;
          }

          // 2. Assignment Fields (Always hidden in this modal)
          if (['licenceeIds', 'locationIds'].includes(key)) {
            if (msg.toLowerCase().includes('select at least one')) {
              hiddenErrors.push(
                'Please contact your Administrator or Tech Support to be assigned to a ' +
                  (key === 'locationIds' ? 'location.' : 'licencee.')
              );
            } else {
              hiddenErrors.push(msg);
            }
            return;
          }

          // 3. Profile Fields
          // In this modal, a field is ONLY rendered if it is marked as invalid in `invalidFields`
          // If the API returns an error for a field we didn't ask the user to fix, they can't see it.
          const isFieldVisible =
            invalidFields[key as keyof InvalidProfileFields];

          // Special case: otherName is not rendered at all in the current JSX provided
          // Phone is now always shown, so don't add it to hidden errors
          if (key === 'otherName' || (!isFieldVisible && key !== 'phone')) {
            // Make the field name readable
            const fieldLabel = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase());
            hiddenErrors.push(`${fieldLabel}: ${msg}`);
          }
        });

        if (hiddenErrors.length > 0) {
          errorMessage = `Validation failed: ${hiddenErrors.join(' | ')}`;
        }
      }

      if (errorMessage) setServerError(errorMessage);
    }
  };

  // Prevent closing by clicking outside or escape (Enforced Update)
  const handleInteractOutside = (e: Event) => e.preventDefault();

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderFieldInput = (
    id: keyof ProfileValidationFormData,
    label: string,
    placeholder?: string,
    type: string = 'text'
  ) => {
    const error = validationErrors[id];
    const backendReason = reasons[id as keyof ProfileValidationReasons];

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor={id}
            className={cn(error ? 'text-red-600' : 'text-slate-700')}
          >
            {label}
          </Label>
        </div>
        <Input
          id={id}
          type={type}
          value={formData[id] as string}
          onChange={e => handleInputChange(id, e.target.value)}
          placeholder={placeholder}
          className={cn(
            INPUT_CLASS,
            error && 'border-red-300 focus-visible:ring-red-200'
          )}
          autoComplete="off"
        />
        {/* Priority: User Error > Backend Reason */}
        {error ? (
          <p className="flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        ) : backendReason ? (
          <p className="inline-block rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">
            {backendReason}
          </p>
        ) : null}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open}>
      <DialogContent
        className="flex h-fit flex-col overflow-hidden border-slate-200 bg-slate-50 p-0 shadow-xl md:max-w-md [&>button]:hidden"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
        isMobileFullScreen={false}
      >
        {/* Header */}
        <div className="border-b bg-white px-6 py-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <CheckCircle className="h-5 w-5" />
              </span>
              Complete Your Profile
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-slate-500">
              Please provide the missing details below to secure your account.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Form Area */}
        <form
          onSubmit={handleSubmit}
          className="custom-scrollbar space-y-4 overflow-y-auto px-6 py-4 md:max-h-[60vh]"
        >
          {serverError && (
            <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{serverError}</p>
            </div>
          )}

          {/* Section: Personal Details */}
          {hasPersonalErrors && (
            <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
              <legend className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Personal Details
              </legend>

              {invalidFields.username &&
                renderFieldInput('username', 'Username')}

              <div className="grid grid-cols-2 gap-4">
                {invalidFields.firstName &&
                  renderFieldInput('firstName', 'First Name')}
                {invalidFields.lastName &&
                  renderFieldInput('lastName', 'Last Name')}
              </div>

              {invalidFields.gender && (
                <div className="space-y-1.5">
                  <Label
                    className={cn(
                      validationErrors.gender
                        ? 'text-red-600'
                        : 'text-slate-700'
                    )}
                  >
                    Gender
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={val => handleInputChange('gender', val)}
                  >
                    <SelectTrigger className={cn(INPUT_CLASS, 'w-full')}>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {reasons.gender && (
                    <p className="text-xs text-amber-600">{reasons.gender}</p>
                  )}
                </div>
              )}
            </fieldset>
          )}

          {/* Section: Contact Details */}
          {showContactSection && (
            <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
              <legend className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Contact Information
              </legend>
              {invalidFields.emailAddress &&
                renderFieldInput(
                  'emailAddress',
                  'Email Address',
                  'name@example.com',
                  'email'
                )}
              {renderFieldInput(
                'phone',
                'Phone Number (Optional)',
                '+1 868-XXX-XXXX',
                'tel'
              )}
            </fieldset>
          )}

          {/* Section: Security */}
          {needsPassword && (
            <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
              <legend className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Security Update
              </legend>

              {/* Only ask for current password if it's NOT a fresh account (temp password) logic handled in backend mostly, 
                    but safe to show if user has one set. For simplicity in this logic, we assume if password update is required, 
                    we show all 3 fields unless it's a temp pass change where current might correspond to the temp one. 
                    Ideally we'd know if 'current' is strictly required. For now, we show all. 
                */}
              {renderFieldInput(
                'currentPassword',
                'Current Password',
                '',
                'password'
              )}

              <div className="space-y-3 border-t border-slate-50 pt-2">
                {renderFieldInput(
                  'newPassword',
                  'New Password',
                  '',
                  'password'
                )}

                {/* Visual Strength Meter */}
                {formData.newPassword && passwordStrength && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full transition-all duration-500 ease-out',
                          passwordStrength.isValid
                            ? 'w-full bg-green-500'
                            : 'w-1/3 bg-red-400'
                        )}
                      />
                    </div>
                    <ul className="grid grid-cols-2 gap-1">
                      {/* Manually map requirements since it is an object, not an array */}
                      <li
                        className={cn(
                          'flex items-center gap-1 text-[10px]',
                          passwordStrength.requirements.length
                            ? 'text-green-600'
                            : 'text-slate-400'
                        )}
                      >
                        {passwordStrength.requirements.length ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-200" />
                        )}
                        8+ Characters
                      </li>
                      <li
                        className={cn(
                          'flex items-center gap-1 text-[10px]',
                          passwordStrength.requirements.uppercase
                            ? 'text-green-600'
                            : 'text-slate-400'
                        )}
                      >
                        {passwordStrength.requirements.uppercase ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-200" />
                        )}
                        Uppercase
                      </li>
                      <li
                        className={cn(
                          'flex items-center gap-1 text-[10px]',
                          passwordStrength.requirements.lowercase
                            ? 'text-green-600'
                            : 'text-slate-400'
                        )}
                      >
                        {passwordStrength.requirements.lowercase ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-200" />
                        )}
                        Lowercase
                      </li>
                      <li
                        className={cn(
                          'flex items-center gap-1 text-[10px]',
                          passwordStrength.requirements.number
                            ? 'text-green-600'
                            : 'text-slate-400'
                        )}
                      >
                        {passwordStrength.requirements.number ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-200" />
                        )}
                        Number
                      </li>
                      <li
                        className={cn(
                          'flex items-center gap-1 text-[10px]',
                          passwordStrength.requirements.special
                            ? 'text-green-600'
                            : 'text-slate-400'
                        )}
                      >
                        {passwordStrength.requirements.special ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-200" />
                        )}
                        Special Char
                      </li>
                    </ul>
                  </div>
                )}

                {renderFieldInput(
                  'confirmPassword',
                  'Confirm New Password',
                  '',
                  'password'
                )}
              </div>
            </fieldset>
          )}
        </form>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t bg-slate-50 p-3">
          <div className="rounded border border-blue-100 bg-blue-50 px-2.5 py-2 text-[10px] leading-relaxed text-blue-800">
            <p>
              <strong>Note:</strong> Updating your profile may require you to
              log in again to refresh your secure session.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await logoutUser();
                clearUser();
                window.location.href = '/login';
              }}
              className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Logout
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
