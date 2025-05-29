import { Button } from "@/components/ui/button";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import type { SortKey } from "@/lib/types/administration"; // Assuming SortKey is needed for mobile filter display

type SearchFilterBarProps = {
  isMobile: boolean;
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchMode: "username" | "email";
  setSearchMode: (mode: "username" | "email") => void;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: (open: boolean) => void;
  filterDropdownOpen: boolean;
  setFilterDropdownOpen: (open: boolean) => void;
  // Props for mobile filter functionality (sorting)
  sortConfig: { key: SortKey; direction: "ascending" | "descending" } | null;
  requestSort: (key: SortKey) => void;
};

export default function SearchFilterBar({
  isMobile,
  searchValue,
  setSearchValue,
  searchMode,
  setSearchMode,
  searchDropdownOpen,
  setSearchDropdownOpen,
  filterDropdownOpen,
  setFilterDropdownOpen,
  sortConfig,
  requestSort,
}: SearchFilterBarProps) {
  if (isMobile) {
    // Mobile Search and Filter layout
    return (
      <div className="flex flex-wrap gap-2 items-center w-full mt-6 min-w-0 max-w-full">
        {/* Search Component - takes up available space, can be full width */}
        <div className="flex-grow flex items-center min-w-0 sm:flex-1 max-w-full">
          <div className="flex w-full h-11 rounded-md border border-gray-300 bg-white shadow-sm min-w-0 max-w-full">
            <input
              type="text"
              placeholder="Search.."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-0 flex-1 min-w-0 px-3 text-base h-full border-none outline-none rounded-l-md"
            />
            <span className="flex items-center px-2 text-gray-400 border-l border-gray-300">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </span>
            <div className="relative">
              <button
                type="button"
                className={`flex items-center h-full px-3 font-medium text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border-l border-gray-300 rounded-r-md whitespace-nowrap`}
                onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
              >
                {searchMode === "username" ? "User" : "Email"}
                <ChevronDownIcon
                  className={`ml-1 w-4 h-4 transition-transform ${
                    searchDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {searchDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-auto min-w-[150px]">
                  <button
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      sortConfig?.key === "username"
                        ? "font-semibold bg-gray-100"
                        : "text-gray-700"
                    }`}
                    onClick={() => {
                      setSearchMode("username");
                      setSearchDropdownOpen(false);
                    }}
                  >
                    Username
                  </button>
                  <button
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      sortConfig?.key === "email"
                        ? "font-semibold bg-gray-100"
                        : "text-gray-700"
                    }`}
                    onClick={() => {
                      setSearchMode("email");
                      setSearchDropdownOpen(false);
                    }}
                  >
                    Email Address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Filter Button - can wrap, can be full width when wrapped */}
        <div className="relative w-full sm:w-auto flex-shrink-0 min-w-0 max-w-full">
          <Button
            className="bg-buttonActive text-white px-3 py-2.5 rounded-md flex items-center justify-center text-sm h-11 w-full sm:w-auto"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
          >
            <MixerHorizontalIcon className="mr-1 w-4 h-4" />
            Filter
            <ChevronDownIcon
              className={`ml-1 w-4 h-4 transition-transform ${
                filterDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
          {filterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-full min-w-[180px]">
              <button
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  sortConfig?.key === "name"
                    ? "font-semibold bg-gray-100"
                    : "text-gray-700"
                }`}
                onClick={() => {
                  requestSort("name");
                  setFilterDropdownOpen(false);
                }}
              >
                Filter by Name{" "}
                {sortConfig?.key === "name" &&
                  (sortConfig.direction === "ascending" ? "▲" : "▼")}
              </button>
              <button
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  sortConfig?.key === "username"
                    ? "font-semibold bg-gray-100"
                    : "text-gray-700"
                }`}
                onClick={() => {
                  requestSort("username");
                  setFilterDropdownOpen(false);
                }}
              >
                Filter by Username{" "}
                {sortConfig?.key === "username" &&
                  (sortConfig.direction === "ascending" ? "▲" : "▼")}
              </button>
              <button
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  sortConfig?.key === "email"
                    ? "font-semibold bg-gray-100"
                    : "text-gray-700"
                }`}
                onClick={() => {
                  requestSort("email");
                  setFilterDropdownOpen(false);
                }}
              >
                Filter by Email{" "}
                {sortConfig?.key === "email" &&
                  (sortConfig.direction === "ascending" ? "▲" : "▼")}
              </button>
              <button
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  sortConfig?.key === "enabled"
                    ? "font-semibold bg-gray-100"
                    : "text-gray-700"
                }`}
                onClick={() => {
                  requestSort("enabled");
                  setFilterDropdownOpen(false);
                }}
              >
                Filter by Enabled{" "}
                {sortConfig?.key === "enabled" &&
                  (sortConfig.direction === "ascending" ? "▲" : "▼")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // Desktop Search and Filter Layout
    return (
      <div className="mt-6 flex items-center gap-4 bg-buttonActive p-4 rounded-t-lg">
        <div className="flex items-center flex-1">
          <div className="flex w-full max-w-md h-11 rounded-md bg-white shadow-sm">
            <input
              type="text"
              placeholder="Search by...."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 px-3 text-base h-full border-none outline-none rounded-l-md bg-white"
            />
            <span className="flex items-center px-2 text-gray-400 bg-white border-l border-gray-300">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </span>
          </div>
          <div className="relative ml-2">
            <button
              type="button"
              className={`flex items-center h-11 px-4 font-medium text-sm text-white bg-blue-400 hover:bg-blue-500 rounded-md whitespace-nowrap`}
              onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
            >
              {searchMode === "username" ? "Username" : "Email Address"}
              <ChevronDownIcon
                className={`ml-2 w-4 h-4 transition-transform ${
                  searchDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {searchDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-auto min-w-[150px]">
                <button
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    searchMode === "username"
                      ? "font-semibold text-buttonActive"
                      : "text-gray-700"
                  }`}
                  onClick={() => {
                    setSearchMode("username");
                    setSearchDropdownOpen(false);
                  }}
                >
                  Username
                </button>
                <button
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    searchMode === "email"
                      ? "font-semibold text-buttonActive"
                      : "text-gray-700"
                  }`}
                  onClick={() => {
                    setSearchMode("email");
                    setSearchDropdownOpen(false);
                  }}
                >
                  Email Address
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
