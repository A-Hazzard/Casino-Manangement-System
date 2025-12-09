import { useEffect, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getStatusColor,
  formatMovementRequestDate,
} from '@/lib/utils/movementRequests';
import { MovementRequest } from '@/lib/types/movementRequests';

export type MovementRequestCardProps = {
  request: MovementRequest;
  onEdit: (request: MovementRequest) => void;
  onDelete: (request: MovementRequest) => void;
  locationsMap: { [id: string]: string };
};

export default function MovementRequestCard({
  request,
  onEdit,
  onDelete,
  locationsMap,
}: MovementRequestCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef<MovementRequest | null>(null);

  useEffect(() => {
    if (
      !prevPropsRef.current ||
      JSON.stringify(request) !== JSON.stringify(prevPropsRef.current)
    ) {
      prevPropsRef.current = { ...request };
      if (cardRef.current) {
        // Animate card (optional)
      }
    }
  }, [request]);

  return (
    <div
      ref={cardRef}
      className="relative mx-auto mb-4 w-full max-w-full overflow-hidden rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3
          className="flex-1 truncate pr-2 text-sm font-semibold"
          title={request.createdBy}
        >
          {request.createdBy}
        </h3>
      </div>
      <div className="mb-3 space-y-1">
        <p
          className="truncate text-xs text-gray-600"
          title={`From: ${
            locationsMap[request.locationFrom] || request.locationFrom
          }`}
        >
          <span className="font-medium">From:</span>{' '}
          {locationsMap[request.locationFrom] || request.locationFrom}
        </p>
        <p
          className="truncate text-xs text-gray-600"
          title={`To: ${
            locationsMap[request.locationTo] || request.locationTo
          }`}
        >
          <span className="font-medium">To:</span>{' '}
          {locationsMap[request.locationTo] || request.locationTo}
        </p>
        <p
          className="truncate text-xs text-gray-600"
          title={`Cabinet: ${request.cabinetIn}`}
        >
          <span className="font-medium">Cabinet:</span> {request.cabinetIn}
        </p>
        <p
          className="truncate text-xs text-gray-600"
          title={`Date: ${formatMovementRequestDate(request.timestamp)}`}
        >
          <span className="font-medium">Date:</span>{' '}
          {formatMovementRequestDate(request.timestamp)}
        </p>
      </div>
      <div className="mb-3 flex items-center">
        <span
          className={`inline-flex truncate rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
            request.status
          )}`}
          title={request.status}
        >
          {request.status}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => onEdit(request)}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Button>
        <Button
          onClick={() => onDelete(request)}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
}
