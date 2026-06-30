'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Play, Plus, RotateCcw, X } from 'lucide-react';
import SyntaxHighlightedEditor, {
  tokenizeJson,
  tokenizeShell,
} from './SyntaxHighlightedEditor';
import ValidatedJsonInput, {
  ValidatedNumericInput,
} from './ValidatedJsonInput';
import {
  validateShellCommand,
  formatShellCommand,
} from '@/lib/utils/dev/parseShell';
import {
  validateSortJson,
  validateProjectJson,
} from '@/lib/utils/dev/parseJsonOption';

// ============================================================================
// Error details helpers — extract position, line:column, and context from
// JSON.parse / shell parse errors.
// ============================================================================

type JsonErrorDetails = {
  message: string;
  line: number;
  column: number;
  lineContent: string;
  pointer: string;
  position: number;
};

function getJsonErrorDetails(
  text: string,
  error: unknown
): JsonErrorDetails | null {
  const msg = (error as Error).message;
  const posMatch = msg.match(/position\s+(\d+)/);
  if (!posMatch) return null;
  const pos = parseInt(posMatch[1], 10);
  const before = text.slice(0, pos);
  const lines = before.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  const allLines = text.split('\n');
  const lineContent = allLines[line - 1] || '';
  const cleanMsg = msg.replace(/ in JSON at position \d+ /, '').replace(/ in JSON at position \d+$/, '');
  const pointer = ' '.repeat(Math.max(0, column - 1)) + '^';
  return { message: cleanMsg, line, column, lineContent, pointer, position: pos };
}

type ShellErrorDetails = {
  message: string;
  line: number | null;
  column: number | null;
  lineContent: string;
  pointer: string;
  position: number;
};

function lineColToPosition(text: string, line: number, column: number): number {
  const beforeLines = text.split('\n').slice(0, line - 1);
  return beforeLines.join('\n').length + (beforeLines.length > 0 ? 1 : 0) + column - 1;
}

