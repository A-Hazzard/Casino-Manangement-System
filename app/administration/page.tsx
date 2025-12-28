/**
 * Administration Page
 *
 * Main administration page for managing users, licensees, and system settings.
 *
 * Features:
 * - Users section: View, create, edit, and delete users
 * - Licensees section: View, create, edit, and delete licensees
 * - Activity Logs section: View system activity logs
 * - Feedback Management section: Manage user feedback
 * - Role-based access control
 * - Search and filter capabilities
 * - Pagination
 * - Responsive design for mobile and desktop
 */

'use client';

import ActivityLogsTable from '@/components/administration/ActivityLogsTable';
import AdministrationNavigation from '@/components/administration/AdministrationNavigation';
import FeedbackManagement from '@/components/administration/FeedbackManagement';
import AdministrationLicenseesSection from '@/components/administration/sections/AdministrationLicenseesSection';
import AdministrationUsersSection from '@/components/administration/sections/AdministrationUsersSection';
import UserTableSkeleton from '@/components/administration/UserTableSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { AccessRestricted } from '@/components/ui/AccessRestricted';
import { Button } from '@/components/ui/button';
import { ADMINISTRATION_TABS_CONFIG } from '@/lib/constants/administration';
import { IMAGES } from '@/lib/constants/images';
import { useAdministrationLicensees } from '@/lib/hooks/administration/useAdministrationLicensees';
import { useAdministrationUsers } from '@/lib/hooks/administration/useAdministrationUsers';
import { useAdministrationNavigation } from '@/lib/hooks/navigation';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { hasTabAccess } from '@/lib/utils/permissions';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useState } from 'react';

/**
 * Administration Page Content Component
 *
 * Handles all state management and data fetching for the administration page.
 * Manages users, licensees, activity logs, and feedback sections.
 */
