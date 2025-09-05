import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Type for collection data from machine's embedded collectionMetersHistory
type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number; // This maps to prevMetersIn from the embedded data
  prevOut: number; // This maps to prevMetersOut from the embedded data
  locationReportId: string;
};

export function CollectionHistoryTable({ data }: { data: CollectionData[] }) {
  const router = useRouter();

  // Pagination (client-side) - must be before any early returns
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = useMemo(
    () => data.slice((page - 1) * pageSize, page * pageSize),
    [data, page]
  );

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grayHighlight">
          No collection history data found for this machine.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden lg:block w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Meters In</TableHead>
              <TableHead>Meters Out</TableHead>
              <TableHead>Prev. In</TableHead>
              <TableHead>Prev. Out</TableHead>
              <TableHead>Collection Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row) => (
              <TableRow key={row._id}>
                <TableCell>
                  {new Date(row.timestamp).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </TableCell>
                <TableCell>{row.metersIn?.toLocaleString()}</TableCell>
                <TableCell>{row.metersOut?.toLocaleString()}</TableCell>
                <TableCell>{row.prevIn?.toLocaleString()}</TableCell>
                <TableCell>{row.prevOut?.toLocaleString()}</TableCell>
                <TableCell>
                  {row.locationReportId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/collection-report/report/${row.locationReportId}`
                        )
                      }
                    >
                      VIEW REPORT
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-4 w-full">
        {paged.map((row) => (
          <Card key={row._id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Collection Entry</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(row.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Meters In:
                  </span>
                  <span className="font-medium">
                    {row.metersIn?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Meters Out:
                  </span>
                  <span className="font-medium">
                    {row.metersOut?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Prev. In:
                  </span>
                  <span className="font-medium">
                    {row.prevIn?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Prev. Out:
                  </span>
                  <span className="font-medium">
                    {row.prevOut?.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {new Date(row.timestamp).toLocaleString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
              {row.locationReportId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    router.push(
                      `/collection-report/report/${row.locationReportId}`
                    )
                  }
                >
                  VIEW REPORT
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-6 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goFirst}
          disabled={page === 1}
        >
          {"<<"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={page === 1}
        >
          {"<"}
        </Button>
        <span className="px-2 text-sm">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={page === totalPages}
        >
          {">"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goLast}
          disabled={page === totalPages}
        >
          {">>"}
        </Button>
      </div>
    </div>
  );
}
