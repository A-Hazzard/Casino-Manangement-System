'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

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
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import type { DevFieldDescriptor } from '@shared/types/dev';
import type { DevRecordEditModalProps } from '@/lib/types/dev/collectionExplorer';

const NONE = '__none__';

function toDateInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValue(field: DevFieldDescriptor, raw: unknown): string | boolean {
  if (field.kind === 'boolean') return Boolean(raw);
  if (field.kind === 'date') return toDateInput(raw);
  if (raw === null || raw === undefined) return '';
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
}

function hasChanged(
  field: DevFieldDescriptor,
  original: string | boolean,
  current: string | boolean
): boolean {
  if (field.kind === 'boolean') return current !== original;
  if (field.kind === 'number') {
    const o = original === '' ? null : Number(original);
    const c = current === '' ? null : Number(current);
    return o !== c;
  }
  return current !== original;
}

export default function DevRecordEditModal({
  open,
  onOpenChange,
  record,
  fields,
  saving,
  onSave,
}: DevRecordEditModalProps) {
  const editableFields = useMemo(
    () => fields.filter(f => f.editable),
    [fields]
  );

  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [fieldSearch, setFieldSearch] = useState('');
  const [showChangedOnly, setShowChangedOnly] = useState(false);

  useEffect(() => {
    if (!record) return;
    const next: Record<string, string | boolean> = {};
    for (const field of editableFields) {
      next[field.path] = initialValue(field, record[field.path]);
    }
    setValues(next);
    setFieldSearch('');
    setShowChangedOnly(false);
  }, [record, editableFields]);

  if (!record) return null;

  const setValue = (path: string, value: string | boolean) =>
    setValues(prev => ({ ...prev, [path]: value }));

  const origValues = useMemo(() => {
    const map: Record<string, string | boolean> = {};
    for (const field of editableFields) {
      map[field.path] = initialValue(field, record[field.path]);
    }
    return map;
  }, [record, editableFields]);

  const changedCount = useMemo(() => {
    let count = 0;
    for (const field of editableFields) {
      if (hasChanged(field, origValues[field.path], values[field.path])) {
        count++;
      }
    }
    return count;
  }, [editableFields, origValues, values]);

  const filteredFields = useMemo(() => {
    let result = editableFields;

    if (fieldSearch.trim()) {
      const lower = fieldSearch.toLowerCase();
      result = result.filter(
        f =>
          f.path.toLowerCase().includes(lower) ||
          f.kind.toLowerCase().includes(lower)
      );
    }

    if (showChangedOnly) {
      result = result.filter(f =>
        hasChanged(f, origValues[f.path], values[f.path])
      );
    }

    return result;
  }, [editableFields, fieldSearch, showChangedOnly, origValues, values]);

  const groupedFields = useMemo(() => {
    const groups = new Map<string, DevFieldDescriptor[]>();
    const root: DevFieldDescriptor[] = [];

    for (const field of filteredFields) {
      const dot = field.path.indexOf('.');
      if (dot === -1) {
        root.push(field);
      } else {
        const prefix = field.path.slice(0, dot);
        const list = groups.get(prefix) ?? [];
        list.push(field);
        groups.set(prefix, list);
      }
    }

    const result: { label: string; fields: DevFieldDescriptor[] }[] = [];
    if (root.length > 0) result.push({ label: 'General', fields: root });
    for (const [prefix, list] of groups) {
      result.push({ label: prefix, fields: list });
    }
    return result;
  }, [filteredFields]);

  const handleSave = () => {
    const set: Record<string, unknown> = {};
    for (const field of editableFields) {
      const original = origValues[field.path];
      const current = values[field.path];
      if (!hasChanged(field, original, current)) continue;
      if (field.kind === 'boolean') {
        set[field.path] = current;
      } else if (current === '') {
        set[field.path] = null;
      } else if (field.kind === 'number') {
        const parsed = Number(current);
        set[field.path] = Number.isNaN(parsed) ? current : parsed;
      } else if (field.kind === 'date') {
        set[field.path] = new Date(current as string).toISOString();
      } else {
        set[field.path] = current;
      }
    }
    onSave(set);
  };

  const renderControl = (field: DevFieldDescriptor) => {
    const id = `dev-edit-${field.path}`;
    const current = values[field.path];
    const changed = hasChanged(field, origValues[field.path], current);

    if (field.enumValues) {
      return (
        <Select
          value={current ? String(current) : NONE}
          onValueChange={next => setValue(field.path, next === NONE ? '' : next)}
        >
          <SelectTrigger
            id={id}
            className={changed ? 'border-amber-400 ring-amber-200' : ''}
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {field.enumValues.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.kind === 'boolean') {
      return (
        <div className="flex h-9 items-center gap-2">
          <Checkbox
            id={id}
            checked={Boolean(current)}
            onCheckedChange={checked => setValue(field.path, checked === true)}
          />
          <span className="text-sm text-gray-500">
            {current ? 'true' : 'false'}
          </span>
        </div>
      );
    }

    return (
      <div className="relative flex-1">
        <Input
          id={id}
          type={
            field.kind === 'number'
              ? 'number'
              : field.kind === 'date'
                ? 'datetime-local'
                : 'text'
          }
          value={String(current ?? '')}
          onChange={e => setValue(field.path, e.target.value)}
          className={changed ? 'border-amber-400 ring-amber-200' : ''}
          step={field.kind === 'number' ? 'any' : undefined}
        />
        {changed && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
        )}
      </div>
    );
  };

  const renderFieldCard = (field: DevFieldDescriptor) => {
    const changed = hasChanged(field, origValues[field.path], values[field.path]);

    return (
      <div
        key={field.path}
        className={`flex flex-col gap-1.5 rounded-lg border p-3 transition-colors ${
          changed
            ? 'border-amber-200 bg-amber-50/50'
            : 'border-border bg-white'
        }`}
      >
        <Label
          htmlFor={`dev-edit-${field.path}`}
          className="flex items-center gap-2 text-gray-700"
        >
          <span className="truncate font-mono text-xs">{field.path}</span>
          {field.required && <span className="text-red-500">*</span>}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              field.kind === 'number'
                ? 'bg-blue-100 text-blue-700'
                : field.kind === 'boolean'
                  ? 'bg-purple-100 text-purple-700'
                  : field.kind === 'date'
                    ? 'bg-amber-100 text-amber-700'
                    : field.enumValues
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
            }`}
          >
            {field.kind}
            {field.enumValues ? ' / enum' : ''}
          </span>
          {changed && (
            <span className="ml-auto text-xs font-medium text-amber-600">
              changed
            </span>
          )}
        </Label>
        {renderControl(field)}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 md:max-h-fit">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-buttonActive">Edit Record</DialogTitle>
              <p className="mt-1 break-all font-mono text-xs text-grayHighlight">
                _id: {String(record._id)}
              </p>
            </div>
            {changedCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                {changedCount} change{changedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="border-b border-border bg-gray-50 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields…"
                value={fieldSearch}
                onChange={e => setFieldSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm focus:border-buttonActive focus:ring-buttonActive focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <Checkbox
                checked={showChangedOnly}
                onCheckedChange={checked => setShowChangedOnly(checked === true)}
              />
              Changed only
            </label>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          {groupedFields.length === 0 && (
            <p className="text-sm text-grayHighlight">
              {fieldSearch
                ? 'No fields match your search.'
                : 'This model has no editable fields.'}
            </p>
          )}

          {groupedFields.map(group => (
            <div key={group.label} className="mb-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-grayHighlight">
                {group.label}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.fields.map(renderFieldCard)}
              </div>
            </div>
          ))}
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
            onClick={handleSave}
            disabled={saving || changedCount === 0}
            className="bg-button text-white hover:bg-buttonActive"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {changedCount > 0 ? `Save ${changedCount} Change${changedCount !== 1 ? 's' : ''}` : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
