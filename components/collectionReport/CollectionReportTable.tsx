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
import { Badge } from "@/components/ui/badge";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Trash2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat";
import { useUserStore } from "@/lib/store/userStore";
import { hasAdminAccess, hasManagerAccess } from "@/lib/utils/permissions";

type ExtendedCollectionReportTableProps = {
  data: CollectionReportRow[];
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  sortField?: keyof CollectionReportRow;
  sortDirection?: "asc" | "desc";
  onSort?: (field: keyof CollectionReportRow) => void;
};

export default function CollectionReportTable({
  data,
  reportIssues,
  onEdit,
  onDelete,
  sortField = "time",
  sortDirection = "desc",
  onSort,
}: ExtendedCollectionReportTableProps) {
  const {
    formatAmount: _formatAmount,
    shouldShowCurrency: _shouldShowCurrency,
  } = useCurrencyFormat();
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  // Check if user has admin access to see issue highlights
  const isAdminUser = user?.roles ? hasAdminAccess(user.roles) : false;

  // Check if user can edit/delete reports (admin, evo admin, or manager)
  const canEditDelete = user?.roles ? hasManagerAccess(user.roles) : false;

  return (
    <div className="hidden lg:block overflow-x-auto bg-white shadow w-full min-w-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead
              className="text-white font-semibold cursor-pointer hover:bg-button/80 select-none"
              centered={false}
              isFirstColumn={true}
            >
              <div
                className="flex items-center gap-1"
                onClick={() => onSort?.("collector")}
              >
                COLLECTOR
                {sortField === "collector" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer hover:bg-button/80 select-none"
              centered={false}
            >
              <div
                className="flex items-center gap-1"
                onClick={() => onSort?.("location")}
              >
                LOCATION
                {sortField === "location" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer hover:bg-button/80 select-none"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.("gross")}
              >
                GROSS
                {sortField === "gross" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer hover:bg-button/80 select-none"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.("machines")}
              >
                MACHINES
                {sortField === "machines" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer hover:bg-button/80 select-none"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.("collected")}
              >
                COLLECTED
                {sortField === "collected" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead className="text-white font-semibold" centered={true}>
              UNCOLLECTED
            </TableHead>
            <TableHead className="text-white font-semibold" centered={true}>
              VARIATION
            </TableHead>
            <TableHead className="text-white font-semibold" centered={true}>
              BALANCE
            </TableHead>
            <TableHead className="text-white font-semibold" centered={true}>
              LOCATION REVENUE
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer hover:bg-button/80 select-none"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.("time")}
              >
                TIME
                {sortField === "time" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead className="text-white font-semibold" centered={true}>
              DETAILS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row, index) => {
            const hasIssues =
              isAdminUser && reportIssues?.[row.locationReportId]?.hasIssues;
            const issueCount =
              reportIssues?.[row.locationReportId]?.issueCount || 0;

            return (
              <TableRow
                key={`${row?.collector || "unknown"}-${
                  row?.location || "unknown"
                }-${row?.time || "unknown"}-${index}`}
                className={`hover:bg-lighterGreenHighlight ${
                  hasIssues ? "bg-yellow-50 border-l-4 border-l-yellow-500" : ""
                }`}
              >
                <TableCell
                  className="font-medium"
                  centered={false}
                  isFirstColumn={true}
                >
                  <div className="flex items-center gap-2">
                    {hasIssues && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {row?.collector || "-"}
                  </div>
                </TableCell>
                <TableCell centered={false}>{row?.location || "-"}</TableCell>
                <TableCell centered={true}>{row?.gross || 0}</TableCell>
                <TableCell centered={true}>{row?.machines || "0/0"}</TableCell>
                <TableCell centered={true}>{row?.collected || 0}</TableCell>
                <TableCell centered={true}>{row?.uncollected || "-"}</TableCell>
                <TableCell centered={true}>
                  {row?.variation || "No Variance"}
                </TableCell>
                <TableCell centered={true}>{row?.balance || 0}</TableCell>
                <TableCell centered={true}>
                  {row?.locationRevenue || 0}
                </TableCell>
                <TableCell centered={true}>{row?.time || "-"}</TableCell>
                <TableCell centered={true}>
                  <div className="flex items-center gap-2">
                    {hasIssues && (
                      <Badge variant="destructive" className="text-xs">
                        {issueCount} issue{issueCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-buttonActive hover:bg-buttonActive/10 hover:text-white group"
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
                        className="h-4 w-4 group-hover:brightness-0 group-hover:invert"
                        width={16}
                        height={16}
                      />
                    </Button>
                    {canEditDelete && (
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
                            onClick={() =>
                              onDelete(row?.locationReportId || "")
                            }
                            aria-label="Delete Report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
