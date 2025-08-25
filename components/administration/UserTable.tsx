import Image from "next/image";
import type { User, SortKey } from "@/lib/types/administration";
import defaultAvatar from "@/public/defaultAvatar.svg";
import leftHamburgerMenu from "@/public/leftHamburgerMenu.svg";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

type UserTableProps = {
  users: User[];
  sortConfig: { key: SortKey; direction: "ascending" | "descending" } | null;
  requestSort: (key: SortKey) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onMenu?: (user: User) => void;
};

export default function UserTable({
  users,
  sortConfig,
  requestSort,
  onEdit,
  onDelete,
  onMenu,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto hidden lg:block">
      <table className="min-w-full bg-white rounded-lg shadow-md">
        <thead className="bg-button text-white">
          <tr>
            {["NAME", "USERNAME", "EMAIL ADDRESS", "ENABLED", "ACTIONS"].map(
              (col) => {
                const sortKey = col.toLowerCase().replace(" ", "") as SortKey;
                return (
                  <th
                    key={col}
                    className="py-3 px-4 text-left font-semibold text-sm cursor-pointer select-none"
                    onClick={() => requestSort(sortKey)}
                  >
                    {col}
                    {sortConfig?.key === sortKey &&
                      (sortConfig.direction === "ascending" ? " ▲" : " ▼")}
                  </th>
                );
              }
            )}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.username}
              className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4 font-medium text-gray-700">
                {user.name}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800">
                      {user.username}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="bg-blue-200 text-blue-800 text-xs font-medium rounded px-2 py-0.5"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Image
                    src={user.profilePicture && !user.profilePicture.startsWith("blob:") ? user.profilePicture : defaultAvatar}
                    alt={`${user.username} avatar`}
                    width={32}
                    height={32}
                    className="rounded-full ml-2 flex-shrink-0"
                  />
                </div>
              </td>
              <td className="py-3 px-4 text-gray-600">{user.email}</td>
              <td className="py-3 px-4 text-gray-600">
                {user.enabled ? "True" : "False"}
              </td>
              <td className="py-3 px-4 flex gap-2 items-center max-w-[120px]">
                <Image
                  src={leftHamburgerMenu}
                  alt="Menu"
                  width={20}
                  height={20}
                  className="cursor-pointer opacity-70 hover:opacity-100"
                  onClick={() => onMenu?.(user)}
                />
                <Image
                  src={editIcon}
                  alt="Edit"
                  width={20}
                  height={20}
                  className="cursor-pointer opacity-70 hover:opacity-100"
                  onClick={() => onEdit?.(user)}
                />
                <Image
                  src={deleteIcon}
                  alt="Delete"
                  width={20}
                  height={20}
                  className="cursor-pointer opacity-70 hover:opacity-100 max-w-[24px] max-h-[24px]"
                  onClick={() => onDelete?.(user)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
