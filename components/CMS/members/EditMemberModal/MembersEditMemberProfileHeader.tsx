/**
 * Members Edit Member Profile Header Component
 * 
 * Displays the member's profile picture and basic information in the edit modal
 * 
 * @param props - Component props
 */

'use client';

import defaultAvatar from '@/public/defaultAvatar.svg';
import Image from 'next/image';

type MembersEditMemberProfileHeaderProps = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
};

export default function MembersEditMemberProfileHeader({
  firstName,
  lastName,
  username,
  email,
}: MembersEditMemberProfileHeaderProps) {
  const displayName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : username || 'Member';

  return (
    <div className="flex flex-col items-center lg:items-start">
      <div className="relative">
        <Image
          src={defaultAvatar}
          alt="Member Avatar"
          width={140}
          height={140}
          className="rounded-full border-4 border-gray-100 bg-gray-50 shadow-sm"
        />
      </div>
      <div className="mt-3 flex flex-col items-center gap-1 lg:items-start">
        <h3 className="text-lg font-semibold text-gray-900">
          {displayName}
        </h3>
        <p className="text-sm text-gray-600">
          {email || 'No email'}
        </p>
        {username && (
          <p className="text-xs text-gray-500">
            @{username}
          </p>
        )}
      </div>
    </div>
  );
}

