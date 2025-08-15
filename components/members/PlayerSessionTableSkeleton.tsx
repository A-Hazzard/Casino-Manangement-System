import React from "react";

const TABLE_HEADERS = [
  "Login Time",
  "Session Length",
  "Handle",
  "Cancel. Cred.",
  "Jackpot",
  "Won/Less",
  "Points",
  "Games Played",
  "Games Won",
  "Coin In",
  "Coin Out",
  "Actions",
];

// Session Card Skeleton Component for Mobile
const SessionCardSkeleton = () => {
  return (
    <div className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto border border-border">
      <div className="flex justify-between items-center mb-3">
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex justify-between">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlayerSessionTableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden" suppressHydrationWarning>
      {/* Mobile Card Skeleton View */}
      <div className="block lg:hidden">
        <div className="grid grid-cols-1 gap-4 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SessionCardSkeleton key={index} />
          ))}
        </div>
      </div>

      {/* Desktop Table Skeleton View */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="table-fixed w-full border-collapse text-center">
            <thead className="bg-button text-white">
              <tr>
                {TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className="p-3 border border-border text-sm relative cursor-pointer"
                  >
                    <span>{header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="hover:bg-muted">
                  {TABLE_HEADERS.map((header) => (
                    <td
                      key={header}
                      className="p-3 bg-container border border-border text-sm text-left hover:bg-accent"
                    >
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-8 w-8 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
