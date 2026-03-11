import { fetchLicencees } from '@/lib/helpers/client';
import type { SortKey, User } from '@/lib/types/administration';
import type { Licencee } from '@/lib/types/common';
import type { AddLicenceeForm, AddUserForm } from '@/lib/types/pages';
import { getNext30Days } from '@/lib/utils/licencee';
import { validateEmail, validatePassword } from '@/lib/utils/validation';
import {
  createUser,
  fetchUsers,
  filterAndSortUsers,
  updateUser,
} from './data';
// AdministrationSection and AppRouterInstance imports removed - handleSectionChange function was removed
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Administration page helper functions for managing section changes and transitions
 */

const userManagement = {
  /**
   * Loads all users from the API
   */
  loadUsers: async (
    setAllUsers: (users: User[]) => void,
    setIsLoading: (loading: boolean) => void
  ) => {
    setIsLoading(true);
    try {
      const usersData = await fetchUsers();
      setAllUsers(usersData.users);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch users:', error);
      }
      toast.error('Failed to load users');
    }
    setIsLoading(false);
  },

  /**
   * Saves user updates
   */
  saveUser: async (
    selectedUser: User,
    updated: Partial<User> & {
      password?: string;
    },
    setIsRolesModalOpen: (open: boolean) => void,
    setSelectedUser: (user: User | null) => void,
    refreshUsers: () => Promise<void>
  ) => {
    try {
      await updateUser({ ...updated, _id: selectedUser._id });
      setIsRolesModalOpen(false);
      setSelectedUser(null);
      await refreshUsers();
      toast.success('User updated successfully');
    } catch {
      toast.error('Failed to update user');
    }
  },

  /**
   * Creates a new user
   */
  createNewUser: async (
    addUserForm: AddUserForm,
    setIsAddUserModalOpen: (open: boolean) => void,
    refreshUsers: () => Promise<void>
  ) => {
    // Frontend validation
    const {
      username,
      email,
      password,
      roles,
      firstName,
      lastName,
      gender,
      profilePicture,
      licenceeIds,
      allowedLocations,
      street,
      town,
      region,
      country,
      postalCode,
      dateOfBirth,
      idType,
      idNumber,
      notes,
    } = addUserForm;

    if (!username || typeof username !== 'string') {
      toast.error('Username is required');
      return;
    }
    if (!email || !validateEmail(email)) {
      toast.error('A valid email is required');
      return;
    }
    if (!password || !validatePassword(password)) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      toast.error('At least one role is required');
      return;
    }

    // Build profile object with all fields
    const profile: Record<string, unknown> = {};
    if (firstName) profile.firstName = firstName.trim();
    if (lastName) profile.lastName = lastName.trim();
    if (gender) profile.gender = gender.trim().toLowerCase();
    if (addUserForm.phoneNumber) {
      profile.phoneNumber = addUserForm.phoneNumber.trim();
    }

    // Build address object
    const address: Record<string, unknown> = {};
    if (street) address.street = street.trim();
    if (town) address.town = town.trim();
    if (region) address.region = region.trim();
    if (country) address.country = country.trim();
    if (postalCode) address.postalCode = postalCode.trim();
    if (Object.keys(address).length > 0) {
      profile.address = address;
    }

    // Build identification object
    const identification: Record<string, unknown> = {};
    if (dateOfBirth) {
      identification.dateOfBirth = new Date(dateOfBirth);
    }
    if (idType) identification.idType = idType.trim();
    if (idNumber) identification.idNumber = idNumber.trim();
    if (notes) identification.notes = notes.trim();
    if (Object.keys(identification).length > 0) {
      profile.identification = identification;
    }

    // Map to backend payload
    const payload: {
      username: string;
      emailAddress: string;
      password: string;
      roles: string[];
      profile: Record<string, unknown>;
      isEnabled: boolean;
      profilePicture: string | null;
      assignedLicencees?: string[];
      assignedLocations?: string[];
    } = {
      username,
      emailAddress: email,
      password,
      roles,
      profile,
      isEnabled: true,
      profilePicture: profilePicture || null,
    };

    // Include licencee assignments (required for all users)
    if (
      !licenceeIds ||
      !Array.isArray(licenceeIds) ||
      licenceeIds.length === 0
    ) {
      toast.error('A user must be assigned to at least one licencee');
      return;
    }

    if (roles.includes('vault-manager') || roles.includes('cashier')) {
      if (licenceeIds.length > 1) {
        toast.error('Vault Managers and Cashiers can only be assigned to one licencee');
        return;
      }
      if (allowedLocations && allowedLocations.length > 1) {
        toast.error('Vault Managers and Cashiers can only be assigned to one location');
        return;
      }
    }

    payload.assignedLicencees = licenceeIds;

    // Include location assignments if provided
    if (
      allowedLocations &&
      Array.isArray(allowedLocations) &&
      allowedLocations.length > 0
    ) {
      payload.assignedLocations = allowedLocations;
    }

    try {
      await createUser(payload);
      setIsAddUserModalOpen(false);
      await refreshUsers();
      toast.success('User created successfully');
    } catch (err) {
      // Handle axios errors - axios wraps errors in AxiosError
      let errorMessage = 'Failed to create user';

      // Log the full error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('User creation error:', err);
      }

      if (err && typeof err === 'object') {
        // Check if it's an axios error with response data
        const axiosError = err as {
          response?: {
            data?: { message?: string; error?: string };
            status?: number;
          };
          message?: string;
        };

        // Prioritize server error message from response.data
        if (axiosError.response?.data) {
          errorMessage =
            axiosError.response.data.message ||
            axiosError.response.data.error ||
            errorMessage;
        } else if (axiosError.message) {
          // Only use axios message if we don't have response data
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  },
};

