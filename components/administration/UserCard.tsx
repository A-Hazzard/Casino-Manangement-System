import Image from "next/image";
import type { User } from "@/lib/types/administration";

type UserCardProps = {
  user: User;
};

export default function UserCard({ user }: UserCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-baseline">
          <span className="font-bold text-lg mr-2">{user.username}</span>
          <span className="text-sm font-normal">{user.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Image
            src={user.profilePicture || "/defaultAvatar.svg"}
            alt={`${user.username} avatar`}
            width={28}
            height={28}
            className="rounded-full bg-gray-300 flex-shrink-0"
          />
          <span className="bg-black text-white text-xs font-semibold px-2 py-1 rounded whitespace-nowrap">
            {user.roles[0].toUpperCase()}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="text-sm text-gray-700 mb-1">Email: {user.email}</div>
        <div className="text-sm text-gray-700 mb-3">
          Enabled: {user.enabled ? "True" : "False"}
        </div>
        <div className="flex justify-end gap-3 items-center">
          <Image
            src="/leftHamburgerMenu.svg"
            alt="Menu"
            width={22}
            height={22}
            className="cursor-pointer"
          />
          <Image
            src="/editIcon.svg"
            alt="Edit"
            width={22}
            height={22}
            className="cursor-pointer"
          />
          <Image
            src="/deleteIcon.svg"
            alt="Delete"
            width={22}
            height={22}
            className="cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
