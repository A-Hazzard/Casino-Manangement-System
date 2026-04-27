 ---
description: Strict TypeScript & Type-Safety Rules - Core guidelines for maintaining a zero-any, robustly typed codebase
globs:
  - '**/*.ts'
  - '**/*.tsx'
  - 'shared/types/**/*.ts'
  - 'lib/types/**/*.ts'
  - 'app/api/lib/types/**/*.ts'
alwaysApply: true
---

# Strict TypeScript & Type-Safety Rules

This document defines the strict type-safety standards for the Evolution One CMS project. These rules are non-negotiable and must be enforced during development and code reviews.

## 1. Zero-Any Policy

**RULE**: The usage of `any` is strictly prohibited.

- ❌ **NEVER** use `any` as a type for variables, parameters, or return types.
- ✅ **ALWAYS** define a concrete `type` or `interface`.
- ✅ **USE** `unknown` if the type truly cannot be determined at compile time (e.g., initial API parsing), but cast to a concrete type immediately after validation.

**Incorrect:**
```typescript
const handleData = (data: any) => {
  console.log(data.id);
};
```

**Correct:**
```typescript
import { CollectionData } from '@/shared/types';

const handleData = (data: CollectionData) => {
  console.log(data.id);
};
```

---

## 2. Type Location Hierarchy

To prevent circular dependencies and maintain a single source of truth, types MUST be stored in specific directories based on their scope:

| Scope | Directory | Use Case |
| :--- | :--- | :--- |
| **Shared** | `shared/types/` | Types used in BOTH Frontend and Backend (e.g., Models, DTOs). |
| **Frontend** | `lib/types/` | Types used ONLY in components, hooks, or client utilities. |
| **API/Backend** | `app/api/lib/types/` | Types used ONLY in API routes, helpers, or database operations. |
| **Global** | `types/` | Global definitions, environment variables, or polyfills. |

---

## 3. Prefer `type` over `interface`

For consistency across the project, use the `type` keyword for defining data structures.

- ✅ **ALWAYS** use `type MyType = { ... }`.
- ❌ **AVOID** using `interface MyInterface { ... }` unless forced by library requirements or declaration merging.

---

## 4. Explicit Type Annotations

While TypeScript can infer many types, explicit annotations are required for complex logic to improve readability and prevent regressions.

- ✅ **ALWAYS** annotate function return types in helpers and API routes.
- ✅ **ALWAYS** annotate `useState` hooks if the initial value is `null`, `undefined`, or an empty array.
- ✅ **ALWAYS** use explicit Generic parameters for `Zustand` stores and `React.useRef`.

```typescript
const [items, setItems] = useState<Machine[]>([]);
const inputRef = useRef<HTMLInputElement>(null);

function calculateTotal(data: Metric[]): number {
  return data.reduce((acc, curr) => acc + curr.value, 0);
}
```

---

## 5. Mongoose & Database Type Safety

- **Model Imports**: Always import models from `app/api/lib/models/`.
- **ID Patterns**: Document IDs are strings. Ensure types reflect `_id: string`.
- **No `Record<string, unknown>` casts on query results**: Always type the result through the query generic instead.

### `.lean<T>()` — Required for all document queries

Every `findOne`, `find`, `findOneAndUpdate`, and similar queries MUST specify the return type via the lean generic. This gives you a plain JS object typed as your DTO — no Mongoose document overhead, no `Record` casting.

```typescript
// ❌ WRONG — untyped, forces Record<string, unknown> downstream
const machine = await Machine.findOne({ _id: id }).lean();

// ✅ CORRECT — typed at the query, no casting needed anywhere
const machine = await Machine.findOne({ _id: id }).lean<GamingMachine>();
if (!machine) return;
machine.collectionMeters; // typed as { metersIn: number; metersOut: number } | undefined
```

For `find`, lean returns `T[]`:

```typescript
const machines = await Machine.find({ gamingLocation: locationId }).lean<GamingMachine[]>();
```

### `.cursor().toArray()` — For large result sets

When iterating large collections, prefer `.cursor()` over loading all documents into memory with `find()`. Always apply `.lean<T>()` before `.cursor()` so each document is typed:

```typescript
// ❌ WRONG — loads everything into memory, untyped
const machines = await Machine.find({}).lean();

// ✅ CORRECT — streams documents, fully typed
const machines = await Machine.find({}).lean<GamingMachine>().cursor().toArray();
```

Use `cursor().toArray()` when the result set could be large (hundreds of documents or more). For small, bounded queries (single document, small known sets), `.lean<T>()` alone is sufficient.

### Aggregation pipelines

Use the `Aggregate<T[]>` generic on aggregation so `.exec()` returns a typed array instead of `any[]`:

```typescript
// ❌ WRONG
const results = await Machine.aggregate([...]).exec(); // any[]

// ✅ CORRECT
const results = await Machine.aggregate<GamingMachine>([...]).exec(); // GamingMachine[]
```

### Priority order for query patterns

1. `.lean<T>()` — single documents or small bounded sets
2. `.lean<T>().cursor().toArray()` — large or unbounded result sets
3. `.aggregate<T>([...]).exec()` — aggregation pipelines

---

## 6. No Comments in Type Files

Type files in `shared/types/`, `lib/types/`, and `app/api/lib/types/` must contain **zero comments** — no `//`, no `/* */`, no JSDoc `/** */`. Type names and field names must be self-documenting. If a type requires explanation, that explanation belongs in the CLAUDE.md or an `.instructions` rule file, not inline in the type file.

---

## 7. Type Refinement & Validation

