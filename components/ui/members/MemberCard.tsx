"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { User, Calendar } from "lucide-react";
import { Member } from "@/lib/types/members";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";
import leftHamburgerMenu from "@/public/leftHamburgerMenu.svg";

export default function MemberCard({
  member,
  onMemberClick,
  onEdit,
  onDelete,
}: {
  member: Member;
  onMemberClick: (id: string) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardClick = () => {
    onMemberClick(member._id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div
      ref={cardRef}
      className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto relative cursor-pointer hover:shadow-md transition-shadow border border-border"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest(".action-buttons")) {
          handleCardClick();
        }
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">
          {`${member.profile.firstName} ${member.profile.lastName}`}
        </h3>
        <div className="flex gap-2 action-buttons">
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
              onEdit(member);
            }}
          />
          <Image
            src={deleteIcon}
            alt="Delete"
            width={20}
            height={20}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(member);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col space-y-2 text-sm mb-2">
        <div className="flex justify-between">
          <span className="font-medium">Member ID</span>
          <span className="text-foreground font-semibold font-mono text-xs">
            {member._id}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Occupation</span>
          <span className="text-foreground font-semibold">
            {member.profile.occupation || "Not Specified"}
          </span>
        </div>
      </div>

      <div className="flex justify-between mt-1 mb-3">
        <span className="font-medium">Points</span>
        <span className="text-button font-semibold">{member.points}</span>
      </div>

      <div className="flex gap-2 justify-between mt-2 action-buttons">
        <Button
          className="bg-blueHighlight text-primary-foreground flex items-center space-x-1 rounded-md px-2 py-1 h-auto text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="w-3 h-3 mr-1" />
          {member.profile.firstName} {member.profile.lastName}
        </Button>
        <Button
          className="bg-button text-primary-foreground flex items-center space-x-1 rounded-md px-2 py-1 h-auto text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar className="w-3 h-3 mr-1" />
          {formatDate(member.createdAt)}
        </Button>
      </div>
    </div>
  );
}
