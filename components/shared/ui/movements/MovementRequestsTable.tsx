import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { useUserStore } from '@/lib/store/userStore';
import { MovementRequest } from '@/lib/types/movement';
import {
    formatMovementRequestDate,
    getStatusColor,
} from '@/lib/utils/movement';
import deleteIcon from '@/public/deleteIcon.svg';
import editIcon from '@/public/editIcon.svg';
import Image from 'next/image';
import { useRef, useState } from 'react';

type MovementRequestsTableProps = {
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
  const { user: currentUser } = useUserStore();
  const userRoles = currentUser?.roles?.map(r => r.toLowerCase()) || [];
  const isAdminOrDev = userRoles.some(role => ['admin', 'developer'].includes(role));
  const userEmail = currentUser?.emailAddress;
  const [viewMachinesReq, setViewMachinesReq] = useState<MovementRequest | null>(null);

  return (
    <div className="w-full max-w-full overflow-x-auto bg-white shadow rounded-lg">
      <Table ref={tableRef} className="w-full">
        <TableHeader>
          <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
            <TableHead className="w-[15%] font-semibold text-white">
              CREATOR
            </TableHead>
            <TableHead className="w-[18%] font-semibold text-white">
              LOCATION FROM
            </TableHead>
            <TableHead className="w-[18%] font-semibold text-white">
              LOCATION TO
            </TableHead>
            <TableHead className="w-[12%] font-semibold text-white text-center">
              MACHINES
            </TableHead>
            <TableHead className="w-[20%] font-semibold text-white">
              DATE
            </TableHead>
            <TableHead className="w-[10%] font-semibold text-white text-center">
              STATUS
            </TableHead>
            <TableHead className="w-[7%] font-semibold text-white text-center">
              ACTIONS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => (
            <TableRow key={req._id} className="hover:bg-grayHighlight/10">
              <TableCell className="font-medium">
                <div className="truncate" title={req.creatorName || req.createdBy}>
                  {req.creatorName || req.createdBy}
                </div>
              </TableCell>
              <TableCell>
                <div
                  className="truncate font-semibold text-gray-700"
                  title={locationsMap[req.locationFromId || req.locationFrom] || req.locationFrom}
                >
                  {locationsMap[req.locationFromId || req.locationFrom] || req.locationFrom}
                </div>
              </TableCell>
              <TableCell>
                <div
                  className="truncate font-semibold text-gray-700"
                  title={locationsMap[req.locationToId || req.locationTo] || req.locationTo}
                >
                  {locationsMap[req.locationToId || req.locationTo] || req.locationTo}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="truncate bg-gray-100 rounded px-1 py-0.5 text-xs inline-block max-w-[120px]" 
                    title={req.machineDetails && req.machineDetails.length > 0 
                      ? req.machineDetails.map(m => m.displayName).join(', ')
                      : req.cabinetIn}
                  >
                    {req.machineDetails && req.machineDetails.length > 0 
                      ? req.machineDetails.slice(0, 2).map(m => m.displayName).join(', ') + (req.machineDetails.length > 2 ? '...' : '')
                      : req.cabinetIn}
                  </div>
                  {req.machineDetails && req.machineDetails.length > 2 && (
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-[10px] text-buttonActive font-bold uppercase hover:no-underline"
                      onClick={() => setViewMachinesReq(req)}
                    >
                      View All ({req.machineDetails.length})
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs text-gray-600" title={formatMovementRequestDate(req.timestamp)}>
                  {formatMovementRequestDate(req.timestamp)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 shadow-sm border ${getStatusColor(
                    req.status
                  )}`}
                  title={req.status}
                >
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-75"></span>
                  {req.status.toUpperCase()}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {(() => {
                    const isCreator = req.createdBy === userEmail || req.createdBy === currentUser?._id;
                    const isRecipient = req.requestTo === userEmail || req.requestTo === currentUser?._id;
                    
                    // Destination location check
                    const destinationLocationId = Object.keys(locationsMap).find(id => locationsMap[id] === req.locationTo) || req.locationTo;
                    const isAuthorizedDestinationUser = userRoles.some(role => 
                      ['location admin', 'technician', 'manager'].includes(role)
                    ) && currentUser?.assignedLocations?.includes(destinationLocationId);

                    const canEdit = isAdminOrDev || isCreator || isRecipient || isAuthorizedDestinationUser;
                    // ONLY developers can delete
                    const canDelete = userRoles.some(role => role.toLowerCase() === 'developer');
                    
                    return (
                      <>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(req);
                            }}
                            className="h-8 w-8 p-1 hover:bg-accent"
                            title="Edit"
                          >
                            <Image src={editIcon} alt="Edit" width={18} height={18} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(req);
                            }}
                            className="h-8 w-8 p-1 hover:bg-accent text-destructive"
                            title="Delete"
                          >
                            <Image
                              src={deleteIcon}
                              alt="Delete"
                              width={18}
                              height={18}
                            />
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                No movement requests found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* View All Machines Modal */}
      <Dialog open={!!viewMachinesReq} onOpenChange={(open) => !open && setViewMachinesReq(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Machines in Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              {viewMachinesReq?.machineDetails?.map((m) => (
                <div key={m._id} className="flex flex-col p-3 border rounded-lg bg-gray-50">
                  <span className="font-semibold text-sm">{m.displayName}</span>
                  {m.serialNumber && m.serialNumber !== m.displayName && (
                    <span className="text-xs text-muted-foreground">SN: {m.serialNumber}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button onClick={() => setViewMachinesReq(null)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
