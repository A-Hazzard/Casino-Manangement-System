'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { User, Calendar, Eye, Pencil, Trash2 } from 'lucide-react';
import { CasinoMember as Member } from '@/shared/types/entities';

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
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };

      return `${month} ${day}${getOrdinalSuffix(day)} ${year}`;
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold min-w-0 flex-1 truncate">
          {member.profile?.firstName && member.profile?.lastName
            ? `${member.profile.firstName} ${member.profile.lastName}`
            : member.memberId || member._id || 'Unknown Member'}
        </h3>
      </div>

      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Member ID</span>
          <span className="font-semibold text-foreground max-w-[60%] truncate text-right font-mono">
            {member._id}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Occupation</span>
          <span className="font-semibold text-foreground">
            {member.profile?.occupation || 'Not Specified'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Points</span>
          <span className="font-semibold text-button">{member.points}</span>
        </div>
      </div>

      <div className="mt-2 flex justify-between gap-2">
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-blueHighlight px-2 py-1 text-xs text-primary-foreground"
        >
          <User className="mr-1 h-3 w-3" />
          {member.profile?.firstName && member.profile?.lastName
            ? `${member.profile.firstName} ${member.profile.lastName}`
            : member.memberId || member._id || 'Unknown'}
        </Button>
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-button px-2 py-1 text-xs text-primary-foreground"
        >
          <Calendar className="mr-1 h-3 w-3" />
          {formatDate(
            typeof member.createdAt === 'string'
              ? member.createdAt
              : member.createdAt.toISOString()
          )}
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => handleCardClick()}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View Details</span>
        </Button>
        <Button
          onClick={() => onEdit(member)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Button>
        <Button
          onClick={() => onDelete(member)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
}
