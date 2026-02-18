/**
 * Administration User Modal Component
 * Comprehensive modal for editing existing users with full profile and permissions.
 *
 * @module components/administration/AdministrationUserModal
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
import { Skeleton } from '@/components/shared/ui/skeleton';
import { fetchLicensees } from '@/lib/helpers/client';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { User } from '@/lib/types/administration';
import type { Country, Licensee } from '@/lib/types/common';
import type { LocationSelectItem } from '@/lib/types/location';
import {
  getPasswordStrengthLabel,
  isPlaceholderEmail,
  validateEmail,
  validatePasswordStrength,
  validatePhoneNumber,
} from '@/lib/utils/validation';
import defaultAvatar from '@/public/defaultAvatar.svg';
import gsap from 'gsap';
import {
  AlertCircle,
  Camera,
  Edit3,
  Info,
  Loader2,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type AdministrationUserModalProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (
    user: Partial<User> & {
      password?: string;
    }
  ) => void;
};

/**
 * Administration User Modal
 */
export default function AdministrationUserModal({
  open,
  onClose,
  user,
  onSave,
}: AdministrationUserModalProps) {
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
  const canEditAccountFields = Boolean(
    currentUser?.roles?.some(role =>
      ['admin', 'developer', 'manager', 'location admin'].includes(role)
    )
  );
  const canEditLicensees = isDeveloper || isAdmin; // Only admins/developers can edit licensee assignments

  const currentUserLicenseeIds = useMemo(
    () =>
      (Array.isArray(currentUser?.assignedLicensees)
        ? currentUser.assignedLicensees
        : []
      ).map(id => String(id)),
    [currentUser?.assignedLicensees]
  );
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  // Filter available roles based on editor's permissions
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
    
    // If we are editing and not one of the above, just return current roles
    if (isEditMode && roles.length > 0) {
      return ROLE_OPTIONS.filter(role => roles.includes(role.value));
    }
    
    return [];
  }, [isDeveloper, isAdmin, isManager, isLocationAdmin, isEditMode, roles]);

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

  // Modal state
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
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>(
    {}
  );
  const [accountTouched, setAccountTouched] = useState<Record<string, boolean>>(
    {}
  );

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
  const isVaultManagerSelected = roles.includes('vault-manager');
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
      phoneNumber:
        (targetUser.profile as { phoneNumber?: string } | undefined)
          ?.phoneNumber ||
        (targetUser.profile as { contact?: { phone?: string } } | undefined)
          ?.contact?.phone ||
        '',
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
    setAccountErrors({});
    setAccountTouched({});

    setRoles(targetUser.roles || []);
    setIsEnabled(targetUser.enabled !== undefined ? targetUser.enabled : true);

    let rawLicenseeIds: string[] = [];
    if (
      Array.isArray(targetUser.assignedLicensees) &&
      targetUser.assignedLicensees.length > 0
    ) {
      rawLicenseeIds = targetUser.assignedLicensees.map(id => String(id));
    }
    rawLicenseeIdsRef.current = rawLicenseeIds;

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
        normalizedLicenseeIds.length > 1 &&
        normalizedLicenseeIds.length === currentLicensees.length &&
        !targetUser.roles?.includes('vault-manager');
      setAllLicenseesSelected(shouldSelectAll);
    } else {
      setSelectedLicenseeIds(prev =>
        arraysEqual(prev, rawLicenseeIds) ? prev : rawLicenseeIds
      );
      setAllLicenseesSelected(false);
    }
  }, []);

  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      const userId = user._id;

      if (currentUserIdRef.current !== userId) {
        currentUserIdRef.current = userId;
        hasInitializedLocationsFromUserRef.current = false;
        hasInitializedLicenseesFromLocationsRef.current = false;
        setIsLoading(false);
        hydrateFormFromUser(user);
      }
    } else if (open) {
      currentUserIdRef.current = null;
      setIsLoading(true);

      if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
        setSelectedLicenseeIds(currentUserLicenseeIds);
        setAllLicenseesSelected(false);
      }
    }
  }, [
    user,
    open,
    hydrateFormFromUser,
    isLocationAdmin,
    currentUserLicenseeIds,
  ]);

  const hasLoadedLocationsRef = useRef(false);
  const hasInitializedLocationsFromUserRef = useRef(false);
  const hasInitializedLicenseesFromLocationsRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasLoadedLocationsRef.current = false;
      hasInitializedLocationsFromUserRef.current = false;
      hasInitializedLicenseesFromLocationsRef.current = false;
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
      setCheckingUsername(false);
      setCheckingEmail(false);
      setAccountErrors({});
      setAccountTouched({});
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (hasLoadedLocationsRef.current) {
      return;
    }

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

        const currentIsLocationAdmin = isLocationAdmin;
        const currentLocationPermissions = currentUserLocationPermissions;
        if (currentIsLocationAdmin && currentLocationPermissions.length > 0) {
          formattedLocs = formattedLocs.filter((loc: LocationSelectItem) =>
            currentLocationPermissions.includes(loc._id)
          );
        }

        setLocations(formattedLocs);
        hasLoadedLocationsRef.current = true;
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [open, isLocationAdmin, currentUserLocationPermissions]);

  const lastUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
      lastUserIdRef.current = undefined;
      return;
    }

    if (!user) {
      return;
    }

    if (lastUserIdRef.current !== user._id) {
      hasInitializedLocationsFromUserRef.current = false;
      hasInitializedLicenseesFromLocationsRef.current = false;
      lastUserIdRef.current = user._id;
    }

    if (locations.length === 0) {
      return;
    }

    if (licensees.length === 0) {
      return;
    }

    let userLocationIds: string[] = [];
    if (
      Array.isArray(user.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      userLocationIds = user.assignedLocations.map(id => String(id).trim());
    }

    if (!hasInitializedLocationsFromUserRef.current) {
      if (userLocationIds.length > 0) {
        const validLocationIds = userLocationIds.filter(locId => {
          const normalizedLocId = String(locId).trim();
          return locations.some(
            (loc: LocationSelectItem) =>
              String(loc._id).trim() === normalizedLocId
          );
        });

        if (
          validLocationIds.length > 0 &&
          licensees.length > 0 &&
          !hasInitializedLicenseesFromLocationsRef.current
        ) {
          const locationLicenseeIds = new Set<string>();
          validLocationIds.forEach(locId => {
            const location = locations.find(
              (loc: LocationSelectItem) =>
                String(loc._id).trim() === String(locId).trim()
            );
            if (location?.licenseeId) {
              locationLicenseeIds.add(String(location.licenseeId));
            }
          });

          if (locationLicenseeIds.size > 0) {
            const licenseeIdsArray = Array.from(locationLicenseeIds);
            setSelectedLicenseeIds(prevSelectedLicenseeIds => {
              const missingLicenseeIds = licenseeIdsArray.filter(
                licId => !prevSelectedLicenseeIds.includes(licId)
              );

              if (missingLicenseeIds.length > 0) {
                const newSelectedLicenseeIds = [
                  ...prevSelectedLicenseeIds,
                  ...missingLicenseeIds,
                ];
                const allLicenseeIds = licensees.map(lic => String(lic._id));
                setAllLicenseesSelected(
                  newSelectedLicenseeIds.length === allLicenseeIds.length &&
                    allLicenseeIds.every(id =>
                      newSelectedLicenseeIds.includes(id)
                    )
                );
                return newSelectedLicenseeIds;
              }
              return prevSelectedLicenseeIds;
            });
          }
          hasInitializedLicenseesFromLocationsRef.current = true;
        }

        setSelectedLocationIds(userLocationIds);
        setAllLocationsSelected(
          validLocationIds.length > 1 &&
            validLocationIds.length === locations.length &&
            !roles.includes('vault-manager')
        );
        hasInitializedLocationsFromUserRef.current = true;
      } else {
        setSelectedLocationIds([]);
        setAllLocationsSelected(false);
        hasInitializedLocationsFromUserRef.current = true;
      }
    }
  }, [open, user, locations, licensees, roles]);

  const hasLoadedLicenseesRef = useRef(false);
  const selectedLicenseeIdsRef = useRef<string[]>([]);

  useEffect(() => {
    selectedLicenseeIdsRef.current = selectedLicenseeIds;
  }, [selectedLicenseeIds]);

  useEffect(() => {
    if (!open) {
      hasLoadedLicenseesRef.current = false;
      return;
    }

    if (hasLoadedLicenseesRef.current) {
      return;
    }

    let cancelled = false;

    const loadLicensees = async () => {
      try {
        const result = await fetchLicensees();
        if (cancelled) return;

        hasLoadedLicenseesRef.current = true;

        let lics = Array.isArray(result.licensees) ? result.licensees : [];

        if (isManager && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
          const currentSelectedIds = selectedLicenseeIdsRef.current;
          if (lics.length > 0 && currentSelectedIds.length === 0) {
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
          normalizedLicenseeIds.length > 1 &&
          normalizedLicenseeIds.length === lics.length &&
          !roles.includes('vault-manager');
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
  }, [open, isManager, isLocationAdmin, currentUserLicenseeIds, roles]);


  useEffect(() => {
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

  useEffect(() => {
    if (!user?._id || !isEditMode || !canEditAccountFields) {
      return undefined;
    }

    const username = (accountData.username || '').trim();
    const originalUsername = (user.username || '').trim();

    if (
      username &&
      username.length >= 3 &&
      username !== originalUsername &&
      accountTouched.username
    ) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const response = await fetch(
            `/api/users/check-username?username=${encodeURIComponent(username)}&excludeId=${encodeURIComponent(user._id)}`
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
  }, [
    accountData.username,
    accountTouched.username,
    user?._id,
    user?.username,
    isEditMode,
    canEditAccountFields,
  ]);

  useEffect(() => {
    if (!user?._id || !isEditMode || !canEditAccountFields) {
      return undefined;
    }

    const email = (accountData.email || '').trim();
    const originalEmail = (user.email || user.emailAddress || '').trim();

    if (
      email &&
      validateEmail(email) &&
      email !== originalEmail &&
      accountTouched.email
    ) {
      const timeoutId = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const response = await fetch(
            `/api/users/check-username?email=${encodeURIComponent(email)}&excludeId=${encodeURIComponent(user._id)}`
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
  }, [
    accountData.email,
    accountTouched.email,
    user?._id,
    user?.email,
    user?.emailAddress,
    isEditMode,
    canEditAccountFields,
  ]);

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
          'First name may only contain letters, spaces, hyphens and apostrophes.';
      }
    }

    // Last name validation (matches User model schema)
    if (lastName && lastName.length > 0) {
      if (lastName.length < 3) {
        newErrors.lastName = 'Last name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(lastName)) {
        newErrors.lastName = 'Last name cannot look like an email address.';
      } else if (!/^[A-Za-z\s'-]+$/.test(lastName)) {
        newErrors.lastName =
          'Last name may only contain letters, spaces, hyphens and apostrophes.';
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

    setSelectedLocationIds(prevLocationIds => {
      const validLocationIds = prevLocationIds.filter(locId => {
        const location = locations.find(l => l._id === locId);
        if (!location) {
          return true;
        }
        const belongsToSelectedLicensee =
          location.licenseeId && finalIds.includes(location.licenseeId);
        return belongsToSelectedLicensee;
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

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!user) {
      toast.error('No user selected for update');
      return;
    }

    const updatedUsername = canEditAccountFields
      ? accountData.username.trim()
      : user.username;

    const baseEmail = (user.email || user.emailAddress || '').trim();

    const accountEmailTrimmed = accountData.email?.trim() || '';
    const updatedEmail =
      canEditAccountFields && accountEmailTrimmed
        ? accountEmailTrimmed
        : baseEmail;

    // Synchronous Validation
    const validationErrors: Record<string, string> = { ...accountErrors };
    
    // Username Sync Validation
    if (updatedUsername) {
      if (updatedUsername.length < 3) {
        validationErrors.username = 'Username must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(updatedUsername)) {
        validationErrors.username = 'Username cannot look like an email address.';
      } else if (/^\d{10,}$/.test(updatedUsername)) {
        validationErrors.username = 'Username cannot look like a phone number.';
      } else if (!/^[A-Za-z0-9\s'-]+$/.test(updatedUsername)) {
        validationErrors.username = 'Username may only contain letters, numbers, spaces, hyphens, and apostrophes.';
      }
    }

    // First Name Sync Validation
    const firstName = (formData.firstName || '').trim();
    if (firstName) {
      if (firstName.length < 3) {
        validationErrors.firstName = 'First name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(firstName)) {
        validationErrors.firstName = 'First name cannot look like an email address.';
      } else if (!/^[A-Za-z\s'-]+$/.test(firstName)) {
        validationErrors.firstName = 'First name may only contain letters, spaces, hyphens and apostrophes.';
      }
    }

    // Last Name Sync Validation
    const lastName = (formData.lastName || '').trim();
    if (lastName) {
      if (lastName.length < 3) {
        validationErrors.lastName = 'Last name must be at least 3 characters.';
      } else if (EMAIL_REGEX.test(lastName)) {
        validationErrors.lastName = 'Last name cannot look like an email address.';
      } else if (!/^[A-Za-z\s'-]+$/.test(lastName)) {
        validationErrors.lastName = 'Last name may only contain letters, spaces, hyphens and apostrophes.';
      }
    }

    // Address Sync Validation
    const town = (formData.town || '').trim();
    if (town) {
      if (town.length < 3) {
        validationErrors.town = 'Town must be at least 3 characters.';
      } else if (!/^[A-Za-z0-9\s,\.]+$/.test(town)) {
        validationErrors.town = 'Town may only contain letters, numbers, spaces, commas, and full stops.';
      }
    }

    const region = (formData.region || '').trim();
    if (region) {
      if (region.length < 3) {
        validationErrors.region = 'Region must be at least 3 characters.';
      } else if (!/^[A-Za-z0-9\s,\.]+$/.test(region)) {
        validationErrors.region = 'Region may only contain letters, numbers, spaces, commas, and full stops.';
      }
    }

    const country = (formData.country || '').trim();
    if (country) {
       // Check if it's a country ID (MongoDB ObjectId-like) or name
       // The form usually stores ID in formData.country if selected from dropdown
       const isCountryId = /^[0-9a-fA-F]{24}$/.test(country);
       if (!isCountryId) {
          if (country.length < 3) {
            validationErrors.country = 'Country must be at least 3 characters.';
          } else if (!/^[A-Za-z\s]+$/.test(country)) {
            validationErrors.country = 'Country may only contain letters and spaces.';
          }
       }
    }
    
    // ID Sync Validation
    const idType = (formData.idType || '').trim();
    if (idType) {
      if (idType.length < 3) {
        validationErrors.idType = 'ID type must be at least 3 characters.';
      } else if (!/^[A-Za-z\s]+$/.test(idType)) {
        validationErrors.idType = 'ID type may only contain letters and spaces.';
      }
    }

    const idNumber = (formData.idNumber || '').trim();
    if (idNumber && idNumber.length < 3) {
        validationErrors.idNumber = 'ID number must be at least 3 characters.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setAccountErrors(prev => ({ ...prev, ...validationErrors }));
      toast.error('Please fix the validation errors before saving');
      return;
    }

    if (!updatedUsername) {
      toast.error('Username is required');
      return;
    }

    if (canEditAccountFields && !updatedEmail) {
      toast.error('Email address is required');
      return;
    }

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

    const hasChanged = (
      newValue: string,
      existingValue: string | undefined | null
    ): boolean => {
      const newTrimmed = (newValue || '').trim();
      const existingTrimmed = (existingValue || '').toString().trim();

      if (!newTrimmed && !existingTrimmed) {
        return false;
      }

      return newTrimmed !== existingTrimmed;
    };

    const profileUpdate: Record<string, unknown> = {};
    const existingProfile = user?.profile || {};

    if (hasChanged(formData.firstName, existingProfile.firstName)) {
      profileUpdate.firstName = formData.firstName.trim() || undefined;
    }
    if (hasChanged(formData.lastName, existingProfile.lastName)) {
      profileUpdate.lastName = formData.lastName.trim() || undefined;
    }
    if (hasChanged(formData.gender, existingProfile.gender)) {
      profileUpdate.gender = formData.gender.trim() || undefined;
    }
    if (
      hasChanged(
        formData.phoneNumber,
        (existingProfile as { phoneNumber?: string }).phoneNumber
      )
    ) {
      const trimmedPhone = formData.phoneNumber.trim();
      if (trimmedPhone && !validatePhoneNumber(trimmedPhone)) {
        toast.error(
          'Please enter a valid phone number (7-20 digits, spaces, hyphens, parentheses, optional leading +)'
        );
        return;
      }
      profileUpdate.phoneNumber = trimmedPhone || undefined;
    }

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

    if (Object.keys(addressUpdate).length > 0) {
      profileUpdate.address = {
        ...existingAddress,
        ...addressUpdate,
      };
    }

    const identificationUpdate: Record<string, unknown> = {};
    const existingIdentification = existingProfile.identification || {};

    const existingDob = existingIdentification.dateOfBirth
      ? typeof existingIdentification.dateOfBirth === 'string'
        ? existingIdentification.dateOfBirth.split('T')[0]
        : new Date(existingIdentification.dateOfBirth as Date)
            .toISOString()
            .split('T')[0]
      : '';
    const newDob = (formData.dateOfBirth || '').trim();

    if (newDob !== existingDob && (newDob || existingDob)) {
      identificationUpdate.dateOfBirth = newDob || undefined;
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

    if (Object.keys(identificationUpdate).length > 0) {
      profileUpdate.identification = {
        ...existingIdentification,
        ...identificationUpdate,
      };
    }

    let oldLocationIds: string[] = [];
    if (
      Array.isArray(user?.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      oldLocationIds = user.assignedLocations.map(id => String(id));
    }
    const newLocationIds = selectedLocationIds.map(id => String(id));

    const oldLocationIdsSorted = [...oldLocationIds].sort();
    const newLocationIdsSorted = [...newLocationIds].sort();

    const locationIdsChanged =
      oldLocationIdsSorted.length !== newLocationIdsSorted.length ||
      !oldLocationIdsSorted.every(
        (id, idx) => id === newLocationIdsSorted[idx]
      );

    let oldLicenseeIds: string[] = [];
    if (
      Array.isArray(user?.assignedLicensees) &&
      user.assignedLicensees.length > 0
    ) {
      oldLicenseeIds = user.assignedLicensees.map(id => String(id));
    }
    const newLicenseeIds = selectedLicenseeIds.map(id => String(id));

    const oldLicenseeIdsSorted = [...oldLicenseeIds].sort();
    const newLicenseeIdsSorted = [...newLicenseeIds].sort();

    const licenseeIdsChanged =
      oldLicenseeIdsSorted.length !== newLicenseeIdsSorted.length ||
      !oldLicenseeIdsSorted.every(
        (id, idx) => id === newLicenseeIdsSorted[idx]
      );

    if (isManager && licenseeIdsChanged) {
      toast.error('Managers cannot change licensee assignments');
      return;
    }

    const originalEmail = (user.email || user.emailAddress || '')
      .trim()
      .toLowerCase();
    const newEmail = updatedEmail.trim().toLowerCase();
    const usernameChanged = user.username !== updatedUsername;
    const emailChanged = originalEmail !== newEmail;

    const originalRoles = (user.roles || [])
      .map(r => String(r).trim().toLowerCase())
      .sort();
    const newRoles = (roles || [])
      .map(r => String(r).trim().toLowerCase())
      .sort();
    const rolesChanged =
      originalRoles.length !== newRoles.length ||
      !originalRoles.every((role, idx) => role === newRoles[idx]);

    const updatedUser: Partial<User> & {
      password?: string;
      isEnabled?: boolean;
    } = {
      _id: user._id,
    };

    if (usernameChanged) {
      updatedUser.username = updatedUsername;
    }

    if (canEditAccountFields && emailChanged) {
      if (updatedEmail && updatedEmail.trim()) {
        updatedUser.email = updatedEmail.trim();
        updatedUser.emailAddress = updatedEmail.trim();
      } else {
        toast.error('Email address cannot be empty');
        return;
      }
    }

    if (rolesChanged) {
      updatedUser.roles = roles;
    }

    if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
      const currentUserLicenseeIdsSorted = [...currentUserLicenseeIds].sort();
      const oldLicenseeIdsSortedForLocationAdmin = [...oldLicenseeIds].sort();
      const locationAdminLicenseeChanged =
        currentUserLicenseeIdsSorted.length !==
          oldLicenseeIdsSortedForLocationAdmin.length ||
        !currentUserLicenseeIdsSorted.every(
          (id, idx) => id === oldLicenseeIdsSortedForLocationAdmin[idx]
        );

      if (locationAdminLicenseeChanged) {
        updatedUser.assignedLicensees = currentUserLicenseeIds;
      }
    } else if (licenseeIdsChanged && !isManager && !isLocationAdmin) {
      updatedUser.assignedLicensees = selectedLicenseeIds;
    }

    if (locationIdsChanged) {
      updatedUser.assignedLocations = selectedLocationIds;
    }

    if (Object.keys(profileUpdate).length > 0) {
      updatedUser.profile = {
        ...existingProfile,
        ...profileUpdate,
      } as typeof user.profile;
    }

    const existingProfilePic = (user?.profilePicture || '').trim();
    const newProfilePic = (formData.profilePicture || '').trim();
    if (existingProfilePic !== newProfilePic) {
      updatedUser.profilePicture = newProfilePic || null;
    }

    if (password) {
      updatedUser.password = password;
    }

    if ((isDeveloper || isAdmin || isManager) && user.enabled !== isEnabled) {
      updatedUser.isEnabled = isEnabled;
    }

    if (updatedEmail && !/\S+@\S+\.\S+/.test(updatedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

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

    const meaningfulChanges: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
      path: string;
    }> = [];

    if (usernameChanged) {
      meaningfulChanges.push({
        field: 'username',
        oldValue: user.username,
        newValue: updatedUsername,
        path: 'username',
      });
    }

    if (emailChanged) {
      meaningfulChanges.push({
        field: 'email',
        oldValue: user.email || null,
        newValue: updatedEmail,
        path: 'email',
      });
      meaningfulChanges.push({
        field: 'emailAddress',
        oldValue: user.emailAddress || user.email || null,
        newValue: updatedEmail,
        path: 'emailAddress',
      });
    }

    if (rolesChanged) {
      meaningfulChanges.push({
        field: 'roles',
        oldValue: user.roles,
        newValue: roles,
        path: 'roles',
      });
    }

    if (locationIdsChanged) {
      meaningfulChanges.push({
        field: 'assignedLocations',
        oldValue: oldLocationIds,
        newValue: newLocationIds,
        path: 'assignedLocations',
      });
    }

    if (licenseeIdsChanged && !isManager) {
      meaningfulChanges.push({
        field: 'assignedLicensees',
        oldValue: oldLicenseeIds,
        newValue: newLicenseeIds,
        path: 'assignedLicensees',
      });
    }

    if (Object.keys(profileUpdate).length > 0) {
      meaningfulChanges.push({
        field: 'profile',
        oldValue: user.profile,
        newValue: profileUpdate,
        path: 'profile',
      });
    }

    if (password) {
      meaningfulChanges.push({
        field: 'password',
        oldValue: '(hidden)',
        newValue: '(hidden)',
        path: 'password',
      });
    }

    if ((isDeveloper || isAdmin || isManager) && user.enabled !== isEnabled) {
      meaningfulChanges.push({
        field: 'isEnabled',
        oldValue: user.enabled,
        newValue: isEnabled,
        path: 'isEnabled',
      });
    }

    if (existingProfilePic !== newProfilePic) {
      meaningfulChanges.push({
        field: 'profilePicture',
        oldValue: existingProfilePic || '(none)',
        newValue: newProfilePic || '(none)',
        path: 'profilePicture',
      });
    }

    const hasAnyChanges =
      Object.keys(updatedUser).filter(key => key !== '_id').length > 0 ||
      meaningfulChanges.length > 0 ||
      locationIdsChanged ||
      licenseeIdsChanged;

    if (!hasAnyChanges) {
      toast.info('No changes detected');
      return;
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
          className="relative flex h-full w-full flex-col overflow-y-auto bg-gray-50 animate-in lg:max-h-[95vh] lg:max-w-6xl lg:rounded-xl"
          style={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  {isEditMode ? 'Edit User' : 'User Profile'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {isEditMode
                    ? 'Update user information and permissions'
                    : `Viewing ${user?.username || 'user'}'s profile`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <Button
                    onClick={handleEnterEdit}
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
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
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Basic account information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                  <div className="flex flex-col items-center lg:items-start">
                    <div className="relative">
                      <Image
                        src={
                          formData.profilePicture ||
                          user.profilePicture ||
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
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Camera className="h-5 w-5 text-white" />
                          </button>
                          {(formData.profilePicture || user.profilePicture) && (
                            <button
                              type="button"
                              className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow-md transition-colors hover:bg-red-600"
                              onClick={handleRemoveProfilePicture}
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col items-center gap-1 lg:items-start">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user?.username || 'User'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {accountData.email || user?.emailAddress || 'No email'}
                      </p>
                      {!isEditMode && (isDeveloper || isAdmin || isManager) && (
                        <span
                          className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            isEnabled
                              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                          }`}
                        >
                          {isEnabled ? 'Active' : 'Disabled'}
                        </span>
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

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="username" className="text-gray-700">
                          Username
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode && canEditAccountFields ? (
                          <div className="relative mt-2">
                            <Input
                              id="username"
                              value={accountData.username}
                              onChange={e =>
                                handleAccountInputChange(
                                  'username',
                                  e.target.value
                                )
                              }
                              placeholder="Enter username"
                              className={
                                accountErrors.username ? 'border-red-500' : ''
                              }
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
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {accountData.username || 'Not specified'}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-gray-700">
                          Email Address
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode && canEditAccountFields ? (
                          <div className="relative mt-2">
                            <Input
                              id="email"
                              type="email"
                              value={accountData.email}
                              onChange={e =>
                                handleAccountInputChange(
                                  'email',
                                  e.target.value
                                )
                              }
                              placeholder="Enter email address"
                              className={
                                accountErrors.email ? 'border-red-500' : ''
                              }
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
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {accountData.email || 'Not specified'}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-gray-700">
                          Phone Number
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={e =>
                              handleInputChange('phoneNumber', e.target.value)
                            }
                            placeholder="Enter phone number"
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.phoneNumber || 'Not specified'}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="gender" className="text-gray-700">
                          Gender
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <select
                            id="gender"
                            className="mt-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.gender}
                            onChange={e =>
                              handleInputChange('gender', e.target.value)
                            }
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.gender
                              ? formData.gender.charAt(0).toUpperCase() +
                                formData.gender.slice(1)
                              : 'Not specified'}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="firstName" className="text-gray-700">
                          First Name
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={e =>
                                handleInputChange('firstName', e.target.value)
                              }
                              placeholder="Enter first name"
                              className={`mt-2 ${
                                accountErrors.firstName ? 'border-red-500' : ''
                              }`}
                            />
                            {accountErrors.firstName && (
                              <p className="mt-1.5 text-sm text-red-600">
                                {accountErrors.firstName}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.firstName || 'Not specified'}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="lastName" className="text-gray-700">
                          Last Name
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={e =>
                                handleInputChange('lastName', e.target.value)
                              }
                              placeholder="Enter last name"
                              className={`mt-2 ${
                                accountErrors.lastName ? 'border-red-500' : ''
                              }`}
                            />
                            {accountErrors.lastName && (
                              <p className="mt-1.5 text-sm text-red-600">
                                {accountErrors.lastName}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                            {formData.lastName || 'Not specified'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  Licensee and location access permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="mb-4">
                      <Label className="text-base font-medium text-gray-900">
                        Assigned Licensees
                      </Label>
                      <p className="mt-1 text-sm text-gray-500">
                        Licensees this user has access to
                      </p>
                    </div>

                    {!canEditLicensees ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-900">
                          {allLicenseesSelected
                            ? licensees.length === 1
                              ? licensees[0]?.name || 'Unknown Licensee'
                              : `All Licensees (${licensees.length} licensees)`
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
                        </p>
                        {isManager && (
                          <p className="mt-2 text-xs text-gray-500">
                            Cannot be changed by managers
                          </p>
                        )}
                        {isLocationAdmin && (
                          <p className="mt-2 text-xs text-gray-500">
                            Automatically set to your assigned licensee
                          </p>
                        )}
                      </div>
                    ) : isEditMode ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <Checkbox
                            id="allLicensees"
                            checked={allLicenseesSelected}
                            onCheckedChange={checked =>
                              handleAllLicenseesChange(checked === true)
                            }
                            disabled={!canEditLicensees || isVaultManagerSelected}
                          />
                          <Label
                            htmlFor="allLicensees"
                            className="cursor-pointer text-sm font-medium text-gray-900"
                          >
                            All Licensees
                          </Label>
                        </div>

                        {!allLicenseesSelected && (
                          <MultiSelectDropdown
                            options={licenseeOptions}
                            selectedIds={selectedLicenseeIds}
                            onChange={handleLicenseeChange}
                            placeholder="Select licensees..."
                            searchPlaceholder="Search licensees..."
                            label="licensees"
                            showSelectAll={!isVaultManagerSelected}
                          />
                        )}

                        {allLicenseesSelected && (
                          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            All {licensees.length} licensees selected
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {allLicenseesSelected
                          ? licensees.map(l => (
                              <span
                                key={l._id}
                                className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                              >
                                {l.name}
                              </span>
                            ))
                          : selectedLicenseeIds.length > 0
                            ? selectedLicenseeIds
                                .map(id => {
                                  const licensee = licensees.find(
                                    l => String(l._id) === String(id)
                                  );
                                  return licensee ? (
                                    <span
                                      key={id}
                                      className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                    >
                                      {licensee.name}
                                    </span>
                                  ) : null;
                                })
                                .filter(Boolean)
                            : null}
                        {selectedLicenseeIds.length === 0 &&
                          !allLicenseesSelected && (
                            <p className="text-sm text-gray-500">
                              No licensees assigned
                            </p>
                          )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-4">
                      <Label className="text-base font-medium text-gray-900">
                        Allowed Locations
                      </Label>
                      <p className="mt-1 text-sm text-gray-500">
                        Specific locations this user can access
                      </p>
                    </div>

                    {isEditMode ? (
                      <div className="space-y-3">
                        {!allLicenseesSelected &&
                          selectedLicenseeIds.length === 0 && (
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-800">
                              ⚠️ Please select at least one licensee first to
                              assign locations
                            </div>
                          )}

                        {(allLicenseesSelected ||
                          selectedLicenseeIds.length > 0) && (
                          <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                            <Checkbox
                              checked={allLocationsSelected}
                              onCheckedChange={checked =>
                                handleAllLocationsChange(checked === true)
                              }
                              disabled={isVaultManagerSelected}
                              className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                            />
                            All Locations{' '}
                            {allLicenseesSelected
                              ? ''
                              : `for selected licensee${selectedLicenseeIds.length > 1 ? 's' : ''}`}
                          </label>
                        )}

                        {!allLocationsSelected &&
                          (allLicenseesSelected ||
                            selectedLicenseeIds.length > 0) && (
                            <MultiSelectDropdown
                              key={`locations-${selectedLocationIds.join(',')}-${selectedLicenseeIds.join(',')}-${user?._id || 'no-user'}`}
                              options={locationOptions}
                              selectedIds={selectedLocationIds.filter(id =>
                                locationOptions.some(opt => opt.id === id)
                              )}
                               onChange={handleLocationChange}
                              placeholder={
                                availableLocations.length === 0
                                  ? 'No locations available for selected licensees'
                                  : 'Select locations...'
                              }
                              searchPlaceholder="Search locations..."
                              label="locations"
                              showSelectAll={!isVaultManagerSelected}
                              disabled={availableLocations.length === 0}
                            />
                          )}

                        {allLocationsSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {availableLocations.length} available locations
                            are selected
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full">
                        {allLocationsSelected ? (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm text-gray-900">
                              All Locations ({locations.length} locations)
                            </p>
                          </div>
                        ) : selectedLocationIds.length > 0 ? (
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
                                  {selectedLocationIds
                                    .map(id => {
                                      const location = locations.find(
                                        l =>
                                          String(l._id).trim() ===
                                          String(id).trim()
                                      );
                                      if (!location) {
                                        return (
                                          <tr key={id}>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                              {id} (Not loaded)
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">
                                              -
                                            </td>
                                          </tr>
                                        );
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
                                        className="transition-colors hover:bg-gray-50"
                                      >
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                          {item.locationName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {item.licenseeName}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                            <p className="text-sm text-gray-500">
                              No locations assigned
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                        value={formData.street}
                        onChange={e =>
                          handleInputChange('street', e.target.value)
                        }
                        placeholder="Enter street address"
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.street || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="town" className="text-gray-700">
                      Town
                    </Label>
                    {isEditMode ? (
                      <>
                        <Input
                          id="town"
                          value={formData.town}
                          onChange={e =>
                            handleInputChange('town', e.target.value)
                          }
                          placeholder="Enter town"
                          className={`mt-2 ${
                            accountErrors.town ? 'border-red-500' : ''
                          }`}
                        />
                        {accountErrors.town && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {accountErrors.town}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.town || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="region" className="text-gray-700">
                      Region
                    </Label>
                    {isEditMode ? (
                      <>
                        <Input
                          id="region"
                          value={formData.region}
                          onChange={e =>
                            handleInputChange('region', e.target.value)
                          }
                          placeholder="Enter region"
                          className={`mt-2 ${
                            accountErrors.region ? 'border-red-500' : ''
                          }`}
                        />
                        {accountErrors.region && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {accountErrors.region}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.region || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-gray-700">
                      Country
                    </Label>
                    {isEditMode ? (
                      <>
                        <select
                          id="country"
                          className={`mt-2 flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                            accountErrors.country
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                          value={formData.country}
                          onChange={e =>
                            handleInputChange('country', e.target.value)
                          }
                        >
                          <option value="">Select country</option>
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
                        {accountErrors.country && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {accountErrors.country}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {countries.find(c => c._id === formData.country)
                          ?.name ||
                          formData.country ||
                          'Not specified'}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="postalCode" className="text-gray-700">
                      Postal Code
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={e =>
                          handleInputChange('postalCode', e.target.value)
                        }
                        placeholder="Enter postal code"
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.postalCode || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <Label htmlFor="dateOfBirth" className="text-gray-700">
                      Date of Birth
                    </Label>
                    {isEditMode ? (
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
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.dateOfBirth
                          ? new Date(formData.dateOfBirth).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }
                            )
                          : 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="idType" className="text-gray-700">
                      ID Type
                    </Label>
                    {isEditMode ? (
                      <>
                        <Input
                          id="idType"
                          value={formData.idType}
                          onChange={e =>
                            handleInputChange('idType', e.target.value)
                          }
                          placeholder="Enter ID type"
                          className={`mt-2 ${
                            accountErrors.idType ? 'border-red-500' : ''
                          }`}
                        />
                        {accountErrors.idType && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {accountErrors.idType}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.idType || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="idNumber" className="text-gray-700">
                      ID Number
                    </Label>
                    {isEditMode ? (
                      <>
                        <Input
                          id="idNumber"
                          value={formData.idNumber}
                          onChange={e =>
                            handleInputChange('idNumber', e.target.value)
                          }
                          placeholder="Enter ID number"
                          className={`mt-2 ${
                            accountErrors.idNumber ? 'border-red-500' : ''
                          }`}
                        />
                        {accountErrors.idNumber && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {accountErrors.idNumber}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.idNumber || 'Not specified'}
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
                        value={formData.notes}
                        onChange={e =>
                          handleInputChange('notes', e.target.value)
                        }
                        placeholder="Enter notes"
                      />
                    ) : (
                      <p className="mt-2 break-words text-sm text-gray-900">
                        {formData.notes || 'No notes'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  User roles, password management, and access control
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditMode && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-base font-medium">Password</label>
                      <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="mt-1 rounded-md"
                      />
                      {password && (
                        <div className="mt-2 space-y-2">
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
                                  ? '✓'
                                  : '✗'}
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
                                  ? '✓'
                                  : '✗'}
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
                                  ? '✓'
                                  : '✗'}
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
                                  ? '✓'
                                  : '✗'}
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
                                  ? '✓'
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

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Label className="text-base font-medium text-gray-900">
                      Roles
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        setRolePermissionsDialog({
                          open: true,
                          role: 'info',
                          roleLabel: 'Role Information',
                        })
                      }
                      className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      aria-label="View role descriptions"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  <div className={`relative rounded-xl border-2 border-transparent transition-all duration-300 ${isEditMode && ((!allLicenseesSelected && selectedLicenseeIds.length === 0) || (!allLocationsSelected && selectedLocationIds.length === 0)) ? 'border-dashed border-amber-200 bg-gray-50/50 opacity-60 grayscale' : 'border-solid border-transparent'}`}>
                    {isEditMode && ((!allLicenseesSelected && selectedLicenseeIds.length === 0) || (!allLocationsSelected && selectedLocationIds.length === 0)) && (
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
                    {isEditMode ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                              <label
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors ${isVMRestricted ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:bg-gray-100'}`}
                              >
                                <Checkbox
                                  id={role.value}
                                  checked={roles.includes(role.value)}
                                  onCheckedChange={checked =>
                                    handleRoleChange(role.value, checked === true)
                                  }
                                  disabled={isVMRestricted}
                                />
                                <span className={`text-sm font-medium ${isVMRestricted ? 'text-gray-500' : 'text-gray-900'}`}>
                                  {role.label}
                                </span>
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
                                  className="ml-auto rounded-full p-1 text-gray-400 hover:bg-white hover:text-blue-600"
                                  title={`View pages accessible to ${role.label}`}
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </label>
                              {isVMRestricted && (
                                <p className="px-2 text-[10px] font-bold text-red-600 leading-tight">
                                  Vault Managers are limited to 1 Licensee & Location
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                    <div className="flex flex-wrap gap-2">
                      {roles && roles.length > 0 ? (
                        roles.map(roleValue => {
                          const roleOption = ROLE_OPTIONS.find(
                            r => r.value === roleValue
                          );
                          if (!roleOption) return null;
                          return (
                            <span
                              key={roleValue}
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                            >
                              {roleOption.label}
                              <button
                                type="button"
                                onClick={() =>
                                  setRolePermissionsDialog({
                                    open: true,
                                    role: roleValue,
                                    roleLabel: roleOption.label,
                                  })
                                }
                                className="rounded-full text-blue-600 hover:text-blue-800"
                                title={`View pages accessible to ${roleOption.label}`}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">
                          No roles assigned
                        </p>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isEditMode && (
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="min-w-[100px] gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    isLoading ||
                    checkingUsername ||
                    checkingEmail ||
                    Object.keys(accountErrors).length > 0
                  }
                  className="min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
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
        </div>
      </div>

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
