"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Member, MemberSortOption } from "@/lib/types/members";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import React from "react";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";
import leftHamburgerMenu from "@/public/leftHamburgerMenu.svg";

type MemberTableProps = {
  members: Member[];
  sortOption: MemberSortOption;
  sortOrder: "asc" | "desc";
  onSort: (column: MemberSortOption) => void;
  onMemberClick: (id: string) => void;
  onAction: (action: "edit" | "delete", member: Member) => void;
};

const MemberTable: React.FC<MemberTableProps> = ({
  members,
  sortOption,
  sortOrder,
  onSort,
  onMemberClick,
  onAction,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleRowClick = (memberId: string) => {
    onMemberClick(memberId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table
          ref={tableRef}
          className="table-fixed w-full border-collapse text-center"
        >
          <thead className="bg-button text-white">
            <tr>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("locationName")}
              >
                <span>LOCATION</span>
                {sortOption === "locationName" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("name")}
              >
                <span>FULL NAME</span>
                {sortOption === "name" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("winLoss")}
              >
                <span>WIN/LOSS</span>
                {sortOption === "winLoss" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("lastSession")}
              >
                <span>JOINED</span>
                {sortOption === "lastSession" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th className="p-3 border border-border text-sm">DETAILS</th>
              <th className="p-3 border border-border text-sm">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member._id}
                className="cursor-pointer hover:bg-muted"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("td:last-child")) {
                    handleRowClick(member._id);
                  }
                }}
              >
                <td className="p-3 bg-container border border-border text-sm text-left hover:bg-accent">
                  {member.locationName || "Unknown Location"}
                </td>
                <td className="p-3 bg-container border border-border text-sm text-left hover:bg-accent">
                  <div>{`${member.profile.firstName} ${member.profile.lastName}`}</div>
                  <div className="mt-1 inline-flex text-primary-foreground text-[10px] leading-tight">
                    <span className="bg-blueHighlight px-1 py-0.5 rounded-l-full">
                      {member.profile.occupation || "Not Specified"}
                    </span>
                    <span className="bg-button px-1 py-0.5 rounded-r-full">
                      {member.points} POINTS
                    </span>
                  </div>
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <div
                    className={`font-medium ${
                      (member.winLoss || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(member.winLoss || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    In: {formatCurrency(member.totalMoneyIn || 0)} | Out:{" "}
                    {formatCurrency(member.totalMoneyOut || 0)}
                  </div>
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  {formatDate(member.createdAt)}
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <div className="flex items-center justify-center gap-2">
                    <Image
                      src={leftHamburgerMenu}
                      alt="Details"
                      width={20}
                      height={20}
                      className="cursor-pointer opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMemberClick(member._id);
                      }}
                    />
                    <Image
                      src={editIcon}
                      alt="Edit"
                      width={20}
                      height={20}
                      className="cursor-pointer opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("edit", member);
                      }}
                    />
                  </div>
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <div className="flex items-center justify-center">
                    <Image
                      src={deleteIcon}
                      alt="Delete"
                      width={20}
                      height={20}
                      className="cursor-pointer opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("delete", member);
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {members.length > 10 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // First page logic would be handled by the parent component
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Previous page logic
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page numbers would be generated here */}
          <Button className="bg-buttonActive text-white px-3 py-1 scale-105">
            1
          </Button>

          <Button className="bg-gray-300 text-black px-3 py-1 hover:bg-gray-400">
            2
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Next page logic
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Last page logic
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
};

export default MemberTable;
