'use client';

import { Button } from '@/components/ui/button';
import { CasinoMember as Member } from '@/shared/types/entities';
import { ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';
import { useRef } from 'react';

export default function MemberCard({
  member,
  onMemberClick,
  onLocationClick,
  onEdit,
  onDelete,
}: {
  member: Member;
  onMemberClick: (id: string) => void;
  onLocationClick: (locationId: string) => void;
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
      className="relative mx-auto w-full rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {member.profile?.firstName && member.profile?.lastName
              ? `${member.profile.firstName} ${member.profile.lastName}`
              : member.memberId || member._id || 'Unknown Member'}
          </h3>
          <button
            onClick={() => onLocationClick(member.gamingLocation || '')}
            className="inline-flex max-w-full items-center gap-1.5 truncate text-left text-xs text-blue-600 underline decoration-dotted hover:text-blue-800"
            title={member.locationName}
            disabled={!member.gamingLocation}
          >
            <span className="truncate">{member.locationName || 'No Location'}</span>
            {member.gamingLocation && (
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            )}
          </button>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {member.points || 0} pts
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Member ID</span>
          <span className="truncate font-mono text-xs font-medium">
            {member._id.substring(0, 8)}...
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Occupation</span>
          <span className="truncate text-xs font-medium">
            {member.profile?.occupation || '-'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Joined</span>
          <span className="truncate text-xs font-medium">
            {formatDate(
              typeof member.createdAt === 'string'
                ? member.createdAt
                : member.createdAt.toISOString()
            )}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Win/Loss</span>
          <span className={`truncate text-xs font-medium ${(member.winLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(member.winLoss || 0)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Button
          onClick={() => handleCardClick()}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs h-9"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">View</span>
        </Button>
        <Button
          onClick={() => onEdit(member)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs h-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Edit</span>
        </Button>
        <Button
          onClick={() => onDelete(member)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Delete</span>
        </Button>
      </div>
    </div>
  );
}
