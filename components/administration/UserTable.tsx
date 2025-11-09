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
  return (
    <div className="hidden overflow-x-auto rounded-lg bg-white shadow-md lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            {['NAME', 'USERNAME', 'EMAIL ADDRESS', 'ENABLED', 'LOGIN COUNT', 'LAST LOGIN', 'SESSION', 'ACTIONS'].map(
              col => {
                const sortKey = col.toLowerCase().replace(' ', '') as SortKey;
                return (
                  <TableHead
                    key={col}
                    className="cursor-pointer select-none text-left font-semibold text-white"
                    onClick={() => requestSort(sortKey)}
                  >
                    {col}
                    {sortConfig?.key === sortKey &&
                      (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                  </TableHead>
                );
              }
            )}
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
                {user.email ? (
                  user.email
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
