import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';

// Pre-render the icons for better performance
const EditIcon = () => (
  <Image src={editIcon} alt="Edit" width={20} height={20} priority />
);

const DeleteIcon = () => (
  <Image src={deleteIcon} alt="Delete" width={20} height={20} priority />
);
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
        <button
          onClick={() => onEdit(request)}
          className="flex-shrink-0 text-green-500"
        >
          <EditIcon />
        </button>
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
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`inline-flex max-w-[120px] truncate rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
            request.status
          )}`}
          title={request.status}
        >
          {request.status}
        </span>
        <button
          onClick={() => onDelete(request)}
          className="flex-shrink-0 text-red-500"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}
