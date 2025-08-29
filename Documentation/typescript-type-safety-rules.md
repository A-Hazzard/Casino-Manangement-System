# TypeScript Type Safety Rules

**Author:** Aaron Hazzard - Senior Software Engineer

This document outlines the TypeScript type safety rules and organization structure for the Evolution1 Casino Management System.

## Type Organization Structure

### Three-Tier Type System

We implement a three-tier type organization system to ensure clear separation of concerns:

#### 1. **Shared Types** (`shared/types/`)
Types used across both frontend and backend:
- **Purpose**: Core entity types, API contracts, and common utilities
- **Location**: `shared/types/`
- **Examples**: `Licencee`, `GamingLocation`, `Machine`, `ApiResponse<T>`

#### 2. **Frontend Types** (`lib/types/`)
Types specific to frontend components and UI logic:
- **Purpose**: Component props, UI state, and frontend-specific utilities
- **Location**: `lib/types/`
- **Examples**: `ReportFilters`, `RealTimeMetrics`, `ComponentProps`

#### 3. **Backend Types** (`app/api/lib/types/`)
Types specific to API routes and backend logic:
- **Purpose**: Database operations, API request/response types, backend utilities
- **Location**: `app/api/lib/types/`
- **Examples**: `MongoQuery`, `PipelineStage`, `ActivityLogQueryParams`

## Core Type Safety Rules

### 1. **Prefer `type` over `interface`**
- **Rule**: Always use `type` aliases instead of `interface` declarations
- **Reason**: Better performance, tree-shaking, and consistency
- **Example**:
```typescript
// ✅ DO: Use type aliases
export type User = {
  id: string;
  email: string;
  roles: string[];
};

// ❌ DON'T: Use interfaces (deprecated pattern)
export interface User {
  id: string;
  email: string;
  roles: string[];
}
```

### 2. **No `any` Allowed**
- **Rule**: Never use `any` type - create proper type definitions
- **Reason**: Ensures type safety and prevents runtime errors
- **Example**:
```typescript
// ✅ DO: Create proper types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ❌ DON'T: Use any
export type ApiResponse = {
  success: boolean;
  data?: any;
  error?: string;
};
```

### 3. **Type Organization by Directory**
- **Rule**: All type definitions must reside in appropriate types directories
- **Structure**:
  - `shared/types/` - Shared between frontend and backend
  - `lib/types/` - Frontend-specific types
  - `app/api/lib/types/` - Backend-specific types
- **Prohibition**: Do not define types directly in component, helper, or utility files

### 4. **Import Types from Type Files**
- **Rule**: Always import types from their respective type files
- **Prohibition**: Avoid redefining types in multiple locations
- **Example**:
```typescript
// ✅ DO: Import from type files
import type { User } from "@/lib/types/user";
import type { ApiResponse } from "@shared/types/api";

// ❌ DON'T: Redefine types
type User = { id: string; email: string; }; // Redefinition
```

### 5. **Check Dependencies Before Deletion**
- **Rule**: Always check dependencies before deleting types or functions
- **Process**: Use `grep_search` to verify usage before removal
- **Tools**: Use search tools to find all usages of a type/function

### 6. **Avoid Type Duplication**
- **Rule**: Import and re-export from shared types instead of redefining
- **Pattern**: Use barrel exports for clean imports
- **Example**:
```typescript
// ✅ DO: Re-export from shared types
export type { User, Licencee, Machine } from "@shared/types/entities";

// ❌ DON'T: Redefine shared types
export type User = { /* duplicate definition */ };
```

## Type Organization Best Practices

### Shared Types Structure
```typescript
// shared/types/database.ts - Database-related types
export type DatabaseConfig = { /* ... */ };

// shared/types/entities.ts - Core entity types
export type Licencee = { /* ... */ };
export type GamingLocation = { /* ... */ };
export type Machine = { /* ... */ };

// shared/types/api.ts - API request/response types
export type ApiResponse<T> = { /* ... */ };
export type ApiError = { /* ... */ };

// shared/types/common.ts - Common utility types
export type DateRange = { start: Date; end: Date; };
export type TimePeriod = "Today" | "last7days" | "last30days" | "Custom";

// shared/types/auth.ts - Authentication types
export type UserAuthPayload = { /* ... */ };
export type AuthResult = { /* ... */ };
```

