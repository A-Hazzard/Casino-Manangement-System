"use client";
import DeleteUserModal from "@/components/administration/DeleteUserModal";
import RolesPermissionsModal from "@/components/administration/RolesPermissionsModal";
import SearchFilterBar from "@/components/administration/SearchFilterBar";
import UserCard from "@/components/administration/UserCard";
import UserCardSkeleton from "@/components/administration/UserCardSkeleton";
import UserTable from "@/components/administration/UserTable";
import UserTableSkeleton from "@/components/administration/UserTableSkeleton";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/ui/PaginationControls";
import {
  fetchUsers,
  filterAndSortUsers,
  updateUser,
  createUser,
} from "@/lib/helpers/administration";
import type {
  ResourcePermissions,
  SortKey,
  User,
} from "@/lib/types/administration";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import UserDetailsModal from "@/components/administration/UserDetailsModal";
import AddUserDetailsModal from "@/components/administration/AddUserDetailsModal";
import AddUserRolesModal from "@/components/administration/AddUserRolesModal";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import LicenseeTable from "@/components/administration/LicenseeTable";
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
import ActivityLogModal from "@/components/administration/ActivityLogModal";
import PaymentHistoryModal from "@/components/administration/PaymentHistoryModal";
import UserActivityLogModal from "@/components/administration/UserActivityLogModal";
import LicenseeSuccessModal from "@/components/administration/LicenseeSuccessModal";
import PaymentStatusConfirmModal from "@/components/administration/PaymentStatusConfirmModal";
import { getNext30Days } from "@/lib/utils/licensee";
import { toast } from "sonner";
import { Toaster } from "sonner";
import type { AddUserForm, AddLicenseeForm } from "@/lib/types/pages";

export default function AdministrationPage() {
  const pathname = usePathname();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeSection, setActiveSection] = useState<"users" | "licensees">(
    "users"
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
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(
    null
  );
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] =
    useState<User | null>(null);
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

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const usersData = await fetchUsers();
        setAllUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
      setIsLoading(false);
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const loadLicensees = async () => {
      setIsLicenseesLoading(true);
      try {
        const licenseesData = await fetchLicensees();
        setAllLicensees(licenseesData);
      } catch (error) {
        console.error("Failed to fetch licensees:", error);
        setAllLicensees([]);
      }
      setIsLicenseesLoading(false);
    };
    loadLicensees();
  }, []);

  const processedUsers = useMemo(() => {
    return filterAndSortUsers(allUsers, searchValue, searchMode, sortConfig);
  }, [allUsers, searchValue, searchMode, sortConfig]);

  const paginatedUsers = useMemo(() => {
    return processedUsers.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
  }, [processedUsers, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(processedUsers.length / itemsPerPage);
  }, [processedUsers, itemsPerPage]);

  const requestSort = (key: SortKey) => {
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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsRolesModalOpen(true);
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
    try {
      await updateUser({ ...updated, _id: selectedUser._id });
      setIsRolesModalOpen(false);
      setSelectedUser(null);
      // Refresh users
      const usersData = await fetchUsers();
      setAllUsers(usersData);
      toast.success("User updated successfully");
    } catch {
      toast.error("Failed to update user");
    }
  };

  const handleShowUserDetails = (user: User) => {
    setSelectedUserForDetails(user);
    setIsUserDetailsModalOpen(true);
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
    try {
      await deleteLicensee(selectedLicensee._id);
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
    if (activeSection === "licensees") {
      if (isLicenseesLoading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="loader mb-4" />
            <p className="text-gray-600">Loading licensees...</p>
          </div>
        );
      }
      return (
        <>
          <LicenseeSearchBar
            searchValue={licenseeSearchValue}
            setSearchValue={setLicenseeSearchValue}
            onActivityLogClick={() => setIsActivityLogModalOpen(true)}
          />
          <div className="block lg:hidden space-y-3 mt-6">
            {paginatedLicensees.length > 0 ? (
              paginatedLicensees.map((licensee) => (
                <LicenseeCard
                  key={licensee._id}
                  licensee={licensee}
                  onEdit={handleOpenEditLicensee}
                  onDelete={handleOpenDeleteLicensee}
                  onPaymentHistory={handlePaymentHistory}
                  onTogglePaymentStatus={handleTogglePaymentStatus}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No licensees found.
              </p>
            )}
          </div>
          <div className="hidden lg:block">
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
          <div className="block lg:hidden md:block">
            <UserCardSkeleton />
          </div>
          <div className="hidden lg:block">
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
        <div className="block lg:hidden md:block space-y-3 mt-4">
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => (
              <UserCard
                key={user.username}
                user={user}
                onEdit={handleEditUser}
                onMenu={handleShowUserDetails}
                onDelete={handleDeleteUser}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <div className="hidden lg:block">
          {paginatedUsers.length > 0 ? (
            <UserTable
              users={paginatedUsers}
              sortConfig={sortConfig}
              requestSort={requestSort}
              onEdit={handleEditUser}
              onMenu={handleShowUserDetails}
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
        <RolesPermissionsModal
          open={isRolesModalOpen}
          onClose={() => {
            setIsRolesModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
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
            try {
              const res = await fetch("/api/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: selectedUserToDelete._id }),
              });
              if (!res.ok) {
                const data = await res.json();
                toast.error(data.message || "Failed to delete user");
              } else {
                // Refresh users
                const usersData = await fetchUsers();
                setAllUsers(usersData);
                toast.success("User deleted successfully");
              }
            } catch {
              toast.error("Failed to delete user");
            }
            setIsDeleteModalOpen(false);
            setSelectedUserToDelete(null);
          }}
        />
        <UserDetailsModal
          open={isUserDetailsModalOpen}
          user={selectedUserForDetails}
          onClose={() => {
            setIsUserDetailsModalOpen(false);
            setSelectedUserForDetails(null);
          }}
          onSave={async (profileData) => {
            if (!selectedUserForDetails) return;
            try {
              // Call the API to update user profile
              const response = await fetch("/api/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  _id: selectedUserForDetails._id,
                  ...profileData,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                toast.error(
                  errorData.message || "Failed to update user profile"
                );
                return;
              }

              // Close modal and refresh users
              setIsUserDetailsModalOpen(false);
              setSelectedUserForDetails(null);

              // Refresh users list
              const usersData = await fetchUsers();
              setAllUsers(usersData);
              toast.success("User profile updated successfully");
            } catch (error) {
              console.error("Failed to update user profile:", error);
              toast.error("Failed to update user profile");
            }
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

  return (
    <>
      <Sidebar pathname={pathname} />
      <div
        className={`w-full min-h-screen bg-background flex md:pl-[8rem] transition-all duration-300`}
      >
        <main className="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full">
          <Header />
          {/* Admin icon and title layout, matching original design */}
          <div
            className={`flex items-center ${
              "mt-6 justify-between"
            }`}
          >
                <div className="flex items-center">
                  <h1 className="text-3xl font-bold mr-4">Administration</h1>
                  <Image
                    src="/adminIcon.svg"
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
                ) : (
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
            )}
          </div>

          <div
            className={`mt-6 ${
              "flex gap-3 justify-start"
            }`}
          >
                <Button
                  className={`px-6 py-2 text-sm font-medium ${
                    activeSection === "users"
                      ? "bg-buttonActive text-white"
                      : "bg-button text-white"
                  }`}
                  onClick={() => {
                    setActiveSection("users");
                    setCurrentPage(0);
                  }}
                >
                  Users
                </Button>
                <Button
                  className={`px-6 py-2 text-sm font-medium ${
                    activeSection === "licensees"
                      ? "bg-buttonActive text-white"
                      : "bg-button text-white"
                  }`}
                  onClick={() => {
                    setActiveSection("licensees");
                    setCurrentPage(0);
                  }}
                >
                  Licensees
                </Button>
          </div>

          {renderSectionContent()}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </>
  );
}
