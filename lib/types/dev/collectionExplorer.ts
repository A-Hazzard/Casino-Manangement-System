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

// ============================================================================
// Query Builder types
// ============================================================================

/** MongoDB-like comparison / membership operators exposed in the UI. */
export type DevFilterOp =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'exists'
  | 'notExists'
  | 'in';

/** A single filter row in the query builder panel. */
export type DevFilterClause = {
  /** Stable row key so React can reconcile add/remove without flicker. */
  id: string;
  field: string;
  op: DevFilterOp;
  /** Always a string in the UI; the API coerces per the schema field type. */
  value: string;
};

/** How multiple clauses are combined at the MongoDB level. */
export type DevFilterLogic = 'and' | 'or';

/** Query builder mode — JSON filter, visual clause builder, raw shell command. */
export type DevQueryMode = 'json' | 'visual' | 'shell';

/** Options exposed in JSON / Compass-like Options panel. */
export type DevJsonQueryOptions = {
  project?: string;
  sort?: string;
  skip?: number;
  limit?: number;
  maxTimeMS?: number;
};
