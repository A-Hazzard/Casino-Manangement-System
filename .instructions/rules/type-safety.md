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
// ✅ CORRECT
const [items, setItems] = useState<Machine[]>([]);
const inputRef = useRef<HTMLInputElement>(null);

function calculateTotal(data: Metric[]): number {
  return data.reduce((acc, curr) => acc + curr.value, 0);
}
```

---

## 5. Mongoose & Database Type Safety

- **Model Imports**: Always import models from `app/api/lib/models/`.
- **Finding Documents**: Use the Lean pattern for queries intended for the frontend to ensure the returned data matches our DTOs.
- **ID Patterns**: Document IDs are strings. Ensure types reflect `_id: string`.

---

## 6. Type Refinement & Validation

- Use Type Guards (`isCollectionReport`) or assertion functions to narrow down `unknown` types.
- When dealing with user input or external APIs, use validation (like Zod if available, or manual checks) before casting.

---

## 7. No Implicit Conversions

- Avoid using the bang operator `!` unless absolutely certain of existence.
- Prefer optional chaining `?.` and nullish coalescing `??`.

---

## 8. Explicit Enumerations

- Prefer string literal unions or `const enum` over numeric enums for better readability and serializability.

```typescript
// ✅ CORRECT
type ReportStatus = 'pending' | 'completed' | 'cancelled';

// ❌ AVOID
enum ReportStatus {
  Pending = 0,
  Completed = 1
}
```

---

## 9. Documentation of Complex Types

- Any type spanning more than 20 lines or containing nested complex logic MUST have JSDoc comments explaining the purpose of its fields.

---

**Summary:**  
Type safety is the backbone of our reliability. Use `bun run check` frequently to catch violations before they reach the main branch.
