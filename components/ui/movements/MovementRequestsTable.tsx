import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  getStatusColor,
  formatMovementRequestDate,
} from "@/lib/utils/movementRequests";
import { MovementRequest } from "@/lib/types/movementRequests";

export type MovementRequestsTableProps = {
  requests: MovementRequest[];
  onEdit: (request: MovementRequest) => void;
  onDelete: (request: MovementRequest) => void;
  locationsMap: { [id: string]: string };
};

export default function MovementRequestsTable({
  requests,
  onEdit,
  onDelete,
  locationsMap,
}: MovementRequestsTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const prevRequestsRef = useRef<MovementRequest[]>([]);

  useEffect(() => {
    if (
      requests.length > 0 &&
      JSON.stringify(requests) !== JSON.stringify(prevRequestsRef.current)
    ) {
      prevRequestsRef.current = [...requests];
      const rows = tableRef.current?.querySelectorAll("tbody tr");
      if (rows && rows.length > 0) {
        // Animate rows (optional, like CabinetTable)
      }
    }
  }, [requests]);

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className="table-fixed w-full border-collapse text-center min-w-[800px]"
      >
        <thead className="bg-button text-white">
          <tr>
            <th className="p-3 border border-border border-t-0 text-sm w-[15%]">
              Creator
            </th>
            <th className="p-3 border border-border border-t-0 text-sm w-[18%]">
              Location From
            </th>
            <th className="p-3 border border-border border-t-0 text-sm w-[18%]">
              Location To
            </th>
            <th className="p-3 border border-border border-t-0 text-sm w-[12%]">
              Cabinet In
            </th>
            <th className="p-3 border border-border border-t-0 text-sm w-[15%]">
              Time
            </th>
            <th className="p-3 border border-border border-t-0 text-sm w-[12%]">
              Status
            </th>
            <th className="p-3 border border-border border-t-0 text-sm w-[10%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req._id} className="hover:bg-grayHighlight/10">
              <td className="p-3 bg-container border border-border text-sm text-left hover:bg-grayHighlight/20 font-medium w-[15%]">
                <div className="truncate" title={req.createdBy}>
                  {req.createdBy}
                </div>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20 w-[18%]">
                <div
                  className="truncate"
                  title={locationsMap[req.locationFrom] || req.locationFrom}
                >
                  {locationsMap[req.locationFrom] || req.locationFrom}
                </div>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20 w-[18%]">
                <div
                  className="truncate"
                  title={locationsMap[req.locationTo] || req.locationTo}
                >
                  {locationsMap[req.locationTo] || req.locationTo}
                </div>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20 w-[12%]">
                <div className="truncate" title={req.cabinetIn}>
                  {req.cabinetIn}
                </div>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20 w-[15%]">
                <div
                  className="truncate"
                  title={formatMovementRequestDate(req.timestamp)}
                >
                  {formatMovementRequestDate(req.timestamp)}
                </div>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20 w-[12%]">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full truncate max-w-full ${getStatusColor(
                    req.status
                  )}`}
                  title={req.status}
                >
                  {req.status}
                </span>
              </td>
              <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20 w-[10%]">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(req)}
                    className="p-1 hover:bg-buttonActive/10 text-grayHighlight"
                  >
                    <Image
                      src="/editIcon.svg"
                      width={20}
                      height={20}
                      alt="Edit"
                      className="w-5 h-5"
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(req)}
                    className="p-1 hover:bg-destructive/10 text-destructive"
                  >
                    <Image
                      src="/deleteIcon.svg"
                      width={20}
                      height={20}
                      alt="Delete"
                      className="w-5 h-5"
                    />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
