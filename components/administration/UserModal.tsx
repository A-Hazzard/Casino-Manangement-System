/**
 * User Modal Component
 * Comprehensive modal for editing existing users with full profile and permissions.
 *
 * Features:
 * - User profile editing (name, email, username, password, DOB, gender, address, ID)
 * - Profile picture upload with cropping
 * - Role assignment with permission-based restrictions
 * - Licensee and location permissions management
 * - Gaming location access control
 * - Form validation with real-time error messages
 * - Password strength validation
 * - Change detection and unsaved changes warning
 * - Role-based field visibility
 * - Multi-select dropdowns for permissions
 * - GSAP animations for modal entrance/exit
 * - Toast notifications for success/error
 *
 * Large component (~2274 lines) handling complete user editing workflow.
 *
 * @param open - Whether the modal is visible
 * @param user - User object to edit
 * @param onClose - Callback to close the modal
 * @param onSave - Callback when user is successfully updated
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
import type { MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';
import MultiSelectDropdown from '@/components/ui/common/MultiSelectDropdown';
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
import RolePermissionsDialog from './RolePermissionsDialog';

// ============================================================================
// Constants
// ============================================================================

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
      (Array.isArray(currentUser?.assignedLicensees)
        ? currentUser.assignedLicensees
        : []
      ).map(id => String(id)),
    [currentUser?.assignedLicensees]
  );

  // Get location admin's assigned locations
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
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>(
    {}
  );
  const [accountTouched, setAccountTouched] = useState<Record<string, boolean>>(
    {}
  );

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

    // Note: Location IDs will be initialized by the separate effect that handles
    // location initialization from user.assignedLocations
    // This prevents overwriting manual changes when locations/licensees load
    // Use only new field
    let rawLicenseeIds: string[] = [];
    if (
      Array.isArray(targetUser.assignedLicensees) &&
      targetUser.assignedLicensees.length > 0
    ) {
      rawLicenseeIds = targetUser.assignedLicensees.map(id => String(id));
    }
    rawLicenseeIdsRef.current = rawLicenseeIds;

    // Set licensee IDs if licensees are already loaded
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
    } else {
      // Licensees not loaded yet - will be set when they load
      setSelectedLicenseeIds(prev =>
        arraysEqual(prev, rawLicenseeIds) ? prev : rawLicenseeIds
      );
      setAllLicenseesSelected(false);
    }

    // Note: selectedLocationIds will be set by the separate effect that handles
    // location initialization from user.assignedLocations
  }, []);

  // Track the current user ID to detect when user changes
  const currentUserIdRef = useRef<string | null>(null);

  // Initialize form data when user changes (only when user ID changes, not when locations/licensees load)
  useEffect(() => {
    if (user) {
      const userId = user._id;

      // Only hydrate if this is a different user (user ID changed)
      if (currentUserIdRef.current !== userId) {
        console.log('[UserModal] New user detected, initializing form:', {
          userId,
          previousUserId: currentUserIdRef.current,
          username: user.username,
          assignedLicensees: user.assignedLicensees,
          locationPermissions: user.assignedLocations,
        });

        currentUserIdRef.current = userId;
        // Reset initialization refs when user changes
        hasInitializedLocationsFromUserRef.current = false;
        hasInitializedLicenseesFromLocationsRef.current = false;
        setIsLoading(false);
        hydrateFormFromUser(user);
      }
    } else if (open) {
      currentUserIdRef.current = null;
      setIsLoading(true);

      // For location admins creating new user, auto-set licensee
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

  // Track if locations have been loaded to prevent re-fetching
  const hasLoadedLocationsRef = useRef(false);
  // Track if we've initialized locations from user's assignedLocations (to prevent re-initialization)
  const hasInitializedLocationsFromUserRef = useRef(false);
  // Track if we've initialized licensees from user's locations (to prevent re-initialization)
  const hasInitializedLicenseesFromLocationsRef = useRef(false);

  // Reset refs when modal closes
  useEffect(() => {
    if (!open) {
      hasLoadedLocationsRef.current = false;
      hasInitializedLocationsFromUserRef.current = false;
      hasInitializedLicenseesFromLocationsRef.current = false;
      // Also reset selectedLocationIds when modal closes
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
      // Reset validation states
      setCheckingUsername(false);
      setCheckingEmail(false);
      setAccountErrors({});
      setAccountTouched({});
    }
  }, [open]);

  // Load locations when modal opens - only once
  useEffect(() => {
    if (!open) {
      return;
    }

    // Only fetch locations if we haven't loaded them yet
    if (hasLoadedLocationsRef.current) {
      return;
    }

    let cancelled = false;

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

        // Filter locations for location admins - only show their assigned locations
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

  // Track the last user ID to detect user changes
  const lastUserIdRef = useRef<string | undefined>(undefined);

  // Update location assignments when user or locations change (e.g., after API fetch)
  useEffect(() => {
    if (!open) {
      // Clear selections when modal is closed
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
      lastUserIdRef.current = undefined;
      return;
    }

    // Wait for both user and locations to be available
    if (!user) {
      console.log(
        '[UserModal] Waiting for user data to load before setting location assignments'
      );
      return;
    }

    // Reset initialization refs when user changes
    if (lastUserIdRef.current !== user._id) {
      console.log('[UserModal] User changed, resetting initialization refs:', {
        previousUserId: lastUserIdRef.current,
        newUserId: user._id,
      });
      hasInitializedLocationsFromUserRef.current = false;
      hasInitializedLicenseesFromLocationsRef.current = false;
      lastUserIdRef.current = user._id;
    }

    // Wait for locations to load before setting assignments
    if (locations.length === 0) {
      console.log(
        '[UserModal] Waiting for locations to load before setting location assignments',
        {
          hasUser: !!user,
          userId: user?._id,
          locationsCount: locations.length,
        }
      );
      return;
    }

    // Wait for licensees to load before setting assignments
    // This ensures we can properly select licensees for assigned locations
    if (licensees.length === 0) {
      console.log(
        '[UserModal] Waiting for licensees to load before setting location assignments',
        {
          hasUser: !!user,
          userId: user?._id,
          licenseesCount: licensees.length,
        }
      );
      return;
    }

    // Helper function to truncate long strings (like profilePicture)
    const truncateString = (str: unknown, maxLength = 50): string => {
      if (typeof str !== 'string') return String(str);
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength) + '...';
    };

    // Create a safe user object for logging (truncate profilePicture)
    const userForLogging = {
      ...user,
      profilePicture: user.profilePicture
        ? truncateString(user.profilePicture, 50)
        : user.profilePicture,
    };

    console.log('[UserModal] Updating location assignments from user:', {
      userId: user._id,
      username: user.username,
      assignedLocations: user.assignedLocations,
      locationsCount: locations.length,
      userObject: userForLogging,
    });

    // Use only new field
    let userLocationIds: string[] = [];
    if (
      Array.isArray(user.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      userLocationIds = user.assignedLocations.map(id => String(id).trim());
      console.log('[UserModal] Found assignedLocations:', {
        resourcesCount: userLocationIds.length,
        resources: userLocationIds,
      });
    } else {
      console.log(
        '[UserModal] No location assignments found in assignedLocations'
      );
    }

    console.log('[UserModal] Extracted user location IDs:', userLocationIds);
    console.log(
      '[UserModal] Available location IDs:',
      locations.map(loc => loc._id)
    );

    // Only initialize locations from user data on first load
    // Don't overwrite manual changes made by the user
    if (!hasInitializedLocationsFromUserRef.current) {
      if (userLocationIds.length > 0) {
        // IMPORTANT: Set selectedLocationIds to ALL location IDs from user's assignedLocations
        // Don't filter them - we want to preserve all assigned locations, even if they're not
        // currently visible in the dropdown (e.g., because their licensee isn't selected)
        // The dropdown will filter what's shown, but we need to keep all IDs for saving
        console.log(
          '[UserModal] Initializing selectedLocationIds from user assignedLocations:',
          userLocationIds
        );

        // Find which locations exist in the loaded locations array (for display purposes)
        const validLocationIds = userLocationIds.filter(locId => {
          const normalizedLocId = String(locId).trim();
          return locations.some(
            (loc: LocationSelectItem) =>
              String(loc._id).trim() === normalizedLocId
          );
        });
        console.log(
          '[UserModal] Valid location IDs (found in loaded locations):',
          validLocationIds
        );
        console.log(
          '[UserModal] Location IDs not in loaded locations (will be preserved but not visible):',
          userLocationIds.filter(locId => {
            const normalizedLocId = String(locId).trim();
            return !locations.some(
              (loc: LocationSelectItem) =>
                String(loc._id).trim() === normalizedLocId
            );
          })
        );

        // Find the licensees for the valid locations and ensure they're selected
        // This is important so the locations appear in availableLocations for editing
        // BUT: Only do this on initial load, not when user manually changes licensees
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

          console.log(
            '[UserModal] Found licensees for assigned locations:',
            Array.from(locationLicenseeIds)
          );

          // Ensure all licensees for these locations are selected (only on initial load)
          if (locationLicenseeIds.size > 0) {
            const licenseeIdsArray = Array.from(locationLicenseeIds);
            // Use functional update to get the latest state
            setSelectedLicenseeIds(prevSelectedLicenseeIds => {
              console.log(
                '[UserModal] Current selectedLicenseeIds:',
                prevSelectedLicenseeIds
              );
              const missingLicenseeIds = licenseeIdsArray.filter(
                licId => !prevSelectedLicenseeIds.includes(licId)
              );

              if (missingLicenseeIds.length > 0) {
                console.log(
                  '[UserModal] Auto-selecting licensees for assigned locations (initial load):',
                  missingLicenseeIds
                );
                const newSelectedLicenseeIds = [
                  ...prevSelectedLicenseeIds,
                  ...missingLicenseeIds,
                ];
                // Update allLicenseesSelected if all licensees are now selected
                const allLicenseeIds = licensees.map(lic => String(lic._id));
                setAllLicenseesSelected(
                  newSelectedLicenseeIds.length === allLicenseeIds.length &&
                    allLicenseeIds.every(id =>
                      newSelectedLicenseeIds.includes(id)
                    )
                );
                console.log(
                  '[UserModal] Updated selectedLicenseeIds:',
                  newSelectedLicenseeIds
                );
                return newSelectedLicenseeIds;
              }
              console.log(
                '[UserModal] No missing licensees to add, keeping current selection'
              );
              return prevSelectedLicenseeIds;
            });
          }
          // Mark as initialized to prevent re-initialization
          hasInitializedLicenseesFromLocationsRef.current = true;
        } else {
          console.log('[UserModal] Skipping licensee auto-selection:', {
            validLocationIdsLength: validLocationIds.length,
            licenseesLength: licensees.length,
            hasInitializedLicenseesFromLocations:
              hasInitializedLicenseesFromLocationsRef.current,
          });
        }

        // Set selectedLocationIds to ALL user location IDs (not just valid ones)
        // This ensures all assigned locations are preserved when saving
        console.log(
          '[UserModal] Setting selectedLocationIds to:',
          userLocationIds
        );
        setSelectedLocationIds(userLocationIds);
        // Only set allLocationsSelected if all loaded locations are selected
        setAllLocationsSelected(
          validLocationIds.length > 0 &&
            validLocationIds.length === locations.length
        );
        // Mark as initialized to prevent overwriting manual changes
        hasInitializedLocationsFromUserRef.current = true;
        console.log(
          '[UserModal] Location initialization complete. selectedLocationIds set to:',
          userLocationIds
        );
      } else {
        // Clear selected locations if user has none
        console.log(
          '[UserModal] No location IDs found in user assignedLocations - clearing selections'
        );
        setSelectedLocationIds([]);
        setAllLocationsSelected(false);
        hasInitializedLocationsFromUserRef.current = true;
      }
    } else {
      console.log(
        '[UserModal] Locations already initialized from user - skipping to preserve manual changes'
      );
    }
  }, [open, user, locations, licensees]);

  // Track if we've loaded licensees to prevent re-fetching
  const hasLoadedLicenseesRef = useRef(false);
  const selectedLicenseeIdsRef = useRef<string[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedLicenseeIdsRef.current = selectedLicenseeIds;
  }, [selectedLicenseeIds]);

  // Load licensees when the modal is open and normalise assignments - only when modal opens
  useEffect(() => {
    if (!open) {
      hasLoadedLicenseesRef.current = false;
      return;
    }

    // Only load once when modal opens
    if (hasLoadedLicenseesRef.current) {
      return;
    }

    let cancelled = false;

    const loadLicensees = async () => {
      try {
        const result = await fetchLicensees();
        if (cancelled) return;

        hasLoadedLicenseesRef.current = true;

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
          // Auto-set the licensee for location admins only if not already set
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
  }, [open, isManager, isLocationAdmin, currentUserLicenseeIds]);

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

  // Debounced username availability check (for edit mode)
  useEffect(() => {
    if (!user?._id || !isEditMode || !canEditAccountFields) {
      return undefined;
    }

    const username = (accountData.username || '').trim();
    const originalUsername = (user.username || '').trim();

    // Only check if username changed and is valid
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
      }, 500); // 500ms debounce

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

  // Debounced email availability check (for edit mode)
  useEffect(() => {
    if (!user?._id || !isEditMode || !canEditAccountFields) {
      return undefined;
    }

    const email = (accountData.email || '').trim();
    const originalEmail = (user.email || user.emailAddress || '').trim();

    // Only check if email changed, is valid, and has been touched
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
      }, 500); // 500ms debounce

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
    // Clear error for this field when user starts typing
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

    // Update licensee selection first
    setSelectedLicenseeIds(newSelectedIds);

    // Update "All Licensees" checkbox state
    setAllLicenseesSelected(
      newSelectedIds.length === licensees.length && licensees.length > 0
    );

    // Remove selected locations that don't belong to the newly selected licensees
    // Use a function to get the current state to avoid stale closure
    setSelectedLocationIds(prevLocationIds => {
      console.log('[UserModal] Filtering locations after licensee change:', {
        previousLocationIds: prevLocationIds,
        newLicenseeIds: newSelectedIds,
        previousCount: prevLocationIds.length,
      });

      const validLocationIds = prevLocationIds.filter(locId => {
        const location = locations.find(l => l._id === locId);
        // Keep location if:
        // 1. It exists in locations array AND belongs to a selected licensee, OR
        // 2. It doesn't exist in locations array (preserve unknown locations)
        if (!location) {
          // Location not in loaded locations - preserve it
          console.log(
            `[UserModal] Preserving location ${locId} (not in loaded locations)`
          );
          return true;
        }
        // Location exists - check if it belongs to a selected licensee
        const belongsToSelectedLicensee =
          location.licenseeId && newSelectedIds.includes(location.licenseeId);
        console.log(`[UserModal] Location ${locId} (${location.name}):`, {
          licenseeId: location.licenseeId,
          belongsToSelectedLicensee,
          willKeep: belongsToSelectedLicensee,
        });
        return belongsToSelectedLicensee;
      });

      console.log('[UserModal] Location filtering result:', {
        before: prevLocationIds.length,
        after: validLocationIds.length,
        removed: prevLocationIds.length - validLocationIds.length,
        validLocationIds,
      });

      if (validLocationIds.length !== prevLocationIds.length) {
        const removedCount = prevLocationIds.length - validLocationIds.length;
        toast.info(
          `${removedCount} location${removedCount > 1 ? 's' : ''} removed because ${removedCount > 1 ? "they don't" : "it doesn't"} belong to the selected licensee${newSelectedIds.length > 1 ? 's' : ''}`
        );
      }

      return validLocationIds;
    });
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

    // Check for validation errors
    if (Object.keys(accountErrors).length > 0) {
      toast.error('Please fix the validation errors before saving');
      return;
    }

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

    // Helper to check if a field value has actually changed
    // CRITICAL: Only return true if the values are genuinely different
    // Treat empty string, null, and undefined as equivalent
    const hasChanged = (
      newValue: string,
      existingValue: string | undefined | null
    ): boolean => {
      const newTrimmed = (newValue || '').trim();
      const existingTrimmed = (existingValue || '').toString().trim();
      
      // Both empty - no change
      if (!newTrimmed && !existingTrimmed) {
        return false;
      }
      
      // Values are different
      return newTrimmed !== existingTrimmed;
    };

    // Build profile update - ONLY include fields that have actually changed
    const profileUpdate: Record<string, unknown> = {};
    const existingProfile = user?.profile || {};

    // Check and include profile fields ONLY if they've changed
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
      // Phone number is optional, but if provided, it must be valid
      if (trimmedPhone && !validatePhoneNumber(trimmedPhone)) {
        toast.error(
          'Please enter a valid phone number (7-20 digits, spaces, hyphens, parentheses, optional leading +)'
        );
        return;
      }
      profileUpdate.phoneNumber = trimmedPhone || undefined;
    }

    // Build address update - ONLY include fields that have actually changed
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

    // CRITICAL: Only include address if it has at least one changed field
    // Don't send empty address object to API
    if (Object.keys(addressUpdate).length > 0) {
      profileUpdate.address = {
        ...existingAddress,
        ...addressUpdate,
      };
    }

    // Build identification update - ONLY include fields that have actually changed
    const identificationUpdate: Record<string, unknown> = {};
    const existingIdentification = existingProfile.identification || {};

    // Handle dateOfBirth specially - normalize for comparison
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

    // CRITICAL: Only include identification if it has at least one changed field
    // Don't send empty identification object to API
    if (Object.keys(identificationUpdate).length > 0) {
      profileUpdate.identification = {
        ...existingIdentification,
        ...identificationUpdate,
      };
    }

    // Check for location and licensee changes BEFORE building update object
    // Handle both 'gaming-locations' (kebab-case) and 'gamingLocations' (camelCase) for backward compatibility
    // Use only new field
    let oldLocationIds: string[] = [];
    if (
      Array.isArray(user?.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      oldLocationIds = user.assignedLocations.map(id => String(id));
    }
    const newLocationIds = selectedLocationIds.map(id => String(id));

    console.log('[UserModal] Location comparison:', {
      oldLocationIds,
      newLocationIds,
      oldCount: oldLocationIds.length,
      newCount: newLocationIds.length,
    });

    // Sort for comparison
    const oldLocationIdsSorted = [...oldLocationIds].sort();
    const newLocationIdsSorted = [...newLocationIds].sort();

    const locationIdsChanged =
      oldLocationIdsSorted.length !== newLocationIdsSorted.length ||
      !oldLocationIdsSorted.every(
        (id, idx) => id === newLocationIdsSorted[idx]
      );

    // Use only new field
    let oldLicenseeIds: string[] = [];
    if (
      Array.isArray(user?.assignedLicensees) &&
      user.assignedLicensees.length > 0
    ) {
      oldLicenseeIds = user.assignedLicensees.map(id => String(id));
    }
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

    // Debug logging for change detection
    console.log('[UserModal] Change Detection Debug:', {
      originalEmail: originalEmail,
      newEmail: newEmail,
      emailChanged: emailChanged,
      usernameChanged: usernameChanged,
      'updatedEmail (raw)': updatedEmail,
      'updatedEmail isEmpty': !updatedEmail || updatedEmail.length === 0,
    });

    // Check if roles have changed
    const originalRoles = (user.roles || [])
      .map(r => String(r).trim().toLowerCase())
      .sort();
    const newRoles = (roles || [])
      .map(r => String(r).trim().toLowerCase())
      .sort();
    const rolesChanged =
      originalRoles.length !== newRoles.length ||
      !originalRoles.every((role, idx) => role === newRoles[idx]);

    // Structure the data properly - ONLY include fields that have ACTUALLY changed
    // CRITICAL: Start with ONLY the _id, then add fields one by one IF they changed
    const updatedUser: Partial<User> & {
      password?: string;
      isEnabled?: boolean; // Backend field name
    } = {
      _id: user._id,
    };

    // ONLY include username if it ACTUALLY changed
    if (usernameChanged) {
      updatedUser.username = updatedUsername;
    }

    // ONLY include email if it ACTUALLY changed AND we can edit it
    if (canEditAccountFields && emailChanged) {
      if (updatedEmail && updatedEmail.trim()) {
        updatedUser.email = updatedEmail.trim();
        updatedUser.emailAddress = updatedEmail.trim();
      } else {
        toast.error('Email address cannot be empty');
        return;
      }
    }

    // ONLY include roles if they ACTUALLY changed
    if (rolesChanged) {
      updatedUser.roles = roles;
    }

    // ONLY include licensees if they ACTUALLY changed
    if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
      // Check if location admin's licensee assignment would change
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
      // Update licensee ONLY if it changed (and user can edit it)
      updatedUser.assignedLicensees = selectedLicenseeIds;
    }

    // ONLY include locations if they ACTUALLY changed
    if (locationIdsChanged) {
      updatedUser.assignedLocations = selectedLocationIds;
      console.log('[UserModal] Locations changed - including in update:', {
        locationCount: selectedLocationIds.length,
        locations: selectedLocationIds,
      });
    }

    // ONLY include profile if it has fields that ACTUALLY changed
    if (Object.keys(profileUpdate).length > 0) {
      updatedUser.profile = {
        ...existingProfile,
        ...profileUpdate,
      } as typeof user.profile;
    }

    // ONLY include profilePicture if it ACTUALLY changed
    const existingProfilePic = (user?.profilePicture || '').trim();
    const newProfilePic = (formData.profilePicture || '').trim();
    if (existingProfilePic !== newProfilePic) {
      updatedUser.profilePicture = newProfilePic || null;
    }

    // ONLY include password if it's being changed
    if (password) {
      updatedUser.password = password;
    }

    // ONLY include isEnabled if it ACTUALLY changed
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

    // Build meaningful changes array MANUALLY based on what actually changed
    // This ensures we only track fields that were genuinely modified
    const meaningfulChanges: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
      path: string;
    }> = [];

    // ONLY add to meaningfulChanges if the field actually changed
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
    // Check if we have any fields in updatedUser besides _id
    const hasAnyChanges =
      Object.keys(updatedUser).filter(key => key !== '_id').length > 0 ||
      meaningfulChanges.length > 0 ||
      locationIdsChanged ||
      licenseeIdsChanged;

    if (!hasAnyChanges) {
      console.error('[UserModal] ❌ No changes detected - blocking save');
      console.error('  This might be a bug if you just made changes!');
      toast.info('No changes detected');
      return;
    }

    // ============================================================================
    // DETAILED CHANGE LOGGING
    // ============================================================================
    console.log('[UserModal] ============================================');
    console.log('[UserModal] CHANGE DETECTION SUMMARY:');
    console.log('[UserModal] ============================================');
    
    // Log each field that changed
    const changeLog = [];
    if (usernameChanged) changeLog.push(`✓ Username: "${user.username}" → "${updatedUsername}"`);
    if (emailChanged) changeLog.push(`✓ Email: "${originalEmail}" → "${newEmail}"`);
    if (rolesChanged) changeLog.push(`✓ Roles: [${originalRoles.join(', ')}] → [${newRoles.join(', ')}]`);
    if (licenseeIdsChanged) changeLog.push(`✓ Licensees: ${oldLicenseeIds.length} → ${newLicenseeIds.length} IDs`);
    if (locationIdsChanged) changeLog.push(`✓ Locations: ${oldLocationIds.length} → ${newLocationIds.length} IDs`);
    if (password) changeLog.push(`✓ Password: being updated`);
    if (updatedUser.isEnabled !== undefined) changeLog.push(`✓ Status: ${user.enabled} → ${updatedUser.isEnabled}`);
    
    // Log profile changes
    if (Object.keys(profileUpdate).length > 0) {
      changeLog.push(`✓ Profile changes detected:`);
      Object.keys(profileUpdate).forEach(key => {
        if (key === 'address') {
          const addrChanges = Object.keys(profileUpdate.address as Record<string, unknown>);
          changeLog.push(`  - Address: ${addrChanges.join(', ')}`);
        } else if (key === 'identification') {
          const idChanges = Object.keys(profileUpdate.identification as Record<string, unknown>);
          changeLog.push(`  - Identification: ${idChanges.join(', ')}`);
        } else {
          changeLog.push(`  - ${key}: "${existingProfile[key as keyof typeof existingProfile]}" → "${profileUpdate[key]}"`);
        }
      });
    }
    
    if (changeLog.length > 0) {
      console.log('[UserModal] Changes to be saved:');
      changeLog.forEach(log => console.log(`[UserModal] ${log}`));
    } else {
      console.log('[UserModal] No changes detected');
    }
    
    console.log('[UserModal] ============================================');
    console.log('[UserModal] Final updatedUser object being sent:');
    console.log('[UserModal]', JSON.stringify(updatedUser, null, 2));
    console.log('[UserModal] ============================================');

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
          {/* Modern Header - Sticky */}
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

          {/* Content Area with Cards */}
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

                  {/* Right: Account Details */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Username Field */}
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

                      {/* Email Field */}
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

                      {/* Phone Number */}
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

                      {/* Gender */}
                      <div>
                        <Label htmlFor="gender" className="text-gray-700">
                          Gender
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <select
                            id="gender"
                            className="mt-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                      {/* First Name */}
                    <div>
                        <Label htmlFor="firstName" className="text-gray-700">
                          First Name
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <Input
                            id="firstName"
                          value={formData.firstName}
                          onChange={e =>
                            handleInputChange('firstName', e.target.value)
                          }
                            placeholder="Enter first name"
                            className="mt-2"
                        />
                      ) : (
                          <p className="mt-2 break-words text-sm text-gray-900">
                          {formData.firstName || 'Not specified'}
                          </p>
                      )}
                    </div>

                      {/* Last Name */}
                    <div>
                        <Label htmlFor="lastName" className="text-gray-700">
                          Last Name
                        </Label>
                        {isLoading ? (
                          <Skeleton className="mt-2 h-10 w-full" />
                        ) : isEditMode ? (
                          <Input
                            id="lastName"
                          value={formData.lastName}
                          onChange={e =>
                            handleInputChange('lastName', e.target.value)
                          }
                            placeholder="Enter last name"
                            className="mt-2"
                        />
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

            {/* Assignments Card - Licensees and Locations */}
            <Card>
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  Licensee and location access permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Licensees and Locations Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Licensees Section */}
                  <div className="space-y-3">
                    <div className="mb-4">
                      <Label className="text-base font-medium text-gray-900">
                        Assigned Licensees
                      </Label>
                      <p className="mt-1 text-sm text-gray-500">
                        Licensees this user has access to
                      </p>
                    </div>

                    {/* For managers and location admins, always show as read-only */}
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
                            showSelectAll={true}
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
                          ? licensees.length === 1
                            ? licensees.map(l => (
                                <span
                                  key={l._id}
                                  className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                >
                                  {l.name}
                                </span>
                              ))
                            : licensees.map(l => (
                                <span
                                  key={l._id}
                                  className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
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

                  {/* Locations Section */}
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
                        {/* Warning if no licensees selected */}
                        {!allLicenseesSelected &&
                          selectedLicenseeIds.length === 0 && (
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-800">
                              ⚠️ Please select at least one licensee first to
                              assign locations
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
                              key={`locations-${selectedLocationIds.join(',')}-${selectedLicenseeIds.join(',')}-${user?._id || 'no-user'}`}
                              options={locationOptions}
                              selectedIds={selectedLocationIds.filter(id =>
                                locationOptions.some(opt => opt.id === id)
                              )}
                              onChange={newSelectedIds => {
                                // When locations are changed via dropdown:
                                // 1. Keep locations that aren't in current options (from other licensees)
                                // 2. Update locations that are in current options based on dropdown selection
                                setSelectedLocationIds(prevLocationIds => {
                                  const locationsNotInOptions =
                                    prevLocationIds.filter(
                                      id =>
                                        !locationOptions.some(
                                          opt => opt.id === id
                                        )
                                    );
                                  // Merge: locations from other licensees + new selections from dropdown
                                  const merged = [
                                    ...locationsNotInOptions,
                                    ...newSelectedIds,
                                  ];
                                  console.log(
                                    '[UserModal] Location selection changed:',
                                    {
                                      previous: prevLocationIds,
                                      notInOptions: locationsNotInOptions,
                                      newFromDropdown: newSelectedIds,
                                      merged: merged,
                                    }
                                  );
                                  return merged;
                                });
                              }}
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
                                        locationName: location.name || 'Unknown',
                                        licenseeName: licensee?.name || 'Unknown',
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
                      <Input
                        id="town"
                      value={formData.town}
                        onChange={e =>
                          handleInputChange('town', e.target.value)
                        }
                        placeholder="Enter town"
                        className="mt-2"
                    />
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
                      <Input
                        id="region"
                      value={formData.region}
                      onChange={e =>
                        handleInputChange('region', e.target.value)
                      }
                        placeholder="Enter region"
                        className="mt-2"
                    />
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
                    <select
                        id="country"
                        className="mt-2 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
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
                    <Label htmlFor="dateOfBirth" className="text-gray-700">
                      Date of Birth
                    </Label>
                  {isEditMode ? (
                      <Input
                        id="dateOfBirth"
                        type="date"
                      value={formData.dateOfBirth}
                      onChange={e =>
                        handleInputChange('dateOfBirth', e.target.value)
                      }
                      placeholder="YYYY-MM-DD"
                        className="mt-2"
                    />
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
                      <Input
                        id="idType"
                      value={formData.idType}
                      onChange={e =>
                        handleInputChange('idType', e.target.value)
                      }
                        placeholder="Enter ID type"
                        className="mt-2"
                    />
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
                      <Input
                        id="idNumber"
                      value={formData.idNumber}
                      onChange={e =>
                        handleInputChange('idNumber', e.target.value)
                      }
                        placeholder="Enter ID number"
                        className="mt-2"
                    />
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

            {/* Roles & Permissions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  User roles, password management, and access control
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                    {/* Password Section - Only show in edit mode */}
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
                      {isEditMode ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                          {availableRoles.map(role => (
                        <label
                              key={role.value}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                            >
                                <Checkbox
                                  id={role.value}
                                  checked={roles.includes(role.value)}
                                  onCheckedChange={checked =>
                              handleRoleChange(role.value, checked === true)
                                  }
                                />
                          <span className="text-sm font-medium text-gray-900">
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
                          ))}
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
              </CardContent>
            </Card>
                      </div>

          {/* Footer - Sticky for Edit Mode */}
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
