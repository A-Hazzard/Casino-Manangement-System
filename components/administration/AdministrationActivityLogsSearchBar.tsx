/**
 * Activity Logs Search Bar Component
 * Search bar for activity logs with mode selection dropdown.
 *
 * Features:
 * - Text search input
 * - Search mode selection (username, email, description, ID)
 * - Dropdown for mode selection
 * - Responsive design
 * - Real-time search
 *
 * @param props - Component props
 */
import { MagnifyingGlassIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export type AdministrationActivityLogsSearchBarProps = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchMode: 'username' | 'email' | 'description' | '_id';
  setSearchMode: (mode: 'username' | 'email' | 'description' | '_id') => void;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: (open: boolean) => void;
};

export function AdministrationActivityLogsSearchBar({
  searchValue,
  setSearchValue,
  searchMode,
  setSearchMode,
  searchDropdownOpen,
  setSearchDropdownOpen,
}: AdministrationActivityLogsSearchBarProps) {
  // ============================================================================
  // Render - Search Bar
  // ============================================================================
  return (
    <div className="mt-6 rounded-t-lg bg-buttonActive p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-full rounded-md bg-white shadow-sm sm:max-w-md">
            <input
              type="text"
              placeholder="Search activity logs..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className="h-full flex-1 cursor-text rounded-l-md border-none bg-white px-3 text-sm outline-none md:text-base"
            />
            <span className="flex cursor-pointer items-center border-l border-gray-300 bg-white px-2 text-gray-400 transition-colors hover:text-gray-600">
              <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5" />
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              className={`flex h-11 cursor-pointer items-center whitespace-nowrap rounded-md bg-blue-400 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-500 md:px-4 md:text-sm`}
              onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
            >
              {searchMode === 'username'
                ? 'Username'
                : searchMode === 'email'
                  ? 'Email'
                  : searchMode === 'description'
                    ? 'Description'
                    : 'ID'}
              <ChevronDownIcon
                className={`ml-1 h-3 w-3 transition-transform md:ml-2 md:h-4 md:w-4 ${
                  searchDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {searchDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-auto min-w-[150px] rounded-md border border-gray-200 bg-white shadow-lg">
                <button
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    searchMode === 'username'
                      ? 'font-semibold text-buttonActive'
                      : 'text-gray-700'
                  }`}
                  onClick={() => {
                    setSearchMode('username');
                    setSearchDropdownOpen(false);
                  }}
                >
                  Username
                </button>
                <button
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    searchMode === 'email'
                      ? 'font-semibold text-buttonActive'
                      : 'text-gray-700'
                  }`}
                  onClick={() => {
                    setSearchMode('email');
                    setSearchDropdownOpen(false);
                  }}
                >
                  Email
                </button>
                <button
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    searchMode === 'description'
                      ? 'font-semibold text-buttonActive'
                      : 'text-gray-700'
                  }`}
                  onClick={() => {
                    setSearchMode('description');
                    setSearchDropdownOpen(false);
                  }}
                >
                  Description
                </button>
                <button
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    searchMode === '_id'
                      ? 'font-semibold text-buttonActive'
                      : 'text-gray-700'
                  }`}
                  onClick={() => {
                    setSearchMode('_id');
                    setSearchDropdownOpen(false);
                  }}
                >
                  ID
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdministrationActivityLogsSearchBar;
