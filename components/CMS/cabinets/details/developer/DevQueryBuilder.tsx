/**
 * Dev Query Builder Component
 *
 * Renders a visual query builder for constructing MongoDB-like query clauses
 * (AND/OR logic, filter rows with operators matching schema types, sort, limit).
 * Emulates MongoDB Compass to make db exploration easier without typing raw JSON.
 */

'use client';

import { useMemo } from 'react';
import { Play, Plus, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import type { DevFieldDescriptor } from '@shared/types/dev';
import type {
  DevFilterClause,
  DevFilterLogic,
  DevFilterOp,
} from '@/lib/types/dev/collectionExplorer';

type DevQueryBuilderProps = {
  columns: string[];
  fields: DevFieldDescriptor[];
  filterClauses: DevFilterClause[];
  filterLogic: DevFilterLogic;
  querySortField: string;
  querySortDir: 'asc' | 'desc';
  queryLimit: number;
  onClausesChange: (clauses: DevFilterClause[]) => void;
  onLogicChange: (logic: DevFilterLogic) => void;
  onSortFieldChange: (field: string) => void;
  onSortDirChange: (dir: 'asc' | 'desc') => void;
  onLimitChange: (limit: number) => void;
  onRun: () => void;
  onClear: () => void;
};

const OPERATOR_LABELS: Record<DevFilterOp, string> = {
  eq: 'equals',
  ne: 'does not equal',
  gt: 'greater than (>)',
  gte: 'greater than or equal (>=)',
  lt: 'less than (<)',
  lte: 'less than or equal (<=)',
  contains: 'contains (regex)',
  startsWith: 'starts with',
  exists: 'exists (not null)',
  notExists: 'does not exist (null)',
  in: 'is in list (comma-separated)',
};

export default function DevQueryBuilder({
  columns,
  fields,
  filterClauses,
  filterLogic,
  querySortField,
  querySortDir,
  queryLimit,
  onClausesChange,
  onLogicChange,
  onSortFieldChange,
  onSortDirChange,
  onLimitChange,
  onRun,
  onClear,
}: DevQueryBuilderProps) {
  // Map fields by path for easy type checking
  const fieldsMap = useMemo(() => {
    const map = new Map<string, DevFieldDescriptor>();
    for (const f of fields) {
      map.set(f.path, f);
    }
    return map;
  }, [fields]);

  // Generate unique IDs for new clauses
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Add a new clause row
  const addClause = () => {
    // Default to the first available field in the schema
    const defaultField = fields[0]?.path || '_id';
    const newClause: DevFilterClause = {
      id: generateId(),
      field: defaultField,
      op: 'eq',
      value: '',
    };
    onClausesChange([...filterClauses, newClause]);
  };

  // Remove a clause row
  const removeClause = (id: string) => {
    onClausesChange(filterClauses.filter(c => c.id !== id));
  };

  // Update a clause property
  const updateClause = (id: string, updates: Partial<DevFilterClause>) => {
    onClausesChange(
      filterClauses.map(c => {
        if (c.id !== id) return c;
        const next = { ...c, ...updates };
        // Reset operator if field changes to one not compatible
        if (updates.field) {
          const schemaField = fieldsMap.get(updates.field);
          if (schemaField) {
            // Validate op compatibility
            const allowed = getAllowedOps(schemaField.kind);
            if (!allowed.includes(next.op)) {
              next.op = allowed[0];
            }
          }
          next.value = ''; // Reset value on field change
        }
        return next;
      })
    );
  };

  // Helper to determine allowed operators per field type
  const getAllowedOps = (kind?: string): DevFilterOp[] => {
    switch (kind) {
      case 'number':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'exists', 'notExists'];
      case 'boolean':
        return ['eq', 'exists', 'notExists'];
      case 'date':
        return ['eq', 'gt', 'lt', 'gte', 'lte', 'exists', 'notExists'];
      case 'string':
      case 'objectId':
        return ['eq', 'ne', 'contains', 'startsWith', 'exists', 'notExists', 'in'];
      default:
        return [
          'eq',
          'ne',
          'gt',
          'gte',
          'lt',
          'lte',
          'contains',
          'startsWith',
          'exists',
          'notExists',
          'in',
        ];
    }
  };

  return (
    <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-4 transition-all">
      {/* Header logic toggle & add button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Filter Logic:</span>
          <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => onLogicChange('and')}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterLogic === 'and'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AND (All)
            </button>
            <button
              onClick={() => onLogicChange('or')}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterLogic === 'or'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              OR (Any)
            </button>
          </div>
        </div>

        <Button
          onClick={addClause}
          className="flex h-8 items-center gap-1.5 rounded-md bg-purple-600 px-3 text-xs text-white hover:bg-purple-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Condition
        </Button>
      </div>

      {/* Filter clauses list */}
      <div className="space-y-2.5">
        {filterClauses.length === 0 ? (
          <div className="py-4 text-center text-xs italic text-gray-400">
            No filter conditions active. All records in date period will be loaded.
          </div>
        ) : (
          filterClauses.map(clause => {
            const schemaField = fieldsMap.get(clause.field);
            const kind = schemaField?.kind;
            const allowedOps = getAllowedOps(kind);
            const hideValueInput = clause.op === 'exists' || clause.op === 'notExists';

            return (
              <div
                key={clause.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-purple-100 bg-white p-2.5 shadow-sm md:flex-nowrap"
              >
                {/* Field Selector */}
                <select
                  value={clause.field}
                  onChange={e => updateClause(clause.id, { field: e.target.value })}
                  className="h-8 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                >
                  {fields.map(f => (
                    <option key={f.path} value={f.path}>
                      {f.path} {f.kind ? `(${f.kind})` : ''}
                    </option>
                  ))}
                </select>

                {/* Operator Selector */}
                <select
                  value={clause.op}
                  onChange={e => updateClause(clause.id, { op: e.target.value as DevFilterOp })}
                  className="h-8 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                >
                  {allowedOps.map(op => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>

                {/* Value Input */}
                {!hideValueInput && (
                  <div className="flex-1 min-w-[150px]">
                    {kind === 'boolean' && clause.op === 'eq' ? (
                      <select
                        value={clause.value}
                        onChange={e => updateClause(clause.id, { value: e.target.value })}
                        className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                      >
                        <option value="">— Select —</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : kind === 'date' ? (
                      <input
                        type="datetime-local"
                        value={clause.value}
                        onChange={e => updateClause(clause.id, { value: e.target.value })}
                        className="h-8 w-full rounded border border-gray-300 px-2 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={
                          clause.op === 'in'
                            ? 'val1, val2, val3'
                            : 'Enter filter value...'
                        }
                        value={clause.value}
                        onChange={e => updateClause(clause.id, { value: e.target.value })}
                        className="h-8 w-full rounded border border-gray-300 px-3 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                      />
                    )}
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={() => removeClause(clause.id)}
                  title="Remove condition"
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sort + Limit panel & Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-purple-100/60 pt-4">
        {/* Sort & Limit */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600">Sort by:</span>
            <select
              value={querySortField}
              onChange={e => onSortFieldChange(e.target.value)}
              className="h-8 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="">Default Sort</option>
              {columns
                .filter(col => col !== '_id' && !col.startsWith('movement.'))
                .map(col => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
            </select>

            {querySortField && (
              <div className="inline-flex rounded border border-gray-300 bg-white p-0.5">
                <button
                  onClick={() => onSortDirChange('asc')}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    querySortDir === 'asc'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ASC
                </button>
                <button
                  onClick={() => onSortDirChange('desc')}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    querySortDir === 'desc'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  DESC
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600">Limit:</span>
            <input
              type="number"
              min={1}
              max={5000}
              placeholder="e.g. 500"
              value={queryLimit || ''}
              onChange={e => onLimitChange(parseInt(e.target.value) || 0)}
              className="h-8 w-20 rounded border border-gray-300 px-2 text-xs text-gray-700 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Query Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onClear}
            className="h-8 rounded-md px-3 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Clear Filters
          </Button>
          <Button
            onClick={onRun}
            className="flex h-8 items-center gap-1.5 rounded-md bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm transition-all"
          >
            <Play className="h-3 w-3 fill-current" /> Run Query
          </Button>
        </div>
      </div>
    </div>
  );
}
