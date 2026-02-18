/**
 * Administration Add User Modal Component
 * Comprehensive modal for creating new users with full profile and permissions.
 *
 * @module components/administration/AdministrationAddUserModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Checkbox } from '@/components/shared/ui/checkbox';
import type { MultiSelectOption } from '@/components/shared/ui/common/MultiSelectDropdown';
import MultiSelectDropdown from '@/components/shared/ui/common/MultiSelectDropdown';
import { DateTimePicker } from '@/components/shared/ui/date-time-picker';
import CircleCropModal from '@/components/shared/ui/image/CircleCropModal';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { administrationUtils } from '@/lib/helpers/administration';
import { fetchLicensees } from '@/lib/helpers/client';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { Country, Licensee } from '@/lib/types/common';
import type { LocationSelectItem } from '@/lib/types/location';
import type { AddUserForm } from '@/lib/types/pages';
import {
  getPasswordStrengthLabel,
  isPlaceholderEmail,
  validateEmail,
  validatePasswordStrength,
} from '@/lib/utils/validation';
import defaultAvatar from '@/public/defaultAvatar.svg';
import gsap from 'gsap';
import {
  AlertCircle,
  Camera,
  Info,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AdministrationRolePermissionsDialog } from './AdministrationRolePermissionsDialog';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

// ============================================================================
// Constants
// ============================================================================

const ROLE_OPTIONS = [
  { label: 'Developer', value: 'developer' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Location Admin', value: 'location admin' },
  { label: 'Vault Manager', value: 'vault-manager' },
  { label: 'Technician', value: 'technician' },
  { label: 'Collector', value: 'collector' },
];

type AdministrationAddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

/**
 * Administration Add User Modal
 */
