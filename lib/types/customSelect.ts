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
