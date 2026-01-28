/**
 * Profile Validation Modal Component
 * Comprehensive modal for validating and updating user profile information.
 *
 * Features:
 * - Profile field validation
 * - Personal information editing (name, gender)
 * - Contact information (email, phone, address)
 * - Password update with strength validation
 * - Licensee and location assignments
 * - Form validation with error messages
 * - Loading states
 * - Success/error handling
 *
 * Very large component (~1127 lines) handling complete profile validation and update workflow.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param onSave - Callback when profile is saved
 * @param validationData - Profile validation data and reasons
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import MultiSelectDropdown, {
  type MultiSelectOption,
} from '@/components/shared/ui/common/MultiSelectDropdown';
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
import { fetchLicensees, logoutUser } from '@/lib/helpers/client';
import { useUserStore } from '@/lib/store/userStore';
import type {
  ProfileValidationFormData,
  ProfileValidationModalData,
} from '@/lib/types/auth';
import { cn } from '@/lib/utils';
import {
  containsEmailPattern,
  containsPhonePattern,
  isPlaceholderEmail,
  normalizePhoneNumber,
  validateEmail,
  validateNameField,
  validateOptionalGender,
  validatePasswordStrength,
  validatePhoneNumber,
  validateProfileField,
} from '@/lib/utils/validation';
import type {
  InvalidProfileFields,
  ProfileValidationReasons,
} from '@/shared/types/auth';
import { AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ProfileValidationModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdate: (data: ProfileValidationFormData) => Promise<{
    success: boolean;
    invalidFields?: InvalidProfileFields;
    fieldErrors?: Record<string, string>;
    message?: string;
    invalidProfileReasons?: ProfileValidationReasons;
  }>;
  loading?: boolean;
  invalidFields: InvalidProfileFields;
  currentData: ProfileValidationModalData;
  enforceUpdate?: boolean;
  reasons?: ProfileValidationReasons;
};

const INPUT_CLASS =
  'border focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary';

const GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function ProfileValidationModal({
  open,
  onClose,
  onUpdate,
  loading = false,
  invalidFields,
  currentData,
  enforceUpdate = false,
  reasons = {},
}: ProfileValidationModalProps) {
  const { user: authUser, clearUser } = useUserStore();
  const router = useRouter();
  const normalizedRoles =
    authUser?.roles?.map(role => role.toLowerCase()) || [];
  const canManageAssignments =
    normalizedRoles.includes('admin') || normalizedRoles.includes('developer');

  // Check if user is a cashier and hasn't changed temp password
  const isCashier = normalizedRoles.includes('cashier');
  const needsPasswordChange =
    isCashier && authUser?.tempPasswordChanged === false;

  const [formData, setFormData] = useState<ProfileValidationFormData>({
    username: currentData.username,
    firstName: currentData.firstName,
    lastName: currentData.lastName,
    otherName: currentData.otherName,
    gender: currentData.gender,
    emailAddress: currentData.emailAddress,
    phone: currentData.phone,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    licenseeIds: (currentData.licenseeIds || []).map(id => String(id)),
    locationIds: (currentData.locationIds || []).map(id => String(id)),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [licenseeOptions, setLicenseeOptions] = useState<MultiSelectOption[]>(
    []
  );
  const [locationOptions, setLocationOptions] = useState<
    Array<MultiSelectOption & { licenseeId?: string | null }>
  >([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        username: currentData.username,
        firstName: currentData.firstName,
        lastName: currentData.lastName,
        otherName: currentData.otherName,
        gender: currentData.gender,
        emailAddress: currentData.emailAddress,
        phone: currentData.phone,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        licenseeIds: (currentData.licenseeIds || []).map(id => String(id)),
        locationIds: (currentData.locationIds || []).map(id => String(id)),
      });
      setErrors({});
      setServerError(null);
      setIsFormValid(false);
    }
  }, [open, currentData]);

  useEffect(() => {
    if (!open || !canManageAssignments) {
      return;
    }

    let cancelled = false;
    const loadAssignments = async () => {
      setIsLoadingAssignments(true);
      try {
        const [licenseesResult, locationsResponse] = await Promise.all([
          fetchLicensees(),
          fetch('/api/locations?showAll=true&minimal=1', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);
        const licenseesData = Array.isArray(licenseesResult.licensees)
          ? licenseesResult.licensees
          : [];

        if (cancelled) return;

        const licenseeOpts = (licenseesData || [])
          .map(licensee => {
            const id =
              (licensee as Record<string, unknown>)._id ||
              (licensee as Record<string, unknown>).id;
            const label =
              (licensee as Record<string, unknown>).name ||
              (licensee as Record<string, unknown>).description ||
              'Unnamed Licensee';
            if (!id) return null;
            return { id: String(id), label: String(label) };
          })
          .filter(Boolean) as MultiSelectOption[];

        const existingLicenseeIds = new Set(licenseeOpts.map(opt => opt.id));
        (currentData.licenseeIds || []).forEach(id => {
          if (id && !existingLicenseeIds.has(id)) {
            licenseeOpts.push({
              id,
              label: `Licensee ${id}`,
            });
          }
        });

        setLicenseeOptions(licenseeOpts);
        const licenseeNameMap = new Map(
          licenseeOpts.map(option => [option.id, option.label])
        );

        let locationList: Array<Record<string, unknown>> = [];
        if (locationsResponse.ok) {
          const locJson = await locationsResponse.json();
          locationList = Array.isArray(locJson.locations)
            ? (locJson.locations as Array<Record<string, unknown>>)
            : [];
        }

        if (cancelled) return;

        const locationOpts = locationList
          .map(loc => {
            const record = loc as Record<string, unknown>;
            const id =
              record._id?.toString?.() ||
              record.id?.toString?.() ||
              record.locationId?.toString?.() ||
              '';
            if (!id) return null;
            const locationName =
              (record.name as string) ||
              (record.locationName as string) ||
              'Unknown Location';

            const explicitLicenseeId =
              record.licenseeId?.toString?.() || record.licensee?.toString?.();
            const relLicenceeRaw = (
              record.rel as { licencee?: unknown } | undefined
            )?.licencee;
            let licenseeId: string | undefined;
            if (explicitLicenseeId) {
              licenseeId = String(explicitLicenseeId);
            } else if (
              Array.isArray(relLicenceeRaw) &&
              relLicenceeRaw.length > 0
            ) {
              licenseeId = String(relLicenceeRaw[0]);
            } else if (relLicenceeRaw != null) {
              licenseeId = String(relLicenceeRaw);
            }
            const licenseeLabel = licenseeId
              ? licenseeNameMap.get(licenseeId)
              : undefined;

            return {
              id,
              label: licenseeLabel
                ? `${locationName} (${licenseeLabel})`
                : locationName,
              licenseeId: licenseeId ?? null,
            };
          })
          .filter(Boolean) as Array<
          MultiSelectOption & { licenseeId?: string | null }
        >;

        const existingLocationIds = new Set(locationOpts.map(opt => opt.id));
        (currentData.locationIds || []).forEach(id => {
          if (id && !existingLocationIds.has(id)) {
            locationOpts.push({
              id,
              label: `Location ${id}`,
              licenseeId: null,
            });
          }
        });

        setLocationOptions(locationOpts);
      } catch (error) {
        console.error(
          '[ProfileValidationModal] Failed to load assignments:',
          error
        );
      } finally {
        if (!cancelled) {
          setIsLoadingAssignments(false);
        }
      }
    };

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    canManageAssignments,
    currentData.licenseeIds,
    currentData.locationIds,
  ]);

  const locationOptionMap = useMemo(() => {
    const map = new Map<
      string,
      MultiSelectOption & { licenseeId?: string | null }
    >();
    locationOptions.forEach(option => {
      map.set(option.id, option);
    });
    return map;
  }, [locationOptions]);

  const hasLicenseeSelection = useMemo(() => {
    if (!canManageAssignments) {
      return true;
    }
    return formData.licenseeIds.length > 0;
  }, [canManageAssignments, formData.licenseeIds]);

  const filteredLocationOptions = useMemo(() => {
    if (!canManageAssignments) {
      return locationOptions;
    }

    if (formData.licenseeIds.length === 0) {
      return [];
    }

    return locationOptions.filter(option => {
      if (!option.licenseeId) {
        return false;
      }
      return formData.licenseeIds.includes(option.licenseeId);
    });
  }, [canManageAssignments, formData.licenseeIds, locationOptions]);

  const locationDropdownOptions = useMemo(() => {
    return filteredLocationOptions.map(option => ({
      id: option.id,
      label: option.label,
    }));
  }, [filteredLocationOptions]);

  useEffect(() => {
    if (!canManageAssignments) return;
    setFormData(prev => {
      if (prev.licenseeIds.length === 0) {
        if (prev.locationIds.length === 0) {
          return prev;
        }
        return { ...prev, locationIds: [] };
      }
      const filteredLocationIds = prev.locationIds.filter(id => {
        const option = locationOptionMap.get(id);
        if (!option || !option.licenseeId) {
          return false;
        }
        return prev.licenseeIds.includes(option.licenseeId);
      });
      if (filteredLocationIds.length === prev.locationIds.length) {
        return prev;
      }
      return { ...prev, locationIds: filteredLocationIds };
    });
  }, [canManageAssignments, formData.licenseeIds, locationOptionMap]);

  const passwordRequired =
    Boolean(invalidFields?.password) || needsPasswordChange;

  const passwordFeedback = useMemo(() => {
    if (!formData.newPassword) {
      return null;
    }
    const validation = validatePasswordStrength(formData.newPassword);
    return {
      isValid: validation.isValid,
      requirements: validation.requirements,
      feedback: validation.feedback,
    };
  }, [formData.newPassword]);

  const runClientValidation = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    const username = (formData.username || '').trim();
    const firstName = (formData.firstName || '').trim();
    const lastName = (formData.lastName || '').trim();
    const otherName = (formData.otherName || '').trim();
    const genderValue = (formData.gender || '').trim().toLowerCase();
    const emailAddress = (formData.emailAddress || '').trim();
    const phone = (formData.phone || '').trim();
    const usernameChanged =
      username.toLowerCase() !== (currentData.username || '').toLowerCase();
    const emailChanged =
      emailAddress.toLowerCase() !==
      (currentData.emailAddress || '').toLowerCase();

    if (invalidFields.username || usernameChanged) {
      if (!username) {
        newErrors.username = 'Username is required.';
      } else if (containsPhonePattern(username)) {
        newErrors.username = 'Username cannot look like a phone number.';
      } else if (containsEmailPattern(username)) {
        newErrors.username = 'Username cannot look like an email address.';
      } else if (!validateProfileField(username)) {
        newErrors.username =
          'Only letters, numbers, spaces, hyphens, and apostrophes are allowed.';
      } else if (
        emailAddress &&
        username.toLowerCase() === emailAddress.toLowerCase()
      ) {
        newErrors.username =
          'Username must be different from your email address.';
      }
    }

    if (invalidFields.firstName) {
      if (!firstName) {
        newErrors.firstName = 'First name is required.';
      } else if (!validateNameField(firstName)) {
        newErrors.firstName =
          'First name may only contain letters and spaces and cannot look like a phone number.';
      }
    }

    if (invalidFields.lastName) {
      if (!lastName) {
        newErrors.lastName = 'Last name is required.';
      } else if (!validateNameField(lastName)) {
        newErrors.lastName =
          'Last name may only contain letters and spaces and cannot look like a phone number.';
      }
    }

    if (
      invalidFields.otherName ||
      otherName !== (currentData.otherName || '').trim()
    ) {
      if (otherName && !validateNameField(otherName)) {
        newErrors.otherName =
          'Other name may only contain letters and spaces and cannot look like a phone number.';
      }
    }

    const currentGender = (currentData.gender || '').trim().toLowerCase();
    if (invalidFields.gender || genderValue !== currentGender) {
      if (genderValue && !validateOptionalGender(genderValue)) {
        newErrors.gender = 'Select a valid gender option.';
      }
    }

    if (invalidFields.emailAddress || emailChanged) {
      if (!emailAddress) {
        newErrors.emailAddress = 'Email address is required.';
      } else if (!validateEmail(emailAddress)) {
        newErrors.emailAddress = 'Provide a valid email address.';
      } else if (isPlaceholderEmail(emailAddress)) {
        newErrors.emailAddress =
          'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
      } else if (
        username &&
        emailAddress.toLowerCase() === username.toLowerCase()
      ) {
        newErrors.emailAddress =
          'Email address must differ from your username.';
      } else if (containsPhonePattern(emailAddress)) {
        newErrors.emailAddress =
          'Email address cannot resemble a phone number.';
      }
    }

    if (invalidFields.phone) {
      if (!phone) {
        newErrors.phone = 'Phone number is required.';
      } else if (!validatePhoneNumber(phone)) {
        newErrors.phone =
          'Provide a valid phone number (digits, spaces, parentheses, hyphen, optional leading +).';
      } else if (
        username &&
        normalizePhoneNumber(username) === normalizePhoneNumber(phone)
      ) {
        newErrors.phone = 'Phone number cannot match your username.';
      } else if (containsEmailPattern(phone)) {
        newErrors.phone = 'Phone number cannot contain email-like patterns.';
      }
    }

    // Only validate licensees and locations if user can manage assignments
    // AND they don't already have them assigned (check currentData)
    if (canManageAssignments) {
      const hasExistingLicensees = (currentData.licenseeIds || []).length > 0;
      const hasExistingLocations = (currentData.locationIds || []).length > 0;

      // Only require licensees if they don't have any and formData is empty
      if (formData.licenseeIds.length === 0 && !hasExistingLicensees) {
        newErrors.licenseeIds = 'Select at least one licensee.';
      }

      // Only require locations if they don't have any and formData is empty
      if (formData.locationIds.length === 0 && !hasExistingLocations) {
        newErrors.locationIds = 'Select at least one location.';
      }
    }

    if (passwordRequired) {
      if (!needsPasswordChange && !formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required.';
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required.';
      } else {
        const validation = validatePasswordStrength(formData.newPassword);
        if (!validation.isValid) {
          newErrors.newPassword = validation.feedback.join(', ');
        }
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirm your new password.';
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    return newErrors;
  }, [
    formData,
    currentData,
    invalidFields,
    canManageAssignments,
    passwordRequired,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const newErrors = runClientValidation();
      setErrors(newErrors);
      setIsFormValid(Object.keys(newErrors).length === 0);
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formData.username,
    formData.firstName,
    formData.lastName,
    formData.otherName,
    formData.gender,
    formData.emailAddress,
    formData.phone,
    formData.currentPassword,
    formData.newPassword,
    formData.confirmPassword,
    formData.licenseeIds,
    formData.locationIds,
    passwordRequired,
    invalidFields,
    canManageAssignments,
    currentData.username,
    currentData.otherName,
    currentData.gender,
    currentData.emailAddress,
    runClientValidation,
    setErrors,
    setIsFormValid,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const newErrors = runClientValidation();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsFormValid(false);
      return;
    }

    const submissionData: ProfileValidationFormData = {
      ...formData,
      username: formData.username.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      otherName: formData.otherName.trim(),
      gender: formData.gender.trim().toLowerCase(),
      emailAddress: formData.emailAddress.trim(),
      phone: formData.phone.trim(),
      // Explicitly include licenseeIds and locationIds to ensure they're sent
      licenseeIds: formData.licenseeIds || [],
      locationIds: formData.locationIds || [],
    };

    const result = await onUpdate(submissionData);

    if (!result.success) {
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
      }
      if (result.message) {
        setServerError(result.message);
      }
      return;
    }

    onClose();
  };

  const handleCloseRequest = (nextOpen: boolean) => {
    if (!nextOpen && enforceUpdate) {
      return;
    }
    if (!nextOpen) {
      onClose();
    }
  };

  const renderFieldError = (field: string) => {
    if (errors[field]) {
      return <p className="text-sm text-red-500">{errors[field]}</p>;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseRequest}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg [&>button]:hidden"
        onEscapeKeyDown={event => {
          if (enforceUpdate) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Profile Validation Required
          </DialogTitle>
          <DialogDescription>
            We detected profile details that must be updated before you can
            continue using the application. As part of our latest security
            compliance release, all users must confirm their profile meets the
            updated standards before accessing the new interface.
          </DialogDescription>
        </DialogHeader>

        {/* Validation Reasons Section */}
        {(() => {
          const filteredReasons = Object.entries(reasons || {}).filter(
            ([key]) =>
              key !== 'dateOfBirth' &&
              !(key === 'password' && needsPasswordChange) &&
              invalidFields[key as keyof InvalidProfileFields]
          );

          if (filteredReasons.length === 0) return null;

          return (
            <div className="mt-4 space-y-1 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold text-amber-900">
                Issues you need to fix:
              </p>
              <ul className="space-y-2">
                {filteredReasons.map(([field, reason]) => {
                  if (!reason) return null;
                  const currentValue =
                    currentData[field as keyof ProfileValidationModalData];
                  const isMissing =
                    typeof currentValue === 'string' &&
                    currentValue.trim() === '';
                  return (
                    <li
                      key={field}
                      className="rounded-md border border-amber-200 bg-white/70 p-2 shadow-sm"
                    >
                      <p className="font-medium capitalize text-amber-900">
                        {field.replace(/([A-Z])/g, ' $1')}:
                      </p>
                      <p className="text-amber-800">
                        {reason}
                        {isMissing ? (
                          <>
                            {' '}
                            <span className="font-semibold text-amber-900">
                              (you haven&apos;t provided this yet)
                            </span>
                          </>
                        ) : (
                          typeof currentValue === 'string' &&
                          currentValue.trim() !== '' && (
                            <>
                              {' '}
                              <span className="font-semibold text-amber-900">
                                (current: &quot;{currentValue}&quot;)
                              </span>
                            </>
                          )
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}

        {/* Server Error Message */}
        {(serverError || Object.keys(errors).length > 0) && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-600" role="alert">
              {serverError || 'Please fix the following issues to continue:'}
            </p>
            {Object.entries(errors).length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-red-500">
                {Object.entries(errors).map(([field, message]) => {
                  // If the field isn't in invalidFields, it's not rendered in the form,
                  // so we must show its error here so the user knows what's wrong.
                  // For fields that ARE rendered, we show it here too just in case as a summary.
                  const fieldLabel = field.replace(/([A-Z])/g, ' $1');
                  return (
                    <li key={field}>
                      <span className="font-semibold capitalize">{fieldLabel}:</span> {message}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Informational Notice */}
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            Once you press <span className="font-semibold">Update Profile</span>{' '}
            the system may sign you out to refresh your session. This only takes
            a moment—just log back in with your updated details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {invalidFields.username && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={e =>
                  setFormData(prev => ({ ...prev, username: e.target.value }))
                }
                className={cn(INPUT_CLASS, errors.username && 'border-red-500')}
                placeholder="Choose a username"
                autoComplete="username"
                disabled={loading}
              />
              {reasons.username && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.username}
                </p>
              )}
              {renderFieldError('username')}
            </div>
          )}

          {invalidFields.firstName && (
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                className={cn(
                  INPUT_CLASS,
                  errors.firstName && 'border-red-500'
                )}
                placeholder="Enter first name"
                autoComplete="given-name"
                disabled={loading}
              />
              {reasons.firstName && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.firstName}
                </p>
              )}
              {renderFieldError('firstName')}
            </div>
          )}

          {invalidFields.lastName && (
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                className={cn(INPUT_CLASS, errors.lastName && 'border-red-500')}
                placeholder="Enter last name"
                autoComplete="family-name"
                disabled={loading}
              />
              {reasons.lastName && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.lastName}
                </p>
              )}
              {renderFieldError('lastName')}
            </div>
          )}

          {invalidFields.otherName && (
            <div className="space-y-2">
              <Label htmlFor="otherName">Other Name</Label>
              <Input
                id="otherName"
                value={formData.otherName}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    otherName: e.target.value,
                  }))
                }
                className={cn(
                  INPUT_CLASS,
                  errors.otherName && 'border-red-500'
                )}
                placeholder="Enter other name"
                autoComplete="off"
                disabled={loading}
              />
              {reasons.otherName && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.otherName}
                </p>
              )}
              {renderFieldError('otherName')}
            </div>
          )}

          {invalidFields.gender && (
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    gender: value,
                  }))
                }
                disabled={loading}
              >
                <SelectTrigger
                  className={cn(INPUT_CLASS, errors.gender && 'border-red-500')}
                >
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reasons.gender && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.gender}
                </p>
              )}
              {renderFieldError('gender')}
            </div>
          )}

          {invalidFields.emailAddress && (
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                value={formData.emailAddress}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    emailAddress: e.target.value,
                  }))
                }
                className={cn(
                  INPUT_CLASS,
                  errors.emailAddress && 'border-red-500'
                )}
                placeholder="name@example.com"
                autoComplete="email"
                disabled={loading}
              />
              {reasons.emailAddress && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.emailAddress}
                </p>
              )}
              {renderFieldError('emailAddress')}
            </div>
          )}

          {canManageAssignments && (
            <div className="space-y-4 rounded-md border border-border p-3">
              <div className="space-y-2">
                <Label>Assigned Licensees</Label>
                <MultiSelectDropdown
                  options={licenseeOptions}
                  selectedIds={formData.licenseeIds}
                  onChange={ids =>
                    setFormData(prev => ({ ...prev, licenseeIds: ids }))
                  }
                  placeholder={
                    isLoadingAssignments
                      ? 'Loading licensees...'
                      : 'Select licensees'
                  }
                  label="licensees"
                  disabled={loading || isLoadingAssignments}
                />
                {renderFieldError('licenseeIds')}
              </div>

              <div className="space-y-2">
                <Label>Allowed Locations</Label>
                {!hasLicenseeSelection && (
                  <p className="text-xs text-muted-foreground">
                    Select at least one licensee to assign locations.
                  </p>
                )}
                <MultiSelectDropdown
                  options={locationDropdownOptions}
                  selectedIds={formData.locationIds}
                  onChange={ids =>
                    setFormData(prev => ({ ...prev, locationIds: ids }))
                  }
                  placeholder={
                    isLoadingAssignments
                      ? 'Loading locations...'
                      : hasLicenseeSelection
                        ? 'Select locations'
                        : 'Select a licensee first'
                  }
                  label="locations"
                  disabled={
                    loading || isLoadingAssignments || !hasLicenseeSelection
                  }
                  showSelectAll={hasLicenseeSelection}
                />
                {renderFieldError('locationIds')}
              </div>
            </div>
          )}

          {invalidFields.phone && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e =>
                  setFormData(prev => ({ ...prev, phone: e.target.value }))
                }
                className={cn(INPUT_CLASS, errors.phone && 'border-red-500')}
                placeholder="+1 (800) 555-1234"
                autoComplete="tel"
                disabled={loading}
              />
              {reasons.phone && (
                <p className="text-xs text-muted-foreground">
                  Why this is required: {reasons.phone}
                </p>
              )}
              {renderFieldError('phone')}
            </div>
          )}

          {passwordRequired && (
            <div className="space-y-3 rounded-md border border-border p-3">
                  {!needsPasswordChange && (
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={formData.currentPassword}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        className={cn(
                          INPUT_CLASS,
                          errors.currentPassword && 'border-red-500'
                        )}
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      {reasons.password && (
                        <p className="text-xs text-muted-foreground">
                          Why this is required: {reasons.password}
                        </p>
                      )}
                      {renderFieldError('currentPassword')}
                    </div>
                  )}

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className={cn(
                    INPUT_CLASS,
                    errors.newPassword && 'border-red-500'
                  )}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {renderFieldError('newPassword')}
                {passwordFeedback && (
                  <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                    <li
                      className={
                        passwordFeedback.requirements.length
                          ? 'text-green-600'
                          : ''
                      }
                    >
                      At least 8 characters
                    </li>
                    <li
                      className={
                        passwordFeedback.requirements.uppercase
                          ? 'text-green-600'
                          : ''
                      }
                    >
                      Contains an uppercase letter
                    </li>
                    <li
                      className={
                        passwordFeedback.requirements.lowercase
                          ? 'text-green-600'
                          : ''
                      }
                    >
                      Contains a lowercase letter
                    </li>
                    <li
                      className={
                        passwordFeedback.requirements.number
                          ? 'text-green-600'
                          : ''
                      }
                    >
                      Includes a number
                    </li>
                    <li
                      className={
                        passwordFeedback.requirements.special
                          ? 'text-green-600'
                          : ''
                      }
                    >
                      Includes a special character (@$!%*?&)
                    </li>
                  </ul>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className={cn(
                    INPUT_CLASS,
                    errors.confirmPassword && 'border-red-500'
                  )}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {renderFieldError('confirmPassword')}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
            <div className="flex w-full justify-start sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await logoutUser();
                  clearUser();
                  router.push('/login?logout=success');
                }}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
            <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
              {!enforceUpdate && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Profile'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
