'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemberActionsStore } from '@/lib/store/memberActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { useDebounce } from '@/lib/utils/hooks';
import {
  containsEmailPattern,
  containsPhonePattern,
  isPlaceholderEmail,
  validateEmail,
  validateNameField,
  validatePhoneNumber,
  validateStreetAddress,
  validateUsername,
} from '@/lib/utils/validation';
import defaultAvatar from '@/public/defaultAvatar.svg';
import { CasinoMember as Member } from '@/shared/types/entities';
import axios from 'axios';
import { gsap } from 'gsap';
import { Save, X, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type EditMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onMemberUpdated: () => void;
};

export default function EditMemberModal({
  onClose,
  onMemberUpdated,
}: EditMemberModalProps) {
  const { isEditModalOpen, selectedMember, closeEditModal } =
    useMemberActionsStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [checkingUniqueness, setCheckingUniqueness] = useState<{
    username: boolean;
    email: boolean;
  }>({ username: false, email: false });

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }

    // Fallback
    return 'Unknown User';
  };

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null,
    changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
  ) => {
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: user?._id || 'unknown',
          username: getUserDisplayName(),
          userRole: 'user',
          previousData: previousData || null,
          newData: newData || null,
          changes: changes || [], // Use provided changes or empty array
        }),
      });

      if (!response.ok) {
        console.error('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    occupation: '',
    address: '',
    points: 0,
    uaccount: 0,
    gamingLocation: '',
  });

  // Debounce username and email for uniqueness checks (must be after formData declaration)
  const debouncedUsername = useDebounce(formData.username, 500);
  const debouncedEmail = useDebounce(formData.email, 500);

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; sasEnabled?: boolean }>
  >([]);

  // Store original form data for accurate comparison
  const [originalFormData, setOriginalFormData] = useState<
    typeof formData | null
  >(null);

  // Fetch locations when modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      const fetchLocations = async () => {
        try {
          const response = await axios.get('/api/machines/locations');
          const locationsData = response.data.locations || [];
          const mappedLocations = locationsData.map(
            (loc: { _id: string; name: string; sasEnabled?: boolean }) => ({
              id: loc._id,
              name: loc.name,
              sasEnabled: loc.sasEnabled || false,
            })
          );
          setLocations(mappedLocations);
        } catch (error) {
          console.error('Error fetching locations:', error);
          toast.error('Failed to load locations', {
            position: 'top-center',
          });
        }
      };

      fetchLocations();
    }
  }, [isEditModalOpen]);

  // Initialize form data when a member is selected
  useEffect(() => {
    if (selectedMember && selectedMember.profile) {
      // Helper to trim string values
      const trimValue = (value: string | undefined | null): string => {
        return (value || '').trim();
      };

      const loadedFormData = {
        firstName: trimValue(selectedMember.profile.firstName),
        lastName: trimValue(selectedMember.profile.lastName),
        username: trimValue(selectedMember.username),
        email: trimValue(selectedMember.profile.email),
        phoneNumber: trimValue(selectedMember.phoneNumber),
        occupation: trimValue(selectedMember.profile.occupation),
        address: trimValue(selectedMember.profile.address),
        points: selectedMember.points || 0,
        uaccount: selectedMember.uaccount || 0,
        gamingLocation: selectedMember.gamingLocation || '',
      };

      setFormData(loadedFormData);
      setOriginalFormData(loadedFormData); // Store original for comparison
    }
  }, [selectedMember]);

  useEffect(() => {
    if (isEditModalOpen) {
      // Prevent body scrolling when modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        }
      );

      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
      // Reset validation state when modal opens
      setTouched({});
      setSubmitAttempted(false);
      setErrors({});

      // Cleanup: restore body scrolling when modal closes
      return () => {
        document.body.style.overflow = originalStyle;
      };
    } else {
      // Restore scrolling when modal is closed
      document.body.style.overflow = '';
      return undefined;
    }
  }, [isEditModalOpen]);

  // Debounced validation - only validate fields that have been touched or on submit
  useEffect(() => {
    const handler = setTimeout(() => {
      const newErrors: Record<string, string> = { ...errors }; // Preserve uniqueness errors
      const firstName = (formData.firstName || '').trim();
      const lastName = (formData.lastName || '').trim();
      const username = (formData.username || '').trim();
      const email = (formData.email || '').trim();
      const phoneNumber = (formData.phoneNumber || '').trim();
      const occupation = (formData.occupation || '').trim();
      const address = (formData.address || '').trim();

      // Only validate format/pattern errors if field has been touched (user typed something)
      // Required errors only show after submit attempt
      const shouldValidateFormat = (fieldName: string) => touched[fieldName];
      const shouldValidateRequired = (_fieldName: string) => submitAttempted;

      // Username validation
      if (shouldValidateRequired('username') && !username) {
        newErrors.username = 'Username is required.';
      } else if (shouldValidateFormat('username') && username) {
        if (username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters.';
        } else if (containsEmailPattern(username)) {
          newErrors.username = 'Username cannot look like an email address.';
        } else if (containsPhonePattern(username)) {
          newErrors.username = 'Username cannot look like a phone number.';
        } else if (!validateUsername(username)) {
          newErrors.username =
            'Username may only contain letters, numbers, spaces, hyphens, and apostrophes.';
        } else if (email && username.toLowerCase() === email.toLowerCase()) {
          newErrors.username =
            'Username must be different from your email address.';
        }
        // Uniqueness check is handled separately via debounced effect
      }

      // First name validation
      if (shouldValidateRequired('firstName') && !firstName) {
        newErrors.firstName = 'First name is required.';
      } else if (shouldValidateFormat('firstName') && firstName) {
        if (firstName.length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters.';
        } else if (!validateNameField(firstName)) {
          newErrors.firstName =
            'First name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Last name validation
      if (shouldValidateRequired('lastName') && !lastName) {
        newErrors.lastName = 'Last name is required.';
      } else if (shouldValidateFormat('lastName') && lastName) {
        if (lastName.length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters.';
        } else if (!validateNameField(lastName)) {
          newErrors.lastName =
            'Last name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Email validation (optional but must be valid if provided)
      if (email && shouldValidateFormat('email')) {
        if (!validateEmail(email)) {
          newErrors.email = 'Provide a valid email address.';
        } else if (isPlaceholderEmail(email)) {
          newErrors.email =
            'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
        } else if (containsPhonePattern(email)) {
          newErrors.email = 'Email address cannot resemble a phone number.';
        } else if (username && email.toLowerCase() === username.toLowerCase()) {
          newErrors.email = 'Email address must differ from your username.';
        }
        // Uniqueness check is handled separately via debounced effect
      }

      // Phone number validation (optional but must be valid if provided)
      if (phoneNumber && shouldValidateFormat('phoneNumber')) {
        if (!validatePhoneNumber(phoneNumber)) {
          newErrors.phoneNumber =
            'Provide a valid phone number (7-20 digits, may include spaces, hyphens, parentheses, and leading +).';
        }
      }

      // Address validation (optional but must be valid if provided)
      if (address && shouldValidateFormat('address')) {
        if (address.length < 3) {
          newErrors.address = 'Address must be at least 3 characters.';
        } else if (!validateStreetAddress(address)) {
          newErrors.address =
            'Address may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Occupation validation (optional but must be valid if provided)
      if (occupation && shouldValidateFormat('occupation')) {
        if (occupation.length < 2) {
          newErrors.occupation = 'Occupation must be at least 2 characters.';
        } else if (containsPhonePattern(occupation)) {
          newErrors.occupation = 'Occupation cannot look like a phone number.';
        }
      }

      setErrors(newErrors);
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formData.firstName,
    formData.lastName,
    formData.username,
    formData.email,
    formData.phoneNumber,
    formData.occupation,
    formData.address,
    touched,
    submitAttempted,
    errors, // Include errors to preserve uniqueness errors
  ]);

  // Debounced uniqueness check for username and email
  useEffect(() => {
    const checkUniqueness = async () => {
      if (!selectedMember?._id) return;

      const trimmedUsername = debouncedUsername.trim();
      const trimmedEmail = debouncedEmail.trim();

      // Only check if field is touched and has valid format
      const shouldCheckUsername =
        touched.username &&
        trimmedUsername.length >= 3 &&
        validateUsername(trimmedUsername) &&
        !containsEmailPattern(trimmedUsername) &&
        !containsPhonePattern(trimmedUsername);

      const shouldCheckEmail =
        touched.email &&
        trimmedEmail &&
        validateEmail(trimmedEmail) &&
        !isPlaceholderEmail(trimmedEmail) &&
        !containsPhonePattern(trimmedEmail);

      if (!shouldCheckUsername && !shouldCheckEmail) {
        return;
      }

      try {
        setCheckingUniqueness(prev => ({
          username: shouldCheckUsername || prev.username,
          email: shouldCheckEmail || prev.email,
        }));

        const params = new URLSearchParams();
        if (shouldCheckUsername) {
          params.append('username', trimmedUsername);
        }
        if (shouldCheckEmail) {
          params.append('email', trimmedEmail);
        }
        params.append('excludeId', selectedMember._id);

        const response = await axios.get(
          `/api/members/check-unique?${params.toString()}`
        );
        const data = response.data;

        setErrors(prev => {
          const newErrors = { ...prev };
          if (shouldCheckUsername) {
            if (!data.usernameAvailable) {
              newErrors.username = 'This username is already taken.';
            } else {
              delete newErrors.username;
            }
          }
          if (shouldCheckEmail) {
            if (!data.emailAvailable) {
              newErrors.email = 'This email address is already in use.';
            } else {
              delete newErrors.email;
            }
          }
          return newErrors;
        });
      } catch (error) {
        console.error('Error checking uniqueness:', error);
      } finally {
        setCheckingUniqueness(prev => ({
          username: shouldCheckUsername ? false : prev.username,
          email: shouldCheckEmail ? false : prev.email,
        }));
      }
    };

    checkUniqueness();
  }, [
    debouncedUsername,
    debouncedEmail,
    touched.username,
    touched.email,
    selectedMember?._id,
  ]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        closeEditModal();
        onClose();
      },
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async () => {
    if (!selectedMember?._id) {
      toast.error('No member selected', {
        position: 'top-center',
      });
      return;
    }

    if (!originalFormData) {
      toast.error('Member details not loaded', {
        position: 'top-center',
      });
      return;
    }

    setSubmitAttempted(true);

    // Mark all required fields as touched to show validation
    const requiredFields = ['firstName', 'lastName'];
    const newTouched: Record<string, boolean> = { ...touched };
    requiredFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    // Wait a bit for validation to run
    await new Promise(resolve => setTimeout(resolve, 350));

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the errors before submitting.', {
        position: 'top-center',
      });
      return;
    }

    // Compare original loaded data with current form data
    // Trim all values before comparison to ensure accurate change detection
    const trimValue = (value: string): string => (value || '').trim();

    const originalData = {
      profile: {
        firstName: trimValue(originalFormData.firstName),
        lastName: trimValue(originalFormData.lastName),
        email: trimValue(originalFormData.email),
        occupation: trimValue(originalFormData.occupation),
        address: trimValue(originalFormData.address),
      },
      phoneNumber: trimValue(originalFormData.phoneNumber),
      points: originalFormData.points,
      uaccount: originalFormData.uaccount,
      gamingLocation: originalFormData.gamingLocation,
    };

    const currentData = {
      profile: {
        firstName: trimValue(formData.firstName),
        lastName: trimValue(formData.lastName),
        email: trimValue(formData.email),
        occupation: trimValue(formData.occupation),
        address: trimValue(formData.address),
      },
      phoneNumber: trimValue(formData.phoneNumber),
      points: formData.points,
      uaccount: formData.uaccount,
      gamingLocation: formData.gamingLocation,
    };

    // Detect actual changes between original and current form data
    const changes = detectChanges(originalData, currentData);
    const meaningfulChanges = filterMeaningfulChanges(changes);

    // Only proceed if there are actual changes
    if (meaningfulChanges.length === 0) {
      toast.info('No changes detected', {
        position: 'top-center',
      });
      return;
    }

    // Build update payload with ONLY changed fields
    // Trim all string values to ensure no blank fields
    const updatePayload: Record<string, unknown> = {};
    meaningfulChanges.forEach(change => {
      const fieldPath = change.path;
      let value = change.newValue;

      // Trim string values (except for gamingLocation which should remain as-is)
      if (typeof value === 'string' && fieldPath !== 'gamingLocation') {
        value = value.trim();
      }

      // For gamingLocation, ensure it's a valid non-empty string
      // Since gamingLocation is required, we must always include it if it's changed
      if (fieldPath === 'gamingLocation') {
        if (typeof value === 'string' && value.trim()) {
          value = value.trim();
        } else {
          // If gamingLocation is empty, don't include it in payload
          // This means the user didn't change it or cleared it
          // The API will preserve the existing value
          return;
        }
      }

      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        if (!updatePayload[parent]) {
          updatePayload[parent] = {};
        }
        (updatePayload[parent] as Record<string, unknown>)[child] = value;
      } else {
        updatePayload[fieldPath] = value;
      }
    });

    console.warn(
      '🔍 MEMBER UPDATE PAYLOAD:',
      JSON.stringify(updatePayload, null, 2)
    );

    setLoading(true);
    try {
      const response = await axios.put(
        `/api/members/${selectedMember._id}`,
        updatePayload
      );

      if (response.status === 200) {
        // Log the update activity with proper change tracking
        const changesSummary = getChangesSummary(meaningfulChanges);
        await logActivity(
          'update',
          'member',
          selectedMember._id,
          `${selectedMember.profile?.firstName || 'Unknown'} ${
            selectedMember.profile?.lastName || 'Member'
          }`,
          `Updated member: ${changesSummary}`,
          selectedMember, // Previous data
          response.data, // New data
          meaningfulChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          }))
        );

        toast.success(`Member updated successfully: ${changesSummary}`, {
          position: 'top-center',
        });
        onMemberUpdated();
        handleClose();
      } else {
        toast.error('Failed to update member', {
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('Error updating member:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update member';
      toast.error(errorMessage, {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isEditModalOpen) return null;

  return (
    <>
      {/* Backdrop - covers entire screen including sidebar */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-end justify-center lg:items-center">
        <div
          ref={modalRef}
          className="pointer-events-auto relative flex h-full w-full max-w-full flex-col overflow-y-auto bg-gray-50 animate-in md:max-w-2xl lg:max-h-[95vh] lg:max-w-4xl lg:rounded-xl"
          style={{ opacity: 1 }}
        >
          {/* Modern Header - Sticky */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  Edit Member
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Update member information below
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-9 w-9 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content Area with Cards */}
          <div className="flex-1 space-y-6 p-6">
            {/* Profile Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Basic account information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                  {/* Left: Profile Picture */}
                  <div className="flex flex-col items-center lg:items-start">
                    <div className="relative">
                      <Image
                        src={defaultAvatar}
                        alt="Member Avatar"
                        width={140}
                        height={140}
                        className="rounded-full border-4 border-gray-100 bg-gray-50 shadow-sm"
                      />
                    </div>
                    <div className="mt-3 flex flex-col items-center gap-1 lg:items-start">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedMember?.profile?.firstName &&
                        selectedMember?.profile?.lastName
                          ? `${selectedMember.profile.firstName} ${selectedMember.profile.lastName}`
                          : selectedMember?.username || 'Member'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formData.email || 'No email'}
                      </p>
                      {formData.username && (
                        <p className="text-xs text-gray-500">
                          @{formData.username}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Account Details */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Username Field */}
                      <div>
                        <Label htmlFor="username" className="text-gray-700">
                          Username *
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Enter username"
                            className={`${
                              errors.username
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            disabled={checkingUniqueness.username}
                          />
                          {checkingUniqueness.username && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                        {errors.username && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {errors.username}
                          </p>
                        )}
                      </div>

                      {/* Email Field */}
                      <div>
                        <Label htmlFor="email" className="text-gray-700">
                          Email Address
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                            className={`${
                              errors.email
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            disabled={checkingUniqueness.email}
                          />
                          {checkingUniqueness.email && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                        {errors.email && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* First Name */}
                      <div>
                        <Label htmlFor="firstName" className="text-gray-700">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Enter first name"
                          className={`mt-2 ${
                            errors.firstName
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors.firstName && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {errors.firstName}
                          </p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <Label htmlFor="lastName" className="text-gray-700">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Enter last name"
                          className={`mt-2 ${
                            errors.lastName
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors.lastName && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {errors.lastName}
                          </p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div>
                        <Label htmlFor="phoneNumber" className="text-gray-700">
                          Phone Number
                        </Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          className={`mt-2 ${
                            errors.phoneNumber
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors.phoneNumber && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {errors.phoneNumber}
                          </p>
                        )}
                      </div>

                      {/* Occupation */}
                      <div>
                        <Label htmlFor="occupation" className="text-gray-700">
                          Occupation
                        </Label>
                        <Input
                          id="occupation"
                          name="occupation"
                          value={formData.occupation}
                          onChange={handleInputChange}
                          placeholder="Enter occupation"
                          className={`mt-2 ${
                            errors.occupation
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors.occupation && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {errors.occupation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>
                  Physical address and location information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="address" className="text-gray-700">
                      Street Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter street address"
                      className={`mt-2 ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.address && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {errors.address}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  Member account balance, points, and location assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="points" className="text-gray-700">
                      Points
                    </Label>
                    <Input
                      id="points"
                      name="points"
                      type="number"
                      value={formData.points}
                      onChange={handleInputChange}
                      placeholder="Points"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="uaccount" className="text-gray-700">
                      Account Balance
                    </Label>
                    <Input
                      id="uaccount"
                      name="uaccount"
                      type="number"
                      value={formData.uaccount}
                      onChange={handleInputChange}
                      placeholder="Account Balance"
                      className="mt-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="gamingLocation" className="text-gray-700">
                      Location
                    </Label>
                    <div className="mt-2">
                      <LocationSingleSelect
                        locations={locations}
                        selectedLocation={formData.gamingLocation}
                        onSelectionChange={locationId => {
                          const validLocationId =
                            locationId === 'all' || !locationId
                              ? formData.gamingLocation
                              : locationId;
                          setFormData(prev => ({
                            ...prev,
                            gamingLocation: validLocationId,
                          }));
                          setTouched(prev => ({
                            ...prev,
                            gamingLocation: true,
                          }));
                        }}
                        placeholder="Select location..."
                        includeAllOption={false}
                        showSasBadge={false}
                        className="w-full"
                        searchPlaceholder="Search locations..."
                        emptyMessage="No locations found"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-w-[100px] gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || Object.keys(errors).length > 0}
                className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
