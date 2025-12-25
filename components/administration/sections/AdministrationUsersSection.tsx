/**
 * AdministrationUsersSection Component
 *
 * Displays the Users section of the Administration page.
 * Handles user listing, search, filtering, and CRUD operations.
 */

'use client';

import AddUserModal from '@/components/administration/AddUserModal';
import DeleteUserModal from '@/components/administration/DeleteUserModal';
import SearchFilterBar from '@/components/administration/SearchFilterBar';
import UserCard from '@/components/administration/UserCard';
import UserCardSkeleton from '@/components/administration/UserCardSkeleton';
import UserModal from '@/components/administration/UserModal';
import UserTable from '@/components/administration/UserTable';
import UserTableSkeleton from '@/components/administration/UserTableSkeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import type { SortKey, User } from '@/lib/types/administration';
import type { UserAuthPayload } from '@/shared/types/auth';

type AdministrationUsersSectionProps = {
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
  return (
    <>
      <SearchFilterBar
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />
      <div className="block md:block xl:hidden">
        {isSearching ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <UserCardSkeleton />
            <UserCardSkeleton />
            <UserCardSkeleton />
            <UserCardSkeleton />
          </div>
        ) : processedUsers.length > 0 ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {processedUsers.map(userItem => (
                <UserCard
                  key={userItem.username}
                  user={userItem}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                  currentUser={currentUser}
                />
              ))}
            </div>
            {!isLoading && totalPages > 1 && (
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
      <div className="hidden xl:block">
        {isSearching ? (
          <UserTableSkeleton />
        ) : processedUsers.length > 0 ? (
          <>
            <UserTable
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
            {!isLoading && totalPages > 1 && (
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
      <UserModal
        open={isUserModalOpen}
        user={selectedUser}
        onClose={async () => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
          await refreshUsers();
        }}
        onSave={handleSaveUser}
      />
      <DeleteUserModal
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
      <AddUserModal
        open={isAddUserModalOpen}
        onClose={closeAddUserModal}
        onSuccess={refreshUsers}
      />
    </>
  );
}
