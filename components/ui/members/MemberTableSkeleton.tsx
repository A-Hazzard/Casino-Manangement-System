import React from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';

export const MemberTableSkeleton: React.FC = () => (
  <div className="w-full overflow-x-auto">
    <table className="w-full table-fixed border-collapse text-center">
      <thead className="bg-button text-white">
        <tr>
          {/* Match headers from MemberTable */}
          <th className="relative w-[20%] p-3 text-sm">
            <div className="flex items-center justify-center">
              <span className="font-semibold">MEMBER ID</span>
              <div className="ml-1 h-4 w-4 text-white">
                <ChevronDownIcon className="h-full w-full" />
              </div>
            </div>
          </th>
          <th className="relative w-[30%] p-3 text-sm">
            <div className="flex items-center justify-center">
              <span className="font-semibold">FULL NAME</span>
              <div className="ml-1 h-4 w-4 text-white">
                <ChevronDownIcon className="h-full w-full" />
              </div>
            </div>
          </th>
          <th className="relative w-[20%] p-3 text-sm">
            <div className="flex items-center justify-center">
              <span className="font-semibold">JOINED</span>
              <div className="ml-1 h-4 w-4 text-white">
                <ChevronDownIcon className="h-full w-full" />
              </div>
            </div>
          </th>
          <th className="w-[15%] p-3 text-sm">
            <span className="font-semibold">DETAILS</span>
          </th>
          <th className="w-[15%] p-3 text-sm">
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
            <td className="border border-border bg-container p-3 text-left text-sm hover:bg-accent">
              <div className="skeleton-bg h-4 w-3/4 rounded font-mono text-xs"></div>
            </td>
            {/* Full Name Column */}
            <td className="border border-border bg-container p-3 text-left text-sm hover:bg-accent">
              <div className="skeleton-bg mb-1 h-4 w-4/5 rounded"></div>
              <div className="flex gap-1">
                <div className="skeleton-bg h-3 w-16 rounded"></div>
                <div className="skeleton-bg h-3 w-12 rounded"></div>
              </div>
            </td>
            {/* Joined Column */}
            <td className="border border-border bg-container p-3 text-sm hover:bg-accent">
              <div className="skeleton-bg mx-auto h-4 w-3/4 rounded"></div>
            </td>
            {/* Details Column */}
            <td className="border border-border bg-container p-3 text-sm hover:bg-accent">
              <div className="flex items-center justify-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-200">
                  <div className="h-4 w-4 rounded bg-gray-300"></div>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-200">
                  <div className="h-4 w-4 rounded bg-gray-300"></div>
                </div>
              </div>
            </td>
            {/* Actions Column */}
            <td className="border border-border bg-container p-3 text-sm hover:bg-accent">
              <div className="flex items-center justify-center">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-200">
                  <div className="h-4 w-4 rounded bg-gray-300"></div>
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
