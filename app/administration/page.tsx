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
import { ChevronDownIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import UserDetailsModal from "@/components/administration/UserDetailsModal";
import AddUserDetailsModal from "@/components/administration/AddUserDetailsModal";
import AddUserRolesModal from "@/components/administration/AddUserRolesModal";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import CountryTable from "@/components/administration/CountryTable";
import CountryCard from "@/components/administration/CountryCard";
import AddCountryModal from "@/components/administration/AddCountryModal";
import EditCountryModal from "@/components/administration/EditCountryModal";
import DeleteCountryModal from "@/components/administration/DeleteCountryModal";
import {
  fetchCountries,
  createCountry,
  updateCountry,
  deleteCountry,
} from "@/lib/helpers/countries";
import type { Country } from "@/lib/types/country";

type AddUserForm = {
  username?: string;
  email?: string;
  password?: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  gender?: string;
  profilePicture?: string | null;
  resourcePermissions?: ResourcePermissions;
  allowedLocations: string[];
};

type AddCountryForm = {
  name?: string;
  alpha2?: string;
  alpha3?: string;
  isoNumeric?: string;
};

export default function AdministrationPage() {
  const pathname = usePathname();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [activeSection, setActiveSection] = useState<"users" | "countries">(
    "users"
  );
  const [searchValue, setSearchValue] = useState("");
  const [searchMode, setSearchMode] = useState<"username" | "email">(
    "username"
  );
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  } | null>(null);
  const [mobileSectionDropdownOpen, setMobileSectionDropdownOpen] =
    useState(false);
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
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [isEditCountryModalOpen, setIsEditCountryModalOpen] = useState(false);
  const [isDeleteCountryModalOpen, setIsDeleteCountryModalOpen] =
    useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryForm, setCountryForm] = useState<AddCountryForm>({});

  const itemsPerPage = 5;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    if (activeSection === "countries") {
      setIsCountriesLoading(true);
      fetchCountries()
        .then((data) => setAllCountries(data))
        .catch(() => setAllCountries([]))
        .finally(() => setIsCountriesLoading(false));
    }
  }, [activeSection]);

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
    } catch {
      alert("Failed to update user");
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
      alert("Username is required");
      return;
    }
    if (!email || !validateEmail(email)) {
      alert("A valid email is required");
      return;
    }
    if (!password || !validatePassword(password)) {
      alert("Password must be at least 6 characters");
      return;
    }
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      alert("At least one role is required");
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
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create user"
      );
    }
  };
  const handleAddUserFormChange = (data: Partial<AddUserForm>) =>
    setAddUserForm((prev) => ({ ...prev, ...data }));

  const handleOpenAddCountry = () => {
    setCountryForm({});
    setIsAddCountryModalOpen(true);
  };
  const handleSaveAddCountry = async () => {
    if (
      !countryForm.name ||
      !countryForm.alpha2 ||
      !countryForm.alpha3 ||
      !countryForm.isoNumeric
    ) {
      alert("All fields are required");
      return;
    }
    try {
      await createCountry({
        name: countryForm.name,
        alpha2: countryForm.alpha2,
        alpha3: countryForm.alpha3,
        isoNumeric: countryForm.isoNumeric,
      });
      setIsAddCountryModalOpen(false);
      setCountryForm({});
      setIsCountriesLoading(true);
      const data = await fetchCountries();
      setAllCountries(data);
      setIsCountriesLoading(false);
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to add country"
      );
    }
  };
  const handleOpenEditCountry = (country: Country) => {
    setSelectedCountry(country);
    setCountryForm({
      name: country.name,
      alpha2: country.alpha2,
      alpha3: country.alpha3,
      isoNumeric: country.isoNumeric,
    });
    setIsEditCountryModalOpen(true);
  };
  const handleSaveEditCountry = async () => {
    try {
      if (!selectedCountry) return;
      await updateCountry({
        ...countryForm,
        _id: selectedCountry._id,
      } as Country);
      setIsEditCountryModalOpen(false);
      setSelectedCountry(null);
      setCountryForm({});
      setIsCountriesLoading(true);
      const data = await fetchCountries();
      setAllCountries(data);
      setIsCountriesLoading(false);
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update country"
      );
    }
  };
  const handleOpenDeleteCountry = (country: Country) => {
    setSelectedCountry(country);
    setIsDeleteCountryModalOpen(true);
  };
  const handleDeleteCountry = async () => {
    if (!selectedCountry) return;
    try {
      await deleteCountry(selectedCountry._id);
      setIsDeleteCountryModalOpen(false);
      setSelectedCountry(null);
      setIsCountriesLoading(true);
      const data = await fetchCountries();
      setAllCountries(data);
      setIsCountriesLoading(false);
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete country"
      );
    }
  };

  const renderSectionContent = () => {
    if (activeSection === "countries") {
      if (isCountriesLoading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="loader mb-4" />
            <p className="text-gray-600">Loading countries...</p>
          </div>
        );
      }
      return (
        <>
          <div className="block lg:hidden space-y-3 mt-6">
            {allCountries.length > 0 ? (
              allCountries.map((country) => (
                <CountryCard
                  key={country._id}
                  country={country}
                  onEdit={handleOpenEditCountry}
                  onDelete={handleOpenDeleteCountry}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No countries found.
              </p>
            )}
          </div>
          <div className="hidden lg:block">
            <CountryTable
              countries={allCountries}
              onEdit={handleOpenEditCountry}
              onDelete={handleOpenDeleteCountry}
            />
          </div>
          <AddCountryModal
            open={isAddCountryModalOpen}
            onClose={() => setIsAddCountryModalOpen(false)}
            onSave={handleSaveAddCountry}
            formState={countryForm}
            setFormState={setCountryForm}
          />
          <EditCountryModal
            open={isEditCountryModalOpen}
            onClose={() => setIsEditCountryModalOpen(false)}
            onSave={handleSaveEditCountry}
            formState={countryForm}
            setFormState={setCountryForm}
          />
          <DeleteCountryModal
            open={isDeleteCountryModalOpen}
            onClose={() => setIsDeleteCountryModalOpen(false)}
            onDelete={handleDeleteCountry}
            country={selectedCountry}
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
          isMobile={isMobile}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          searchDropdownOpen={searchDropdownOpen}
          setSearchDropdownOpen={setSearchDropdownOpen}
          filterDropdownOpen={filterDropdownOpen}
          setFilterDropdownOpen={setFilterDropdownOpen}
          sortConfig={sortConfig}
          requestSort={requestSort}
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
                alert(data.message || "Failed to delete user");
              } else {
                // Refresh users
                const usersData = await fetchUsers();
                setAllUsers(usersData);
              }
            } catch {
              alert("Failed to delete user");
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
          onSave={() => {
            setIsUserDetailsModalOpen(false);
            setSelectedUserForDetails(null);
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
      </>
    );
  };

  return (
    <>
      <Sidebar pathname={pathname} />
      <div
        className={`w-full min-h-screen bg-background flex ${
          isMobile ? "" : "md:pl-[8rem]"
        }`}
      >
        <main className="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full">
          <Header />
          {/* Admin icon and title layout, matching original design */}
          <div
            className={`flex items-center ${
              isMobile ? "flex-col mt-4" : "mt-6 justify-between"
            }`}
          >
            {isMobile ? (
              <>
                <Image
                  src="/adminIcon.svg"
                  alt="Admin Icon"
                  width={40}
                  height={40}
                  className="mb-2"
                />
                <div className="flex items-center w-full justify-center">
                  <h1 className="text-3xl font-bold text-center">
                    Administration
                  </h1>
                  {activeSection === "users" ? (
                    <Image
                      src="/plusButton.svg"
                      width={20}
                      height={20}
                      alt="Add"
                      className="cursor-pointer ml-2"
                      onClick={openAddUserModal}
                    />
                  ) : (
                    <Image
                      src="/plusButton.svg"
                      width={20}
                      height={20}
                      alt="Add"
                      className="cursor-pointer ml-2"
                      onClick={handleOpenAddCountry}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
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
                    onClick={handleOpenAddCountry}
                    className="flex bg-button text-white px-6 py-2 rounded-md items-center gap-2 text-lg font-semibold"
                  >
                    <Image
                      src="/plusButtonWhite.svg"
                      width={16}
                      height={16}
                      alt="Add"
                    />
                    <span>Add Country</span>
                  </Button>
                )}
              </>
            )}
          </div>

          <div className={`mt-6 ${isMobile ? "w-full" : "flex gap-4"}`}>
            {isMobile ? (
              <div className="relative w-full">
                <button
                  className="w-full bg-buttonActive text-white rounded-lg px-4 py-3 font-bold text-lg flex justify-between items-center"
                  onClick={() => setMobileSectionDropdownOpen((o) => !o)}
                >
                  {activeSection === "users" ? "Users" : "Countries"}
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform ${
                      mobileSectionDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {mobileSectionDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg">
                    <button
                      className={`block w-full text-left px-4 py-3 text-lg hover:bg-gray-100 ${
                        activeSection === "users"
                          ? "font-semibold text-buttonActive"
                          : "text-gray-700"
                      }`}
                      onClick={() => {
                        setActiveSection("users");
                        setMobileSectionDropdownOpen(false);
                        setCurrentPage(0);
                      }}
                    >
                      Users
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-3 text-lg hover:bg-gray-100 ${
                        activeSection === "countries"
                          ? "font-semibold text-buttonActive"
                          : "text-gray-700"
                      }`}
                      onClick={() => {
                        setActiveSection("countries");
                        setMobileSectionDropdownOpen(false);
                        setCurrentPage(0);
                      }}
                    >
                      Countries
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  className={`flex-1 py-3 text-lg ${
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
                  className={`flex-1 py-3 text-lg ${
                    activeSection === "countries"
                      ? "bg-buttonActive text-white"
                      : "bg-button text-white"
                  }`}
                  onClick={() => {
                    setActiveSection("countries");
                    setCurrentPage(0);
                  }}
                >
                  Countries
                </Button>
              </>
            )}
          </div>

          {renderSectionContent()}
        </main>
      </div>
    </>
  );
}
