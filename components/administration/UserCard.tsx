import Image from 'next/image';
import type { User } from '@/lib/types/administration';
import defaultAvatar from '@/public/defaultAvatar.svg';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';

type UserCardProps = {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
};

export default function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="flex items-center gap-2 bg-blue-500 p-3 text-white">
        <Image
          src={
            user.profilePicture && !user.profilePicture.startsWith('blob:')
              ? user.profilePicture
              : defaultAvatar
          }
          alt={`${user.username || 'user'} avatar`}
          width={24}
          height={24}
          className="flex-shrink-0 rounded-full bg-gray-300"
        />
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {user.roles && user.roles.length > 0 ? (
            user.roles.map(role => (
              <span
                key={role}
                className="flex-shrink-0 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] font-semibold text-white"
              >
                {role.toUpperCase()}
              </span>
            ))
          ) : (
            <span className="flex-shrink-0 whitespace-nowrap rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white">
              NO ROLES
            </span>
          )}
        </div>
      </div>
      <div className="p-3">
        <div className="mb-1 text-sm text-gray-700">
          <span className="font-semibold">Username:</span>{' '}
          {user.username ? (
            user.username
          ) : (
            <span className="italic text-red-500">No username provided</span>
          )}
        </div>
        <div className="mb-1 text-sm text-gray-700">
          <span className="font-semibold">Name:</span>{' '}
          {user.name ? (
            user.name
          ) : (
            <span className="italic text-red-500">No name provided</span>
          )}
        </div>
        <div className="mb-1 text-sm text-gray-700">
          <span className="font-semibold">Email:</span>{' '}
          {user.email ? (
            user.email
          ) : (
            <span className="italic text-red-500">No email provided</span>
          )}
        </div>
        <div className="mb-3 text-sm text-gray-700">
          <span className="font-semibold">Enabled:</span>{' '}
          {user.enabled !== undefined ? (
            user.enabled ? (
              'True'
            ) : (
              'False'
            )
          ) : (
            <span className="italic text-red-500">Status unknown</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Image
            src={editIcon}
            alt="Edit"
            width={22}
            height={22}
            className="cursor-pointer"
            onClick={() => onEdit?.(user)}
          />
          <Image
            src={deleteIcon}
            alt="Delete"
            width={22}
            height={22}
            className="cursor-pointer"
            onClick={() => onDelete?.(user)}
          />
        </div>
      </div>
    </div>
  );
}
