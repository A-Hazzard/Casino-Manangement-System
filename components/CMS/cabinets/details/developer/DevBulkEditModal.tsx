'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/shared/ui/button';
import { Checkbox } from '@/components/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import type { DevFieldDescriptor } from '@shared/types/dev';
import type { DevBulkEditModalProps } from '@/lib/types/dev/collectionExplorer';

const NONE = '__none__';

type FieldRow = {
  path: string;
  stringValue: string;
  boolValue: boolean;
};

const EMPTY_ROW: FieldRow = { path: '', stringValue: '', boolValue: false };

export default function DevBulkEditModal({
  open,
  onOpenChange,
  selectedCount,
  fields,
  saving,
  onSave,
}: DevBulkEditModalProps) {
  const editableFields = useMemo(
    () => fields.filter(f => f.editable),
    [fields]
  );

  const [rows, setRows] = useState<FieldRow[]>([{ ...EMPTY_ROW }]);
  const [fieldSearch, setFieldSearch] = useState('');

  useEffect(() => {
    if (open) {
      setRows([{ ...EMPTY_ROW }]);
      setFieldSearch('');
    }
  }, [open]);

  const descriptorFor = (path: string): DevFieldDescriptor | undefined =>
    editableFields.find(f => f.path === path);

  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return editableFields;
    const lower = fieldSearch.toLowerCase();
    return editableFields.filter(
      f =>
        f.path.toLowerCase().includes(lower) ||
        f.kind.toLowerCase().includes(lower)
    );
  }, [editableFields, fieldSearch]);

  const updateRow = (index: number, patch: Partial<FieldRow>) => {
    setRows(prev =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const patch = useMemo(() => {
    const set: Record<string, unknown> = {};
    for (const row of rows) {
      if (!row.path) continue;
      const descriptor = descriptorFor(row.path);
      if (descriptor?.kind === 'boolean') {
        set[row.path] = row.boolValue;
      } else if (descriptor?.kind === 'number') {
        const parsed = Number(row.stringValue);
        set[row.path] = row.stringValue === '' ? null : Number.isNaN(parsed) ? row.stringValue : parsed;
      } else if (descriptor?.kind === 'date') {
        set[row.path] = row.stringValue ? new Date(row.stringValue).toISOString() : null;
      } else {
        set[row.path] = row.stringValue === '' ? null : row.stringValue;
      }
    }
    return set;
  }, [rows]);

  const patchPreview = useMemo(() => {
    try {
      return JSON.stringify(patch, null, 2);
    } catch {
      return '{}';
    }
  }, [patch]);

  const hasField = Object.keys(patch).length > 0;

  const renderValueInput = (row: FieldRow, descriptor?: DevFieldDescriptor) => {
    if (descriptor?.enumValues) {
      return (
        <Select
          value={row.stringValue || NONE}
          onValueChange={next =>
            updateRow(rows.indexOf(row), {
              stringValue: next === NONE ? '' : next,
            })
          }
        >
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {descriptor.enumValues.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (descriptor?.kind === 'boolean') {
      return (
        <label className="flex flex-1 items-center gap-2 text-sm text-gray-700">
          <Checkbox
            checked={row.boolValue}
            onCheckedChange={checked =>
              updateRow(rows.indexOf(row), { boolValue: checked === true })
            }
          />
          <span className="text-xs text-gray-500">
            {row.boolValue ? 'true' : 'false'}
          </span>
        </label>
      );
    }

    return (
      <Input
        type={
          descriptor?.kind === 'number'
            ? 'number'
            : descriptor?.kind === 'date'
              ? 'datetime-local'
              : 'text'
        }
        value={row.stringValue}
        onChange={e =>
          updateRow(rows.indexOf(row), { stringValue: e.target.value })
        }
        placeholder={
          descriptor?.kind === 'number'
            ? 'Number value…'
            : descriptor?.kind === 'date'
              ? 'Select date…'
              : 'Value…'
        }
        disabled={!row.path}
        className="h-9 flex-1 disabled:bg-gray-50"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 md:max-h-fit">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            Edit {selectedCount} Selected Record{selectedCount !== 1 ? 's' : ''}
          </DialogTitle>
          <p className="text-sm text-grayHighlight">
            Set one or more fields. Each value is applied to every selected
            record via <code className="rounded bg-muted px-1 font-mono text-xs">$set</code>.
          </p>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-6 py-5">
          {rows.map((row, index) => {
            const descriptor = descriptorFor(row.path);
            return (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border border-border bg-gray-50/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={row.path}
                      onChange={e => {
                        updateRow(index, { path: e.target.value, stringValue: '', boolValue: false });
                        setFieldSearch('');
                      }}
                      onFocus={() => setFieldSearch('')}
                      className="h-9 w-full appearance-none rounded-md border border-gray-300 bg-white pl-2.5 pr-8 text-sm focus:border-buttonActive focus:ring-buttonActive"
                    >
                      <option value="">Select field…</option>
                      {filteredFields.map(f => (
                        <option key={f.path} value={f.path}>
                          {f.path}
                        </option>
                      ))}
                    </select>
                    <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  </div>

                  <button
                    onClick={() =>
                      setRows(prev =>
                        prev.length === 1
                          ? [{ ...EMPTY_ROW }]
                          : prev.filter((_r, idx) => idx !== index)
                      )
                    }
                    aria-label="Remove field"
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {descriptor && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        descriptor.kind === 'number'
                          ? 'bg-blue-100 text-blue-700'
                          : descriptor.kind === 'boolean'
                            ? 'bg-purple-100 text-purple-700'
                            : descriptor.kind === 'date'
                              ? 'bg-amber-100 text-amber-700'
                              : descriptor.enumValues
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {descriptor.kind}
                      {descriptor.enumValues ? ' / enum' : ''}
                    </span>
                  )}
                  {renderValueInput(row, descriptor)}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setRows(prev => [...prev, { ...EMPTY_ROW }])}
            className="flex items-center gap-1.5 text-sm font-medium text-buttonActive hover:underline"
          >
            <Plus className="h-4 w-4" /> Add field
          </button>

          {hasField && (
            <div className="mt-2 rounded-md border border-border bg-gray-900 p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                $set patch preview
              </p>
              <pre className="max-h-32 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs text-green-300">
                {patchPreview}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(patch)}
            disabled={saving || !hasField}
            className="bg-button text-white hover:bg-buttonActive"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply to {selectedCount}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
