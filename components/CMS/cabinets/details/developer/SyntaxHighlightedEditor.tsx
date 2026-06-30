'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';

// ============================================================================
// Token types & color map (Compass-inspired light theme)
// ============================================================================

type JsonTokenType =
  | 'key'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'punctuation'
  | 'method'
  | 'keyword'
  | 'plain';

const TOKEN_COLORS: Record<JsonTokenType, string> = {
  key: 'text-blue-600',
  string: 'text-red-700',
  number: 'text-emerald-700',
  boolean: 'text-blue-600',
  null: 'text-blue-600',
  punctuation: 'text-gray-500',
  method: 'text-purple-700',
  keyword: 'text-gray-500',
  plain: 'text-gray-700',
};

// ============================================================================
// JSON tokenizer
// ============================================================================

/** Single-pass JSON tokenizer. Handles partial/invalid JSON without crashing. */
function tokenizeJson(text: string): { text: string; className: string }[] {
  const tokens: { text: string; className: string }[] = [];
  const len = text.length;
  let index = 0;

  const emit = (type: JsonTokenType, slice: string) => {
    tokens.push({ text: slice, className: TOKEN_COLORS[type] });
  };

  while (index < len) {
    const ch = text[index];

    // Whitespace
    if (/\s/.test(ch)) {
      let ws = '';
      while (index < len && /\s/.test(text[index])) {
        ws += text[index];
        index++;
      }
      emit('plain', ws);
      continue;
    }

    // String (double-quoted)
    if (ch === '"') {
      const start = index;
      index++;
      while (index < len && text[index] !== '"') {
        if (text[index] === '\\' && index + 1 < len) index++;
        index++;
      }
      if (index < len) index++; // closing quote
      const str = text.slice(start, index);

      // Peek ahead (skip whitespace) for colon → it's a key
      let lookahead = index;
      while (lookahead < len && /\s/.test(text[lookahead])) lookahead++;
      const isKey = text[lookahead] === ':';
      emit(isKey ? 'key' : 'string', str);
      continue;
    }

    // Number
    if (ch === '-' || ch === '+' || (ch >= '0' && ch <= '9')) {
      const start = index;
      if (ch === '-' || ch === '+') index++;
      while (index < len && ((text[index] >= '0' && text[index] <= '9') || text[index] === '.')) {
        index++;
      }
      if (index < len && (text[index] === 'e' || text[index] === 'E')) {
        index++;
        if (index < len && (text[index] === '+' || text[index] === '-')) index++;
        while (index < len && text[index] >= '0' && text[index] <= '9') index++;
      }
      emit('number', text.slice(start, index));
      continue;
    }

    // true / false / null
    if (text.startsWith('true', index) && (index + 4 >= len || !/[$\w]/.test(text[index + 4]))) {
      emit('boolean', 'true');
      index += 4;
      continue;
    }
    if (text.startsWith('false', index) && (index + 5 >= len || !/[$\w]/.test(text[index + 5]))) {
      emit('boolean', 'false');
      index += 5;
      continue;
    }
    if (text.startsWith('null', index) && (index + 4 >= len || !/[$\w]/.test(text[index + 4]))) {
      emit('null', 'null');
      index += 4;
      continue;
    }

    // Punctuation
    if ('{}[]:,'.includes(ch)) {
      emit('punctuation', ch);
      index++;
      continue;
    }

    // Fallback — any other character
    const start = index;
    index++;
    emit('plain', text.slice(start, index));
  }

  return tokens;
}

// ============================================================================
// Shell tokenizer (MongoDB shell commands)
// ============================================================================