### Frontend Types Structure
```typescript
// lib/types/administration.ts - Admin-specific types
export type User = { /* ... */ };
export type SortKey = "username" | "email" | "roles";

// lib/types/cabinets.ts - Cabinet management types
export type Cabinet = { /* ... */ };
export type CabinetSortOption = "moneyIn" | "gross" | "assetNumber";

// lib/types/reports.ts - Reporting types
export type ReportConfig = { /* ... */ };
export type ReportData = { /* ... */ };
```

### Backend Types Structure
```typescript
// app/api/lib/types/analytics.ts - Analytics types
export type AnalyticsQuery = { /* ... */ };
export type PipelineStage = { /* ... */ };

// app/api/lib/types/auth.ts - Backend auth types
export type UserDocument = { /* ... */ };
export type LoginRequestBody = { /* ... */ };

// app/api/lib/types/activityLog.ts - Activity logging types
export type ActivityLog = { /* ... */ };
export type ActivityLogQueryParams = { /* ... */ };
```

## Type Safety Validation

### 1. **Frontend-Backend Type Consistency**
Before creating or modifying types that represent backend data:
1. **Trace the data flow** from API endpoint to frontend usage
2. **Check the original API source** in `app/api/` routes
3. **Verify database schema** if the type represents database entities
4. **Ensure shared types match** the actual API response structure

### 2. **Type Synchronization Workflow**
1. **Identify the API endpoint** that provides the data
2. **Examine the response structure** in the route handler
3. **Check database models** if applicable (MongoDB schemas)
4. **Update shared types** to match the actual data structure
5. **Verify frontend usage** aligns with the updated types

### 3. **Common Patterns to Check**
- **API response transformations** (e.g., `_id` to `id`, date formatting)
- **Optional vs required fields** based on API behavior
- **Nested object structures** and their relationships
- **Array types** and their element structures

## Validation Approach

### 1. **TypeScript Strict Mode**
- Use TypeScript strict mode to catch type mismatches
- Enable all strict type checking options
- Treat type errors as build failures

### 2. **API Testing**
- Test API endpoints to verify response structure
- Use runtime validation for critical data paths
- Validate against actual API responses

### 3. **Runtime Validation**
- Check runtime data in browser dev tools
- Validate against database schema for entity types
- Use type guards for critical data validation

## Performance Considerations

### 1. **Type Aliases vs Interface Declarations**
- Type aliases are more performant than interface declarations
- Better tree-shaking capabilities
- Reduced bundle size

### 2. **Import Optimization**
- Use specific imports instead of wildcard imports
- Leverage barrel exports for clean imports
- Avoid circular dependencies

### 3. **Type Inference**
- Let TypeScript infer types where possible
- Use explicit types only when necessary
- Leverage utility types for complex transformations

## Error Prevention

### 1. **Compile-Time Error Catching**
- Use TypeScript for compile-time error catching
- Treat all type errors as build failures
- Never ignore TypeScript warnings

### 2. **Type Guard Patterns**
```typescript
// ✅ DO: Use type guards
export function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// ✅ DO: Use type assertions carefully
const user = data as User; // Only when you're certain
```

### 3. **Null Safety**
```typescript
// ✅ DO: Handle null/undefined explicitly
export type SafeUser = {
  id: string;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
};

// ❌ DON'T: Assume non-null values
export type UnsafeUser = {
  id: string;
  profile: { firstName: string; }; // Assumes profile always exists
};
```

## Migration Guidelines

### 1. **TypeScript Interface to Type Conversion**
- Convert all `interface` declarations to `type` aliases
- Ensure type compatibility during conversion
- Update all import statements

### 2. **Type Organization Migration**
- Move types to appropriate directories
- Update import paths throughout the codebase
- Verify no broken references

### 3. **Validation Process**
- Run TypeScript compiler after changes
- Fix any remaining type errors
- Ensure build passes successfully

## Conclusion

Following these TypeScript type safety rules ensures:
- **Type Safety**: Eliminates runtime errors through compile-time checking
- **Maintainability**: Clear separation of concerns and easy type location
- **Developer Experience**: Better IntelliSense and autocomplete
- **Performance**: Optimized bundle sizes and tree-shaking
- **Consistency**: Uniform type patterns across the codebase

These rules create a robust, maintainable, and type-safe codebase that scales with the project's complexity. 