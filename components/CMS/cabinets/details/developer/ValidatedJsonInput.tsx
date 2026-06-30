'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import SyntaxHighlightedEditor, {
  tokenizeJson,
} from './SyntaxHighlightedEditor';

type ValidationResult = {
  valid: boolean;
  error: string;
  formatted?: string;
  position?: number | null;
};

type ValidatedJsonInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  validate: (text: string) => ValidationResult;
  minHeight?: string;
  readOnly?: boolean;
};

export default function ValidatedJsonInput({
  value,
  onChange,
  placeholder,
  label,
  validate,
  minHeight = '36px',
  readOnly = false,
}: ValidatedJsonInputProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const validation = useMemo(() => {
    if (!debouncedValue || debouncedValue.trim() === '' || debouncedValue.trim() === '{}') {
      return { valid: true, error: '', formatted: undefined, position: undefined };
    }
    return validate(debouncedValue);
  }, [debouncedValue, validate]);

  const handleFormat = useCallback(() => {
    if (!value || value.trim() === '' || value.trim() === '{}') return;
    const result = validate(value);
    if (result.valid && result.formatted && result.formatted !== value) {
      onChange(result.formatted);
    }
  }, [value, validate, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
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
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        handleFormat();
      }
    },
    [value, onChange, handleFormat]
  );

  const borderColor = readOnly
    ? 'border-gray-200'
    : !value || value.trim() === '' || value.trim() === '{}'
      ? 'border-gray-300'
      : validation.valid
        ? 'border-green-400'
        : 'border-red-400';

  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-gray-600">{label}</label>
      <div className={`rounded-md border ${borderColor} bg-white transition-colors`}>
        <SyntaxHighlightedEditor
          value={value}
          onChange={readOnly ? () => {} : onChange}
          tokenize={tokenizeJson}
          placeholder={placeholder}
          minHeight={minHeight}
          onBlur={readOnly ? undefined : handleFormat}
          onKeyDown={readOnly ? undefined : handleKeyDown}
          highlightPosition={!validation.valid && validation.position != null ? validation.position : undefined}
          className={readOnly ? 'pointer-events-none opacity-60' : ''}
        />
      </div>
      {!validation.valid && validation.error && (
        <div className="mt-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
          {validation.error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Numeric option input with validation
// ============================================================================

type ValidatedNumericInputProps = {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  label: string;
  min?: number;
  readOnly?: boolean;
};

export function ValidatedNumericInput({
  value,
  onChange,
  placeholder,
  label,
  min = 0,
  readOnly = false,
}: ValidatedNumericInputProps) {
  const [error, setError] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === null) {
        onChange(undefined);
        setError('');
        return;
      }
      const num = parseInt(raw, 10);
      if (!Number.isFinite(num)) {
        setError(`${label} must be a number`);
        return;
      }
      if (!Number.isInteger(num)) {
        setError(`${label} must be a whole number`);
        return;
      }
      if (num < min) {
        setError(`${label} must be ≥ ${min}`);
        return;
      }
      setError('');
      onChange(num);
    },
    [onChange, label, min]
  );

  const hasValue = value !== undefined && value !== null && String(value) !== '';
  const borderColor = readOnly
    ? 'border-gray-200'
    : !hasValue
      ? 'border-gray-300'
      : error
        ? 'border-red-400'
        : 'border-green-400';

  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-gray-600">{label}</label>
      <input
        type="number"
        min={min}
        value={value ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`h-8 w-full rounded-md border ${borderColor} bg-white px-2 font-mono text-xs text-gray-700 transition-colors focus:border-purple-500 focus:ring-purple-500`}
      />
      {error && (
        <div className="mt-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
