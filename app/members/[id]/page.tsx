'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { CasinoMember as Member } from '@/shared/types/entities';
import PageLayout from '@/components/layout/PageLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import NotFoundError from '@/components/ui/errors/NotFoundError';

import PlayerHeader from '@/components/members/PlayerHeader';
import PlayerTotalsCard from '@/components/members/PlayerTotalsCard';
import PlayerSessionTable from '@/components/members/PlayerSessionTable';
import PlayerHeaderSkeleton from '@/components/members/PlayerHeaderSkeleton';
import PlayerTotalsCardSkeleton from '@/components/members/PlayerTotalsCardSkeleton';
import PlayerSessionTableSkeleton from '@/components/members/PlayerSessionTableSkeleton';
import FilterControlsSkeleton from '@/components/members/FilterControlsSkeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useDashBoardStore } from '@/lib/store/dashboardStore';

type FilterType = 'session' | 'day' | 'week' | 'month';
type SortOption =
  | 'time'
  | 'sessionLength'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'wonLess'
  | 'points'
  | 'gamesPlayed'
  | 'gamesWon'
  | 'coinIn'
  | 'coinOut';

function MemberDetailsPageContent() {
  const params = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTotals, setShowTotals] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const [filter, setFilter] = useState<FilterType>('session');
  const [sortOption, setSortOption] = useState<SortOption>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
        setError(err instanceof Error ? err.message : 'An error occurred');
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

  const handleSortToggle = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleColumnSort = (column: SortOption) => {
    if (sortOption === column) {
      handleSortToggle();
    } else {
      setSortOption(column);
      setSortOrder('desc'); // Default to descending for new columns
    }
  };

  // Export functionality
  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      setLoading(true);
      toast.info('Preparing export...');

      // Fetch all session data for export
      const response = await axios.get(
        `/api/members/${memberId}/sessions?filter=${filter}&export=true&limit=10000`
      );

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to export sessions');
      }

      // Convert data to CSV
      if (format === 'csv') {
        const sessions = data.data.sessions;
        if (sessions.length === 0) {
          toast.warning('No session data to export');
          return;
        }

        const headers = [
          'Session ID',
          'Machine ID',
          'Login Time',
          'Session Length',
          'Money In',
          'Money Out',
          'Jackpot',
          'Won/Less',
          'Points',
          'Games Played',
          'Games Won',
          'Coin In',
          'Coin Out',
        ];

        const csvContent = [
          headers.join(','),
          ...sessions.map((session: Record<string, unknown>) =>
            [
              session.sessionId || session._id,
              session.machineId || '-',
              session.machineName || '-',
              session.startTime
                ? new Date(session.startTime as string).toLocaleString()
                : '-',
              session.sessionLength || '-',
              session.moneyIn || 0,
              session.moneyOut || 0,
              session.jackpot || 0,
              ((session.won as number) || 0) - ((session.bet as number) || 0),
              session.points || 0,
              session.gamesPlayed || 0,
              session.gamesWon || 0,
              session.coinIn || 0,
              session.coinOut || 0,
            ].join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `member-${memberId}-sessions-${filter}-${
            new Date().toISOString().split('T')[0]
          }.csv`
        );
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Session data exported successfully!');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Export error:', error);
      }
      toast.error('Failed to export session data. Please try again.');
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
                <ChevronLeft className="mr-2 h-4 w-4" />
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
        <NotFoundError
          title="Member Not Found"
          message={
            error || `The member with ID "${params.id}" could not be found.`
          }
          resourceType="member"
          showRetry={false}
          customBackText="Back to Members"
          customBackHref="/members"
        />
      );
    }

    const totalPages = member.pagination?.totalPages || 1;
    const currentSessions = member.sessions || [];

    return (
      <div className="space-y-6">
        {/* Navigation Section: Back button to return to members list */}
        <div className="mb-4">
          <Link href="/members">
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Members
            </Button>
          </Link>
        </div>

        {/* Member Header Section: Member information and details */}
        <PlayerHeader member={member} />

        {/* Member Totals Section: Financial summary and toggle controls */}
        <PlayerTotalsCard
          member={member}
          showTotals={showTotals}
          handleToggleTotals={handleToggleTotals}
        />

        {/* Filter Controls and Export Section: View filters and export functionality */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <span className="text-sm font-medium text-gray-700">
                View by:
              </span>
              <div className="flex flex-wrap gap-2">
                {(['session', 'day', 'week', 'month'] as FilterType[]).map(
                  filterOption => (
                    <Button
                      key={filterOption}
                      variant={filter === filterOption ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange(filterOption)}
                      className="text-xs capitalize sm:text-sm"
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
                onClick={() => handleExport('csv')}
                disabled={loading || !member}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Sessions Table Section: Member session data with pagination and sorting */}
        <PlayerSessionTable
          sessions={currentSessions}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={handleColumnSort}
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
        <div className="mt-8 w-full">{renderContent()}</div>
      </PageLayout>
    </>
  );
}

export default function MemberDetailsPage() {
  return (
    <ProtectedRoute requiredPage="member-details">
      <MemberDetailsPageContent />
    </ProtectedRoute>
  );
}
