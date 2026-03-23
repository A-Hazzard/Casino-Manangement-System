/**
 * useProfileModal Hook
 *
 * Encapsulates state and logic for the Profile Modal.
 * Handles user data fetching, profile updates, password changes, and permission management.
 */

'use client';

import { ChangeEvent } from 'react';
import type { MultiSelectOption } from '@/components/shared/ui/common/MultiSelectDropdown';
import { fetchLicencees } from '@/lib/helpers/client';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { User as AdminUser } from '@/lib/types/administration';
import type { Country, Licencee } from '@/lib/types/common';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const [passwordStrength] = useState({
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
  const [emailAddress, setEmailAddress] = useState<string>('');

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

            // Set initial assignments (Support current API fields)
            if (data.assignedLicencees) {
              const assigned = Array.isArray(data.assignedLicencees) ? data.assignedLicencees : [];
              if (assigned.includes('all')) {
                setAllLicenceesSelected(true);
                setSelectedLicenceeIds([]);
              } else {
                setSelectedLicenceeIds(assigned);
              }
            } else if (data.rel?.licencee) {
              // Fallback for legacy data
              const isAll = data.rel.licencee === 'all';
              setAllLicenceesSelected(isAll);
              setSelectedLicenceeIds(
                isAll
                  ? []
                  : Array.isArray(data.rel.licencee)
                    ? data.rel.licencee
                    : [data.rel.licencee]
              );
            }

            if (data.assignedLocations) {
              const assigned = Array.isArray(data.assignedLocations) ? data.assignedLocations : [];
              if (assigned.includes('all')) {
                setAllLocationsSelected(true);
                setSelectedLocationIds([]);
              } else {
                setSelectedLocationIds(assigned);
              }
            } else if (data.resourcePermissions?.['gaming-locations']?.resources) {
              // Fallback for legacy data
              const resources =
                data.resourcePermissions['gaming-locations'].resources;
              const isAll = resources === 'all';
              setAllLocationsSelected(isAll);
              setSelectedLocationIds(
                isAll ? [] : Array.isArray(resources) ? resources : [resources]
              );
            }
          } else {
            toast.error('Could not load user profile.');
            onClose();
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, authUser?._id, onClose]);

  // Fetch static lists (Countries, Licencees, Locations)
  useEffect(() => {
    if (!open) {
      hasAttemptedLicenceeFetchRef.current = false;
      hasAttemptedLocationsFetchRef.current = false;
      hasReconciledLicenceesRef.current = false;
      return;
    }
    if (open) {
      // Fetch Countries if empty
      if (countries.length === 0 && !countriesLoading) {
        setCountriesLoading(true);
        fetchCountries()
          .then(data => {
            const unique = Array.from(
              new Map(data.map((c: Country) => [c.name, c])).values()
            );
            setCountries(unique as Country[]);
          })
          .finally(() => setCountriesLoading(false));
      }

      // Fetch Licencees only once per modal open
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

      // Fetch Locations once per modal open
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
    }
  }, [open, countries.length, countriesLoading]);

  // Reconcile stale licencee IDs once both userData and licencees are loaded
  useEffect(() => {
    if (hasReconciledLicenceesRef.current) return;
    if (!licencees.length || !userData || licenceesLoading) return;

    hasReconciledLicenceesRef.current = true;

    const isAdminOrDev = userData.roles?.some(r =>
      typeof r === 'string' && ['admin', 'developer'].includes(r)
    );

    const validIds = selectedLicenceeIds.filter(id =>
      id === 'all' || licencees.some(l => String(l._id) === id)
    );

    if (validIds.length < selectedLicenceeIds.length) {
      if (isAdminOrDev && validIds.length === 0) {
        // All stored IDs are orphaned — admin defaults to "All Licencees"
        setAllLicenceesSelected(true);
        setSelectedLicenceeIds([]);
      } else {
        // Remove only the orphaned IDs, keep valid ones
        setSelectedLicenceeIds(validIds);
      }
    }
  }, [licencees, licenceesLoading, userData, selectedLicenceeIds]);

  const attemptedMissingIdsRef = useRef<string | null>(null);

  // Handle missing location names specifically for the current user
  useEffect(() => {
    if (open && userData?.assignedLocations && locations.length > 0) {
      const missingIds = userData.assignedLocations.filter(
        id => id !== 'all' && !locations.find((l: typeof locations[0]) => String(l._id) === id)
      );

      if (missingIds.length > 0) {
        // We only try to fetch missing locations if we haven't already tried for these specific IDs
        const missingKey = missingIds.sort().join(',');

        if (attemptedMissingIdsRef.current !== missingKey) {
          attemptedMissingIdsRef.current = missingKey;
          axios.get('/api/gaming-locations', {
            params: { ids: missingKey, includeDeleted: true }
          }).then(res => {
            if (Array.isArray(res.data)) {
              setLocations(prev => {
                const existingIds = new Set(prev.map(p => String(p._id)));
                const newOnly = res.data.filter((d: typeof locations[0]) => !existingIds.has(String(d._id)));
                return [...prev, ...newOnly];
              });
            }
          }).catch(err => {
            console.error('Failed to fetch missing locations', err);
          });
        }
      }
    }
  }, [open, userData?.assignedLocations, locations.length]);

  // Options for multi-select
  const licenceeOptions: MultiSelectOption[] = useMemo(
    () => licencees.map(l => ({ id: String(l._id), label: l.name })),
    [licencees]
  );

  const availableLocations = useMemo(() => {
    if (allLicenceesSelected) return locations;
    return locations.filter(
      loc =>
        loc.licenceeId && selectedLicenceeIds.includes(String(loc.licenceeId))
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
    const firstName = (formData?.firstName || '').trim();
    const lastName = (formData?.lastName || '').trim();
    const town = (formData?.address?.town || '').trim();
    const region = (formData?.address?.region || '').trim();
    const country = (formData?.address?.country || '').trim();
    const idType = (formData?.identification?.idType || '').trim();
    const idNumber = (formData?.identification?.idNumber || '').trim();

    // First name validation
    if (firstName && firstName.length > 0) {
      if (firstName.length < 3) {
        errors.firstName = 'First name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(firstName)) {
        errors.firstName = 'First name cannot look like an email address.';
      } else if (!/^[A-Za-z\s]+$/.test(firstName)) {
        errors.firstName = 'First name may only contain letters and spaces.';
      }
    }

    // Last name validation
    if (lastName && lastName.length > 0) {
      if (lastName.length < 3) {
        errors.lastName = 'Last name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(lastName)) {
        errors.lastName = 'Last name cannot look like an email address.';
      } else if (!/^[A-Za-z\s]+$/.test(lastName)) {
        errors.lastName = 'Last name may only contain letters and spaces.';
      }
    }

    // Town validation
    if (town && town.length > 0) {
      if (town.length < 3) {
        errors.town =
          'Town must be at least 3 characters and may only contain letters, numbers, spaces, commas, and full stops.';
      } else if (!/^[A-Za-z0-9\s,\.]+$/.test(town)) {
        errors.town =
          'Town may only contain letters, numbers, spaces, commas, and full stops.';
      }
    }

    // Region validation
    if (region && region.length > 0) {
      if (region.length < 3) {
        errors.region =
          'Region must be at least 3 characters and may only contain letters, numbers, spaces, commas, and full stops.';
      } else if (!/^[A-Za-z0-9\s,\.]+$/.test(region)) {
        errors.region =
          'Region may only contain letters, numbers, spaces, commas, and full stops.';
      }
    }

    // Country validation (check if it's a country name, not ID)
    if (country && country.length > 0) {
      // Check if it's a country ID (MongoDB ObjectId-like) or name
      const isCountryId = /^[0-9a-fA-F]{24}$/.test(country);
      const countryName = isCountryId
        ? countries.find(c => c._id === country)?.name || ''
        : country;

      if (countryName && countryName.length > 0) {
        if (countryName.length < 3) {
          errors.country =
            'Country must be at least 3 characters and may only contain letters, spaces, and ampersands (&).';
        } else if (!/^[A-Za-z\s&]+$/.test(countryName)) {
          errors.country = 'Country may only contain letters, spaces, and ampersands (&).';
        }
      }
    }

    // ID Type validation
    if (idType && idType.length > 0) {
      if (idType.length < 3) {
        errors.idType =
          'ID type must be at least 3 characters and may only contain letters and spaces.';
      } else if (!/^[A-Za-z\s]+$/.test(idType)) {
        errors.idType = 'ID type may only contain letters and spaces.';
      }
    }

    // ID Number validation
    if (idNumber && idNumber.length > 0) {
      if (idNumber.length < 3) {
        errors.idNumber = 'ID number must be at least 3 characters.';
      }
    }

    // Date of birth validation
    if (formData?.identification?.dateOfBirth) {
      const dob = new Date(formData.identification.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        errors.dateOfBirth =
          'Date of birth must be a valid date and cannot be in the future.';
      }
    }

    // Email validation
    if (!emailAddress) {
      errors.emailAddress = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(emailAddress)) {
      errors.emailAddress = 'Please enter a valid email address.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile save
  const handleSave = async () => {
    if (!userData || !authUser?._id) return;

    // Validate before saving
    if (!validateFormData()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setIsLoading(true);
    try {
      // Convert country ID to country name if needed
      let countryName = formData?.address?.country || '';
      if (countryName && /^[0-9a-fA-F]{24}$/.test(countryName)) {
        const country = countries.find(c => c._id === countryName);
        if (country) {
          countryName = country.name;
        }
      }

      const updatedUser = {
        ...userData,
        emailAddress: emailAddress.trim(),
        email: emailAddress.trim(),
        profile: formData
          ? {
            ...formData,
            address: formData.address
              ? {
                ...formData.address,
                country: countryName,
              }
              : undefined,
          }
          : {},
        profilePicture,
        roles: selectedRoles,
        assignedLocations: allLocationsSelected ? ['all'] : selectedLocationIds,
        assignedLicencees: allLicenceesSelected ? ['all'] : selectedLicenceeIds,
        // Legacy fields for backward compatibility if needed by SMIB/other systems
        rel: {
          ...userData.rel,
          licencee: allLicenceesSelected ? 'all' : selectedLicenceeIds,
        },
        resourcePermissions: {
          ...userData.resourcePermissions,
          'gaming-locations': {
            ...userData.resourcePermissions?.['gaming-locations'],
            resources: allLocationsSelected ? 'all' : selectedLocationIds,
          },
        },
      };

      const res = await axios.put(`/api/users/${authUser._id}`, updatedUser);

      if (res.data.success) {
        toast.success('Profile updated successfully!');
        setUserData(res.data.user);
        setIsEditMode(false);
        setValidationErrors({});
      }
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('/api/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch {
      toast.error('Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userData,
    formData,
    setFormData,
    emailAddress,
    setEmailAddress,
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
  };
}

