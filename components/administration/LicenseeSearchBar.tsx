import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

type LicenseeSearchBarProps = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  onActivityLogClick: () => void;
};

export default function LicenseeSearchBar({
  searchValue,
  setSearchValue,
  onActivityLogClick,
}: LicenseeSearchBarProps) {
  return (
    <div className="mt-6 flex items-center gap-4 bg-buttonActive p-4 rounded-t-lg">
      <div className="flex items-center flex-1">
        <div className="flex w-full max-w-md h-11 rounded-md bg-white shadow-sm">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex-1 px-3 text-base h-full border-none outline-none rounded-l-md bg-white cursor-text"
          />
          <span className="flex items-center px-2 text-gray-400 bg-white border-l border-gray-300 cursor-pointer hover:text-gray-600 transition-colors">
            <MagnifyingGlassIcon className="w-5 h-5" />
          </span>
        </div>
      </div>
      <Button
        onClick={onActivityLogClick}
        className="bg-button text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-buttonActive transition-colors"
      >
        <Image
          src="/activityLogIcon.svg"
          alt="Activity Log"
          width={20}
          height={20}
        />
        <span>Activity Log</span>
      </Button>
    </div>
  );
}
