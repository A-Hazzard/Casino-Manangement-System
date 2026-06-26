/**
 * Dev Record Edit Modal
 *
 * Structured, schema-driven edit form for a single document, built from the
 * shared UI primitives (Dialog, Label, Input, Checkbox, Select). Renders a typed
 * control per editable field, prefilled from the record, and submits only the
 * changed fields as a $set patch.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

// Radix Select forbids an empty-string item value, so a sentinel stands in for
// "no value" / clear.
const NONE = '__none__';

/** Formats a value for an <input type="datetime-local"> (local time). */
function toDateInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValue(
  field: DevFieldDescriptor,
  raw: unknown
): string | boolean {
  if (field.kind === 'boolean') return Boolean(raw);
  if (field.kind === 'date') return toDateInput(raw);
  if (raw === null || raw === undefined) return '';
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
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
    () => fields.filter(field => field.editable),
    [fields]
  );

  const [values, setValues] = useState<Record<string, string | boolean>>({});

  // Reset the form whenever a new record is opened.
  useEffect(() => {
    if (!record) return;
    const next: Record<string, string | boolean> = {};
    for (const field of editableFields) {
      next[field.path] = initialValue(field, record[field.path]);
    }
    setValues(next);
  }, [record, editableFields]);

  if (!record) return null;

  const setValue = (path: string, value: string | boolean) =>
    setValues(prev => ({ ...prev, [path]: value }));

  const handleSave = () => {
    const set: Record<string, unknown> = {};
    for (const field of editableFields) {
      const original = initialValue(field, record[field.path]);
      const current = values[field.path];
      if (current === original) continue;
      if (field.kind === 'boolean') set[field.path] = current;
      else if (current === '') set[field.path] = null;
      else set[field.path] = current;
    }
    onSave(set);
  };

  const renderControl = (field: DevFieldDescriptor) => {
    const id = `dev-edit-${field.path}`;
    const current = values[field.path];

    if (field.enumValues) {
      return (
        <Select
          value={current ? String(current) : NONE}
          onValueChange={next => setValue(field.path, next === NONE ? '' : next)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {field.enumValues.map(option => (
              <SelectItem key={option} value={option}>
                {option}
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
          <span className="text-sm text-gray-600">
            {current ? 'true' : 'false'}
          </span>
        </div>
      );
    }

    return (
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
        onChange={event => setValue(field.path, event.target.value)}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-buttonActive">Edit Record</DialogTitle>
          <p className="break-all font-mono text-xs text-grayHighlight">
            _id: {String(record._id)}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          {editableFields.map(field => (
            <div key={field.path} className="flex flex-col gap-1.5">
              <Label
                htmlFor={`dev-edit-${field.path}`}
                className="flex items-center gap-2 text-gray-700"
              >
                <span className="truncate">{field.path}</span>
                {field.required && <span className="text-red-500">*</span>}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-grayHighlight">
                  {field.kind}
                </span>
              </Label>
              {renderControl(field)}
            </div>
          ))}
          {editableFields.length === 0 && (
            <p className="col-span-full text-sm text-grayHighlight">
              This model has no editable fields.
            </p>
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
            onClick={handleSave}
            disabled={saving}
            className="bg-button text-white hover:bg-buttonActive"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