/**
 * Handles licencee management operations
 */
const licenceeManagement = {
  /**
   * Loads all licencees from the API
   */
  loadLicencees: async (
    setAllLicencees: (licencees: Licencee[]) => void,
    setIsLicenceesLoading: (loading: boolean) => void
  ) => {
    setIsLicenceesLoading(true);
    try {
      const result = await fetchLicencees();
      // Extract licencees array from the result
      const licenceesData = Array.isArray(result.licencees)
        ? result.licencees
        : [];
      setAllLicencees(licenceesData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch licencees:', error);
      }
      setAllLicencees([]);
      toast.error('Failed to load licencees');
    }
    setIsLicenceesLoading(false);
  },

  /**
   * Creates a new licencee
   */
  createNewLicencee: async (
    licenceeForm: AddLicenceeForm,
    setIsAddLicenceeModalOpen: (open: boolean) => void,
    setLicenceeForm: (form: AddLicenceeForm) => void,
    setCreatedLicencee: (
      licencee: { name: string; licenceKey: string } | null
    ) => void,
    setIsLicenceeSuccessModalOpen: (open: boolean) => void,
    refreshLicencees: () => Promise<void>
  ) => {
    if (!licenceeForm.name || !licenceeForm.country) {
      toast.error('Name and country are required');
      return;
    }

    try {
      const response = await fetch('/api/licencees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: licenceeForm.name,
          country: licenceeForm.country,
          startDate: licenceeForm.startDate,
          expiryDate: licenceeForm.expiryDate,
        }),
      });

      const result = await response.json();

      // Show success modal with licence key
      if (result.licencee && result.licencee.licenceKey) {
        setCreatedLicencee({
          name: result.licencee.name,
          licenceKey: result.licencee.licenceKey,
        });
        setIsLicenceeSuccessModalOpen(true);
      }

      setIsAddLicenceeModalOpen(false);
      setLicenceeForm({});
      await refreshLicencees();
      toast.success('Licencee created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add licencee'
      );
    }
  },

  /**
   * Updates an existing licencee
   */
  updateExistingLicencee: async (
    selectedLicencee: Licencee,
    licenceeForm: AddLicenceeForm,
    setIsEditLicenceeModalOpen: (open: boolean) => void,
    setSelectedLicencee: (licencee: Licencee | null) => void,
    setLicenceeForm: (form: AddLicenceeForm) => void,
    refreshLicencees: () => Promise<void>
  ) => {
    try {
      // Include the current isPaid value to preserve payment status
      const updateData = {
        ...licenceeForm,
        _id: selectedLicencee._id,
        isPaid: selectedLicencee.isPaid, // Preserve current payment status
      };

      const response = await fetch(`/api/licencees/${selectedLicencee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update licencee');
      }
      setIsEditLicenceeModalOpen(false);
      setSelectedLicencee(null);
      setLicenceeForm({});
      await refreshLicencees();
      toast.success('Licencee updated successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update licencee'
      );
    }
  },

  /**
   * Deletes a licencee
   */
  deleteExistingLicencee: async (
    selectedLicencee: Licencee,
    setIsDeleteLicenceeModalOpen: (open: boolean) => void,
    setSelectedLicencee: (licencee: Licencee | null) => void,
    refreshLicencees: () => Promise<void>
  ) => {
    try {
      const response = await fetch(`/api/licencees/${selectedLicencee._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete licencee');
      }
      setIsDeleteLicenceeModalOpen(false);
      setSelectedLicencee(null);
      await refreshLicencees();
      toast.success('Licencee deleted successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete licencee'
      );
    }
  },

  /**
   * Toggles payment status for a licencee
   */
  togglePaymentStatus: async (
    selectedLicenceeForPaymentChange: Licencee,
    refreshLicencees: () => Promise<void>
  ) => {
    try {
      // Determine current payment status
      const currentIsPaid =
        selectedLicenceeForPaymentChange.isPaid !== undefined
          ? selectedLicenceeForPaymentChange.isPaid
          : selectedLicenceeForPaymentChange.expiryDate
            ? new Date(selectedLicenceeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      // Prepare update data
      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenceeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      // If changing from unpaid to paid, extend expiry date by 30 days
      if (!currentIsPaid && newIsPaid) {
        updateData.prevExpiryDate = selectedLicenceeForPaymentChange.expiryDate
          ? new Date(selectedLicenceeForPaymentChange.expiryDate)
          : undefined;
        updateData.expiryDate = getNext30Days();
      }

      await axios.put('/api/licencees', updateData);

      await refreshLicencees();
      toast.success('Payment status updated successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update payment status'
      );
    }
  },
};

/**
 * Handles location management operations
 */
const locationManagement = {
  /**
   * Loads all locations for the administration user
   * @param options - Optional filters (showAll, forceAll)
   * @returns Promise resolving to an array of locations
   */
  loadLocations: async (options: { showAll?: boolean; forceAll?: boolean } = {}) => {
    try {
      const { showAll = true, forceAll = true } = options;
      const response = await axios.get('/api/locations', {
        params: { showAll, forceAll }
      });

      const locationsList = response.data?.locations || [];

      return locationsList.map((loc: { _id?: string; id?: string; name?: string; locationName?: string; licenceeId?: string }) => ({
        _id: loc._id?.toString() || loc.id?.toString() || '',
        name: loc.name || loc.locationName || 'Unknown Location',
        licenceeId: loc.licenceeId ? String(loc.licenceeId) : null,
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch locations:', error);
      }
      toast.error('Failed to load locations');
      return [];
    }
  },
};

/**
 * Handles section changes with smooth transitions and URL updates
 */
// handleSectionChange function removed - not used (hooks have their own implementations)

/**
 * Utility functions for administration page
 */
export const administrationUtils = {
  /**
   * User management operations
   */
  userManagement,

  /**
   * Licencee management operations
   */
  licenceeManagement,

  /**
   * Location management operations
   */
  locationManagement,

  // handleSectionChange removed - not used (hooks have their own implementations)

  /**
   * Checks if a user is a test account based on username, email, first name, or last name
   */
  isTestUser: (user: User): boolean => {
    const testPattern = /^test/i;
    const username = user.username?.trim() || '';
    const email = (user.email || user.emailAddress || '').trim();
    const firstName = user.profile?.firstName?.trim() || '';
    const lastName = user.profile?.lastName?.trim() || '';

    return (
      testPattern.test(username) ||
      testPattern.test(email) ||
      testPattern.test(firstName) ||
      testPattern.test(lastName)
    );
  },

  /**
   * Filters out test users unless the current user is a developer
   */
  filterTestUsers: (users: User[], isDeveloper: boolean): User[] => {
    if (isDeveloper) {
      return users; // Developers can see all users including test accounts
    }
    return users.filter(user => !administrationUtils.isTestUser(user));
  },

  processUsers: (
    allUsers: User[],
    searchValue: string,
    searchMode: 'username' | 'email' | '_id',
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null,
    isDeveloper: boolean = false
  ) => {
    // First filter out test users (unless developer)
    const filteredUsers = administrationUtils.filterTestUsers(
      allUsers,
      isDeveloper
    );
    // Then apply search and sort
    return filterAndSortUsers(
      filteredUsers,
      searchValue,
      searchMode,
      sortConfig
    );
  },

  /**
   * Filters licencees based on search value
   */
  filterLicencees: (allLicencees: Licencee[], licenceeSearchValue: string) => {
    if (!licenceeSearchValue) return allLicencees;
    return allLicencees.filter(licencee =>
      licencee.name.toLowerCase().includes(licenceeSearchValue.toLowerCase())
    );
  },

  /**
   * Creates pagination data
   */
  paginate: <T>(items: T[], currentPage: number, itemsPerPage: number) => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
    return { paginatedItems, totalPages };
  },

  /**
   * Creates sort request handler
   */
  createSortHandler: (
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null,
    setSortConfig: (
      config: { key: SortKey; direction: 'ascending' | 'descending' } | null
    ) => void
  ) => {
    return (key: SortKey) => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (
        sortConfig &&
        sortConfig.key === key &&
        sortConfig.direction === 'ascending'
      ) {
        direction = 'descending';
      }
      setSortConfig({ key, direction });
    };
  },
};

