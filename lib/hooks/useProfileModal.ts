/**
 * useProfileModal Hook
 *
 * Encapsulates state and logic for the Profile Modal.
 * Handles user data fetching, profile updates, password changes, and permission management.
 */

'use client';

import type { MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { User as AdminUser } from '@/lib/types/administration';
import type { Country } from '@/lib/types/country';
import type { Licensee } from '@/lib/types/licensee';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  assignedLicensees?: string[];
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
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseesLoading, setLicenseesLoading] = useState(false);
  const [locations, setLocations] = useState<
    Array<{ _id: string; name: string; licenseeId?: string }>
  >([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [missingLocationNames] = useState<Record<string, string>>({});
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    if (open && authUser?._id) {
      setIsLoading(true);
      fetchUserData(authUser._id)
        .then(data => {
          if (data) {
            setUserData(data);
            setFormData(data.profile || {});
            setProfilePicture(data.profilePicture || null);
            setSelectedRoles(data.roles || []);

            // Set initial assignments
            if (data.rel?.licencee) {
              const isAll = data.rel.licencee === 'all';
              setAllLicenseesSelected(isAll);
              setSelectedLicenseeIds(
                isAll
                  ? []
                  : Array.isArray(data.rel.licencee)
                    ? data.rel.licencee
                    : [data.rel.licencee]
              );
            }
            if (data.resourcePermissions?.['gaming-locations']?.resources) {
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

  // Load countries, licensees, and locations
  useEffect(() => {
    if (open) {
      setCountriesLoading(true);
      fetchCountries()
        .then(data => {
          const unique = Array.from(
            new Map(data.map((c: Country) => [c.name, c])).values()
          );
          setCountries(unique as Country[]);
        })
        .finally(() => setCountriesLoading(false));

      setLicenseesLoading(true);
      fetchLicensees()
        .then(data => {
          if (data && 'licensees' in data) {
            setLicensees((data as { licensees: Licensee[] }).licensees);
          } else {
            setLicensees(Array.isArray(data) ? data : []);
          }
        })
        .finally(() => setLicenseesLoading(false));

      setLocationsLoading(true);
      axios
        .get('/api/gaming-locations')
        .then(res => setLocations(res.data))
        .finally(() => setLocationsLoading(false));
    }
  }, [open]);

  // Options for multi-select
  const licenseeOptions: MultiSelectOption[] = useMemo(
    () => licensees.map(l => ({ id: String(l._id), label: l.name })),
    [licensees]
  );

  const availableLocations = useMemo(() => {
    if (allLicenseesSelected) return locations;
    return locations.filter(
      loc =>
        loc.licenseeId && selectedLicenseeIds.includes(String(loc.licenseeId))
    );
  }, [locations, allLicenseesSelected, selectedLicenseeIds]);

  const locationOptions: MultiSelectOption[] = useMemo(
    () => availableLocations.map(l => ({ id: String(l._id), label: l.name })),
    [availableLocations]
  );

  // Handle image upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // Handle profile save
  const handleSave = async () => {
    if (!userData || !authUser?._id) return;

    setIsLoading(true);
    try {
      const updatedUser = {
        ...userData,
        profile: formData,
        profilePicture,
        roles: selectedRoles,
        rel: {
          ...userData.rel,
          licencee: allLicenseesSelected ? 'all' : selectedLicenseeIds,
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
    passwordData,
    setPasswordData,
    isLoading,
    isEditMode,
    setIsEditMode,
    countries,
    countriesLoading,
    licensees,
    licenseesLoading,
    licenseeOptions,
    locations,
    locationsLoading,
    locationOptions,
    availableLocations,
    missingLocationNames,
    selectedLicenseeIds,
    setSelectedLicenseeIds,
    selectedLocationIds,
    setSelectedLocationIds,
    allLicenseesSelected,
    setAllLicenseesSelected,
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
  };
}
