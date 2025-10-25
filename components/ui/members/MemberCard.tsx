'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { User, Calendar } from 'lucide-react';
import { CasinoMember as Member } from '@/shared/types/entities';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import leftHamburgerMenu from '@/public/leftHamburgerMenu.svg';

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div
      ref={cardRef}
      className="relative mx-auto w-full cursor-pointer rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={e => {
        if (!(e.target as HTMLElement).closest('.action-buttons')) {
          handleCardClick();
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {`${member.profile.firstName} ${member.profile.lastName}`}
        </h3>
        <div className="action-buttons flex gap-2">
          <Image
            src={leftHamburgerMenu}
            alt="Details"
            width={20}
            height={20}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={e => {
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
            onClick={e => {
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
            onClick={e => {
              e.stopPropagation();
              onDelete(member);
            }}
          />
        </div>
      </div>

      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Member ID</span>
          <span className="font-mono text-xs font-semibold text-foreground">
            {member._id}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Occupation</span>
          <span className="font-semibold text-foreground">
            {member.profile.occupation || 'Not Specified'}
          </span>
        </div>
      </div>

      <div className="mb-3 mt-1 flex justify-between">
        <span className="font-medium">Points</span>
        <span className="font-semibold text-button">{member.points}</span>
      </div>

      <div className="action-buttons mt-2 flex justify-between gap-2">
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-blueHighlight px-2 py-1 text-xs text-primary-foreground"
          onClick={e => e.stopPropagation()}
        >
          <User className="mr-1 h-3 w-3" />
          {member.profile.firstName} {member.profile.lastName}
        </Button>
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-button px-2 py-1 text-xs text-primary-foreground"
          onClick={e => e.stopPropagation()}
        >
          <Calendar className="mr-1 h-3 w-3" />
          {formatDate(
            typeof member.createdAt === 'string'
              ? member.createdAt
              : member.createdAt.toISOString()
          )}
        </Button>
      </div>
    </div>
  );
}
