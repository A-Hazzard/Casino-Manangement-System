import React from "react";
import { ChevronDownIcon } from "@radix-ui/react-icons";

export const MemberTableSkeleton: React.FC = () => (
  <div className="w-full overflow-x-auto">
    <table className="table-fixed w-full border-collapse text-center">
      <thead className="bg-button text-white">
        <tr>
          {/* Match headers from MemberTable */}
          <th className="relative p-3 text-sm w-[20%]">
            <div className="flex items-center justify-center">
              <span className="font-semibold">MEMBER ID</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm w-[30%]">
            <div className="flex items-center justify-center">
              <span className="font-semibold">FULL NAME</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm w-[20%]">
            <div className="flex items-center justify-center">
              <span className="font-semibold">JOINED</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="p-3 text-sm w-[15%]">
            <span className="font-semibold">DETAILS</span>
          </th>
          <th className="p-3 text-sm w-[15%]">
            <span className="font-semibold">ACTIONS</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-b border-gray-200 hover:bg-gray-50"
          >
            {/* Member ID Column */}
            <td className="p-3 bg-container border border-border text-sm text-left hover:bg-accent">
              <div className="h-4 w-3/4 skeleton-bg rounded font-mono text-xs"></div>
            </td>
            {/* Full Name Column */}
            <td className="p-3 bg-container border border-border text-sm text-left hover:bg-accent">
              <div className="h-4 w-4/5 skeleton-bg rounded mb-1"></div>
              <div className="flex gap-1">
                <div className="h-3 w-16 skeleton-bg rounded"></div>
                <div className="h-3 w-12 skeleton-bg rounded"></div>
              </div>
            </td>
            {/* Joined Column */}
            <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
              <div className="h-4 w-3/4 mx-auto skeleton-bg rounded"></div>
            </td>
            {/* Details Column */}
            <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
              <div className="flex items-center justify-center gap-2">
                <div className="h-7 w-7 bg-gray-200 rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="h-7 w-7 bg-gray-200 rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            </td>
            {/* Actions Column */}
            <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
              <div className="flex items-center justify-center">
                <div className="h-7 w-7 bg-gray-200 rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MemberTableSkeleton;
