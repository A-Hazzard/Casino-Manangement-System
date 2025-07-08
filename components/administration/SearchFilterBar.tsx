import { Button } from "@/components/ui/button";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";

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
              className="flex-1 px-3 text-base h-full border-none outline-none rounded-l-md bg-white cursor-text"
            />
            <span className="flex items-center px-2 text-gray-400 bg-white border-l border-gray-300 cursor-pointer hover:text-gray-600 transition-colors">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </span>
          </div>
          <div className="relative ml-2">
            <button
              type="button"
              className={`flex items-center h-11 px-4 font-medium text-sm text-white bg-blue-400 hover:bg-blue-500 rounded-md whitespace-nowrap cursor-pointer transition-colors`}
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
            className="bg-button text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-buttonActive transition-colors"
          >
            <Image
              src="/activityLogIcon.svg"
              alt="User Activity Log"
              width={20}
              height={20}
            />
            <span>User Activity Log</span>
          </Button>
        )}
      </div>
    );
}