function AdministrationPageContent() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const { activeSection, handleSectionChange } = useAdministrationNavigation();

  const [mounted, setMounted] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const usersHook = useAdministrationUsers({
    selectedLicencee,
    activeSection,
    loadedSections,
    setLoadedSections,
    mounted,
  });

  const licenseesHook = useAdministrationLicensees({
    activeSection,
    loadedSections,
    setLoadedSections,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  /**
   * Renders the content for the currently active administration section.
   * Handles permission checks and returns appropriate content or access denied message.
   */
  const renderSectionContent = useCallback(() => {
    const userRoles = user?.roles || [];

    // Check if user is trying to access the Activity Logs section
    if (activeSection === 'activity-logs') {
      if (!hasTabAccess(userRoles, 'administration', 'activity-logs')) {
        return <AccessRestricted sectionName="Activity Logs" />;
      }
      // User has access, show the Activity Logs table
      return <ActivityLogsTable />;
    }

    // Check if user is trying to access the Feedback section
    if (activeSection === 'feedback') {
      if (!hasTabAccess(userRoles, 'administration', 'feedback')) {
        return <AccessRestricted sectionName="Feedback" />;
      }
      // User has access, show the Feedback Management component
      return <FeedbackManagement />;
    }

    // Check if user is trying to access the Licensees section
    if (activeSection === 'licensees') {
      if (!hasTabAccess(userRoles, 'administration', 'licensees')) {
        return <AccessRestricted sectionName="Licensees" />;
      }
      return (
        <AdministrationLicenseesSection
          isLicenseesLoading={licenseesHook.isLicenseesLoading}
          filteredLicensees={licenseesHook.filteredLicensees}
          licenseeSearchValue={licenseesHook.licenseeSearchValue}
          isAddLicenseeModalOpen={licenseesHook.isAddLicenseeModalOpen}
          isEditLicenseeModalOpen={licenseesHook.isEditLicenseeModalOpen}
          isDeleteLicenseeModalOpen={licenseesHook.isDeleteLicenseeModalOpen}
          isPaymentHistoryModalOpen={licenseesHook.isPaymentHistoryModalOpen}
          isLicenseeSuccessModalOpen={licenseesHook.isLicenseeSuccessModalOpen}
          isPaymentConfirmModalOpen={licenseesHook.isPaymentConfirmModalOpen}
          countries={licenseesHook.countries}
          isCountriesLoading={licenseesHook.isCountriesLoading}
          selectedLicensee={licenseesHook.selectedLicensee}
          licenseeForm={licenseesHook.licenseeForm}
          selectedLicenseeForPayment={licenseesHook.selectedLicenseeForPayment}
          selectedLicenseeForPaymentChange={
            licenseesHook.selectedLicenseeForPaymentChange
          }
          createdLicensee={licenseesHook.createdLicensee}
          setLicenseeSearchValue={licenseesHook.setLicenseeSearchValue}
          setIsAddLicenseeModalOpen={licenseesHook.setIsAddLicenseeModalOpen}
          setIsEditLicenseeModalOpen={licenseesHook.setIsEditLicenseeModalOpen}
          setIsDeleteLicenseeModalOpen={
            licenseesHook.setIsDeleteLicenseeModalOpen
          }
          setIsPaymentHistoryModalOpen={
            licenseesHook.setIsPaymentHistoryModalOpen
          }
          setIsLicenseeSuccessModalOpen={
            licenseesHook.setIsLicenseeSuccessModalOpen
          }
          setIsPaymentConfirmModalOpen={
            licenseesHook.setIsPaymentConfirmModalOpen
          }
          setSelectedLicensee={licenseesHook.setSelectedLicensee}
          setLicenseeForm={licenseesHook.setLicenseeForm}
          setSelectedLicenseeForPayment={
            licenseesHook.setSelectedLicenseeForPayment
          }
          setSelectedLicenseeForPaymentChange={
            licenseesHook.setSelectedLicenseeForPaymentChange
          }
          setCreatedLicensee={licenseesHook.setCreatedLicensee}
          handleOpenAddLicensee={licenseesHook.handleOpenAddLicensee}
          handleSaveAddLicensee={licenseesHook.handleSaveAddLicensee}
          handleOpenEditLicensee={licenseesHook.handleOpenEditLicensee}
          handleSaveEditLicensee={licenseesHook.handleSaveEditLicensee}
          handleOpenDeleteLicensee={licenseesHook.handleOpenDeleteLicensee}
          handleDeleteLicensee={licenseesHook.handleDeleteLicensee}
          handlePaymentHistory={licenseesHook.handlePaymentHistory}
          handleTogglePaymentStatus={licenseesHook.handleTogglePaymentStatus}
          handleConfirmPaymentStatusChange={
            licenseesHook.handleConfirmPaymentStatusChange
          }
          refreshLicensees={licenseesHook.refreshLicensees}
        />
      );
    }

    // Default to Users section - check if user has access
    if (!hasTabAccess(userRoles, 'administration', 'users')) {
      // If user doesn't have access to Users, show restricted message
      return <AccessRestricted sectionName="Users" />;
    }
    // User has access, show the Users section with all user management functionality
    return (
      <AdministrationUsersSection
        selectedLicencee={selectedLicencee}
        isLoading={usersHook.isLoading}
        isSearching={usersHook.isSearching}
        processedUsers={usersHook.processedUsers}
        totalPages={usersHook.totalPages}
        currentPage={usersHook.currentPage}
        searchValue={usersHook.searchValue}
        selectedRole={usersHook.selectedRole}
        selectedStatus={usersHook.selectedStatus}
        sortConfig={
          usersHook.sortConfig
            ? {
                key: usersHook.sortConfig.key || '',
                direction: usersHook.sortConfig.direction,
              }
            : null
        }
        isUserModalOpen={usersHook.isUserModalOpen}
        isDeleteModalOpen={usersHook.isDeleteModalOpen}
        isAddUserModalOpen={usersHook.isAddUserModalOpen}
        selectedUser={usersHook.selectedUser}
        selectedUserToDelete={usersHook.selectedUserToDelete}
        currentUser={user}
        setSearchValue={usersHook.setSearchValue}
        setSelectedRole={usersHook.setSelectedRole}
        setSelectedStatus={usersHook.setSelectedStatus}
        setCurrentPage={usersHook.setCurrentPage}
        setIsUserModalOpen={usersHook.setIsUserModalOpen}
        setSelectedUser={usersHook.setSelectedUser}
        setIsDeleteModalOpen={usersHook.setIsDeleteModalOpen}
        setSelectedUserToDelete={usersHook.setSelectedUserToDelete}
        setIsAddUserModalOpen={usersHook.setIsAddUserModalOpen}
        handleEditUser={usersHook.handleEditUser}
        handleDeleteUser={usersHook.handleDeleteUser}
        handleSaveUser={usersHook.handleSaveUser}
        handleDeleteUserConfirm={usersHook.handleDeleteUserConfirm}
        closeAddUserModal={usersHook.closeAddUserModal}
        requestSort={(key: string) => usersHook.requestSort(key as never)}
        refreshUsers={usersHook.refreshUsers}
      />
    );
  }, [activeSection, user, usersHook, licenseesHook, selectedLicencee]);

  // Wait for component to mount on client to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <PageLayout
      mainClassName="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full"
      showToaster={false}
      hideCurrencyFilter
    >
      {/* Page Header */}
      <div className="mt-4 flex w-full max-w-full items-center justify-between md:mt-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
            Administration
            <Image
              src={IMAGES.adminIcon}
              alt="Admin Icon"
              width={32}
              height={32}
              className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6 md:h-8 md:w-8"
            />
          </h1>
          {/* Mobile: Refresh Button */}
          <button
            onClick={async () => {
              setRefreshing(true);
              // Refresh data based on which section is currently active
              if (activeSection === 'users') {
                await usersHook.refreshUsers();
              } else if (activeSection === 'licensees') {
                await licenseesHook.refreshLicensees();
              } else if (activeSection === 'feedback') {
                window.dispatchEvent(new CustomEvent('refreshFeedback'));
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="ml-auto flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Desktop: Refresh and Create Buttons */}
        <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
          <button
            onClick={async () => {
              setRefreshing(true);
              // Refresh data based on which section is currently active
              if (activeSection === 'users') {
                await usersHook.refreshUsers();
              } else if (activeSection === 'licensees') {
                await licenseesHook.refreshLicensees();
              } else if (activeSection === 'feedback') {
                window.dispatchEvent(new CustomEvent('refreshFeedback'));
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
          {/* Show "Add User" button only when Users section is active */}
          {activeSection === 'users' ? (
            <Button
              onClick={usersHook.openAddUserModal}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
          ) : /* Show "Add Licensee" button only when Licensees section is active */
          activeSection === 'licensees' ? (
            <Button
              onClick={licenseesHook.handleOpenAddLicensee}
              disabled={
                licenseesHook.isCountriesLoading ||
                licenseesHook.countries.length === 0
              }
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add Licensee
            </Button>
          ) : null}
        </div>

        {/* Mobile: Create Button */}
        <div className="flex flex-shrink-0 items-center gap-2 md:hidden">
          {activeSection === 'users' ? (
            <button
              onClick={usersHook.openAddUserModal}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Add User"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          ) : activeSection === 'licensees' ? (
            <button
              onClick={licenseesHook.handleOpenAddLicensee}
              disabled={
                refreshing ||
                licenseesHook.isCountriesLoading ||
                licenseesHook.countries.length === 0
              }
              className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Add Licensee"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 mt-8">
        <AdministrationNavigation
          tabs={ADMINISTRATION_TABS_CONFIG}
          activeSection={activeSection}
          onChange={handleSectionChange}
          isLoading={usersHook.isLoading || licenseesHook.isLicenseesLoading}
        />
      </div>

      {/* Main Content */}
      <div
        data-section-content
        className="transition-all duration-300 ease-in-out"
      >
        {renderSectionContent()}
      </div>
    </PageLayout>
  );
}

/**
 * Administration Page Component
 * Thin wrapper that handles routing and authentication
 */
export default function AdministrationPage() {
  return (
    <ProtectedRoute requiredPage="administration">
      <Suspense fallback={<UserTableSkeleton />}>
        <AdministrationPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
