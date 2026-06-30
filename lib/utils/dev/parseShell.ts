/**
 * Client-side MongoDB shell command parser and formatter.
 *
 * Mirrors the server-side parser in
 * app/api/lib/helpers/dev/collectionQuery.ts so the frontend can validate and
 * format shell commands before sending. Zero backend dependencies — all pure
 * functions.
 */

type ParsedShellCommand = {
  type: 'find' | 'aggregate' | 'count' | 'distinct' | 'unknown';
  filter?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
  field?: string;
  options?: {
    sort?: Record<string, 1 | -1>;
    limit?: number;
    skip?: number;
    project?: Record<string, 0 | 1>;
  };
  raw: string;
};

function parseShellArg(
  text: string,
  start: number
): { value: unknown; end: number } | null {
  if (start >= text.length) return null;
  // Skip whitespace/newlines before the value
  let skipIndex = start;
  while (skipIndex < text.length && /[\s]/.test(text[skipIndex])) skipIndex++;
  if (skipIndex >= text.length) return null;
  start = skipIndex;
  // Object
  if (text[start] === '{') {
    let depth = 0;
    let end = start;
    for (let index = start; index < text.length; index++) {
      if (text[index] === '{') depth++;
      if (text[index] === '}') depth--;
      if (depth === 0) { end = index + 1; break; }
    }
    if (depth !== 0) return null;
    try {
      return { value: JSON.parse(text.slice(start, end)), end };
    } catch {
      const unquoted = text
        .slice(start, end)
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      try {
        return { value: JSON.parse(unquoted), end };
      } catch {
        return null;
      }
    }
  }
  // Array
  if (text[start] === '[') {
    let depth = 0;
    let end = start;
    for (let index = start; index < text.length; index++) {
      if (text[index] === '[') depth++;
      if (text[index] === ']') depth--;
      if (depth === 0) { end = index + 1; break; }
    }
    if (depth !== 0) return null;
    try {
      return { value: JSON.parse(text.slice(start, end)), end };
    } catch {
      return null;
    }
  }
  // String
  if (text[start] === "'" || text[start] === '"') {
    const quote = text[start];
    let end = start + 1;
    while (end < text.length && text[end] !== quote) {
      if (text[end] === '\\') end++;
      end++;
    }
    if (end >= text.length) return null;
    return { value: text.slice(start + 1, end), end: end + 1 };
  }
  return null;
}

function extractChainMethods(
  text: string,
  afterCall: number
): ParsedShellCommand['options'] {
  const options: ParsedShellCommand['options'] = {};
  const chainRegex = /\.\s*(sort|limit|skip|project)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = chainRegex.exec(text)) !== null) {
    if (match.index < afterCall) continue;
    const argStart = match.index + match[0].length;
    const arg = parseShellArg(text, argStart);
    if (!arg) continue;
    switch (match[1]) {
      case 'sort':
        options.sort = arg.value as Record<string, 1 | -1>;
        break;
      case 'limit':
        options.limit = Number(arg.value);
        break;
      case 'skip':
        options.skip = Number(arg.value);
        break;
      case 'project':
        options.project = arg.value as Record<string, 0 | 1>;
        break;
    }
  }
  return options;
}

