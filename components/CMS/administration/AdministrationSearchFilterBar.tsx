/**
 * Administration Search Filter Bar Component
 * Search and filter bar for user administration with role and status filtering.
 *
 * @module components/administration/AdministrationSearchFilterBar
 */

'use client';

import { CustomSelect } from '@/components/shared/ui/custom-select';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

// ============================================================================
// Constants
// ============================================================================

const ROLE_OPTIONS = [
  { label: 'All Roles', value: 'all' },
  { label: 'Developer', value: 'developer' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Location Admin', value: 'location admin' },
  { label: 'Technician', value: 'technician' },
  { label: 'Collector', value: 'collector' },
];

const STATUS_OPTIONS = [
  { label: 'All Users', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Deleted', value: 'deleted' },
];

export type AdministrationSearchFilterBarProps = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedRole: string;
  setSelectedRole: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
};

/**
 * Administration Search Filter Bar
 */
export function AdministrationSearchFilterBar({
  searchValue,
  setSearchValue,
  selectedRole,
  setSelectedRole,
  selectedStatus,
  setSelectedStatus,
}: AdministrationSearchFilterBarProps) {
  // ============================================================================
  // Render
  // ============================================================================
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
          <div className="w-full sm:w-auto">
            <CustomSelect
              options={ROLE_OPTIONS}
              value={selectedRole}
              onValueChange={setSelectedRole}
              placeholder="All Roles"
              className="h-11 min-w-[150px] rounded-md bg-white shadow-sm"
            />
          </div>
          <div className="w-full sm:w-auto">
            <CustomSelect
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              placeholder="All Users"
              className="h-11 min-w-[150px] rounded-md bg-white shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
