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
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[A-Za-z0-9\s'-]+$/.test(formData.username)) {
      newErrors.username =
        'Username may only contain letters, numbers, spaces, hyphens, and apostrophes';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(formData.firstName)) {
      newErrors.firstName = 'First name may only contain letters and spaces';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(formData.lastName)) {
      newErrors.lastName = 'Last name may only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
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
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create New Cashier Account
          </DialogTitle>
          <DialogDescription>
            Create a new cashier account with login credentials. A temporary
            password will be generated for you to share with the cashier.
          </DialogDescription>
        </DialogHeader>

        {createdTempPassword ? (
          <div className="mb-6 rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center">
            <div className="mb-4">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                <Key className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-green-800">
                Cashier Account Created Successfully!
              </h3>
              <p className="mb-4 text-green-700">
                Please provide the following credentials to the cashier.
              </p>
            </div>

            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="mb-2 text-sm text-gray-600">
                <strong>Temporary Password (for your reference):</strong>
              </p>
              <div className="select-all rounded border border-green-300 bg-green-100 p-3 font-mono text-lg font-bold text-green-700">
                {createdTempPassword}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Save this password securely. The cashier will be required to
                change it on first login.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="mt-4 w-full"
              style={{ backgroundColor: '#0AB40B' }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={e =>
                  setFormData(prev => ({ ...prev, username: e.target.value }))
                }
                className={INPUT_CLASS}
                placeholder="Enter username (usually email prefix)"
                disabled={isLoading}
              />
              {renderError('username')}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
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
                  className={INPUT_CLASS}
                  placeholder="Enter first name"
                  disabled={isLoading}
                />
                {renderError('firstName')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, lastName: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Enter last name"
                  disabled={isLoading}
                />
                {renderError('lastName')}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                }
                className={INPUT_CLASS}
                placeholder="cashier@company.com"
                disabled={isLoading}
              />
              <div className="mt-1 flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Please ensure that this is the cashier's business/personal email
                address for verification
              </div>
              {renderError('email')}
            </div>

            {/* Password Info */}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">
                  Password Information
                </h4>
              </div>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>
                  • A secure temporary password will be automatically generated
                </li>
                <li>
                  • You must provide this password to the cashier manually
                </li>
                <li>
                  • Cashier will be required to change password on first login
                </li>
                <li>
                  • Password must include uppercase, lowercase, numbers, and
                  special characters
                </li>
              </ul>
            </div>

            {/* Assignment Fields */}
            {(assignedLicensees.length > 0 || assignedLocations.length > 0) && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Assignments</h4>

                {assignedLicensees.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assigned Licensees</Label>
                    <div className="rounded border bg-gray-50 p-3 text-sm text-gray-600">
                      {assignedLicensees.length} licensee(s) will be assigned
                      automatically
                    </div>
                  </div>
                )}

                {assignedLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assigned Locations</Label>
                    <div className="rounded border bg-gray-50 p-3 text-sm text-gray-600">
                      {assignedLocations.length} location(s) will be assigned
                      automatically
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {errors.submit && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <DialogFooter className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                style={{ backgroundColor: '#0AB40B' }}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Cashier'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
