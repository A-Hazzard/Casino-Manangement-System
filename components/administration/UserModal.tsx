import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';
import MultiSelectDropdown from '@/components/ui/common/MultiSelectDropdown';
import CircleCropModal from '@/components/ui/image/CircleCropModal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { ResourcePermissions, User } from '@/lib/types/administration';
import type { Country } from '@/lib/types/country';
import type { Licensee } from '@/lib/types/licensee';
import type { LocationSelectItem } from '@/lib/types/location';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import {
  getPasswordStrengthLabel,
  isPlaceholderEmail,
  validateEmail,
  validatePasswordStrength,
  validatePhoneNumber,
} from '@/lib/utils/validation';
import cameraIcon from '@/public/cameraIcon.svg';
import defaultAvatar from '@/public/defaultAvatar.svg';
import gsap from 'gsap';
import { Edit3, Info, Loader2, Save, Trash2, X, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import RolePermissionsDialog from './RolePermissionsDialog';

const ROLE_OPTIONS = [
  { label: 'Developer', value: 'developer' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Location Admin', value: 'location admin' },
  { label: 'Technician', value: 'technician' },
  { label: 'Collector', value: 'collector' },
];

const arraysEqual = (a: string[], b: string[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

export type UserModalProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (
    user: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
    }
  ) => void;
};

export default function UserModal({
  open,
  onClose,
  user,
  onSave,
}: UserModalProps) {
  const currentUser = useUserStore(state => state.user);
  const currentUserRoles = (currentUser?.roles || []) as string[];
  const isDeveloper = currentUserRoles.includes('developer');
  const isAdmin = currentUserRoles.includes('admin') && !isDeveloper;
  const isManager =
    currentUserRoles.includes('manager') && !isAdmin && !isDeveloper;
  const isLocationAdmin =
    currentUserRoles.includes('location admin') && !isAdmin && !isDeveloper && !isManager;
  const canEditAccountFields = Boolean(
    currentUser?.roles?.some(role =>
      ['admin', 'developer', 'manager', 'location admin'].includes(role)
    )
  );
  const canEditLicensees = isDeveloper || isAdmin; // Only admins/developers can edit licensee assignments

  // Filter available roles based on editor's permissions
  const availableRoles = useMemo(() => {
    if (isDeveloper) {
      // Developer can assign all roles
      return ROLE_OPTIONS;
    } else if (isAdmin) {
      // Admin can assign all roles except developer
      return ROLE_OPTIONS.filter(role => role.value !== 'developer');
    } else if (isManager) {
      // Manager can only assign: location admin, technician, collector
      return ROLE_OPTIONS.filter(role =>
        ['location admin', 'technician', 'collector'].includes(role.value)
      );
    } else if (isLocationAdmin) {
      // Location admin can only assign: technician, collector
      return ROLE_OPTIONS.filter(role =>
        ['technician', 'collector'].includes(role.value)
      );
    }
    // No roles available for other users
    return [];
  }, [isDeveloper, isAdmin, isManager, isLocationAdmin]);
  const currentUserLicenseeIds = useMemo(
    () =>
      ((currentUser?.rel as { licencee?: string[] })?.licencee || []).map(id =>
        String(id)
      ),
    [currentUser?.rel]
  );
  
  // Get location admin's assigned locations
  const currentUserLocationPermissions = useMemo(
    () =>
      ((currentUser?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [])
      .map(id => String(id)),
    [currentUser?.resourcePermissions]
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Form state for profile details
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    phoneNumber: '',
    street: '',
    town: '',
    region: '',
    country: '',
    postalCode: '',
    dateOfBirth: '',
    idType: '',
    idNumber: '',
    notes: '',
    profilePicture: '',
  });

  const [accountData, setAccountData] = useState({
    username: '',
    email: '',
  });

  // Form state for roles and permissions
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const [roles, setRoles] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);
  const [rolePermissionsDialog, setRolePermissionsDialog] = useState<{
    open: boolean;
    role: string;
    roleLabel: string;
  }>({ open: false, role: '', roleLabel: '' });

  // Licensees state
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const licenseesRef = useRef<Licensee[]>([]);
  const locationsRef = useRef<LocationSelectItem[]>([]);
  const rawLicenseeIdsRef = useRef<string[]>([]);

  // Countries state
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  useEffect(() => {
    licenseesRef.current = licensees;
  }, [licensees]);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  const hydrateFormFromUser = useCallback((targetUser: User) => {
    setFormData({
      firstName: targetUser.profile?.firstName || '',
      lastName: targetUser.profile?.lastName || '',
      gender: targetUser.profile?.gender || '',
      phoneNumber: (targetUser.profile as { phoneNumber?: string } | undefined)?.phoneNumber || 
                   (targetUser.profile as { contact?: { phone?: string } } | undefined)?.contact?.phone || '',
      street: targetUser.profile?.address?.street || '',
      town: targetUser.profile?.address?.town || '',
      region: targetUser.profile?.address?.region || '',
      country: targetUser.profile?.address?.country || '',
      postalCode: targetUser.profile?.address?.postalCode || '',
      dateOfBirth: targetUser.profile?.identification?.dateOfBirth || '',
      idType: targetUser.profile?.identification?.idType || '',
      idNumber: targetUser.profile?.identification?.idNumber || '',
      notes: targetUser.profile?.identification?.notes || '',
      profilePicture: targetUser.profilePicture || '',
    });

    setAccountData({
      username: targetUser.username || '',
      email: targetUser.email || targetUser.emailAddress || '',
    });

    setRoles(targetUser.roles || []);
    setIsEnabled(targetUser.enabled !== undefined ? targetUser.enabled : true);

    const userLocationIds =
      targetUser.resourcePermissions?.['gaming-locations']?.resources?.map(id =>
        String(id)
      ) || [];
    setSelectedLocationIds(userLocationIds);

    const rawLicenseeIds =
      targetUser.rel?.licencee?.map(id => String(id)) || [];
    rawLicenseeIdsRef.current = rawLicenseeIds;

    const currentLocations = locationsRef.current;
    if (currentLocations.length > 0) {
      setAllLocationsSelected(
        userLocationIds.length > 0 &&
          userLocationIds.length === currentLocations.length
      );
    } else {
      setAllLocationsSelected(false);
    }

    const currentLicensees = licenseesRef.current;
    if (currentLicensees.length > 0) {
      const normalizedLicenseeIds = rawLicenseeIds.map(value => {
        const idMatch = currentLicensees.find(
          lic => String(lic._id) === String(value)
        );
        if (idMatch) {
          return String(idMatch._id);
        }
        const nameMatch = currentLicensees.find(
          lic =>
            lic.name && lic.name.toLowerCase() === String(value).toLowerCase()
        );
        return nameMatch ? String(nameMatch._id) : String(value);
      });

      setSelectedLicenseeIds(prev =>
        arraysEqual(prev, normalizedLicenseeIds) ? prev : normalizedLicenseeIds
      );

      const shouldSelectAll =
        normalizedLicenseeIds.length > 0 &&
        normalizedLicenseeIds.length === currentLicensees.length;
      setAllLicenseesSelected(shouldSelectAll);

      if (normalizedLicenseeIds.length > 0) {
        setSelectedLocationIds(prev =>
          prev.filter(locId => {
            const location = locationsRef.current.find(
              loc => loc._id === locId
            );
            if (!location || !location.licenseeId) {
              return shouldSelectAll;
            }
            return normalizedLicenseeIds.includes(location.licenseeId);
          })
        );
      }
    } else {
      setSelectedLicenseeIds(prev =>
        arraysEqual(prev, rawLicenseeIds) ? prev : rawLicenseeIds
      );
      setAllLicenseesSelected(false);
    }
  }, []);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      console.log('[UserModal] Initializing with user:', {
        username: user.username,
        hasRel: !!user.rel,
        relLicencee: user.rel?.licencee,
        relLicenceeType: typeof user.rel?.licencee,
        relLicenceeIsArray: Array.isArray(user.rel?.licencee),
        locationPermissions:
          user.resourcePermissions?.['gaming-locations']?.resources,
      });

      setIsLoading(false);
      hydrateFormFromUser(user);
    } else if (open) {
      setIsLoading(true);
      
      // For location admins creating new user, auto-set licensee
      if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
        setSelectedLicenseeIds(currentUserLicenseeIds);
        setAllLicenseesSelected(false);
      }
    }
  }, [user, open, hydrateFormFromUser, locations.length, licensees.length, isLocationAdmin, currentUserLicenseeIds]);

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Fetch all locations with showAll parameter for admin access
        const response = await fetch(
          '/api/locations?showAll=true&forceAll=true',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error('Failed to fetch locations');
          return;
        }

        const data = await response.json();
        const locationsList = data.locations || [];

        let formattedLocs = locationsList.map(
          (loc: {
            _id?: string;
            id?: string;
            name?: string;
            locationName?: string;
            licenseeId?: string | null;
          }) => ({
            _id: loc._id?.toString() || loc.id?.toString() || '',
            name: loc.name || loc.locationName || 'Unknown Location',
            licenseeId: loc.licenseeId ? String(loc.licenseeId) : null,
          })
        );

        // Filter locations for location admins - only show their assigned locations
        if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
          formattedLocs = formattedLocs.filter((loc: LocationSelectItem) =>
            currentUserLocationPermissions.includes(loc._id)
          );
        }

        setLocations(formattedLocs);

        // Check if all locations are selected
        const userLocationIds = (
          user?.resourcePermissions?.['gaming-locations']?.resources || []
        ).map(id => String(id));
        if (userLocationIds.length > 0 && formattedLocs.length > 0) {
          setAllLocationsSelected(
            userLocationIds.length === formattedLocs.length
          );
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    loadLocations();
  }, [user, isLocationAdmin, currentUserLocationPermissions]);

  // Load licensees when the modal is open and normalise assignments - only when modal opens
  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadLicensees = async () => {
      try {
        const result = await fetchLicensees();
        if (cancelled) return;
        
        // Extract licensees array from the result
        let lics = Array.isArray(result.licensees) ? result.licensees : [];

        // Filter licensees for managers - only show their assigned licensees
        if (isManager && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        // For location admins, auto-set licensee based on their licensee
        // and filter to only show their licensee
        if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
          // Auto-set the licensee for location admins
          if (lics.length > 0 && selectedLicenseeIds.length === 0) {
            setSelectedLicenseeIds([String(lics[0]._id)]);
            setAllLicenseesSelected(false);
          }
        }

        setLicensees(lics);

        if (lics.length === 0) {
          setAllLicenseesSelected(false);
          return;
        }

        if (rawLicenseeIdsRef.current.length === 0) {
          setSelectedLicenseeIds(prev => (prev.length === 0 ? prev : []));
          setAllLicenseesSelected(false);
          return;
        }

        const normalizedLicenseeIds = rawLicenseeIdsRef.current.map(value => {
          const idMatch = lics.find(lic => String(lic._id) === String(value));
          if (idMatch) {
            return String(idMatch._id);
          }
          const nameMatch = lics.find(
            lic =>
              lic.name && lic.name.toLowerCase() === String(value).toLowerCase()
          );
          return nameMatch ? String(nameMatch._id) : String(value);
        });

        setSelectedLicenseeIds(prev =>
          arraysEqual(prev, normalizedLicenseeIds)
            ? prev
            : normalizedLicenseeIds
        );

        const shouldSelectAll =
          normalizedLicenseeIds.length > 0 &&
          normalizedLicenseeIds.length === lics.length;
        setAllLicenseesSelected(shouldSelectAll);

        if (normalizedLicenseeIds.length > 0) {
          setSelectedLocationIds(prev => {
            if (prev.length === 0) {
              return prev;
            }

            const currentLocations = locationsRef.current;
            if (currentLocations.length === 0) {
              return prev;
            }

            const filtered = prev.filter(locId => {
              const location = currentLocations.find(loc => loc._id === locId);
              if (!location || !location.licenseeId) {
                return shouldSelectAll;
              }
              return normalizedLicenseeIds.includes(location.licenseeId);
            });

            return arraysEqual(filtered, prev) ? prev : filtered;
          });
        }
      } catch (error) {
        console.error('Error loading licensees:', error);
      }
    };

    void loadLicensees();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLocationAdmin, currentUserLicenseeIds]); // Only depend on 'open' - fetch once when modal opens

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

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setPassword('');
      setConfirmPassword('');
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
  }, [open]);

  // Update password strength when password changes
  useEffect(() => {
    if (password) {
      const validation = validatePasswordStrength(password);
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
  }, [password]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAccountInputChange = (
    field: 'username' | 'email',
    value: string
  ) => {
    setAccountData(prev => ({
      ...prev,
      [field]: value,
    }));
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

  const handleRemoveProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: '' }));
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setFormData(prev => ({ ...prev, profilePicture: croppedImageUrl }));
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setRoles(prev =>
      checked ? [...prev, role] : prev.filter(r => r !== role)
    );
  };

  // Filter locations based on selected licensees
  // For location admins, only show their assigned locations
  const availableLocations = useMemo(() => {
    if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
      // Location admins can only see their assigned locations
      return locations.filter(loc =>
        currentUserLocationPermissions.includes(loc._id)
      );
    }
    
    // For other roles, filter by selected licensees
    return allLicenseesSelected
      ? locations
      : selectedLicenseeIds.length > 0
        ? locations.filter(
            loc => loc.licenseeId && selectedLicenseeIds.includes(loc.licenseeId)
          )
        : [];
  }, [isLocationAdmin, currentUserLocationPermissions, locations, allLicenseesSelected, selectedLicenseeIds]);

  const handleAllLocationsChange = (checked: boolean) => {
    setAllLocationsSelected(checked);
    if (checked) {
      setSelectedLocationIds(availableLocations.map(loc => loc._id));
    } else {
      setSelectedLocationIds([]);
    }
  };

  // Convert to MultiSelect format
  const licenseeOptions: MultiSelectOption[] = licensees.map(lic => ({
    id: String(lic._id),
    label: lic.name,
  }));

  const locationOptions: MultiSelectOption[] = availableLocations.map(loc => ({
    id: loc._id,
    label: loc.name,
  }));

  // Licensee selection handlers
  const handleLicenseeChange = (newSelectedIds: string[]) => {
    console.log(
      '[UserModal] handleLicenseeChange called with IDs:',
      newSelectedIds
    );
    setSelectedLicenseeIds(newSelectedIds);

    // Update "All Licensees" checkbox state
    setAllLicenseesSelected(
      newSelectedIds.length === licensees.length && licensees.length > 0
    );

    // Remove selected locations that don't belong to the newly selected licensees
    const validLocationIds = selectedLocationIds.filter(locId => {
      const location = locations.find(l => l._id === locId);
      return (
        location &&
        location.licenseeId &&
        newSelectedIds.includes(location.licenseeId)
      );
    });

    if (validLocationIds.length !== selectedLocationIds.length) {
      setSelectedLocationIds(validLocationIds);
      toast.info(
        "Some locations were removed because they don't belong to the selected licensees"
      );
    }
  };

  const handleAllLicenseesChange = (checked: boolean) => {
    setAllLicenseesSelected(checked);
    if (checked) {
      setSelectedLicenseeIds(licensees.map(lic => String(lic._id)));
    } else {
      setSelectedLicenseeIds([]);
      // Clear locations when no licensees are selected
      if (selectedLocationIds.length > 0) {
        setSelectedLocationIds([]);
        toast.info('All locations cleared since no licensees are selected');
      }
    }
  };

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate that we have a user to update
    if (!user) {
      toast.error('No user selected for update');
      return;
    }

    const updatedUsername = canEditAccountFields
      ? accountData.username.trim()
      : user.username;

    // Always get the base email from the user object as the source of truth
    const baseEmail = (user.email || user.emailAddress || '').trim();

    // For email: if we can edit and accountData.email has a non-empty value, use it
    // Otherwise, always fall back to baseEmail to preserve existing email
    // This ensures email is never lost when editing other fields
    const accountEmailTrimmed = accountData.email?.trim() || '';
    const updatedEmail =
      canEditAccountFields && accountEmailTrimmed
        ? accountEmailTrimmed
        : baseEmail;

    // Debug logging
    console.log('[UserModal] Email Debug:', {
      'user.email': user.email,
      'user.emailAddress': user.emailAddress,
      'accountData.email': accountData.email,
      accountEmailTrimmed: accountEmailTrimmed,
      baseEmail: baseEmail,
      updatedEmail: updatedEmail,
      canEditAccountFields: canEditAccountFields,
      'updatedEmail length': updatedEmail.length,
      'updatedEmail isEmpty': !updatedEmail || updatedEmail.length === 0,
    });

    if (!updatedUsername) {
      toast.error('Username is required');
      return;
    }

    // Validate email is required when editing from admin page
    // updatedEmail should always have a value (either from accountData or baseEmail)
    if (canEditAccountFields && !updatedEmail) {
      console.error(
        '[UserModal] Email validation failed: updatedEmail is empty',
        {
          baseEmail,
          accountDataEmail: accountData.email,
          userEmail: user.email,
          userEmailAddress: user.emailAddress,
        }
      );
      toast.error('Email address is required');
      return;
    }

    // Validate email format and check for placeholder emails
    if (canEditAccountFields && updatedEmail) {
      if (!validateEmail(updatedEmail)) {
        toast.error('Please provide a valid email address');
        return;
      }
      if (isPlaceholderEmail(updatedEmail)) {
        toast.error(
          'Please use a real email address. Placeholder emails like example@example.com are not allowed.'
        );
        return;
      }
    }

    // Helper to check if a field value has changed
    const hasChanged = (
      newValue: string,
      existingValue: string | undefined | null
    ): boolean => {
      const newTrimmed = newValue.trim();
      const existingTrimmed = existingValue?.toString().trim() || '';
      return newTrimmed !== existingTrimmed;
    };

    // Build profile update - only include fields that have actually changed
    const profileUpdate: Record<string, unknown> = {};
    const existingProfile = user?.profile || {};

    // Check and include profile fields only if they've changed
    if (hasChanged(formData.firstName, existingProfile.firstName)) {
      profileUpdate.firstName = formData.firstName.trim() || undefined;
    }
    if (hasChanged(formData.lastName, existingProfile.lastName)) {
      profileUpdate.lastName = formData.lastName.trim() || undefined;
    }
    if (hasChanged(formData.gender, existingProfile.gender)) {
      profileUpdate.gender = formData.gender.trim() || undefined;
    }
    if (hasChanged(formData.phoneNumber, (existingProfile as { phoneNumber?: string }).phoneNumber)) {
      const trimmedPhone = formData.phoneNumber.trim();
      // Phone number is optional, but if provided, it must be valid
      if (trimmedPhone && !validatePhoneNumber(trimmedPhone)) {
        toast.error('Please enter a valid phone number (7-20 digits, spaces, hyphens, parentheses, optional leading +)');
        return;
      }
      profileUpdate.phoneNumber = trimmedPhone || undefined;
    }

    // Build address update - only include fields that have changed
    const addressUpdate: Record<string, unknown> = {};
    const existingAddress = existingProfile.address || {};

    if (hasChanged(formData.street, existingAddress.street)) {
      addressUpdate.street = formData.street.trim() || undefined;
    }
    if (hasChanged(formData.town, existingAddress.town)) {
      addressUpdate.town = formData.town.trim() || undefined;
    }
    if (hasChanged(formData.region, existingAddress.region)) {
      addressUpdate.region = formData.region.trim() || undefined;
    }
    if (hasChanged(formData.country, existingAddress.country)) {
      addressUpdate.country = formData.country.trim() || undefined;
    }
    if (hasChanged(formData.postalCode, existingAddress.postalCode)) {
      addressUpdate.postalCode = formData.postalCode.trim() || undefined;
    }

    // Only include address if it has at least one changed field
    if (Object.keys(addressUpdate).length > 0) {
      profileUpdate.address = {
        ...existingAddress,
        ...addressUpdate,
      };
    }

    // Build identification update - only include fields that have changed
    const identificationUpdate: Record<string, unknown> = {};
    const existingIdentification = existingProfile.identification || {};

    // Handle dateOfBirth specially - compare as dates
    const existingDob = existingIdentification.dateOfBirth
      ? typeof existingIdentification.dateOfBirth === 'string'
        ? existingIdentification.dateOfBirth
        : new Date(existingIdentification.dateOfBirth as Date)
            .toISOString()
            .split('T')[0]
      : '';
    if (formData.dateOfBirth.trim() !== existingDob) {
      identificationUpdate.dateOfBirth =
        formData.dateOfBirth.trim() || undefined;
    }

    if (hasChanged(formData.idType, existingIdentification.idType)) {
      identificationUpdate.idType = formData.idType.trim() || undefined;
    }
    if (hasChanged(formData.idNumber, existingIdentification.idNumber)) {
      identificationUpdate.idNumber = formData.idNumber.trim() || undefined;
    }
    if (hasChanged(formData.notes, existingIdentification.notes)) {
      identificationUpdate.notes = formData.notes.trim() || undefined;
    }

    // Only include identification if it has at least one changed field
    if (Object.keys(identificationUpdate).length > 0) {
      profileUpdate.identification = {
        ...existingIdentification,
        ...identificationUpdate,
      };
    }

    // Check for location and licensee changes BEFORE building update object
    const oldLocationIds = (
      user?.resourcePermissions?.['gaming-locations']?.resources || []
    ).map(id => String(id));
    const newLocationIds = selectedLocationIds.map(id => String(id));

    // Sort for comparison
    const oldLocationIdsSorted = [...oldLocationIds].sort();
    const newLocationIdsSorted = [...newLocationIds].sort();

    const locationIdsChanged =
      oldLocationIdsSorted.length !== newLocationIdsSorted.length ||
      !oldLocationIdsSorted.every(
        (id, idx) => id === newLocationIdsSorted[idx]
      );

    const oldLicenseeIds = (user?.rel?.licencee || []).map(id => String(id));
    const newLicenseeIds = selectedLicenseeIds.map(id => String(id));

    // Sort for comparison
    const oldLicenseeIdsSorted = [...oldLicenseeIds].sort();
    const newLicenseeIdsSorted = [...newLicenseeIds].sort();

    const licenseeIdsChanged =
      oldLicenseeIdsSorted.length !== newLicenseeIdsSorted.length ||
      !oldLicenseeIdsSorted.every(
        (id, idx) => id === newLicenseeIdsSorted[idx]
      );

    // Prevent managers and location admins from changing licensee assignments
    if (isManager && licenseeIdsChanged) {
      toast.error('Managers cannot change licensee assignments');
      return;
    }

    // Check for changes before building update object
    // Normalize email values for comparison (trim and handle empty strings)
    const originalEmail = (user.email || user.emailAddress || '')
      .trim()
      .toLowerCase();
    const newEmail = updatedEmail.trim().toLowerCase();
    const usernameChanged = user.username !== updatedUsername;
    const emailChanged = originalEmail !== newEmail;
    const rolesChanged =
      JSON.stringify((user.roles || []).sort()) !==
      JSON.stringify(roles.sort());

    // Debug logging for change detection
    console.log('[UserModal] Change Detection Debug:', {
      originalEmail: originalEmail,
      newEmail: newEmail,
      emailChanged: emailChanged,
      usernameChanged: usernameChanged,
      'updatedEmail (raw)': updatedEmail,
      'updatedEmail isEmpty': !updatedEmail || updatedEmail.length === 0,
    });

    // Structure the data properly to match the User type - only include changed fields
    // Note: Backend uses 'isEnabled' but User type uses 'enabled', so we need to allow both
    const updatedUser: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
      isEnabled?: boolean; // Backend field name
    } = {
      _id: user._id,
      // Initialize with existing resourcePermissions or default
      resourcePermissions: (user?.resourcePermissions || {
        'gaming-locations': {
          entity: 'gaming-locations' as const,
          resources: [],
        },
      }) as ResourcePermissions,
    };
    
    // For location admins, auto-set licensee to their licensee
    if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
      // Always use the location admin's licensee
      updatedUser.rel = {
        licencee: currentUserLicenseeIds,
      };
    }

    // Only include fields that have changed
    if (usernameChanged) {
      updatedUser.username = updatedUsername;
    }
    // Always include email if we can edit account fields (to ensure it's preserved)
    // Only include it in the update if it changed OR if we're editing from admin page
    if (canEditAccountFields) {
      if (emailChanged) {
        // Email is being changed - validate and include it
        if (updatedEmail && updatedEmail.trim()) {
          updatedUser.email = updatedEmail.trim();
          updatedUser.emailAddress = updatedEmail.trim();
        } else {
          toast.error('Email address cannot be empty');
          return;
        }
      } else if (updatedEmail && updatedEmail.trim()) {
        // Email hasn't changed but we should preserve it when editing from admin page
        // This ensures email is always present in the update payload
        updatedUser.email = updatedEmail.trim();
        updatedUser.emailAddress = updatedEmail.trim();
      }
    }
    if (rolesChanged) {
      updatedUser.roles = roles;
    }

    // Only include licensee if it changed (and user can edit it)
    // Location admins have their licensee auto-set above, so skip here
    if (licenseeIdsChanged && !isManager && !isLocationAdmin) {
      updatedUser.rel = {
        licencee: selectedLicenseeIds,
      };
    }

    // Update resourcePermissions if locations changed
    if (locationIdsChanged) {
      updatedUser.resourcePermissions = {
        ...(user?.resourcePermissions || {}),
        'gaming-locations': {
          entity: 'gaming-locations' as const,
          resources: selectedLocationIds,
        },
      } as ResourcePermissions;
    }

    // Only include profile if it has fields to update
    if (Object.keys(profileUpdate).length > 0) {
      updatedUser.profile = {
        ...existingProfile,
        ...profileUpdate,
      } as typeof user.profile;
    }

    // Only include profilePicture if it's being updated and has changed
    if (formData.profilePicture !== (user?.profilePicture || '')) {
      updatedUser.profilePicture = formData.profilePicture || null;
    }

    // Only include password if it's being changed
    if (password) {
      updatedUser.password = password;
    }

    // Include isEnabled if it changed (only for developers, admins, or managers)
    // Note: User type uses 'enabled' but backend uses 'isEnabled', so we send 'isEnabled'
    if ((isDeveloper || isAdmin || isManager) && user.enabled !== isEnabled) {
      updatedUser.isEnabled = isEnabled;
    }

    // Note: profile is optional - we only include it if there are fields to update

    // Validate email format if provided
    if (updatedEmail && !/\S+@\S+\.\S+/.test(updatedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate password if provided
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        toast.error(
          `Password requirements not met: ${passwordValidation.feedback.join(
            ', '
          )}`
        );
        return;
      }
    }

    // System/metadata fields to exclude from change detection
    const systemFields = new Set([
      '_id',
      'createdAt',
      'updatedAt',
      '__v',
      'sessionVersion',
      'loginCount',
      'lastLoginAt',
      'deletedAt',
      'passwordUpdatedAt',
      'isEnabled', // This is handled separately if needed
    ]);

    // Create a clean version of the user object without system fields for comparison
    const cleanUser: Record<string, unknown> = {};
    const fieldsToCompare = [
      'username',
      'email',
      'emailAddress',
      'roles',
      'profile',
      'profilePicture',
      'rel',
      'resourcePermissions',
    ];

    for (const field of fieldsToCompare) {
      if (field in user) {
        cleanUser[field] = user[field as keyof typeof user];
      }
    }

    // Detect actual changes between old and new user data (excluding system fields)
    const changes = detectChanges(cleanUser, updatedUser);
    const meaningfulChanges = filterMeaningfulChanges(changes).filter(
      change =>
        !systemFields.has(change.field) &&
        !systemFields.has(change.path.split('.')[0])
    );

    const ensureChangeLogged = (
      fieldPath: string,
      oldValue: unknown,
      newValue: unknown
    ) => {
      if (oldValue === newValue) return;
      if (!meaningfulChanges.some(change => change.path === fieldPath)) {
        meaningfulChanges.push({
          field: fieldPath.split('.').pop() || fieldPath,
          oldValue,
          newValue,
          path: fieldPath,
        });
      }
    };

    ensureChangeLogged('username', user.username, updatedUsername);
    ensureChangeLogged('email', user.email || null, updatedEmail);
    ensureChangeLogged(
      'emailAddress',
      user.emailAddress || user.email || null,
      updatedEmail
    );

    // Log location and licensee changes if they changed
    if (locationIdsChanged) {
      ensureChangeLogged(
        'resourcePermissions.gaming-locations.resources',
        oldLocationIds,
        newLocationIds
      );
    }

    if (licenseeIdsChanged && !isManager) {
      ensureChangeLogged('rel.licencee', oldLicenseeIds, newLicenseeIds);
    }

    // Log for debugging
    console.log('[UserModal] Change Detection Debug:');
    console.log('  Old licensee IDs:', oldLicenseeIds);
    console.log('  New licensee IDs:', newLicenseeIds);
    console.log('  Old sorted:', oldLicenseeIdsSorted);
    console.log('  New sorted:', newLicenseeIdsSorted);
    console.log('  Licensee IDs changed:', licenseeIdsChanged);
    console.log('  Location IDs changed:', locationIdsChanged);
    console.log('  Meaningful changes:', meaningfulChanges.length);

    // Only proceed if there are actual changes
    if (
      meaningfulChanges.length === 0 &&
      !locationIdsChanged &&
      !licenseeIdsChanged
    ) {
      console.error('[UserModal] ❌ No changes detected - blocking save');
      console.error('  This might be a bug if you just made changes!');
      toast.info('No changes detected');
      return;
    }

    // Log the changes for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('✅ Changes detected - proceeding with save');
      console.warn('Detected changes:', meaningfulChanges);
      console.warn('Changes summary:', getChangesSummary(meaningfulChanges));
      console.warn('Location IDs changed:', locationIdsChanged, {
        oldLocationIds,
        newLocationIds,
      });
      console.warn('Licensee IDs changed:', licenseeIdsChanged, {
        old: oldLicenseeIdsSorted,
        new: newLicenseeIdsSorted,
      });
    }

    setIsLoading(true);
    try {
      await onSave(updatedUser);
      setAccountData({
        username: updatedUsername,
        email: updatedEmail,
      });
      setIsEditMode(false);
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      hydrateFormFromUser(user);
    }
    setIsEditMode(false);
    setPassword('');
    setConfirmPassword('');
  };

  const handleEnterEdit = () => {
    if (user) {
      hydrateFormFromUser(user);
    }
    setPassword('');
    setConfirmPassword('');
    setIsEditMode(true);
  };

  if (!open || !user) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center">
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div
          ref={modalRef}
          className="relative flex h-full w-full flex-col overflow-y-auto border border-border bg-white p-4 animate-in lg:max-h-[95vh] lg:max-w-4xl lg:rounded-2xl lg:p-10"
          style={{ opacity: 1 }}
        >
          {/* Header with close button and edit toggle */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit User Details' : 'User Details'}
            </h2>
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <Button
                  onClick={handleEnterEdit}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              )}
              <button
                className="rounded-full bg-white p-2 shadow hover:bg-gray-100"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-6 w-6 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-8">
            {/* Top section: Profile pic + username/email (left), user info fields (right) */}
            <div className="flex w-full flex-col items-start lg:flex-row lg:items-center lg:gap-12">
              {/* Left: Profile pic, username, and email */}
              <div className="flex w-full flex-col items-center justify-center lg:w-1/3 lg:items-start">
                <div className="relative mb-4 flex justify-center">
                  <Image
                    src={
                      formData.profilePicture ||
                      user.profilePicture ||
                      defaultAvatar
                    }
                    alt="Avatar"
                    width={160}
                    height={160}
                    className="rounded-full border-4 border-container bg-gray-200"
                  />
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        className="absolute bottom-4 right-4 flex items-center justify-center rounded-full border-2 border-border bg-transparent shadow transition-colors hover:bg-gray-100"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Image
                          src={cameraIcon}
                          alt="Edit Avatar"
                          width={32}
                          height={32}
                          className="m-0 p-0"
                        />
                      </button>
                      {(formData.profilePicture || user.profilePicture) && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                          onClick={handleRemoveProfilePicture}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex w-full flex-col items-center space-y-4 lg:items-start">
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Username:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : isEditMode && canEditAccountFields ? (
                      <Input
                        value={accountData.username}
                        onChange={e =>
                          handleAccountInputChange('username', e.target.value)
                        }
                        placeholder="Enter username"
                        className="w-full"
                        required
                      />
                    ) : (
                      <div className="w-full text-center text-gray-700 lg:text-left">
                        {accountData.username || 'Not specified'}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Email Address:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : isEditMode && canEditAccountFields ? (
                      <Input
                        type="email"
                        value={accountData.email}
                        onChange={e =>
                          handleAccountInputChange('email', e.target.value)
                        }
                        placeholder="Enter email address"
                        className="w-full"
                        required
                      />
                    ) : (
                      <div className="w-full text-center text-gray-700 lg:text-left">
                        {accountData.email || 'Not specified'}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Phone Number:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : isEditMode ? (
                      <Input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))
                        }
                        placeholder="Enter phone number"
                        className="w-full"
                      />
                    ) : (
                      <div className="w-full text-center text-gray-700 lg:text-left">
                        {formData.phoneNumber || 'Not specified'}
                      </div>
                    )}
                  </div>
                  {/* Account Status - Show in view mode for admins/developers/managers */}
                  {!isEditMode && (isDeveloper || isAdmin || isManager) && (
                    <div className="w-full">
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Account Status:
                      </label>
                      <div className="w-full text-center text-gray-700 lg:text-left">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            isEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Right: User info fields */}
              <div className="mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:mt-0 lg:w-2/3">
                {isLoading ? (
                  <>
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div key={index}>
                        <Skeleton className="mb-1 h-4 w-20" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        First Name:
                      </label>
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md border border-border bg-white p-3"
                          value={formData.firstName}
                          onChange={e =>
                            handleInputChange('firstName', e.target.value)
                          }
                          placeholder="Enter First Name"
                        />
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.firstName || 'Not specified'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Last Name:
                      </label>
                      {isEditMode ? (
                        <input
                          className="w-full rounded-md border border-border bg-white p-3"
                          value={formData.lastName}
                          onChange={e =>
                            handleInputChange('lastName', e.target.value)
                          }
                          placeholder="Enter Last Name"
                        />
                      ) : (
                        <div className="w-full text-gray-700">
                          {formData.lastName || 'Not specified'}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Gender:
                      </label>
                      {isEditMode ? (
                        <select
                          className="w-full rounded-md border border-border bg-white p-3"
                          value={formData.gender}
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
                        <div className="w-full text-gray-700">
                          {formData.gender
                            ? formData.gender.charAt(0).toUpperCase() +
                              formData.gender.slice(1)
                            : 'Not specified'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Address Section */}
            <hr className="my-6 w-full border-gray-400" />
            <div className="flex w-full flex-col items-center">
              <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
                Address
              </h3>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Street:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.street}
                      onChange={e =>
                        handleInputChange('street', e.target.value)
                      }
                      placeholder="Enter Street"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.street || 'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Town:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.town}
                      onChange={e => handleInputChange('town', e.target.value)}
                      placeholder="Enter Town"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.town || 'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Region:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.region}
                      onChange={e =>
                        handleInputChange('region', e.target.value)
                      }
                      placeholder="Enter Region"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.region || 'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Country:
                  </label>
                  {isEditMode ? (
                    <select
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.country}
                      onChange={e =>
                        handleInputChange('country', e.target.value)
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
                    <div className="w-full text-gray-700">
                      {countries.find(c => c._id === formData.country)?.name ||
                        formData.country ||
                        'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Postal Code:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.postalCode}
                      onChange={e =>
                        handleInputChange('postalCode', e.target.value)
                      }
                      placeholder="Enter Postal Code"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.postalCode || 'Not specified'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <hr className="my-6 w-full border-gray-400" />
            <div className="flex w-full flex-col items-center">
              <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
                Identification
              </h3>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    D.O.B:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.dateOfBirth}
                      onChange={e =>
                        handleInputChange('dateOfBirth', e.target.value)
                      }
                      placeholder="YYYY-MM-DD"
                      type="date"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.dateOfBirth || 'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Type:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.idType}
                      onChange={e =>
                        handleInputChange('idType', e.target.value)
                      }
                      placeholder="Enter ID Type"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.idType || 'Not specified'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Number:
                  </label>
                  {isEditMode ? (
                    <input
                      className="w-full rounded-md border border-border bg-white p-3"
                      value={formData.idNumber}
                      onChange={e =>
                        handleInputChange('idNumber', e.target.value)
                      }
                      placeholder="Enter ID Number"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.idNumber || 'Not specified'}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Notes:
                  </label>
                  {isEditMode ? (
                    <textarea
                      className="min-h-[56px] w-full rounded-md border border-border bg-white p-3"
                      value={formData.notes}
                      onChange={e => handleInputChange('notes', e.target.value)}
                      placeholder="Enter Notes"
                    />
                  ) : (
                    <div className="w-full text-gray-700">
                      {formData.notes || 'No notes'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Roles & Permissions Section */}
            {
              <>
                <hr className="my-6 w-full border-gray-400" />
                <div className="flex w-full flex-col items-center">
                  <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
                    Roles & Permissions
                  </h3>
                  <div className="w-full max-w-3xl space-y-6">
                    {/* Password Section - Only show in edit mode */}
                    {isEditMode && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-base font-medium">
                            Password
                          </label>
                          <Input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            className="mt-1 rounded-md"
                          />
                          {password && (
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
                                      : 'text-orange-600'
                                  }`}
                                >
                                  <span>
                                    {passwordStrength.requirements.special
                                      ? '?'
                                      : '!'}
                                  </span>
                                  <span>Special character</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-base font-medium">
                            Confirm Password
                          </label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className={`mt-1 rounded-md ${
                              confirmPassword &&
                              password &&
                              password !== confirmPassword
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : confirmPassword &&
                                    password &&
                                    password === confirmPassword
                                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                                  : ''
                            }`}
                          />
                          {confirmPassword &&
                            password &&
                            password !== confirmPassword && (
                              <p className="mt-1 text-sm text-red-600">
                                Passwords do not match
                              </p>
                            )}
                          {confirmPassword &&
                            password &&
                            password === confirmPassword && (
                              <p className="mt-1 text-sm text-green-600">
                                Passwords match
                              </p>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Account Status Section - Only show in edit mode */}
                    {isEditMode && (isDeveloper || isAdmin || isManager) && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-base font-medium">
                            Account Status
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <Checkbox
                              id="isEnabled"
                              checked={isEnabled}
                              onCheckedChange={checked =>
                                setIsEnabled(checked === true)
                              }
                              className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                            />
                            <label
                              htmlFor="isEnabled"
                              className="cursor-pointer text-sm font-medium text-gray-900"
                            >
                              Account Enabled
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {isEnabled
                              ? 'User can log in and access the system'
                              : 'User account is disabled and cannot log in'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Roles Section */}
                    <div>
                      <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                        Roles
                      </h4>
                      {isEditMode ? (
                        <div className="grid grid-cols-2 justify-items-center gap-3 md:grid-cols-3 md:gap-4">
                          {availableRoles.map(role => (
                            <div
                              key={role.value}
                              className="flex items-center gap-2"
                            >
                              <label className="flex flex-1 cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                                <Checkbox
                                  id={role.value}
                                  checked={roles.includes(role.value)}
                                  onCheckedChange={checked =>
                                    handleRoleChange(
                                      role.value,
                                      checked === true
                                    )
                                  }
                                  className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                                />
                                {role.label}
                              </label>
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRolePermissionsDialog({
                                    open: true,
                                    role: role.value,
                                    roleLabel: role.label,
                                  });
                                }}
                                className="flex items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600"
                                title={`View pages accessible to ${role.label}`}
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {roles && roles.length > 0 ? (
                            roles.map(roleValue => {
                              const roleOption = ROLE_OPTIONS.find(
                                r => r.value === roleValue
                              );
                              if (!roleOption) return null;
                              return (
                                <div
                                  key={roleValue}
                                  className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1"
                                >
                                  <span className="text-gray-700">
                                    {roleOption.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRolePermissionsDialog({
                                        open: true,
                                        role: roleValue,
                                        roleLabel: roleOption.label,
                                      })
                                    }
                                    className="flex items-center justify-center rounded-full p-0.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-blue-600"
                                    title={`View pages accessible to ${roleOption.label}`}
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-gray-700">
                              No roles assigned
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Licensees and Locations Container */}
                    <div className="mb-6 flex flex-col md:flex-row md:gap-6">
                      {/* Licensees Section */}
                      <div className="mb-6 flex-1 md:mb-0">
                        <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                          Assigned Licensees
                        </h4>

                        {/* For managers and location admins, always show as read-only */}
                        {!canEditLicensees ? (
                          <div className="text-center">
                            <div className="text-gray-700">
                              {allLicenseesSelected
                                ? `All Licensees (${licensees.length} licensees)`
                                : selectedLicenseeIds.length > 0
                                  ? selectedLicenseeIds
                                      .map(
                                        id =>
                                          licensees.find(
                                            l => String(l._id) === String(id)
                                          )?.name
                                      )
                                      .filter(Boolean)
                                      .join(', ')
                                  : 'No licensees assigned'}
                            </div>
                            {isManager && (
                              <p className="mt-2 text-xs italic text-gray-500">
                                Licensee assignments cannot be changed by
                                managers
                              </p>
                            )}
                            {isLocationAdmin && (
                              <p className="mt-2 text-xs italic text-gray-500">
                                Licensee is automatically set to your assigned licensee
                              </p>
                            )}
                          </div>
                        ) : isEditMode ? (
                          <div className="space-y-3">
                            {/* All Licensees Checkbox */}
                            <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                              <Checkbox
                                checked={allLicenseesSelected}
                                onCheckedChange={checked =>
                                  handleAllLicenseesChange(checked === true)
                                }
                                className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                              />
                              All Licensees
                            </label>

                            {!allLicenseesSelected && (
                              <MultiSelectDropdown
                                options={licenseeOptions}
                                selectedIds={selectedLicenseeIds}
                                onChange={handleLicenseeChange}
                                placeholder="Select licensees..."
                                searchPlaceholder="Search licensees..."
                                label="licensees"
                                showSelectAll={true}
                              />
                            )}

                            {allLicenseesSelected && (
                              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                                All {licensees.length} licensees are selected
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-gray-700">
                              {allLicenseesSelected
                                ? `All Licensees (${licensees.length} licensees)`
                                : selectedLicenseeIds.length > 0
                                  ? selectedLicenseeIds
                                      .map(
                                        id =>
                                          licensees.find(
                                            l => String(l._id) === String(id)
                                          )?.name
                                      )
                                      .filter(Boolean)
                                      .join(', ')
                                  : 'No licensees assigned'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Locations Section */}
                      <div className="flex-1">
                        <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                          Allowed Locations
                        </h4>

                        {isEditMode ? (
                          <div className="space-y-3">
                            {/* Warning if no licensees selected */}
                            {!allLicenseesSelected &&
                              selectedLicenseeIds.length === 0 && (
                                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-800">
                                  ⚠️ Please select at least one licensee first
                                  to assign locations
                                </div>
                              )}

                            {/* All Locations Checkbox - only show if licensees are selected */}
                            {(allLicenseesSelected ||
                              selectedLicenseeIds.length > 0) && (
                              <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                                <Checkbox
                                  checked={allLocationsSelected}
                                  onCheckedChange={checked =>
                                    handleAllLocationsChange(checked === true)
                                  }
                                  className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                                />
                                All Locations{' '}
                                {allLicenseesSelected
                                  ? ''
                                  : `for selected licensee${selectedLicenseeIds.length > 1 ? 's' : ''}`}
                              </label>
                            )}

                            {/* Multi-select dropdown */}
                            {!allLocationsSelected &&
                              (allLicenseesSelected ||
                                selectedLicenseeIds.length > 0) && (
                                <MultiSelectDropdown
                                  options={locationOptions}
                                  selectedIds={selectedLocationIds}
                                  onChange={setSelectedLocationIds}
                                  placeholder={
                                    availableLocations.length === 0
                                      ? 'No locations available for selected licensees'
                                      : 'Select locations...'
                                  }
                                  searchPlaceholder="Search locations..."
                                  label="locations"
                                  showSelectAll={true}
                                  disabled={availableLocations.length === 0}
                                />
                              )}

                            {allLocationsSelected && (
                              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                                All {availableLocations.length} available
                                locations are selected
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full">
                            {allLocationsSelected ? (
                              <div className="text-center text-gray-700">
                                All Locations ({locations.length} locations)
                              </div>
                            ) : selectedLocationIds.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                                        Location
                                      </th>
                                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                                        Licensee
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedLocationIds
                                      .map(id => {
                                        const location = locations.find(
                                          l => l._id === id
                                        );
                                        if (!location) return null;

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
                                      .filter(
                                        (
                                          item
                                        ): item is {
                                          locationName: string;
                                          licenseeName: string;
                                        } => item !== null
                                      )
                                      .map((item, index) => (
                                        <tr
                                          key={index}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="border border-gray-300 px-4 py-2 text-gray-700">
                                            {item.locationName}
                                          </td>
                                          <td className="border border-gray-300 px-4 py-2 text-gray-700">
                                            {item.licenseeName}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center text-gray-700">
                                No locations assigned
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            }
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex justify-center gap-4 lg:justify-end">
            {isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 rounded-md px-8 py-3 text-lg font-semibold"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-md bg-button px-8 py-3 text-lg font-semibold text-white hover:bg-buttonActive"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-md px-8 py-3 text-lg font-semibold"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

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

      {/* Role Permissions Dialog */}
      <RolePermissionsDialog
        open={rolePermissionsDialog.open}
        onClose={() =>
          setRolePermissionsDialog({ open: false, role: '', roleLabel: '' })
        }
        role={rolePermissionsDialog.role}
        roleLabel={rolePermissionsDialog.roleLabel}
      />
    </>
  );
}
