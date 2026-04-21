/**
 * Feedback Filters Component
 */

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
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
    <div className="mt-6 rounded-t-lg bg-buttonActive p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Search input */}
        <div className="flex h-11 min-w-0 flex-1 rounded-md bg-white shadow-sm">
          <div className="relative flex flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="email-search"
              type="text"
              placeholder="Search by email..."
              value={emailFilter}
              onChange={e => {
                setEmailFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="h-11 flex-1 rounded-md border-none pl-9 text-sm shadow-none outline-none focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Selects — horizontal on mobile */}
        <div className="flex flex-row gap-2 md:gap-4">
          <div className="flex-1 md:flex-none">
            <Select
              value={categoryFilter}
              onValueChange={value => {
                setCategoryFilter(value);
                setCurrentPage(0);
              }}
            >
              <SelectTrigger id="category-filter" className="h-11 w-full min-w-[130px] rounded-md bg-white shadow-sm md:min-w-[150px]">
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

          <div className="flex-1 md:flex-none">
            <Select
              value={statusFilter}
              onValueChange={value => {
                setStatusFilter(value);
                setCurrentPage(0);
              }}
            >
              <SelectTrigger id="status-filter" className="h-11 w-full min-w-[130px] rounded-md bg-white shadow-sm md:min-w-[150px]">
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
            className="h-11 w-11 shrink-0 bg-white shadow-sm hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
