import type { User, SortKey } from "@/lib/types/administration";
import type { Licensee } from "@/lib/types/licensee";
import type { AddUserForm, AddLicenseeForm } from "@/lib/types/pages";
import {
  fetchUsers,
  filterAndSortUsers,
  updateUser,
  createUser,
} from "@/lib/helpers/administration";
import {
  fetchLicensees,
  createLicensee,
  updateLicensee,
  deleteLicensee,
} from "@/lib/helpers/licensees";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { getNext30Days } from "@/lib/utils/licensee";
import { toast } from "sonner";

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
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch users:", error);
      }
      toast.error("Failed to load users");
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
      toast.success("User updated successfully");
    } catch {
      toast.error("Failed to update user");
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
    } = addUserForm;

    if (!username || typeof username !== "string") {
      toast.error("Username is required");
      return;
    }
    if (!email || !validateEmail(email)) {
      toast.error("A valid email is required");
      return;
    }
    if (!password || !validatePassword(password)) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      toast.error("At least one role is required");
      return;
    }

    // Map to backend payload
    const payload = {
      username,
      emailAddress: email,
      password,
      roles,
      profile: {
        firstName,
        lastName,
        gender,
      },
      isEnabled: true,
      profilePicture: profilePicture || null,
      resourcePermissions: resourcePermissions || {},
    };

    try {
      await createUser(payload);
      setIsAddUserModalOpen(false);
      await refreshUsers();
      toast.success("User created successfully");
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create user"
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
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch licensees:", error);
      }
      setAllLicensees([]);
      toast.error("Failed to load licensees");
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
      toast.error("Name and country are required");
      return;
    }

    try {
      const result = await createLicensee({
        name: licenseeForm.name,
        description: licenseeForm.description,
        country: licenseeForm.country,
        startDate: licenseeForm.startDate,
        expiryDate: licenseeForm.expiryDate,
      });

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
      toast.success("Licensee created successfully");
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to add licensee"
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

      await updateLicensee(updateData);
      setIsEditLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setLicenseeForm({});
      await refreshLicensees();
      toast.success("Licensee updated successfully");
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update licensee"
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
      await deleteLicensee(selectedLicensee._id);
      setIsDeleteLicenseeModalOpen(false);
      setSelectedLicensee(null);
      await refreshLicensees();
      toast.success("Licensee deleted successfully");
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete licensee"
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

      const response = await fetch("/api/licensees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to update payment status");
        return;
      }

      await refreshLicensees();
      toast.success("Payment status updated successfully");
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update payment status"
      );
    }
  },
};

/**
 * Utility functions for administration page
 */
export const administrationUtils = {
  /**
   * Processes and sorts users based on search and sort configuration
   */
  processUsers: (
    allUsers: User[],
    searchValue: string,
    searchMode: "username" | "email",
    sortConfig: { key: SortKey; direction: "ascending" | "descending" } | null
  ) => {
    return filterAndSortUsers(allUsers, searchValue, searchMode, sortConfig);
  },

  /**
   * Filters licensees based on search value
   */
  filterLicensees: (allLicensees: Licensee[], licenseeSearchValue: string) => {
    if (!licenseeSearchValue) return allLicensees;
    return allLicensees.filter((licensee) =>
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
    sortConfig: { key: SortKey; direction: "ascending" | "descending" } | null,
    setSortConfig: (
      config: { key: SortKey; direction: "ascending" | "descending" } | null
    ) => void,
    setCurrentPage: (page: number) => void
  ) => {
    return (key: SortKey) => {
      let direction: "ascending" | "descending" = "ascending";
      if (
        sortConfig &&
        sortConfig.key === key &&
        sortConfig.direction === "ascending"
      ) {
        direction = "descending";
      }
      setSortConfig({ key, direction });
      setCurrentPage(0);
    };
  },
};
