/**
 * Licensee Search Bar Component
 * Search bar for filtering licensees by name.
 *
 * Features:
 * - Text search input
 * - Real-time search filtering
 * - Responsive design
 *
 * @param props - Component props
 */
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

type AdministrationLicenseeSearchBarProps = {
  searchValue: string;
  setSearchValue: (value: string) => void;
};

function AdministrationLicenseeSearchBar({
  searchValue,
  setSearchValue,
}: AdministrationLicenseeSearchBarProps) {
  // ============================================================================
  // Render - Search Bar
  // ============================================================================
  return (
    <div className="mt-6 flex items-center gap-4 rounded-t-lg bg-buttonActive p-4">
      <div className="flex flex-1 items-center">
        <div className="flex h-11 w-full max-w-md rounded-md bg-white shadow-sm">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="h-full flex-1 cursor-text rounded-l-md border-none bg-white px-3 text-base outline-none"
          />
          <span className="flex cursor-pointer items-center border-l border-gray-300 bg-white px-2 text-gray-400 transition-colors hover:text-gray-600">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default AdministrationLicenseeSearchBar;

