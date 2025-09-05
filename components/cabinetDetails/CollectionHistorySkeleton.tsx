import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const CollectionHistorySkeleton = () => (
  <div className="w-full">
    {/* Desktop Table View Skeleton */}
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
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Mobile Cards View Skeleton */}
    <div className="lg:hidden space-y-4 w-full">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="text-center">
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Pagination Skeleton */}
    <div className="flex justify-center items-center mt-6 gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-8" />
      ))}
    </div>
  </div>
);

export default CollectionHistorySkeleton;
