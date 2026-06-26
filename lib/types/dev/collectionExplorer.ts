import type {
  DevCollectionRecord,
  DevFieldDescriptor,
  DevModelInfo,
} from '@shared/types/dev';

export type DevTimePeriod =
  | 'Today'
  | 'Yesterday'
  | '7d'
  | '30d'
  | 'All Time'
  | 'Custom';

export type DevSearchMatchMode = 'contains' | 'exact';

export type DevCustomDateRange = { from?: Date; to?: Date };

export type DevExplorerProps = {
  defaultCabinetId?: string;
  refreshTrigger?: number;
};

export type DevCollectionTableProps = {
  records: DevCollectionRecord[];
  columns: string[];
  primaryDateField: string;
  selectedIds: Set<string>;
  matchMap: Map<number, Set<string>> | null;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  onEditRow: (record: DevCollectionRecord) => void;
  onDeleteRow: (record: DevCollectionRecord) => void;
  onExportRow: (record: DevCollectionRecord) => void;
};

export type DevRecordEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: DevCollectionRecord | null;
  fields: DevFieldDescriptor[];
  saving: boolean;
  onSave: (set: Record<string, unknown>) => void;
};

export type DevBulkEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  fields: DevFieldDescriptor[];
  saving: boolean;
  onSave: (set: Record<string, unknown>) => void;
};

export type DevModelGroup = {
  group: string;
  models: DevModelInfo[];
};
