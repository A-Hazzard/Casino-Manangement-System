/**
 * User Table Component
 * Desktop table view for displaying users with sorting and actions.
 *
 * Features:
 * - Sortable columns (name, username, email, enabled, login count, last login, session)
 * - User profile pictures with fallback avatars
 * - Role badges display
 * - Edit and delete actions
 * - Responsive design (hidden on mobile, shown on desktop)
 * - Status indicators (enabled/disabled)
 *
 * @param users - Array of user objects to display
 * @param sortConfig - Current sort configuration
 * @param requestSort - Callback to request column sort
 * @param onEdit - Callback when edit button is clicked
 * @param onDelete - Callback when delete button is clicked
 */
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { User, SortKey } from '@/lib/types/administration';
import defaultAvatar from '@/public/defaultAvatar.svg';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';

type UserTableProps = {
  users: User[];
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: SortKey) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
};

export default function UserTable({
  users,
  sortConfig,
  requestSort,
  onEdit,
  onDelete,
}: UserTableProps) {
  // Map column headers to their corresponding sort keys
  const columnConfig = [
    { header: 'NAME', sortKey: 'name' as SortKey },
    { header: 'USERNAME', sortKey: 'username' as SortKey },
    { header: 'EMAIL ADDRESS', sortKey: 'emailAddress' as SortKey },
    { header: 'ENABLED', sortKey: 'enabled' as SortKey },
    { header: 'LOGIN COUNT', sortKey: 'loginCount' as SortKey },
    { header: 'LAST LOGIN', sortKey: 'lastLoginAt' as SortKey },
    { header: 'SESSION', sortKey: 'sessionVersion' as SortKey },
    { header: 'ACTIONS', sortKey: null }, // Not sortable
  ];

  return (
    <div className="hidden overflow-x-auto rounded-lg bg-white shadow-md lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            {columnConfig.map(({ header, sortKey }) => {
              const isSortable = sortKey !== null;
              return (
                <TableHead
                  key={header}
                  className={`text-left font-semibold text-white ${
                    isSortable ? 'cursor-pointer select-none hover:bg-buttonActive/80' : ''
                  }`}
                  onClick={() => {
                    if (isSortable && sortKey) {
                      requestSort(sortKey);
                    }
                  }}
                >
                  {header}
                  {isSortable && sortConfig?.key === sortKey &&
                    (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow
              key={user.username}
              className="transition-colors hover:bg-gray-50"
            >
              <TableCell className="text-left font-medium text-gray-700">
                {user.name ? (
                  user.name
                ) : (
                  <span className="italic text-red-500">No name provided</span>
                )}
              </TableCell>
              <TableCell className="text-left">
                <div className="flex items-center justify-between">
                  <div>
                    {user.username ? (
                      <span className="font-semibold text-gray-800">
                        {user.username}
                      </span>
                    ) : (
                      <span className="italic text-red-500">
                        No username provided
                      </span>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map(role => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="bg-blue-200 text-blue-800 hover:bg-blue-300"
                          >
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs italic text-red-500">
                          No roles assigned
                        </span>
                      )}
                    </div>
                  </div>
                  <Image
                    src={
                      user.profilePicture &&
                      !user.profilePicture.startsWith('blob:')
                        ? user.profilePicture
                        : defaultAvatar
                    }
                    alt={`${user.username || 'user'} avatar`}
                    width={32}
                    height={32}
                    className="ml-2 flex-shrink-0 rounded-full"
                  />
                </div>
              </TableCell>
              <TableCell className="text-left text-gray-600">
                {user.email || user.emailAddress ? (
                  user.email || user.emailAddress
                ) : (
                  <span className="italic text-red-500">No email provided</span>
                )}
              </TableCell>
              <TableCell className="text-left text-gray-600">
                {user.enabled !== undefined ? (
                  user.enabled ? (
                    'True'
                  ) : (
                    'False'
                  )
                ) : (
                  <span className="italic text-red-500">Status unknown</span>
                )}
              </TableCell>
              <TableCell className="text-left text-gray-600">
                {user.loginCount !== undefined ? (
                  <span className="font-semibold text-blue-600">{user.loginCount}</span>
                ) : (
                  <span className="italic text-gray-400">0</span>
                )}
              </TableCell>
              <TableCell className="text-left text-gray-600">
                {user.lastLoginAt ? (
                  <span className="text-xs">
                    {new Date(user.lastLoginAt).toLocaleDateString()} <br />
                    {new Date(user.lastLoginAt).toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="italic text-gray-400">Never</span>
                )}
              </TableCell>
              <TableCell className="text-left">
                {user.sessionVersion !== undefined ? (
                  <span className="rounded bg-purple-100 px-2 py-1 text-xs font-mono text-purple-700">
                    v{user.sessionVersion}
                  </span>
                ) : (
                  <span className="italic text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell className="text-left">
                <div className="flex max-w-[120px] items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit?.(user)}
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
                    onClick={() => onDelete?.(user)}
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
  );
}
