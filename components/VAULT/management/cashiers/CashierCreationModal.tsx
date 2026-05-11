/**
 * Cashier Creation Modal Component
 *
 * Modal component for vault managers to create new cashier accounts.
 * Features:
 * - Form with username, firstName, lastName, email fields
 * - Automatic password generation
 * - Email notification with login credentials
 * - Form validation
 * - Business email validation with red warning text
 *
 * @param isOpen - Whether modal is visible
 * @param onClose - Callback to close modal
 * @param onSuccess - Callback when cashier is created successfully
 * @param assignedLicencees - Current user's assigned licencees
 * @param assignedLocations - Current user's assigned locations
 */
'use client';

import { FormEvent, useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { AlertTriangle, Key, Loader2, Mail, User } from 'lucide-react';

type CashierCreationModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (tempPassword: string) => void;
  assignedLicencees?: string[];
  assignedLocations?: string[];
};

const INPUT_CLASS =
  'border focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary';

export default function CashierCreationModal({
  open,
  onClose,
  onSuccess,
  assignedLicencees = [],
  assignedLocations = [],
}: CashierCreationModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    assignedLicencees: [] as string[],
    assignedLocations: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(
    null
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Username validation
    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername) {
      newErrors.username = 'Username is required';
    } else if (trimmedUsername.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[A-Za-z0-9\s'-]+$/.test(trimmedUsername)) {
      newErrors.username =
        'Username may only contain letters, numbers, spaces, hyphens, and apostrophes';
    }

    // Name validation
    const trimmedFirstName = formData.firstName.trim();
    if (!trimmedFirstName) {
      newErrors.firstName = 'First name is required';
    } else if (trimmedFirstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(trimmedFirstName)) {
      newErrors.firstName = 'First name may only contain letters and spaces';
    }

    const trimmedLastName = formData.lastName.trim();
    if (!trimmedLastName) {
      newErrors.lastName = 'Last name is required';
    } else if (trimmedLastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(trimmedLastName)) {
      newErrors.lastName = 'Last name may only contain letters and spaces';
    }

    // Email validation
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Import the helper function
      const { handleCreateCashier } =
        await import('@/lib/helpers/vaultHelpers');

      const result = await handleCreateCashier({
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        assignedLicencees: formData.assignedLicencees,
        assignedLocations: formData.assignedLocations,
      });

      if (result.success && result.tempPassword) {
        setCreatedTempPassword(result.tempPassword);
        onSuccess(result.tempPassword);
      } else {
        setErrors({ submit: result.error || 'Failed to create cashier' });
      }
    } catch (error) {
      console.error('Error creating cashier:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      assignedLicencees: [],
      assignedLocations: [],
    });
    setErrors({});
    setCreatedTempPassword(null);
    onClose();
  };

  useEffect(() => {
    if (open) {
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        assignedLicencees: assignedLicencees,
        assignedLocations: assignedLocations,
      });
      setErrors({});
      setCreatedTempPassword(null);
    }
  }, [open, assignedLicencees, assignedLocations]);

  const renderError = (field: string) => {
    if (errors[field]) {
      return <p className="mt-1 text-sm text-red-500">{errors[field]}</p>;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b border-violet-100 bg-violet-50 p-6">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <User className="h-5 w-5 text-violet-600" />
            Create New Cashier Account
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Create a new cashier account with login credentials. A temporary
            password will be generated for you to share with the cashier.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[75vh] space-y-6 overflow-y-auto p-6">
          {createdTempPassword ? (
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 text-center duration-500 animate-in zoom-in-95">
                <div className="mb-4 inline-flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/20">
                  <Key className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-black tracking-tight text-violet-900">
                  Account Created Successfully!
                </h3>
                <p className="text-sm font-medium leading-relaxed text-violet-600">
                  Provide these credentials to the cashier. They must be changed
                  on first login.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-xl shadow-violet-500/20">
                <div className="relative z-10 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-100/60">
                      Temporary Access Key
                    </p>
                    <div className="select-all rounded-xl border border-white/20 bg-white/10 p-4 text-center font-mono text-2xl font-black tracking-wider shadow-inner backdrop-blur-md">
                      {createdTempPassword}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/5 p-2 text-[10px] font-bold text-violet-100/80">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>
                      SAVE THIS SECURELY. THIS IS THE ONLY TIME THE PASSWORD
                      WILL BE SHOWN IN PLAIN TEXT.
                    </span>
                  </div>
                </div>
                <Key className="absolute -bottom-4 -right-4 h-24 w-24 rotate-12 text-white/5" />
              </div>
            </div>
          ) : (
            <form
              id="cashier-creation-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Username Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400"
                >
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className={cn(INPUT_CLASS, 'h-11 rounded-xl pl-10')}
                    placeholder="Enter username"
                    disabled={isLoading}
                  />
                </div>
                {renderError('username')}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400"
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className={cn(INPUT_CLASS, 'h-11 rounded-xl')}
                    placeholder="First name"
                    disabled={isLoading}
                  />
                  {renderError('firstName')}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className={cn(INPUT_CLASS, 'h-11 rounded-xl')}
                    placeholder="Last name"
                    disabled={isLoading}
                  />
                  {renderError('lastName')}
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400"
                >
                  <Mail className="h-3 w-3" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                  }
                  className={cn(INPUT_CLASS, 'h-11 rounded-xl')}
                  placeholder="cashier@company.com"
                  disabled={isLoading}
                />
                <div className="mt-1 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-tight text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>
                    Please ensure this is a valid business email for credential
                    delivery and verification.
                  </span>
                </div>
                {renderError('email')}
              </div>

              {/* Assignment Info */}
              {(assignedLicencees.length > 0 ||
                assignedLocations.length > 0) && (
                <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                    Automatic Assignments
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {assignedLicencees.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-violet-700">
                          Licencees
                        </Label>
                        <div className="rounded-lg border border-violet-100 bg-white px-2 py-1 text-xs font-black text-violet-900">
                          {assignedLicencees.length} Total
                        </div>
                      </div>
                    )}
                    {assignedLocations.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-violet-700">
                          Locations
                        </Label>
                        <div className="rounded-lg border border-violet-100 bg-white px-2 py-1 text-xs font-black text-violet-900">
                          {assignedLocations.length} Total
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {errors.submit && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs font-bold text-red-600">
                    {errors.submit}
                  </p>
                </div>
              )}
            </form>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 bg-gray-50 p-6">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="font-black text-gray-500 hover:bg-gray-100/50"
          >
            Cancel
          </Button>
          {!createdTempPassword ? (
            <Button
              form="cashier-creation-form"
              type="submit"
              disabled={isLoading}
              className="h-11 rounded-xl bg-violet-600 px-8 font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </div>
              ) : (
                'Create Cashier Account'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleClose}
              className="h-11 rounded-xl bg-violet-600 px-12 font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
            >
              Done / Finished
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
