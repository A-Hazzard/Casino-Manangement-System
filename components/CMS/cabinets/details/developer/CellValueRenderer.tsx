/**
 * Cell Value Renderer
 *
 * Renders a table cell value. Primitives are shown as plain text; objects and
 * arrays render as a clickable preview that opens a popover with the content
 * shown in a structured table instead of raw JSON.
 */

'use client';

import { useMemo, useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { formatCellValue } from '@/lib/utils/dev/tableColumns';

type CellValueRendererProps = {
  value: unknown;
  col: string;
};

function formatInlineValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (value.every(v => v === null || (typeof v !== 'object' && !Array.isArray(v)))) {
        return value.map(v => String(v ?? 'null')).join(', ');
      }
      return `Array(${value.length})`;
    }
    if (Object.keys(value as Record<string, unknown>).length === 0) return '{}';
    return 'Object';
  }
  return String(value);
}

function ObjectTable({ data }: { data: Record<string, unknown> }) {
  const entries = useMemo(() => Object.entries(data), [data]);

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="w-1/3 whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wider text-grayHighlight">
            Field
          </TableHead>
          <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wider text-grayHighlight">
            Value
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([key, val]) => (
          <TableRow key={key} className="border-b border-gray-100 last:border-0">
            <TableCell className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] font-medium text-gray-700">
              {key}
            </TableCell>
            <TableCell className="whitespace-pre-wrap break-all px-3 py-1.5 font-mono text-[11px] text-gray-600">
              {formatInlineValue(val)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ArrayTable({ data }: { data: unknown[] }) {
  // Flatten into columns derived from the union of all keys across items
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

  // All items are primitives — no table needed, just joined text
  if (columns.length === 0) {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
        {formatInlineValue(data)}
      </pre>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="w-8 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-grayHighlight">
            #
          </TableHead>
          {columns.map(col => (
            <TableHead
              key={col}
              className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wider text-grayHighlight"
            >
              {col}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => {
          if (typeof item !== 'object' || item === null || Array.isArray(item)) {
            return (
              <TableRow key={index} className="border-b border-gray-100 last:border-0">
                <TableCell className="px-2 py-1.5 text-[11px] text-gray-400">
                  {index + 1}
                </TableCell>
                <TableCell
                  colSpan={columns.length}
                  className="px-3 py-1.5 font-mono text-[11px] text-gray-600"
                >
                  {formatInlineValue(item)}
                </TableCell>
              </TableRow>
            );
          }
          const obj = item as Record<string, unknown>;
          return (
            <TableRow key={index} className="border-b border-gray-100 last:border-0">
              <TableCell className="px-2 py-1.5 text-[11px] text-gray-400">
                {index + 1}
              </TableCell>
              {columns.map(col => (
                <TableCell
                  key={col}
                  className="whitespace-pre-wrap break-all px-3 py-1.5 font-mono text-[11px] text-gray-600"
                >
                  {formatInlineValue(obj[col])}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function CellValueRenderer({
  value,
  col,
}: CellValueRendererProps) {
  const [open, setOpen] = useState(false);

  const isComplex =
    typeof value === 'object' && value !== null;

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
          className="cursor-pointer border-b border-dashed border-gray-400 text-left hover:text-blue-700 hover:border-blue-400"
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
        className="w-auto overflow-hidden p-0"
      >
        <div className="max-h-[460px] overflow-auto">
          {Array.isArray(value) ? (
            <ArrayTable data={value} />
          ) : (
            <ObjectTable data={value as Record<string, unknown>} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
