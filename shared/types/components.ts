// Generic component prop types for reusable UI components

import type {
  GamingMachine,
  CasinoMember,
  Location,
  User,
  MovementRequest,
} from './entities';

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

/**
 * Generic data card props for reusable card components
 */
export type DataCardProps<T> = {
  data: T;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onView?: (item: T) => void;
  formatCurrency?: (amount: number) => string;
  formatDate?: (date: string | Date) => string;
  formatNumber?: (number: number) => string;
  // Common card functionality
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
};

/**
 * Generic modal props for reusable modal components
 */
export type ModalProps<T> = {
  isOpen: boolean;
  onClose: () => void;
  data?: T;
  mode: 'view' | 'edit' | 'create' | 'delete';
  title: string;
  onSubmit?: (data: T) => void;
  onConfirm?: () => void;
  loading?: boolean;
  error?: string;
  children?: React.ReactNode;
};

/**
 * Generic form props for reusable form components
 */
export type FormProps<T> = {
  data?: T;
  onSubmit: (data: T) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
  mode: 'create' | 'edit';
  validationSchema?: unknown; // Zod schema
  submitText?: string;
  cancelText?: string;
};

/**
 * Generic filter props for reusable filter components
 */
export type FilterProps<T> = {
  filters: T;
  onFilterChange: (filters: T) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  loading?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
};

/**
 * Generic search props for reusable search components
 */
export type SearchProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: (term: string) => void;
  placeholder?: string;
  loading?: boolean;
  debounceMs?: number;
  showClear?: boolean;
  onClear?: () => void;
};

/**
 * Generic pagination props for reusable pagination components
 */
export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showLimitSelector?: boolean;
  showInfo?: boolean;
  loading?: boolean;
};

/**
 * Generic skeleton props for reusable skeleton components
 */
export type SkeletonProps = {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
};

/**
 * Generic loading props for reusable loading components
 */
export type LoadingProps = {
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
  retryText?: string;
};

/**
 * Generic empty state props for reusable empty state components
 */
export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact' | 'detailed';
};

/**
 * Generic error boundary props
 */
export type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

/**
 * Generic navigation props for reusable navigation components
 */
export type NavigationProps = {
  items: Array<{
    id: string;
    label: string;
    href?: string;
    icon?: React.ReactNode;
    badge?: string | number;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }>;
  variant?: 'horizontal' | 'vertical' | 'tabs';
  onItemClick?: (item: { id: string; label: string }) => void;
};

/**
 * Generic tab props for reusable tab components
 */
export type TabProps = {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: string | number;
    disabled?: boolean;
    content: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
};

/**
 * Generic breadcrumb props for reusable breadcrumb components
 */
export type BreadcrumbProps = {
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    active?: boolean;
  }>;
  separator?: React.ReactNode;
  maxItems?: number;
  onItemClick?: (item: { label: string; href?: string }) => void;
};

/**
 * Generic dropdown props for reusable dropdown components
 */
export type DropdownProps<T> = {
  items: Array<{
    id: string;
    label: string;
    value: T;
    icon?: React.ReactNode;
    disabled?: boolean;
    divider?: boolean;
  }>;
  selectedValue?: T;
  onSelect: (value: T, item: { id: string; label: string }) => void;
  placeholder?: string;
  loading?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
};

/**
 * Generic button props for reusable button components
 */
export type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
};

/**
 * Generic input props for reusable input components
 */
export type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onClear?: () => void;
  showClear?: boolean;
};

/**
 * Generic textarea props for reusable textarea components
 */
export type TextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
};

/**
 * Generic select props for reusable select components
 */
export type SelectProps<T> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    label: string;
    value: T;
    disabled?: boolean;
  }>;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  className?: string;
  icon?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
};

/**
 * Generic checkbox props for reusable checkbox components
 */
export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Generic radio props for reusable radio components
 */
export type RadioProps<T> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    label: string;
    value: T;
    disabled?: boolean;
  }>;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
};

/**
 * Generic switch props for reusable switch components
 */
export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/**
 * Generic tooltip props for reusable tooltip components
 */
export type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  disabled?: boolean;
  delay?: number;
  className?: string;
};

/**
 * Generic popover props for reusable popover components
 */
export type PopoverProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  disabled?: boolean;
  className?: string;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
};

/**
 * Generic alert props for reusable alert components
 */
export type AlertProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  dismissible?: boolean;
  children?: React.ReactNode;
};

/**
 * Generic badge props for reusable badge components
 */
export type BadgeProps = {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/**
 * Generic avatar props for reusable avatar components
 */
export type AvatarProps = {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children?: React.ReactNode;
};

/**
 * Generic progress props for reusable progress components
 */
export type ProgressProps = {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
  showValue?: boolean;
  animated?: boolean;
};

/**
 * Generic spinner props for reusable spinner components
 */
export type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
};

// Specific component props for common use cases
export type MachineTableProps = DataTableProps<GamingMachine> & {
  onMachineClick?: (machineId: string) => void;
  showLocation?: boolean;
  showStatus?: boolean;
  showMetrics?: boolean;
};

export type MemberTableProps = DataTableProps<CasinoMember> & {
  onMemberClick?: (memberId: string) => void;
  showLocation?: boolean;
  showStatus?: boolean;
  showWinLoss?: boolean;
};

export type LocationTableProps = DataTableProps<Location> & {
  onLocationClick?: (locationId: string) => void;
  showMetrics?: boolean;
  showStatus?: boolean;
};

export type MovementRequestTableProps = DataTableProps<MovementRequest> & {
  onRequestClick?: (requestId: string) => void;
  showStatus?: boolean;
  showAmount?: boolean;
};

export type UserTableProps = DataTableProps<User> & {
  onUserClick?: (userId: string) => void;
  showRoles?: boolean;
  showStatus?: boolean;
};
