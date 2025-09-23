"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table
          ref={tableRef}
          className="table-fixed w-full"
        >
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              <TableHead isFirstColumn={true}
                className="text-white font-semibold cursor-pointer relative"
                onClick={() => onSort("locationName")}
              >
                <span>LOCATION</span>
                {sortOption === "locationName" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </TableHead>
              <TableHead isFirstColumn={true}
                centered
                className="text-white font-semibold cursor-pointer relative"
                onClick={() => onSort("name")}
              >
                <span>FULL NAME</span>
                {sortOption === "name" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </TableHead>
              <TableHead
                centered
                className="text-white font-semibold cursor-pointer relative"
                onClick={() => onSort("winLoss")}
              >
                <span>WIN/LOSS</span>
                {sortOption === "winLoss" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </TableHead>
              <TableHead
                centered
                className="text-white font-semibold cursor-pointer relative"
                onClick={() => onSort("lastSession")}
              >
                <span>JOINED</span>
                {sortOption === "lastSession" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </TableHead>
              <TableHead centered className="text-white font-semibold">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow
                key={member._id}
                className="cursor-pointer hover:bg-muted"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("td:last-child")) {
                    handleRowClick(member._id);
                  }
                }}
              >
                <TableCell isFirstColumn={true}>
                  {member.locationName || "Unknown Location"}
                </TableCell>
                <TableCell centered>
                  <div>{`${member.profile.firstName} ${member.profile.lastName}`}</div>
                  <div className="mt-1 inline-flex text-primary-foreground text-[10px] leading-tight">
                    <Badge
                      variant="secondary"
                      className="bg-blueHighlight text-white px-1 py-0.5 rounded-l-full rounded-r-none"
                    >
                      {member.profile.occupation || "Not Specified"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-button text-white px-1 py-0.5 rounded-r-full rounded-l-none"
                    >
                      {member.points} POINTS
                    </Badge>
                  </div>
                </TableCell>
                <TableCell centered>
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
                </TableCell>
                <TableCell centered>
                  {formatDate(member.createdAt)}
                </TableCell>
                <TableCell centered>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMemberClick(member._id);
                      }}
                    >
                      <Image
                        src={leftHamburgerMenu}
                        alt="Details"
                        width={16}
                        height={16}
                        className="opacity-70 hover:opacity-100"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("edit", member);
                      }}
                    >
                      <Image
                        src={editIcon}
                        alt="Edit"
                        width={16}
                        height={16}
                        className="opacity-70 hover:opacity-100"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("delete", member);
                      }}
                    >
                      <Image
                        src={deleteIcon}
                        alt="Delete"
                        width={16}
                        height={16}
                        className="opacity-70 hover:opacity-100"
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