function tokenizeShell(text: string): { text: string; className: string }[] {
  const tokens: { text: string; className: string }[] = [];
  const len = text.length;
  let index = 0;

  const emit = (type: JsonTokenType, slice: string) => {
    tokens.push({ text: slice, className: TOKEN_COLORS[type] });
  };

  while (index < len) {
    const ch = text[index];

    // Whitespace
    if (/\s/.test(ch)) {
      let ws = '';
      while (index < len && /\s/.test(text[index])) { ws += text[index]; index++; }
      emit('plain', ws);
      continue;
    }

    // Double-quoted string (same as JSON for inside-object highlighting)
    if (ch === '"') {
      const start = index;
      index++;
      while (index < len && text[index] !== '"') {
        if (text[index] === '\\' && index + 1 < len) index++;
        index++;
      }
      if (index < len) index++;
      const str = text.slice(start, index);
      let lookahead = index;
      while (lookahead < len && /\s/.test(text[lookahead])) lookahead++;
      const isKey = text[lookahead] === ':';
      emit(isKey ? 'key' : 'string', str);
      continue;
    }

    // Numbers
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const start = index;
      if (ch === '-') index++;
      while (index < len && ((text[index] >= '0' && text[index] <= '9') || text[index] === '.')) index++;
      emit('number', text.slice(start, index));
      continue;
    }

    // true / false / null
    if (text.startsWith('true', index) && (index + 4 >= len || !/[$\w]/.test(text[index + 4]))) {
      emit('boolean', 'true'); index += 4; continue;
    }
    if (text.startsWith('false', index) && (index + 5 >= len || !/[$\w]/.test(text[index + 5]))) {
      emit('boolean', 'false'); index += 5; continue;
    }
    if (text.startsWith('null', index) && (index + 4 >= len || !/[$\w]/.test(text[index + 4]))) {
      emit('null', 'null'); index += 4; continue;
    }

    // Punctuation
    if ('{}[]():,'.includes(ch)) {
      emit('punctuation', ch);
      index++;
      continue;
    }

    // Method names: .find() .sort() .limit() .skip() .project() .aggregate() .countDocuments() .distinct()
    if (ch === '.') {
      index++;
      let method = '';
      while (index < len && /[$\w]/.test(text[index]) && text[index] !== '(') {
        method += text[index];
        index++;
      }
      if (
        ['find', 'sort', 'limit', 'skip', 'project', 'aggregate', 'countDocuments', 'distinct'].includes(method)
      ) {
        emit('punctuation', '.');
        emit('method', method);
      } else {
        emit('punctuation', '.' + method);
      }
      continue;
    }

    // db prefix
    if (ch === 'd' && text.startsWith('db', index) && (index + 2 >= len || text[index + 2] === '.')) {
      emit('keyword', 'db');
      index += 2;
      continue;
    }

    // Single-character fallback
    emit('plain', ch);
    index++;
  }

  return tokens;
}

// ============================================================================
// SyntaxHighlightedEditor
// ============================================================================

type SyntaxHighlightedEditorProps = {
  value: string;
  onChange: (v: string) => void;
  tokenize: (text: string) => { text: string; className: string }[];
  placeholder?: string;
  minHeight?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  /** When set, auto-focuses and selects the character at this offset */
  highlightPosition?: number;
};

export default function SyntaxHighlightedEditor({
  value,
  onChange,
  tokenize,
  placeholder,
  minHeight = '80px',
  className = '',
  onKeyDown,
  onBlur,
  highlightPosition,
}: SyntaxHighlightedEditorProps) {
  const overlayRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const highlighted = useMemo(() => {
    const tokens = tokenize(value);
    const parts: { text: string; className: string }[] = [];

    // Collapse consecutive tokens with same class into one span
    for (const token of tokens) {
      const last = parts[parts.length - 1];
      if (last && last.className === token.className) {
        last.text += token.text;
      } else {
        parts.push({ text: token.text, className: token.className });
      }
    }
    return parts;
  }, [value, tokenize]);

  // Auto-focus and select on error position
  useEffect(() => {
    if (highlightPosition !== undefined && highlightPosition >= 0 && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      const end = Math.min(highlightPosition + 1, ta.value.length);
      ta.setSelectionRange(highlightPosition, end);
    }
  }, [highlightPosition]);

  const isEmpty = value.length === 0;

  return (
    <div className="relative">
      {/* Colored overlay */}
      <pre
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-[1.35]"
        style={{
          padding: '8px 12px',
          minHeight,
          margin: 0,
          // Match textarea styling exactly
        }}
        aria-hidden="true"
      >
        {isEmpty && placeholder ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          highlighted.map((part, i) => (
            <span key={i} className={part.className}>
              {part.text}
            </span>
          ))
        )}
      </pre>

      {/* Transparent textarea for input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        spellCheck={false}
        className={`relative block w-full resize-y bg-transparent text-transparent caret-gray-800 font-mono text-xs leading-[1.35] focus:outline-none ${className}`}
        style={{
          padding: '8px 12px',
          minHeight,
          // Match pre exactly
        }}
      />
    </div>
  );
}

export { tokenizeJson, tokenizeShell };
