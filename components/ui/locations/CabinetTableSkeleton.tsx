import React from "react";
import { ChevronDownIcon } from "@radix-ui/react-icons";

export const CabinetTableSkeleton: React.FC = () => (
  <div className="w-full overflow-x-auto">
    <table className="table-fixed w-full border-collapse text-left">
      <thead className="bg-button text-white">
        <tr>
          {/* Match headers from CabinetTable */}
          <th className="relative p-3 text-sm w-[25%]">
            <div className="flex items-center">
              <span className="font-semibold">ASSET NUMBER</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm w-[20%]">
            <div className="flex items-center">
              <span className="font-semibold">LOCATION</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm text-center">
            <div className="flex items-center justify-center">
              <span className="font-semibold">MONEY IN</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm text-center">
            <div className="flex items-center justify-center">
              <span className="font-semibold">CANCELLED CREDITS</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm text-center">
            <div className="flex items-center justify-center">
              <span className="font-semibold">JACKPOT</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="relative p-3 text-sm text-center">
            <div className="flex items-center justify-center">
              <span className="font-semibold">GROSS</span>
              <div className="w-4 h-4 ml-1 text-white">
                <ChevronDownIcon className="w-full h-full" />
              </div>
            </div>
          </th>
          <th className="p-3 text-sm text-center">
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
            <td className="p-3 bg-white text-sm align-top border-r border-gray-200">
              <div className="h-4 w-3/4 mb-1 bg-gray-200 rounded"></div>
              <div className="h-3 w-1/2 mb-1 bg-gray-200 rounded"></div>
              <div className="h-3 w-1/3 mb-2 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 mb-1 bg-gray-200 rounded"></div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </td>
            {/* Location Column */}
            <td className="p-3 bg-white text-sm align-middle border-r border-gray-200">
              <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
            </td>
            {/* Financial Columns (Centered) */}
            {[...Array(4)].map((_, colIndex) => (
              <td
                key={colIndex}
                className="p-3 bg-white text-sm align-middle text-center border-r border-gray-200"
              >
                <div className="h-4 w-3/4 mx-auto bg-gray-200 rounded"></div>
              </td>
            ))}
            {/* Actions Column (Centered) */}
            <td className="p-3 bg-white text-sm align-middle text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-7 w-7 bg-gray-200 rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
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

export default CabinetTableSkeleton;
