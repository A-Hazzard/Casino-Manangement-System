---
name: React & TypeScript Rules
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
types/               # Application-wide types
```

### Type Organization Rules

1. **Always import from type files**, never define inline
2. **Prefer `type` over `interface`**
3. **Check dependencies before deleting types** - use grep to find usages
4. **Avoid type duplication** - import and re-export from shared types
5. **Handle type conflicts** - use proper fallback logic

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
type Action = { type: 'FETCH' } | { type: 'SUCCESS'; payload: Data[] } | { type: 'ERROR'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH': return { ...state, loading: true };
    case 'SUCCESS': return { ...state, loading: false, data: action.payload };
    case 'ERROR': return { ...state, loading: false, error: action.payload };
  }
};

const [state, dispatch] = useReducer(reducer, initialState);
```

### Application State (Zustand)

```typescript
import { create } from 'zustand';
import { type DashboardStore } from '@/lib/types/stores';

export const useDashboardStore = create<DashboardStore>((set) => ({
  selectedLicencee: '',
  setSelectedLicencee: (licencee) => set({ selectedLicencee: licencee }),
  // ... other state
}));
```

### Shared State (Context API)

```typescript
import { createContext, useContext, ReactNode, FC } from 'react';

interface ContextValue {
  // Your types
}

const Context = createContext<ContextValue | null>(null);

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const value: ContextValue = {
    // Your values
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

// Option 1: FC with explicit props type
interface MyComponentProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const MyComponent: FC<MyComponentProps> = ({ title, onClose, children }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onClose}>Close</button>
      {children}
    </div>
  );
};

// Option 2: ComponentPropsWithoutRef for extending HTML elements
type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary';
};

const Button: FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  return <button className={`btn-${variant}`} {...props} />;
};
```

## Type Checking

Run type check before committing:

```bash
pnpm run type-check
```

Strict mode enabled with:
- `noUnusedLocals`
- `noImplicitReturns`
- `noFallthroughCases`
- No `any` types allowed
