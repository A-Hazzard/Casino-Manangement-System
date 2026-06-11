---
name: react-typescript-rules
description: React imports, TypeScript discipline, state management patterns, and type organization rules.
---

# React & TypeScript Rules

Use when **writing React components and managing state** across the application.

## React Imports - CRITICAL

**NEVER import React namespace:**

```typescript
// ❌ WRONG
import React from 'react';
import * as React from 'react';
React.useState(); // Never use this

// ✅ CORRECT - Direct imports
import { useState, useEffect, useMemo, useCallback, FC } from 'react';
```

**Common direct imports:**

- Hooks: `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useContext`, `useReducer`
- Types: `FC`, `ReactNode`, `ReactElement`, `PropsWithChildren`, `ComponentPropsWithoutRef`
- Utilities: `forwardRef`, `memo`, `Children`, `createContext`, `Fragment`

## TypeScript Discipline

### No `any` Allowed

```typescript
// ❌ WRONG
const data: any = await fetchData();

// ✅ CORRECT - Proper types
import { type LocationData } from '@/shared/types/entities';
const data: LocationData = await fetchData();
```

### Avoid `Record` Type (Rule 13)

Prefer specific types over generic `Record` types. `Record<string, unknown>` obscures type clarity.

```typescript
// ❌ WRONG — lazy Record type
const updateFields: Record<string, unknown> = {};

// ✅ CORRECT — specific type or Pick
type MachineUpdateFields = Partial<
  Pick<MachineDocument, 'serialNumber' | 'game' | 'assetStatus'>
> & {
  updatedAt: Date;
};
const updateFields: MachineUpdateFields = { updatedAt: new Date() };
```

### Shared Types Structure

Use appropriate directories:

```
shared/types/        # Shared frontend + backend
├── api.ts           # API request/response types
├── entities.ts      # Core entity types (User, Location, Machine)
├── auth.ts          # Authentication types
├── analytics.ts     # Dashboard and analytics types
└── index.ts         # Central export point

lib/types/           # Frontend-only types
app/api/lib/types/   # Backend-only types (API helpers, DB logic)
types/               # Application-wide/Global types
```

### Type Organization Rules

1. **Always import from type files**, never define inline
2. **`type` over `interface` — always**: Never use `interface` for data structures
3. **Explicit Return Types** are required for all helpers and API functions
4. **Explicit Unions over Enums**: Use `'active' | 'inactive'` instead of `enum Status`
5. **Check dependencies before deleting types** - use grep to find usages
6. **Avoid type duplication** - import and re-export from shared types

```typescript
// ❌ WRONG - Type defined inline
const MyComponent = (props: { name: string; age: number }) => {
  // ...
};

// ✅ CORRECT - Type imported from type file
import { type ComponentProps } from '@/lib/types/components';
const MyComponent = (props: ComponentProps) => {
  // ...
};

// Handle optional properties with fallback
const userName = user?.name || 'Unknown User';
```

## State Management Patterns

### Local Component State (useState)

```typescript
const [count, setCount] = useState<number>(0);
const [items, setItems] = useState<Item[]>([]);
```

### Multiple Related State (useReducer)

```typescript
import { useReducer } from 'react';

type State = { loading: boolean; error: string | null; data: Data[] };
type Action =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; payload: Data[] }
  | { type: 'ERROR'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH':
      return { ...state, loading: true };
    case 'SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'ERROR':
      return { ...state, loading: false, error: action.payload };
  }
};

const [state, dispatch] = useReducer(reducer, initialState);
```

### Application State (Zustand)

```typescript
import { create } from 'zustand';
import { type DashboardStore } from '@/lib/types/stores';

export const useDashboardStore = create<DashboardStore>(set => ({
  selectedLicencee: '',
  setSelectedLicencee: licencee => set({ selectedLicencee: licencee }),
  // ... other state
}));
```

### Shared State (Context API)

