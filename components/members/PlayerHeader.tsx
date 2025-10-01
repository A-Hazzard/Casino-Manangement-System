import React from "react";
import { CasinoMember as Member } from "@/shared/types/entities";
import { User } from "lucide-react";

type PlayerHeaderProps = {
  member: Member;
};

export default function PlayerHeader({ member }: PlayerHeaderProps) {
  const fullName =
    member.profile?.firstName && member.profile?.lastName
      ? `${member.profile.firstName} ${member.profile.lastName}`
      : member.memberId;

  const occupation = member.profile?.occupation || "";

  return (
    <div className="flex items-center my-8">
      <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center mr-6">
        <User className="w-10 h-10 text-gray-600" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">{fullName}</h1>
        {occupation && <p className="text-gray-500">{occupation}</p>}
      </div>
    </div>
  );
}
