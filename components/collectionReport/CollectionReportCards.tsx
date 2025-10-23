import React from "react";
import Image from "next/image";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import { useRouter } from "next/navigation";
import { Edit3, Trash2, AlertTriangle } from "lucide-react";
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat";
import { useUserStore } from "@/lib/store/userStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasAdminAccess, hasManagerAccess } from "@/lib/utils/permissions";

// Import SVG icons for pre-rendering
import detailsIcon from "@/public/details.svg";

type ExtendedCollectionReportCardsProps = {
  data: CollectionReportRow[];
  gridLayout?: boolean; // New prop to control grid vs single column layout
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
};

export default function CollectionReportCards({
  data,
  gridLayout = false,
  reportIssues,
  onEdit,
  onDelete,
}: ExtendedCollectionReportCardsProps) {
  const router = useRouter();
  const {
    formatAmount: _formatAmount,
    shouldShowCurrency: _shouldShowCurrency,
  } = useCurrencyFormat();
  const user = useUserStore((state) => state.user);

  // Check if user has admin access to see issue highlights
  const isAdminUser = user?.roles ? hasAdminAccess(user.roles) : false;

  // Check if user can edit/delete reports (admin, evo admin, or manager)
  const canEditDelete = user?.roles ? hasManagerAccess(user.roles) : false;
  return (
    <div
      className={`flex flex-col mt-4 px-2 md:px-4 gap-4 w-full min-w-0 ${
        gridLayout ? "lg:hidden" : "md:hidden"
      }`}
    >
      <div
        className={`${
          gridLayout ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"
        }`}
      >
        {data?.map((row, index) => {
          const hasIssues =
            isAdminUser && reportIssues?.[row.locationReportId]?.hasIssues;
          const issueCount =
            reportIssues?.[row.locationReportId]?.issueCount || 0;

          return (
            <div
              key={`${row?.collector || "unknown"}-${
                row?.location || "unknown"
              }-${row?.time || "unknown"}-${index}`}
              className={`card-item bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden mb-4 transform hover:scale-[1.02] animate-in fade-in-0 slide-in-from-bottom-2 ${
                hasIssues ? "border-l-4 border-l-yellow-500 bg-yellow-50" : ""
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: "both",
              }}
            >
              <div
                className={`px-4 py-3 font-semibold text-md rounded-t-lg ${
                  hasIssues ? "bg-yellow-600" : "bg-lighterBlueHighlight"
                } text-white`}
              >
                <div className="flex items-center justify-between">
                  <span>Collector: {row?.collector || "-"}</span>
                  {hasIssues && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-yellow-100 text-yellow-800"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1 inline" />
                      {issueCount} issue{issueCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3 bg-white">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Location
                  </span>
                  <span className="font-semibold text-sm text-right">
                    {row?.location || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Gross
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.gross || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Machines
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.machines || "0/0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Collected
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.collected || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Uncollected
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.uncollected || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Variation
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.variation || "No Variance"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Balance
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.balance || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Location Revenue
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.locationRevenue !== undefined &&
                    row?.locationRevenue !== null
                      ? row.locationRevenue
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium text-sm">
                    Time
                  </span>
                  <span className="font-semibold text-sm">
                    {row?.time || "-"}
                  </span>
                </div>
                <div className="flex flex-col md:flex-row justify-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    className="border-button text-button hover:bg-button hover:text-white w-full md:w-auto flex items-center justify-center gap-2 group"
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
                    <span className="hidden md:inline">VIEW DETAILS</span>
                  </Button>
                  {canEditDelete && (
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                      {onEdit && (
                        <Button
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white w-full md:w-auto flex items-center justify-center gap-2"
                          onClick={() => onEdit(row?.locationReportId || "")}
                          aria-label="Edit Report"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="hidden md:inline">EDIT</span>
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white w-full md:w-auto flex items-center justify-center gap-2"
                          onClick={() => onDelete(row?.locationReportId || "")}
                          aria-label="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden md:inline">DELETE</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
