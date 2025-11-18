'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Eye, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type Feedback = {
  _id: string;
  email: string;
  category:
    | 'bug'
    | 'suggestion'
    | 'general-review'
    | 'feature-request'
    | 'performance'
    | 'ui-ux'
    | 'other';
  description: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'archived';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FeedbackResponse = {
  success: boolean;
  data: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug Report',
  suggestion: '💡 Suggestion',
  'general-review': '⭐ General Review',
  'feature-request': '✨ Feature Request',
  performance: '⚡ Performance',
  'ui-ux': '🎨 UI/UX',
  other: '📝 Other',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function FeedbackManagement() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (emailFilter) params.append('email', emailFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '50');

      const response = await fetch(`/api/feedback?${params.toString()}`);
      const data: FeedbackResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          (data as { error?: string }).error || 'Failed to fetch feedback'
        );
      }

      setFeedback(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to fetch feedback. Please try again.'
      );
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [page, emailFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleViewDetails = (item: Feedback) => {
    setSelectedFeedback(item);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFeedback(null);
  };

  const handleRefresh = () => {
    fetchFeedback();
    toast.success('Feedback list refreshed');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <Label
            htmlFor="email-search"
            className="mb-2 block text-sm font-medium"
          >
            Search by Email
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="email-search"
              type="text"
              placeholder="Enter email address..."
              value={emailFilter}
              onChange={e => {
                setEmailFilter(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        <div className="md:w-48">
          <Label
            htmlFor="category-filter"
            className="mb-2 block text-sm font-medium"
          >
            Category
          </Label>
          <Select
            value={categoryFilter}
            onValueChange={value => {
              setCategoryFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:w-48">
          <Label
            htmlFor="status-filter"
            className="mb-2 block text-sm font-medium"
          >
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleRefresh}
          variant="outline"
          size="icon"
          className="h-10 w-10"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Total Feedback
          </div>
          <div className="mt-1 text-2xl font-bold">{total}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">
            {feedback.filter(f => f.status === 'pending').length}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Reviewed</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {feedback.filter(f => f.status === 'reviewed').length}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Resolved</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {feedback.filter(f => f.status === 'resolved').length}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-600">Loading feedback...</p>
          </div>
        </div>
      ) : feedback.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-900">
            No feedback found
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {emailFilter || categoryFilter || statusFilter
              ? 'Try adjusting your filters'
              : 'No feedback has been submitted yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map(item => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[item.status] || ''}
                      >
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.submittedAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Details
            </DialogTitle>
            <DialogDescription>
              View complete feedback information
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Email
                  </Label>
                  <p className="mt-1 text-sm">{selectedFeedback.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Category
                  </Label>
                  <p className="mt-1">
                    <Badge variant="outline">
                      {CATEGORY_LABELS[selectedFeedback.category] ||
                        selectedFeedback.category}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <p className="mt-1">
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[selectedFeedback.status] || ''}
                    >
                      {selectedFeedback.status.charAt(0).toUpperCase() +
                        selectedFeedback.status.slice(1)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Submitted At
                  </Label>
                  <p className="mt-1 text-sm">
                    {format(
                      new Date(selectedFeedback.submittedAt),
                      'MMM dd, yyyy HH:mm:ss'
                    )}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <div className="mt-2 rounded-md border bg-gray-50 p-3">
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedFeedback.description}
                  </p>
                </div>
              </div>
              {selectedFeedback.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Notes
                  </Label>
                  <div className="mt-2 rounded-md border bg-blue-50 p-3">
                    <p className="whitespace-pre-wrap text-sm">
                      {selectedFeedback.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
