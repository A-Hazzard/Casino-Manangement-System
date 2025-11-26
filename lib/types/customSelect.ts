/**
 * Custom Select Types
 * Types for custom select dropdown components.
 *
 * Defines option structure and props for reusable custom select
 * components with optional features, styling, and callbacks.
 */
export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type CustomSelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  searchable?: boolean;
  emptyMessage?: string;
};

export type LocationSelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  locations: Array<{ _id: string; name: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  emptyMessage?: string;
};
