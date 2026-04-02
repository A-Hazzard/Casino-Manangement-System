/**
 * useProfileModal Hook
 *
 * Encapsulates state and logic for the Profile Modal.
 * Handles user data fetching, profile updates, password changes, and permission management.
 */

'use client';

import { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';
import { fetchLicencees } from '@/lib/helpers/client';
import { fetchCountries } from '@/lib/helpers/countries';
import type { MultiSelectOption } from '@/components/shared/ui/common/MultiSelectDropdown';
import type { User as AdminUser } from '@/lib/types/administration';
import type { Country, Licencee } from '@/lib/types/common';
import {
  validatePasswordStrength,
  getPasswordStrengthLabel,
} from '@/lib/utils/validation';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

// Extended User type for profile-specific fields
type User = AdminUser & {
  rel?: {
    licencee?: string | string[];
  };
  resourcePermissions?: {
    'gaming-locations'?: {
      resources: string | string[];
    };
  };
  assignedLicencees?: string[];
  assignedLocations?: string[];
};

type UseProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    return response.data.user;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch user data', error);
    }
    return null;
  }
}

export function useProfileModal({ open, onClose }: UseProfileModalProps) {
  const { user: authUser } = useUserStore();
  const [userData, setUserData] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User['profile']>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [licencees, setLicencees] = useState<Licencee[]>([]);
  const [licenceesLoading, setLicenceesLoading] = useState(false);
  const [locations, setLocations] = useState<
    Array<{
      _id: string;
      name: string;
      licenceeId?: string | string[];
      licencee?: string | string[];
      rel?: {
        licencee?: string | string[];
      }
    }>
  >([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [missingLocationNames] = useState<Record<string, string>>({});
  const [selectedLicenceeIds, setSelectedLicenceeIds] = useState<string[]>([]);
  const [allLicenceesSelected, setAllLicenceesSelected] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: 'Very Weak',
    feedback: [] as string[],
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [passwordReuseError, setPasswordReuseError] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState<boolean | null>(null);

  const validateCurrentPassword = async () => {
    if (!passwordData.currentPassword) {
      setIsCurrentPasswordVerified(null);
      return;
    }
    try {
      const { data } = await axios.post('/api/users/check-password', {
        password: passwordData.currentPassword,
        type: 'verify'
      });
      setIsCurrentPasswordVerified(data.isMatch);
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  const validateNewPassword = async () => {
    if (!passwordData.newPassword) {
      setPasswordReuseError(null);
      return;
    }
    try {
      const { data } = await axios.post('/api/users/check-password', {
        password: passwordData.newPassword,
        type: 'reuse'
      });
      if (data.isReuse) {
        setPasswordReuseError(data.reason);
      } else {
        setPasswordReuseError(null);
      }
    } catch (err) {
      console.error('Reuse check error:', err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAttemptedLicenceeFetchRef = useRef(false);
  const hasAttemptedLocationsFetchRef = useRef(false);
  const hasReconciledLicenceesRef = useRef(false);

  // Load initial data
  useEffect(() => {
    if (open && authUser?._id) {
      setIsLoading(true);
      fetchUserData(authUser._id)
        .then(data => {
          if (data) {
            setUserData(data);
            setFormData(data.profile || {});
            setEmailAddress(data.emailAddress || data.email || '');
            setProfilePicture(data.profilePicture || null);
            setSelectedRoles(data.roles || []);

            // Set initial assignments
            if (data.assignedLicencees) {
              const assigned = Array.isArray(data.assignedLicencees) ? data.assignedLicencees : [];
              if (assigned.includes('all')) {
                setAllLicenceesSelected(true);
                setSelectedLicenceeIds([]);
              } else {
                setSelectedLicenceeIds(assigned);
              }
            }

            if (data.assignedLocations) {
              const assigned = Array.isArray(data.assignedLocations) ? data.assignedLocations : [];
              if (assigned.includes('all')) {
                setAllLocationsSelected(true);
                setSelectedLocationIds([]);
              } else {
                setSelectedLocationIds(assigned);
              }
            }
          } else {
            toast.error('Could not load user profile.');
            onClose();
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, authUser?._id, onClose]);

  // Fetch static lists
  useEffect(() => {
    if (!open) {
      hasAttemptedLicenceeFetchRef.current = false;
      hasAttemptedLocationsFetchRef.current = false;
      hasReconciledLicenceesRef.current = false;
      return;
    }
    
    // Fetch Countries
    if (countries.length === 0 && !countriesLoading) {
      setCountriesLoading(true);
      fetchCountries()
        .then(data => {
          setCountries(data as Country[]);
        })
        .finally(() => setCountriesLoading(false));
    }

    // Fetch Licencees
    if (!hasAttemptedLicenceeFetchRef.current) {
      hasAttemptedLicenceeFetchRef.current = true;
      setLicenceesLoading(true);
      fetchLicencees(1, 1000)
        .then(data => {
          if (data && 'licencees' in data) {
            setLicencees((data as { licencees: Licencee[] }).licencees);
          } else {
            setLicencees(Array.isArray(data) ? data : []);
          }
        })
        .finally(() => setLicenceesLoading(false));
    }

    // Fetch Locations
    if (!hasAttemptedLocationsFetchRef.current) {
      hasAttemptedLocationsFetchRef.current = true;
      setLocationsLoading(true);
      axios
        .get('/api/gaming-locations')
        .then(res => {
          setLocations(res.data || []);
        })
        .finally(() => setLocationsLoading(false));
    }
  }, [open, countries.length]);
  // Update password strength
  useEffect(() => {
    if (passwordData.newPassword) {
      const validation = validatePasswordStrength(passwordData.newPassword);
      setPasswordStrength({
        score: validation.score,
        label: getPasswordStrengthLabel(validation.score),
        feedback: validation.feedback,
        requirements: validation.requirements,
      });
    } else {
      setPasswordStrength({
        score: 0,
        label: 'Very Weak',
        feedback: [],
        requirements: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      });
    }
  }, [passwordData.newPassword]);

  // Options for multi-select
  const licenceeOptions: MultiSelectOption[] = useMemo(
    () => licencees.map(l => ({ id: String(l._id), label: l.name })),
    [licencees]
  );

  const availableLocations = useMemo(() => {
    if (allLicenceesSelected) return locations;
    return locations.filter(
      loc => {
        const licId = loc.rel?.licencee || loc.licenceeId || loc.licencee;
        return Array.isArray(licId) 
          ? licId.some(id => selectedLicenceeIds.includes(String(id)))
          : selectedLicenceeIds.includes(String(licId));
      }
    );
  }, [locations, allLicenceesSelected, selectedLicenceeIds]);

  const locationOptions: MultiSelectOption[] = useMemo(
    () => availableLocations.map(l => ({ id: String(l._id), label: l.name })),
    [availableLocations]
  );

  // Handle image upload
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfilePicture(croppedImageUrl);
    setIsCropOpen(false);
  };

  // Validation function
  const validateFormData = (): boolean => {
    const errors: Record<string, string> = {};
    if (!emailAddress) {
      errors.emailAddress = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(emailAddress)) {
      errors.emailAddress = 'Please enter a valid email address.';
    }
    // Add more validation if needed
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile save
  const handleSave = async () => {
    if (!userData || !authUser?._id) return;

    if (!validateFormData()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = {
        ...userData,
        emailAddress: emailAddress.trim(),
        profile: formData,
        profilePicture,
        roles: selectedRoles,
        assignedLocations: allLocationsSelected ? ['all'] : selectedLocationIds,
        assignedLicencees: allLicenceesSelected ? ['all'] : selectedLicenceeIds,
      };

      const res = await axios.put(`/api/users/${authUser._id}`, updatedUser);

      if (res.data.success) {
        toast.success('Profile updated successfully!');
        setUserData(res.data.user);
        setIsEditMode(false);
      }
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!userData || !authUser?._id) return;

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (passwordStrength.score < 4) {
      toast.error('Password does not meet minimum security requirements.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put('/api/profile', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
        // Include other required profile fields if necessary, or ensure route handles partial updates
        username: userData.username,
        firstName: formData?.firstName,
        lastName: formData?.lastName,
        emailAddress: emailAddress,
      });
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userData,
    formData,
    setFormData,
    passwordData,
    setPasswordData,
    isLoading,
    isEditMode,
    setIsEditMode,
    countries,
    countriesLoading,
    licencees,
    licenceesLoading,
    licenceeOptions,
    locations,
    locationsLoading,
    locationOptions,
    availableLocations,
    missingLocationNames,
    selectedLicenceeIds,
    setSelectedLicenceeIds,
    selectedLocationIds,
    setSelectedLocationIds,
    allLicenceesSelected,
    setAllLicenceesSelected,
    allLocationsSelected,
    setAllLocationsSelected,
    selectedRoles,
    setSelectedRoles,
    profilePicture,
    isCropOpen,
    setIsCropOpen,
    rawImageSrc,
    fileInputRef,
    handleFileSelect,
    handleCropComplete,
    handleSave,
    handlePasswordChange,
    passwordStrength,
    validationErrors,
    setValidationErrors,
    emailAddress,
    setEmailAddress,
    isCurrentPasswordVerified,
    passwordReuseError,
    validateCurrentPassword,
    validateNewPassword,
  };
}
