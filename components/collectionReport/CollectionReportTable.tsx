import React from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import SVG icons for pre-rendering
import detailsIcon from "@/public/details.svg";
import { Button } from "@/components/ui/button";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import { useRouter } from "next/navigation";
import { Edit3, Trash2 } from "lucide-react";

type ExtendedCollectionReportTableProps = {
  data: CollectionReportRow[];
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
};

export default function CollectionReportTable({
  data,
  onEdit,
  onDelete,
}: ExtendedCollectionReportTableProps) {
  const router = useRouter();
  return (
    <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow w-full min-w-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="text-white font-semibold">
              COLLECTOR
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              LOCATION
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              GROSS
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              MACHINES
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              COLLECTED
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              UNCOLLECTED
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              VARIATION
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              BALANCE
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              LOCATION REVENUE
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              TIME
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              DETAILS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row, index) => (
            <TableRow
              key={`${row?.collector || "unknown"}-${
                row?.location || "unknown"
              }-${row?.time || "unknown"}-${index}`}
              className="hover:bg-lighterGreenHighlight"
            >
              <TableCell className="font-medium">
                {row?.collector || "-"}
              </TableCell>
              <TableCell centered>{row?.location || "-"}</TableCell>
              <TableCell centered>{row?.gross || 0}</TableCell>
              <TableCell centered>{row?.machines || "0/0"}</TableCell>
              <TableCell centered>{row?.collected || 0}</TableCell>
              <TableCell centered>{row?.uncollected || "-"}</TableCell>
              <TableCell centered>{row?.variation || "No Variance"}</TableCell>
              <TableCell centered>{row?.balance || 0}</TableCell>
              <TableCell centered>{row?.locationRevenue || 0}</TableCell>
              <TableCell centered>{row?.time || "-"}</TableCell>
              <TableCell centered>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-buttonActive hover:bg-buttonActive/10"
                    onClick={() =>
                      router.push(
                        `/collection-report/report/${
                          row?.locationReportId || ""
                        }`
                      )
                    }
                    aria-label="View Details"
                  >
                    <Image
                      src={detailsIcon}
                      alt="Details"
                      className="h-4 w-4"
                      width={16}
                      height={16}
                    />
                  </Button>
                  <div className="flex gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                        onClick={() => onEdit(row?.locationReportId || "")}
                        aria-label="Edit Report"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                        onClick={() => onDelete(row?.locationReportId || "")}
                        aria-label="Delete Report"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
