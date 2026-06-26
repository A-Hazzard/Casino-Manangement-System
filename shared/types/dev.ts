export type DevFieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'objectId'
  | 'array'
  | 'embedded'
  | 'mixed';

export type DevFieldDescriptor = {
  path: string;
  kind: DevFieldKind;
  required: boolean;
  editable: boolean;
  enumValues?: string[];
};

export type DevModelInfo = {
  key: string;
  label: string;
  group: string;
};

export type DevCollectionSchemaResponse = {
  success: boolean;
  fields: DevFieldDescriptor[];
  dateFields: string[];
  defaultDateField: string | null;
  error?: string;
};

export type DevCollectionRecord = Record<string, unknown>;

export type DevCollectionListResponse = {
  success: boolean;
  data: DevCollectionRecord[];
  total: number | null;
  apiPage: number;
  hasMore: boolean;
  matchIndex: number;
  matchCount: number;
  error?: string;
};

export type DevMutationResponse = {
  success: boolean;
  modifiedCount?: number;
  deletedCount?: number;
  error?: string;
};
