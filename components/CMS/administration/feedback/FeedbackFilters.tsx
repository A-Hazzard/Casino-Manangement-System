/**
 * Feedback Filters Component
 */

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import { RefreshCw, Search } from 'lucide-react';
import { CATEGORY_LABELS } from './FeedbackTypes';

type FeedbackFiltersProps = {
  emailFilter: string;
  setEmailFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  loading: boolean;
  onRefresh: () => void;
  setCurrentPage: (page: number) => void;
};

export default function FeedbackFilters({
  emailFilter,
  setEmailFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  loading,
  onRefresh,
  setCurrentPage,
}: FeedbackFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-end">
      <div className="flex-1">
        <Label htmlFor="email-search" className="mb-2 block text-sm font-medium">
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
              setCurrentPage(0);
            }}
            className="pl-10"
          />
        </div>
      </div>

      <div className="md:w-48">
        <Label htmlFor="category-filter" className="mb-2 block text-sm font-medium">
          Category
        </Label>
        <Select
          value={categoryFilter}
          onValueChange={value => {
            setCategoryFilter(value);
            setCurrentPage(0);
          }}
        >
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-48">
        <Label htmlFor="status-filter" className="mb-2 block text-sm font-medium">
          Status
        </Label>
        <Select
          value={statusFilter}
          onValueChange={value => {
            setStatusFilter(value);
            setCurrentPage(0);
          }}
        >
          <SelectTrigger id="status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onRefresh}
        variant="outline"
        size="icon"
        className="h-10 w-10"
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
