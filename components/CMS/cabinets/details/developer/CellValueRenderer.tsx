/**
 * Cell Value Renderer
 *
 * Renders a table cell value. Primitives are shown as plain text; objects and
 * arrays render as a clickable preview that opens a popover with the content
 * shown in a structured, recursively-nested table.
 */

'use client';

import { useMemo, useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { formatCellValue } from '@/lib/utils/dev/tableColumns';

type CellValueRendererProps = {
  value: unknown;
  col: string;
};

// ============================================================================
// Recursive Nested Value
// ============================================================================

function NestedValue({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <span className="italic text-gray-400">—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'font-medium text-green-700' : 'font-medium text-red-500'}>
        {String(value)}
      </span>
    );
  }
  if (typeof value !== 'object') {
    return <span className="break-all font-mono text-[11px] text-gray-700">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="italic text-gray-400">[ ]</span>;
    return <ArrayTable data={value} depth={depth} />;
  }
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return <span className="italic text-gray-400">{'{ }'}</span>;
  return <ObjectTable data={value as Record<string, unknown>} depth={depth} />;
}

// ============================================================================
// Object Table (key → value rows, recursive)
// ============================================================================

function ObjectTable({ data, depth = 0 }: { data: Record<string, unknown>; depth?: number }) {
  const entries = useMemo(() => Object.entries(data), [data]);
  const isNested = depth > 0;

  return (
    <div
      className={`overflow-hidden ${
        isNested ? 'my-0.5 rounded border border-gray-200 bg-white' : ''
      }`}
    >
      <table className="w-full border-collapse text-left">
        {!isNested && (
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-1/3 whitespace-nowrap px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Field
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Value
              </th>
            </tr>
          </thead>
        )}
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
              <td className="w-1/3 whitespace-nowrap px-3 py-1.5 align-top font-mono text-[11px] font-semibold text-gray-600">
                {key}
              </td>
              <td className="px-3 py-1.5 align-top">
                <NestedValue value={val} depth={depth + 1} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Array Table (columnar for arrays-of-objects, list for primitives/mixed)
// ============================================================================

function ArrayTable({ data, depth = 0 }: { data: unknown[]; depth?: number }) {
  const isNested = depth > 0;

  // Determine if all items are objects (→ columnar table) or primitive/mixed (→ list)
  const columns = useMemo(() => {
    const keySet = new Set<string>();
    for (const item of data) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        for (const key of Object.keys(item as Record<string, unknown>)) {
          keySet.add(key);
        }
      }
    }
    return Array.from(keySet);
  }, [data]);

  const allObjects = data.every(
    item => typeof item === 'object' && item !== null && !Array.isArray(item),
  );

  // Primitive / mixed array — render as a simple numbered list
  if (!allObjects || columns.length === 0) {
    return (
      <div
        className={`overflow-hidden ${
          isNested ? 'my-0.5 rounded border border-gray-200 bg-white' : ''
        }`}
      >
        <table className="w-full border-collapse text-left">
          {!isNested && (
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-8 px-2 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  #
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Value
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                <td className="w-8 px-2 py-1.5 align-top font-mono text-[10px] text-gray-400">
                  {index + 1}
                </td>
                <td className="px-3 py-1.5 align-top">
                  <NestedValue value={item} depth={depth + 1} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Array of objects — columnar table
  return (
    <div
      className={`overflow-auto ${
        isNested ? 'my-0.5 rounded border border-gray-200 bg-white' : ''
      }`}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="w-8 px-2 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              #
            </th>
            {columns.map(col => (
              <th
                key={col}
                className="whitespace-nowrap px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const obj =
              typeof item === 'object' && item !== null && !Array.isArray(item)
                ? (item as Record<string, unknown>)
                : null;
            return (
              <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                <td className="w-8 px-2 py-1.5 align-top font-mono text-[10px] text-gray-400">
                  {index + 1}
                </td>
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 align-top">
                    <NestedValue value={obj ? obj[col] : undefined} depth={depth + 1} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export default function CellValueRenderer({ value, col }: CellValueRendererProps) {
  const [open, setOpen] = useState(false);

  const isComplex = typeof value === 'object' && value !== null;

  if (!isComplex) {
    return (
      <span className="whitespace-pre-line">
        {formatCellValue(col, value)}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer border-b border-dashed border-gray-400 text-left hover:border-blue-400 hover:text-blue-700"
          title="Click to inspect"
        >
          <span className="whitespace-pre-line">
            {formatCellValue(col, value)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-auto max-w-[min(90vw,720px)] overflow-hidden p-0 shadow-lg"
      >
        <div className="max-h-[520px] overflow-auto">
          {Array.isArray(value) ? (
            <ArrayTable data={value} depth={0} />
          ) : (
            <ObjectTable data={value as Record<string, unknown>} depth={0} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
