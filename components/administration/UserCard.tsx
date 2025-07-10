import Image from "next/image";
import type { User } from "@/lib/types/administration";
import defaultAvatar from "@/public/defaultAvatar.svg";
import leftHamburgerMenu from "@/public/leftHamburgerMenu.svg";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

type UserCardProps = {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onMenu?: (user: User) => void;
};

export default function UserCard({
  user,
  onEdit,
  onDelete,
  onMenu,
}: UserCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-500 text-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline flex-1 min-w-0">
          <span
            className="font-bold text-base sm:text-lg mr-2 truncate block max-w-full"
            title={user.username}
          >
            {user.username}
          </span>
          <span
            className="text-xs sm:text-sm font-normal truncate block max-w-full"
            title={user.name}
          >
            {user.name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end mt-2 sm:mt-0">
          <Image
            src={user.profilePicture || defaultAvatar}
            alt={`${user.username} avatar`}
            width={24}
            height={24}
            className="rounded-full bg-gray-300 flex-shrink-0"
          />
          {user.roles.map((role) => (
            <span
              key={role}
              className="bg-black text-white text-[10px] sm:text-xs font-semibold px-2 py-1 rounded whitespace-nowrap mb-1"
            >
              {role.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <div className="p-3">
        <div className="text-sm text-gray-700 mb-1">Email: {user.email}</div>
        <div className="text-sm text-gray-700 mb-3">
          Enabled: {user.enabled ? "True" : "False"}
        </div>
        <div className="flex justify-end gap-3 items-center">
          <Image
            src={leftHamburgerMenu}
            alt="Menu"
            width={22}
            height={22}
            className="cursor-pointer"
            onClick={() => onMenu?.(user)}
          />
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
