'use client';

import { ChevronDownIcon } from '@radix-ui/react-icons';

export default function CabinetTableSkeleton() {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="bg-button text-white">
          <tr>
            {/* Match headers from CabinetTable */}
            <th className="relative w-[15%] p-3 text-sm">
              <div className="flex items-center">
                <span className="font-semibold">ASSET NUMBER</span>
                <div className="ml-1 h-4 w-4 text-white">
                  <ChevronDownIcon className="h-full w-full" />
                </div>
              </div>
            </th>
            <th className="relative w-[20%] p-3 text-sm">
              <div className="flex items-center">
                <span className="font-semibold">LOCATION</span>
                <div className="ml-1 h-4 w-4 text-white">
                  <ChevronDownIcon className="h-full w-full" />
                </div>
              </div>
            </th>
            <th className="relative p-3 text-center text-sm">
              <div className="flex items-center justify-center">
                <span className="font-semibold">MONEY IN</span>
                <div className="ml-1 h-4 w-4 text-white">
                  <ChevronDownIcon className="h-full w-full" />
                </div>
              </div>
            </th>
            <th className="relative p-3 text-center text-sm">
              <div className="flex items-center justify-center">
                <span className="font-semibold">MONEY OUT</span>
                <div className="ml-1 h-4 w-4 text-white">
                  <ChevronDownIcon className="h-full w-full" />
                </div>
              </div>
            </th>
            <th className="relative p-3 text-center text-sm">
              <div className="flex items-center justify-center">
                <span className="font-semibold">JACKPOT</span>
                <div className="ml-1 h-4 w-4 text-white">
                  <ChevronDownIcon className="h-full w-full" />
                </div>
              </div>
            </th>
            <th className="relative p-3 text-center text-sm">
              <div className="flex items-center justify-center">
                <span className="font-semibold">GROSS</span>
                <div className="ml-1 h-4 w-4 text-white">
                  <ChevronDownIcon className="h-full w-full" />
                </div>
              </div>
            </th>
            <th className="p-3 text-center text-sm">
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
              {/* Asset/Status Column */}
              <td className="border-r border-gray-200 bg-white p-3 align-top text-sm">
                <div className="skeleton-bg mb-1 h-4 w-3/4 rounded"></div>
                <div className="skeleton-bg mb-1 h-3 w-1/2 rounded"></div>
              </td>
              {/* Location Column */}
              <td className="border-r border-gray-200 bg-white p-3 align-middle text-sm">
                <div className="skeleton-bg h-4 w-5/6 rounded"></div>
              </td>
              {/* Financial Columns (Centered) */}
              {[...Array(4)].map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="border-r border-gray-200 bg-white p-3 text-center align-middle text-sm"
                >
                  <div className="skeleton-bg mx-auto h-4 w-3/4 rounded"></div>
                </td>
              ))}
              {/* Actions Column (Centered) */}
              <td className="bg-white p-3 text-center align-middle text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="skeleton-bg flex h-7 w-7 items-center justify-center rounded">
                    <div className="h-4 w-4 rounded bg-gray-300"></div>
                  </div>
                  <div className="skeleton-bg flex h-7 w-7 items-center justify-center rounded">
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
}
