'use client';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import { useMembersHandlers } from '@/components/members/context/MembersHandlersContext';
import MemberDetailsModal from '@/components/members/MemberDetailsModal';
import { Button } from '@/components/ui/button';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useDebounce } from '@/lib/utils/hooks';
import { formatPhoneNumber } from '@/lib/utils/phoneFormatter';
import type {
  Location,
  MemberSummary,
  SummaryStats,
} from '@/shared/types/entities';
import type { PaginationInfo } from '@/shared/types/reports';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function MembersSummaryTab() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [usingBackendSearch, setUsingBackendSearch] = useState(false);
  const [allLoadedMembers, setAllLoadedMembers] = useState<MemberSummary[]>([]);
  const { activeMetricsFilter, customDateRange } = useDashBoardStore();
  const {
    setOnRefresh,
    setOnNewMember,
    setRefreshing: setRefreshingContext,
  } = useMembersHandlers();

  // Fetch locations for the filter dropdown (membership-enabled only)
  const fetchLocations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('membershipOnly', 'true');

      const response = await axios.get(
        `/api/machines/locations?${params.toString()}`
      );
      const data = response.data;
      if (data.locations && Array.isArray(data.locations)) {
        setLocations(data.locations);
      } else {
        console.error('Failed to fetch locations:', data);
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fetchMembersSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      // Add search term (use debounced value)
      if (debouncedSearchTerm && usingBackendSearch) {
        params.append('search', debouncedSearchTerm);
      }

      // Add location filter
      if (locationFilter && locationFilter !== 'all') {
        params.append('location', locationFilter);
      }

      // Add date filtering
      // For Summary Report, we want to show members based on when they last logged in
      // Default to 'all' if no filter is set, or if filter is 'Today' (which doesn't make sense for lastLogin)
      let dateFilter = 'all';
      if (
        activeMetricsFilter === 'Custom' &&
        customDateRange?.startDate &&
        customDateRange?.endDate
      ) {
        dateFilter = 'custom';
        const sd =
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate as string);
        const ed =
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate as string);
        params.append('startDate', sd.toISOString());
        params.append('endDate', ed.toISOString());
      } else if (activeMetricsFilter && activeMetricsFilter !== 'Today') {
        // Map frontend values to backend expected values
        const dateFilterMap: Record<string, string> = {
          Yesterday: 'yesterday',
          '7d': 'week',
          '30d': 'month',
          'All Time': 'all',
        };
        dateFilter =
          dateFilterMap[activeMetricsFilter] ||
          activeMetricsFilter.toLowerCase();
      }
      // If Today is selected, default to 'all' since "today" for lastLogin doesn't make sense
      if (activeMetricsFilter === 'Today') {
        dateFilter = 'all';
      }
      params.append('dateFilter', dateFilter);
      // filterBy=lastLogin means we're filtering members by when they last logged in
      // This is useful for seeing which members were active during a specific time period
      params.append('filterBy', 'lastLogin');
      // Licensee filtering removed - show all members regardless of licensee

      const response = await axios.get(`/api/members/summary?${params}`);
      const data = response.data;

      // Debug: Log the response to verify structure
      if (process.env.NODE_ENV === 'development') {
        console.log('[MembersSummaryTab] API Response:', {
          summary: data.data?.summary,
          totalLocations: data.data?.summary?.totalLocations,
          totalMembers: data.data?.summary?.totalMembers,
          membersCount: data.data?.members?.length || 0,
          members: data.data?.members,
          dateFilter,
          filterBy: 'lastLogin',
          pagination: data.data?.pagination,
        });
      }

      const fetchedMembers = data.data.members || [];
      setMembers(fetchedMembers);
      setAllLoadedMembers(fetchedMembers);
      setSummaryStats(data.data.summary);
      setPagination(data.data.pagination);
    } catch (err) {
      console.error('❌ Members Summary Page Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to fetch members summary');
    } finally {
      setLoading(false);
    }
  }, [
    activeMetricsFilter,
    customDateRange,
    debouncedSearchTerm,
    locationFilter,
    currentPage,
    usingBackendSearch,
  ]);

  useEffect(() => {
    fetchMembersSummary();
  }, [fetchMembersSummary]);

  const handleRefresh = useCallback(async () => {
    setRefreshingContext(true);
    setCurrentPage(1);
    await fetchMembersSummary();
    setRefreshingContext(false);
  }, [fetchMembersSummary, setRefreshingContext]);

  // Register refresh handler with context
  useEffect(() => {
    setOnRefresh(handleRefresh);
    // Register handler to navigate to Members List tab with newMember parameter
    const newMemberHandler = () => {
      router.push('/members?tab=members&newMember=true');
    };
    setOnNewMember(newMemberHandler);
    return () => {
      setOnRefresh(undefined);
      setOnNewMember(undefined);
    };
  }, [handleRefresh, setOnRefresh, setOnNewMember, router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    locationFilter,
    activeMetricsFilter,
    customDateRange,
  ]);

  // Frontend search - search through loaded members first
  useEffect(() => {
    if (!debouncedSearchTerm || !debouncedSearchTerm.trim()) {
      setUsingBackendSearch(false);
      setMembers(allLoadedMembers);
      return;
    }

    // Try frontend search first
    const lowerSearchValue = debouncedSearchTerm.toLowerCase().trim();
    const frontendResults = allLoadedMembers.filter(member => {
      const fullName = (member.fullName || '').toLowerCase();
      const phoneNumber = (member.phoneNumber || '').toLowerCase();
      const address = (member.address || '').toLowerCase();
      const locationName = (member.locationName || '').toLowerCase();
      const memberId = String(member._id || '').toLowerCase();

      return (
        fullName.includes(lowerSearchValue) ||
        phoneNumber.includes(lowerSearchValue) ||
        address.includes(lowerSearchValue) ||
        locationName.includes(lowerSearchValue) ||
        memberId.includes(lowerSearchValue)
      );
    });

    if (frontendResults.length > 0) {
      setUsingBackendSearch(false);
      setMembers(frontendResults);
    } else {
      // No frontend results, trigger backend search
      setUsingBackendSearch(true);
    }
  }, [debouncedSearchTerm, allLoadedMembers]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleLocationFilter = (value: string) => {
    setLocationFilter(value);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewMember = (member: MemberSummary) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleViewSessions = (memberId: string) => {
    router.push(`/members/${memberId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    if (pagination && pagination.totalPages) {
      setCurrentPage(Number(pagination.totalPages) || 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.totalPages) {
      const totalPagesNum = Number(pagination.totalPages) || 1;
      if (currentPage < totalPagesNum) {
        setCurrentPage(currentPage + 1);
      }
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1:
            return 'st';
          case 2:
            return 'nd';
          case 3:
            return 'rd';
          default:
            return 'th';
        }
      };

      return `${month} ${day}${getOrdinalSuffix(day)} ${year}`;
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1:
            return 'st';
          case 2:
            return 'nd';
          case 3:
            return 'rd';
          default:
            return 'th';
        }
      };

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const timeString = `${displayHours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')} ${ampm}`;
      return `${month} ${day}${getOrdinalSuffix(day)} ${year}, ${timeString}`;
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (sortedMembers.length === 0) {
      toast.error('No data to export');
      return;
    }

    if (format === 'csv') {
      exportToCSV();
    } else {
      await exportToPDF();
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Full Name',
      'Address',
      'Phone',
      'Last Login',
      'Joined',
      'Location',
      'Win/Loss',
    ];
    const csvData = sortedMembers.map(member => [
      member.fullName,
      member.address || '-',
      formatPhoneNumber(member.phoneNumber),
      formatDateTime(member.lastLogin),
      formatDate(member.createdAt),
      member.locationName,
      formatCurrency(member.winLoss || 0),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `members-summary-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Members data exported successfully');
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();

      // Add logo at the top (centered)
      try {
        const logoResponse = await fetch('/Evolution_one_Solutions_logo.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoBase64, 'PNG', 75, 6, 60, 0);
        }
      } catch {
        doc.setFontSize(10);
        doc.text('Evolution One Solutions', 14, 16);
      }

      // Title
      doc.setFontSize(16);
      doc.text('Members Summary Report', 14, 32);

      // Metadata section
      let yPosition = 40;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);

      if (summaryStats) {
        doc.text(`Total Members: ${summaryStats.totalMembers}`, 14, yPosition);
        yPosition += 6;
        doc.text(
          `Total Locations: ${summaryStats.totalLocations}`,
          14,
          yPosition
        );
        yPosition += 6;
        doc.text(
          `Active Members: ${summaryStats.activeMembers}`,
          14,
          yPosition
        );
        yPosition += 6;
      }

      const dateRangeText =
        activeMetricsFilter === 'Custom' &&
        customDateRange?.startDate &&
        customDateRange?.endDate
          ? `${formatDate(customDateRange.startDate.toString())} - ${formatDate(customDateRange.endDate.toString())}`
          : activeMetricsFilter || 'All Time';
      doc.text(`Date Range: ${dateRangeText}`, 14, yPosition);
      yPosition += 6;

      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
      yPosition += 10;

      // Summary table
      if (summaryStats) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Metric', 'Value']],
          body: [
            ['Total Members', summaryStats.totalMembers.toString()],
            ['Total Locations', summaryStats.totalLocations.toString()],
            ['Active Members', summaryStats.activeMembers.toString()],
          ],
          headStyles: {
            fillColor: [81, 25, 233],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          styles: { fontSize: 10 },
        });
        yPosition =
          (doc as unknown as { lastAutoTable?: { finalY?: number } })
            .lastAutoTable?.finalY || yPosition + 20;
      }

      // Members table
      const tableData = sortedMembers.map(member => [
        member.fullName,
        member.address || '-',
        formatPhoneNumber(member.phoneNumber),
        formatDateTime(member.lastLogin),
        formatDate(member.createdAt),
        member.locationName,
        formatCurrency(member.winLoss || 0),
      ]);

      autoTable(doc, {
        startY: yPosition + 5,
        head: [
          [
            'Full Name',
            'Address',
            'Phone',
            'Last Login',
            'Joined',
            'Location',
            'Win/Loss',
          ],
        ],
        body: tableData,
        headStyles: {
          fillColor: [81, 25, 233],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 20, halign: 'right' },
        },
        margin: { left: 10, right: 10 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`members_summary_${dateStr}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Filter by location if needed (frontend filtering)
  const filteredMembers = useMemo(() => {
    if (locationFilter === 'all') {
      return members;
    }
    return members.filter(member => {
      return (
        member.locationName === locationFilter || member._id === locationFilter
      );
    });
  }, [members, locationFilter]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      const aValue: unknown = a[sortBy as keyof MemberSummary];
      const bValue: unknown = b[sortBy as keyof MemberSummary];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredMembers, sortBy, sortOrder]);

  const renderPagination = () => {
    if (
      !pagination ||
      !Number(pagination.totalPages) ||
      Number(pagination.totalPages) <= 1
    )
      return null;

    const totalPagesNum = Number(pagination.totalPages) || 1;
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPagesNum, currentPage + 2);

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col space-y-2 sm:hidden">
          <div className="text-center text-xs text-gray-600">
            Page {currentPage} of {totalPagesNum}
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              ««
            </Button>
            <Button
              onClick={handlePrevPage}
              disabled={!pagination?.hasPrev}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              ‹
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">Page</span>
              <input
                type="number"
                min={1}
                max={totalPagesNum}
                value={currentPage}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > totalPagesNum) val = totalPagesNum;
                  setCurrentPage(val);
                }}
                className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-xs text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                aria-label="Page number"
              />
              <span className="text-xs text-gray-600">of {totalPagesNum}</span>
            </div>
            <Button
              onClick={handleNextPage}
              disabled={!pagination?.hasNext}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              ›
            </Button>
            <Button
              onClick={handleLastPage}
              disabled={currentPage === totalPagesNum}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              »»
            </Button>
          </div>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {pagination
                  ? (currentPage - 1) * (Number(pagination.limit) || 10) + 1
                  : 0}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {pagination
                  ? Math.min(
                      currentPage * (Number(pagination.limit) || 10),
                      Number(pagination.total) || 0
                    )
                  : 0}
              </span>{' '}
              of{' '}
              <span className="font-medium">
                {pagination ? Number(pagination.total) || 0 : 0}
              </span>{' '}
              results
            </p>
          </div>
          <div>
            <nav
              className="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <Button
                onClick={handleFirstPage}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={handlePrevPage}
                disabled={!pagination?.hasPrev}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page Input for Quick Navigation */}
              <div className="relative inline-flex items-center border border-gray-300 bg-white px-2 py-2 text-sm font-medium">
                <span className="mr-1 text-xs text-gray-600">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPagesNum}
                  value={currentPage}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > totalPagesNum) val = totalPagesNum;
                    setCurrentPage(val);
                  }}
                  className="w-12 border-0 bg-transparent px-1 py-0 text-center text-xs text-gray-700 focus:border-0 focus:ring-0"
                  aria-label="Page number"
                />
                <span className="ml-1 text-xs text-gray-600">
                  of {totalPagesNum}
                </span>
              </div>

              {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                const pageNum = startPage + i;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant={pageNum === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="relative inline-flex items-center border px-4 py-2 text-sm font-medium"
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                onClick={handleNextPage}
                disabled={!pagination?.hasNext}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleLastPage}
                disabled={currentPage === totalPagesNum}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryCards = () => {
    if (!summaryStats) return null;

    return (
      <div
        className={`mb-6 grid grid-cols-1 gap-4 ${
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
            ? 'md:grid-cols-3'
            : 'md:grid-cols-2'
        }`}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryStats.totalMembers}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center">
            <div className="rounded-lg bg-green-100 p-2">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Locations</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryStats.totalLocations}
              </p>
            </div>
          </div>
        </div>

        {typeof window !== 'undefined' &&
          window.location.hostname === 'localhost' && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Members
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summaryStats.activeMembers}
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  };

  const renderMembersTable = () => {
    if (loading) {
      return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-gray-200 p-4">
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="h-3 w-1/2 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Always show the table, even if no members (show empty table instead of "No members found")
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-button text-white">
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('fullName')}
                >
                  Full Name
                  {sortBy === 'fullName' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('address')}
                >
                  Address
                  {sortBy === 'address' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('phoneNumber')}
                >
                  Phone
                  {sortBy === 'phoneNumber' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('lastLogin')}
                >
                  Last Login
                  {sortBy === 'lastLogin' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('createdAt')}
                >
                  Joined
                  {sortBy === 'createdAt' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('locationName')}
                >
                  Location
                  {sortBy === 'locationName' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th
                  className="cursor-pointer border border-border p-3 text-sm hover:bg-buttonActive"
                  onClick={() => handleSort('winLoss')}
                >
                  Win/Loss
                  {sortBy === 'winLoss' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="border border-border p-3 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-border p-8 text-center text-gray-500"
                  >
                    No members found
                  </td>
                </tr>
              ) : (
                sortedMembers.map(member => (
                  <tr key={member._id} className="text-center hover:bg-muted">
                    <td className="border border-border p-3">
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {member.fullName}
                        </div>
                      </div>
                    </td>
                    <td className="border border-border p-3 text-left">
                      {member.address || '-'}
                    </td>
                    <td className="border border-border p-3">
                      {formatPhoneNumber(member.phoneNumber)}
                    </td>
                    <td className="border border-border p-3">
                      {formatDateTime(member.lastLogin)}
                    </td>
                    <td className="border border-border p-3">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="border border-border p-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (member.gamingLocation) {
                            router.push(`/locations/${member.gamingLocation}`);
                          }
                        }}
                        className="inline-flex max-w-[200px] items-center gap-1.5 truncate text-left text-sm font-medium text-blue-600 underline decoration-dotted hover:text-blue-800"
                        title={member.locationName}
                        disabled={!member.gamingLocation}
                      >
                        {member.locationName || 'Unknown Location'}
                        {member.gamingLocation && (
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        )}
                      </button>
                    </td>
                    <td className="border border-border p-3">
                      <div
                        className={`font-medium ${
                          (member.winLoss || 0) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(member.winLoss || 0)}
                      </div>
                    </td>
                    <td className="border border-border p-3">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMember(member)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSessions(member._id)}
                          className="flex items-center gap-1"
                        >
                          <Activity className="h-3 w-3" />
                          View Sessions
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderMembersCards = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
              <div className="h-3 w-1/2 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      );
    }

    // Always show the list, even if no members (show empty list instead of "No members found")
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {sortedMembers.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500">No members found</p>
            </div>
          ) : (
            sortedMembers.map(member => (
              <div
                key={member._id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-gray-900">
                      {member.fullName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (member.gamingLocation) {
                          router.push(`/locations/${member.gamingLocation}`);
                        }
                      }}
                      className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-blue-600 hover:underline"
                      title={member.locationName}
                      disabled={!member.gamingLocation}
                    >
                      <span className="truncate">
                        {member.locationName || 'Unknown Location'}
                      </span>
                      {member.gamingLocation && (
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                      )}
                    </button>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`text-xs font-medium ${(member.winLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(member.winLoss || 0)}
                    </span>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">Phone</span>
                    <span className="truncate text-xs font-medium">
                      {formatPhoneNumber(member.phoneNumber)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">Last Login</span>
                    <span className="truncate text-xs font-medium">
                      {formatDateTime(member.lastLogin)}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">Address</span>
                    <span className="truncate text-xs font-medium">
                      {member.address || '-'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMember(member)}
                    className="flex h-9 items-center justify-center gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Details</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewSessions(member._id)}
                    className="flex h-9 items-center justify-center gap-1.5 text-xs"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Sessions</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {renderPagination()}
      </div>
    );
  };

  return (
    <motion.div
      className="w-full pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      {/* Date Filters */}
      <div className="mb-6">
        <DashboardDateFilters hideAllTime={false} />
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Search and Filter Controls */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-auto">
              <LocationSingleSelect
                locations={locations.map(loc => ({
                  id: loc._id,
                  name: loc.name || loc.locationName || '',
                }))}
                selectedLocation={locationFilter}
                onSelectionChange={handleLocationFilter}
                includeAllOption={true}
                allOptionLabel="All Locations"
                showSasBadge={false}
                showFilterIcon={true}
                className="w-full sm:w-48"
              />
            </div>
            <div className="flex flex-1 gap-2 sm:flex-none">
              <Button
                onClick={() => {
                  setCurrentPage(1);
                  fetchMembersSummary();
                }}
                variant="outline"
                className="flex-1 items-center gap-2 sm:flex-none"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={sortedMembers.length === 0}
                    className="flex-1 items-center gap-2 sm:flex-none"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleExport('pdf')}
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('csv')}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Desktop: Table view */}
      <div className="hidden lg:block">{renderMembersTable()}</div>

      {/* Mobile: Card view */}
      <div className="block lg:hidden">{renderMembersCards()}</div>

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMember(null);
        }}
        member={
          selectedMember
            ? {
                ...selectedMember,
                gamingLocation: selectedMember._id,
                address: selectedMember.address || '',
              }
            : null
        }
      />
    </motion.div>
  );
}
