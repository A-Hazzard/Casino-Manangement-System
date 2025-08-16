import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import activityLogIcon from "@/public/activityLogIcon.svg";

type SearchFilterBarProps = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchMode: "username" | "email";
  setSearchMode: (mode: "username" | "email") => void;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: (open: boolean) => void;
  // Optional prop for User Activity Log
  onActivityLogClick?: () => void;
};

export default function SearchFilterBar({
  searchValue,
  setSearchValue,
  searchMode,
  setSearchMode,
  searchDropdownOpen,
  setSearchDropdownOpen,
  onActivityLogClick,
}: SearchFilterBarProps) {
  // Responsive Search and Filter Layout
  return (
    <div className="mt-6 bg-buttonActive p-3 md:p-4 rounded-t-lg">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="flex w-full sm:max-w-md h-11 rounded-md bg-white shadow-sm">
            <input
              type="text"
              placeholder="Search by...."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 px-3 text-sm md:text-base h-full border-none outline-none rounded-l-md bg-white cursor-text"
            />
            <span className="flex items-center px-2 text-gray-400 bg-white border-l border-gray-300 cursor-pointer hover:text-gray-600 transition-colors">
              <MagnifyingGlassIcon className="w-4 h-4 md:w-5 md:h-5" />
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              className={`flex items-center h-11 px-3 md:px-4 font-medium text-xs md:text-sm text-white bg-blue-400 hover:bg-blue-500 rounded-md whitespace-nowrap cursor-pointer transition-colors`}
              onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
            >
              {searchMode === "username" ? "Username" : "Email Address"}
              <ChevronDownIcon
                className={`ml-1 md:ml-2 w-3 h-3 md:w-4 md:h-4 transition-transform ${
                  searchDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {searchDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg w-auto min-w-[150px]">
                <button
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
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
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
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
        {onActivityLogClick && (
          <Button
            onClick={onActivityLogClick}
            className="bg-button text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-buttonActive transition-colors text-sm md:text-base"
          >
            <Image
              src={activityLogIcon}
              alt="User Activity Log"
              width={16}
              height={16}
              className="md:w-5 md:h-5"
            />
            <span className="hidden sm:inline">User Activity Log</span>
            <span className="sm:hidden">Activity Log</span>
          </Button>
        )}
      </div>
    </div>
  );
}
