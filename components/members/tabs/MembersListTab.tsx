"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { useMemberActionsStore } from "@/lib/store/memberActionsStore";
import type { CasinoMember as Member } from "@/shared/types/entities";
type MemberSortOption =
  | "name"
  | "playerId"
  | "points"
  | "sessions"
  | "totalHandle"
  | "totalWon"
  | "totalLost"
  | "lastSession"
  | "status"
  | "locationName"
  | "winLoss"
  | "lastLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import Image from "next/image";

// Import SVG icons for pre-rendering
import membersIcon from "@/public/membersIcon.svg";

import MemberCard from "@/components/ui/members/MemberCard";
import MemberTable from "@/components/ui/members/MemberTable";
import MemberSkeleton from "@/components/ui/members/MemberSkeleton";
import MemberTableSkeleton from "@/components/ui/members/MemberTableSkeleton";
import EditMemberModal from "@/components/ui/members/EditMemberModal";
import DeleteMemberModal from "@/components/ui/members/DeleteMemberModal";
import NewMemberModal from "@/components/ui/members/NewMemberModal";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<MemberSortOption>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);

  const itemsPerPage = 10;

  // Fetch members data with backend pagination
  const fetchMembers = useCallback(
    async (
      page: number = 1,
      search: string = "",
      sortBy: string = "name",
      sortOrder: "asc" | "desc" = "asc"
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
          console.error("Invalid response format:", result);
          setFilteredMembers([]);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
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
        sortOption === column && sortOrder === "asc" ? "desc" : "asc";
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
        case "name":
          aValue = `${a.profile.firstName} ${a.profile.lastName}`.toLowerCase();
          bValue = `${b.profile.firstName} ${b.profile.lastName}`.toLowerCase();
          break;
        case "playerId":
          aValue = a._id;
          bValue = b._id;
          break;
        case "lastSession":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "locationName":
          aValue = (a.locationName || "").toLowerCase();
          bValue = (b.locationName || "").toLowerCase();
          break;
        case "winLoss":
          aValue = a.winLoss || 0;
          bValue = b.winLoss || 0;
          break;
        case "lastLogin":
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          aValue = a._id;
          bValue = b._id;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc"
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

  const handleTableAction = (action: "edit" | "delete", member: Member) => {
    if (action === "edit") {
      handleEdit(member);
    } else if (action === "delete") {
      handleDelete(member);
    }
  };

  const handleFirstPage = () => setCurrentPage(0);
  const handleLastPage = () => setCurrentPage(totalPages - 1);
  const handlePrevPage = () =>
    currentPage > 0 && setCurrentPage((prev) => prev - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && setCurrentPage((prev) => prev + 1);

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
      <div className="flex items-center justify-between mt-4 w-full max-w-full">
        <div className="flex items-center gap-3 w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Members List
          </h1>
          <Image
            src={membersIcon}
            alt="Members Icon"
            width={32}
            height={32}
            className="w-6 h-6 sm:w-8 sm:h-8 hidden lg:inline-block ml-2"
          />
        </div>
        {/* Add New Member button (desktop only) */}
        <Button
          onClick={handleNewMember}
          className="hidden lg:flex bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
        >
          <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span>New Member</span>
        </Button>
      </div>

      {/* Mobile: New Member button below title */}
      <div className="lg:hidden mt-4 w-full">
        <Button
          onClick={handleNewMember}
          className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          New Member
        </Button>
      </div>

      {/* Mobile: Search */}
      <div className="lg:hidden flex flex-col gap-4 mt-4">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search members..."
            className="w-full pr-10 bg-white border border-gray-300 rounded-full h-11 px-4 shadow-sm text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      {/* Search Row - Purple box */}
      <div className="hidden lg:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
        <div className="relative flex-1 max-w-md min-w-0">
          <Input
            type="text"
            placeholder="Search members..."
            className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 w-full">
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
          <div className="flex justify-center items-center py-12">
            <span className="text-gray-500 text-lg">No members found.</span>
          </div>
        ) : (
          <>
            {/* Mobile: show cards */}
            <div className="block lg:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {paginatedMembers.map((member) => (
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
          <div className="flex flex-col space-y-3 mt-4 sm:hidden">
            <div className="text-xs text-gray-600 text-center">
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
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > totalPages) val = totalPages;
                    setCurrentPage(val - 1);
                  }}
                  className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
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
          <div className="hidden sm:flex justify-center items-center space-x-2 mt-4">
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
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > totalPages) val = totalPages;
                  setCurrentPage(val - 1);
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
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
