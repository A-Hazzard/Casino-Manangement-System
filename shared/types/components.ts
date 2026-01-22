// Generic component prop types for reusable UI components
/**
 * Generic data table props for reusable table components
 */
export type DataTableProps<T> = {
  data: T[];
  loading: boolean;
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  sortOption: string;
  sortOrder: 'asc' | 'desc';
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  limit?: number;
  // Common table functionality
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  formatCurrency?: (amount: number) => string;
  formatDate?: (date: string | Date) => string;
  formatNumber?: (number: number) => string;
};

