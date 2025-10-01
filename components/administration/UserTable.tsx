import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { User, SortKey } from "@/lib/types/administration";
import defaultAvatar from "@/public/defaultAvatar.svg";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

type UserTableProps = {
  users: User[];
  sortConfig: { key: SortKey; direction: "ascending" | "descending" } | null;
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
    <div className="overflow-x-auto hidden lg:block bg-white rounded-lg shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            {["NAME", "USERNAME", "EMAIL ADDRESS", "ENABLED", "ACTIONS"].map(
              (col) => {
                const sortKey = col.toLowerCase().replace(" ", "") as SortKey;
                return (
                  <TableHead
                    key={col}
                    className="text-white font-semibold cursor-pointer select-none text-left"
                    onClick={() => requestSort(sortKey)}
                  >
                    {col}
                    {sortConfig?.key === sortKey &&
                      (sortConfig.direction === "ascending" ? " ▲" : " ▼")}
                  </TableHead>
                );
              }
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.username}
              className="hover:bg-gray-50 transition-colors"
            >
              <TableCell className="font-medium text-gray-700 text-left">
                {user.name ? (
                  user.name
                ) : (
                  <span className="text-red-500 italic">No name provided</span>
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
                      <span className="text-red-500 italic">
                        No username provided
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="bg-blue-200 text-blue-800 hover:bg-blue-300"
                          >
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-red-500 italic text-xs">
                          No roles assigned
                        </span>
                      )}
                    </div>
                  </div>
                  <Image
                    src={
                      user.profilePicture &&
                      !user.profilePicture.startsWith("blob:")
                        ? user.profilePicture
                        : defaultAvatar
                    }
                    alt={`${user.username || "user"} avatar`}
                    width={32}
                    height={32}
                    className="rounded-full ml-2 flex-shrink-0"
                  />
                </div>
              </TableCell>
              <TableCell className="text-gray-600 text-left">
                {user.email ? (
                  user.email
                ) : (
                  <span className="text-red-500 italic">No email provided</span>
                )}
              </TableCell>
              <TableCell className="text-gray-600 text-left">
                {user.enabled !== undefined ? (
                  user.enabled ? (
                    "True"
                  ) : (
                    "False"
                  )
                ) : (
                  <span className="text-red-500 italic">Status unknown</span>
                )}
              </TableCell>
              <TableCell className="text-left">
                <div className="flex gap-2 items-center max-w-[120px]">
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
