'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/lib/utils/hooks';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { X, UserPlus } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import {
  validateEmail,
  validateNameField,
  validateUsername,
  validatePhoneNumber,
  validateStreetAddress,
  containsPhonePattern,
  containsEmailPattern,
  isPlaceholderEmail,
} from '@/lib/utils/validation';

type NewMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onMemberCreated: () => void;
};

export default function NewMemberModal({
  isOpen,
  onClose,
  onMemberCreated,
}: NewMemberModalProps) {
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [, setCheckingUniqueness] = useState<{
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
    newData?: Record<string, unknown> | null
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
          changes: [], // Will be calculated by the API
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
    email: '',
    phoneNumber: '',
    occupation: '',
    address: '',
    points: 0,
    uaccount: 0,
    username: '',
    pin: '0000',
    gamingLocation: '',
  });

  // Debounce username and email for uniqueness checks (must be after formData declaration)
  const debouncedUsername = useDebounce(formData.username, 500);
  const debouncedEmail = useDebounce(formData.email, 500);

  const [locations, setLocations] = useState<Array<{ id: string; name: string; sasEnabled?: boolean }>>([]);

  // Fetch locations when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchLocations = async () => {
        try {
          const response = await axios.get('/api/machines/locations');
          const locationsData = response.data.locations || [];
          const mappedLocations = locationsData.map((loc: { _id: string; name: string; sasEnabled?: boolean }) => ({
            id: loc._id,
            name: loc.name,
            sasEnabled: loc.sasEnabled || false,
          }));
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
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // Debounced validation - only validate fields that have been touched or on submit
  useEffect(() => {
    const handler = setTimeout(() => {
      const newErrors: Record<string, string> = {};
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
      }

      // Email validation (optional but must be valid if provided)
      if (email && shouldValidateFormat('email')) {
        if (!validateEmail(email)) {
          newErrors.email = 'Provide a valid email address.';
        } else if (isPlaceholderEmail(email)) {
          newErrors.email =
            'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
        } else if (username && email.toLowerCase() === username.toLowerCase()) {
          newErrors.email = 'Email address must differ from your username.';
        } else if (containsPhonePattern(email)) {
          newErrors.email = 'Email address cannot resemble a phone number.';
        }
      }

      // Phone number validation (optional but must be valid if provided)
      if (phoneNumber && shouldValidateFormat('phoneNumber')) {
        if (!validatePhoneNumber(phoneNumber)) {
          newErrors.phoneNumber = 'Provide a valid phone number (7-20 digits, may include spaces, hyphens, parentheses, and leading +).';
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
  }, [debouncedUsername, debouncedEmail, touched.username, touched.email]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
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
    setSubmitAttempted(true);

    // Mark all required fields as touched to show validation
    const requiredFields = ['firstName', 'lastName', 'username'];
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

    setLoading(true);
    try {
      // Trim all string fields to ensure no blank fields
      const response = await axios.post('/api/members', {
        profile: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          occupation: formData.occupation.trim(),
          address: formData.address.trim(),
        },
        phoneNumber: formData.phoneNumber.trim(),
        points: formData.points,
        uaccount: formData.uaccount,
        username: formData.username.trim(),
        pin: formData.pin.trim(),
        gamingLocation: formData.gamingLocation || 'default',
      });

      if (response.status === 201) {
        const createdMember = response.data;

        // Log the creation activity
        await logActivity(
          'create',
          'member',
          createdMember._id || formData.username,
          `${formData.firstName} ${formData.lastName}`,
          `Created new member: ${formData.firstName} ${formData.lastName} with username: ${formData.username}`,
          null, // No previous data for creation
          createdMember // New data
        );

        toast.success('Member created successfully', {
          position: 'top-center',
        });
        onMemberCreated();
        handleClose();
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          occupation: '',
          address: '',
          points: 0,
          uaccount: 0,
          username: '',
          pin: '0000',
          gamingLocation: '',
        });
        setTouched({});
        setSubmitAttempted(false);
        setErrors({});
      } else {
        toast.error('Failed to create member', {
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('Error creating member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create member';
      toast.error(errorMessage, {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="flex w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl md:max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-button px-4 py-3 text-white sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white bg-opacity-20 sm:h-10 sm:w-10">
                  <UserPlus className="h-4 w-4 text-white sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">Create New Member</h2>
                  <p className="hidden text-xs text-white text-opacity-90 sm:block sm:text-sm">
                    Add a new member to the system
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-white hover:bg-white hover:bg-opacity-20 sm:h-10 sm:w-10"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-800 sm:mb-4 sm:text-lg">
                  <div className="h-2 w-2 rounded-full bg-button"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-gray-700"
                    >
                      First Name *
                    </Label>
                     <Input
                       id="firstName"
                       name="firstName"
                       value={formData.firstName}
                       onChange={handleInputChange}
                       placeholder="Enter first name"
                       className={`${
                         errors.firstName ? 'border-red-500' : 'border-gray-300'
                       } focus:border-buttonActive focus:ring-buttonActive`}
                       required
                     />
                     {errors.firstName && (
                       <p className="mt-1 text-sm text-red-500">
                         {errors.firstName}
                       </p>
                     )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Last Name *
                    </Label>
                     <Input
                       id="lastName"
                       name="lastName"
                       value={formData.lastName}
                       onChange={handleInputChange}
                       placeholder="Enter last name"
                       className={`${
                         errors.lastName ? 'border-red-500' : 'border-gray-300'
                       } focus:border-buttonActive focus:ring-buttonActive`}
                       required
                     />
                     {errors.lastName && (
                       <p className="mt-1 text-sm text-red-500">
                         {errors.lastName}
                       </p>
                     )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700"
                  >
                    Username *
                  </Label>
                   <Input
                     id="username"
                     name="username"
                     value={formData.username}
                     onChange={handleInputChange}
                     placeholder="Enter username"
                     className={`${
                       errors.username ? 'border-red-500' : 'border-gray-300'
                     } focus:border-buttonActive focus:ring-buttonActive`}
                     required
                   />
                   {errors.username && (
                     <p className="mt-1 text-sm text-red-500">
                       {errors.username}
                     </p>
                   )}
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-800 sm:mb-4 sm:text-lg">
                  <div className="h-2 w-2 rounded-full bg-button"></div>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </Label>
                     <Input
                       id="email"
                       name="email"
                       type="email"
                       value={formData.email}
                       onChange={handleInputChange}
                       placeholder="Enter email address"
                       className={`${
                         errors.email ? 'border-red-500' : 'border-gray-300'
                       } focus:border-buttonActive focus:ring-buttonActive`}
                     />
                     {errors.email && (
                       <p className="mt-1 text-sm text-red-500">
                         {errors.email}
                       </p>
                     )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="phoneNumber"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </Label>
                     <Input
                       id="phoneNumber"
                       name="phoneNumber"
                       value={formData.phoneNumber}
                       onChange={handleInputChange}
                       placeholder="Enter phone number"
                       className={`${
                         errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                       } focus:border-buttonActive focus:ring-buttonActive`}
                     />
                     {errors.phoneNumber && (
                       <p className="mt-1 text-sm text-red-500">
                         {errors.phoneNumber}
                       </p>
                     )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-sm font-medium text-gray-700"
                  >
                    Address
                  </Label>
                   <Input
                     id="address"
                     name="address"
                     value={formData.address}
                     onChange={handleInputChange}
                     placeholder="Enter address"
                     className={`${
                       errors.address ? 'border-red-500' : 'border-gray-300'
                     } focus:border-buttonActive focus:ring-buttonActive`}
                   />
                   {errors.address && (
                     <p className="mt-1 text-sm text-red-500">
                       {errors.address}
                     </p>
                   )}
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="occupation"
                    className="text-sm font-medium text-gray-700"
                  >
                    Occupation
                  </Label>
                   <Input
                     id="occupation"
                     name="occupation"
                     value={formData.occupation}
                     onChange={handleInputChange}
                     placeholder="Enter occupation"
                     className={`${
                       errors.occupation ? 'border-red-500' : 'border-gray-300'
                     } focus:border-buttonActive focus:ring-buttonActive`}
                   />
                   {errors.occupation && (
                     <p className="mt-1 text-sm text-red-500">
                       {errors.occupation}
                     </p>
                   )}
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="gamingLocation"
                    className="text-sm font-medium text-gray-700"
                  >
                    Location
                  </Label>
                   <LocationSingleSelect
                     locations={locations}
                     selectedLocation={formData.gamingLocation}
                     onSelectionChange={(locationId) => {
                       setFormData(prev => ({
                         ...prev,
                         gamingLocation: locationId === 'all' ? '' : locationId,
                       }));
                       setTouched(prev => ({ ...prev, gamingLocation: true }));
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

              {/* Account Information Section */}
              <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-800 sm:mb-4 sm:text-lg">
                  <div className="h-2 w-2 rounded-full bg-button"></div>
                  Account Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="points"
                      className="text-sm font-medium text-gray-700"
                    >
                      Points
                    </Label>
                    <Input
                      id="points"
                      name="points"
                      type="number"
                      value={formData.points}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="uaccount"
                      className="text-sm font-medium text-gray-700"
                    >
                      Account Balance
                    </Label>
                    <Input
                      id="uaccount"
                      name="uaccount"
                      type="number"
                      value={formData.uaccount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="border-gray-300 focus:border-buttonActive focus:ring-buttonActive"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </Button>
               <Button
                 onClick={handleSubmit}
                 disabled={loading || Object.keys(errors).length > 0}
                 className="w-full bg-button text-white hover:bg-buttonActive sm:w-auto disabled:opacity-50"
               >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Member
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
