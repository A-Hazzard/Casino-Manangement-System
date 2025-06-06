"use client";

export default function UserTableSkeleton() {
  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full bg-white rounded-lg shadow-md">
        <thead className="bg-button text-white">
          <tr>
            {["NAME", "USERNAME", "EMAIL ADDRESS", "ENABLED", "ACTIONS"].map(
              (col) => (
                <th
                  key={col}
                  className="py-3 px-4 text-left font-semibold text-sm select-none"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, idx) => (
            <tr key={idx} className="border-b last:border-b-0">
              {Array.from({ length: 5 }).map((__, colIdx) => (
                <td key={colIdx} className="py-3 px-4">
                  <div className="h-4 w-3/4 skeleton-bg rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
