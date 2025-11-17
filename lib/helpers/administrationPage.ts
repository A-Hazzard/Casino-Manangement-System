import {
  createUser,
  fetchUsers,
  filterAndSortUsers,
  updateUser,
} from '@/lib/helpers/administration';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { ResourcePermissions, SortKey, User } from '@/lib/types/administration';
import type { Licensee } from '@/lib/types/licensee';
import type { AddLicenseeForm, AddUserForm } from '@/lib/types/pages';
import { getNext30Days } from '@/lib/utils/licensee';
import { validateEmail, validatePassword } from '@/lib/utils/validation';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Administration page helper functions for managing section changes and transitions
 */

import type { AdministrationSection } from '@/lib/constants/administration';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Handles section changes with smooth transitions and URL updates
 * @param section - The new section to switch to
 * @param setActiveSection - Function to update active section state
 * @param setCurrentPage - Function to reset pagination
 * @param pathname - Current pathname
 * @param searchParams - Current search parameters
 * @param router - Next.js router instance
 */
export function handleSectionChange(
  section: AdministrationSection,
  setActiveSection: (section: AdministrationSection) => void,
  setCurrentPage: (page: number) => void,
  pathname: string,
  searchParams: URLSearchParams,
  router: AppRouterInstance
) {
  console.log('🔄 [ADMIN HELPER] handleSectionChange called with:', section);

  // Immediately update the active section
  console.log('🔄 [ADMIN HELPER] Setting active section to:', section);
  setActiveSection(section);
  setCurrentPage(0); // Reset pagination when switching sections

  // Update URL based on section
  const params = new URLSearchParams(searchParams.toString());
  if (section === 'users') {
    params.delete('section'); // Default section, no param needed
  } else if (section === 'licensees') {
    params.set('section', 'licensees');
  } else if (section === 'activity-logs') {
    params.set('section', 'activity-logs');
  }

  const newURL = params.toString()
    ? `${pathname}?${params.toString()}`
    : pathname;
  console.log('🔄 [ADMIN HELPER] Navigating to:', newURL);
  router.push(newURL, { scroll: false });
}

/**
 * Handles user management operations
 */
export const userManagement = {
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
      setAllUsers(usersData);
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
      resourcePermissions: Record<string, unknown>;
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
      resourcePermissions,
      licenseeIds,
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
      resourcePermissions: ResourcePermissions;
      rel?: {
        licencee?: string[];
      };
    } = {
      username,
      emailAddress: email,
      password,
      roles,
      profile,
      isEnabled: true,
      profilePicture: profilePicture || null,
      resourcePermissions: resourcePermissions || {},
    };

    // Include licensee assignments (required for all users)
    if (!licenseeIds || !Array.isArray(licenseeIds) || licenseeIds.length === 0) {
      toast.error('A user must be assigned to at least one licensee');
      return;
    }
    payload.rel = {
      licencee: licenseeIds,
    };

    try {
      await createUser(payload);
      setIsAddUserModalOpen(false);
      await refreshUsers();
      toast.success('User created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to create user'
      );
    }
  },
};

/**
 * Handles licensee management operations
 */