export function parseShellCommand(command: string): ParsedShellCommand {
  const trimmed = command.trim();
  const result: ParsedShellCommand = { type: 'unknown', raw: trimmed };
  const stripped = trimmed.replace(/^db\.\w+\s*\.\s*/, '');

  // find({...})
  const findMatch = stripped.match(/^find\s*\(/);
  if (findMatch) {
    const argStart = findMatch.index! + findMatch[0].length;
    const arg = parseShellArg(stripped, argStart);
    if (!arg) return result;
    result.type = 'find';
    result.filter = arg.value as Record<string, unknown>;
    result.options = extractChainMethods(stripped, arg.end);
    return result;
  }

  // aggregate([...])
  const aggMatch = stripped.match(/^aggregate\s*\(/);
  if (aggMatch) {
    const argStart = aggMatch.index! + aggMatch[0].length;
    const arg = parseShellArg(stripped, argStart);
    if (!arg) return result;
    result.type = 'aggregate';
    result.pipeline = arg.value as Record<string, unknown>[];
    return result;
  }

  // countDocuments({...})
  const countMatch = stripped.match(/^countDocuments\s*\(/);
  if (countMatch) {
    const argStart = countMatch.index! + countMatch[0].length;
    const arg = parseShellArg(stripped, argStart);
    if (!arg) return result;
    result.type = 'count';
    result.filter = arg.value as Record<string, unknown>;
    return result;
  }

  // distinct('field', {...})
  const distinctMatch = stripped.match(/^distinct\s*\(/);
  if (distinctMatch) {
    const argStart = distinctMatch.index! + distinctMatch[0].length;
    const fieldArg = parseShellArg(stripped, argStart);
    if (!fieldArg || typeof fieldArg.value !== 'string') return result;
    result.field = fieldArg.value;
    const filterArg = parseShellArg(stripped, fieldArg.end + 1);
    if (filterArg) {
      result.filter = filterArg.value as Record<string, unknown>;
    }
    result.type = 'distinct';
    return result;
  }

  return result;
}

/**
 * Determine whether a shell command is structurally valid (parseable).
 * Returns an object with `{ valid, error? }` — designed for the UI validation
 * indicator.
 */
export function validateShellCommand(command: string): {
  valid: boolean;
  error: string;
} {
  const trimmed = command.trim();
  if (!trimmed) return { valid: true, error: '' };

  // Must start with db.
  if (!/^db\./.test(trimmed)) {
    return { valid: false, error: 'Command must start with db.' };
  }

  // Must have a collection name
  const collectionMatch = trimmed.match(/^db\.(\w+)/);
  if (!collectionMatch || !collectionMatch[1]) {
    return { valid: false, error: 'Missing collection name after db.' };
  }

  const parsed = parseShellCommand(trimmed);
  if (parsed.type === 'unknown') {
    // Detect method with parentheses — the parser tried but failed on args
    const hasMethod = /\.\s*(find|aggregate|countDocuments|distinct)\s*\(/.test(
      trimmed
    );
    if (hasMethod) {
      // Check for unquoted keys that start with $ (common issue)
      if (/\$\w+\s*:/.test(trimmed)) {
        return {
          valid: false,
          error:
            'Shell expects JSON syntax — keys starting with $ must be double-quoted. Use: {"$match": ...} instead of {$match: ...}',
        };
      }
      // Check for unquoted object keys (common mistake)
      if (/[{,]\s*[a-zA-Z_$]\w*\s*:(?!\\)/.test(trimmed) && !/[{,]\s*"[a-zA-Z_]/.test(trimmed.replace(/\$\w+/g, ''))) {
        return {
          valid: false,
          error:
            'Object keys must be double-quoted. Use: {"field": value} instead of {field: value}',
        };
      }
      return {
        valid: false,
        error:
          'Could not parse command arguments. Check that objects are valid JSON, braces are balanced, and commas are not missing.',
      };
    }
    return {
      valid: false,
      error:
        'Unrecognised command. Use: db.collection.find(), .aggregate(), .countDocuments(), or .distinct()',
    };
  }

  return { valid: true, error: '' };
}

// ============================================================================
// Formatter — reconstructs the shell command with indented JSON
// ============================================================================

function formatChainOptions(
  options: NonNullable<ParsedShellCommand['options']>
): string {
  const parts: string[] = [];
  if (options.sort) {
    parts.push(`\n.sort(${JSON.stringify(options.sort, null, 2)})`);
  }
  if (options.skip !== undefined) {
    parts.push(`\n.skip(${options.skip})`);
  }
  if (options.limit !== undefined) {
    parts.push(`\n.limit(${options.limit})`);
  }
  if (options.project) {
    parts.push(`\n.project(${JSON.stringify(options.project, null, 2)})`);
  }
  return parts.join('');
}

/**
 * Reformats a shell command with properly indented JSON arguments.
 *
 * @example
 *   input:  db.col.find({"a":1}).sort({"_id":-1}).limit(10)
 *   output: db.col.find({\n  "a": 1\n})\n.sort({\n  "_id": -1\n})\n.limit(10)
 */
export function formatShellCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) return command;

  const parsed = parseShellCommand(trimmed);
  if (parsed.type === 'unknown') return command;

  const collectionMatch = trimmed.match(/^db\.(\w+)/);
  const collection = collectionMatch ? collectionMatch[1] : '';
  const dbPrefix = `db.${collection}.`;

  switch (parsed.type) {
    case 'find': {
      const filter = parsed.filter || {};
      const filterStr = JSON.stringify(filter, null, 2);
      let result = `${dbPrefix}find(${filterStr})`;
      if (parsed.options) {
        result += formatChainOptions(parsed.options);
      }
      return result;
    }
    case 'aggregate': {
      const pipeline = parsed.pipeline || [];
      const pipelineStr = JSON.stringify(pipeline, null, 2);
      return `${dbPrefix}aggregate(${pipelineStr})`;
    }
    case 'count': {
      const filter = parsed.filter || {};
      const filterStr = JSON.stringify(filter, null, 2);
      return `${dbPrefix}countDocuments(${filterStr})`;
    }
    case 'distinct': {
      const field = parsed.field || '';
      if (parsed.filter && Object.keys(parsed.filter).length > 0) {
        const filterStr = JSON.stringify(parsed.filter, null, 2);
        return `${dbPrefix}distinct("${field}", ${filterStr})`;
      }
      return `${dbPrefix}distinct("${field}")`;
    }
    default:
      return command;
  }
}
