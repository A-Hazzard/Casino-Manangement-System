import React, { useEffect, useRef } from "react";
import Image from "next/image";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

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
} from "@/lib/utils/movementRequests";
import { MovementRequest } from "@/lib/types/movementRequests";

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
      className="bg-white shadow-sm rounded-lg p-4 w-full mx-auto relative border border-gray-100 mb-4 max-w-full overflow-hidden"
    >
      <div className="flex justify-between items-center mb-2">
        <h3
          className="text-sm font-semibold truncate flex-1 pr-2"
          title={request.createdBy}
        >
          {request.createdBy}
        </h3>
        <button
          onClick={() => onEdit(request)}
          className="text-green-500 flex-shrink-0"
        >
          <EditIcon />
        </button>
      </div>
      <div className="mb-3 space-y-1">
        <p
          className="text-xs text-gray-600 truncate"
          title={`From: ${
            locationsMap[request.locationFrom] || request.locationFrom
          }`}
        >
          <span className="font-medium">From:</span>{" "}
          {locationsMap[request.locationFrom] || request.locationFrom}
        </p>
        <p
          className="text-xs text-gray-600 truncate"
          title={`To: ${
            locationsMap[request.locationTo] || request.locationTo
          }`}
        >
          <span className="font-medium">To:</span>{" "}
          {locationsMap[request.locationTo] || request.locationTo}
        </p>
        <p
          className="text-xs text-gray-600 truncate"
          title={`Cabinet: ${request.cabinetIn}`}
        >
          <span className="font-medium">Cabinet:</span> {request.cabinetIn}
        </p>
        <p
          className="text-xs text-gray-600 truncate"
          title={`Date: ${formatMovementRequestDate(request.timestamp)}`}
        >
          <span className="font-medium">Date:</span>{" "}
          {formatMovementRequestDate(request.timestamp)}
        </p>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full truncate max-w-[120px] ${getStatusColor(
            request.status
          )}`}
          title={request.status}
        >
          {request.status}
        </span>
        <button
          onClick={() => onDelete(request)}
          className="text-red-500 flex-shrink-0"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}
