'use client';
import DeleteUserModal from '@/components/administration/DeleteUserModal';
import LicenseeCardSkeleton from '@/components/administration/LicenseeCardSkeleton';
import LicenseeTableSkeleton from '@/components/administration/LicenseeTableSkeleton';
import SearchFilterBar from '@/components/administration/SearchFilterBar';
import UserCard from '@/components/administration/UserCard';
import UserCardSkeleton from '@/components/administration/UserCardSkeleton';
import UserTable from '@/components/administration/UserTable';
import UserTableSkeleton from '@/components/administration/UserTableSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';

import AdministrationNavigation from '@/components/administration/AdministrationNavigation';
import { Button } from '@/components/ui/button';
import PaginationControls from '@/components/ui/PaginationControls';
import type { AdministrationSection } from '@/lib/constants/administration';
import { ADMINISTRATION_TABS_CONFIG } from '@/lib/constants/administration';
// Activity logging removed - handled via API calls
import ActivityLogsTable from '@/components/administration/ActivityLogsTable';
import AddLicenseeModal from '@/components/administration/AddLicenseeModal';
import AddUserDetailsModal from '@/components/administration/AddUserDetailsModal';
import DeleteLicenseeModal from '@/components/administration/DeleteLicenseeModal';
import EditLicenseeModal from '@/components/administration/EditLicenseeModal';
import LicenseeCard from '@/components/administration/LicenseeCard';
import LicenseeSearchBar from '@/components/administration/LicenseeSearchBar';
import LicenseeSuccessModal from '@/components/administration/LicenseeSuccessModal';
import LicenseeTable from '@/components/administration/LicenseeTable';
import PaymentHistoryModal from '@/components/administration/PaymentHistoryModal';
import PaymentStatusConfirmModal from '@/components/administration/PaymentStatusConfirmModal';
import UserModal from '@/components/administration/UserModal';
import { IMAGES } from '@/lib/constants/images';
import { fetchUsers, updateUser } from '@/lib/helpers/administration';
import { administrationUtils } from '@/lib/helpers/administrationPage';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import { fetchCountries } from '@/lib/helpers/countries';
import { useAdministrationNavigation } from '@/lib/hooks/navigation';
import { useUserStore } from '@/lib/store/userStore';
import type {
  ResourcePermissions,
  SortKey,
  User,
} from '@/lib/types/administration';
import type { Licensee } from '@/lib/types/licensee';
import type { Country } from '@/lib/types/country';
import {
  detectChanges,
  filterMeaningfulChanges,
  getChangesSummary,
} from '@/lib/utils/changeDetection';
import { getNext30Days } from '@/lib/utils/licensee';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, PlusCircle } from 'lucide-react';
// import { useUrlProtection } from '@/lib/hooks/useUrlProtection';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { AddLicenseeForm, AddUserForm } from '@/lib/types/pages';
import axios from 'axios';