export const licenseeManagement = {
  /**
   * Loads all licensees from the API
   */
  loadLicensees: async (
    setAllLicensees: (licensees: Licensee[]) => void,
    setIsLicenseesLoading: (loading: boolean) => void
  ) => {
    setIsLicenseesLoading(true);
    try {
      const licenseesData = await fetchLicensees();
      setAllLicensees(licenseesData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch licensees:', error);
      }
      setAllLicensees([]);
      toast.error('Failed to load licensees');
    }
    setIsLicenseesLoading(false);
  },

  /**
   * Creates a new licensee
   */
  createNewLicensee: async (
    licenseeForm: AddLicenseeForm,
    setIsAddLicenseeModalOpen: (open: boolean) => void,
    setLicenseeForm: (form: AddLicenseeForm) => void,
    setCreatedLicensee: (
      licensee: { name: string; licenseKey: string } | null
    ) => void,
    setIsLicenseeSuccessModalOpen: (open: boolean) => void,
    refreshLicensees: () => Promise<void>
  ) => {
    if (!licenseeForm.name || !licenseeForm.country) {
      toast.error('Name and country are required');
      return;
    }

    try {
      const response = await fetch('/api/licensees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: licenseeForm.name,
          description: licenseeForm.description,
          country: licenseeForm.country,
          startDate: licenseeForm.startDate,
          expiryDate: licenseeForm.expiryDate,
        }),
      });

      const result = await response.json();

      // Show success modal with license key
      if (result.licensee && result.licensee.licenseKey) {
        setCreatedLicensee({
          name: result.licensee.name,
          licenseKey: result.licensee.licenseKey,
        });
        setIsLicenseeSuccessModalOpen(true);
      }

      setIsAddLicenseeModalOpen(false);
      setLicenseeForm({});
      await refreshLicensees();
      toast.success('Licensee created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to add licensee'
      );
    }
  },

  /**
   * Updates an existing licensee
   */
  updateExistingLicensee: async (
    selectedLicensee: Licensee,
    licenseeForm: AddLicenseeForm,
    setIsEditLicenseeModalOpen: (open: boolean) => void,
    setSelectedLicensee: (licensee: Licensee | null) => void,
    setLicenseeForm: (form: AddLicenseeForm) => void,
    refreshLicensees: () => Promise<void>
  ) => {
    try {
      // Include the current isPaid value to preserve payment status
      const updateData = {
        ...licenseeForm,
        _id: selectedLicensee._id,
        isPaid: selectedLicensee.isPaid, // Preserve current payment status
      };

      const response = await fetch(`/api/licensees/${selectedLicensee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update licensee');
      }
      setIsEditLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setLicenseeForm({});
      await refreshLicensees();
      toast.success('Licensee updated successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update licensee'
      );
    }
  },

  /**
   * Deletes a licensee
   */
  deleteExistingLicensee: async (
    selectedLicensee: Licensee,
    setIsDeleteLicenseeModalOpen: (open: boolean) => void,
    setSelectedLicensee: (licensee: Licensee | null) => void,
    refreshLicensees: () => Promise<void>
  ) => {
    try {
      const response = await fetch(`/api/licensees/${selectedLicensee._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete licensee');
      }
      setIsDeleteLicenseeModalOpen(false);
      setSelectedLicensee(null);
      await refreshLicensees();
      toast.success('Licensee deleted successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete licensee'
      );
    }
  },

  /**
   * Toggles payment status for a licensee
   */
  togglePaymentStatus: async (
    selectedLicenseeForPaymentChange: Licensee,
    refreshLicensees: () => Promise<void>
  ) => {
    try {
      // Determine current payment status
      const currentIsPaid =
        selectedLicenseeForPaymentChange.isPaid !== undefined
          ? selectedLicenseeForPaymentChange.isPaid
          : selectedLicenseeForPaymentChange.expiryDate
            ? new Date(selectedLicenseeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      // Prepare update data
      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenseeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      // If changing from unpaid to paid, extend expiry date by 30 days
      if (!currentIsPaid && newIsPaid) {
        updateData.prevExpiryDate = selectedLicenseeForPaymentChange.expiryDate
          ? new Date(selectedLicenseeForPaymentChange.expiryDate)
          : undefined;
        updateData.expiryDate = getNext30Days();
      }

      await axios.put('/api/licensees', updateData);

      await refreshLicensees();
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
 * Utility functions for administration page
 */
export const administrationUtils = {
  /**
   * User management operations
   */
  userManagement,

  /**
   * Licensee management operations
   */
  licenseeManagement,

  /**
   * Processes and sorts users based on search and sort configuration
   */
  processUsers: (
    allUsers: User[],
    searchValue: string,
    searchMode: 'username' | 'email',
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null
  ) => {
    return filterAndSortUsers(allUsers, searchValue, searchMode, sortConfig);
  },

  /**
   * Filters licensees based on search value
   */
  filterLicensees: (allLicensees: Licensee[], licenseeSearchValue: string) => {
    if (!licenseeSearchValue) return allLicensees;
    return allLicensees.filter(licensee =>
      licensee.name.toLowerCase().includes(licenseeSearchValue.toLowerCase())
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
    ) => void,
    setCurrentPage: (page: number) => void
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
      setCurrentPage(0);
    };
  },
};
