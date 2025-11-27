/**
 * User Details Modal Component
 * Read-only modal for viewing user profile details with optional editing.
 *
 * Features:
 * - User profile display (name, email, phone, address, DOB, ID, notes)
 * - Profile picture display with upload option
 * - Read-only view with edit capability
 * - Form validation for phone number
 * - GSAP animations for modal entrance/exit
 * - Toast notifications for success/error
 * - Skeleton loading states
 *
 * @param open - Whether the modal is visible
 * @param user - User object to display
 * @param onClose - Callback to close the modal
 * @param onSave - Callback when user details are saved
 */
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { MultiSelectOption } from '@/components/ui/common/MultiSelectDropdown';
import MultiSelectDropdown from '@/components/ui/common/MultiSelectDropdown';
import CircleCropModal from '@/components/ui/image/CircleCropModal';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { useUserStore } from '@/lib/store/userStore';
import type { UserDetailsModalProps } from '@/lib/types/administration';
import type { Licensee } from '@/lib/types/licensee';
import type { LocationSelectItem } from '@/lib/types/location';
import { validatePhoneNumber } from '@/lib/utils/validation';
import cameraIcon from '@/public/cameraIcon.svg';
import defaultAvatar from '@/public/defaultAvatar.svg';
import gsap from 'gsap';
import { Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export default function UserDetailsModal({
  open,
  user,
  onClose,
  onSave,
}: UserDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Licensee and location state
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [selectedLicenseeIds, setSelectedLicenseeIds] = useState<string[]>([]);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [allLocationsSelected, setAllLocationsSelected] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

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
  const canEditLicensees = isDeveloper || isAdmin; // Only admins/developers can edit licensee assignments

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

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    otherName: '',
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

  // Load licensees when modal opens - only once
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setLicensees([]);
      setSelectedLicenseeIds([]);
      setAllLicenseesSelected(false);
      setLocations([]);
      setSelectedLocationIds([]);
      setAllLocationsSelected(false);
      return;
    }

    let cancelled = false;

    const loadLicensees = async () => {
      setIsLoadingAssignments(true);
      try {
        const result = await fetchLicensees();
        if (cancelled) return;

        let lics = Array.isArray(result.licensees) ? result.licensees : [];

        // Filter licensees for managers - only show their assigned licensees
        if (isManager && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        // For location admins, filter to only show their licensee
        if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        setLicensees(lics);

        // Initialize licensee assignments from user - only if user exists
        if (user) {
          // Use only new field
          let rawLicenseeIds: string[] = [];
          if (Array.isArray(user.assignedLicensees) && user.assignedLicensees.length > 0) {
            rawLicenseeIds = user.assignedLicensees.map(id => String(id));
          }

          if (lics.length > 0 && rawLicenseeIds.length > 0) {
            const normalizedLicenseeIds = rawLicenseeIds.map(value => {
              const idMatch = lics.find(
                lic => String(lic._id) === String(value)
              );
              if (idMatch) {
                return String(idMatch._id);
              }
              const nameMatch = lics.find(
                lic =>
                  lic.name &&
                  lic.name.toLowerCase() === String(value).toLowerCase()
              );
              return nameMatch ? String(nameMatch._id) : String(value);
            });

            setSelectedLicenseeIds(normalizedLicenseeIds);
            setAllLicenseesSelected(
              normalizedLicenseeIds.length > 0 &&
                normalizedLicenseeIds.length === lics.length
            );
          } else {
            setSelectedLicenseeIds([]);
            setAllLicenseesSelected(false);
          }
        } else {
          setSelectedLicenseeIds([]);
          setAllLicenseesSelected(false);
        }
      } catch (error) {
        console.error('Error loading licensees:', error);
        toast.error('Failed to load licensees');
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
  }, [open, isManager, isLocationAdmin, currentUserLicenseeIds, user]);

  // Load locations when modal opens - only once
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadLocations = async () => {
      try {
        // Fetch all locations with showAll parameter for admin access (same as UserModal)
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
            rel?: { licencee?: string };
          }) => ({
            _id: loc._id?.toString() || loc.id?.toString() || '',
            name: loc.name || loc.locationName || 'Unknown Location',
            licenseeId: loc.licenseeId
              ? String(loc.licenseeId)
              : loc.rel?.licencee
                ? String(loc.rel.licencee)
                : null,
          })
        );

        // Filter locations for location admins
        if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
          formattedLocs = formattedLocs.filter((loc: LocationSelectItem) =>
            currentUserLocationPermissions.includes(loc._id)
          );
        }

        setLocations(formattedLocs);

        // Initialize location assignments from user - only if user exists
        if (user) {
          // Use only new field
          let userLocationIds: string[] = [];
          if (Array.isArray(user.assignedLocations) && user.assignedLocations.length > 0) {
            userLocationIds = user.assignedLocations.map(id => String(id));
          }

          setSelectedLocationIds(userLocationIds);
          setAllLocationsSelected(
            userLocationIds.length > 0 &&
              userLocationIds.length === formattedLocs.length
          );
        } else {
          setSelectedLocationIds([]);
          setAllLocationsSelected(false);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        toast.error('Failed to load locations');
      }
    };

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    isAdmin,
    isDeveloper,
    isLocationAdmin,
    currentUserLocationPermissions,
    user,
  ]);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setIsLoading(false);
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        middleName: user.profile?.middleName || '',
        otherName: user.profile?.otherName || '',
        gender: user.profile?.gender || '',
        phoneNumber:
          (user.profile as { phoneNumber?: string } | undefined)?.phoneNumber ||
          (user.profile as { contact?: { phone?: string } } | undefined)
            ?.contact?.phone ||
          '',
        street: user.profile?.address?.street || '',
        town: user.profile?.address?.town || '',
        region: user.profile?.address?.region || '',
        country: user.profile?.address?.country || '',
        postalCode: user.profile?.address?.postalCode || '',
        dateOfBirth: user.profile?.identification?.dateOfBirth || '',
        idType: user.profile?.identification?.idType || '',
        idNumber: user.profile?.identification?.idNumber || '',
        notes: user.profile?.identification?.notes || '',
        profilePicture: user.profilePicture || '',
      });

      // Initialize roles and enabled status
      setRoles(user.roles || []);
      setIsEnabled(user.enabled !== undefined ? user.enabled : true);

      // Initialize licensee and location assignments (after licensees/locations are loaded)
      if (licensees.length > 0) {
        // Use only new field
        let rawLicenseeIds: string[] = [];
        if (Array.isArray(user.assignedLicensees) && user.assignedLicensees.length > 0) {
          rawLicenseeIds = user.assignedLicensees.map(id => String(id));
        }
        if (rawLicenseeIds.length > 0) {
          const normalizedLicenseeIds = rawLicenseeIds.map(value => {
            const idMatch = licensees.find(
              lic => String(lic._id) === String(value)
            );
            if (idMatch) {
              return String(idMatch._id);
            }
            const nameMatch = licensees.find(
              lic =>
                lic.name &&
                lic.name.toLowerCase() === String(value).toLowerCase()
            );
            return nameMatch ? String(nameMatch._id) : String(value);
          });

          setSelectedLicenseeIds(normalizedLicenseeIds);
          setAllLicenseesSelected(
            normalizedLicenseeIds.length > 0 &&
              normalizedLicenseeIds.length === licensees.length
          );
        }
      }

      if (locations.length > 0) {
        // Use only new field
        let userLocationIds: string[] = [];
        if (Array.isArray(user.assignedLocations) && user.assignedLocations.length > 0) {
          userLocationIds = user.assignedLocations.map(id => String(id));
        }

        setSelectedLocationIds(userLocationIds);
        setAllLocationsSelected(
          userLocationIds.length > 0 &&
            userLocationIds.length === locations.length
        );
      }
    } else if (open) {
      // Show loading state when modal is open but user data is not yet available
      setIsLoading(true);
    }
  }, [user, open, licensees, locations]);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
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

  // Licensee selection handlers
  const handleLicenseeChange = useCallback(
    (newSelectedIds: string[]) => {
      setSelectedLicenseeIds(prev => {
        // Check if this is actually a change
        const isSame =
          prev.length === newSelectedIds.length &&
          prev.every(id => newSelectedIds.includes(id)) &&
          newSelectedIds.every(id => prev.includes(id));

        if (isSame) {
          return prev; // No change, return previous state
        }

        return newSelectedIds;
      });

      // Update "All Licensees" checkbox state
      setAllLicenseesSelected(
        newSelectedIds.length === licensees.length && licensees.length > 0
      );

      // Remove selected locations that don't belong to the newly selected licensees
      setSelectedLocationIds(currentLocationIds => {
        const validLocationIds = currentLocationIds.filter(locId => {
          const location = locations.find(l => l._id === locId);
          return (
            location &&
            location.licenseeId &&
            newSelectedIds.includes(location.licenseeId)
          );
        });

        if (validLocationIds.length !== currentLocationIds.length) {
          toast.info(
            "Some locations were removed because they don't belong to the selected licensees"
          );
        }

        return validLocationIds;
      });
    },
    [licensees, locations]
  );

  const handleAllLicenseesChange = useCallback(
    (checked: boolean) => {
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
    },
    [licensees, selectedLocationIds]
  );

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

  const handleAllLocationsChange = useCallback(
    (checked: boolean) => {
      setAllLocationsSelected(checked);
      if (checked) {
        setSelectedLocationIds(availableLocations.map(loc => loc._id));
      } else {
        setSelectedLocationIds([]);
      }
    },
    [availableLocations]
  );

  // Convert to MultiSelect format
  const licenseeOptions: MultiSelectOption[] = licensees.map(lic => ({
    id: String(lic._id),
    label: lic.name,
  }));

  const locationOptions: MultiSelectOption[] = availableLocations.map(loc => ({
    id: loc._id,
    label: loc.name,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure user exists
    if (!user) {
      toast.error('User data is not available');
      return;
    }

    // Validate phone number if provided (optional field)
    if (
      formData.phoneNumber.trim() &&
      !validatePhoneNumber(formData.phoneNumber.trim())
    ) {
      toast.error(
        'Please enter a valid phone number (7-20 digits, spaces, hyphens, parentheses, optional leading +)'
      );
      return;
    }

    // Build profile object matching User type structure
    const profile = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      ...(formData.middleName && { middleName: formData.middleName }),
      ...(formData.otherName && { otherName: formData.otherName }),
      ...(formData.gender && { gender: formData.gender }),
      address: {
        ...(formData.street && { street: formData.street }),
        ...(formData.town && { town: formData.town }),
        ...(formData.region && { region: formData.region }),
        ...(formData.country && { country: formData.country }),
        ...(formData.postalCode && { postalCode: formData.postalCode }),
      },
      identification: {
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.idType && { idType: formData.idType }),
        ...(formData.idNumber && { idNumber: formData.idNumber }),
        ...(formData.notes && { notes: formData.notes }),
      },
      ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber }),
    };

    onSave({
      _id: user._id, // Include _id for user identification
      profile,
      profilePicture: formData.profilePicture || null,
      roles,
      enabled: isEnabled,
      rel: {
        licencee: allLicenseesSelected ? ['all'] : selectedLicenseeIds,
      },
      assignedLicensees: allLicenseesSelected ? ['all'] : selectedLicenseeIds,
      assignedLocations: allLocationsSelected ? ['all'] : selectedLocationIds,
    });
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
              Edit User Details
            </h2>
          </div>
          <form className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
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
                </div>
                <div className="flex w-full flex-col items-center space-y-4 lg:items-start">
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Username:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <input
                        className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                        value={user?.username || ''}
                        disabled
                        placeholder="Username"
                      />
                    )}
                  </div>
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Email Address:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <input
                        type="email"
                        className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                        value={user?.email || user?.emailAddress || ''}
                        disabled
                        placeholder="Email Address"
                      />
                    )}
                  </div>
                  <div className="w-full">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Phone Number:
                    </label>
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <input
                        type="tel"
                        className="w-full rounded-md border border-border bg-white p-3 text-center lg:text-left"
                        value={formData.phoneNumber}
                        onChange={e =>
                          handleInputChange('phoneNumber', e.target.value)
                        }
                        placeholder="Enter Phone Number"
                      />
                    )}
                  </div>
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
                  // Show skeleton loaders for all form fields
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
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.firstName}
                        onChange={e =>
                          handleInputChange('firstName', e.target.value)
                        }
                        placeholder="Enter First Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Last Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.lastName}
                        onChange={e =>
                          handleInputChange('lastName', e.target.value)
                        }
                        placeholder="Enter Last Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Middle Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.middleName}
                        onChange={e =>
                          handleInputChange('middleName', e.target.value)
                        }
                        placeholder="Enter Middle Name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Other Name:
                      </label>
                      <input
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.otherName}
                        onChange={e =>
                          handleInputChange('otherName', e.target.value)
                        }
                        placeholder="Enter Other Name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-900">
                        Gender:
                      </label>
                      <select
                        className="w-full rounded-md border border-border bg-white p-3"
                        value={formData.gender}
                        onChange={e =>
                          handleInputChange('gender', e.target.value)
                        }
                        required
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
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
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.street}
                    onChange={e => handleInputChange('street', e.target.value)}
                    placeholder="Enter Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Town:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.town}
                    onChange={e => handleInputChange('town', e.target.value)}
                    placeholder="Enter Town"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Region:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.region}
                    onChange={e => handleInputChange('region', e.target.value)}
                    placeholder="Enter Region"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Country:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.country}
                    onChange={e => handleInputChange('country', e.target.value)}
                    placeholder="Enter Country"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Postal Code:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.postalCode}
                    onChange={e =>
                      handleInputChange('postalCode', e.target.value)
                    }
                    placeholder="Enter Postal Code"
                  />
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
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.dateOfBirth}
                    onChange={e =>
                      handleInputChange('dateOfBirth', e.target.value)
                    }
                    placeholder="YYYY-MM-DD"
                    type="date"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Type:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.idType}
                    onChange={e => handleInputChange('idType', e.target.value)}
                    placeholder="Enter ID Type"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Number:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formData.idNumber}
                    onChange={e =>
                      handleInputChange('idNumber', e.target.value)
                    }
                    placeholder="Enter ID Number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Notes:
                  </label>
                  <textarea
                    className="min-h-[56px] w-full rounded-md border border-border bg-white p-3"
                    value={formData.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    placeholder="Enter Notes"
                  />
                </div>
              </div>
            </div>

            {/* Licensees and Locations Section */}
            <hr className="my-6 w-full border-gray-400" />
            <div className="flex w-full flex-col items-center">
              <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
                Assignments
              </h3>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                {/* Licensees Section */}
                <div>
                  <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                    Assigned Licensees
                  </h4>
                  {isLoadingAssignments ? (
                    <Skeleton className="h-32 w-full" />
                  ) : !canEditLicensees ? (
                    <div className="text-center">
                      <div className="text-gray-700">
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
                      </div>
                      {isManager && (
                        <p className="mt-2 text-xs italic text-gray-500">
                          Licensee assignments cannot be changed by managers
                        </p>
                      )}
                      {isLocationAdmin && (
                        <p className="mt-2 text-xs italic text-gray-500">
                          Licensee is automatically set to your assigned
                          licensee
                        </p>
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
                <div>
                  <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                    Allowed Locations
                  </h4>
                  {isLoadingAssignments ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
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
                        <>
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

                          {!allLocationsSelected && (
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full rounded-md px-8 py-3 text-lg font-semibold sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full rounded-md bg-button px-8 py-3 text-lg font-semibold text-white hover:bg-buttonActive sm:w-auto"
              >
                Save Changes
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
    </>
  );
}