function AdministrationPageContent() {
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const { activeSection, handleSectionChange } = useAdministrationNavigation();

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }

    // Fallback
    return 'Unknown User';
  }, [user]);

  // Prevent hydration mismatch by rendering content only on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCountries = async () => {
      if (isMounted) {
        setIsCountriesLoading(true);
      }
      try {
        const data = await fetchCountries();
        if (isMounted) {
          setCountries(data || []);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch countries:', error);
        }
        if (isMounted) {
          setCountries([]);
          toast.error('Failed to load countries');
        }
      } finally {
        if (isMounted) {
          setIsCountriesLoading(false);
        }
      }
    };

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize selectedLicencee if not set
  useEffect(() => {
    if (!selectedLicencee) {
      setSelectedLicencee('');
    }
  }, [selectedLicencee, setSelectedLicencee]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [searchMode, setSearchMode] = useState<'username' | 'email'>(
    'username'
  );

  // URL protection for administration tabs - temporarily disabled for debugging
  // useUrlProtection({
  //   page: 'administration',
  //   allowedTabs: ['users', 'licensees', 'activity-logs'],
  //   defaultTab: 'users',
  //   redirectPath: '/unauthorized',
  // });
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(
    null
  );
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserStep, setAddUserStep] = useState<1 | 2>(1);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>({
    roles: [],
    allowedLocations: [],
  });
  const [allLicensees, setAllLicensees] = useState<Licensee[]>([]);
  const [isLicenseesLoading, setIsLicenseesLoading] = useState(true);
  const [isAddLicenseeModalOpen, setIsAddLicenseeModalOpen] = useState(false);
  const [isEditLicenseeModalOpen, setIsEditLicenseeModalOpen] = useState(false);
  const [isDeleteLicenseeModalOpen, setIsDeleteLicenseeModalOpen] =
    useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState<boolean>(true);
  const [selectedLicensee, setSelectedLicensee] = useState<Licensee | null>(
    null
  );
  const [licenseeForm, setLicenseeForm] = useState<AddLicenseeForm>({});
  const [licenseeSearchValue, setLicenseeSearchValue] = useState('');
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [selectedLicenseeForPayment, setSelectedLicenseeForPayment] =
    useState<Licensee | null>(null);
  const [createdLicensee, setCreatedLicensee] = useState<{
    name: string;
    licenseKey: string;
  } | null>(null);
  const [isLicenseeSuccessModalOpen, setIsLicenseeSuccessModalOpen] =
    useState(false);
  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] =
    useState(false);
  const [
    selectedLicenseeForPaymentChange,
    setSelectedLicenseeForPaymentChange,
  ] = useState<Licensee | null>(null);

  const countryNameById = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach(country => {
      map.set(country._id, country.name);
    });
    return map;
  }, [countries]);

  const getCountryNameById = useCallback(
    (countryId?: string) => {
      if (!countryId) return '';
      return countryNameById.get(countryId) || countryId;
    },
    [countryNameById]
  );

  const itemsPerPage = 5;

  // Track which sections have been loaded
  const [loadedSections, setLoadedSections] = useState<
    Set<AdministrationSection>
  >(new Set());

  // Track tab transition loading state
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  // Load users only when users tab is active and not already loaded
  useEffect(() => {
    if (activeSection === 'users' && !loadedSections.has('users')) {
      const loadUsers = async () => {
        setIsLoading(true);
        try {
          const usersData = await fetchUsers(selectedLicencee);
          setAllUsers(usersData || []);
          setLoadedSections(prev => new Set(prev).add('users'));
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch users:', error);
          }
          setAllUsers([]);
        }
        setIsLoading(false);
        setIsTabTransitioning(false);
      };
      loadUsers();
    }
  }, [activeSection, selectedLicencee, loadedSections]);

  // Load licensees only when licensees tab is active and not already loaded
  useEffect(() => {
    if (activeSection === 'licensees' && !loadedSections.has('licensees')) {
      const loadLicensees = async () => {
        setIsLicenseesLoading(true);
        try {
          const licenseesData = await fetchLicensees();
          setAllLicensees(licenseesData);
          setLoadedSections(prev => new Set(prev).add('licensees'));
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch licensees:', error);
          }
          setAllLicensees([]);
        }
        setIsLicenseesLoading(false);
        setIsTabTransitioning(false);
      };
      loadLicensees();
    }
  }, [activeSection, selectedLicencee, loadedSections]);

  const processedUsers = useMemo(() => {
    return administrationUtils.processUsers(
      allUsers,
      searchValue,
      searchMode,
      sortConfig
    );
  }, [allUsers, searchValue, searchMode, sortConfig]);

  const { paginatedItems: paginatedUsers, totalPages } = useMemo(() => {
    return administrationUtils.paginate(
      processedUsers,
      currentPage,
      itemsPerPage
    );
  }, [processedUsers, currentPage, itemsPerPage]);

  const requestSort = administrationUtils.createSortHandler(
    sortConfig,
    setSortConfig,
    setCurrentPage
  );

  const handleEditUser = async (user: User) => {
    // Set loading state and open modal first
    setIsUserModalOpen(true);
    setSelectedUser(null); // Set to null initially to trigger loading state

    try {
      // Fetch detailed user information
      const response = await axios.get(`/api/users/${user._id}`);
      if (response.data.success) {
        setSelectedUser(response.data.user);
      } else {
        toast.error('Failed to load user details');
        setIsUserModalOpen(false);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch user details:', error);
      }
      toast.error('Failed to load user details');
      setIsUserModalOpen(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (
    updated: Partial<User> & {
      password?: string;
      resourcePermissions: ResourcePermissions;
    }
  ) => {
    if (!selectedUser) return;

    // Validate that the updated data has the proper structure
    if (!updated.profile || !updated.profile.firstName) {
      toast.error('Invalid user data structure. Please check the form fields.');
      return;
    }

    // Detect actual changes between old and new user data
    const changes = detectChanges(selectedUser, updated);
    const meaningfulChanges = filterMeaningfulChanges(changes);

    // Only proceed if there are actual changes
    if (meaningfulChanges.length === 0) {
      toast.info('No changes detected');
      return;
    }

    const newData = { ...updated, _id: selectedUser._id };

    try {
      await updateUser(newData);

      // Log the update activity with proper change tracking
      try {
        const changesSummary = getChangesSummary(meaningfulChanges);
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'user',
            resourceId: selectedUser._id,
            resourceName: selectedUser.username,
            details: `Updated user: ${changesSummary}`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: selectedUser,
            newData: newData,
            changes: meaningfulChanges.map(change => ({
              field: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
            })),
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      // Only close modal and refresh data on success
      setIsUserModalOpen(false);
      setSelectedUser(null);
      // Refresh users with licensee filter
      setRefreshing(true);
      const usersData = await fetchUsers(selectedLicencee);
      setAllUsers(usersData);
      setRefreshing(false);
      toast.success(
        `User updated successfully: ${getChangesSummary(meaningfulChanges)}`
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update user:', error);
      }
      toast.error('Failed to update user');
      // Don't close modal on error - let user try again
    }
  };

  // Add User modal handlers
  const openAddUserModal = () => {
    setAddUserStep(1);
    setAddUserForm({ roles: [], allowedLocations: [] });
    setIsAddUserModalOpen(true);
  };
  const closeAddUserModal = async () => {
    setIsAddUserModalOpen(false);
    // Refresh users data when modal is closed
    try {
      const usersData = await fetchUsers(selectedLicencee);
      setAllUsers(usersData);
    } catch (error) {
      console.error('Failed to refresh users data:', error);
    }
  };
  const handleAddUserNext = () => setAddUserStep(2);
  const handleAddUserFormChange = (data: Partial<AddUserForm>) =>
    setAddUserForm(prev => ({ ...prev, ...data }));

  const handleOpenAddLicensee = () => {
    setLicenseeForm({});
    setIsAddLicenseeModalOpen(true);
  };
  const handleSaveAddLicensee = async () => {
    if (!licenseeForm.name || !licenseeForm.country) {
      toast.error('Name and country are required');
      return;
    }

    const licenseeData: {
      name: string;
      description?: string;
      country: string;
      startDate?: Date | string;
      expiryDate?: Date | string;
    } = {
      name: licenseeForm.name,
      country: licenseeForm.country,
    };

    // Only add optional fields if they have values
    if (licenseeForm.description) {
      licenseeData.description = licenseeForm.description;
    }
    if (licenseeForm.startDate) {
      licenseeData.startDate = licenseeForm.startDate;
    }
    if (licenseeForm.expiryDate) {
      licenseeData.expiryDate = licenseeForm.expiryDate;
    }

    try {
      const response = await fetch('/api/licensees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(licenseeData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create licensee');
      }

      // Log the creation activity
      if (result.licensee) {
        try {
          await fetch('/api/activity-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'create',
              resource: 'licensee',
              resourceId: result.licensee._id,
              resourceName: result.licensee.name,
              details: `Created new licensee: ${result.licensee.name} in ${getCountryNameById(licenseeForm.country)}`,
              userId: user?._id || 'unknown',
              username: getUserDisplayName(),
              userRole: 'user',
              previousData: null,
              newData: result.licensee,
              changes: [], // Will be calculated by the API
            }),
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to log activity:', error);
          }
        }
      }

      // Show success modal with license key
      if (result.licensee && result.licensee.licenseKey) {
        setCreatedLicensee({
          name: result.licensee.name,
          licenseKey: result.licensee.licenseKey,
        });
        setIsLicenseeSuccessModalOpen(true);
      }

      setIsAddLicenseeModalOpen(false);
      setLicenseeForm({});
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);
      toast.success('Licensee created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to add licensee'
      );
    }
  };
  const handleOpenEditLicensee = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setLicenseeForm({
      _id: licensee._id,
      name: licensee.name,
      description: licensee.description,
      country: licensee.country,
      startDate: licensee.startDate ? new Date(licensee.startDate) : undefined,
      expiryDate: licensee.expiryDate
        ? new Date(licensee.expiryDate)
        : undefined,
      prevStartDate: licensee.prevStartDate
        ? new Date(licensee.prevStartDate)
        : undefined,
      prevExpiryDate: licensee.prevExpiryDate
        ? new Date(licensee.prevExpiryDate)
        : undefined,
    });
    setIsEditLicenseeModalOpen(true);
  };
  const handleSaveEditLicensee = async () => {
    try {
      if (!selectedLicensee) return;

      // Include the current isPaid value to preserve payment status
      const updateData = {
        ...licenseeForm,
        _id: selectedLicensee._id,
        isPaid: selectedLicensee.isPaid, // Preserve current payment status
      };

      // Detect actual changes between old and new licensee data
      const changes = detectChanges(selectedLicensee, updateData);
      const meaningfulChanges = filterMeaningfulChanges(changes);

      // Only proceed if there are actual changes
      if (meaningfulChanges.length === 0) {
        toast.info('No changes detected');
        return;
      }

      const response = await fetch('/api/licensees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update licensee');
      }

      // Log the update activity with proper change tracking
      try {
        const changesSummary = getChangesSummary(meaningfulChanges);
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'licensee',
            resourceId: selectedLicensee._id,
            resourceName: selectedLicensee.name,
            details: `Updated licensee: ${changesSummary}`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: selectedLicensee,
            newData: updateData,
            changes: meaningfulChanges.map(change => ({
              field: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
            })),
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      // Only close modal and refresh data on success
      setIsEditLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setLicenseeForm({});
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);
      toast.success(
        `Licensee updated successfully: ${getChangesSummary(meaningfulChanges)}`
      );
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update licensee'
      );
      // Don't close modal on error - let user try again
    }
  };
  const handleOpenDeleteLicensee = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setIsDeleteLicenseeModalOpen(true);
  };
  const handleDeleteLicensee = async () => {
    if (!selectedLicensee) return;

    const licenseeData = { ...selectedLicensee };

    try {
      const response = await fetch('/api/licensees', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: selectedLicensee._id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete licensee');
      }

      // Log the deletion activity
      try {
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            resource: 'licensee',
            resourceId: selectedLicensee._id,
            resourceName: selectedLicensee.name,
            details: `Deleted licensee: ${selectedLicensee.name} from ${
              selectedLicensee.countryName ||
              getCountryNameById(selectedLicensee.country)
            }`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: licenseeData,
            newData: null,
            changes: [], // Will be calculated by the API
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      setIsDeleteLicenseeModalOpen(false);
      setSelectedLicensee(null);
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);
      toast.success('Licensee deleted successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete licensee'
      );
    }
  };

  const licenseesWithCountryNames = useMemo(() => {
    if (allLicensees.length === 0) return allLicensees;
    return allLicensees.map(licensee => ({
      ...licensee,
      countryName:
        licensee.countryName ||
        getCountryNameById(licensee.country) ||
        licensee.country,
    }));
  }, [allLicensees, getCountryNameById]);

  const filteredLicensees = useMemo(() => {
    if (!licenseeSearchValue) return licenseesWithCountryNames;
    const search = licenseeSearchValue.toLowerCase();
    return licenseesWithCountryNames.filter(licensee =>
      (licensee.name || '').toLowerCase().includes(search)
    );
  }, [licenseesWithCountryNames, licenseeSearchValue]);

  const paginatedLicensees = useMemo(() => {
    return filteredLicensees.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
  }, [filteredLicensees, currentPage, itemsPerPage]);

  const totalLicenseePages = useMemo(() => {
    return Math.ceil(filteredLicensees.length / itemsPerPage);
  }, [filteredLicensees, itemsPerPage]);

  const handlePaymentHistory = (licensee: Licensee) => {
    setSelectedLicenseeForPayment(licensee);
    setIsPaymentHistoryModalOpen(true);
  };

  const handleTogglePaymentStatus = (licensee: Licensee) => {
    setSelectedLicenseeForPaymentChange(licensee);
    setIsPaymentConfirmModalOpen(true);
  };

  const handleConfirmPaymentStatusChange = async () => {
    if (!selectedLicenseeForPaymentChange) return;

    try {
      // Determine current payment status
      const currentIsPaid =
        selectedLicenseeForPaymentChange.isPaid !== undefined
          ? selectedLicenseeForPaymentChange.isPaid
          : selectedLicenseeForPaymentChange.expiryDate
            ? new Date(selectedLicenseeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      // Prepare update data
      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenseeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      // If changing from unpaid to paid, extend expiry date by 30 days
      if (!currentIsPaid && newIsPaid) {
        updateData.prevExpiryDate = selectedLicenseeForPaymentChange.expiryDate
          ? new Date(selectedLicenseeForPaymentChange.expiryDate)
          : undefined;
        updateData.expiryDate = getNext30Days();
      }

      await axios.put('/api/licensees', updateData);

      // Log the payment status change activity
      try {
        await fetch('/api/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            resource: 'licensee',
            resourceId: selectedLicenseeForPaymentChange._id,
            resourceName: selectedLicenseeForPaymentChange.name,
            details: `Changed payment status for ${
              selectedLicenseeForPaymentChange.name
            } from ${currentIsPaid ? 'Paid' : 'Unpaid'} to ${
              newIsPaid ? 'Paid' : 'Unpaid'
            }`,
            userId: user?._id || 'unknown',
            username: getUserDisplayName(),
            userRole: 'user',
            previousData: selectedLicenseeForPaymentChange,
            newData: updateData,
            changes: [], // Will be calculated by the API
          }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to log activity:', error);
        }
      }

      // Refresh licensees list
      setIsLicenseesLoading(true);
      const data = await fetchLicensees();
      setAllLicensees(data);
      setIsLicenseesLoading(false);

      // Close modal
      setIsPaymentConfirmModalOpen(false);
      setSelectedLicenseeForPaymentChange(null);
      toast.success('Licensee payment status updated successfully');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update payment status:', error);
      }
      toast.error('Failed to update payment status');
    }
  };

  const renderSectionContent = useCallback(() => {
    if (activeSection === 'activity-logs') {
      return <ActivityLogsTable />;
    }

    if (activeSection === 'licensees') {
      if (isLicenseesLoading) {
        return (
          <>
            <div className="block xl:hidden">
              <LicenseeCardSkeleton />
            </div>
            <div className="hidden xl:block">
              <LicenseeTableSkeleton />
            </div>
          </>
        );
      }
      return (
        <>
          <LicenseeSearchBar
            searchValue={licenseeSearchValue}
            setSearchValue={setLicenseeSearchValue}
          />
          {!isCountriesLoading && countries.length === 0 && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              No countries are available. Please add countries first before
              creating or updating licensees.
            </p>
          )}
          <div className="block xl:hidden">
            {paginatedLicensees.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {paginatedLicensees.map(licensee => (
                  <LicenseeCard
                    key={licensee._id}
                    licensee={licensee}
                    onEdit={handleOpenEditLicensee}
                    onDelete={handleOpenDeleteLicensee}
                    onPaymentHistory={handlePaymentHistory}
                    onTogglePaymentStatus={handleTogglePaymentStatus}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-gray-500">
                No licensees found.
              </p>
            )}
          </div>
          <div className="hidden xl:block">
            <LicenseeTable
              licensees={paginatedLicensees}
              onEdit={handleOpenEditLicensee}
              onDelete={handleOpenDeleteLicensee}
              onPaymentHistory={handlePaymentHistory}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalLicenseePages}
            setCurrentPage={setCurrentPage}
          />
          <AddLicenseeModal
            open={isAddLicenseeModalOpen}
            onClose={async () => {
              setIsAddLicenseeModalOpen(false);
              // Refresh licensees data when modal is closed
              try {
                const data = await fetchLicensees();
                setAllLicensees(data);
              } catch (error) {
                console.error('Failed to refresh licensees data:', error);
              }
            }}
            onSave={handleSaveAddLicensee}
            formState={licenseeForm}
            setFormState={data =>
              setLicenseeForm(prev => ({ ...prev, ...data }))
            }
            countries={countries}
            countriesLoading={isCountriesLoading}
          />
          <EditLicenseeModal
            open={isEditLicenseeModalOpen}
            onClose={async () => {
              setIsEditLicenseeModalOpen(false);
              // Refresh licensees data when modal is closed
              try {
                const data = await fetchLicensees();
                setAllLicensees(data);
              } catch (error) {
                console.error('Failed to refresh licensees data:', error);
              }
            }}
            onSave={handleSaveEditLicensee}
            formState={licenseeForm}
            setFormState={data =>
              setLicenseeForm(prev => ({ ...prev, ...data }))
            }
            countries={countries}
            countriesLoading={isCountriesLoading}
          />
          <DeleteLicenseeModal
            open={isDeleteLicenseeModalOpen}
            onClose={() => setIsDeleteLicenseeModalOpen(false)}
            onDelete={handleDeleteLicensee}
            licensee={selectedLicensee}
          />
          <PaymentHistoryModal
            open={isPaymentHistoryModalOpen}
            onClose={() => {
              setIsPaymentHistoryModalOpen(false);
              setSelectedLicenseeForPayment(null);
            }}
            licensee={selectedLicenseeForPayment}
          />
          <LicenseeSuccessModal
            open={isLicenseeSuccessModalOpen}
            onClose={() => {
              setIsLicenseeSuccessModalOpen(false);
              setCreatedLicensee(null);
            }}
            licensee={createdLicensee}
          />
          <PaymentStatusConfirmModal
            open={isPaymentConfirmModalOpen}
            onClose={() => {
              setIsPaymentConfirmModalOpen(false);
              setSelectedLicenseeForPaymentChange(null);
            }}
            onConfirm={handleConfirmPaymentStatusChange}
            currentStatus={
              selectedLicenseeForPaymentChange?.isPaid !== undefined
                ? selectedLicenseeForPaymentChange.isPaid
                : selectedLicenseeForPaymentChange?.expiryDate
                  ? new Date(selectedLicenseeForPaymentChange.expiryDate) >
                    new Date()
                  : false
            }
            licenseeName={selectedLicenseeForPaymentChange?.name || ''}
            currentExpiryDate={selectedLicenseeForPaymentChange?.expiryDate}
          />
        </>
      );
    }

    if (isLoading) {
      return (
        <>
          <div className="block xl:hidden">
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </div>
          </div>
          <div className="hidden xl:block">
            <UserTableSkeleton />
          </div>
        </>
      );
    }

    return (
      <>
        <SearchFilterBar
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          searchDropdownOpen={searchDropdownOpen}
          setSearchDropdownOpen={setSearchDropdownOpen}
        />
        <div className="block md:block xl:hidden">
          {paginatedUsers.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {paginatedUsers.map(user => (
                <UserCard
                  key={user.username}
                  user={user}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-gray-500">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <div className="hidden xl:block">
          {paginatedUsers.length > 0 ? (
            <UserTable
              users={paginatedUsers}
              sortConfig={sortConfig}
              requestSort={requestSort}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          ) : (
            <p className="py-10 text-center text-gray-500">
              No users found matching your criteria.
            </p>
          )}
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
        <UserModal
          open={isUserModalOpen}
          user={selectedUser}
          onClose={async () => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
            // Refresh users data when modal is closed
            try {
              const usersData = await fetchUsers(selectedLicencee);
              setAllUsers(usersData);
            } catch (error) {
              console.error('Failed to refresh users data:', error);
            }
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
            if (!selectedUserToDelete) return;

            const userData = { ...selectedUserToDelete };

            try {
              await axios.delete('/api/users', {
                data: { _id: selectedUserToDelete._id },
              });

              // Log the deletion activity
              try {
                await fetch('/api/activity-logs', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'delete',
                    resource: 'user',
                    resourceId: selectedUserToDelete._id,
                    resourceName: selectedUserToDelete.username,
                    details: `Deleted user: ${
                      selectedUserToDelete.username
                    } with roles: ${userData.roles?.join(', ') || 'N/A'}`,
                    userId: user?._id || 'unknown',
                    username: getUserDisplayName(),
                    userRole: 'user',
                    previousData: userData,
                    newData: null,
                    changes: [], // Will be calculated by the API
                  }),
                });
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Failed to log activity:', error);
                }
              }

              // Refresh users
              const usersData = await fetchUsers();
              setAllUsers(usersData);
              toast.success('User deleted successfully');
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Failed to delete user:', error);
              }
              toast.error('Failed to delete user');
            }
            setIsDeleteModalOpen(false);
            setSelectedUserToDelete(null);
          }}
        />
        <AddUserDetailsModal
          open={isAddUserModalOpen && addUserStep === 1}
          onClose={closeAddUserModal}
          onNext={handleAddUserNext}
          formState={addUserForm}
          setFormState={handleAddUserFormChange}
        />
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeSection,
    isLicenseesLoading,
    isLoading,
    paginatedLicensees,
    paginatedUsers,
    currentPage,
    totalLicenseePages,
    totalPages,
    sortConfig,
    licenseeSearchValue,
    allUsers,
    searchValue,
    searchMode,
    handleOpenEditLicensee,
    handleOpenDeleteLicensee,
    handlePaymentHistory,
    handleTogglePaymentStatus,
    handleEditUser,
    handleDeleteUser,
    requestSort,
    setCurrentPage,
    isAddLicenseeModalOpen,
    isEditLicenseeModalOpen,
    isDeleteLicenseeModalOpen,
    isPaymentHistoryModalOpen,
    isPaymentConfirmModalOpen,
    isLicenseeSuccessModalOpen,
    licenseeForm,
    setLicenseeForm,
    handleSaveAddLicensee,
    handleSaveEditLicensee,
    handleDeleteLicensee,
    handleConfirmPaymentStatusChange,
    selectedLicensee,
    selectedLicenseeForPayment,
    selectedLicenseeForPaymentChange,
    fetchLicensees,
    fetchUsers,
  ]);

  if (!mounted) return null;
  return (
    <PageLayout
      mainClassName="flex flex-col flex-1 p-4 lg:p-6 w-full max-w-full"
      showToaster={false}
    >
      {/* Header Section: Admin icon, title, refresh icon, and action buttons */}
      <div className="flex items-center justify-between mt-4 md:mt-6 w-full max-w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            Administration
            <Image
              src={IMAGES.adminIcon}
              alt="Admin Icon"
              width={32}
              height={32}
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0"
            />
          </h1>
          {/* Mobile: Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              if (activeSection === 'users') {
                const usersData = await fetchUsers(selectedLicencee);
                setAllUsers(usersData);
              } else if (activeSection === 'licensees') {
                const licenseesData = await fetchLicensees();
                setAllLicensees(licenseesData);
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="md:hidden ml-auto p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Desktop: Refresh icon and Create button - Desktop full button, Mobile icon only */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {/* Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              if (activeSection === 'users') {
                const usersData = await fetchUsers(selectedLicencee);
                setAllUsers(usersData);
              } else if (activeSection === 'licensees') {
                const licenseesData = await fetchLicensees();
                setAllLicensees(licenseesData);
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          {activeSection === 'users' ? (
            <Button
              onClick={openAddUserModal}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
          ) : activeSection === 'licensees' ? (
            <Button
              onClick={handleOpenAddLicensee}
              disabled={isCountriesLoading || countries.length === 0}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add Licensee
            </Button>
          ) : null}
        </div>

        {/* Mobile: Create button - Icon only */}
        <div className="md:hidden flex items-center gap-2 flex-shrink-0">
          {activeSection === 'users' ? (
            <button
              onClick={openAddUserModal}
              disabled={refreshing}
              className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Add User"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          ) : activeSection === 'licensees' ? (
            <button
              onClick={handleOpenAddLicensee}
              disabled={
                refreshing || isCountriesLoading || countries.length === 0
              }
              className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
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
          isLoading={isLoading || isLicenseesLoading || isTabTransitioning}
        />
      </div>

      {/* Content Section: Main administration content with smooth transitions */}
      <div
        data-section-content
        className="transition-all duration-300 ease-in-out"
      >
        {isTabTransitioning ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-button"></div>
              <p className="text-gray-600">Loading {activeSection}...</p>
            </div>
          </div>
        ) : (
          renderSectionContent()
        )}
      </div>
    </PageLayout>
  );
}

export default function AdministrationPage() {
  return (
    <ProtectedRoute requireAdminAccess={true}>
      <Suspense fallback={<UserTableSkeleton />}>
        <AdministrationPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
