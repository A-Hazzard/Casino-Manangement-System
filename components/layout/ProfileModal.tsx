/**
 * Profile Modal Component
 * Comprehensive user profile editor with image upload, form validation, and change detection.
 *
 * Features:
 * - User profile data editing (name, email, gender, DOB, address, ID, notes)
 * - Profile picture upload with cropping functionality
 * - Password change with strength validation
 * - Licensee and location permissions management
 * - Gaming location access control
 * - Form validation with error messages
 * - Change detection and unsaved changes warning
 * - Role-based field visibility
 * - Multi-select dropdowns for permissions
 * - Real-time password strength indicator
 * - Skeleton loading states
 * - Toast notifications for success/error states
 *
 * Large component (~2200 lines) handling complete user profile management.
 *
 * @param open - Whether the modal is visible
 * @param onClose - Callback to close the modal
 */
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import MultiSelectDropdown, {
  type MultiSelectOption,
} from '@/components/ui/common/MultiSelectDropdown';
import CircleCropModal from '@/components/ui/image/CircleCropModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { User } from '@/lib/types/administration';
import type { Country } from '@/lib/types/country';
import type { Licensee } from '@/lib/types/licensee';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import {
  getPasswordStrengthLabel,
  isValidDateInput,
  validateAlphabeticField,
  validateNameField,
  validateOptionalGender,
  validatePasswordStrength,
} from '@/lib/utils/validation';
import defaultAvatar from '@/public/defaultAvatar.svg';
import * as Dialog from '@radix-ui/react-dialog';
import axios from 'axios';
import { Camera, Pencil, Save, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    const { user } = response.data;
    return user;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch user data', error);
    }
    return null;
  }
}

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
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

  // Countries state
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // Licensees state
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [licenseesLoading, setLicenseesLoading] = useState(false);

  // Locations state
  const [locations, setLocations] = useState<
    Array<{ _id: string; name: string; licenseeId?: string }>
  >([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [missingLocationNames, setMissingLocationNames] = useState<
    Record<string, string>
  >({});

  // Licensee/Location assignment state
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);
  const assignmentsInitializedRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    feedback: string[];
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
      special: boolean;
    };
  }>({
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

  const normalizedAuthRoles =
    authUser?.roles?.map(role => role.toLowerCase()) || [];
  const isPrivilegedEditor = normalizedAuthRoles.some(role =>
    ['admin', 'developer'].includes(role)
  );

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!authUser) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (authUser.profile?.firstName && authUser.profile?.lastName) {
      return `${authUser.profile.firstName} ${authUser.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (authUser.profile?.firstName && !authUser.profile?.lastName) {
      return authUser.profile.firstName;
    }

    // If only lastName exists, use it
    if (!authUser.profile?.firstName && authUser.profile?.lastName) {
      return authUser.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (authUser.username && authUser.username.trim() !== '') {
      return authUser.username;
    }

    // If username doesn't exist or is blank, use email
    if (authUser.emailAddress && authUser.emailAddress.trim() !== '') {
      return authUser.emailAddress;
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
          userId: authUser?._id || 'unknown',
          username: getUserDisplayName(),
          userRole: 'user',
          previousData: previousData || null,
          newData: newData || null,
          changes: changes || [], // Use provided changes or empty array
        }),
      });

      if (!response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', response.statusText);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error logging activity:', error);
      }
    }
  };

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          } else {
            toast.error('Could not load user profile.');
            onClose();
          }
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching user data:', error);
          }
          toast.error('Failed to load user profile.');
          onClose();
        })
        .finally(() => setIsLoading(false));
    } else if (!open) {
      // Reset edit mode when modal is closed
      setIsEditMode(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [open, authUser, onClose]);

  // Load countries
  useEffect(() => {
    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const countriesData = await fetchCountries();

        // Remove duplicates based on country name using Map for better performance
        const uniqueCountriesMap = new Map();
        countriesData.forEach(country => {
          if (!uniqueCountriesMap.has(country.name)) {
            uniqueCountriesMap.set(country.name, country);
          }
        });
        const uniqueCountries = Array.from(uniqueCountriesMap.values());

        setCountries(uniqueCountries as unknown as Country[]);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        toast.error('Failed to load countries');
      } finally {
        setCountriesLoading(false);
      }
    };

    if (open) {
      loadCountries();
    }
  }, [open]);

  // Load licensees
  useEffect(() => {
    const loadLicensees = async () => {
      setLicenseesLoading(true);
      try {
        const result = await fetchLicensees();
        const licenseesData = Array.isArray(result.licensees)
          ? result.licensees
          : [];
        console.log('[ProfileModal] Fetched licensees:', licenseesData);
        console.log('[ProfileModal] Licensees count:', licenseesData.length);
        console.log(
          '[ProfileModal] Licensee IDs:',
          licenseesData.map(l => ({ id: String(l._id), name: l.name }))
        );
        setLicensees(licenseesData);
      } catch (error) {
        console.error('[ProfileModal] Failed to fetch licensees:', error);
        toast.error('Failed to load licensees');
      } finally {
        setLicenseesLoading(false);
      }
    };

    if (open) {
      loadLicensees();
    }
  }, [open]);

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      setLocationsLoading(true);
      try {
        type RawLocationResponse = {
          _id?: unknown;
          name?: unknown;
          rel?: { licencee?: unknown };
          licenceeId?: unknown;
        };

        // Use forceAll for privileged users or to ensure we get all locations for name resolution
        const forceAllParam = isPrivilegedEditor ? '&forceAll=true' : '';
        const response = await axios.get(
          `/api/locations?minimal=1${forceAllParam}`
        );
        const rawLocations: RawLocationResponse[] =
          response.data?.locations || [];
        const locationsData = rawLocations.map(location => {
          const relLicencee = location.rel?.licencee;
          let derivedLicenseeId: string | undefined;
          if (Array.isArray(relLicencee)) {
            derivedLicenseeId =
              relLicencee.length > 0 && relLicencee[0] != null
                ? String(relLicencee[0])
                : undefined;
          } else if (relLicencee != null) {
            derivedLicenseeId = String(relLicencee);
          } else if (location.licenceeId != null) {
            derivedLicenseeId = String(location.licenceeId);
          }

          return {
            _id: String(location._id ?? ''),
            name: String(location.name ?? 'Unknown'),
            licenseeId: derivedLicenseeId,
          };
        });
        console.log('[ProfileModal] Fetched locations:', locationsData.length);
        setLocations(locationsData);
      } catch (error) {
        console.error('[ProfileModal] Failed to fetch locations:', error);
        toast.error('Failed to load locations');
      } finally {
        setLocationsLoading(false);
      }
    };

    if (open) {
      loadLocations();
    }
  }, [open, isPrivilegedEditor]);

  // Fetch missing location names by ID
  useEffect(() => {
    const fetchMissingLocations = async () => {
      // Use only new field
      let locationIds: string[] = [];
      if (
        Array.isArray(userData?.assignedLocations) &&
        userData.assignedLocations.length > 0
      ) {
        locationIds = userData.assignedLocations;
      }

      if (locationIds.length === 0) return;
      if (locationsLoading) return; // Don't fetch if locations are still loading
      const missingIds = locationIds.filter(id => {
        const normalizedId = String(id);
        return !locations.find(l => String(l._id) === normalizedId);
      });

      if (missingIds.length === 0) return;

      // Check which ones we haven't fetched yet
      const idsToFetch = missingIds.filter(
        id => !missingLocationNames[String(id)]
      );

      if (idsToFetch.length === 0) return;

      console.log(
        '[ProfileModal] Fetching missing location names for IDs:',
        idsToFetch
      );

      // Fetch each missing location by ID using nameOnly to bypass access control
      const fetchPromises = idsToFetch.map(async locationId => {
        try {
          const normalizedId = String(locationId);
          // Use nameOnly=true to get just the name without access control checks
          const response = await axios.get(
            `/api/locations/${normalizedId}?nameOnly=true`
          );
          const locationData = response.data?.location || response.data;
          if (locationData?.name) {
            return { id: normalizedId, name: locationData.name };
          }
          return { id: normalizedId, name: `Unknown Location` };
        } catch (error) {
          console.error(
            `[ProfileModal] Failed to fetch location ${locationId}:`,
            error
          );
          return { id: String(locationId), name: `Unknown (${locationId})` };
        }
      });

      const results = await Promise.all(fetchPromises);
      const namesMap: Record<string, string> = {};
      results.forEach(result => {
        namesMap[result.id] = result.name;
      });

      setMissingLocationNames(prev => ({ ...prev, ...namesMap }));
    };

    if (open && userData && !locationsLoading && locations.length >= 0) {
      // Wait a bit for locations to finish loading, then fetch missing ones
      const timer = setTimeout(() => {
        void fetchMissingLocations();
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    open,
    userData,
    locations,
    locationsLoading,
    setMissingLocationNames,
    missingLocationNames,
  ]);

  // Reset assignment initialization when closing modal
  useEffect(() => {
    if (!open) {
      assignmentsInitializedRef.current = false;
    }
  }, [open]);

  // Initialize licensee/location selections when data available
  useEffect(() => {
    if (
      !open ||
      !userData ||
      licenseesLoading ||
      locationsLoading ||
      assignmentsInitializedRef.current
    ) {
      return;
    }

    const normalize = (value: unknown) => String(value);

    // Use only new field
    const userLicensees = (
      Array.isArray(userData?.assignedLicensees) &&
      userData.assignedLicensees.length > 0
        ? userData.assignedLicensees
        : []
    ).map(normalize);
    const isPrivileged = userData.roles?.some(role =>
      ['admin', 'developer'].includes(role.toLowerCase())
    );

    if (userLicensees.length > 0) {
      setSelectedLicenseeIds(userLicensees);
      if (licensees.length > 0 && userLicensees.length === licensees.length) {
        setAllLicenseesSelected(true);
      } else {
        setAllLicenseesSelected(false);
      }
    } else if (isPrivileged && licensees.length > 0) {
      setAllLicenseesSelected(true);
      setSelectedLicenseeIds(licensees.map(lic => String(lic._id)));
    } else {
      setAllLicenseesSelected(false);
      setSelectedLicenseeIds([]);
    }

    // Use only new field
    let userLocations: string[] = [];
    if (
      Array.isArray(userData?.assignedLocations) &&
      userData.assignedLocations.length > 0
    ) {
      userLocations = userData.assignedLocations.map(normalize);
    }
    if (userLocations.length > 0) {
      setSelectedLocationIds(userLocations);
      setAllLocationsSelected(false);
    } else if (isPrivileged && locations.length > 0) {
      setAllLocationsSelected(true);
      setSelectedLocationIds(locations.map(loc => loc._id));
    } else {
      setAllLocationsSelected(false);
      setSelectedLocationIds([]);
    }

    assignmentsInitializedRef.current = true;
  }, [
    open,
    userData,
    licensees,
    locations,
    licenseesLoading,
    locationsLoading,
  ]);

  const licenseeOptions: MultiSelectOption[] = useMemo(
    () =>
      licensees.map(licensee => ({
        id: String(licensee._id),
        label: licensee.name,
      })),
    [licensees]
  );

  const availableLocations = useMemo(() => {
    if (allLicenseesSelected) {
      return locations;
    }
    if (selectedLicenseeIds.length === 0) {
      return [];
    }
    return locations.filter(location =>
      location.licenseeId
        ? selectedLicenseeIds.includes(location.licenseeId)
        : true
    );
  }, [allLicenseesSelected, locations, selectedLicenseeIds]);

  const locationOptions: MultiSelectOption[] = useMemo(
    () =>
      availableLocations.map(location => ({
        id: location._id,
        label: location.name,
      })),
    [availableLocations]
  );

  const handleLicenseeSelectionChange = (newIds: string[]) => {
    setSelectedLicenseeIds(newIds);
    if (licensees.length > 0) {
      setAllLicenseesSelected(newIds.length === licensees.length);
    } else {
      setAllLicenseesSelected(false);
    }

    setSelectedLocationIds(prev =>
      prev.filter(locationId => {
        const location = locations.find(loc => loc._id === locationId);
        if (!location?.licenseeId) {
          return true;
        }
        return newIds.includes(location.licenseeId);
      })
    );
  };

  const handleAllLicenseesToggle = (checked: boolean) => {
    setAllLicenseesSelected(checked);
    if (checked) {
      setSelectedLicenseeIds(licensees.map(licensee => String(licensee._id)));
    } else {
      setSelectedLicenseeIds([]);
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
    }
  };

  const handleLocationSelectionChange = (newIds: string[]) => {
    setSelectedLocationIds(newIds);
    if (availableLocations.length > 0) {
      setAllLocationsSelected(newIds.length === availableLocations.length);
    } else {
      setAllLocationsSelected(false);
    }
  };

  const handleAllLocationsToggle = (checked: boolean) => {
    setAllLocationsSelected(checked);
    if (checked) {
      setSelectedLocationIds(availableLocations.map(location => location._id));
    } else {
      setSelectedLocationIds([]);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(prev => !prev);
  };

  const handleClose = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditMode(false);
    onClose();
  };

  // Keep location selections in sync when "All locations" is enabled
  useEffect(() => {
    if (!allLocationsSelected) return;
    const allIds = availableLocations.map(location => location._id);
    const hasDifference =
      allIds.length !== selectedLocationIds.length ||
      !allIds.every(id => selectedLocationIds.includes(id));
    if (hasDifference) {
      setSelectedLocationIds(allIds);
    }
  }, [allLocationsSelected, availableLocations, selectedLocationIds]);

  // Update password strength when new password changes
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

  const handleInputChange = (
    field: string,
    value: string,
    section?: 'address' | 'identification'
  ) => {
    setFormData((prev = {}) => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...(prev[section] || {}),
            [field]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        setRawImageSrc(e.target?.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditProfilePicture = () => {
    if (profilePicture || userData?.profilePicture) {
      // If there's an existing profile picture, open it for editing
      setRawImageSrc(profilePicture || userData?.profilePicture || null);
      setIsCropOpen(true);
    } else {
      // If no profile picture, open file selector
      fileInputRef.current?.click();
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfilePicture(croppedImageUrl);
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleSave = async () => {
    if (!userData) return;

    const sanitizedProfile: Partial<User['profile']> = {
      ...formData,
      address: { ...(formData?.address || {}) },
      identification: { ...(formData?.identification || {}) },
    };

    const ensureValidName = (
      value: unknown,
      label: string,
      options: { required?: boolean } = {}
    ): string => {
      if (typeof value !== 'string') {
        if (options.required) {
          throw new Error(`${label} is required.`);
        }
        return '';
      }

      const trimmed = value.trim();
      if (options.required && trimmed.length === 0) {
        throw new Error(`${label} is required.`);
      }
      if (trimmed && !validateNameField(trimmed)) {
        throw new Error(
          `${label} may only contain letters and spaces and cannot resemble a phone number.`
        );
      }
      return trimmed;
    };

    try {
      if (sanitizedProfile.firstName !== undefined) {
        sanitizedProfile.firstName = ensureValidName(
          sanitizedProfile.firstName,
          'First name'
        );
      }
      if (sanitizedProfile.lastName !== undefined) {
        sanitizedProfile.lastName = ensureValidName(
          sanitizedProfile.lastName,
          'Last name'
        );
      }
      if (sanitizedProfile.middleName !== undefined) {
        sanitizedProfile.middleName = ensureValidName(
          sanitizedProfile.middleName,
          'Middle name'
        );
      }
      if (sanitizedProfile.otherName !== undefined) {
        sanitizedProfile.otherName = ensureValidName(
          sanitizedProfile.otherName,
          'Other name'
        );
      }

      if (
        sanitizedProfile.gender !== undefined &&
        typeof sanitizedProfile.gender === 'string'
      ) {
        const normalizedGender = sanitizedProfile.gender.trim().toLowerCase();
        if (normalizedGender && !validateOptionalGender(normalizedGender)) {
          throw new Error('Select a valid gender option.');
        }
        sanitizedProfile.gender = normalizedGender;
      }

      if (
        sanitizedProfile.identification &&
        typeof sanitizedProfile.identification === 'object'
      ) {
        const identification = sanitizedProfile.identification;
        if (typeof identification.idType === 'string') {
          const trimmed = identification.idType.trim();
          if (trimmed && !validateAlphabeticField(trimmed)) {
            throw new Error(
              'Identification type may only contain letters and spaces.'
            );
          }
          identification.idType = trimmed;
        }

        const dobValue = identification.dateOfBirth;
        if (!dobValue) {
          throw new Error('Date of birth is required.');
        }
        if (!isValidDateInput(dobValue)) {
          throw new Error('Date of birth must be a valid date.');
        }
        const dob =
          typeof dobValue === 'string' ? new Date(dobValue) : dobValue;
        if (Number.isNaN(dob.getTime())) {
          throw new Error('Date of birth must be a valid date.');
        }
        if (dob > new Date()) {
          throw new Error('Date of birth cannot be in the future.');
        }
        identification.dateOfBirth = dob.toISOString();
      }
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : 'Invalid profile data. Please review the entered values.';
      toast.error(message);
      return;
    }

    const payload: {
      _id: string;
      profile: Partial<User['profile']>;
      password?: { current: string; new: string };
      profilePicture?: string | null;
      roles?: string[];
      rel?: { licencee: string[] };
      assignedLocations?: string[];
      assignedLicensees?: string[];
    } = {
      _id: userData._id,
      profile: sanitizedProfile,
      profilePicture: profilePicture ?? null,
    };

    // Only include roles if user is admin/evo admin
    if (
      authUser?.roles?.includes('admin') ||
      authUser?.roles?.includes('developer')
    ) {
      payload.roles = selectedRoles;
    }

    // Validate password change if any password field is filled
    if (
      passwordData.currentPassword ||
      passwordData.newPassword ||
      passwordData.confirmPassword
    ) {
      // If any password field is filled, all must be filled
      if (!passwordData.currentPassword) {
        toast.error('Please enter your current password to change it.');
        return;
      }
      if (!passwordData.newPassword) {
        toast.error('Please enter a new password.');
        return;
      }
      if (!passwordData.confirmPassword) {
        toast.error('Please confirm your new password.');
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('New passwords do not match.');
        return;
      }
      if (passwordData.currentPassword === passwordData.newPassword) {
        toast.error('New password must be different from current password.');
        return;
      }
      payload.password = {
        current: passwordData.currentPassword,
        new: passwordData.newPassword,
      };
    }

    const normalizedSelectedLicensees = selectedLicenseeIds.map(id =>
      String(id)
    );
    const normalizedSelectedLocations = selectedLocationIds.map(id =>
      String(id)
    );
    const canEditAssignments =
      authUser?.roles?.some(role =>
        ['admin', 'developer'].includes(role.toLowerCase())
      ) ?? false;

    if (canEditAssignments) {
      payload.assignedLicensees = normalizedSelectedLicensees;
      payload.assignedLocations = normalizedSelectedLocations;
    }

    // Build comparison objects with ONLY editable fields
    const originalData = {
      profile: userData.profile,
      profilePicture: userData.profilePicture,
      roles: userData.roles,
    };

    const formDataComparison = {
      profile: sanitizedProfile,
      profilePicture: profilePicture ?? null,
      roles: selectedRoles,
    };

    let changes: ReturnType<typeof detectChanges> = [];
    let meaningfulChanges: ReturnType<typeof filterMeaningfulChanges> = [];

    try {
      // Detect changes by comparing ONLY editable fields
      changes = detectChanges(originalData, formDataComparison);
      meaningfulChanges = filterMeaningfulChanges(changes);
    } catch (error) {
      console.error('Error detecting changes:', error);
      // Continue with update even if change detection fails
      meaningfulChanges = [];
    }

    // Check if we have password change or other meaningful changes
    const hasPasswordChange = !!(
      passwordData.newPassword && passwordData.confirmPassword
    );

    // Use only new field
    let originalLicenseeIds: string[] = [];
    if (
      Array.isArray(userData?.assignedLicensees) &&
      userData.assignedLicensees.length > 0
    ) {
      originalLicenseeIds = userData.assignedLicensees.map(value =>
        String(value)
      );
    }
    const licenseeIdsChanged =
      originalLicenseeIds.length !== normalizedSelectedLicensees.length ||
      !originalLicenseeIds.every(id =>
        normalizedSelectedLicensees.includes(id)
      ) ||
      !normalizedSelectedLicensees.every(id =>
        originalLicenseeIds.includes(id)
      );

    // Use only new field
    let originalLocationIds: string[] = [];
    if (
      Array.isArray(userData?.assignedLocations) &&
      userData.assignedLocations.length > 0
    ) {
      originalLocationIds = userData.assignedLocations.map(value =>
        String(value)
      );
    }
    const locationIdsChanged =
      originalLocationIds.length !== normalizedSelectedLocations.length ||
      !originalLocationIds.every(id =>
        normalizedSelectedLocations.includes(id)
      ) ||
      !normalizedSelectedLocations.every(id =>
        originalLocationIds.includes(id)
      );

    if (licenseeIdsChanged) {
      meaningfulChanges.push({
        field: 'Assigned Licensees',
        oldValue: originalLicenseeIds,
        newValue: normalizedSelectedLicensees,
        path: 'assignedLicensees',
      });
    }

    if (locationIdsChanged) {
      meaningfulChanges.push({
        field: 'Assigned Locations',
        oldValue: originalLocationIds,
        newValue: normalizedSelectedLocations,
        path: 'assignedLocations',
      });
    }

    if (meaningfulChanges.length === 0 && !hasPasswordChange) {
      toast.info('No changes detected');
      return;
    }

    // Build update payload with only changed fields + required _id
    const updatePayload: Record<string, unknown> = { _id: userData._id };
    
    // Track profile changes separately to build a minimal profile object
    const profileChanges: Record<string, unknown> = {};
    
    meaningfulChanges.forEach(change => {
      const fieldPath = change.path; // Use full path for nested fields

      // Handle nested fields
      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');

        // Build profile object with only changed fields
        if (parent === 'profile') {
          // Handle nested profile fields like profile.identification.dateOfBirth
          if (child.includes('.')) {
            const [nestedParent, nestedChild] = child.split('.');
            if (!profileChanges[nestedParent]) {
              profileChanges[nestedParent] = {};
            }
            (profileChanges[nestedParent] as Record<string, unknown>)[nestedChild] =
              change.newValue;
          } else {
            profileChanges[child] = change.newValue;
          }
        } else {
          if (!updatePayload[parent]) {
            updatePayload[parent] = {};
          }
          (updatePayload[parent] as Record<string, unknown>)[child] =
            change.newValue;
        }
      } else {
        if (fieldPath === 'profilePicture') {
          updatePayload.profilePicture = profilePicture ?? null;
        } else if (fieldPath === 'roles') {
          updatePayload.roles = selectedRoles;
        } else if (fieldPath === 'assignedLicensees') {
          updatePayload.assignedLicensees = normalizedSelectedLicensees;
        } else if (fieldPath === 'assignedLocations') {
          updatePayload.assignedLocations = normalizedSelectedLocations;
        } else {
          updatePayload[fieldPath] = payload[fieldPath as keyof typeof payload];
        }
      }
    });

    // Only include profile if there are profile changes
    if (Object.keys(profileChanges).length > 0) {
      updatePayload.profile = profileChanges;
    }

    // Add password if changing
    if (hasPasswordChange) {
      updatePayload.password = {
        current: passwordData.currentPassword,
        new: passwordData.newPassword,
      };
    }

    // Check if admin/evo admin is changing their own permission-related fields
    const isAdminOrEvoAdmin = userData.roles?.some(
      role =>
        role.toLowerCase() === 'admin' || role.toLowerCase() === 'developer'
    );

    if (isAdminOrEvoAdmin) {
      const permissionFieldsChanged = meaningfulChanges.some(change => {
        const fieldPath = change.path;
        return (
          fieldPath === 'roles' ||
          fieldPath.startsWith('rel') ||
          fieldPath === 'assignedLocations' ||
          fieldPath === 'assignedLicensees'
        );
      });

      if (permissionFieldsChanged) {
        console.log(
          '[ProfileModal] 🔄 Admin/Developer changing own permissions - incrementing sessionVersion'
        );
        updatePayload.$inc = { sessionVersion: 1 };
      }
    }

    try {
      await axios.put(`/api/users/${userData._id}`, updatePayload);

      // Log the profile update activity with proper change tracking
      let changesSummary = 'Profile updated';
      try {
        if (meaningfulChanges && meaningfulChanges.length > 0) {
          changesSummary = getChangesSummary(meaningfulChanges);
        } else if (hasPasswordChange) {
          changesSummary = 'Password updated';
        }
      } catch (error) {
        console.error('Error generating changes summary:', error);
        changesSummary = 'Profile updated';
      }

      await logActivity(
        'update',
        'user',
        userData._id,
        userData.username,
        `Updated profile: ${changesSummary}`,
        originalData, // Previous data (only editable fields)
        updatePayload, // New data (only changed fields)
        meaningfulChanges.map(change => ({
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        }))
      );

      toast.success(`Profile updated successfully: ${changesSummary}`);

      // Reset password fields after successful save
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Emit a browser event so the sidebar can update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('profile-updated', {
            detail: {
              profilePicture,
              username: userData.username,
              email: userData.email,
            },
          })
        );
      }
      onClose();
    } catch (error) {
      let errorMessage = 'Failed to update profile.';

      if (axios.isAxiosError(error)) {
        // Extract error message from API response
        if (error.response?.data) {
          const responseData = error.response.data;
          // Try to get the error message from various possible locations
          errorMessage =
            responseData.message ||
            responseData.error ||
            (typeof responseData === 'string' ? responseData : errorMessage);

          // If message is generic, try to get more specific error
          if (errorMessage === 'Update failed' && responseData.error) {
            errorMessage = responseData.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Profile update error:', error);
        if (axios.isAxiosError(error) && error.response?.data) {
          console.error('API Error Response:', error.response.data);
        }
      }
    }
  };

  const handleCancelEdit = () => {
    if (userData) {
      setFormData(userData.profile || {});
      setProfilePicture(userData.profilePicture || null);
    }
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditMode(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[99998] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ display: open ? 'block' : 'none' }}
        />
        <Dialog.Content
          ref={modalRef}
          className="fixed left-[50%] top-[50%] z-[99999] flex max-h-[95vh] w-full max-w-6xl translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-xl bg-gray-50 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">My Profile</Dialog.Title>

          {/* Sticky Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  My Profile
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {isEditMode
                    ? 'Update your profile information and preferences'
                    : 'View and manage your account details'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <Button
                    onClick={toggleEditMode}
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-9 w-9 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </Dialog.Close>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
              {isLoading ? (
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                        {/* Left: Profile Picture Skeleton */}
                        <div className="flex flex-col items-center lg:items-start">
                          <Skeleton className="h-[140px] w-[140px] rounded-full" />
                          <Skeleton className="mt-3 h-5 w-32" />
                          <Skeleton className="mt-2 h-4 w-48" />
                        </div>

                        {/* Right: Details Skeleton */}
                        <div className="flex-1">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i}>
                                <Skeleton className="mb-2 h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Card Skeleton */}
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="mt-2 h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="mb-4 h-6 w-24" />
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Skeleton className="mb-2 h-4 w-20" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                          <Skeleton className="mb-2 h-4 w-16" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                          <Skeleton className="mb-2 h-4 w-20" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                          <Skeleton className="mb-2 h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                          <Skeleton className="mb-2 h-4 w-20" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                          <Skeleton className="w-18 mb-2 h-4" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>

                      {/* Contact Information Section Skeleton */}
                      <div className="mt-8">
                        <Skeleton className="mb-4 h-6 w-36" />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Skeleton className="mb-2 h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <div>
                            <Skeleton className="mb-2 h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </div>
                      </div>

                      {/* Password Section Skeleton */}
                      <div className="mt-8">
                        <Skeleton className="mb-4 h-6 w-32" />
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Skeleton className="mb-2 h-4 w-32" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <div>
                            <Skeleton className="mb-2 h-4 w-28" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <div>
                            <Skeleton className="mb-2 h-4 w-36" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                userData && (
                  <>
                    {/* Profile Information Card */}
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
                                src={
                                  profilePicture ||
                                  userData.profilePicture ||
                                  defaultAvatar
                                }
                                alt="Avatar"
                                width={140}
                                height={140}
                                className="rounded-full border-4 border-gray-100 bg-gray-50 shadow-sm"
                              />
                              {isEditMode && (
                                <>
                                  <button
                                    type="button"
                                    className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md transition-colors hover:bg-blue-700"
                                    onClick={handleEditProfilePicture}
                                    aria-label="Edit avatar"
                                  >
                                    <Camera className="h-5 w-5 text-white" />
                                  </button>
                                  {(profilePicture ||
                                    userData.profilePicture) && (
                                    <button
                                      type="button"
                                      className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow-md transition-colors hover:bg-red-600"
                                      onClick={handleRemoveProfilePicture}
                                      aria-label="Remove avatar"
                                    >
                                      <Trash2 className="h-4 w-4 text-white" />
                                    </button>
                                  )}
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                  />
                                </>
                              )}
                            </div>
                            <div className="mt-3 flex flex-col items-center gap-1 lg:items-start">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {userData.username}
                              </h3>
                              <p className="break-words text-sm text-gray-600">
                                {userData.email || userData.emailAddress}
                              </p>
                            </div>
                          </div>

                          {/* Right: Account & Personal Details Grid */}
                          <div className="flex-1">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {/* Username */}
                              <div>
                                <Label className="text-gray-700">
                                  Username
                                </Label>
                                <p className="mt-2 break-words text-sm text-gray-900">
                                  {userData.username || '-'}
                                </p>
                              </div>

                              {/* Email */}
                              <div>
                                <Label className="text-gray-700">
                                  Email Address
                                </Label>
                                <p className="mt-2 break-words text-sm text-gray-900">
                                  {userData.email ||
                                    userData.emailAddress ||
                                    '-'}
                                </p>
                              </div>

                              {/* Phone Number */}
                              <div>
                                <Label className="text-gray-700">
                                  Phone Number
                                </Label>
                                {isEditMode ? (
                                  <Input
                                    type="tel"
                                    value={formData?.phoneNumber || ''}
                                    onChange={e =>
                                      handleInputChange(
                                        'phoneNumber',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter phone number"
                                    className="mt-2"
                                  />
                                ) : (
                                  <p className="mt-2 break-words text-sm text-gray-900">
                                    {formData?.phoneNumber || '-'}
                                  </p>
                                )}
                              </div>

                              {/* Gender */}
                              <div>
                                <Label className="text-gray-700">Gender</Label>
                                {isEditMode ? (
                                  <select
                                    className="mt-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    value={formData?.gender || ''}
                                    onChange={e =>
                                      handleInputChange(
                                        'gender',
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                  </select>
                                ) : (
                                  <p className="mt-2 break-words text-sm text-gray-900">
                                    {formData?.gender
                                      ? formData.gender
                                          .charAt(0)
                                          .toUpperCase() +
                                        formData.gender.slice(1)
                                      : '-'}
                                  </p>
                                )}
                              </div>

                              {/* First Name */}
                              <div>
                                <Label className="text-gray-700">
                                  First Name
                                </Label>
                                {isEditMode ? (
                                  <Input
                                    value={formData?.firstName || ''}
                                    onChange={e =>
                                      handleInputChange(
                                        'firstName',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter first name"
                                    className="mt-2"
                                  />
                                ) : (
                                  <p className="mt-2 break-words text-sm text-gray-900">
                                    {formData?.firstName || '-'}
                                  </p>
                                )}
                              </div>

                              {/* Last Name */}
                              <div>
                                <Label className="text-gray-700">
                                  Last Name
                                </Label>
                                {isEditMode ? (
                                  <Input
                                    value={formData?.lastName || ''}
                                    onChange={e =>
                                      handleInputChange(
                                        'lastName',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter last name"
                                    className="mt-2"
                                  />
                                ) : (
                                  <p className="mt-2 break-words text-sm text-gray-900">
                                    {formData?.lastName || '-'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assignments Card */}
                    {isPrivilegedEditor && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Assignments</CardTitle>
                          <CardDescription>
                            Licensee and location access permissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Roles */}
                            <div>
                              <div className="mb-4">
                                <Label className="text-base font-medium text-gray-900">
                                  Roles
                                </Label>
                                <p className="mt-1 text-sm text-gray-500">
                                  Your assigned roles and permissions
                                </p>
                              </div>
                              {isEditMode && isPrivilegedEditor ? (
                                <div className="space-y-2">
                                  {[
                                    'developer',
                                    'admin',
                                    'manager',
                                    'location admin',
                                    'technician',
                                    'collector',
                                  ].map(role => (
                                    <div
                                      key={role}
                                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
                                    >
                                      <Checkbox
                                        id={`role-${role}`}
                                        checked={selectedRoles
                                          .map(r => r.toLowerCase())
                                          .includes(role.toLowerCase())}
                                        onCheckedChange={checked => {
                                          if (checked === true) {
                                            setSelectedRoles(prev => [
                                              ...prev.filter(
                                                r =>
                                                  r.toLowerCase() !==
                                                  role.toLowerCase()
                                              ),
                                              role,
                                            ]);
                                          } else {
                                            setSelectedRoles(prev =>
                                              prev.filter(
                                                r =>
                                                  r.toLowerCase() !==
                                                  role.toLowerCase()
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      <Label
                                        htmlFor={`role-${role}`}
                                        className="cursor-pointer text-sm font-medium capitalize text-gray-900"
                                      >
                                        {role}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {userData?.roles && userData.roles.length > 0 ? (
                                    userData.roles.map((role, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium capitalize text-blue-800"
                                      >
                                        {role}
                                      </span>
                                    ))
                                  ) : (
                                    <div className="text-gray-700">
                                      No roles assigned
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Assigned Licensees */}
                            <div>
                              <div className="mb-4">
                                <Label className="text-base font-medium text-gray-900">
                                  Assigned Licensees
                                </Label>
                                <p className="mt-1 text-sm text-gray-500">
                                  Licensees you have access to
                                </p>
                              </div>
                              {/* Assigned Licensees */}
                              {licenseesLoading ? (
                                <Skeleton className="h-5 w-32" />
                              ) : isEditMode && isPrivilegedEditor ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <Checkbox
                                      id="allLicensees"
                                      checked={allLicenseesSelected}
                                      onCheckedChange={checked =>
                                        handleAllLicenseesToggle(
                                          checked === true
                                        )
                                      }
                                      disabled={licensees.length === 0}
                                    />
                                    <Label
                                      htmlFor="allLicensees"
                                      className="cursor-pointer text-sm font-medium text-gray-900"
                                    >
                                      All Licensees
                                    </Label>
                                  </div>
                                  {licensees.length === 0 && (
                                    <p className="text-sm text-gray-500">
                                      No licensees available
                                    </p>
                                  )}
                                  {!allLicenseesSelected &&
                                    licensees.length > 0 && (
                                      <MultiSelectDropdown
                                        options={licenseeOptions}
                                        selectedIds={selectedLicenseeIds}
                                        onChange={handleLicenseeSelectionChange}
                                        placeholder="Select licensees..."
                                        searchPlaceholder="Search licensees..."
                                        label="licensees"
                                        showSelectAll
                                      />
                                    )}
                                  {allLicenseesSelected &&
                                    licensees.length > 0 && (
                                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                        All {licensees.length} licensees
                                        selected
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {(() => {
                                    // Try new field first, fallback to old field
                                    const userLicensees =
                                      Array.isArray(
                                        userData?.assignedLicensees
                                      ) && userData.assignedLicensees.length > 0
                                        ? userData.assignedLicensees
                                        : [];

                                    const userRolesLower =
                                      userData?.roles?.map(role =>
                                        role.toLowerCase()
                                      ) || [];
                                    const isAdminOrDev =
                                      userRolesLower.includes('admin') ||
                                      userRolesLower.includes('developer');

                                    // For admin/dev with no specific assignments, show all available licensees
                                    let licenseesToDisplay = userLicensees;
                                    if (
                                      isAdminOrDev &&
                                      userLicensees.length === 0 &&
                                      licensees.length > 0
                                    ) {
                                      licenseesToDisplay = licensees.map(l =>
                                        String(l._id)
                                      );
                                    }

                                    if (licenseesToDisplay.length === 0) {
                                      return (
                                        <div className="text-gray-700">
                                          No licensees assigned
                                        </div>
                                      );
                                    }

                                    // Display licensees as comma-separated list
                                    const licenseeNames = licenseesToDisplay
                                      .map(licenseeId => {
                                        const normalizedId = String(licenseeId);
                                        const match = licensees.find(
                                          licensee =>
                                            String(licensee._id) ===
                                            normalizedId
                                        );
                                        return match?.name || null;
                                      })
                                      .filter(
                                        (name): name is string => name !== null
                                      );

                                    if (licenseeNames.length === 0) {
                                      return (
                                        <div className="text-gray-700">
                                          No licensees found
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="text-gray-700">
                                        {licenseeNames.join(', ')}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Assigned Locations */}
                            <div className="md:col-span-2">
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Assigned Locations
                              </label>
                              {locationsLoading ||
                              (licenseesLoading && !locations.length) ? (
                                <div className="p-2">
                                  <Skeleton className="h-5 w-32" />
                                </div>
                              ) : isEditMode && isPrivilegedEditor ? (
                                <div className="space-y-3 rounded-md border border-border bg-white p-3">
                                  {allLicenseesSelected ||
                                  selectedLicenseeIds.length > 0 ? (
                                    <>
                                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Checkbox
                                          checked={allLocationsSelected}
                                          onCheckedChange={checked =>
                                            handleAllLocationsToggle(
                                              checked === true
                                            )
                                          }
                                          disabled={
                                            availableLocations.length === 0
                                          }
                                        />
                                        All Locations{' '}
                                        {allLicenseesSelected
                                          ? ''
                                          : `for selected licencee${selectedLicenseeIds.length > 1 ? 's' : ''}`}
                                      </label>
                                      {!allLocationsSelected && (
                                        <MultiSelectDropdown
                                          options={locationOptions}
                                          selectedIds={selectedLocationIds}
                                          onChange={
                                            handleLocationSelectionChange
                                          }
                                          placeholder={
                                            availableLocations.length === 0
                                              ? 'No locations available for selected licensees'
                                              : 'Select locations...'
                                          }
                                          searchPlaceholder="Search locations..."
                                          label="locations"
                                          showSelectAll
                                          disabled={
                                            availableLocations.length === 0
                                          }
                                        />
                                      )}
                                      {allLocationsSelected &&
                                        availableLocations.length > 0 && (
                                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                            All {availableLocations.length}{' '}
                                            available locations selected
                                          </div>
                                        )}
                                    </>
                                  ) : (
                                    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                                      Select at least one licensee to assign
                                      locations.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-full">
                                  {(() => {
                                    // Try new field first, fallback to old field
                                    const locationPermissions =
                                      Array.isArray(
                                        userData?.assignedLocations
                                      ) && userData.assignedLocations.length > 0
                                        ? userData.assignedLocations
                                        : [];

                                    const userRolesLower =
                                      userData?.roles?.map(role =>
                                        role.toLowerCase()
                                      ) || [];
                                    const isManager =
                                      userRolesLower.includes('manager');
                                    const isAdminOrDev =
                                      userRolesLower.includes('admin') ||
                                      userRolesLower.includes('developer');

                                    // Only show skeleton if we're still loading locations
                                    if (locationsLoading) {
                                      return (
                                        <Skeleton className="inline-block h-5 w-48" />
                                      );
                                    }

                                    // For admin/dev with no specific assignments, show all locations
                                    let locationsToDisplay =
                                      locationPermissions;
                                    if (
                                      isAdminOrDev &&
                                      locationPermissions.length === 0 &&
                                      locations.length > 0
                                    ) {
                                      // Show all available locations
                                      locationsToDisplay = locations.map(loc =>
                                        String(loc._id)
                                      );
                                    }

                                    // For managers with no specific assignments, show all locations for their licensees
                                    if (
                                      isManager &&
                                      locationPermissions.length === 0 &&
                                      locations.length > 0
                                    ) {
                                      // Show all available locations (already filtered by licensee)
                                      locationsToDisplay = locations.map(loc =>
                                        String(loc._id)
                                      );
                                    }

                                    if (locationsToDisplay.length === 0) {
                                      return (
                                        <div className="text-center text-gray-700">
                                          No locations available
                                        </div>
                                      );
                                    }

                                    // Display locations in a table format with licensee information
                                    const locationData = locationsToDisplay
                                      .map(locationId => {
                                        const normalizedId = String(locationId);
                                        const location = locations.find(
                                          loc =>
                                            String(loc._id) === normalizedId
                                        );

                                        if (!location) {
                                          // Try to get from missingLocationNames
                                          const locationName =
                                            missingLocationNames[
                                              normalizedId
                                            ] || `Unknown (${normalizedId})`;
                                          return {
                                            locationName,
                                            licenseeName: 'Unknown',
                                          };
                                        }

                                        const licensee = location.licenseeId
                                          ? licensees.find(
                                              l =>
                                                String(l._id) ===
                                                String(location.licenseeId)
                                            )
                                          : null;

                                        return {
                                          locationName:
                                            location.name || 'Unknown',
                                          licenseeName:
                                            licensee?.name || 'Unknown',
                                        };
                                      })
                                      .filter(item => item !== null);

                                    if (locationData.length === 0) {
                                      return (
                                        <div className="text-center text-gray-700">
                                          No locations found
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="max-h-[300px] overflow-hidden rounded-lg border border-gray-200">
                                        <div className="max-h-[300px] overflow-y-auto">
                                          <table className="w-full divide-y divide-gray-200">
                                            <thead className="sticky top-0 bg-gray-50">
                                              <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                                  Location
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                                  Licensee
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                              {locationData.map(
                                                (item, index) => (
                                                  <tr
                                                    key={index}
                                                    className="transition-colors hover:bg-gray-50"
                                                  >
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                      {item.locationName}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                      {item.licenseeName}
                                                    </td>
                                                  </tr>
                                                )
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

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
                            <Label htmlFor="street" className="text-gray-700">
                              Street
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="street"
                                value={formData?.address?.street || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'street',
                                    e.target.value,
                                    'address'
                                  )
                                }
                                placeholder="Enter street address"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.address?.street || 'Not specified'}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="town" className="text-gray-700">
                              Town
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="town"
                                value={formData?.address?.town || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'town',
                                    e.target.value,
                                    'address'
                                  )
                                }
                                placeholder="Enter town"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.address?.town || 'Not specified'}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="region" className="text-gray-700">
                              Region
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="region"
                                value={formData?.address?.region || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'region',
                                    e.target.value,
                                    'address'
                                  )
                                }
                                placeholder="Enter region"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.address?.region || 'Not specified'}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="country" className="text-gray-700">
                              Country
                            </Label>
                            {isEditMode ? (
                              <select
                                id="country"
                                className="mt-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                value={formData?.address?.country || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'country',
                                    e.target.value,
                                    'address'
                                  )
                                }
                              >
                                <option value="">Select country</option>
                                {countriesLoading ? (
                                  <option value="" disabled>
                                    Loading countries...
                                  </option>
                                ) : (
                                  countries.map(country => (
                                    <option
                                      key={country._id}
                                      value={country._id}
                                    >
                                      {country.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {countries.find(
                                  c => c._id === formData?.address?.country
                                )?.name ||
                                  formData?.address?.country ||
                                  'Not specified'}
                              </p>
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <Label
                              htmlFor="postalCode"
                              className="text-gray-700"
                            >
                              Postal Code
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="postalCode"
                                value={formData?.address?.postalCode || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'postalCode',
                                    e.target.value,
                                    'address'
                                  )
                                }
                                placeholder="Enter postal code"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.address?.postalCode ||
                                  'Not specified'}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Identification Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Identification</CardTitle>
                        <CardDescription>
                          Personal identification and verification details
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <Label
                              htmlFor="dateOfBirth"
                              className="text-gray-700"
                            >
                              Date of Birth
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="dateOfBirth"
                                type="date"
                                value={
                                  formData?.identification?.dateOfBirth?.split(
                                    'T'
                                  )[0] || ''
                                }
                                onChange={e =>
                                  handleInputChange(
                                    'dateOfBirth',
                                    e.target.value,
                                    'identification'
                                  )
                                }
                                placeholder="YYYY-MM-DD"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.identification?.dateOfBirth
                                  ? new Date(
                                      formData.identification.dateOfBirth
                                    ).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })
                                  : 'Not specified'}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="idType" className="text-gray-700">
                              ID Type
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="idType"
                                value={formData?.identification?.idType || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'idType',
                                    e.target.value,
                                    'identification'
                                  )
                                }
                                placeholder="Enter ID type"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.identification?.idType ||
                                  'Not specified'}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="idNumber" className="text-gray-700">
                              ID Number
                            </Label>
                            {isEditMode ? (
                              <Input
                                id="idNumber"
                                value={formData?.identification?.idNumber || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'idNumber',
                                    e.target.value,
                                    'identification'
                                  )
                                }
                                placeholder="Enter ID number"
                                className="mt-2"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.identification?.idNumber ||
                                  'Not specified'}
                              </p>
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <Label htmlFor="notes" className="text-gray-700">
                              Notes
                            </Label>
                            {isEditMode ? (
                              <textarea
                                id="notes"
                                className="mt-2 flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                value={formData?.identification?.notes || ''}
                                onChange={e =>
                                  handleInputChange(
                                    'notes',
                                    e.target.value,
                                    'identification'
                                  )
                                }
                                placeholder="Enter notes"
                              />
                            ) : (
                              <p className="mt-2 break-words text-sm text-gray-900">
                                {formData?.identification?.notes || 'No notes'}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Password Card - Only in Edit Mode */}
                    {isEditMode && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Change Password</CardTitle>
                          <CardDescription>
                            Update your account password
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Current Password *
                              </label>
                              <input
                                type="password"
                                className="w-full rounded-md border border-border bg-white p-2"
                                value={passwordData.currentPassword}
                                onChange={e =>
                                  setPasswordData(prev => ({
                                    ...prev,
                                    currentPassword: e.target.value,
                                  }))
                                }
                                placeholder="Enter current password"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                New Password *
                              </label>
                              <input
                                type="password"
                                className="w-full rounded-md border border-border bg-white p-2"
                                value={passwordData.newPassword}
                                onChange={e =>
                                  setPasswordData(prev => ({
                                    ...prev,
                                    newPassword: e.target.value,
                                  }))
                                }
                                placeholder="Enter new password"
                              />
                              {passwordData.newPassword && (
                                <div className="mt-2 space-y-2">
                                  {/* Password Strength Indicator */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      Strength:
                                    </span>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map(level => (
                                        <div
                                          key={level}
                                          className={`h-2 w-8 rounded ${
                                            level <= passwordStrength.score
                                              ? passwordStrength.score <= 2
                                                ? 'bg-red-500'
                                                : passwordStrength.score === 3
                                                  ? 'bg-yellow-500'
                                                  : 'bg-green-500'
                                              : 'bg-gray-200'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span
                                      className={`text-sm font-medium ${
                                        passwordStrength.score <= 2
                                          ? 'text-red-600'
                                          : passwordStrength.score === 3
                                            ? 'text-yellow-600'
                                            : 'text-green-600'
                                      }`}
                                    >
                                      {passwordStrength.label}
                                    </span>
                                  </div>

                                  {/* Password Requirements */}
                                  <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                                    <div
                                      className={`flex items-center gap-2 ${
                                        passwordStrength.requirements.length
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      <span>
                                        {passwordStrength.requirements.length
                                          ? '?'
                                          : '?'}
                                      </span>
                                      <span>At least 8 characters</span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 ${
                                        passwordStrength.requirements.uppercase
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      <span>
                                        {passwordStrength.requirements.uppercase
                                          ? '?'
                                          : '?'}
                                      </span>
                                      <span>Uppercase letter</span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 ${
                                        passwordStrength.requirements.lowercase
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      <span>
                                        {passwordStrength.requirements.lowercase
                                          ? '?'
                                          : '?'}
                                      </span>
                                      <span>Lowercase letter</span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 ${
                                        passwordStrength.requirements.number
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      <span>
                                        {passwordStrength.requirements.number
                                          ? '?'
                                          : '?'}
                                      </span>
                                      <span>Number</span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 ${
                                        passwordStrength.requirements.special
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      <span>
                                        {passwordStrength.requirements.special
                                          ? '?'
                                          : '?'}
                                      </span>
                                      <span>Special character (@$!%*?&)</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Confirm New Password *
                              </label>
                              <input
                                type="password"
                                className="w-full rounded-md border border-border bg-white p-2"
                                value={passwordData.confirmPassword}
                                onChange={e =>
                                  setPasswordData(prev => ({
                                    ...prev,
                                    confirmPassword: e.target.value,
                                  }))
                                }
                                placeholder="Confirm new password"
                              />
                              {passwordData.newPassword &&
                                passwordData.confirmPassword &&
                                passwordData.newPassword !==
                                  passwordData.confirmPassword && (
                                  <p className="mt-1 text-sm text-red-500">
                                    Passwords do not match
                                  </p>
                                )}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            * To change your password, fill in all three fields.
                            Leave all fields empty to keep your current
                            password.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )
              )}
            </div>
          </div>

          {/* Sticky Footer - Edit Mode Only */}
          {isEditMode && (
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="min-w-[100px] gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
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
          )}
        </Dialog.Content>
      </Dialog.Portal>

      {/* Profile Picture Cropping Modal */}
      {isCropOpen && rawImageSrc && (
        <CircleCropModal
          open={isCropOpen}
          onClose={() => {
            setIsCropOpen(false);
            setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropped={handleCropComplete}
        />
      )}
    </Dialog.Root>
  );
}
