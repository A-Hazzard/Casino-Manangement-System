"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Member } from "@/lib/types/members";
import PageLayout from "@/components/layout/PageLayout";


import PlayerHeader from "@/components/members/PlayerHeader";
import PlayerTotalsCard from "@/components/members/PlayerTotalsCard";
import PlayerSessionTable from "@/components/members/PlayerSessionTable";
import PlayerHeaderSkeleton from "@/components/members/PlayerHeaderSkeleton";
import PlayerTotalsCardSkeleton from "@/components/members/PlayerTotalsCardSkeleton";
import PlayerSessionTableSkeleton from "@/components/members/PlayerSessionTableSkeleton";
import FilterControlsSkeleton from "@/components/members/FilterControlsSkeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { toast } from "sonner";

type FilterType = "session" | "day" | "week" | "month";

export default function MemberDetailsPage() {
  const params = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTotals, setShowTotals] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedLicencee, setSelectedLicencee] = useState("All Licensees");
  const [filter, setFilter] = useState<FilterType>("session");
  const isInitialMount = useRef(true);

  const memberId = params.id as string;

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        setError(null);

        const memberResponse = await axios.get(`/api/members/${memberId}`);
        const memberData: Member = memberResponse.data;

        const sessionsResponse = await axios.get(
          `/api/members/${memberId}/sessions?filter=${filter}&page=${
            currentPage + 1
          }&limit=10`
        );
        const sessionsData = sessionsResponse.data;

        setMember({
          ...memberData,
          sessions: sessionsData.data.sessions,
          pagination: sessionsData.data.pagination,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberData();
    }
  }, [memberId, filter, currentPage]);

  // Separate effect for initial data fetch to prevent double calls
  useEffect(() => {
    if (isInitialMount.current && memberId) {
      isInitialMount.current = false;
      return; // Skip the initial mount since the main effect will handle it
    }
  }, [memberId]);

  const handleToggleTotals = () => {
    setShowTotals(!showTotals);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(0); // Reset to first page when filter changes
  };

  // Export functionality
  const handleExport = async (format: "csv" | "excel" = "csv") => {
    try {
      setLoading(true);
      toast.info("Preparing export...");

      // Fetch all session data for export
      const response = await axios.get(
        `/api/members/${memberId}/sessions?filter=${filter}&export=true&limit=10000`
      );

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || "Failed to export sessions");
      }

      // Convert data to CSV
      if (format === "csv") {
        const sessions = data.data.sessions;
        if (sessions.length === 0) {
          toast.warning("No session data to export");
          return;
        }

        const headers = [
          "Session ID",
          "Machine ID",
          "Login Time",
          "Session Length",
          "Handle",
          "Cancelled Credits",
          "Jackpot",
          "Won/Less",
          "Points",
          "Games Played",
          "Games Won",
          "Coin In",
          "Coin Out",
        ];

        const csvContent = [
          headers.join(","),
          ...sessions.map((session: Record<string, unknown>) =>
            [
              session.sessionId || session._id,
              session.machineId || "-",
              session.machineName || "-",
              session.startTime
                ? new Date(session.startTime as string).toLocaleString()
                : "-",
              session.sessionLength || "-",
              session.handle || 0,
              session.cancelledCredits || 0,
              session.jackpot || 0,
              ((session.won as number) || 0) - ((session.bet as number) || 0),
              session.points || 0,
              session.gamesPlayed || 0,
              session.gamesWon || 0,
              session.coinIn || 0,
              session.coinOut || 0,
            ].join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `member-${memberId}-sessions-${filter}-${
            new Date().toISOString().split("T")[0]
          }.csv`
        );
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Session data exported successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export session data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <div className="mb-6">
            <Link href="/members">
              <Button variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Members
              </Button>
            </Link>
          </div>

          <PlayerHeaderSkeleton />
          <PlayerTotalsCardSkeleton />
          <FilterControlsSkeleton />
          <PlayerSessionTableSkeleton />
        </>
      );
    }

    if (error || !member) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">{error || "Member not found"}</p>
        </div>
      );
    }

    const totalPages = member.pagination?.totalPages || 1;
    const currentSessions = member.sessions || [];

    return (
      <div className="space-y-6">
        <div className="mb-4">
          <Link href="/members">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Members
            </Button>
          </Link>
        </div>

        <PlayerHeader member={member} />

        <PlayerTotalsCard
          member={member}
          showTotals={showTotals}
          handleToggleTotals={handleToggleTotals}
        />

        {/* Filter Controls and Export */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
              <span className="text-sm font-medium text-gray-700">
                View by:
              </span>
              <div className="flex flex-wrap gap-2">
                {(["session", "day", "week", "month"] as FilterType[]).map(
                  (filterOption) => (
                    <Button
                      key={filterOption}
                      variant={filter === filterOption ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange(filterOption)}
                      className="capitalize text-xs sm:text-sm"
                    >
                      {filterOption}
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Export Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleExport("csv")}
                disabled={loading || !member}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <PlayerSessionTable
          sessions={currentSessions}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    );
  };

  return (
    <>

      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        mainClassName="flex flex-col flex-1 px-4 py-6 sm:px-6 lg:px-8 w-full max-w-full"
        showToaster={false}
      >
        <div className="w-full mt-8">{renderContent()}</div>
      </PageLayout>
    </>
  );
}
