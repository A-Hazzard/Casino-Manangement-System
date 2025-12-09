/**
 * Player Header Component
 * Header component displaying player/member name and basic information.
 *
 * Features:
 * - Member name display (full name or member ID)
 * - Occupation display
 * - User icon avatar
 * - Simple header layout
 *
 * @param member - Member/CasinoMember object
 */
import { CasinoMember as Member } from '@/shared/types/entities';
import { User } from 'lucide-react';

type PlayerHeaderProps = {
  member: Member;
};

export default function PlayerHeader({ member }: PlayerHeaderProps) {
  const fullName =
    member.profile?.firstName && member.profile?.lastName
      ? `${member.profile.firstName} ${member.profile.lastName}`
      : member.memberId;

  const occupation = member.profile?.occupation || '';

  return (
    <div className="my-8 flex items-center">
      <div className="mr-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-300">
        <User className="h-10 w-10 text-gray-600" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">{fullName}</h1>
        {occupation && <p className="text-gray-500">{occupation}</p>}
      </div>
    </div>
  );
}
