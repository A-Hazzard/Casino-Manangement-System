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
 * @param assignedLicensees - Current user's assigned licensees
 * @param assignedLocations - Current user's assigned locations
 */
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
import { cn } from '@/lib/utils';
import { AlertTriangle, Key, Loader2, Mail, User } from 'lucide-react';
import * as React from 'react';

type CashierCreationModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (tempPassword: string) => void;
  assignedLicensees?: string[];
  assignedLocations?: string[];
};

const INPUT_CLASS =
  'border focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary';

export default function CashierCreationModal({
  open,
  onClose,
  onSuccess,
  assignedLicensees = [],
  assignedLocations = [],
}: CashierCreationModalProps) {
  const [formData, setFormData] = React.useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    assignedLicensees: [] as string[],
    assignedLocations: [] as string[],
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [createdTempPassword, setCreatedTempPassword] = React.useState<
    string | null
  >(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        assignedLicensees: formData.assignedLicensees,
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
      assignedLicensees: [],
      assignedLocations: [],
    });
    setErrors({});
    setCreatedTempPassword(null);
    onClose();
  };

  React.useEffect(() => {
    if (open) {
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        assignedLicensees: assignedLicensees,
        assignedLocations: assignedLocations,
      });
      setErrors({});
      setCreatedTempPassword(null);
    }
  }, [open, assignedLicensees, assignedLocations]);

  const renderError = (field: string) => {
    if (errors[field]) {
      return <p className="mt-1 text-sm text-red-500">{errors[field]}</p>;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <User className="h-5 w-5 text-violet-600" />
            Create New Cashier Account
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Create a new cashier account with login credentials. A temporary
            password will be generated for you to share with the cashier.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {createdTempPassword ? (
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 text-center animate-in zoom-in-95 duration-500">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/20 rotate-3">
                  <Key className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-violet-900 tracking-tight mb-2">
                  Account Created Successfully!
                </h3>
                <p className="text-sm text-violet-600 font-medium leading-relaxed">
                  Provide these credentials to the cashier. They must be changed on first login.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-xl shadow-violet-500/20">
                <div className="relative z-10 space-y-4">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-100/60">Temporary Access Key</p>
                      <div className="select-all rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 font-mono text-2xl font-black text-center tracking-wider shadow-inner">
                        {createdTempPassword}
                      </div>
                   </div>
                   <div className="flex items-start gap-2 text-[10px] text-violet-100/80 font-bold bg-white/5 p-2 rounded-lg border border-white/5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>SAVE THIS SECURELY. THIS IS THE ONLY TIME THE PASSWORD WILL BE SHOWN IN PLAIN TEXT.</span>
                   </div>
                </div>
                <Key className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12" />
              </div>
            </div>
          ) : (
            <form id="cashier-creation-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Username</Label>
                <div className="relative">
                   <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                   <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, username: e.target.value }))
                    }
                    className={cn(INPUT_CLASS, "pl-10 rounded-xl h-11")}
                    placeholder="Enter username"
                    disabled={isLoading}
                  />
                </div>
                {renderError('username')}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">First Name</Label>
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
                    className={cn(INPUT_CLASS, "rounded-xl h-11")}
                    placeholder="First name"
                    disabled={isLoading}
                  />
                  {renderError('firstName')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, lastName: e.target.value }))
                    }
                    className={cn(INPUT_CLASS, "rounded-xl h-11")}
                    placeholder="Last name"
                    disabled={isLoading}
                  />
                  {renderError('lastName')}
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
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
                  className={cn(INPUT_CLASS, "rounded-xl h-11")}
                  placeholder="cashier@company.com"
                  disabled={isLoading}
                />
                <div className="mt-1 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700 leading-tight">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>Please ensure this is a valid business email for credential delivery and verification.</span>
                </div>
                {renderError('email')}
              </div>

              {/* Assignment Info */}
              {(assignedLicensees.length > 0 || assignedLocations.length > 0) && (
                <div className="space-y-3 p-4 bg-violet-50/50 rounded-2xl border border-violet-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Automatic Assignments</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {assignedLicensees.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-violet-700">Licensees</Label>
                        <div className="text-xs font-black text-violet-900 bg-white border border-violet-100 px-2 py-1 rounded-lg">
                          {assignedLicensees.length} Total
                        </div>
                      </div>
                    )}
                    {assignedLocations.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-violet-700">Locations</Label>
                        <div className="text-xs font-black text-violet-900 bg-white border border-violet-100 px-2 py-1 rounded-lg">
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
                  <p className="text-xs font-bold text-red-600">{errors.submit}</p>
                </div>
              )}
            </form>
          )}
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100">
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
              className="bg-violet-600 text-white hover:bg-violet-700 font-black shadow-lg shadow-violet-600/20 px-8 h-11 rounded-xl"
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
              className="bg-violet-600 text-white hover:bg-violet-700 font-black shadow-lg shadow-violet-600/20 px-12 h-11 rounded-xl"
            >
              Done / Finished
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