export default function AdministrationAddUserModal({
  open,
  onClose,
  onSuccess,
}: AdministrationAddUserModalProps) {
  const currentUser = useUserStore(state => state.user);
  const currentUserRoles = (currentUser?.roles || []) as string[];
  const isDeveloper = currentUserRoles.includes('developer');
  const isAdmin = currentUserRoles.includes('admin') && !isDeveloper;
  const isManager =
    currentUserRoles.includes('manager') && !isAdmin && !isDeveloper;
  const isLocationAdmin =
    currentUserRoles.includes('location admin') &&
    !isAdmin &&
    !isDeveloper &&
    !isManager;

  // Filter available roles based on creator's permissions
  const availableRoles = useMemo(() => {
    if (isDeveloper) {
      return ROLE_OPTIONS;
    } else if (isAdmin) {
      return ROLE_OPTIONS.filter(role => role.value !== 'developer');
    } else if (isManager) {
      return ROLE_OPTIONS.filter(role =>
        [
          'location admin',
          'technician',
          'collector',
          'vault-manager',
        ].includes(role.value)
      );
    } else if (isLocationAdmin) {
      return ROLE_OPTIONS.filter(role =>
        ['technician', 'collector', 'vault-manager'].includes(
          role.value
        )
      );
    }
    return [];
  }, [isDeveloper, isAdmin, isManager, isLocationAdmin]);

  const currentUserLicenseeIds = useMemo(
    () =>
      (Array.isArray(currentUser?.assignedLicensees)
        ? currentUser.assignedLicensees
        : []
      ).map(id => String(id)),
    [currentUser?.assignedLicensees]
  );

  const currentUserLocationPermissions = useMemo(
    () =>
      (Array.isArray(currentUser?.assignedLocations)
        ? currentUser.assignedLocations
        : []
      ).map(id => String(id)),
    [currentUser?.assignedLocations]
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Account data
  const [accountData, setAccountData] = useState({
    username: '',
    email: '',
  });
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [accountTouched, setAccountTouched] = useState<Record<string, boolean>>({});

  // Profile data
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

  // Password state
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

  // Roles and permissions
  const [roles, setRoles] = useState<string[]>([]);
  const isVaultManagerSelected = roles.includes('vault-manager');
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);
  const [rolePermissionsDialog, setRolePermissionsDialog] = useState<{
    open: boolean;
    role: string;
    roleLabel: string;
  }>({ open: false, role: '', roleLabel: '' });

  // Countries
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // GSAP animation on open
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

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setAccountData({ username: '', email: '' });
      setFormData({
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
      setPassword('');
      setConfirmPassword('');
      setRoles([]);
      setSelectedLicenseeIds([]);
      setAllLicenseesSelected(false);
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
      setAccountErrors({});
      setAccountTouched({});
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

  // Auto-set licensee for location admins
  useEffect(() => {
    if (open && isLocationAdmin && currentUserLicenseeIds.length > 0) {
      setSelectedLicenseeIds(currentUserLicenseeIds);
      setAllLicenseesSelected(false);
    }
  }, [open, isLocationAdmin, currentUserLicenseeIds]);


  // Load licensees
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadLicensees = async () => {
      try {
        const result = await fetchLicensees();
        if (cancelled) return;

        let lics = Array.isArray(result.licensees) ? result.licensees : [];

        // Filter licensees for managers
        if (isManager && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        // Filter licensees for location admins and auto-set
        if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
          if (lics.length > 0 && !cancelled) {
            setSelectedLicenseeIds([String(lics[0]._id)]);
            setAllLicenseesSelected(false);
          }
        }

        // Auto-set for managers with single licensee
        if (isManager && lics.length === 1 && !cancelled) {
          setSelectedLicenseeIds([String(lics[0]._id)]);
          setAllLicenseesSelected(false);
        }

        setLicensees(lics);
      } catch (error) {
        console.error('Error loading licensees:', error);
      }
    };

    void loadLicensees();
    return () => {
      cancelled = true;
    };
  }, [open, isManager, isLocationAdmin, currentUserLicenseeIds]);

  // Load locations
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadLocations = async () => {
      try {
        const response = await fetch(
          '/api/locations?showAll=true&forceAll=true',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (cancelled) return;

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

        // Filter locations for location admins
        if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
          formattedLocs = formattedLocs.filter((loc: LocationSelectItem) =>
            currentUserLocationPermissions.includes(loc._id)
          );
        }

        setLocations(formattedLocs);
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [open, isLocationAdmin, currentUserLocationPermissions]);

  // Load countries
  useEffect(() => {
    if (!open) return;

    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const countriesData = await fetchCountries();
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

    void loadCountries();
  }, [open]);

  // Update password strength
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

  // Debounced username availability check
  useEffect(() => {
    const username = (accountData.username || '').trim();

    if (
      username &&
      username.length >= 3 &&
      accountTouched.username
    ) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const response = await fetch(
            `/api/users/check-username?username=${encodeURIComponent(username)}`
          );
          const data = await response.json();
          if (data.success && data.usernameExists) {
            setAccountErrors(prev => ({
              ...prev,
              username: 'This username is already taken.',
            }));
          } else {
            setAccountErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.username === 'This username is already taken.') {
                delete newErrors.username;
              }
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error checking username:', error);
        } finally {
          setCheckingUsername(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
    setCheckingUsername(false);
    return undefined;
  }, [accountData.username, accountTouched.username]);

  // Debounced email availability check
  useEffect(() => {
    const email = (accountData.email || '').trim();

    if (
      email &&
      validateEmail(email) &&
      accountTouched.email
    ) {
      const timeoutId = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const response = await fetch(
            `/api/users/check-username?email=${encodeURIComponent(email)}`
          );
          const data = await response.json();
          if (data.success && data.emailExists) {
            setAccountErrors(prev => ({
              ...prev,
              email: 'This email address is already registered.',
            }));
          } else {
            setAccountErrors(prev => {
              const newErrors = { ...prev };
              if (
                newErrors.email === 'This email address is already registered.'
              ) {
                delete newErrors.email;
              }
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error checking email:', error);
        } finally {
          setCheckingEmail(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
    setCheckingEmail(false);
    return undefined;
  }, [accountData.email, accountTouched.email]);

  // Form validation
  useEffect(() => {
    const username = (accountData.username || '').trim();
    const email = (accountData.email || '').trim();
    const firstName = (formData.firstName || '').trim();
    const lastName = (formData.lastName || '').trim();
    const town = (formData.town || '').trim();
    const region = (formData.region || '').trim();
    const country = (formData.country || '').trim();
    const idType = (formData.idType || '').trim();
    const idNumber = (formData.idNumber || '').trim();

    const newErrors: Record<string, string> = {};

    // Username validation (matches User model schema)
    if (accountTouched.username && username) {
      if (username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(username)) {
        newErrors.username = 'Username cannot look like an email address.';
      } else if (/^\d{10,}$/.test(username)) {
        newErrors.username = 'Username cannot look like a phone number.';
      } else if (!/^[A-Za-z0-9\s'-]+$/.test(username)) {
        newErrors.username =
          'Username may only contain letters, numbers, spaces, hyphens, and apostrophes.';
      }
    }

    // Email validation
    if (accountTouched.email && email) {
      if (!validateEmail(email)) {
        newErrors.email = 'Please provide a valid email address.';
      } else if (isPlaceholderEmail(email)) {
        newErrors.email =
          'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
      }
    }

    // First name validation (matches User model schema)
    if (firstName && firstName.length > 0) {
      if (firstName.length < 3) {
        newErrors.firstName = 'First name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(firstName)) {
        newErrors.firstName = 'First name cannot look like an email address.';
      } else if (!/^[A-Za-z\s'-]+$/.test(firstName)) {
        newErrors.firstName =
          "First name may only contain letters, spaces, hyphens and apostrophes.";
      }
    }

    // Last name validation (matches User model schema)
    if (lastName && lastName.length > 0) {
      if (lastName.length < 3) {
        newErrors.lastName = 'Last name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(lastName)) {
        newErrors.lastName = 'Last name cannot look like an email address.';
      } else if (!/^[A-Za-z\s'-]+$/.test(lastName)) {
        newErrors.lastName = "Last name may only contain letters, spaces, hyphens and apostrophes.";
      }
    }

    // Town validation (matches User model schema)
    if (town && town.length > 0) {
      if (town.length < 3) {
        newErrors.town =
          'Town must be at least 3 characters and may only contain letters, numbers, spaces, commas, and full stops.';
      } else if (!/^[A-Za-z0-9\s,\.]+$/.test(town)) {
        newErrors.town =
          'Town may only contain letters, numbers, spaces, commas, and full stops.';
      }
    }

    // Region validation (matches User model schema)
    if (region && region.length > 0) {
      if (region.length < 3) {
        newErrors.region =
          'Region must be at least 3 characters and may only contain letters, numbers, spaces, commas, and full stops.';
      } else if (!/^[A-Za-z0-9\s,\.]+$/.test(region)) {
        newErrors.region =
          'Region may only contain letters, numbers, spaces, commas, and full stops.';
      }
    }

    // Country validation (matches User model schema)
    if (country && country.length > 0) {
      if (country.length < 3) {
        newErrors.country =
          'Country must be at least 3 characters and may only contain letters and spaces.';
      } else if (!/^[A-Za-z\s]+$/.test(country)) {
        newErrors.country = 'Country may only contain letters and spaces.';
      }
    }

    // ID Type validation (matches User model schema)
    if (idType && idType.length > 0) {
      if (idType.length < 3) {
        newErrors.idType =
          'ID type must be at least 3 characters and may only contain letters and spaces.';
      } else if (!/^[A-Za-z\s]+$/.test(idType)) {
        newErrors.idType = 'ID type may only contain letters and spaces.';
      }
    }

    // ID Number validation (matches User model schema)
    if (idNumber && idNumber.length > 0) {
      if (idNumber.length < 3) {
        newErrors.idNumber = 'ID number must be at least 3 characters.';
      }
    }

    setAccountErrors(prev => {
      const next = { ...prev };
      // Clear errors for fields managed by this effect
      const managedFields = [
        'username',
        'email',
        'firstName',
        'lastName',
        'town',
        'region',
        'country',
        'idType',
        'idNumber',
      ];
      managedFields.forEach(field => {
        // Only clear if the current error is NOT the async validation error
        if (
          field === 'username' &&
          next[field] === 'This username is already taken.'
        )
          return;
        if (
          field === 'email' &&
          next[field] === 'This email address is already registered.'
        )
          return;
        delete next[field];
      });
      return { ...next, ...newErrors };
    });
  }, [
    accountData.username,
    accountData.email,
    accountTouched,
    formData.firstName,
    formData.lastName,
    formData.town,
    formData.region,
    formData.country,
    formData.idType,
    formData.idNumber,
  ]);

  // Handlers
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
    setAccountTouched(prev => ({ ...prev, [field]: true }));
    if (accountErrors[field]) {
      setAccountErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
    const newRoles = checked ? [...roles, role] : roles.filter(r => r !== role);
    setRoles(newRoles);

    // Enforce single selection if vault-manager is selected
    if (checked && role === 'vault-manager') {
      if (selectedLicenseeIds.length > 1) {
        setSelectedLicenseeIds([selectedLicenseeIds[0]]);
        toast.info(
          'Vault Managers are limited to a single licensee. Assignments have been adjusted.'
        );
      }
      if (selectedLocationIds.length > 1) {
        setSelectedLocationIds([selectedLocationIds[0]]);
        toast.info(
          'Vault Managers are limited to a single location. Assignments have been adjusted.'
        );
      }
      setAllLicenseesSelected(false);
      setAllLocationsSelected(false);
    }
  };

  // Filter locations based on selected licensees
  const availableLocations = useMemo(() => {
    if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
      return locations.filter(loc =>
        currentUserLocationPermissions.includes(loc._id)
      );
    }

    return allLicenseesSelected
      ? locations
      : selectedLicenseeIds.length > 0
        ? locations.filter(
            loc =>
              loc.licenseeId && selectedLicenseeIds.includes(loc.licenseeId)
          )
        : [];
  }, [
    isLocationAdmin,
    currentUserLocationPermissions,
    locations,
    allLicenseesSelected,
    selectedLicenseeIds,
  ]);

  // Sync "all selected" states to prevent Vault Manager restrictions or single-item auto-selection
  useEffect(() => {
    if (!open) return;
    
    if (isVaultManagerSelected) {
      if (allLicenseesSelected) setAllLicenseesSelected(false);
      if (allLocationsSelected) setAllLocationsSelected(false);
    } else {
      // Also ensure "All" is not set if count is 1 or 0
      if (allLicenseesSelected && (licensees.length <= 1 || selectedLicenseeIds.length !== licensees.length)) {
        setAllLicenseesSelected(false);
      }
      if (allLocationsSelected && (availableLocations.length <= 1 || selectedLocationIds.length !== availableLocations.length)) {
        setAllLocationsSelected(false);
      }
    }
  }, [
    open,
    isVaultManagerSelected,
    allLicenseesSelected,
    allLocationsSelected,
    licensees.length,
    availableLocations.length,
    selectedLicenseeIds.length,
    selectedLocationIds.length
  ]);

  const handleAllLocationsChange = (checked: boolean) => {
    if (isVaultManagerSelected && checked) {
      toast.error('Vault Managers cannot be assigned to all locations');
      return;
    }
    setAllLocationsSelected(checked);
    if (checked) {
      setSelectedLocationIds(availableLocations.map(loc => loc._id));
    } else {
      setSelectedLocationIds([]);
    }
  };

  const licenseeOptions: MultiSelectOption[] = licensees.map(lic => ({
    id: String(lic._id),
    label: lic.name,
  }));

  const locationOptions: MultiSelectOption[] = availableLocations.map(loc => ({
    id: loc._id,
    label: loc.name,
  }));

  const handleLicenseeChange = (newSelectedIds: string[]) => {
    let finalIds = newSelectedIds;
    if (isVaultManagerSelected && newSelectedIds.length > 1) {
      finalIds = [newSelectedIds[newSelectedIds.length - 1]];
      toast.info('Vault Managers are limited to a single licensee.');
    }

    setSelectedLicenseeIds(finalIds);
    setAllLicenseesSelected(
      finalIds.length === licensees.length && licensees.length > 1 && !isVaultManagerSelected
    );

    // Filter locations based on selected licensees
    setSelectedLocationIds(prevLocationIds => {
      const validLocationIds = prevLocationIds.filter(locId => {
        const location = locations.find(l => l._id === locId);
        if (!location) return true;
        return (
          location.licenseeId && finalIds.includes(location.licenseeId)
        );
      });

      if (validLocationIds.length !== prevLocationIds.length) {
        const removedCount = prevLocationIds.length - validLocationIds.length;
        toast.info(
          `${removedCount} location${removedCount > 1 ? 's' : ''} removed because ${removedCount > 1 ? "they don't" : "it doesn't"} belong to the selected licensee${finalIds.length > 1 ? 's' : ''}`
        );
      }

      return validLocationIds;
    });
  };

  const handleLocationChange = (newSelectedIds: string[]) => {
    let finalIds = newSelectedIds;
    if (isVaultManagerSelected && newSelectedIds.length > 1) {
      finalIds = [newSelectedIds[newSelectedIds.length - 1]];
      toast.info('Vault Managers are limited to a single location.');
    }
    setSelectedLocationIds(finalIds);
    setAllLocationsSelected(
      finalIds.length === availableLocations.length && availableLocations.length > 1 && !isVaultManagerSelected
    );
  };

  const handleAllLicenseesChange = (checked: boolean) => {
    if (isVaultManagerSelected && checked) {
      toast.error('Vault Managers cannot be assigned to all licensees');
      return;
    }
    setAllLicenseesSelected(checked);
    if (checked) {
      setSelectedLicenseeIds(licensees.map(lic => String(lic._id)));
    } else {
      setSelectedLicenseeIds([]);
      if (selectedLocationIds.length > 0) {
        setSelectedLocationIds([]);
        toast.info('All locations cleared since no licensees are selected');
      }
    }
  };

  const handleSave = async () => {
    // Validate password match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate required fields
    if (!accountData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!accountData.email.trim()) {
      toast.error('Email address is required');
      return;
    }

    if (!validateEmail(accountData.email.trim())) {
      toast.error('Please provide a valid email address');
      return;
    }

    if (isPlaceholderEmail(accountData.email.trim())) {
      toast.error(
        'Please use a real email address. Placeholder emails like example@example.com are not allowed.'
      );
      return;
    }

    if (!password) {
      toast.error('Password is required');
      return;
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      toast.error(
        `Password requirements not met: ${passwordValidation.feedback.join(', ')}`
      );
      return;
    }

    if (roles.length === 0) {
      toast.error('At least one role is required');
      return;
    }

    if (roles.includes('vault-manager')) {
      if (selectedLicenseeIds.length !== 1 || allLicenseesSelected) {
        toast.error('Vault Managers must be assigned to exactly one licensee');
        return;
      }
      if (selectedLocationIds.length !== 1 || allLocationsSelected) {
        toast.error('Vault Managers must be assigned to exactly one location');
        return;
      }
    }

    if (selectedLicenseeIds.length === 0 && !allLicenseesSelected) {
      toast.error('At least one licensee must be assigned');
      return;
    }

    // Validate date of birth (cannot be in future - matches User model schema)
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        toast.error('Date of birth must be a valid date and cannot be in the future.');
        return;
      }
    }

    // Check for validation errors
    if (Object.keys(accountErrors).length > 0 || checkingUsername || checkingEmail) {
      if (checkingUsername || checkingEmail) {
        toast.error('Please wait for username/email validation to complete');
      } else {
        toast.error('Please fix the validation errors before saving');
      }
      return;
    }

    // Build AddUserForm object
    const addUserForm: AddUserForm = {
      username: accountData.username.trim(),
      email: accountData.email.trim(),
      password,
      roles,
      firstName: formData.firstName.trim() || undefined,
      lastName: formData.lastName.trim() || undefined,
      gender: formData.gender.trim() || undefined,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      profilePicture: formData.profilePicture || null,
      licenseeIds: allLicenseesSelected
        ? licensees.map(lic => String(lic._id))
        : selectedLicenseeIds,
      allowedLocations: allLocationsSelected
        ? availableLocations.map(loc => loc._id)
        : selectedLocationIds,
      street: formData.street.trim() || undefined,
      town: formData.town.trim() || undefined,
      region: formData.region.trim() || undefined,
      country: formData.country.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      idType: formData.idType.trim() || undefined,
      idNumber: formData.idNumber.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    setIsLoading(true);
    try {
      await administrationUtils.userManagement.createNewUser(
        addUserForm,
        onClose,
        async () => {
          await onSuccess();
        }
      );
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

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
          className="relative flex h-full w-full flex-col overflow-y-auto bg-gray-50 animate-in lg:max-h-[95vh] lg:max-w-6xl lg:rounded-xl"
          style={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  Create New User
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Create a new user account with profile and permissions
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
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
                        src={formData.profilePicture || defaultAvatar}
                        alt="Avatar"
                        width={140}
                        height={140}
                        className="rounded-full border-4 border-gray-100 bg-gray-50 shadow-sm"
                      />
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md transition-colors hover:bg-blue-700"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-5 w-5 text-white" />
                      </button>
                      {formData.profilePicture && (
                        <button
                          type="button"
                          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow-md transition-colors hover:bg-red-600"
                          onClick={handleRemoveProfilePicture}
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
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

                  {/* Right: Account Details */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Username */}
                      <div>
                        <Label htmlFor="username" className="text-gray-700">
                          Username <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="username"
                            value={accountData.username}
                            onChange={e =>
                              handleAccountInputChange('username', e.target.value)
                            }
                            placeholder="Enter username"
                            className={accountErrors.username ? 'border-red-500' : ''}
                            required
                          />
                          {checkingUsername && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          )}
                          {accountErrors.username && (
                            <p className="mt-1.5 text-sm text-red-600">
                              {accountErrors.username}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="email" className="text-gray-700">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="email"
                            type="email"
                            value={accountData.email}
                            onChange={e =>
                              handleAccountInputChange('email', e.target.value)
                            }
                            placeholder="Enter email address"
                            className={accountErrors.email ? 'border-red-500' : ''}
                            required
                          />
                          {checkingEmail && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          )}
                          {accountErrors.email && (
                            <p className="mt-1.5 text-sm text-red-600">
                              {accountErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <Label htmlFor="password" className="text-gray-700">
                          Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="mt-1 rounded-md"
                          autoComplete="new-password"
                          required
                        />
                        {password && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Strength:</span>
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
                            <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                              <div
                                className={`flex items-center gap-2 ${
                                  passwordStrength.requirements.length
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                <span>
                                  {passwordStrength.requirements.length ? '✓' : '✗'}
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
                                  {passwordStrength.requirements.uppercase ? '✓' : '✗'}
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
                                  {passwordStrength.requirements.lowercase ? '✓' : '✗'}
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
                                  {passwordStrength.requirements.number ? '✓' : '✗'}
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
                                  {passwordStrength.requirements.special ? '✓' : '!'}
                                </span>
                                <span>Special character</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <Label htmlFor="confirmPassword" className="text-gray-700">
                          Confirm Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
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
                          autoComplete="new-password"
                          required
                        />
                        {confirmPassword && password && password !== confirmPassword && (
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Personal details and identification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label htmlFor="firstName" className="text-gray-700">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={e => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                      className={`mt-2 ${accountErrors.firstName ? 'border-red-500' : ''}`}
                    />
                    {accountErrors.firstName && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-gray-700">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={e => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                      className={`mt-2 ${accountErrors.lastName ? 'border-red-500' : ''}`}
                    />
                    {accountErrors.lastName && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.lastName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="gender" className="text-gray-700">
                      Gender
                    </Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={e => handleInputChange('gender', e.target.value)}
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-gray-700">
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={e => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="Enter phone number"
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Physical address information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="street" className="text-gray-700">
                      Street
                    </Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={e => handleInputChange('street', e.target.value)}
                      placeholder="Enter street address"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="town" className="text-gray-700">
                      Town
                    </Label>
                    <Input
                      id="town"
                      value={formData.town}
                      onChange={e => handleInputChange('town', e.target.value)}
                      placeholder="Enter town"
                      className={`mt-2 ${accountErrors.town ? 'border-red-500' : ''}`}
                    />
                    {accountErrors.town && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.town}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="region" className="text-gray-700">
                      Region
                    </Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={e => handleInputChange('region', e.target.value)}
                      placeholder="Enter region"
                      className={`mt-2 ${accountErrors.region ? 'border-red-500' : ''}`}
                    />
                    {accountErrors.region && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.region}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-gray-700">
                      Country
                    </Label>
                    <select
                      id="country"
                      value={formData.country}
                      onChange={e => handleInputChange('country', e.target.value)}
                      className={`mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        accountErrors.country ? 'border-red-500' : ''
                      }`}
                      disabled={countriesLoading}
                    >
                      <option value="">Select country</option>
                      {countries.map(country => (
                        <option key={country._id} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {accountErrors.country && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.country}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="postalCode" className="text-gray-700">
                      Postal Code
                    </Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={e => handleInputChange('postalCode', e.target.value)}
                      placeholder="Enter postal code"
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identification Card */}
            <Card>
              <CardHeader>
                <CardTitle>Identification</CardTitle>
                <CardDescription>Identification documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dateOfBirth" className="text-gray-700">
                      Date of Birth
                    </Label>
                    <div className="mt-2">
                      <DateTimePicker
                        date={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                        setDate={(date) =>
                          handleInputChange(
                            'dateOfBirth',
                            date ? date.toISOString().split('T')[0] : ''
                          )
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="idType" className="text-gray-700">
                      ID Type
                    </Label>
                    <Input
                      id="idType"
                      value={formData.idType}
                      onChange={e => handleInputChange('idType', e.target.value)}
                      placeholder="Enter ID type"
                      className={`mt-2 ${accountErrors.idType ? 'border-red-500' : ''}`}
                    />
                    {accountErrors.idType && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.idType}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="idNumber" className="text-gray-700">
                      ID Number
                    </Label>
                    <Input
                      id="idNumber"
                      value={formData.idNumber}
                      onChange={e => handleInputChange('idNumber', e.target.value)}
                      placeholder="Enter ID number"
                      className={`mt-2 ${accountErrors.idNumber ? 'border-red-500' : ''}`}
                    />
                    {accountErrors.idNumber && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {accountErrors.idNumber}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="notes" className="text-gray-700">
                      Notes
                    </Label>
                    <textarea
                      id="notes"
                      className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.notes}
                      onChange={e => handleInputChange('notes', e.target.value)}
                      placeholder="Enter notes"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles & Permissions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  User roles, licensee assignments, and location access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Licensees and Locations Container */}
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Licensees Section */}
                  <div className="flex flex-col">
                    <Label className="mb-4 text-center text-base font-medium">
                      Assigned Licensees <span className="text-red-500">*</span>
                    </Label>

                    {isLocationAdmin && currentUserLicenseeIds.length === 1 ? (
                      <div className="text-center">
                        <div className="text-gray-700">
                          {licensees.find(
                            l => String(l._id) === currentUserLicenseeIds[0]
                          )?.name || 'No licensee assigned'}
                        </div>
                        <p className="mt-2 text-xs italic text-gray-500">
                          Licensee is automatically set to your assigned licensee
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                          <Checkbox
                            checked={allLicenseesSelected}
                            onCheckedChange={checked =>
                              handleAllLicenseesChange(checked === true)
                            }
                            disabled={(isLocationAdmin && currentUserLicenseeIds.length === 1) || isVaultManagerSelected}
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
                            showSelectAll={!isVaultManagerSelected}
                            disabled={(isLocationAdmin && currentUserLicenseeIds.length === 1) || isVaultManagerSelected}
                          />
                        )}

                        {allLicenseesSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {licensees.length} licensees are selected
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Locations Section */}
                  <div className="flex flex-col">
                    <Label className="mb-4 text-center text-base font-medium">
                      Allowed Locations
                    </Label>

                    {selectedLicenseeIds.length === 0 && !allLicenseesSelected ? (
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-800">
                        ⚠️ Please select at least one licensee first to assign
                        locations
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                           <Checkbox
                            checked={allLocationsSelected}
                            onCheckedChange={checked =>
                              handleAllLocationsChange(checked === true)
                            }
                            disabled={isVaultManagerSelected}
                            className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                          />
                          All Locations
                        </label>

                        {!allLocationsSelected && (
                          <MultiSelectDropdown
                            options={locationOptions}
                            selectedIds={selectedLocationIds}
                             onChange={handleLocationChange}
                            placeholder="Select locations..."
                            searchPlaceholder="Search locations..."
                            label="locations"
                            showSelectAll={!isVaultManagerSelected}
                          />
                        )}

                        {allLocationsSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {availableLocations.length} locations are selected
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px w-full bg-gray-200" />

                {/* Roles Section */}
                <div className={`relative rounded-xl border-2 border-transparent transition-all duration-300 ${(!allLicenseesSelected && selectedLicenseeIds.length === 0) || (!allLocationsSelected && selectedLocationIds.length === 0) ? 'border-dashed border-amber-200 bg-gray-50/50 opacity-60 grayscale' : 'border-solid border-transparent'}`}>
                  {((!allLicenseesSelected && selectedLicenseeIds.length === 0) || (!allLocationsSelected && selectedLocationIds.length === 0)) && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-white/40 p-6 backdrop-blur-[2px]">
                      <div className="group flex flex-col items-center gap-4 rounded-2xl bg-amber-50 px-8 py-6 text-center shadow-xl ring-1 ring-amber-200 transition-transform hover:scale-105">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 ring-8 ring-amber-50">
                          <AlertCircle className="h-8 w-8 animate-pulse text-amber-600" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-amber-900">Action Required</h4>
                          <p className="max-w-[280px] text-sm font-medium leading-relaxed text-amber-700">
                            Please select a <span className="font-bold underline">Licensee</span> and <span className="font-bold underline">Location</span> above to unlock available roles.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Label className="text-base font-bold text-gray-900">
                    Roles <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3 md:gap-x-6">
                    {availableRoles.map(role => {
                      const isVaultManagerRole = role.value === 'vault-manager';
                      const isVMRestricted = isVaultManagerRole && (
                        selectedLicenseeIds.length > 1 || 
                        allLicenseesSelected || 
                        selectedLocationIds.length > 1 || 
                        allLocationsSelected
                      );

                      return (
                        <div key={role.value} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <label className={`flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium transition-colors ${isVMRestricted ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900'}`}>
                              <Checkbox
                                id={role.value}
                                checked={roles.includes(role.value)}
                                onCheckedChange={checked =>
                                  handleRoleChange(role.value, checked === true)
                                }
                                disabled={isVMRestricted}
                                className={`border-2 border-gray-400 text-blue-600 focus:ring-blue-600 ${isVMRestricted ? 'opacity-50' : ''}`}
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
                          {isVMRestricted && (
                            <p className="pl-6 text-[10px] font-bold text-red-600 leading-tight">
                              Vault Managers are limited to 1 Licensee & Location
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {roles.length === 0 && (
                    <p className="mt-2 text-sm text-red-600">
                      At least one role is required
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-w-[100px] gap-2"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  isLoading ||
                  checkingUsername ||
                  checkingEmail ||
                  Object.keys(accountErrors).length > 0 ||
                  roles.length === 0 ||
                  (selectedLicenseeIds.length === 0 && !allLicenseesSelected)
                }
                className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
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
          imageSrc={rawImageSrc || ''}
          onCropped={handleCropComplete}
        />
      )}

      {/* Role Permissions Dialog */}
      <AdministrationRolePermissionsDialog
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