function getShellErrorDetails(command: string, generic: string): ShellErrorDetails {
  const trimmed = command.trim();
  const lines = trimmed.split('\n');
  // Check unbalanced braces
  let depth = 0;
  let lastOpenLine = 0;
  let lastOpenCol = 0;
  for (let stringIndex = 0; stringIndex < trimmed.length; stringIndex++) {
    const char = trimmed[stringIndex];
    if (char === '{') {
      depth++;
      const before = trimmed.slice(0, stringIndex);
      const braceLines = before.split('\n');
      lastOpenLine = braceLines.length;
      lastOpenCol = braceLines[braceLines.length - 1].length + 1;
    } else if (char === '}') {
      depth--;
    }
  }
  if (depth > 0) {
    const position = lineColToPosition(trimmed, lastOpenLine, lastOpenCol);
    return {
      message: `Unclosed opening brace — missing ${depth} closing brace(s).`,
      line: lastOpenLine,
      column: lastOpenCol,
      position,
      lineContent: lines[lastOpenLine - 1] || '',
      pointer: ' '.repeat(Math.max(0, lastOpenCol - 1)) + '{',
    };
  }
  if (depth < 0) {
    const firstCloseExtra = trimmed.search(/}/g);
    if (firstCloseExtra >= 0) {
      const before = trimmed.slice(0, firstCloseExtra);
      const braceLines = before.split('\n');
      const braceLine = braceLines.length;
      const braceCol = braceLines[braceLines.length - 1].length + 1;
      return {
        message: 'Unexpected closing brace — no matching opening brace.',
        line: braceLine,
        column: braceCol,
        position: firstCloseExtra,
        lineContent: lines[braceLine - 1] || '',
        pointer: ' '.repeat(Math.max(0, braceCol - 1)) + '^',
      };
    }
  }
  // Check if the command has a method but no parentheses
  if (/\.\s*(find|aggregate|countDocuments|distinct)\s*[^(]/.test(trimmed)) {
    const methodMatch = trimmed.match(/\.\s*(find|aggregate|countDocuments|distinct)\s*[^(]/);
    if (methodMatch) {
      const methodPos = methodMatch.index! + 1;
      const before = trimmed.slice(0, methodMatch.index! + 1);
      const methodLines = before.split('\n');
      const methodLine = methodLines.length;
      const methodCol = methodLines[methodLines.length - 1].length + 1;
      return {
        message: `Missing parentheses after "${methodMatch[1]}".`,
        line: methodLine,
        column: methodCol,
        position: methodPos,
        lineContent: lines[methodLine - 1] || '',
        pointer: ' '.repeat(Math.max(0, methodCol - 1)) + '^',
      };
    }
  }
  return { message: generic, line: null, column: null, lineContent: '', pointer: '', position: -1 };
}

function indentOnTab(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (v: string) => void
) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const target = e.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const indent = '  ';
  const newValue = value.slice(0, start) + indent + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    target.selectionStart = target.selectionEnd = start + indent.length;
  });
}
import { Button } from '@/components/shared/ui/button';
import type { DevFieldDescriptor } from '@shared/types/dev';
import type {
  DevFilterClause,
  DevFilterLogic,
  DevFilterOp,
  DevQueryMode,
  DevJsonQueryOptions,
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
  // New props for JSON/Shell modes
  queryMode: DevQueryMode;
  onModeChange: (mode: DevQueryMode) => void;
  jsonFilterText: string;
  onJsonFilterChange: (text: string) => void;
  jsonOptions: DevJsonQueryOptions;
  onJsonOptionsChange: (options: DevJsonQueryOptions) => void;
  shellCommandText: string;
  onShellCommandChange: (text: string) => void;
  showOptions: boolean;
  onShowOptionsChange: (show: boolean) => void;
  onRunShell: () => void;
  onRunJson: () => void;
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

const MODE_TABS: { key: DevQueryMode; label: string }[] = [
  { key: 'json', label: 'JSON' },
  { key: 'visual', label: 'Visual' },
  { key: 'shell', label: 'Shell' },
];

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
  queryMode,
  onModeChange,
  jsonFilterText,
  onJsonFilterChange,
  jsonOptions,
  onJsonOptionsChange,
  shellCommandText,
  onShellCommandChange,
  showOptions,
  onShowOptionsChange,
  onRunShell,
  onRunJson,
}: DevQueryBuilderProps) {
  // Debounced validation — waits 400ms after last keystroke to validate
  const [debouncedJsonText, setDebouncedJsonText] = useState(jsonFilterText);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedJsonText(jsonFilterText);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [jsonFilterText]);

  const jsonValidation = useMemo(() => {
    if (!debouncedJsonText || debouncedJsonText === '{}') return { valid: true, error: '', details: null };
    try {
      JSON.parse(debouncedJsonText);
      return { valid: true, error: '', details: null };
    } catch (e) {
      const details = getJsonErrorDetails(debouncedJsonText, e);
      return { valid: false, error: details ? `${details.message} at line ${details.line}, column ${details.column}` : (e as Error).message, details };
    }
  }, [debouncedJsonText]);

  const handleJsonFormat = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(jsonFilterText), null, 2);
      onJsonFilterChange(formatted);
    } catch {
      // Don't format invalid JSON
    }
  }, [jsonFilterText, onJsonFilterChange]);

  // (jsonTextareaRef is handled internally by SyntaxHighlightedEditor)

  const handleJsonKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      indentOnTab(e, jsonFilterText, onJsonFilterChange);
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        handleJsonFormat();
      }
    },
    [handleJsonFormat, jsonFilterText, onJsonFilterChange]
  );

  // ==========================================================================
  // Shell validation & formatting
  // ==========================================================================

  const [debouncedShellText, setDebouncedShellText] = useState(shellCommandText);
  const shellDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (shellDebounceTimer.current) clearTimeout(shellDebounceTimer.current);
    shellDebounceTimer.current = setTimeout(() => {
      setDebouncedShellText(shellCommandText);
    }, 400);
    return () => {
      if (shellDebounceTimer.current) clearTimeout(shellDebounceTimer.current);
    };
  }, [shellCommandText]);

  const shellValidation = useMemo(() => {
    const base = validateShellCommand(debouncedShellText);
    if (base.valid) return { ...base, details: null };
    const details = getShellErrorDetails(debouncedShellText, base.error);
    return { ...base, details, error: details.line ? `${details.message} at line ${details.line}, column ${details.column}` : base.error };
  }, [debouncedShellText]);

  const handleShellFormat = useCallback(() => {
    const formatted = formatShellCommand(shellCommandText);
    if (formatted !== shellCommandText) {
      onShellCommandChange(formatted);
    }
  }, [shellCommandText, onShellCommandChange]);

  const handleShellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      indentOnTab(e, shellCommandText, onShellCommandChange);
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        handleShellFormat();
      }
    },
    [handleShellFormat, shellCommandText, onShellCommandChange]
  );

  const fieldsMap = useMemo(() => {
    const map = new Map<string, DevFieldDescriptor>();
    for (const f of fields) {
      map.set(f.path, f);
    }
    return map;
  }, [fields]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addClause = () => {
    const defaultField = fields[0]?.path || '_id';
    const newClause: DevFilterClause = {
      id: generateId(),
      field: defaultField,
      op: 'eq',
      value: '',
    };
    onClausesChange([...filterClauses, newClause]);
  };

  const removeClause = (id: string) => {
    onClausesChange(filterClauses.filter(c => c.id !== id));
  };

  const updateClause = (id: string, updates: Partial<DevFilterClause>) => {
    onClausesChange(
      filterClauses.map(c => {
        if (c.id !== id) return c;
        const next = { ...c, ...updates };
        if (updates.field) {
          const schemaField = fieldsMap.get(updates.field);
          if (schemaField) {
            const allowed = getAllowedOps(schemaField.kind);
            if (!allowed.includes(next.op)) {
              next.op = allowed[0];
            }
          }
          next.value = '';
        }
        return next;
      })
    );
  };

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
        return [ 'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'exists', 'notExists', 'in' ];
    }
  };

  const handleRun = () => {
    if (queryMode === 'json') {
      onRunJson();
    } else if (queryMode === 'shell') {
      onRunShell();
    } else {
      onRun();
    }
  };

  const handleClear = () => {
    onClear();
    onJsonFilterChange('{}');
    onJsonOptionsChange({});
    onShellCommandChange('');
  };

  const getFindLabel = () => {
    if (queryMode === 'json') return 'Apply';
    if (queryMode === 'shell') return 'Execute';
    return 'Find';
  };

  return (
    <div className="max-w-4xl rounded-lg border border-purple-100 bg-purple-50/40 p-4 transition-all">
      {/* Mode tabs + Options toggle + Action buttons */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {/* Mode tabs */}
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 shadow-sm">
          {MODE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onModeChange(tab.key)}
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                queryMode === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right side: Options toggle + Find + Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShowOptionsChange(!showOptions)}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showOptions ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Options
          </button>
          <Button
            variant="ghost"
            onClick={handleClear}
            className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
          <Button
            onClick={handleRun}
            className="flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-all"
          >
            <Play className="h-3 w-3 fill-current" /> {getFindLabel()}
          </Button>
        </div>
      </div>

      {/* JSON Mode */}
      {queryMode === 'json' && (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-300 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Filter
            </div>
            <SyntaxHighlightedEditor
              value={jsonFilterText}
              onChange={onJsonFilterChange}
              tokenize={tokenizeJson}
              placeholder='{ "field": "value" }  (Ctrl+Shift+F to format)'
              minHeight="80px"
              onBlur={handleJsonFormat}
              onKeyDown={handleJsonKeyDown}
              highlightPosition={!jsonValidation.valid ? jsonValidation.details?.position : undefined}
              className={`${
                jsonValidation.valid
                  ? jsonFilterText !== '{}'
                    ? 'border-l-2 border-l-green-400'
                    : ''
                  : 'border-l-2 border-l-red-400'
              }`}
            />
            {!jsonValidation.valid && (
              <div className="border-t border-gray-200 bg-red-50 px-3 py-2 text-[10px] text-red-600">
                <div className="mb-1 font-semibold">Syntax Error</div>
                <div>{jsonValidation.error}</div>
                {jsonValidation.details?.lineContent && (
                  <pre className="mt-1 overflow-x-auto whitespace-pre rounded bg-red-100/60 px-2 py-1 font-mono leading-relaxed">
                    <span>{jsonValidation.details.lineContent}</span>
                    {'\n'}
                    <span className="text-red-500 font-bold">{jsonValidation.details.pointer}</span>
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Options panel */}
          {showOptions && (
            <div className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Query Options
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <ValidatedJsonInput
                  label="Project"
                  value={jsonOptions.project || ''}
                  onChange={v => onJsonOptionsChange({ ...jsonOptions, project: v })}
                  placeholder='{ "field": 0 }'
                  validate={validateProjectJson}
                  minHeight="36px"
                />
                <ValidatedJsonInput
                  label="Sort"
                  value={jsonOptions.sort || ''}
                  onChange={v => onJsonOptionsChange({ ...jsonOptions, sort: v })}
                  placeholder='{ "createdAt": -1 }'
                  validate={validateSortJson}
                  minHeight="36px"
                />
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-gray-600">Collation</label>
                  <input
                    type="text"
                    readOnly
                    className="h-8 w-full rounded border border-gray-200 bg-gray-50 px-2 font-mono text-xs text-gray-400"
                    placeholder="Not supported"
                  />
                </div>
                <ValidatedNumericInput
                  label="Skip"
                  value={jsonOptions.skip}
                  onChange={v => onJsonOptionsChange({ ...jsonOptions, skip: v })}
                  placeholder="0"
                  min={0}
                />
                <ValidatedNumericInput
                  label="Limit"
                  value={jsonOptions.limit}
                  onChange={v => onJsonOptionsChange({ ...jsonOptions, limit: v })}
                  placeholder="0"
                  min={0}
                />
                <ValidatedNumericInput
                  label="Max Time MS"
                  value={jsonOptions.maxTimeMS}
                  onChange={v => onJsonOptionsChange({ ...jsonOptions, maxTimeMS: v })}
                  placeholder="60000"
                  min={0}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Mode (existing clause builder) */}
      {queryMode === 'visual' && (
        <div>
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

                    {!hideValueInput && (
                      <div className="min-w-[150px] flex-1">
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

          {/* Sort + Limit panel */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-purple-100/60 pt-4">
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
          </div>
        </div>
      )}

      {/* Shell Mode */}
      {queryMode === 'shell' && (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-300 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              MongoDB Shell Command
            </div>
            <SyntaxHighlightedEditor
              value={shellCommandText}
              onChange={onShellCommandChange}
              tokenize={tokenizeShell}
              placeholder={'db.collection.find({ "field": "value" }).sort({ "_id": -1 }).limit(10)  (Ctrl+Shift+F to format)'}
              minHeight="100px"
              onBlur={handleShellFormat}
              onKeyDown={handleShellKeyDown}
              highlightPosition={!shellValidation.valid ? shellValidation.details?.position : undefined}
              className={`${
                shellValidation.valid
                  ? shellCommandText !== ''
                    ? 'border-l-2 border-l-green-400'
                    : ''
                  : 'border-l-2 border-l-red-400'
              }`}
            />
            {!shellValidation.valid && (
              <div className="border-t border-gray-200 bg-red-50 px-3 py-2 text-[10px] text-red-600">
                <div className="mb-1 font-semibold">Parse Error</div>
                <div>{shellValidation.error}</div>
                {shellValidation.details?.lineContent && (
                  <pre className="mt-1 overflow-x-auto whitespace-pre rounded bg-red-100/60 px-2 py-1 font-mono leading-relaxed">
                    <span>{shellValidation.details.lineContent}</span>
                    {'\n'}
                    <span className="text-red-500 font-bold">{shellValidation.details.pointer}</span>
                  </pre>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400">
            Supported: <code className="rounded bg-gray-100 px-1">find()</code>,{' '}
            <code className="rounded bg-gray-100 px-1">aggregate()</code>,{' '}
            <code className="rounded bg-gray-100 px-1">countDocuments()</code>,{' '}
            <code className="rounded bg-gray-100 px-1">distinct()</code>.
            Chain with <code className="rounded bg-gray-100 px-1">.sort()</code>,{' '}
            <code className="rounded bg-gray-100 px-1">.limit()</code>,{' '}
            <code className="rounded bg-gray-100 px-1">.skip()</code>,{' '}
            <code className="rounded bg-gray-100 px-1">.project()</code>.
          </p>

          {/* Show options panel for shell too (project/sort/limit/skip from GUI override) */}
          {showOptions && (
            <div className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Shell Options (override chain methods)
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <ValidatedNumericInput
                  label="Max Time MS"
                  value={jsonOptions.maxTimeMS}
                  onChange={v => onJsonOptionsChange({ ...jsonOptions, maxTimeMS: v })}
                  placeholder="60000"
                  min={0}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}