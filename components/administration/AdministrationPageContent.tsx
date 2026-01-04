/**
 * Administration Page Content Component
 * Handles all state management and data fetching for the administration page.
 * Manages users, licensees, activity logs, and feedback sections.
 *
 * @module components/administration/AdministrationPageContent
 */
'use client';

import AdministrationActivityLogsTable from '@/components/administration/tables/AdministrationActivityLogsTable';
import AdministrationNavigation from '@/components/administration/AdministrationNavigation';
import AdministrationFeedbackManagement from '@/components/administration/AdministrationFeedbackManagement';
import AdministrationLicenseesSection from '@/components/administration/sections/AdministrationLicenseesSection';
import AdministrationUsersSection from '@/components/administration/sections/AdministrationUsersSection';
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
import { useCallback, useEffect, useState } from 'react';

export default function AdministrationPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const { activeSection, handleSectionChange } = useAdministrationNavigation();

  const [mounted, setMounted] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Users data and state management hook
  const usersHook = useAdministrationUsers({
    selectedLicencee,
    activeSection,
    loadedSections,
    setLoadedSections,
    mounted,
  });

  // Licensees data and state management hook
  const licenseesHook = useAdministrationLicensees({
    activeSection,
    loadedSections,
    setLoadedSections,
  });

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Ensure selected licensee is initialized
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  // ============================================================================
  // Render Helpers
  // ============================================================================
  /**
   * Renders the content for the currently active administration section.
   * Handles permission checks and returns appropriate content or access denied message.
   */
  const renderSectionContent = useCallback(() => {
    const userRoles = user?.roles || [];

    // 1. Activity Logs Section
    if (activeSection === 'activity-logs') {
      if (!hasTabAccess(userRoles, 'administration', 'activity-logs')) {
        return <AccessRestricted sectionName="Activity Logs" />;
      }
      return <AdministrationActivityLogsTable />;
    }

    // 2. Feedback Section
    if (activeSection === 'feedback') {
      if (!hasTabAccess(userRoles, 'administration', 'feedback')) {
        return <AccessRestricted sectionName="Feedback" />;
      }
      return <AdministrationFeedbackManagement />;
    }

    // 3. Licensees Section
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

    // 4. Users Section (Default)
    if (!hasTabAccess(userRoles, 'administration', 'users')) {
      return <AccessRestricted sectionName="Users" />;
    }
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

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Manual refresh handler for all administration sections.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeSection === 'users') {
        await usersHook.refreshUsers();
      } else if (activeSection === 'licensees') {
        await licenseesHook.refreshLicensees();
      } else if (activeSection === 'feedback') {
        window.dispatchEvent(new CustomEvent('refreshFeedback'));
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeSection, usersHook, licenseesHook]);

  // Prevent hydration mismatch
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
      {/* Page Header & Desktop Actions */}
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
          {/* Mobile Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Desktop Refresh and Action Buttons */}
        <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
          <button
            onClick={handleRefresh}
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

        {/* Mobile Create Button */}
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

      {/* Tab Navigation Section */}
      <div className="mb-6 mt-8">
        <AdministrationNavigation
          tabs={ADMINISTRATION_TABS_CONFIG}
          activeSection={activeSection}
          onChange={handleSectionChange}
          isLoading={usersHook.isLoading || licenseesHook.isLicenseesLoading}
        />
      </div>

      {/* Main Content Area */}
      <div
        data-section-content
        className="transition-all duration-300 ease-in-out"
      >
        {renderSectionContent()}
      </div>
    </PageLayout>
  );
}
