import Image from "next/image";
import type { User } from "@/lib/types/administration";
import defaultAvatar from "@/public/defaultAvatar.svg";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

type UserCardProps = {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
};

export default function UserCard({
  user,
  onEdit,
  onDelete,
}: UserCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-500 text-white p-3 flex items-center gap-2">
        <Image
          src={user.profilePicture && !user.profilePicture.startsWith("blob:") ? user.profilePicture : defaultAvatar}
          alt={`${user.username} avatar`}
          width={24}
          height={24}
          className="rounded-full bg-gray-300 flex-shrink-0"
        />
        <div className="flex gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
          {user.roles.map((role) => (
            <span
              key={role}
              className="bg-black text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap flex-shrink-0"
            >
              {role.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <div className="p-3">
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">Username:</span> {user.username}
        </div>
        {user.name && (
          <div className="text-sm text-gray-700 mb-1">
            <span className="font-semibold">Name:</span> {user.name}
          </div>
        )}
        <div className="text-sm text-gray-700 mb-1">Email: {user.email}</div>
        <div className="text-sm text-gray-700 mb-3">
          Enabled: {user.enabled ? "True" : "False"}
        </div>
        <div className="flex justify-end gap-3 items-center">
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
