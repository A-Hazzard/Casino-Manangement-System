import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import {
  getStatusColor,
  formatMovementRequestDate,
} from '@/lib/utils/movementRequests';
import { MovementRequest } from '@/lib/types/movementRequests';

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
      const rows = tableRef.current?.querySelectorAll('tbody tr');
      if (rows && rows.length > 0) {
        // Animate rows (optional, like CabinetTable)
      }
    }
  }, [requests]);

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className="w-full min-w-[800px] table-fixed border-collapse text-center"
      >
        <thead className="bg-button text-white">
          <tr>
            <th className="w-[15%] border border-t-0 border-border p-3 text-sm">
              Creator
            </th>
            <th className="w-[18%] border border-t-0 border-border p-3 text-sm">
              Location From
            </th>
            <th className="w-[18%] border border-t-0 border-border p-3 text-sm">
              Location To
            </th>
            <th className="w-[12%] border border-t-0 border-border p-3 text-sm">
              Cabinet In
            </th>
            <th className="w-[15%] border border-t-0 border-border p-3 text-sm">
              Date
            </th>
            <th className="w-[12%] border border-t-0 border-border p-3 text-sm">
              Status
            </th>
            <th className="w-[10%] border border-t-0 border-border p-3 text-sm">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req._id} className="hover:bg-grayHighlight/10">
              <td className="w-[15%] border border-border bg-container p-3 text-left text-sm font-medium hover:bg-grayHighlight/20">
                <div className="truncate" title={req.createdBy}>
                  {req.createdBy}
                </div>
              </td>
              <td className="w-[18%] border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <div
                  className="truncate"
                  title={locationsMap[req.locationFrom] || req.locationFrom}
                >
                  {locationsMap[req.locationFrom] || req.locationFrom}
                </div>
              </td>
              <td className="w-[18%] border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <div
                  className="truncate"
                  title={locationsMap[req.locationTo] || req.locationTo}
                >
                  {locationsMap[req.locationTo] || req.locationTo}
                </div>
              </td>
              <td className="w-[12%] border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <div className="truncate" title={req.cabinetIn}>
                  {req.cabinetIn}
                </div>
              </td>
              <td className="w-[15%] border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <div
                  className="truncate"
                  title={formatMovementRequestDate(req.timestamp)}
                >
                  {formatMovementRequestDate(req.timestamp)}
                </div>
              </td>
              <td className="w-[12%] border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <span
                  className={`inline-flex max-w-full truncate rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                    req.status
                  )}`}
                  title={req.status}
                >
                  {req.status}
                </span>
              </td>
              <td className="w-[10%] border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(req)}
                    className="p-1 text-grayHighlight hover:bg-buttonActive/10"
                  >
                    <Image src={editIcon} alt="Edit" width={20} height={20} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(req)}
                    className="p-1 text-destructive hover:bg-destructive/10"
                  >
                    <Image
                      src={deleteIcon}
                      alt="Delete"
                      width={20}
                      height={20}
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