- Use Type Guards (`isCollectionReport`) or assertion functions to narrow down `unknown` types.
- When dealing with user input or external APIs, use validation (like Zod if available, or manual checks) before casting.

---

## 8. No Implicit Conversions

- Avoid using the bang operator `!` unless absolutely certain of existence.
- Prefer optional chaining `?.` and nullish coalescing `??`.

---

## 9. Explicit Enumerations

- Prefer string literal unions or `const enum` over numeric enums for better readability and serializability.

```typescript
type ReportStatus = 'pending' | 'completed' | 'cancelled';
```

---

## 10. Function Parameter Guards

All exported and internal functions MUST validate required parameters at the start of the function body. Guards prevent unnecessary database queries or logic execution when critical parameters are missing.

### Rule
1. Check mandatory parameters immediately after function signature
2. Log errors with the function name as prefix: `[FunctionName] paramName is required`
3. Return early with a failure result or `undefined`
4. Do NOT use inline `if` checks scattered throughout the function body

### Required Guards
- **Mandatory IDs** (`_id`, `machineId`, `locationReportId`, etc.): Must exist and be non-empty strings
- **Mandatory numbers** (`metersIn`, `metersOut`, `amount`, etc.): Must be valid finite numbers (use `Number.isFinite()`)
- **Mandatory objects** (`body`, `payload`, `document`): Must be truthy and of correct type
- **Mandatory arrays** (`machines`, `items`): Must be arrays (use `Array.isArray()`)
- **Mandatory dates** (`timestamp`, `collectionTime`): Must be valid `Date` instances

### Optional Parameters
- Optional parameters (`?` or `| undefined`) should still be checked if used later in the function
- Log missing optional params at info level, not error

### Example

```typescript
// ❌ WRONG — scattered checks, no guards
async function updateMachine(machineId: string, data: UpdatePayload, optional?: string) {
  const machine = await Machine.findOne({ _id: machineId });
  if (machineId) {
    // ... process
  }
}

// ✅ CORRECT — guards at top, clean body
async function updateMachine(machineId: string, data: UpdatePayload, optional?: string): Promise<void> {
  if (!machineId) {
    console.error('[updateMachine] machineId is required');
    return;
  }

  if (!data || typeof data !== 'object') {
    console.error('[updateMachine] data is required');
    return;
  }

  if (optional) {
    console.log(`[updateMachine] Processing with optional: ${optional}`);
  }

  const machine = await Machine.findOne({ _id: machineId });
  // ... rest of logic
}
```

---

## 11. Creation Flow vs Edit Flow Distinction

**CRITICAL RULE**: Never confuse the creation flow with the edit flow. They have different purposes and update different data.

### Creation Flow — When Report is Created
**When**: User clicks **"Create Report"** button
**Function**: `updateMachineCollectionData` in `reportCreation.ts`
**What it does**:
- Updates machine's `collectionMeters` (current → becomes new current)
- Pushes entry to `collectionMetersHistory`
- Sets collection's `prevIn`/`prevOut`
- **Machine meter state moves FORWARD**

### Edit Flow — When Collection Entry is Edited
**When**: User edits a collection entry (e.g., corrects meter readings)
**Function**: `PATCH /api/collection-reports/collections/[id]/route.ts`
**What it does**:
- Updates collection document with edited values
- Recalculates movement/sasMeters
- Updates `collectionMetersHistory` entry
- **Does NOT update machine's `collectionMeters`**

### Why the Distinction Matters
| Flow | Update Machine Meters? | Purpose |
|------|----------------------|---------|
| **Creation** | ✅ Yes | Actual collection event, meters progress |
| **Edit** | ❌ No | Fix typos/adjustments, meters stay same |

**Incorrect:**
```typescript
// Editing collection should NOT progress machine meter state
await Machine.findOneAndUpdate({ _id: machineId }, { $set: { collectionMeters: { metersIn: editedMetersIn } } });
```

**Correct:**
```typescript
// Only update collection document and history
await Collections.findOneAndUpdate({ _id: collectionId }, { $set: { metersIn: editedMetersIn } });
```

---

## 12. Error Logging in Catch Blocks

Use `console.error` with clean, readable messages. Avoid complex if statements in catch blocks.

### Rule
1. Never type annotate catch parameter (no `catch (e: any)` or `catch (e: unknown)`)
2. Always use `console.error` for errors
3. Prefix with function name: `[FunctionName]`
4. Log the message only, not the entire error object

### Correct Pattern

```typescript
// ❌ WRONG — type annotation, logging entire error
} catch (e: unknown) {
  console.error(e);
}

// ❌ WRONG — no function name prefix
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Unknown error');
}

// ✅ CORRECT — simple, clean, prefixed
} catch (e) {
  console.error('[FunctionName] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

### Backend (Node.js/Next.js API)

```typescript
} catch (e) {
  console.error('[createCollection] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

### Frontend (React)

```typescript
} catch (e) {
  console.error('[useCollection] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

### MongoDB-Specific Queries (Mongoose)

```typescript
// For .catch() on promises
}).catch((e) => {
  console.error('[updateMachine] DB Error:', e instanceof Error ? e.message : 'Unknown error');
});
```

### Never Do This

```typescript
// ❌ Logging entire MongoDB error object (verbose, unreadable)
console.error(e);

// ❌ Complex type checking in catch
console.error(e instanceof Error && e.message ? e.message : typeof e === 'string' ? e : e?.errmsg);
```

---

**Summary:**
Type safety is the backbone of our reliability. Use `bun run check` frequently to catch violations before they reach the main branch.
