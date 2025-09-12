"use client";
import DeleteUserModal from "@/components/administration/DeleteUserModal";
import SearchFilterBar from "@/components/administration/SearchFilterBar";
import UserCard from "@/components/administration/UserCard";
import UserCardSkeleton from "@/components/administration/UserCardSkeleton";
import UserTable from "@/components/administration/UserTable";
import UserTableSkeleton from "@/components/administration/UserTableSkeleton";
import LicenseeCardSkeleton from "@/components/administration/LicenseeCardSkeleton";
import LicenseeTableSkeleton from "@/components/administration/LicenseeTableSkeleton";
import PageLayout from "@/components/layout/PageLayout";

import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/ui/PaginationControls";
import AdministrationNavigation from "@/components/administration/AdministrationNavigation";
import { ADMINISTRATION_TABS_CONFIG } from "@/lib/constants/administration";
import type { AdministrationSection } from "@/lib/constants/administration";
import { createActivityLogger } from "@/lib/helpers/activityLogger";
import {
  fetchUsers,
  updateUser,
  createUser,
} from "@/lib/helpers/administration";
import type {
  ResourcePermissions,
  SortKey,
  User,
} from "@/lib/types/administration";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IMAGES } from "@/lib/constants/images";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import UserModal from "@/components/administration/UserModal";
import AddUserDetailsModal from "@/components/administration/AddUserDetailsModal";
import AddUserRolesModal from "@/components/administration/AddUserRolesModal";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import LicenseeTable from "@/components/administration/LicenseeTable";
import { handleSectionChange, administrationUtils } from "@/lib/helpers/administrationPage";
import LicenseeCard from "@/components/administration/LicenseeCard";
import AddLicenseeModal from "@/components/administration/AddLicenseeModal";
import EditLicenseeModal from "@/components/administration/EditLicenseeModal";
import DeleteLicenseeModal from "@/components/administration/DeleteLicenseeModal";
import {
  fetchLicensees,
  createLicensee,
  updateLicensee,
  deleteLicensee,
} from "@/lib/helpers/licensees";
import type { Licensee } from "@/lib/types/licensee";
import LicenseeSearchBar from "@/components/administration/LicenseeSearchBar";
import ActivityLogsTable from "@/components/administration/ActivityLogsTable";
import ActivityLogModal from "@/components/administration/ActivityLogModal";
import PaymentHistoryModal from "@/components/administration/PaymentHistoryModal";
import UserActivityLogModal from "@/components/administration/UserActivityLogModal";
import LicenseeSuccessModal from "@/components/administration/LicenseeSuccessModal";
import PaymentStatusConfirmModal from "@/components/administration/PaymentStatusConfirmModal";
import { getNext30Days } from "@/lib/utils/licensee";
import { toast } from "sonner";

import type { AddUserForm, AddLicenseeForm } from "@/lib/types/pages";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import axios from "axios";

function AdministrationPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  // Prevent hydration mismatch by rendering content only on client
  const [__mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Create activity loggers
  const userLogger = createActivityLogger("user");
  const licenseeLogger = createActivityLogger("licensee");

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee("");
    }
  }, [selectedLicencee, setSelectedLicencee]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Get active section from URL search params, default to "users"
  const getActiveSectionFromURL = useCallback((): AdministrationSection => {
    const section = searchParams.get("section");
    if (section === "licensees") return "licensees";
    if (section === "activity-logs") return "activity-logs";
    return "users";
  }, [searchParams]);

  const [activeSection, setActiveSection] = useState<AdministrationSection>(
    getActiveSectionFromURL()
  );
  const [searchValue, setSearchValue] = useState("");
  const [searchMode, setSearchMode] = useState<"username" | "email">(
    "username"
  );
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  } | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(
    null
  );
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserStep, setAddUserStep] = useState<1 | 2>(1);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>({
    roles: [],
    allowedLocations: [],
  });
  const [allLicensees, setAllLicensees] = useState<Licensee[]>([]);
  const [isLicenseesLoading, setIsLicenseesLoading] = useState(true);
  const [isAddLicenseeModalOpen, setIsAddLicenseeModalOpen] = useState(false);
  const [isEditLicenseeModalOpen, setIsEditLicenseeModalOpen] = useState(false);
  const [isDeleteLicenseeModalOpen, setIsDeleteLicenseeModalOpen] =
    useState(false);
  const [selectedLicensee, setSelectedLicensee] = useState<Licensee | null>(
    null
  );
  const [licenseeForm, setLicenseeForm] = useState<AddLicenseeForm>({});
  const [licenseeSearchValue, setLicenseeSearchValue] = useState("");
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [selectedLicenseeForPayment, setSelectedLicenseeForPayment] =
    useState<Licensee | null>(null);
  const [isUserActivityLogModalOpen, setIsUserActivityLogModalOpen] =
    useState(false);
  const [createdLicensee, setCreatedLicensee] = useState<{
    name: string;
    licenseKey: string;
  } | null>(null);
  const [isLicenseeSuccessModalOpen, setIsLicenseeSuccessModalOpen] =
    useState(false);
  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] =
    useState(false);
  const [
    selectedLicenseeForPaymentChange,
    setSelectedLicenseeForPaymentChange,
  ] = useState<Licensee | null>(null);

  const itemsPerPage = 5;

  // Handle section changes with URL updates
  const handleSectionChangeLocal = (section: AdministrationSection) => {
    handleSectionChange(
      section,
      setActiveSection,
      setCurrentPage,
      pathname,
      searchParams,
      router
    );
  };

  // Sync state with URL changes
  useEffect(() => {
    const newSection = getActiveSectionFromURL();
    if (newSection !== activeSection) {
      setActiveSection(newSection);
    }
  }, [searchParams, activeSection, getActiveSectionFromURL]);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const usersData = await fetchUsers(selectedLicencee);
        setAllUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
      setIsLoading(false);
    };
    loadUsers();
  }, [selectedLicencee]);

  useEffect(() => {
    const loadLicensees = async () => {
      setIsLicenseesLoading(true);
      try {
        const licenseesData = await fetchLicensees(selectedLicencee);
        setAllLicensees(licenseesData);
      } catch (error) {
        console.error("Failed to fetch licensees:", error);
        setAllLicensees([]);
      }
      setIsLicenseesLoading(false);
    };
    loadLicensees();
  }, [selectedLicencee]);

  const processedUsers = useMemo(() => {
    return administrationUtils.processUsers(allUsers, searchValue, searchMode, sortConfig);
  }, [allUsers, searchValue, searchMode, sortConfig]);

  const { paginatedItems: paginatedUsers, totalPages } = useMemo(() => {
    return administrationUtils.paginate(processedUsers, currentPage, itemsPerPage);
  }, [processedUsers, currentPage, itemsPerPage]);

  const requestSort = administrationUtils.createSortHandler(sortConfig, setSortConfig, setCurrentPage);

  const handleEditUser = async (user: User) => {
    // Set loading state and open modal first
    setIsUserModalOpen(true);
    setSelectedUser(null); // Set to null initially to trigger loading state
    
    try {
      // Fetch detailed user information
      const response = await axios.get(`/api/users/${user._id}`);
      if (response.data.success) {
        setSelectedUser(response.data.user);
      } else {
        toast.error("Failed to load user details");
        setIsUserModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      toast.error("Failed to load user details");
      setIsUserModalOpen(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (
    updated: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
    }
  ) => {
    if (!selectedUser) return;

    const previousData = { ...selectedUser };
    const newData = { ...updated, _id: selectedUser._id };

    try {
      await updateUser(newData);

      // Log the update activity
      await userLogger.logUpdate(
        selectedUser._id,
        selectedUser.username,
        previousData,
        newData,
        `Updated user profile and permissions for ${selectedUser.username}`
      );

      setIsUserModalOpen(false);
      setSelectedUser(null);
      // Refresh users with licensee filter
      const usersData = await fetchUsers(selectedLicencee);
      setAllUsers(usersData);
      toast.success("User updated successfully");
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  };


  // Add User modal handlers
  const openAddUserModal = () => {
    setAddUserStep(1);
    setAddUserForm({ roles: [], allowedLocations: [] });
    setIsAddUserModalOpen(true);
  };
  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false);
  };
  const handleAddUserNext = () => setAddUserStep(2);
  const handleAddUserBack = () => setAddUserStep(1);
  const handleAddUserSave = async () => {
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
        firstName: firstName || "",
        lastName: lastName || "",
        gender: gender || "",
      },
      isEnabled: true,
      profilePicture: profilePicture || null,
      resourcePermissions: resourcePermissions || {},
    };
    try {
      const createdUser = await createUser(payload);

      // Log the creation activity
      await userLogger.logCreate(
        createdUser._id || username,
        username,
        payload,
        `Created new user: ${username} with roles: ${roles.join(", ")}`
      );

      setIsAddUserModalOpen(false);
      // Refresh users
      const usersData = await fetchUsers();
      setAllUsers(usersData);
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
  };
  const handleAddUserFormChange = (data: Partial<AddUserForm>) =>
    setAddUserForm((prev) => ({ ...prev, ...data }));

  const handleOpenAddLicensee = () => {
    setLicenseeForm({});
    setIsAddLicenseeModalOpen(true);
  };
  const handleSaveAddLicensee = async () => {
    if (!licenseeForm.name || !licenseeForm.country) {
      toast.error("Name and country are required");
      return;
    }

    const licenseeData: {
      name: string;
      description?: string;
      country: string;
      startDate?: Date | string;
      expiryDate?: Date | string;
    } = {
      name: licenseeForm.name,
      country: licenseeForm.country,
    };

    // Only add optional fields if they have values
    if (licenseeForm.description) {
      licenseeData.description = licenseeForm.description;
    }
    if (licenseeForm.startDate) {
      licenseeData.startDate = licenseeForm.startDate;
    }
    if (licenseeForm.expiryDate) {
      licenseeData.expiryDate = licenseeForm.expiryDate;
    }

    try {
      const result = await createLicensee(licenseeData);

      // Log the creation activity
      if (result.licensee) {
        await licenseeLogger.logCreate(
          result.licensee._id,
          result.licensee.name,
          licenseeData,
          `Created new licensee: ${result.licensee.name} in ${licenseeForm.country}`
        );
      }

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
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);
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
  };
  const handleOpenEditLicensee = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setLicenseeForm({
      _id: licensee._id,
      name: licensee.name,
      description: licensee.description,
      country: licensee.country,
      startDate: licensee.startDate ? new Date(licensee.startDate) : undefined,
      expiryDate: licensee.expiryDate
        ? new Date(licensee.expiryDate)
        : undefined,
      prevStartDate: licensee.prevStartDate
        ? new Date(licensee.prevStartDate)
        : undefined,
      prevExpiryDate: licensee.prevExpiryDate
        ? new Date(licensee.prevExpiryDate)
        : undefined,
    });
    setIsEditLicenseeModalOpen(true);
  };
  const handleSaveEditLicensee = async () => {
    try {
      if (!selectedLicensee) return;

      const previousData = { ...selectedLicensee };

      // Include the current isPaid value to preserve payment status
      const updateData = {
        ...licenseeForm,
        _id: selectedLicensee._id,
        isPaid: selectedLicensee.isPaid, // Preserve current payment status
      };

      await updateLicensee(updateData);

      // Log the update activity
      await licenseeLogger.logUpdate(
        selectedLicensee._id,
        selectedLicensee.name,
        previousData,
        updateData,
        `Updated licensee: ${selectedLicensee.name} - Modified details and settings`
      );

      setIsEditLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setLicenseeForm({});
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);
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
  };
  const handleOpenDeleteLicensee = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setIsDeleteLicenseeModalOpen(true);
  };
  const handleDeleteLicensee = async () => {
    if (!selectedLicensee) return;

    const licenseeData = { ...selectedLicensee };

    try {
      await deleteLicensee(selectedLicensee._id);

      // Log the deletion activity
      await licenseeLogger.logDelete(
        selectedLicensee._id,
        selectedLicensee.name,
        licenseeData,
        `Deleted licensee: ${selectedLicensee.name} from ${licenseeData.country}`
      );

      setIsDeleteLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);
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
  };

  const filteredLicensees = useMemo(() => {
    if (!licenseeSearchValue) return allLicensees;
    return allLicensees.filter((licensee) =>
      licensee.name.toLowerCase().includes(licenseeSearchValue.toLowerCase())
    );
  }, [allLicensees, licenseeSearchValue]);

  const paginatedLicensees = useMemo(() => {
    return filteredLicensees.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
  }, [filteredLicensees, currentPage, itemsPerPage]);

  const totalLicenseePages = useMemo(() => {
    return Math.ceil(filteredLicensees.length / itemsPerPage);
  }, [filteredLicensees, itemsPerPage]);

  const handlePaymentHistory = (licensee: Licensee) => {
    setSelectedLicenseeForPayment(licensee);
    setIsPaymentHistoryModalOpen(true);
  };

  const handleTogglePaymentStatus = (licensee: Licensee) => {
    setSelectedLicenseeForPaymentChange(licensee);
    setIsPaymentConfirmModalOpen(true);
  };

  const handleConfirmPaymentStatusChange = async () => {
    if (!selectedLicenseeForPaymentChange) return;

    const previousData = { ...selectedLicenseeForPaymentChange };

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

      await axios.put("/api/licensees", updateData);

      // Log the payment status change activity
      await licenseeLogger.logUpdate(
        selectedLicenseeForPaymentChange._id,
        selectedLicenseeForPaymentChange.name,
        previousData,
        updateData,
        `Changed payment status for ${
          selectedLicenseeForPaymentChange.name
        } from ${currentIsPaid ? "Paid" : "Unpaid"} to ${
          newIsPaid ? "Paid" : "Unpaid"
        }`
      );

      // Refresh licensees list
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);

      // Close modal
      setIsPaymentConfirmModalOpen(false);
      setSelectedLicenseeForPaymentChange(null);
      toast.success("Licensee payment status updated successfully");
    } catch (error) {
      console.error("Failed to update payment status:", error);
      toast.error("Failed to update payment status");
    }
  };

  const renderSectionContent = () => {
    if (activeSection === "activity-logs") {
      return <ActivityLogsTable />;
    }

    if (activeSection === "licensees") {
      if (isLicenseesLoading) {
        return (
          <>
            <div className="block xl:hidden">
              <LicenseeCardSkeleton />
            </div>
            <div className="hidden xl:block">
              <LicenseeTableSkeleton />
            </div>
          </>
        );
      }
      return (
        <>
          <LicenseeSearchBar
            searchValue={licenseeSearchValue}
            setSearchValue={setLicenseeSearchValue}
            onActivityLogClick={() => setIsActivityLogModalOpen(true)}
          />
          <div className="block xl:hidden">
            {paginatedLicensees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {paginatedLicensees.map((licensee) => (
                  <LicenseeCard
                    key={licensee._id}
                    licensee={licensee}
                    onEdit={handleOpenEditLicensee}
                    onDelete={handleOpenDeleteLicensee}
                    onPaymentHistory={handlePaymentHistory}
                    onTogglePaymentStatus={handleTogglePaymentStatus}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No licensees found.
              </p>
            )}
          </div>
          <div className="hidden xl:block">
            <LicenseeTable
              licensees={paginatedLicensees}
              onEdit={handleOpenEditLicensee}
              onDelete={handleOpenDeleteLicensee}
              onPaymentHistory={handlePaymentHistory}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalLicenseePages}
            setCurrentPage={setCurrentPage}
          />
          <AddLicenseeModal
            open={isAddLicenseeModalOpen}
            onClose={() => setIsAddLicenseeModalOpen(false)}
            onSave={handleSaveAddLicensee}
            formState={licenseeForm}
            setFormState={(data) =>
              setLicenseeForm((prev) => ({ ...prev, ...data }))
            }
          />
          <EditLicenseeModal
            open={isEditLicenseeModalOpen}
            onClose={() => setIsEditLicenseeModalOpen(false)}
            onSave={handleSaveEditLicensee}
            formState={licenseeForm}
            setFormState={(data) =>
              setLicenseeForm((prev) => ({ ...prev, ...data }))
            }
          />
          <DeleteLicenseeModal
            open={isDeleteLicenseeModalOpen}
            onClose={() => setIsDeleteLicenseeModalOpen(false)}
            onDelete={handleDeleteLicensee}
            licensee={selectedLicensee}
          />
          <ActivityLogModal
            open={isActivityLogModalOpen}
            onClose={() => setIsActivityLogModalOpen(false)}
          />
          <PaymentHistoryModal
            open={isPaymentHistoryModalOpen}
            onClose={() => {
              setIsPaymentHistoryModalOpen(false);
              setSelectedLicenseeForPayment(null);
            }}
            licensee={selectedLicenseeForPayment}
          />
          <LicenseeSuccessModal
            open={isLicenseeSuccessModalOpen}
            onClose={() => {
              setIsLicenseeSuccessModalOpen(false);
              setCreatedLicensee(null);
            }}
            licensee={createdLicensee}
          />
          <PaymentStatusConfirmModal
            open={isPaymentConfirmModalOpen}
            onClose={() => {
              setIsPaymentConfirmModalOpen(false);
              setSelectedLicenseeForPaymentChange(null);
            }}
            onConfirm={handleConfirmPaymentStatusChange}
            currentStatus={
              selectedLicenseeForPaymentChange?.isPaid !== undefined
                ? selectedLicenseeForPaymentChange.isPaid
                : selectedLicenseeForPaymentChange?.expiryDate
                ? new Date(selectedLicenseeForPaymentChange.expiryDate) >
                  new Date()
                : false
            }
            licenseeName={selectedLicenseeForPaymentChange?.name || ""}
            currentExpiryDate={selectedLicenseeForPaymentChange?.expiryDate}
          />
        </>
      );
    }

    if (isLoading) {
      return (
        <>
          <div className="block xl:hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </div>
          </div>
          <div className="hidden xl:block">
            <UserTableSkeleton />
          </div>
        </>
      );
    }

    return (
      <>
        <SearchFilterBar
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          searchDropdownOpen={searchDropdownOpen}
          setSearchDropdownOpen={setSearchDropdownOpen}
          onActivityLogClick={() => setIsUserActivityLogModalOpen(true)}
        />
        <div className="block xl:hidden md:block">
          {paginatedUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {paginatedUsers.map((user) => (
                <UserCard
                  key={user.username}
                  user={user}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <div className="hidden xl:block">
          {paginatedUsers.length > 0 ? (
            <UserTable
              users={paginatedUsers}
              sortConfig={sortConfig}
              requestSort={requestSort}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          ) : (
            <p className="text-center text-gray-500 py-10">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
        <UserModal
          open={isUserModalOpen}
          user={selectedUser}
          onClose={() => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveUser}
        />
        <DeleteUserModal
          open={isDeleteModalOpen}
          user={selectedUserToDelete}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedUserToDelete(null);
          }}
          onDelete={async () => {
            if (!selectedUserToDelete) return;

            const userData = { ...selectedUserToDelete };

            try {
              await axios.delete("/api/users", {
                data: { _id: selectedUserToDelete._id },
              });

              // Log the deletion activity
              await userLogger.logDelete(
                selectedUserToDelete._id,
                selectedUserToDelete.username,
                userData,
                `Deleted user: ${selectedUserToDelete.username} with roles: ${
                  userData.roles?.join(", ") || "N/A"
                }`
              );

              // Refresh users
              const usersData = await fetchUsers();
              setAllUsers(usersData);
              toast.success("User deleted successfully");
            } catch (error) {
              console.error("Failed to delete user:", error);
              toast.error("Failed to delete user");
            }
            setIsDeleteModalOpen(false);
            setSelectedUserToDelete(null);
          }}
        />
        <AddUserDetailsModal
          open={isAddUserModalOpen && addUserStep === 1}
          onClose={closeAddUserModal}
          onNext={handleAddUserNext}
          formState={addUserForm}
          setFormState={handleAddUserFormChange}
        />
        <AddUserRolesModal
          open={isAddUserModalOpen && addUserStep === 2}
          onClose={closeAddUserModal}
          onBack={handleAddUserBack}
          onSave={handleAddUserSave}
          formState={addUserForm}
          setFormState={handleAddUserFormChange}
        />
        <UserActivityLogModal
          open={isUserActivityLogModalOpen}
          onClose={() => setIsUserActivityLogModalOpen(false)}
        />
      </>
    );
  };

  if (!__mounted) return null;
  return (
    <PageLayout
      mainClassName="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full"
      showToaster={false}
    >
      {/* Admin icon and title layout, matching original design */}
      <div className={`flex items-center ${"mt-6 justify-between"}`}>
        <div className="flex items-center">
          <h1 className="text-3xl font-bold mr-4">Administration</h1>
          <Image
            src={IMAGES.adminIcon}
            alt="Admin Icon"
            width={32}
            height={32}
          />
        </div>
            {activeSection === "users" ? (
              <Button
                onClick={openAddUserModal}
                className="flex bg-button text-white px-6 py-2 rounded-md items-center gap-2 text-lg font-semibold"
              >
                <Image
                  src="/plusButtonWhite.svg"
                  width={16}
                  height={16}
                  alt="Add"
                />
                <span>Add User</span>
              </Button>
            ) : activeSection === "licensees" ? (
              <Button
                onClick={handleOpenAddLicensee}
                className="flex bg-button text-white px-6 py-2 rounded-md items-center gap-2 text-lg font-semibold"
              >
                <Image
                  src="/plusButtonWhite.svg"
                  width={16}
                  height={16}
                  alt="Add"
                />
                <span>Add Licensee</span>
              </Button>
            ) : null}
          </div>

          {/* Section Navigation */}
          <div className="mt-8 mb-6">
            <AdministrationNavigation
              tabs={ADMINISTRATION_TABS_CONFIG}
              activeSection={activeSection}
              onChange={handleSectionChangeLocal}
              isLoading={isLoading || isLicenseesLoading}
            />
          </div>

          {/* Section Content with smooth transitions */}
          <div
            data-section-content
            className="transition-all duration-300 ease-in-out"
          >
            {renderSectionContent()}
          </div>
    </PageLayout>
  );
}

export default function AdministrationPage() {
  return (
    <Suspense fallback={<UserTableSkeleton />}>
      <AdministrationPageContent />
    </Suspense>
  );
}
