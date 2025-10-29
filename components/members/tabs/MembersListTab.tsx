'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import { useMemberActionsStore } from '@/lib/store/memberActionsStore';
import type { CasinoMember as Member } from '@/shared/types/entities';
type MemberSortOption =
  | 'name'
  | 'playerId'
  | 'points'
  | 'sessions'
  | 'totalHandle'
  | 'totalWon'
  | 'totalLost'
  | 'lastSession'
  | 'status'
  | 'locationName'
  | 'winLoss'
  | 'lastLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';
import Image from 'next/image';

// Import SVG icons for pre-rendering
import membersIcon from '@/public/membersIcon.svg';

import MemberCard from '@/components/ui/members/MemberCard';
import MemberTable from '@/components/ui/members/MemberTable';
import MemberSkeleton from '@/components/ui/members/MemberSkeleton';
import MemberTableSkeleton from '@/components/ui/members/MemberTableSkeleton';
import EditMemberModal from '@/components/ui/members/EditMemberModal';
import DeleteMemberModal from '@/components/ui/members/DeleteMemberModal';
import NewMemberModal from '@/components/ui/members/NewMemberModal';

export default function MembersListTab() {
  const {
    selectedMember,
    isEditModalOpen,
    isDeleteModalOpen,
    openEditModal,
    openDeleteModal,
    closeEditModal,
    closeDeleteModal,
  } = useMemberActionsStore();

  const router = useRouter();

  // State management
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<MemberSortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemsPerPage = 10;

  // Fetch members data with backend pagination
  const fetchMembers = useCallback(
    async (
      page: number = 1,
      search: string = '',
      sortBy: string = 'name',
      sortOrder: 'asc' | 'desc' = 'asc'
    ) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          search: search,
          sortBy: sortBy,
          sortOrder: sortOrder,
        });

        const response = await axios.get(`/api/members?${params}`);
        const result = response.data;

        if (result.success && result.data) {
          setFilteredMembers(result.data.members);
          setTotalPages(result.data.pagination.totalPages);
          setCurrentPage(result.data.pagination.currentPage - 1); // Convert to 0-based
        } else {
          console.error('Invalid response format:', result);
          setFilteredMembers([]);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setFilteredMembers([]);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage]
  );

  useEffect(() => {
    fetchMembers(1, searchTerm, sortOption, sortOrder);
  }, [fetchMembers, searchTerm, sortOption, sortOrder]);

  // Sorting functionality - now handled by backend
  const handleSort = useCallback(
    (column: MemberSortOption) => {
      const newSortOrder =
        sortOption === column && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOption(column);
      setSortOrder(newSortOrder);
      // fetchMembers will be called via useEffect
    },
    [sortOption, sortOrder]
  );

  // Sort members
  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case 'name':
          aValue = `${a.profile.firstName} ${a.profile.lastName}`.toLowerCase();
          bValue = `${b.profile.firstName} ${b.profile.lastName}`.toLowerCase();
          break;
        case 'playerId':
          aValue = a._id;
          bValue = b._id;
          break;
        case 'lastSession':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'locationName':
          aValue = (a.locationName || '').toLowerCase();
          bValue = (b.locationName || '').toLowerCase();
          break;
        case 'winLoss':
          aValue = a.winLoss || 0;
          bValue = b.winLoss || 0;
          break;
        case 'lastLogin':
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          aValue = a._id;
          bValue = b._id;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? aValue < bValue
          ? -1
          : 1
        : bValue < aValue
          ? -1
          : 1;
    });

    return sorted;
  }, [filteredMembers, sortOption, sortOrder]);

  // Pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedMembers.slice(startIndex, endIndex);
  }, [sortedMembers, currentPage, itemsPerPage]);

  const handleMemberClick = (memberId: string) => {
    router.push(`/members/${memberId}`);
  };

  const handleEdit = (member: Member) => {
    openEditModal(member);
  };

  const handleDelete = (member: Member) => {
    openDeleteModal(member);
  };

  const handleTableAction = (action: 'edit' | 'delete', member: Member) => {
    if (action === 'edit') {
      handleEdit(member);
    } else if (action === 'delete') {
      handleDelete(member);
    }
  };

  const handleFirstPage = () => setCurrentPage(0);
  const handleLastPage = () => setCurrentPage(totalPages - 1);
  const handlePrevPage = () =>
    currentPage > 0 && setCurrentPage(prev => prev - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage(prev => prev + 1);

  const handleNewMember = () => {
    setIsNewMemberModalOpen(true);
  };

  const handleCloseNewMemberModal = () => {
    setIsNewMemberModalOpen(false);
  };

  const handleMemberCreated = () => {
    fetchMembers();
  };

  return (
    <>
      {/* Title Row */}
      <div className="mt-4 flex w-full max-w-full items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            Members List
            <Image
              src={membersIcon}
              alt="Members Icon"
              width={32}
              height={32}
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0"
            />
          </h1>
          {/* Mobile: Refresh icon */}
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchMembers(1, searchTerm, sortOption, sortOrder);
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
              await fetchMembers(1, searchTerm, sortOption, sortOrder);
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
          {/* Desktop: Full button */}
          <div className="hidden md:block">
            <Button
              onClick={handleNewMember}
              className="flex items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
            >
              <PlusCircle className="h-4 w-4" />
              New Member
            </Button>
          </div>
          {/* Mobile: Icon only */}
          <div className="md:hidden">
            <button
              onClick={handleNewMember}
              disabled={refreshing}
              className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="New Member"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: Search */}
      <div className="mt-4 flex flex-col gap-4 lg:hidden">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search members..."
            className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Search Row - Purple box */}
      <div className="mt-4 hidden items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4 lg:flex">
        <div className="relative min-w-0 max-w-md flex-1">
          <Input
            type="text"
            placeholder="Search members..."
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Content Section */}
      <div className="w-full flex-1">
        {loading ? (
          <>
            {/* Mobile: show 3 card skeletons */}
            <div className="block lg:hidden">
              <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, i) => (
                  <MemberSkeleton key={i} />
                ))}
              </div>
            </div>
            {/* Desktop: show 1 table skeleton */}
            <div className="hidden lg:block">
              <MemberTableSkeleton />
            </div>
          </>
        ) : paginatedMembers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-lg text-gray-500">No members found.</span>
          </div>
        ) : (
          <>
            {/* Mobile: show cards */}
            <div className="block lg:hidden">
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {paginatedMembers.map(member => (
                  <MemberCard
                    key={member._id}
                    member={member}
                    onMemberClick={handleMemberClick}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
            {/* Desktop: show table */}
            <div className="hidden lg:block">
              <MemberTable
                members={paginatedMembers}
                sortOption={sortOption}
                sortOrder={sortOrder}
                onSort={handleSort}
                onMemberClick={handleMemberClick}
                onAction={handleTableAction}
              />
            </div>
          </>
        )}
      </div>

      {/* Pagination - Mobile Responsive */}
      {totalPages > 1 && (
        <>
          {/* Mobile Pagination */}
          <div className="mt-4 flex flex-col space-y-3 sm:hidden">
            <div className="text-center text-xs text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Button
                onClick={handleFirstPage}
                disabled={currentPage === 0}
                variant="outline"
                size="sm"
                className="px-2 py-1 text-xs"
              >
                ««
              </Button>
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                variant="outline"
                size="sm"
                className="px-2 py-1 text-xs"
              >
                ‹
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage + 1}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > totalPages) val = totalPages;
                    setCurrentPage(val - 1);
                  }}
                  className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-xs text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                  aria-label="Page number"
                />
                <span className="text-xs text-gray-600">of {totalPages}</span>
              </div>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                variant="outline"
                size="sm"
                className="px-2 py-1 text-xs"
              >
                ›
              </Button>
              <Button
                onClick={handleLastPage}
                disabled={currentPage === totalPages - 1}
                variant="outline"
                size="sm"
                className="px-2 py-1 text-xs"
              >
                »»
              </Button>
            </div>
          </div>

          {/* Desktop Pagination */}
          <div className="mt-4 hidden items-center justify-center space-x-2 sm:flex">
            <Button
              onClick={handleFirstPage}
              disabled={currentPage === 0}
              variant="ghost"
            >
              <DoubleArrowLeftIcon />
            </Button>
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              variant="ghost"
            >
              <ChevronLeftIcon />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage + 1}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > totalPages) val = totalPages;
                  setCurrentPage(val - 1);
                }}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                aria-label="Page number"
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              variant="ghost"
            >
              <ChevronRightIcon />
            </Button>
            <Button
              onClick={handleLastPage}
              disabled={currentPage === totalPages - 1}
              variant="ghost"
            >
              <DoubleArrowRightIcon />
            </Button>
          </div>
        </>
      )}

      {/* Modals */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        member={selectedMember._id ? (selectedMember as Member) : null}
        onMemberUpdated={fetchMembers}
      />
      <DeleteMemberModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        member={selectedMember._id ? (selectedMember as Member) : null}
        onDelete={fetchMembers}
      />
      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={handleCloseNewMemberModal}
        onMemberCreated={handleMemberCreated}
      />

      <Toaster richColors />
    </>
  );
}
