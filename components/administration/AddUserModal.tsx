/**
 * Add User Modal Component
 * Comprehensive modal for creating new users with full profile and permissions.
 *
 * Features:
 * - User profile creation (name, email, username, password, DOB, gender, address, ID)
 * - Profile picture upload with cropping
 * - Role assignment with permission-based restrictions
 * - Licensee and location permissions management
 * - Gaming location access control
 * - Form validation with real-time error messages
 * - Password strength validation
 * - Role-based field visibility (developer/admin/manager restrictions)
 * - Multi-select dropdowns for permissions
 * - GSAP animations for modal entrance/exit
 * - Toast notifications for success/error
 *
 * Large component (~1490 lines) handling complete user creation workflow.
 *
 * @param open - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param onSave - Callback when user is successfully created
 * @param formState - Current form state
 * @param setFormState - Callback to update form state
 */
'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';
import MultiSelectDropdown from '@/components/ui/common/MultiSelectDropdown';
import CircleCropModal from '@/components/ui/image/CircleCropModal';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useUserStore } from '@/lib/store/userStore';
import type { Licensee } from '@/lib/types/licensee';
import type { LocationSelectItem } from '@/lib/types/location';
import type { AddUserForm } from '@/lib/types/pages';
import {
  containsEmailPattern,
  containsPhonePattern,
  isPlaceholderEmail,
  isValidDateInput,
  validateAlphabeticField,
  validateCountry,
  validateEmail,
  validateNameField,
  validateOptionalGender,
  validatePasswordStrength,
  validateStreetAddress,
  validateTownRegion,
  validateUsername,
} from '@/lib/utils/validation';
import cameraIcon from '@/public/cameraIcon.svg';
import defaultAvatar from '@/public/defaultAvatar.svg';
import gsap from 'gsap';
import { Info, Loader2, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import RolePermissionsDialog from './RolePermissionsDialog';

// ============================================================================
// Constants
// ============================================================================

const ALL_ROLE_OPTIONS = [
  { label: 'Developer', value: 'developer' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Location Admin', value: 'location admin' },
  { label: 'Technician', value: 'technician' },
  { label: 'Collector', value: 'collector' },
];

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  formState: AddUserForm;
  setFormState: (_data: Partial<AddUserForm>) => void;
};

export default function AddUserModal({
  open,
  onClose,
  onSave,
  formState,
  setFormState,
}: AddUserModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useUserStore(state => state.user);
  const currentUserRoles = (currentUser?.roles || []) as string[];
  const isDeveloper = currentUserRoles.includes('developer');
  const isAdmin = currentUserRoles.includes('admin') && !isDeveloper;
  const isManager =
    currentUserRoles.includes('manager') && !isAdmin && !isDeveloper;
  const isLocationAdmin =
    currentUserRoles.includes('location admin') && !isAdmin && !isDeveloper && !isManager;

  // Filter available roles based on creator's permissions
  const availableRoles = useMemo(() => {
    if (isDeveloper) {
      // Developer can create all roles
      return ALL_ROLE_OPTIONS;
    } else if (isAdmin) {
      // Admin can create all roles except developer
      return ALL_ROLE_OPTIONS.filter(role => role.value !== 'developer');
    } else if (isManager) {
      // Manager can only create: location admin, technician, collector
      return ALL_ROLE_OPTIONS.filter(role =>
        ['location admin', 'technician', 'collector'].includes(role.value)
      );
    } else if (isLocationAdmin) {
      // Location admin can only create: technician, collector
      return ALL_ROLE_OPTIONS.filter(role =>
        ['technician', 'collector'].includes(role.value)
      );
    }
    // No roles available for other users
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
  
  // Get location admin's assigned locations
  const currentUserLocationPermissions = useMemo(
    () => {
      // Use only new field
      let locationIds: string[] = [];
      if (Array.isArray(currentUser?.assignedLocations) && currentUser.assignedLocations.length > 0) {
        locationIds = currentUser.assignedLocations;
      }
      return locationIds.map(id => String(id));
    },
    [currentUser?.assignedLocations]
  );

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [countries, setCountries] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rolePermissionsDialog, setRolePermissionsDialog] = useState<{
    open: boolean;
    role: string;
    roleLabel: string;
  }>({ open: false, role: '', roleLabel: '' });
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

  // Initialize selected licensee IDs based on manager's or location admin's licensees - only when modal opens
  useEffect(() => {
    if (!open) return;
    if ((isManager || isLocationAdmin) && currentUserLicenseeIds.length > 0) {
      setFormState({ ...formState, licenseeIds: currentUserLicenseeIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isManager, isLocationAdmin, currentUserLicenseeIds]); // Only depend on 'open' - initialize once when modal opens

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
      // Reset touched and submitAttempted when modal opens
      setTouched({});
      setSubmitAttempted(false);
      setErrors({});
      setConfirmPassword('');
      setCheckingUsername(false);
      setCheckingEmail(false);
    }
  }, [open]);

  // Load countries
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadCountries = async () => {
      try {
        const data = await fetchCountries();
        if (cancelled) return;
        setCountries(data.map(c => ({ _id: c._id, name: c.name })));
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Load licensees - only when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadLicensees = async () => {
      setIsLoadingAssignments(true);
      try {
        const result = await fetchLicensees();
        if (cancelled) return;
        
        // Extract licensees array from the result
        let lics = Array.isArray(result.licensees) ? result.licensees : [];

        if (isManager && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        // For location admins, filter to only show their licensee and auto-set it
        if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
          // Auto-set the licensee for location admins
          if (lics.length > 0 && !cancelled) {
            setFormState({ ...formState, licenseeIds: [String(lics[0]._id)] });
            setAllLicenseesSelected(false);
          }
        }

        setLicensees(lics);

        if (isManager && lics.length === 1 && !cancelled) {
          setFormState({ ...formState, licenseeIds: [String(lics[0]._id)] });
          setAllLicenseesSelected(false);
        }
      } catch (error) {
        console.error('Error loading licensees:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingAssignments(false);
        }
      }
    };

    void loadLicensees();
    return () => {
      cancelled = true;
    };
  }, [open, setFormState, formState, setAllLicenseesSelected, setLicensees, setIsLoadingAssignments, isManager, currentUserLicenseeIds, isLocationAdmin]);

  // Load locations based on selected licensees
  useEffect(() => {
    if (!open || !formState.licenseeIds || formState.licenseeIds.length === 0) {
      setLocations([]);
      return;
    }

    let cancelled = false;

    const loadLocations = async () => {
      try {
        // Build query params for multiple licensees
        const params = new URLSearchParams();
        if (formState.licenseeIds && formState.licenseeIds.length > 0) {
          // Use gaming-locations endpoint which supports multiple licensees
          params.append('licensees', formState.licenseeIds.join(','));
        }

        const response = await fetch(
          `/api/gaming-locations?${params.toString()}`
        );
        if (cancelled) return;

        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }

        const data = await response.json();
        if (cancelled) return;

        // Handle both response formats: direct array or { success: true, data: [...] }
        let locationsArray: LocationSelectItem[] = [];
        if (Array.isArray(data)) {
          locationsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          locationsArray = data.data;
        } else if (data.locations && Array.isArray(data.locations)) {
          locationsArray = data.locations;
        }

        // Map to LocationSelectItem format
        let formattedLocations: LocationSelectItem[] = locationsArray.map(
          (loc: {
            _id?: unknown;
            id?: unknown;
            name?: string;
            licenseeId?: unknown;
          }) => ({
            _id: String(loc._id || loc.id),
            name: loc.name || '',
            licenseeId: loc.licenseeId ? String(loc.licenseeId) : null,
          })
        );

        // Filter locations for location admins - only show their assigned locations
        if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
          formattedLocations = formattedLocations.filter(loc =>
            currentUserLocationPermissions.includes(loc._id)
          );
        }

        setLocations(formattedLocations);
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      }
    };

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [open, formState.licenseeIds, isLocationAdmin, currentUserLocationPermissions]);

  // Debounced validation - only validate fields that have been touched or on submit
  // Debounced username and email availability check
  useEffect(() => {
    const username = (formState.username || '').trim();

    // Check username availability
    if (username && username.length >= 3 && touched.username && validateUsername(username) && !containsEmailPattern(username) && !containsPhonePattern(username)) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
          const data = await response.json();
          if (data.success && data.usernameExists) {
            setErrors(prev => ({ ...prev, username: 'This username is already taken.' }));
          } else {
            setErrors(prev => {
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
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
    setCheckingUsername(false);
    return undefined;
  }, [formState.username, touched.username]);

  // Debounced email availability check
  useEffect(() => {
    const email = (formState.email || '').trim();

    // Check email availability
    if (email && validateEmail(email) && !isPlaceholderEmail(email) && touched.email) {
      const timeoutId = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const response = await fetch(`/api/users/check-username?email=${encodeURIComponent(email)}`);
          const data = await response.json();
          if (data.success && data.emailExists) {
            setErrors(prev => ({ ...prev, email: 'This email address is already registered.' }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.email === 'This email address is already registered.') {
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
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
    setCheckingEmail(false);
    return undefined;
  }, [formState.email, touched.email]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const newErrors: Record<string, string> = {};
      const username = (formState.username || '').trim();
      const email = (formState.email || '').trim();
      const password = formState.password || '';
      const confirmPasswordValue = confirmPassword || '';
      const firstName = (formState.firstName || '').trim();
      const lastName = (formState.lastName || '').trim();
      const gender = (formState.gender || '').trim().toLowerCase();
      const street = (formState.street || '').trim();
      const town = (formState.town || '').trim();
      const region = (formState.region || '').trim();
      const country = (formState.country || '').trim();
      const idType = (formState.idType || '').trim();
      const idNumber = (formState.idNumber || '').trim();
      const dateOfBirth = (formState.dateOfBirth || '').trim();

      // Only validate format/pattern errors if field has been touched (user typed something)
      // Required errors only show after submit attempt
      const shouldValidateFormat = (_field: string) => touched[_field];
      const shouldValidateRequired = (_field: string) => submitAttempted;

      // Username validation (don't override API check errors)
      if (shouldValidateRequired('username') && !username) {
        newErrors.username = 'Username is required.';
      } else if (shouldValidateFormat('username') && username) {
        // Only set format errors if there's no API check error
        const hasApiError = errors.username?.includes('already taken');
        if (!hasApiError) {
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
      }

      // Email validation (don't override API check errors)
      if (shouldValidateRequired('email') && !email) {
        newErrors.email = 'Email address is required.';
      } else if (shouldValidateFormat('email') && email) {
        // Only set format errors if there's no API check error
        const hasApiError = errors.email?.includes('already registered');
        if (!hasApiError) {
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
      }

      // Password validation - always validate password strength if there's a value
      if (password) {
        const validation = validatePasswordStrength(password);
        if (!validation.isValid) {
          if (shouldValidateFormat('password')) {
            newErrors.password = validation.feedback.join(', ');
          }
        }
        setPasswordStrength({
          score: validation.score,
          label:
            validation.score <= 2
              ? 'Very Weak'
              : validation.score === 3
                ? 'Good'
                : 'Strong',
          feedback: validation.feedback,
          requirements: validation.requirements,
        });
      } else if (shouldValidateRequired('password')) {
        newErrors.password = 'Password is required.';
      }

      // Confirm password validation
      if (shouldValidateRequired('confirmPassword') && !confirmPasswordValue) {
        newErrors.confirmPassword = 'Please confirm your password.';
      } else if (
        shouldValidateFormat('confirmPassword') &&
        confirmPasswordValue &&
        password !== confirmPasswordValue
      ) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }

      // First name validation
      if (shouldValidateRequired('firstName') && !firstName) {
        newErrors.firstName = 'First name is required.';
      } else if (shouldValidateFormat('firstName') && firstName) {
        if (firstName.length < 3) {
          newErrors.firstName = 'First name must be at least 3 characters.';
        } else if (!validateNameField(firstName)) {
          newErrors.firstName =
            'First name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Last name validation
      if (shouldValidateRequired('lastName') && !lastName) {
        newErrors.lastName = 'Last name is required.';
      } else if (shouldValidateFormat('lastName') && lastName) {
        if (lastName.length < 3) {
          newErrors.lastName = 'Last name must be at least 3 characters.';
        } else if (!validateNameField(lastName)) {
          newErrors.lastName =
            'Last name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Gender validation
      if (shouldValidateRequired('gender') && !gender) {
        newErrors.gender = 'Gender is required.';
      } else if (
        shouldValidateFormat('gender') &&
        gender &&
        !validateOptionalGender(gender)
      ) {
        newErrors.gender = 'Select a valid gender option.';
      }

      // Street validation
      if (street && shouldValidateFormat('street')) {
        if (street.length < 3) {
          newErrors.street = 'Street address must be at least 3 characters.';
        } else if (!validateStreetAddress(street)) {
          newErrors.street =
            'Street address may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Town validation
      if (town && shouldValidateFormat('town')) {
        if (town.length < 3) {
          newErrors.town = 'Town must be at least 3 characters.';
        } else if (!validateTownRegion(town)) {
          newErrors.town =
            'Town may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Region validation
      if (region && shouldValidateFormat('region')) {
        if (region.length < 3) {
          newErrors.region = 'Region must be at least 3 characters.';
        } else if (!validateTownRegion(region)) {
          newErrors.region =
            'Region may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Country validation
      if (country && shouldValidateFormat('country')) {
        if (country.length < 3) {
          newErrors.country = 'Country must be at least 3 characters.';
        } else if (!validateCountry(country)) {
          newErrors.country = 'Country may only contain letters and spaces.';
        }
      }

      // ID Type validation
      if (idType && shouldValidateFormat('idType')) {
        if (idType.length < 3) {
          newErrors.idType = 'ID type must be at least 3 characters.';
        } else if (!validateAlphabeticField(idType)) {
          newErrors.idType = 'ID type may only contain letters and spaces.';
        }
      }

      // ID Number validation (if provided, must be at least 3 characters)
      if (idNumber && shouldValidateFormat('idNumber') && idNumber.length < 3) {
        newErrors.idNumber = 'ID number must be at least 3 characters.';
      }

      // Date of birth validation
      if (dateOfBirth && shouldValidateFormat('dateOfBirth')) {
        if (!isValidDateInput(dateOfBirth)) {
          newErrors.dateOfBirth = 'Provide a valid date of birth.';
        } else {
          const parsedDob = new Date(dateOfBirth);
          const today = new Date();
          if (parsedDob > today) {
            newErrors.dateOfBirth = 'Date of birth cannot be in the future.';
          }
        }
      }

      // Roles validation
      if (
        shouldValidateRequired('roles') &&
        (!formState.roles || formState.roles.length === 0)
      ) {
        newErrors.roles = 'At least one role is required.';
      }

      // Licensee validation for managers
      // Licensee assignment is required for all users
      if (
        shouldValidateRequired('licenseeIds') &&
        (!formState.licenseeIds || formState.licenseeIds.length === 0)
      ) {
        newErrors.licenseeIds = 'Licensee assignment is required.';
      }

      setErrors(newErrors);
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formState.username,
    formState.email,
    formState.password,
    confirmPassword,
    formState.firstName,
    formState.lastName,
    formState.gender,
    formState.street,
    formState.town,
    formState.region,
    formState.country,
    formState.idType,
    formState.idNumber,
    formState.dateOfBirth,
    formState.roles,
    formState.licenseeIds,
    isManager,
    touched,
    submitAttempted,
    errors.username,
    errors.email,
  ]);

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
    setFormState({ profilePicture: null });
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setFormState({ profilePicture: croppedImageUrl });
    setIsCropOpen(false);
    setRawImageSrc(null);
  };

  const handleRoleChange = (roleValue: string, checked: boolean) => {
    const currentRoles = formState.roles || [];
    if (checked) {
      setFormState({ roles: [...currentRoles, roleValue] });
    } else {
      setFormState({ roles: currentRoles.filter(r => r !== roleValue) });
    }
    setTouched(prev => ({ ...prev, roles: true }));
  };

  const handleAllLicenseesChange = (checked: boolean) => {
    if (checked) {
      setAllLicenseesSelected(true);
      setFormState({ licenseeIds: licensees.map(l => String(l._id)) });
    } else {
      setAllLicenseesSelected(false);
      setFormState({ licenseeIds: [] });
    }
    setTouched(prev => ({ ...prev, licenseeIds: true }));
  };

  const handleLicenseeChange = (selectedIds: string[]) => {
    setAllLicenseesSelected(false);
    setFormState({ licenseeIds: selectedIds });
    setTouched(prev => ({ ...prev, licenseeIds: true }));
  };

  const handleLocationChange = (selectedIds: string[]) => {
    setFormState({ allowedLocations: selectedIds });
  };

  const licenseeOptions: MultiSelectOption[] = useMemo(
    () =>
      licensees.map(lic => ({
        id: String(lic._id),
        label: lic.name,
      })),
    [licensees]
  );

  const locationOptions: MultiSelectOption[] = useMemo(
    () =>
      locations.map(loc => ({
        id: String(loc._id),
        label: loc.name,
      })),
    [locations]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Mark all required fields as touched to show validation
    const requiredFields = [
      'username',
      'email',
      'password',
      'confirmPassword',
      'firstName',
      'lastName',
      'gender',
      'roles',
      'licenseeIds', // Required for all users
    ];
    const newTouched: Record<string, boolean> = { ...touched };
    requiredFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    // Validate password match
    if (formState.password !== confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match.',
      }));
      return;
    }

    // Wait a bit for validation to run (including debounced API checks)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check if there are any validation errors (including API check errors)
    if (Object.keys(errors).length > 0 || checkingUsername || checkingEmail) {
      if (checkingUsername || checkingEmail) {
        toast.error('Please wait for username/email validation to complete');
      } else {
        toast.error('Please fix the errors before submitting.');
      }
      return;
    }

    // For location admins, ensure licensee is set to their licensee
    const finalLicenseeIds = isLocationAdmin && currentUserLicenseeIds.length > 0
      ? currentUserLicenseeIds
      : (formState.licenseeIds || []);

    // Update form state and ensure licenseeIds is set
    setFormState({
      ...formState,
      // Ensure licenseeIds is set (required for all users)
      // For location admins, use their licensee
      licenseeIds: finalLicenseeIds,
    });

    // Wait for state update to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    setIsLoading(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const selectedLicenseeIds = formState.licenseeIds || [];
  const selectedLocationIds = formState.allowedLocations || [];
  const managerHasSingleLicensee =
    isManager && currentUserLicenseeIds.length === 1;
  const managerHasMultipleLicensees =
    isManager && currentUserLicenseeIds.length > 1;
  const locationAdminHasSingleLicensee =
    isLocationAdmin && currentUserLicenseeIds.length === 1;
  const canEditLicensees = isDeveloper || isAdmin; // Only admins/developers can edit licensee assignments

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
          className="relative flex h-full w-full flex-col overflow-y-auto border border-border bg-background p-4 animate-in lg:max-h-[95vh] lg:max-w-4xl lg:rounded-2xl lg:p-10"
          style={{ opacity: 1 }}
        >
          {/* Close button */}
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>

          <div className="mb-6 flex flex-col items-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Create New User
            </h2>
          </div>

          <form
            className="flex w-full flex-col gap-8"
            onSubmit={handleSave}
            autoComplete="off"
          >
            {/* Top section: Avatar at top, then required fields in grid */}
            <div className="flex w-full flex-col gap-6">
              {/* Avatar - centered at top */}
              <div className="flex w-full justify-center">
                <div className="relative">
                  <Image
                    src={formState.profilePicture || defaultAvatar}
                    alt="Avatar"
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-container bg-gray-200"
                  />
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 flex items-center justify-center rounded-full border-2 border-border bg-white shadow transition-colors hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image
                      src={cameraIcon}
                      alt="Edit Avatar"
                      width={28}
                      height={28}
                      className="m-0 p-1"
                    />
                  </button>
                  {formState.profilePicture && (
                    <button
                      type="button"
                      className="absolute right-0 top-0 rounded-full bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
                      onClick={handleRemoveProfilePicture}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

              {/* Account Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Account Information
                </h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Username: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoComplete="off"
                        name="new-username"
                        id="new-username"
                        className={`w-full rounded-md border bg-white p-3 pr-10 ${
                          errors.username ? 'border-red-500' : 'border-border'
                        }`}
                        value={formState.username || ''}
                        onChange={e => {
                          setFormState({ username: e.target.value });
                          setTouched(prev => ({ ...prev, username: true }));
                        }}
                        placeholder="Enter Username"
                        required
                      />
                      {checkingUsername && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.username}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Email Address: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className={`w-full rounded-md border bg-white p-3 pr-10 ${
                          errors.email ? 'border-red-500' : 'border-border'
                        }`}
                        value={formState.email || ''}
                        onChange={e => {
                          setFormState({ email: e.target.value });
                          setTouched(prev => ({ ...prev, email: true }));
                        }}
                        placeholder="Enter Email Address"
                        required
                      />
                      {checkingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Password
                </h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Password: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.password ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.password || ''}
                      onChange={e => {
                        setFormState({ password: e.target.value });
                        setTouched(prev => ({ ...prev, password: true }));
                      }}
                      placeholder="Enter Password"
                      required
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.password}
                      </p>
                    )}
                    {formState.password && !errors.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Strength:</span>
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
                                    : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-600">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <ul className="list-inside list-disc text-xs text-gray-600">
                          <li
                            className={
                              passwordStrength.requirements.length
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            At least 8 characters
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.uppercase
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Contains an uppercase letter
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.lowercase
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Contains a lowercase letter
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.number
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Includes a number
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.special
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Includes a special character (@$!%*?&)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Confirm Password: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.confirmPassword
                          ? 'border-red-500'
                          : 'border-border'
                      }`}
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        setTouched(prev => ({
                          ...prev,
                          confirmPassword: true,
                        }));
                      }}
                      placeholder="Confirm Password"
                      required
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
                    {confirmPassword &&
                      !errors.confirmPassword &&
                      formState.password === confirmPassword && (
                        <p className="mt-1 text-sm text-green-600">
                          ✓ Passwords match
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      First Name: <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.firstName ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.firstName || ''}
                      onChange={e => {
                        setFormState({ firstName: e.target.value });
                        setTouched(prev => ({ ...prev, firstName: true }));
                      }}
                      placeholder="Enter First Name"
                      required
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Last Name: <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.lastName ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.lastName || ''}
                      onChange={e => {
                        setFormState({ lastName: e.target.value });
                        setTouched(prev => ({ ...prev, lastName: true }));
                      }}
                      placeholder="Enter Last Name"
                      required
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Gender: <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.gender ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.gender || ''}
                      onChange={e => {
                        setFormState({ gender: e.target.value });
                        setTouched(prev => ({ ...prev, gender: true }));
                      }}
                      required
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Address</h3>
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Street:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.street ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.street || ''}
                    onChange={e => {
                      setFormState({ street: e.target.value });
                      setTouched(prev => ({ ...prev, street: true }));
                    }}
                    placeholder="Enter Street"
                  />
                  {errors.street && (
                    <p className="mt-1 text-sm text-red-500">{errors.street}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Town:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.town ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.town || ''}
                    onChange={e => {
                      setFormState({ town: e.target.value });
                      setTouched(prev => ({ ...prev, town: true }));
                    }}
                    placeholder="Enter Town"
                  />
                  {errors.town && (
                    <p className="mt-1 text-sm text-red-500">{errors.town}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Region:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.region ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.region || ''}
                    onChange={e => {
                      setFormState({ region: e.target.value });
                      setTouched(prev => ({ ...prev, region: true }));
                    }}
                    placeholder="Enter Region"
                  />
                  {errors.region && (
                    <p className="mt-1 text-sm text-red-500">{errors.region}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Country:
                  </label>
                  <select
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.country ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.country || ''}
                    onChange={e => {
                      setFormState({ country: e.target.value });
                      setTouched(prev => ({ ...prev, country: true }));
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country._id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.country}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Postal Code:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.postalCode || ''}
                    onChange={e => setFormState({ postalCode: e.target.value })}
                    placeholder="Enter Postal Code"
                  />
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Identification
              </h3>
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    D.O.B:
                  </label>
                  <input
                    type="date"
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.dateOfBirth || ''}
                    onChange={e => {
                      setFormState({ dateOfBirth: e.target.value });
                      setTouched(prev => ({ ...prev, dateOfBirth: true }));
                    }}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Type:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.idType ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.idType || ''}
                    onChange={e => {
                      setFormState({ idType: e.target.value });
                      setTouched(prev => ({ ...prev, idType: true }));
                    }}
                    placeholder="Enter ID Type"
                  />
                  {errors.idType && (
                    <p className="mt-1 text-sm text-red-500">{errors.idType}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Number:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.idNumber ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.idNumber || ''}
                    onChange={e => {
                      setFormState({ idNumber: e.target.value });
                      setTouched(prev => ({ ...prev, idNumber: true }));
                    }}
                    placeholder="Enter ID Number"
                  />
                  {errors.idNumber && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.idNumber}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Notes:
                  </label>
                  <textarea
                    className="min-h-[56px] w-full rounded-md border border-border bg-white p-3"
                    value={formState.notes || ''}
                    onChange={e => setFormState({ notes: e.target.value })}
                    placeholder="Enter Notes"
                  />
                </div>
              </div>
            </div>

            {/* Roles & Permissions Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Roles & Permissions
              </h3>
              <div className="w-full space-y-6">
                {/* Roles Section */}
                <div>
                  <h4 className="mb-3 text-center text-lg font-semibold text-gray-900">
                    Roles <span className="text-red-500">*</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3 md:gap-x-6">
                    {availableRoles.map(role => (
                      <div key={role.value} className="flex items-center gap-2">
                        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-gray-900">
                          <Checkbox
                            id={role.value}
                            checked={(formState.roles || []).includes(
                              role.value
                            )}
                            onCheckedChange={checked =>
                              handleRoleChange(role.value, checked === true)
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
                  {errors.roles && (
                    <p className="mt-2 text-center text-sm text-red-500">
                      {errors.roles}
                    </p>
                  )}
                </div>

                {/* Licensees and Locations Container */}
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Licensees Section */}
                  <div className="flex flex-col">
                    <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                      Assigned Licensees <span className="text-red-500">*</span>
                    </h4>

                    {/* For managers and location admins, show as read-only */}
                    {managerHasSingleLicensee || locationAdminHasSingleLicensee ? (
                      <div className="text-center">
                        <div className="text-gray-700">
                          {licensees.find(
                            l => String(l._id) === selectedLicenseeIds[0]
                          )?.name || 'No licensee assigned'}
                        </div>
                        <p className="mt-2 text-xs italic text-gray-500">
                          {isLocationAdmin
                            ? 'Licensee is automatically set to your assigned licensee'
                            : 'Licensee is automatically assigned based on your access'}
                        </p>
                      </div>
                    ) : (managerHasMultipleLicensees || (isLocationAdmin && !canEditLicensees)) ? (
                      <div className="space-y-3">
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
                            disabled={isLoadingAssignments || (isLocationAdmin && !canEditLicensees)}
                          />
                        )}

                        {allLicenseesSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {licensees.length} licensees are selected
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
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
                            disabled={isLoadingAssignments || (isLocationAdmin && !canEditLicensees)}
                          />
                        )}

                        {allLicenseesSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {licensees.length} licensees are selected
                          </div>
                        )}
                      </div>
                    )}
                    {errors.licenseeIds && (
                      <p className="mt-2 text-center text-sm text-red-500">
                        {errors.licenseeIds}
                      </p>
                    )}
                  </div>

                  {/* Locations Section */}
                  <div className="flex flex-col">
                    <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                      Allowed Locations
                    </h4>

                    {/* Spacer to match checkbox height on left side - checkbox + label is ~28px */}
                    <div className="mb-[28px]">
                      {/* Invisible spacer to align dropdown with left side dropdown */}
                    </div>

                    {selectedLicenseeIds.length === 0 &&
                    !allLicenseesSelected ? (
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-800">
                        ⚠️ Please select at least one licensee first to assign
                        locations
                      </div>
                    ) : (
                      <MultiSelectDropdown
                        options={locationOptions}
                        selectedIds={selectedLocationIds}
                        onChange={handleLocationChange}
                        placeholder="Select locations..."
                        searchPlaceholder="Search locations..."
                        label="locations"
                        showSelectAll={true}
                        disabled={isLoadingAssignments}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4 lg:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-md px-12 py-3 text-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || Object.keys(errors).length > 0}
                className="rounded-md bg-button px-12 py-3 text-lg font-semibold text-white hover:bg-buttonActive disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
          </form>
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
