/**
 * Administration Page Content Component
 * Handles all state management and data fetching for the administration page.
 * Manages users, licencees, activity logs, and feedback sections.
 *
 * @module components/administration/AdministrationPageContent
 */
'use client';

import AdministrationFeedbackManagement from '@/components/CMS/administration/AdministrationFeedbackManagement';
import AdministrationNavigation from '@/components/CMS/administration/AdministrationNavigation';
import AdministrationCountriesSection from '@/components/CMS/administration/sections/AdministrationCountriesSection';
import AdministrationLicenceesSection from '@/components/CMS/administration/sections/AdministrationLicenceesSection';
import AdministrationUsersSection from '@/components/CMS/administration/sections/AdministrationUsersSection';
import AdministrationActivityLogsTable from '@/components/CMS/administration/tables/AdministrationActivityLogsTable';
import PageLayout from '@/components/shared/layout/PageLayout';
import { AccessRestricted } from '@/components/shared/ui/AccessRestricted';
import { Button } from '@/components/shared/ui/button';
import { ADMINISTRATION_TABS_CONFIG, IMAGES } from '@/lib/constants';
import { useAdministrationCountries } from '@/lib/hooks/administration/useAdministrationCountries';
import { useAdministrationLicencees } from '@/lib/hooks/administration/useAdministrationLicencees';
import { useAdministrationUsers } from '@/lib/hooks/administration/useAdministrationUsers';
import { useAdministrationNavigation } from '@/lib/hooks/navigation';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type { SortKey } from '@/lib/types/administration';
import { hasTabAccess, UserRole } from '@/lib/utils/permissions';
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

  // Licencees data and state management hook
  const licenceesHook = useAdministrationLicencees({
    activeSection,
    loadedSections,
    setLoadedSections,
  });

  // Countries state management hook
  const countriesHook = useAdministrationCountries();

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Ensure selected licencee is initialized
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
    const userRoles = user?.roles as UserRole[];

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

    // 3. Countries Section
    if (activeSection === 'countries') {
      if (!hasTabAccess(userRoles, 'administration', 'countries')) {
        return <AccessRestricted sectionName="Countries" />;
      }
      return (
        <AdministrationCountriesSection
          isAddModalOpen={countriesHook.isAddModalOpen}
          isEditModalOpen={countriesHook.isEditModalOpen}
          setIsEditModalOpen={countriesHook.openEditModal}
          isDeleteModalOpen={countriesHook.isDeleteModalOpen}
          setIsDeleteModalOpen={countriesHook.openDeleteModal}
          closeAddModal={countriesHook.closeAddModal}
          closeEditModal={countriesHook.closeEditModal}
          closeDeleteModal={countriesHook.closeDeleteModal}
          selectedCountry={countriesHook.selectedCountry}
          countries={countriesHook.countries}
          isLoading={countriesHook.isLoading}
          onRefresh={countriesHook.refreshCountries}
        />
      );
    }

    // 4. Licencees Section
    if (activeSection === 'licencees') {
      if (!hasTabAccess(userRoles, 'administration', 'licencees')) {
        return <AccessRestricted sectionName="Licencees" />;
      }
      return (
        <AdministrationLicenceesSection
          isLicenceesLoading={licenceesHook.isLicenceesLoading}
          filteredLicencees={licenceesHook.filteredLicencees}
          licenceeSearchValue={licenceesHook.licenceeSearchValue}
          isAddLicenceeModalOpen={licenceesHook.isAddLicenceeModalOpen}
          isEditLicenceeModalOpen={licenceesHook.isEditLicenceeModalOpen}
          isDeleteLicenceeModalOpen={licenceesHook.isDeleteLicenceeModalOpen}
          isPaymentHistoryModalOpen={licenceesHook.isPaymentHistoryModalOpen}
          isLicenceeSuccessModalOpen={licenceesHook.isLicenceeSuccessModalOpen}
          isPaymentConfirmModalOpen={licenceesHook.isPaymentConfirmModalOpen}
          countries={licenceesHook.countries}
          isCountriesLoading={licenceesHook.isCountriesLoading}
          selectedLicencee={licenceesHook.selectedLicencee}
          licenceeForm={licenceesHook.licenceeForm}
          selectedLicenceeForPayment={licenceesHook.selectedLicenceeForPayment}
          selectedLicenceeForPaymentChange={
            licenceesHook.selectedLicenceeForPaymentChange
          }
          createdLicencee={licenceesHook.createdLicencee}
          setLicenceeSearchValue={licenceesHook.setLicenceeSearchValue}
          setIsAddLicenceeModalOpen={licenceesHook.setIsAddLicenceeModalOpen}
          setIsEditLicenceeModalOpen={licenceesHook.setIsEditLicenceeModalOpen}
          setIsDeleteLicenceeModalOpen={
            licenceesHook.setIsDeleteLicenceeModalOpen
          }
          setIsPaymentHistoryModalOpen={
            licenceesHook.setIsPaymentHistoryModalOpen
          }
          setIsLicenceeSuccessModalOpen={
            licenceesHook.setIsLicenceeSuccessModalOpen
          }
          setIsPaymentConfirmModalOpen={
            licenceesHook.setIsPaymentConfirmModalOpen
          }
          setSelectedLicencee={licenceesHook.setSelectedLicencee}
          setLicenceeForm={licenceesHook.setLicenceeForm}
          setSelectedLicenceeForPayment={
            licenceesHook.setSelectedLicenceeForPayment
          }
          setSelectedLicenceeForPaymentChange={
            licenceesHook.setSelectedLicenceeForPaymentChange
          }
          setCreatedLicencee={licenceesHook.setCreatedLicencee}
          handleOpenAddLicencee={licenceesHook.handleOpenAddLicencee}
          handleSaveAddLicencee={licenceesHook.handleSaveAddLicencee}
          handleOpenEditLicencee={licenceesHook.handleOpenEditLicencee}
          handleSaveEditLicencee={licenceesHook.handleSaveEditLicencee}
          handleOpenDeleteLicencee={licenceesHook.handleOpenDeleteLicencee}
          handleDeleteLicencee={licenceesHook.handleDeleteLicencee}
          handlePaymentHistory={licenceesHook.handlePaymentHistory}
          handleTogglePaymentStatus={licenceesHook.handleTogglePaymentStatus}
          handleConfirmPaymentStatusChange={
            licenceesHook.handleConfirmPaymentStatusChange
          }
          refreshLicencees={licenceesHook.refreshLicencees}
        />
      );
    }

    // 5. Users Section (Default)
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
        requestSort={(key: SortKey) => usersHook.requestSort(key)}
        refreshUsers={usersHook.refreshUsers}
      />
    );
  }, [activeSection, user, usersHook, licenceesHook, selectedLicencee, countriesHook]);

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
      } else if (activeSection === 'licencees') {
        await licenceesHook.refreshLicencees();
      } else if (activeSection === 'feedback') {
        window.dispatchEvent(new CustomEvent('refreshFeedback'));
      } else if (activeSection === 'countries') {
        await countriesHook.refreshCountries();
      } else if (activeSection === 'activity-logs') {
        window.dispatchEvent(new CustomEvent('refreshActivityLogs'));
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeSection, usersHook, licenceesHook, countriesHook]);

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
      onRefresh={handleRefresh}
      refreshing={refreshing}
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
              className="flex items-center gap-1 rounded-md bg-button px-2 py-1 text-xs font-medium text-white hover:bg-buttonActive sm:gap-2 sm:px-6 sm:py-2 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Create new user</span>
              <span className="sm:hidden">Create</span>
            </Button>
          ) : activeSection === 'licencees' ? (
            <Button
              onClick={licenceesHook.handleOpenAddLicencee}
              disabled={
                licenceesHook.isCountriesLoading ||
                licenceesHook.countries.length === 0
              }
              className="flex items-center gap-1 rounded-md bg-button px-2 py-1 text-xs font-medium text-white hover:bg-buttonActive sm:gap-2 sm:px-6 sm:py-2 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Create new licencee</span>
              <span className="sm:hidden">Create</span>
            </Button>
          ) : activeSection === 'countries' ? (
            <Button
              onClick={countriesHook.openAddModal}
              className="flex items-center gap-1 rounded-md bg-button px-2 py-1 text-xs font-medium text-white hover:bg-buttonActive sm:gap-2 sm:px-6 sm:py-2 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Create new country</span>
              <span className="sm:hidden">Create</span>
            </Button>
          ) : null}
        </div>

      </div>

      {/* Tab Navigation Section */}
      <div className="mb-6 mt-8">
        <AdministrationNavigation
          tabs={ADMINISTRATION_TABS_CONFIG}
          activeSection={activeSection}
          onChange={handleSectionChange}
          isLoading={usersHook.isLoading || licenceesHook.isLicenceesLoading}
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

