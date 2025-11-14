import { Button } from '@/components/ui/button';
import CircleCropModal from '@/components/ui/image/CircleCropModal';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCountries } from '@/lib/helpers/countries';
import type { Country } from '@/lib/types/country';
import { useUserStore } from '@/lib/store/userStore';
import type { User } from '@/lib/types/administration';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import {
  validatePasswordStrength,
  getPasswordStrengthLabel,
  validateNameField,
  validateOptionalGender,
  validateAlphabeticField,
  isValidDateInput,
} from '@/lib/utils/validation';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { Licensee } from '@/lib/types/licensee';
import MultiSelectDropdown, {
  type MultiSelectOption,
} from '@/components/ui/common/MultiSelectDropdown';
import cameraIcon from '@/public/cameraIcon.svg';
import defaultAvatar from '@/public/defaultAvatar.svg';
import { Checkbox } from '@/components/ui/checkbox';
import * as Dialog from '@radix-ui/react-dialog';
import axios from 'axios';
import { Pencil, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const [missingLocationNames, setMissingLocationNames] = useState<Record<string, string>>({});

  // Licensee/Location assignment state
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);
  const assignmentsInitializedRef = useRef(false);

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
        const licenseesData = await fetchLicensees();
        console.log('[ProfileModal] Fetched licensees:', licenseesData);
        console.log('[ProfileModal] Licensees count:', licenseesData.length);
        console.log('[ProfileModal] Licensee IDs:', licenseesData.map(l => ({ id: String(l._id), name: l.name })));
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

        const response = await axios.get('/api/locations?minimal=1');
        const rawLocations: RawLocationResponse[] = response.data?.locations || [];
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
  }, [open]);

  // Fetch missing location names by ID
  useEffect(() => {
    const fetchMissingLocations = async () => {
      if (!userData?.resourcePermissions?.['gaming-locations']?.resources) return;
      
      const locationIds = userData.resourcePermissions['gaming-locations'].resources;
      const missingIds = locationIds.filter(
        id => !locations.find(l => String(l._id) === String(id))
      );
      
      if (missingIds.length === 0) return;
      
      console.log('[ProfileModal] Fetching missing location names for IDs:', missingIds);
      
      // Fetch each missing location by ID
      const fetchPromises = missingIds.map(async (locationId) => {
        try {
          const response = await axios.get(`/api/locations/${locationId}`);
          const locationData = response.data?.location || response.data;
          if (locationData?.name) {
            return { id: locationId, name: locationData.name };
          }
          return { id: locationId, name: `Unknown Location` };
        } catch (error) {
          console.error(`[ProfileModal] Failed to fetch location ${locationId}:`, error);
          return { id: locationId, name: `Unknown (${locationId})` };
        }
      });
      
      const results = await Promise.all(fetchPromises);
      const namesMap: Record<string, string> = {};
      results.forEach(result => {
        namesMap[result.id] = result.name;
      });
      
      setMissingLocationNames(namesMap);
    };
    
    if (open && userData && locations.length > 0) {
      fetchMissingLocations();
    }
  }, [open, userData, locations]);

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

    const userLicensees = (userData.rel?.licencee || []).map(normalize);
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

    const userLocations =
      userData.resourcePermissions?.['gaming-locations']?.resources?.map(normalize) || [];
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
      location.licenseeId ? selectedLicenseeIds.includes(location.licenseeId) : true
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
      resourcePermissions?: User['resourcePermissions'];
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

    const normalizedSelectedLicensees = selectedLicenseeIds.map(id => String(id));
    const normalizedSelectedLocations = selectedLocationIds.map(id => String(id));
    const canEditAssignments =
      authUser?.roles?.some(role =>
        ['admin', 'developer'].includes(role.toLowerCase())
      ) ?? false;

    if (canEditAssignments) {
      payload.rel = {
        licencee: normalizedSelectedLicensees,
      };
      payload.resourcePermissions = {
        ...(userData.resourcePermissions || {}),
        'gaming-locations': {
          entity: 'gaming-locations',
          resources: normalizedSelectedLocations,
        },
      };
    }

    // Build comparison objects with ONLY editable fields
    const originalData = {
      profile: userData.profile,
      profilePicture: userData.profilePicture,
      roles: userData.roles,
      rel: userData.rel || {},
      resourcePermissions: userData.resourcePermissions || {},
    };

    const formDataComparison = {
      profile: sanitizedProfile,
      profilePicture: profilePicture ?? null,
      roles: selectedRoles,
      rel: {
        licencee: normalizedSelectedLicensees,
      },
      resourcePermissions: {
        ...(userData.resourcePermissions || {}),
        'gaming-locations': {
          entity: 'gaming-locations',
          resources: normalizedSelectedLocations,
        },
      },
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
    
    const originalLicenseeIds =
      (userData.rel?.licencee || []).map(value => String(value)) || [];
    const licenseeIdsChanged =
      originalLicenseeIds.length !== normalizedSelectedLicensees.length ||
      !originalLicenseeIds.every(id => normalizedSelectedLicensees.includes(id)) ||
      !normalizedSelectedLicensees.every(id => originalLicenseeIds.includes(id));

    const originalLocationIds =
      userData.resourcePermissions?.['gaming-locations']?.resources?.map(value =>
        String(value)
      ) || [];
    const locationIdsChanged =
      originalLocationIds.length !== normalizedSelectedLocations.length ||
      !originalLocationIds.every(id => normalizedSelectedLocations.includes(id)) ||
      !normalizedSelectedLocations.every(id => originalLocationIds.includes(id));

    if (licenseeIdsChanged) {
      meaningfulChanges.push({
        field: 'Assigned Licensees',
        oldValue: originalLicenseeIds,
        newValue: normalizedSelectedLicensees,
        path: 'rel.licencee',
      });
    }

    if (locationIdsChanged) {
      meaningfulChanges.push({
        field: 'Assigned Locations',
        oldValue: originalLocationIds,
        newValue: normalizedSelectedLocations,
        path: 'resourcePermissions',
      });
    }

    if (meaningfulChanges.length === 0 && !hasPasswordChange) {
      toast.info('No changes detected');
      return;
    }

    // Build update payload with only changed fields + required _id
    const updatePayload: Record<string, unknown> = { _id: userData._id };
    meaningfulChanges.forEach(change => {
      const fieldPath = change.path; // Use full path for nested fields
      
      // Handle nested fields
      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        
        // Special handling for objects that must be sent whole
        if (parent === 'profile') {
          updatePayload.profile = formData;
        } else {
          if (!updatePayload[parent]) {
            updatePayload[parent] = {};
          }
          (updatePayload[parent] as Record<string, unknown>)[child] = change.newValue;
        }
      } else {
        if (fieldPath === 'profilePicture') {
          updatePayload.profilePicture = profilePicture ?? null;
        } else if (fieldPath === 'roles') {
          updatePayload.roles = selectedRoles;
        } else {
          updatePayload[fieldPath] = payload[fieldPath as keyof typeof payload];
        }
      }
    });

    // Add password if changing
    if (hasPasswordChange) {
      updatePayload.password = {
        current: passwordData.currentPassword,
        new: passwordData.newPassword,
      };
    }

    // Check if admin/evo admin is changing their own permission-related fields
    const isAdminOrEvoAdmin = userData.roles?.some(role => 
      role.toLowerCase() === 'admin' || role.toLowerCase() === 'developer'
    );
    
    if (isAdminOrEvoAdmin) {
      const permissionFieldsChanged = meaningfulChanges.some(change => {
        const fieldPath = change.path;
        return fieldPath === 'roles' || 
               fieldPath.startsWith('resourcePermissions') || 
               fieldPath.startsWith('rel');
      });
      
      if (permissionFieldsChanged) {
        console.log('[ProfileModal] 🔄 Admin/Developer changing own permissions - incrementing sessionVersion');
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
          className="fixed inset-0 z-[99999] flex w-full flex-col overflow-y-auto bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:grid sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-4 sm:overflow-visible sm:rounded-lg sm:border sm:p-6"
          style={{ display: open ? 'flex' : 'none' }}
        >
          <div className="space-y-4 p-4 sm:grid sm:gap-4 sm:space-y-0 sm:p-0">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-center text-2xl font-bold">
                My Profile
              </Dialog.Title>
              {!isEditMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditMode(true)}
                  className="absolute right-16 top-4 text-gray-600 hover:text-gray-900"
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </Dialog.Close>

            {isLoading ? (
              <div className="max-h-[80vh] overflow-y-auto pr-4">
                <div className="flex flex-col items-start gap-8 lg:flex-row">
                  {/* Left section skeleton */}
                  <div className="flex w-full flex-col items-center lg:w-1/3">
                    <Skeleton className="h-40 w-40 rounded-full" />
                    <Skeleton className="mt-4 h-6 w-32" />
                    <Skeleton className="mt-2 h-4 w-48" />
                  </div>

                  {/* Right section skeleton */}
                  <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:w-2/3">
                    <div className="md:col-span-2">
                      <Skeleton className="mb-4 h-6 w-48" />
                    </div>

                    {/* Personal Information Fields */}
                    <div>
                      <Skeleton className="mb-2 h-4 w-20" />
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
                    <div className="md:col-span-2">
                      <Skeleton className="mb-2 h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>

                {/* Address Section Skeleton */}
                <div className="mt-8">
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
              </div>
            ) : (
              userData && (
                <div className="relative z-[100000] max-h-[80vh] overflow-y-auto pr-4">
                  <div className="flex flex-col items-start gap-8 lg:flex-row">
                    {/* Left section */}
                    <div className="flex w-full flex-col items-center lg:w-1/3">
                      <div className="relative">
                        <Image
                          src={
                            profilePicture ||
                            userData.profilePicture ||
                            defaultAvatar
                          }
                          alt="Avatar"
                          width={160}
                          height={160}
                          className="rounded-full border-4 border-gray-200"
                        />
                        {isEditMode && (
                          <>
                            <button
                              type="button"
                              className="absolute bottom-2 right-2 rounded-full border-2 border-border bg-white p-1 shadow"
                              onClick={handleEditProfilePicture}
                              aria-label="Edit avatar"
                            >
                              <Image
                                src={cameraIcon}
                                alt="Edit"
                                width={24}
                                height={24}
                              />
                            </button>
                            {(profilePicture || userData.profilePicture) && (
                              <button
                                type="button"
                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow hover:bg-red-600"
                                onClick={handleRemoveProfilePicture}
                                aria-label="Remove avatar"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="white"
                                  className="h-4 w-4"
                                >
                                  <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm2 4h2v10h-2V7Zm-4 0h2v10H7V7Zm8 0h2v10h-2V7Z" />
                                </svg>
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
                      <h3 className="mt-4 text-xl font-semibold">
                        {userData.username}
                      </h3>
                      <p className="text-sm text-gray-500">{userData.email}</p>
                    </div>

                    {/* Right section */}
                    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:w-2/3">
                      <div className="md:col-span-2">
                        <h4 className="mb-2 border-b pb-1 text-lg font-semibold">
                          Personal Information
                        </h4>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.firstName || ''}
                            onChange={e =>
                              handleInputChange('firstName', e.target.value)
                            }
                          />
                        ) : (
                          <p className="p-2">{formData?.firstName || '-'}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.lastName || ''}
                            onChange={e =>
                              handleInputChange('lastName', e.target.value)
                            }
                          />
                        ) : (
                          <p className="p-2">{formData?.lastName || '-'}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Middle Name
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.middleName || ''}
                            onChange={e =>
                              handleInputChange('middleName', e.target.value)
                            }
                          />
                        ) : (
                          <p className="p-2">{formData?.middleName || '-'}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Other Name
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.otherName || ''}
                            onChange={e =>
                              handleInputChange('otherName', e.target.value)
                            }
                          />
                        ) : (
                          <p className="p-2">{formData?.otherName || '-'}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Gender
                        </label>
                        {isEditMode ? (
                          <select
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.gender || ''}
                            onChange={e =>
                              handleInputChange('gender', e.target.value)
                            }
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <p className="p-2 capitalize">
                            {formData?.gender || '-'}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Roles
                        </label>
                        {isEditMode &&
                        (authUser?.roles?.includes('admin') ||
                          authUser?.roles?.includes('developer')) ? (
                          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-white p-2">
                            {[
                              'developer',
                              'admin',
                              'manager',
                              'location admin',
                              'technician',
                              'collector',
                              'collector meters',
                            ].map(role => (
                              <label
                                key={role}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRoles.includes(role)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedRoles([
                                        ...selectedRoles,
                                        role,
                                      ]);
                                    } else {
                                      setSelectedRoles(
                                        selectedRoles.filter(r => r !== role)
                                      );
                                    }
                                  }}
                                  className="h-4 w-4"
                                />
                                <span className="text-sm capitalize">
                                  {role}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="p-2 capitalize">
                            {selectedRoles.length > 0
                              ? selectedRoles.join(', ')
                              : '-'}
                          </p>
                        )}
                      </div>

                      {/* Assigned Licensees */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Assigned Licensees
                        </label>
                        {licenseesLoading ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-32" />
                          </div>
                        ) : isEditMode && isPrivilegedEditor ? (
                          <div className="space-y-3 rounded-md border border-border bg-white p-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <Checkbox
                                checked={allLicenseesSelected}
                                onCheckedChange={checked =>
                                  handleAllLicenseesToggle(checked === true)
                                }
                                disabled={licensees.length === 0}
                              />
                              All Licensees
                            </label>
                            {licensees.length === 0 && (
                              <p className="text-sm text-gray-500">
                                No licensees available. Please add licensees first.
                              </p>
                            )}
                            {!allLicenseesSelected && licensees.length > 0 && (
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
                            {allLicenseesSelected && licensees.length > 0 && (
                              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                All {licensees.length} licensees selected
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="p-2">
                            {userData?.rel?.licencee && userData.rel.licencee.length > 0
                              ? userData.rel.licencee
                                  .map(licenseeId => {
                                    const match = licensees.find(
                                      licensee => String(licensee._id) === String(licenseeId)
                                    );
                                    return match?.name || `Unknown (${licenseeId})`;
                                  })
                                  .join(', ')
                              : isPrivilegedEditor
                                ? 'All Licensees (Admin)'
                                : 'None'}
                          </p>
                        )}
                      </div>

                      {/* Assigned Locations */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Assigned Locations
                        </label>
                        {locationsLoading ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-32" />
                          </div>
                        ) : isEditMode && isPrivilegedEditor ? (
                          <div className="space-y-3 rounded-md border border-border bg-white p-3">
                            {allLicenseesSelected || selectedLicenseeIds.length > 0 ? (
                              <>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Checkbox
                                    checked={allLocationsSelected}
                                    onCheckedChange={checked =>
                                      handleAllLocationsToggle(checked === true)
                                    }
                                    disabled={availableLocations.length === 0}
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
                                    onChange={handleLocationSelectionChange}
                                    placeholder={
                                      availableLocations.length === 0
                                        ? 'No locations available for selected licensees'
                                        : 'Select locations...'
                                    }
                                    searchPlaceholder="Search locations..."
                                    label="locations"
                                    showSelectAll
                                    disabled={availableLocations.length === 0}
                                  />
                                )}
                                {allLocationsSelected && availableLocations.length > 0 && (
                                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                    All {availableLocations.length} available locations selected
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                                Select at least one licensee to assign locations.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2">
                            {(() => {
                              const locationPermissions =
                                userData?.resourcePermissions?.['gaming-locations']?.resources || [];

                              const userRolesLower =
                                userData?.roles?.map(role => role.toLowerCase()) || [];
                              const isManager = userRolesLower.includes('manager');
                              const isAdminOrDev =
                                userRolesLower.includes('admin') ||
                                userRolesLower.includes('developer');

                              if (isAdminOrDev && locationPermissions.length === 0) {
                                return 'All Locations (Admin)';
                              }

                              if (isManager && locationPermissions.length === 0) {
                                return 'All Locations for assigned licensees (Manager)';
                              }

                              if (locationPermissions.length === 0) {
                                return 'No locations assigned';
                              }

                              const hasMissingLocations = locationPermissions.some(locationId => {
                                const location = locations.find(
                                  loc => String(loc._id) === String(locationId)
                                );
                                return !location && !missingLocationNames[locationId];
                              });

                              if (hasMissingLocations) {
                                return <Skeleton className="inline-block h-5 w-48" />;
                              }

                              const locationNames = locationPermissions
                                .map(locationId => {
                                  const location = locations.find(
                                    loc => String(loc._id) === String(locationId)
                                  );
                                  if (location) {
                                    return location.name;
                                  }
                                  if (missingLocationNames[locationId]) {
                                    return missingLocationNames[locationId];
                                  }
                                  return `Unknown (${locationId})`;
                                })
                                .join(', ');

                              return locationNames || 'No locations found';
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="mt-8">
                    <h4 className="mb-2 border-b pb-1 text-lg font-semibold">
                      Address
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Street
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.address?.street || ''}
                            onChange={e =>
                              handleInputChange(
                                'street',
                                e.target.value,
                                'address'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.address?.street || '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Town
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.address?.town || ''}
                            onChange={e =>
                              handleInputChange(
                                'town',
                                e.target.value,
                                'address'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.address?.town || '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Region
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.address?.region || ''}
                            onChange={e =>
                              handleInputChange(
                                'region',
                                e.target.value,
                                'address'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.address?.region || '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Country
                        </label>
                        {isEditMode ? (
                          <select
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.address?.country || ''}
                            onChange={e =>
                              handleInputChange(
                                'country',
                                e.target.value,
                                'address'
                              )
                            }
                          >
                            <option value="">Select Country</option>
                            {countriesLoading ? (
                              <option value="" disabled>
                                Loading countries...
                              </option>
                            ) : (
                              countries.map(country => (
                                <option key={country._id} value={country._id}>
                                  {country.name}
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <p className="p-2">
                            {countries.find(
                              c => c._id === formData?.address?.country
                            )?.name ||
                              formData?.address?.country ||
                              '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Postal Code
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.address?.postalCode || ''}
                            onChange={e =>
                              handleInputChange(
                                'postalCode',
                                e.target.value,
                                'address'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.address?.postalCode || '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Identification Section */}
                  <div className="mt-8">
                    <h4 className="mb-2 border-b pb-1 text-lg font-semibold">
                      Identification
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Date of Birth
                        </label>
                        {isEditMode ? (
                          <input
                            type="date"
                            className="w-full rounded-md border border-border bg-white p-2"
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
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.identification?.dateOfBirth
                              ? new Date(
                                  formData.identification.dateOfBirth
                                ).toLocaleDateString()
                              : '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          ID Type
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.identification?.idType || ''}
                            onChange={e =>
                              handleInputChange(
                                'idType',
                                e.target.value,
                                'identification'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.identification?.idType || '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          ID Number
                        </label>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="w-full rounded-md border border-border bg-white p-2"
                            value={formData?.identification?.idNumber || ''}
                            onChange={e =>
                              handleInputChange(
                                'idNumber',
                                e.target.value,
                                'identification'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.identification?.idNumber || '-'}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        {isEditMode ? (
                          <textarea
                            className="min-h-[80px] w-full rounded-md border border-border bg-white p-2"
                            value={formData?.identification?.notes || ''}
                            onChange={e =>
                              handleInputChange(
                                'notes',
                                e.target.value,
                                'identification'
                              )
                            }
                          />
                        ) : (
                          <p className="p-2">
                            {formData?.identification?.notes || '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Password Section */}
                  {isEditMode && (
                    <div className="mt-8">
                      <h4 className="mb-2 border-b pb-1 text-lg font-semibold">
                        Change Password
                      </h4>
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
                        * To change your password, fill in all three fields. Leave all fields empty to keep your current password.
                      </p>
                    </div>
                  )}

                  {isEditMode && (
                    <div className="mt-8 flex justify-end gap-4">
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="border-gray-400"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="bg-button hover:bg-buttonActive"
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
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
