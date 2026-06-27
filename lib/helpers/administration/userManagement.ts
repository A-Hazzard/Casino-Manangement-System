/**
 * User Management Helpers
 *
 * Handles user CRUD operations for the administration page including
 * loading, creating, and saving users with validation.
 *
 * Features:
 * - loadUsers: Fetches all users from the API
 * - saveUser: Updates an existing user
 * - createNewUser: Creates a new user with full validation
 */

import type { User } from '@/lib/types/administration';
import type { AddUserForm } from '@/lib/types/pages';
import { validateEmail } from '@/lib/utils/validation/email';
import { validatePassword } from '@/lib/utils/validation/password';
import { createUser, fetchUsers, updateUser } from './data';
import { toast } from 'sonner';

type CreateUserAddress = {
  street?: string;
  town?: string;
  region?: string;
  country?: string;
  postalCode?: string;
};

type CreateUserIdentification = {
  dateOfBirth?: Date;
  idType?: string;
  idNumber?: string;
  notes?: string;
};

type CreateUserProfile = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  gender?: string;
  address?: CreateUserAddress;
  identification?: CreateUserIdentification;
};

type CreateUserPayload = {
  username: string;
  emailAddress: string;
  password: string;
  roles: string[];
  profile: CreateUserProfile;
  isEnabled: boolean;
  profilePicture: string | null;
  assignedLicencees?: string[];
  assignedLocations?: string[];
  moneyInMultiplier?: number;
  moneyOutAndJackpotMultiplier?: number;
  reviewerMultiplierStartTime?: Date | string | null;
};

// ============================================================================
// User Management Object
// ============================================================================

export const userManagement = {
  /**
   * Loads all users from the API
   */
  loadUsers: async (
    setAllUsers: (users: User[]) => void,
    setIsLoading: (loading: boolean) => void
  ): Promise<void> => {
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
  ): Promise<void> => {
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
  ): Promise<void> => {
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
      moneyInMultiplier,
      moneyOutAndJackpotMultiplier,
      reviewerMultiplierStartTime,
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

    const profile: CreateUserProfile = {};
    if (firstName) profile.firstName = firstName.trim();
    if (lastName) profile.lastName = lastName.trim();
    if (gender) profile.gender = gender.trim().toLowerCase();
    if (addUserForm.phoneNumber) {
      profile.phoneNumber = addUserForm.phoneNumber.trim();
    }

    const address: CreateUserAddress = {};
    if (street) address.street = street.trim();
    if (town) address.town = town.trim();
    if (region) address.region = region.trim();
    if (country) address.country = country.trim();
    if (postalCode) address.postalCode = postalCode.trim();
    if (Object.keys(address).length > 0) {
      profile.address = address;
    }

    const identification: CreateUserIdentification = {};
    if (dateOfBirth) {
      identification.dateOfBirth = new Date(dateOfBirth);
    }
    if (idType) identification.idType = idType.trim();
    if (idNumber) identification.idNumber = idNumber.trim();
    if (notes) identification.notes = notes.trim();
    if (Object.keys(identification).length > 0) {
      profile.identification = identification;
    }

    const payload: CreateUserPayload = {
      username,
      emailAddress: email,
      password,
      roles,
      profile,
      isEnabled: true,
      profilePicture: profilePicture || null,
    };

    if (roles.includes('reviewer')) {
      if (moneyInMultiplier !== undefined && moneyInMultiplier !== null) {
        payload.moneyInMultiplier = moneyInMultiplier;
      }
      if (
        moneyOutAndJackpotMultiplier !== undefined &&
        moneyOutAndJackpotMultiplier !== null
      ) {
        payload.moneyOutAndJackpotMultiplier = moneyOutAndJackpotMultiplier;
      }
      if (reviewerMultiplierStartTime) {
        payload.reviewerMultiplierStartTime = reviewerMultiplierStartTime;
      }
    }

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
        toast.error(
          'Vault Managers and Cashiers can only be assigned to one licencee'
        );
        return;
      }
      if (allowedLocations && allowedLocations.length > 1) {
        toast.error(
          'Vault Managers and Cashiers can only be assigned to one location'
        );
        return;
      }
    }

    payload.assignedLicencees = licenceeIds;

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
      let errorMessage = 'Failed to create user';

      if (process.env.NODE_ENV === 'development') {
        console.error('User creation error:', err);
      }

      if (err && typeof err === 'object') {
        const axiosError = err as {
          response?: {
            data?: { message?: string; error?: string };
            status?: number;
          };
          message?: string;
        };

        if (axiosError.response?.data) {
          errorMessage =
            axiosError.response.data.message ||
            axiosError.response.data.error ||
            errorMessage;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  },
};
