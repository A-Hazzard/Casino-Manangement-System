/**
 * AdministrationUsersSection Component
 *
 * Displays the Users section of the Administration page.
 * Handles user listing, search, filtering, and CRUD operations.
 */

'use client';

import { AdministrationSearchFilterBar } from '@/components/CMS/administration/AdministrationSearchFilterBar';
import { AdministrationUserSummaryCards } from '@/components/CMS/administration/AdministrationUserSummaryCards';
import { AdministrationUserCard } from '@/components/CMS/administration/cards/AdministrationUserCard';
import AdministrationAddUserModal from '@/components/CMS/administration/modals/AdministrationAddUserModal';
import AdministrationDeleteUserModal from '@/components/CMS/administration/modals/AdministrationDeleteUserModal';
import AdministrationUserModal from '@/components/CMS/administration/modals/AdministrationUserModal';
import { AdministrationUserCardSkeleton } from '@/components/CMS/administration/skeletons/AdministrationUserCardSkeleton';
import { AdministrationUserTableSkeleton } from '@/components/CMS/administration/skeletons/AdministrationUserTableSkeleton';
import { AdministrationUserTable } from '@/components/CMS/administration/tables/AdministrationUserTable';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { useAdministrationUserCounts } from '@/lib/hooks/administration/useAdministrationUserCounts';
import type { SortKey, User } from '@/lib/types/administration';
import type { UserAuthPayload } from '@/shared/types/auth';

type AdministrationUsersSectionProps = {
  selectedLicencee: string | null;
  isLoading: boolean;
  isSearching: boolean;
  processedUsers: User[];
  totalPages: number;
  currentPage: number;
  searchValue: string;
  selectedRole: string;
  selectedStatus: string;
  sortConfig: { key: string; direction: 'ascending' | 'descending' } | null;
  isUserModalOpen: boolean;
  selectedUser: User | null;
  isDeleteModalOpen: boolean;
  selectedUserToDelete: User | null;
  isAddUserModalOpen: boolean;
  currentUser: UserAuthPayload | null;
  // Setters
  setSearchValue: (value: string) => void;
  setSelectedRole: (role: string) => void;
  setSelectedStatus: (status: string) => void;
  setCurrentPage: (page: number) => void;
  setIsUserModalOpen: (open: boolean) => void;
  setSelectedUser: (user: User | null) => void;
  setIsDeleteModalOpen: (open: boolean) => void;
  setSelectedUserToDelete: (user: User | null) => void;
  setIsAddUserModalOpen: (open: boolean) => void;
  // Handlers
  handleEditUser: (user: User) => void;
  handleDeleteUser: (user: User) => void;
  handleSaveUser: (
    updated: Partial<User> & { password?: string }
  ) => Promise<void>;
  handleDeleteUserConfirm: (user: User) => Promise<void>;
  closeAddUserModal: () => Promise<void>;
  requestSort: (key: string) => void;
  refreshUsers: () => Promise<void>;
};

export default function AdministrationUsersSection({
  selectedLicencee,
  isLoading,
  isSearching,
  processedUsers,
  totalPages,
  currentPage,
  searchValue,
  selectedRole,
  selectedStatus,
  sortConfig,
  isUserModalOpen,
  selectedUser,
  isDeleteModalOpen,
  selectedUserToDelete,
  isAddUserModalOpen,
  currentUser,
  setSearchValue,
  setSelectedRole,
  setSelectedStatus,
  setCurrentPage,
  setIsUserModalOpen,
  setSelectedUser,
  setIsDeleteModalOpen,
  setSelectedUserToDelete,
  handleEditUser,
  handleDeleteUser,
  handleSaveUser,
  handleDeleteUserConfirm,
  closeAddUserModal,
  requestSort,
  refreshUsers,
}: AdministrationUsersSectionProps) {
  // ============================================================================
  // Data Fetching - User Counts
  // ============================================================================
  const { counts, isLoading: countsLoading } =
    useAdministrationUserCounts(selectedLicencee);

  return (
    <>
      {/* Summary Cards */}
      <AdministrationUserSummaryCards
        counts={counts}
        isLoading={countsLoading}
      />

      {/* Search Filter Bar */}
      <AdministrationSearchFilterBar
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />
      <div className="block lg:hidden">
        {isSearching ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <AdministrationUserCardSkeleton />
            <AdministrationUserCardSkeleton />
            <AdministrationUserCardSkeleton />
            <AdministrationUserCardSkeleton />
          </div>
        ) : processedUsers.length > 0 ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {processedUsers.map(userItem => (
                <AdministrationUserCard
                  key={userItem.username}
                  user={userItem}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                  currentUser={currentUser}
                />
              ))}
            </div>
            {!isLoading && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            )}
          </>
        ) : (
          <p className="py-4 text-center text-gray-500">
            No users found matching your criteria.
          </p>
        )}
      </div>
      <div className="hidden lg:block">
        {isSearching ? (
          <AdministrationUserTableSkeleton />
        ) : processedUsers.length > 0 ? (
          <>
            <AdministrationUserTable
              users={processedUsers}
              sortConfig={
                sortConfig as {
                  key: SortKey;
                  direction: 'ascending' | 'descending';
                } | null
              }
              requestSort={(key: SortKey) => {
                if (key) requestSort(key);
              }}
              onEdit={(user: User) => handleEditUser(user)}
              onDelete={(user: User) => handleDeleteUser(user)}
              currentUser={currentUser as UserAuthPayload}
            />
            {!isLoading && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            )}
          </>
        ) : (
          <p className="py-10 text-center text-gray-500">
            No users found matching your criteria.
          </p>
        )}
      </div>
      <AdministrationUserModal
        open={isUserModalOpen}
        user={selectedUser}
        onClose={async () => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
          await refreshUsers();
        }}
        onSave={handleSaveUser}
      />
      <AdministrationDeleteUserModal
        open={isDeleteModalOpen}
        user={selectedUserToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUserToDelete(null);
        }}
        onDelete={async () => {
          if (selectedUserToDelete) {
            await handleDeleteUserConfirm(selectedUserToDelete);
          }
        }}
      />
      <AdministrationAddUserModal
        open={isAddUserModalOpen}
        onClose={closeAddUserModal}
        onSuccess={refreshUsers}
      />
    </>
  );
}

