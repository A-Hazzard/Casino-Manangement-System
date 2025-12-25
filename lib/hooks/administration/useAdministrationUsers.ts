/**
 * useAdministrationUsers Hook
 *
 * Encapsulates all state and logic for the Users section of the Administration page.
 * Handles user data fetching, search, filtering, pagination, and CRUD operations.
 */

'use client';

import { fetchUsers } from '@/lib/helpers/administration';
import { saveUserHelper } from '@/lib/helpers/administration/saveUserHelper';
import { administrationUtils } from '@/lib/helpers/administrationPage';
import { useUserStore } from '@/lib/store/userStore';
import type { SortKey, User } from '@/lib/types/administration';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type UseAdministrationUsersProps = {
  selectedLicencee: string | null;
  activeSection: string;
  loadedSections: Set<string>;
  setLoadedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  mounted: boolean;
};

const itemsPerPage = 10;
const itemsPerBatch = 50;
const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

export function useAdministrationUsers({
  selectedLicencee,
  activeSection,
  loadedSections,
  setLoadedSections,
  mounted,
}: UseAdministrationUsersProps) {
  const { user } = useUserStore();

  // ============================================================================
  // State Management
  // ============================================================================
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLoadedUsers, setAllLoadedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [usingBackendSearch, setUsingBackendSearch] = useState(false);
  const [paginationMetadata, setPaginationMetadata] = useState<{
    total: number;
    totalPages: number;
  } | null>(null);
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

  // Track if we've attempted backend search for role/status filter
  const hasAttemptedBackendFilterRef = useRef(false);
  const lastFilterKeyRef = useRef<string>('');

  // ============================================================================
  // Computed Values
  // ============================================================================
  const isDeveloper = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(
      role => typeof role === 'string' && role.toLowerCase() === 'developer'
    );
  }, [user?.roles]);

  // Calculate which batch corresponds to the current page
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / pagesPerBatch) + 1;
  }, []);

  // Apply role filter to all users first (before pagination)
  const roleFilteredUsers = useMemo(() => {
    if (selectedRole === 'all') {
      return allUsers;
    }
    return allUsers.filter(user => {
      const userRoles = user.roles || [];
      return userRoles.some(
        role =>
          typeof role === 'string' &&
          role.toLowerCase() === selectedRole.toLowerCase()
      );
    });
  }, [allUsers, selectedRole]);

  // Get items for current page from the role-filtered users
  const paginatedUsers = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return roleFilteredUsers.slice(startIndex, endIndex);
  }, [roleFilteredUsers, currentPage]);

  // Calculate total pages based on role-filtered users or search results
  const totalPages = useMemo(() => {
    if (usingBackendSearch && paginationMetadata) {
      return paginationMetadata.totalPages > 0
        ? paginationMetadata.totalPages
        : 1;
    }
    const totalItems = roleFilteredUsers.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [roleFilteredUsers.length, usingBackendSearch, paginationMetadata]);

  const processedUsers = useMemo(() => {
    const effectiveSearchValue = usingBackendSearch ? '' : searchValue;
    return administrationUtils.processUsers(
      paginatedUsers,
      effectiveSearchValue,
      'username',
      sortConfig,
      isDeveloper
    );
  }, [
    paginatedUsers,
    searchValue,
    usingBackendSearch,
    sortConfig,
    isDeveloper,
  ]);

  const requestSort = administrationUtils.createSortHandler(
    sortConfig,
    setSortConfig
  );

  // ============================================================================
  // Effects
  // ============================================================================
  // Reset users data when licensee or status changes
  useEffect(() => {
    if (!mounted) return;

    const filterKey = `${selectedLicencee}-${selectedStatus}-${selectedRole}`;
    if (lastFilterKeyRef.current !== filterKey) {
      hasAttemptedBackendFilterRef.current = false;
      lastFilterKeyRef.current = filterKey;
    }

    setAllUsers([]);
    setAllLoadedUsers([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    setLoadedSections(prev => {
      if (!prev.has('users')) {
        return prev;
      }
      const updated = new Set(prev);
      updated.delete('users');
      return updated;
    });
  }, [
    selectedLicencee,
    selectedStatus,
    selectedRole,
    mounted,
    setLoadedSections,
  ]);

  // Debounce search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Reset backend search state when search is cleared
  useEffect(() => {
    if (!debouncedSearchValue || !debouncedSearchValue.trim()) {
      setUsingBackendSearch(false);
      setPaginationMetadata(null);
      setIsSearching(false);
      setAllUsers(allLoadedUsers);
      setCurrentPage(0);
    }
  }, [debouncedSearchValue, allLoadedUsers]);

  // Frontend search - search through loaded users first
  useEffect(() => {
    if (activeSection !== 'users') return;
    if (!debouncedSearchValue || !debouncedSearchValue.trim()) {
      setUsingBackendSearch(false);
      return;
    }

    const lowerSearchValue = debouncedSearchValue.toLowerCase().trim();
    const frontendResults = allLoadedUsers.filter(user => {
      const username = (user.username || '').toLowerCase();
      const email = (user.email || user.emailAddress || '').toLowerCase();
      const userId = String(user._id || '').toLowerCase();

      return (
        username.includes(lowerSearchValue) ||
        email.includes(lowerSearchValue) ||
        userId.includes(lowerSearchValue)
      );
    });

    if (frontendResults.length > 0) {
      setAllUsers(frontendResults);
      setUsingBackendSearch(false);
      setPaginationMetadata(null);
      setCurrentPage(0);
    } else {
      setUsingBackendSearch(true);
      setIsSearching(true);
      const loadBackendSearch = async () => {
        try {
          const result = await fetchUsers(
            selectedLicencee ?? undefined,
            1,
            itemsPerBatch,
            debouncedSearchValue,
            'all',
            selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
          );
          setAllUsers(result.users || []);
          setPaginationMetadata({
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
          });
          setCurrentPage(0);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch search results:', error);
          }
          setAllUsers([]);
        } finally {
          setIsSearching(false);
        }
      };
      loadBackendSearch();
    }
  }, [
    debouncedSearchValue,
    allLoadedUsers,
    activeSection,
    selectedLicencee,
    selectedStatus,
  ]);

  // Handle pagination for backend search results
  useEffect(() => {
    if (isLoading || activeSection !== 'users') return;
    if (!usingBackendSearch) return;

    const isSearching = debouncedSearchValue && debouncedSearchValue.trim();
    const isFiltering =
      (selectedRole !== 'all' || selectedStatus !== 'all') && !isSearching;

    if (!isSearching && !isFiltering) return;

    const currentPage1Indexed = currentPage + 1;
    const loadSearchPage = async () => {
      setIsSearching(true);
      try {
        const result = await fetchUsers(
          selectedLicencee ?? undefined,
          currentPage1Indexed,
          itemsPerBatch,
          isSearching ? debouncedSearchValue : undefined,
          isSearching ? 'all' : 'username',
          selectedStatus as 'all' | 'active' | 'disabled' | 'deleted',
          selectedRole
        );
        setAllUsers(result.users || []);
        setPaginationMetadata({
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch search results:', error);
        }
        setAllUsers([]);
      } finally {
        setIsSearching(false);
      }
    };

    loadSearchPage();
  }, [
    currentPage,
    usingBackendSearch,
    debouncedSearchValue,
    selectedLicencee,
    selectedStatus,
    selectedRole,
    isLoading,
    activeSection,
  ]);

  // Load users only when users tab is active and not already loaded (initial batch)
  useEffect(() => {
    if (activeSection === 'users' && !loadedSections.has('users')) {
      const loadUsers = async () => {
        setIsLoading(true);
        try {
          const result = await fetchUsers(
            selectedLicencee ?? undefined,
            1,
            itemsPerBatch,
            undefined,
            'username',
            selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
          );
          setAllUsers(result.users || []);
          setAllLoadedUsers(result.users || []);
          setLoadedBatches(new Set([1]));
          setLoadedSections(prev => new Set(prev).add('users'));
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch users:', error);
          }
          setAllUsers([]);
        }
        setIsLoading(false);
      };
      loadUsers();
    }
  }, [
    activeSection,
    selectedLicencee,
    selectedStatus,
    loadedSections,
    setLoadedSections,
  ]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (isLoading || activeSection !== 'users') return;
    if (debouncedSearchValue && debouncedSearchValue.trim()) {
      return;
    }

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchUsers(
        selectedLicencee ?? undefined,
        nextBatch,
        itemsPerBatch,
        undefined,
        'username',
        selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
      )
        .then(result => {
          setAllUsers(prev => {
            const existingIds = new Set(prev.map(item => item._id));
            const newItems = result.users.filter(
              item => !existingIds.has(item._id)
            );
            const updated = [...prev, ...newItems];
            setAllLoadedUsers(updated);
            return updated;
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch next batch:', error);
          }
        });
    }

    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchUsers(
        selectedLicencee ?? undefined,
        currentBatch,
        itemsPerBatch,
        undefined,
        'username',
        selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
      )
        .then(result => {
          setAllUsers(prev => {
            const existingIds = new Set(prev.map(item => item._id));
            const newItems = result.users.filter(
              item => !existingIds.has(item._id)
            );
            const updated = [...prev, ...newItems];
            setAllLoadedUsers(updated);
            return updated;
          });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch current batch:', error);
          }
        });
    }
  }, [
    currentPage,
    isLoading,
    activeSection,
    loadedBatches,
    selectedLicencee,
    selectedStatus,
    debouncedSearchValue,
    calculateBatchNumber,
  ]);

  // Fallback to backend search when frontend filtering returns no results
  useEffect(() => {
    if (activeSection !== 'users' || !mounted) return;
    if (isLoading || isSearching) return;
    if (debouncedSearchValue && debouncedSearchValue.trim()) return;
    if (usingBackendSearch) return;

    const hasRoleFilter = selectedRole !== 'all';
    const hasStatusFilter = selectedStatus !== 'all';

    if (!hasRoleFilter && !hasStatusFilter) {
      hasAttemptedBackendFilterRef.current = false;
      return;
    }

    if (roleFilteredUsers.length === 0 && allUsers.length > 0) {
      if (!hasAttemptedBackendFilterRef.current) {
        hasAttemptedBackendFilterRef.current = true;
        setUsingBackendSearch(true);
        setIsSearching(true);

        const loadBackendFilter = async () => {
          try {
            const result = await fetchUsers(
              selectedLicencee ?? undefined,
              1,
              itemsPerBatch,
              undefined,
              'username',
              selectedStatus as 'all' | 'active' | 'disabled' | 'deleted',
              selectedRole
            );
            setAllUsers(result.users || []);
            setAllLoadedUsers(result.users || []);
            setPaginationMetadata({
              total: result.pagination.total,
              totalPages: result.pagination.totalPages,
            });
            setCurrentPage(0);
            setLoadedBatches(new Set([1]));
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to fetch filtered users:', error);
            }
            setAllUsers([]);
            hasAttemptedBackendFilterRef.current = false;
          } finally {
            setIsSearching(false);
          }
        };

        loadBackendFilter();
      }
    } else if (roleFilteredUsers.length > 0) {
      hasAttemptedBackendFilterRef.current = false;
    }
  }, [
    activeSection,
    mounted,
    isLoading,
    isSearching,
    debouncedSearchValue,
    usingBackendSearch,
    selectedRole,
    selectedStatus,
    selectedLicencee,
    roleFilteredUsers.length,
    allUsers.length,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleEditUser = useCallback(async (user: User) => {
    setIsUserModalOpen(true);
    setSelectedUser(null);

    try {
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
  }, []);

  const handleDeleteUser = useCallback((user: User) => {
    setSelectedUserToDelete(user);
    setIsDeleteModalOpen(true);
  }, []);

  const openAddUserModal = useCallback(() => {
    setIsAddUserModalOpen(true);
  }, []);

  const closeAddUserModal = useCallback(async () => {
    setIsAddUserModalOpen(false);
  }, []);

  const refreshUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await fetchUsers(
        selectedLicencee ?? undefined,
        1,
        itemsPerBatch,
        undefined,
        'username',
        selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
      );
      setAllUsers(result.users);
      setAllLoadedUsers(result.users);
      setLoadedBatches(new Set([1]));
      setCurrentPage(0);
    } catch (error) {
      console.error('Failed to refresh users:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedLicencee, selectedStatus]);

  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Unknown User';
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }
    return 'Unknown User';
  }, [user]);

  const handleSaveUser = useCallback(
    async (
      updated: Partial<User> & {
        password?: string;
      }
    ) => {
      if (!selectedUser) return;

      await saveUserHelper({
        selectedUser,
        updated,
        currentUser: user
          ? ({
              _id: user._id,
              name: user.username || '',
              username: user.username || '',
              emailAddress: user.emailAddress || '',
              enabled: user.isEnabled || true,
              roles: user.roles || [],
              profilePicture: null,
            } as User)
          : null,
        getUserDisplayName,
        selectedLicencee,
        selectedStatus,
        itemsPerBatch,
        onSuccess: async updatedUserData => {
          setAllUsers(prevUsers =>
            prevUsers.map(u =>
              u._id === updatedUserData._id ? updatedUserData : u
            )
          );
          setAllLoadedUsers(prevUsers =>
            prevUsers.map(u =>
              u._id === updatedUserData._id ? updatedUserData : u
            )
          );
          setIsUserModalOpen(false);
          setSelectedUser(null);
          setRefreshing(true);
          const result = await fetchUsers(
            selectedLicencee ?? undefined,
            1,
            itemsPerBatch,
            undefined,
            'username',
            selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
          );
          setAllUsers(result.users);
          setLoadedBatches(new Set([1]));
          setCurrentPage(0);
          setRefreshing(false);
        },
        onError: () => {
          // Error already handled in helper with toast
        },
      });
    },
    [
      selectedUser,
      user,
      getUserDisplayName,
      selectedLicencee,
      selectedStatus,
      setAllUsers,
      setAllLoadedUsers,
      setIsUserModalOpen,
      setSelectedUser,
      setRefreshing,
      setLoadedBatches,
      setCurrentPage,
    ]
  );

  const handleDeleteUserConfirm = useCallback(
    async (userToDelete: User) => {
      const userData = { ...userToDelete };

      try {
        await axios.delete('/api/users', {
          data: { _id: userToDelete._id },
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
              resourceId: userToDelete._id,
              resourceName: userToDelete.username,
              details: `Deleted user: ${userToDelete.username} with roles: ${
                userData.roles?.join(', ') || 'N/A'
              }`,
              userId: user?._id || 'unknown',
              username: getUserDisplayName(),
              userRole: 'user',
              previousData: userData,
              newData: null,
              changes: [],
            }),
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to log activity:', error);
          }
        }

        // Refresh users
        const result = await fetchUsers(
          selectedLicencee ?? undefined,
          1,
          itemsPerBatch,
          undefined,
          'username',
          selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
        );
        setAllUsers(result.users);
        setLoadedBatches(new Set([1]));
        setCurrentPage(0);
        toast.success('User deleted successfully');
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to delete user:', error);
        }
        toast.error('Failed to delete user');
      }
      setIsDeleteModalOpen(false);
      setSelectedUserToDelete(null);
    },
    [
      user,
      getUserDisplayName,
      selectedLicencee,
      selectedStatus,
      setAllUsers,
      setLoadedBatches,
      setCurrentPage,
      setIsDeleteModalOpen,
      setSelectedUserToDelete,
    ]
  );

  return {
    // State
    allUsers,
    isLoading,
    refreshing,
    isSearching,
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
    processedUsers,
    totalPages,
    // Setters
    setSearchValue,
    setSelectedRole,
    setSelectedStatus,
    setCurrentPage,
    setIsUserModalOpen,
    setSelectedUser,
    setIsDeleteModalOpen,
    setSelectedUserToDelete,
    setIsAddUserModalOpen,
    // Handlers
    handleEditUser,
    handleDeleteUser,
    openAddUserModal,
    closeAddUserModal,
    handleSaveUser,
    handleDeleteUserConfirm,
    requestSort,
    refreshUsers,
    getUserDisplayName,
  };
}
