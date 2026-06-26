/**
 * Dev Bulk Edit Modal
 *
 * "Set-fields" bulk editor: the developer adds one or more field → value rows
 * and applies them as a single $set across every selected document.
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import type { DevFieldDescriptor } from '@shared/types/dev';
import type { DevBulkEditModalProps } from '@/lib/types/dev/collectionExplorer';

type FieldRow = { path: string; value: string; boolValue: boolean };

const EMPTY_ROW: FieldRow = { path: '', value: '', boolValue: false };

export default function DevBulkEditModal({
  open,
  onOpenChange,
  selectedCount,
  fields,
  saving,
  onSave,
}: DevBulkEditModalProps) {
  const editableFields = fields.filter(field => field.editable);
  const [rows, setRows] = useState<FieldRow[]>([{ ...EMPTY_ROW }]);

  useEffect(() => {
    if (open) setRows([{ ...EMPTY_ROW }]);
  }, [open]);

  const descriptorFor = (path: string): DevFieldDescriptor | undefined =>
    editableFields.find(field => field.path === path);

  const updateRow = (index: number, patch: Partial<FieldRow>) => {
    setRows(prev =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const handleSave = () => {
    const set: Record<string, unknown> = {};
    for (const row of rows) {
      if (!row.path) continue;
      const descriptor = descriptorFor(row.path);
      if (descriptor?.kind === 'boolean') set[row.path] = row.boolValue;
      else set[row.path] = row.value === '' ? null : row.value;
    }
    onSave(set);
  };

  const hasField = rows.some(row => row.path);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit {selectedCount} Selected Record(s)</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-grayHighlight">
          Set one or more fields. Each value is applied to every selected record.
        </p>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto py-2">
          {rows.map((row, index) => {
            const descriptor = descriptorFor(row.path);
            return (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={row.path}
                  onChange={e => updateRow(index, { path: e.target.value })}
                  className="h-9 w-1/2 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:border-buttonActive focus:ring-buttonActive"
                >
                  <option value="">Select field…</option>
                  {editableFields.map(field => (
                    <option key={field.path} value={field.path}>
                      {field.path} ({field.kind})
                    </option>
                  ))}
                </select>

                {descriptor?.enumValues ? (
                  <select
                    value={row.value}
                    onChange={e => updateRow(index, { value: e.target.value })}
                    className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:border-buttonActive focus:ring-buttonActive"
                  >
                    <option value="">—</option>
                    {descriptor.enumValues.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : descriptor?.kind === 'boolean' ? (
                  <label className="flex flex-1 items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={row.boolValue}
                      onChange={e =>
                        updateRow(index, { boolValue: e.target.checked })
                      }
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    {row.boolValue ? 'true' : 'false'}
                  </label>
                ) : (
                  <input
                    type={
                      descriptor?.kind === 'number'
                        ? 'number'
                        : descriptor?.kind === 'date'
                          ? 'datetime-local'
                          : 'text'
                    }
                    value={row.value}
                    onChange={e => updateRow(index, { value: e.target.value })}
                    placeholder="New value"
                    disabled={!row.path}
                    className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:border-buttonActive focus:ring-buttonActive disabled:bg-gray-50"
                  />
                )}

                <button
                  onClick={() =>
                    setRows(prev =>
                      prev.length === 1
                        ? [{ ...EMPTY_ROW }]
                        : prev.filter((_row, idx) => idx !== index)
                    )
                  }
                  aria-label="Remove field"
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setRows(prev => [...prev, { ...EMPTY_ROW }])}
            className="flex items-center gap-1.5 text-sm font-medium text-buttonActive hover:underline"
          >
            <Plus className="h-4 w-4" /> Add field
          </button>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="bg-buttonInactive text-white hover:bg-buttonInactive/90"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
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
