import React, { useState, useMemo } from "react";
import type { MachineEvent } from "@/lib/types/api";

type ActivityLogTableProps = {
  data: MachineEvent[];
};

/**
 * Renders the Activity Log table.
 * @param data - Array of MachineEvent objects.
 * @returns Activity log table component.
 */
const ActivityLogTable: React.FC<ActivityLogTableProps> = ({ data }) => {
  // Prepare for search, pagination, and animation
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter and sort data for search
  const filtered = useMemo(() => {
    if (!search) return data;
    const lower = search.toLowerCase();
    return data.filter(
      (ev) =>
        ev.command?.toLowerCase().includes(lower) ||
        ev.description?.toLowerCase().includes(lower) ||
        ev.relay?.toLowerCase().includes(lower) ||
        (ev.date &&
          new Date(ev.date).toLocaleString().toLowerCase().includes(lower))
    );
  }, [data, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Machine Activity</h2>
          {/* Add reload button logic if needed */}
        </div>
        <div className="relative w-full mb-4">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-4 pr-10 border border-gray-300 rounded-full text-sm outline-none"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="p-2 border border-background">Date</th>
              <th className="p-2 border border-background">Command</th>
              <th className="p-2 border border-background">Type</th>
              <th className="p-2 border border-background">Description</th>
              <th className="p-2 border border-background">Relay ID</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
              <tr key={row._id || idx} className="text-center">
                <td className="p-2 border border-background">
                  {row.date ? new Date(row.date).toLocaleString() : ""}
                </td>
                <td className="p-2 border border-background font-mono">
                  {row.command || ""}
                </td>
                <td className="p-2 border border-background">
                  {row.commandType || ""}
                </td>
                <td className="p-2 border border-background text-left">
                  {row.description || ""}
                </td>
                <td className="p-2 border border-background font-mono">
                  {row.relay || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination controls */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage(1)}
          disabled={page === 1}
        >
          {"<<"}
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          {"<"}
        </button>
        <span>Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={page}
          onChange={(e) => {
            let val = Number(e.target.value);
            if (isNaN(val)) val = 1;
            if (val < 1) val = 1;
            if (val > totalPages) val = totalPages;
            setPage(val);
          }}
          className="w-14 px-2 py-1 border rounded text-center text-sm"
          aria-label="Page number"
        />
        <span>of {Math.max(1, totalPages)}</span>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
        >
          {">"}
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages || totalPages === 0}
        >
          {">>"}
        </button>
      </div>
    </div>
  );
};

export { ActivityLogTable };
