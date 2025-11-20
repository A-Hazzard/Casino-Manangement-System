import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

type SearchFilterBarProps = {
  searchValue: string;
  setSearchValue: (value: string) => void;
};

export default function SearchFilterBar({
  searchValue,
  setSearchValue,
}: SearchFilterBarProps) {
  // Responsive Search and Filter Layout
  return (
    <div className="mt-6 rounded-t-lg bg-buttonActive p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-full rounded-md bg-white shadow-sm sm:max-w-md">
            <input
              type="text"
              placeholder="Search by username, email, or user ID..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className="h-full flex-1 cursor-text rounded-l-md border-none bg-white px-3 text-sm outline-none md:text-base"
            />
            <span className="flex cursor-pointer items-center border-l border-gray-300 bg-white px-2 text-gray-400 transition-colors hover:text-gray-600">
              <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
