"use client";
import SearchFilterBar from "@/components/administration/SearchFilterBar";
import UserCard from "@/components/administration/UserCard";
import UserTable from "@/components/administration/UserTable";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/ui/PaginationControls";
import { fetchUsers, filterAndSortUsers } from "@/lib/helpers/administration";
import type { SortKey, User } from "@/lib/types/administration";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";

export default function AdministrationPage() {
  const pathname = usePathname();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
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

  const renderSectionContent = () => {
    if (activeSection === "countries") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-md mt-8 p-6">
          <div className="text-5xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
          <p className="text-gray-600 text-center">
            The Countries management section is currently under development.{" "}
            <br />
            Please check back later!
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center py-10">
          <p>Loading users...</p>
        </div>
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
        {isMobile ? (
          <div className="space-y-3 mt-4">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <UserCard key={user.username} user={user} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No users found matching your criteria.
              </p>
            )}
          </div>
        ) : paginatedUsers.length > 0 ? (
          <UserTable
            users={paginatedUsers}
            sortConfig={sortConfig}
            requestSort={requestSort}
          />
        ) : (
          <p className="text-center text-gray-500 py-10">
            No users found matching your criteria.
          </p>
        )}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
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
              isMobile ? "flex-col mt-4" : "mt-6"
            }`}
          >
            {isMobile && (
              <Image
                src="/adminIcon.svg"
                alt="Admin Icon"
                width={40}
                height={40}
                className="mb-2"
              />
            )}
            <h1
              className={`text-3xl font-bold ${
                isMobile ? "text-center" : "mr-2"
              }`}
            >
              Administration
            </h1>
            {!isMobile && (
              <Image
                src="/adminIcon.svg"
                alt="Admin Icon"
                width={32}
                height={32}
              />
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
