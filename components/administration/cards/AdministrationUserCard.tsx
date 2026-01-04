/**
 * Administration User Card Component
 * Mobile-friendly card view for displaying user information.
 *
 * @module components/administration/AdministrationUserCard
 */

'use client';

import Image from 'next/image';
import type { User } from '@/lib/types/administration';
import type { UserAuthPayload } from '@/shared/types/auth';
import defaultAvatar from '@/public/defaultAvatar.svg';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AdministrationUserCardProps = {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  currentUser?: UserAuthPayload | null;
};

/**
 * Administration User Card
 */
export function AdministrationUserCard({
  user,
  onEdit,
  onDelete,
  currentUser,
}: AdministrationUserCardProps) {
  // Check if current user is a location admin
  const isLocationAdmin =
    currentUser?.roles?.some(
      role =>
        role.toLowerCase() === 'location admin' &&
        !currentUser.roles?.some(
          r =>
            r.toLowerCase() === 'developer' ||
            r.toLowerCase() === 'admin' ||
            r.toLowerCase() === 'manager'
        )
    ) || false;

  // Helper function to check if a user is a manager, developer, or admin
  const isProtectedRole = (targetUser: User): boolean => {
    const roles = (targetUser.roles || []).map(r => r.toLowerCase());
    return (
      roles.includes('developer') ||
      roles.includes('admin') ||
      roles.includes('manager')
    );
  };

  // ============================================================================
  // Render
  // ============================================================================
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
          {user.email || user.emailAddress ? (
            user.email || user.emailAddress
          ) : (
            <span className="italic text-red-500">No email provided</span>
          )}
        </div>
        <div className="mb-1 text-sm text-gray-700">
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
        <div className="mb-1 text-sm text-gray-700">
          <span className="font-semibold">Login Count:</span>{' '}
          {user.loginCount !== undefined ? (
            <span className="text-blue-600">{user.loginCount}</span>
          ) : (
            <span className="italic text-gray-400">0</span>
          )}
        </div>
        <div className="mb-1 text-sm text-gray-700">
          <span className="font-semibold">Last Login:</span>{' '}
          {user.lastLoginAt ? (
            <span className="text-sm">
              {new Date(user.lastLoginAt).toLocaleString()}
            </span>
          ) : (
            <span className="italic text-gray-400">Never</span>
          )}
        </div>
        <div className="mb-3 text-sm text-gray-700">
          <span className="font-semibold">Session:</span>{' '}
          {user.sessionVersion !== undefined ? (
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-mono text-purple-700">
              v{user.sessionVersion}
            </span>
          ) : (
            <span className="italic text-gray-400">-</span>
          )}
        </div>

        {/* Action Buttons */}
        {!(isLocationAdmin && isProtectedRole(user)) && (
          <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
            <Button
              onClick={() => onEdit?.(user)}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
            <Button
              onClick={() => onDelete?.(user)}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
