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

// ============================================================================
// Page Components
// ============================================================================
/**
 * Administration Page Content Component
 * Handles all state management and data fetching for the administration page
 */
function AdministrationPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const { activeSection, handleSectionChange } = useAdministrationNavigation();

  // ============================================================================
  // State Management
  // ============================================================================
  // Prevent hydration mismatch by rendering content only on client
  const [mounted, setMounted] = useState(false);

  // Track which sections have been loaded
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());

  // Track refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================================
  // Custom Hooks
  // ============================================================================
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

  // ============================================================================
  // Effects - Initialization
  // ============================================================================
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  // ============================================================================
  // Render Section Content
  // ============================================================================
  // ============================================================================
  // Render Section Content
  // ============================================================================
  const renderSectionContent = useCallback(() => {
    const userRoles = user?.roles || [];

    // Check access for each section
    if (activeSection === 'activity-logs') {
      if (!hasTabAccess(userRoles, 'administration', 'activity-logs')) {
        return (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                You don&apos;t have permission to access Activity Logs. Please
                contact your administrator for access.
              </p>
            </div>
          </div>
        );
      }
      return <ActivityLogsTable />;
    }

    if (activeSection === 'feedback') {
      if (!hasTabAccess(userRoles, 'administration', 'feedback')) {
        return (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                You don&apos;t have permission to access Feedback. Please
                contact your administrator for access.
              </p>
            </div>
          </div>
        );
      }
      return <FeedbackManagement />;
    }

    if (activeSection === 'licensees') {
      if (!hasTabAccess(userRoles, 'administration', 'licensees')) {
        return (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                You don&apos;t have permission to access Licensees. Please
                contact your administrator for access.
              </p>
            </div>
          </div>
        );
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

    // Default to users section
    if (!hasTabAccess(userRoles, 'administration', 'users')) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Access Restricted
            </h2>
            <p className="text-gray-600">
              You don&apos;t have permission to access Users. Please contact
              your administrator for access.
            </p>
          </div>
        </div>
      );
    }
    return (
      <AdministrationUsersSection
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
  }, [activeSection, user, usersHook, licenseesHook]);

  // ============================================================================
  // Early Returns
  // ============================================================================
  if (!mounted) return null;

  // ============================================================================
  // Early Returns
  // ============================================================================
  if (!mounted) return null;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout
      mainClassName="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full"
      showToaster={false}
      hideCurrencyFilter
    >
      {/* <MaintenanceBanner /> */}
      {/* Header Section: Admin icon, title, refresh icon, and action buttons */}
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
          {/* Mobile: Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
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

        {/* Desktop: Refresh icon and Create button - Desktop full button, Mobile icon only */}
        <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
          {/* Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
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
          {activeSection === 'users' ? (
            <Button
              onClick={usersHook.openAddUserModal}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
          ) : activeSection === 'licensees' ? (
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

        {/* Mobile: Create button - Icon only */}
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

      {/* Navigation Section: Tab navigation for different administration sections */}
      <div className="mb-6 mt-8">
        <AdministrationNavigation
          tabs={ADMINISTRATION_TABS_CONFIG}
          activeSection={activeSection}
          onChange={handleSectionChange}
          isLoading={usersHook.isLoading || licenseesHook.isLicenseesLoading}
        />
      </div>

      {/* Content Section: Main administration content with smooth transitions */}
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
