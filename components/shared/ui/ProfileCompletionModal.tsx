'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
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
import * as React from 'react';
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
    licenseeIds: (currentData.licenseeIds || []).map(id => String(id)),
    locationIds: (currentData.locationIds || []).map(id => String(id)),
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  
  const { clearUser } = useUserStore();

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
  // Computed & Helpers
  // ============================================================================

  const needsPassword = !!invalidFields.password;
  
  // Calculate password strength for visual feedback
  const passwordStrength = React.useMemo(() => {
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
  const showContactSection = hasContactErrors || needsPassword || hasPersonalErrors;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleInputChange = (field: keyof ProfileValidationFormData, value: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setServerError(null);

    // Basic Client-Side Validation (Fast Feedback)
    const errors: Record<string, string> = {};

    // Phone validation removed - it is optional
    // if (invalidFields.phone && !formData.phone.trim()) {
    //   errors.phone = 'Phone number is required.';
    // }

    if (needsPassword) {
      if (!formData.newPassword) errors.newPassword = 'New password is required.';
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
      if (result.fieldErrors && (errorMessage === 'Validation failed' || !errorMessage)) {
        const hiddenErrors: string[] = [];
        const errors = result.fieldErrors;
        
        Object.entries(errors).forEach(([key, msg]) => {
           // 1. Password Fields
           if (['currentPassword', 'newPassword', 'confirmPassword'].includes(key)) {
               if (!needsPassword) hiddenErrors.push(msg);
               return;
           }
           
           // 2. Assignment Fields (Always hidden in this modal)
           if (['licenseeIds', 'locationIds'].includes(key)) {
               hiddenErrors.push(msg); // Msg usually says "Select at least one..."
               return;
           }
           
           // 3. Profile Fields
           // In this modal, a field is ONLY rendered if it is marked as invalid in `invalidFields`
           // If the API returns an error for a field we didn't ask the user to fix, they can't see it.
           const isFieldVisible = invalidFields[key as keyof InvalidProfileFields];
           
           // Special case: otherName is not rendered at all in the current JSX provided
           // Phone is now always shown, so don't add it to hidden errors
           if (key === 'otherName' || (!isFieldVisible && key !== 'phone')) {
               // Make the field name readable
               const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
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
            <Label htmlFor={id} className={cn(error ? 'text-red-600' : 'text-slate-700')}>
            {label}
            </Label>
        </div>
        <Input
          id={id}
          type={type}
          value={formData[id] as string}
          onChange={e => handleInputChange(id, e.target.value)}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, error && 'border-red-300 focus-visible:ring-red-200')}
          autoComplete="off"
        />
        {/* Priority: User Error > Backend Reason */}
        {error ? (
           <p className="text-xs font-medium text-red-600 flex items-center gap-1">
             <AlertCircle className="w-3 h-3" /> {error}
           </p>
        ) : backendReason ? (
            <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
               {backendReason}
            </p>
        ) : null}
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden bg-slate-50 border-slate-200 shadow-xl [&>button]:hidden"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                <CheckCircle className="w-5 h-5" />
              </span>
              Complete Your Profile
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-1.5">
              Please provide the missing details below to secure your account.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Form Area */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {serverError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm font-medium border border-red-100 flex items-start gap-2">
               <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
               <p>{serverError}</p>
            </div>
          )}

          {/* Section: Personal Details */}
          {hasPersonalErrors && (
            <fieldset className="space-y-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                    Personal Details
                </legend>
                
                {invalidFields.username && renderFieldInput('username', 'Username')}
                
                <div className="grid grid-cols-2 gap-4">
                    {invalidFields.firstName && renderFieldInput('firstName', 'First Name')}
                    {invalidFields.lastName && renderFieldInput('lastName', 'Last Name')}
                </div>
                
                {invalidFields.gender && (
                   <div className="space-y-1.5">
                     <Label className={cn(validationErrors.gender ? 'text-red-600' : 'text-slate-700')}>Gender</Label>
                     <Select 
                        value={formData.gender} 
                        onValueChange={(val) => handleInputChange('gender', val)}
                     >
                       <SelectTrigger className={cn(INPUT_CLASS, "w-full")}>
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
                     {reasons.gender && <p className="text-xs text-amber-600">{reasons.gender}</p>}
                   </div>
                )}
            </fieldset>
          )}

          {/* Section: Contact Details */}
          {showContactSection && (
            <fieldset className="space-y-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                    Contact Information
                </legend>
                {invalidFields.emailAddress && renderFieldInput('emailAddress', 'Email Address', 'name@example.com', 'email')}
                {renderFieldInput('phone', 'Phone Number (Optional)', '+1 868-XXX-XXXX', 'tel')}
            </fieldset>
          )}

          {/* Section: Security */}
          {needsPassword && (
            <fieldset className="space-y-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                 <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                    Security Update
                </legend>
                
                {/* Only ask for current password if it's NOT a fresh account (temp password) logic handled in backend mostly, 
                    but safe to show if user has one set. For simplicity in this logic, we assume if password update is required, 
                    we show all 3 fields unless it's a temp pass change where current might correspond to the temp one. 
                    Ideally we'd know if 'current' is strictly required. For now, we show all. 
                */}
                {renderFieldInput('currentPassword', 'Current Password', '', 'password')}

                <div className="space-y-3 pt-2 border-t border-slate-50">
                    {renderFieldInput('newPassword', 'New Password', '', 'password')}
                    
                  {/* Visual Strength Meter */}
                  {formData.newPassword && passwordStrength && (
                      <div className="space-y-1.5">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                  className={cn(
                                      "h-full transition-all duration-500 ease-out",
                                      passwordStrength.isValid ? 'bg-green-500 w-full' : 'bg-red-400 w-1/3'
                                  )}
                              />
                          </div>
                          <ul className="grid grid-cols-2 gap-1">
                              {/* Manually map requirements since it is an object, not an array */}
                              <li className={cn("text-[10px] flex items-center gap-1", passwordStrength.requirements.length ? "text-green-600" : "text-slate-400")}>
                                  {passwordStrength.requirements.length ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-200" />}
                                  8+ Characters
                              </li>
                              <li className={cn("text-[10px] flex items-center gap-1", passwordStrength.requirements.uppercase ? "text-green-600" : "text-slate-400")}>
                                  {passwordStrength.requirements.uppercase ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-200" />}
                                  Uppercase
                              </li>
                              <li className={cn("text-[10px] flex items-center gap-1", passwordStrength.requirements.lowercase ? "text-green-600" : "text-slate-400")}>
                                  {passwordStrength.requirements.lowercase ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-200" />}
                                  Lowercase
                              </li>
                              <li className={cn("text-[10px] flex items-center gap-1", passwordStrength.requirements.number ? "text-green-600" : "text-slate-400")}>
                                  {passwordStrength.requirements.number ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-200" />}
                                  Number
                              </li>
                              <li className={cn("text-[10px] flex items-center gap-1", passwordStrength.requirements.special ? "text-green-600" : "text-slate-400")}>
                                  {passwordStrength.requirements.special ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-200" />}
                                  Special Char
                              </li>
                          </ul>
                      </div>
                  )}

                  {renderFieldInput('confirmPassword', 'Confirm New Password', '', 'password')}
              </div>
          </fieldset>
        )}
      </form>

      {/* Footer */}
      <div className="bg-slate-50 border-t p-4 flex flex-col gap-3">
         <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800">
            <p>
              <strong>Note:</strong> Updating your profile may require you to log in again to refresh your secure session.
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
               className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm hover:shadow active:scale-[0.99]"
             >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
