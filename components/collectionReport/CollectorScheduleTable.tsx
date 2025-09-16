import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateString } from "@/lib/utils/dateUtils";
import { CollectorScheduleTableProps } from "@/lib/types/componentProps";

export default function CollectorScheduleTable({
  data,
  loading,
}: CollectorScheduleTableProps) {
  if (loading) {
    return (
      <div className="hidden md:flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-buttonActive"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="hidden md:flex justify-center items-center py-8">
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center w-full max-w-md mx-auto">
          <div className="text-gray-500 text-lg mb-2">No Data Available</div>
          <div className="text-gray-400 text-sm text-center">
            No collector schedules found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow w-full min-w-0 max-w-[90vw]">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="text-white font-semibold">COLLECTOR</TableHead>
            <TableHead className="text-white font-semibold">LOCATION</TableHead>
            <TableHead className="text-white font-semibold">START TIME</TableHead>
            <TableHead className="text-white font-semibold">END TIME</TableHead>
            <TableHead className="text-white font-semibold">DURATION</TableHead>
            <TableHead className="text-white font-semibold">STATUS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule, index) => {
            const startTime = new Date(schedule.startTime);
            const endTime = new Date(schedule.endTime);
            const duration = (
              (endTime.getTime() - startTime.getTime()) /
              (1000 * 60 * 60)
            ).toFixed(1);

            return (
              <TableRow
                key={schedule._id || index}
                className="hover:bg-gray-50"
              >
                <TableCell className="font-medium">
                  {schedule.collector || schedule.collectorName}
                </TableCell>
                <TableCell>
                  {schedule.location || schedule.locationName}
                </TableCell>
                <TableCell>
                  {formatDateString(schedule.startTime)}
                </TableCell>
                <TableCell>
                  {formatDateString(schedule.endTime)}
                </TableCell>
                <TableCell>{duration} hours</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      schedule.status === "scheduled" ||
                      schedule.status === "in-progress"
                        ? "secondary"
                        : schedule.status === "completed"
                        ? "default"
                        : "destructive"
                    }
                    className={
                      schedule.status === "scheduled" ||
                      schedule.status === "in-progress"
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        : schedule.status === "completed"
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }
                  >
                    {schedule.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