```typescript
import { createContext, useContext, ReactNode, FC } from 'react';

type ContextValue = {
  user: User | null;
  loading: boolean;
};

const Context = createContext<ContextValue | null>(null);

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const value: ContextValue = {
    user: null,
    loading: false
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useContext = () => {
  const context = useContext(Context);
  if (!context) throw new Error('Hook used outside provider');
  return context;
};
```

## Memoization Rules

### useMemo - Expensive Computations

```typescript
import { useMemo } from 'react';

// ✅ Use for expensive calculations
const totalRevenue = useMemo(
  () => meters.reduce((sum, m) => sum + m.movement.drop, 0),
  [meters]
);
```

### useCallback - Stable Function References

```typescript
import { useCallback } from 'react';

// ✅ Pass stable function to child components
const handleClick = useCallback(() => {
  // Handler logic
}, [dependency1, dependency2]);
```

### Avoid Over-Memoization

```typescript
// ❌ Not needed - primitive value
const count = useMemo(() => data.length, [data]);

// ✅ Just assign directly
const count = data.length;
```

## Component Type Definitions

```typescript
import { FC, ComponentPropsWithoutRef, ReactNode } from 'react';

// ✅ Use type, never interface
type MyComponentProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

const MyComponent: FC<MyComponentProps> = ({ title, onClose, children }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onClose}>Close</button>
      {children}
    </div>
  );
};

// ComponentPropsWithoutRef for extending HTML elements
type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary';
};

const Button: FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  return <button className={`btn-${variant}`} {...props} />;
};
```

## Explicit Enumerations (Rule 9)

Prefer string literal unions or `const enum` over numeric enums for better readability and serializability.

```typescript
// ✅ CORRECT
type ReportStatus = 'pending' | 'completed' | 'cancelled';
type GameType = 'slot' | 'roulette' | 'poker';
```

```typescript
// ❌ WRONG — numeric enum, less readable in JSON/API
enum ReportStatus {
  Pending = 0,
  Completed = 1,
  Cancelled = 2,
}
```

## JSDoc Type Documentation (Rule 12)

All JSDoc `@param` and `@returns` annotations MUST include proper TypeScript type annotations in curly braces.

### Rule

1. Always use `{Type}` format for parameter types
2. Match types to actual function signatures (use imported types when available)
3. Use `[paramName]` syntax for optional parameters
4. Do NOT add types to inline comments or module-level JSDoc blocks

### Example

```typescript
// ❌ WRONG — missing type braces
/**
 * @param body - The payload
 * @returns { isValid: boolean }
 */

// ✅ CORRECT — proper type annotations
/**
 * @param {Partial<CreateCollectionReportPayload>} body - The payload
 * @returns {{ isValid: boolean; error?: string }}
 */
```

## No Single-Letter Variables

**Never use single-letter names in components or hooks:**

```typescript
// ❌ WRONG
const total = items.reduce((s, c) => s + c.revenue, 0);
items.map((i) => <Row key={i.id} item={i} />);

// ✅ CORRECT
const total = items.reduce((sum, item) => sum + item.revenue, 0);
items.map((item) => <Row key={item.id} item={item} />);
```

## Component Structure Order

**Components must follow this exact section order:**

```typescript
export default function ComponentName(props: ComponentProps) {
  // ============================================================================
  // 1. Hooks & State
  // ============================================================================
  const [data, setData] = useState<Item[]>([]);

  // ============================================================================
  // 2. Computed Values
  // ============================================================================
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  // ============================================================================
  // 3. Event Handlers
  // ============================================================================
  const handleSubmit = useCallback(() => { ... }, [data]);

  // ============================================================================
  // 4. Effects
  // ============================================================================
  useEffect(() => { ... }, [data]);

  // ============================================================================
  // 5. Render
  // ============================================================================
  return (
    // JSX
  );
}
```

## Type Checking

Run type check before committing:

```bash
bun run type-check
```

Strict mode enabled with:

- `noUnusedLocals`
- `noImplicitReturns`
- `noFallthroughCases`
- No `any` types allowed
