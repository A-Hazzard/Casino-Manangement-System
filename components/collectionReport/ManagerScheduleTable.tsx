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
import type { SchedulerTableRow } from "@/lib/types/componentProps";

type Props = {
  data: SchedulerTableRow[];
  loading: boolean;
};

export default function ManagerScheduleTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="hidden md:flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-buttonActive"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="hidden md:flex justify-center items-center py-8">
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center w-full max-w-md mx-auto">
          <div className="text-gray-500 text-lg mb-2">No Data Available</div>
          <div className="text-gray-400 text-sm text-center">
            No scheduled visits found.
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
            <TableHead className="text-white font-semibold">MANAGER</TableHead>
            <TableHead className="text-white font-semibold">VISIT TIME</TableHead>
            <TableHead className="text-white font-semibold">CREATED AT</TableHead>
            <TableHead className="text-white font-semibold">STATUS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{row.collector}</TableCell>
              <TableCell>{row.location}</TableCell>
              <TableCell>{row.creator}</TableCell>
              <TableCell>{row.visitTime}</TableCell>
              <TableCell>{row.createdAt}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    row.status === "pending"
                      ? "secondary"
                      : row.status === "completed"
                      ? "default"
                      : "destructive"
                  }
                  className={
                    row.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      : row.status === "completed"
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
