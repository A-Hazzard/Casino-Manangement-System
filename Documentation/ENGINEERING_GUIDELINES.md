# Engineering Guidelines

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 3, 2025  
**Version:** 2.0.0

## Table of Contents

1. [Overview](#overview)
2. [Folder Structure](#folder-structure)
3. [TypeScript Discipline](#typescript-discipline)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [API Design](#api-design)
7. [Database Design](#database-design)
8. [Security Guidelines](#security-guidelines)
9. [Performance Standards](#performance-standards)
10. [Testing Requirements](#testing-requirements)
11. [Code Quality](#code-quality)
12. [Documentation Standards](#documentation-standards)

## Overview

This document serves as the comprehensive engineering guidelines for the Evolution One CMS system. It establishes the standards, practices, and architectural principles that all contributors must follow to ensure code quality, maintainability, and system reliability.

### Key Principles

- **Code Quality**: Maintainable, readable, and well-documented code
- **Type Safety**: Comprehensive TypeScript implementation with strict typing
- **Performance**: Optimized code with efficient algorithms and data structures
- **Security**: Secure coding practices and proper authentication/authorization
- **Scalability**: Architecture that supports growth and expansion

### System Architecture

- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Strong typing for all components and APIs
- **MongoDB**: Document-based database with Mongoose ODM
- **Tailwind CSS**: Utility-first CSS framework for styling
- **JWT Authentication**: Secure authentication with role-based access control

### Development Standards

- **Modular Design**: Clear separation of concerns and reusable components
- **API-First**: RESTful API design with comprehensive documentation
- **Testing**: Comprehensive testing with manual and automated validation
- **Documentation**: Complete documentation for all system components

### Folder purposes

- `app/`
  - Next.js App Router pages and API routes
  - Keep `page.tsx` lean; move non-UI logic into helpers/utils
  - API routes: keep handlers thin; delegate to `app/api/lib/helpers/`

- `components/`
  - Reusable UI components
  - No data fetching or business logic; pass data via props

- `lib/helpers/`
  - Frontend helper functions for data fetching and non-visual logic
  - Use axios for HTTP; return typed data only

- `lib/utils/`
  - Pure utilities (formatting, pagination, debounce)
  - No side effects or network calls

- `lib/types/`
  - Frontend-specific type aliases only
  - No TypeScript interfaces; use `type` consistently

- `shared/types/`
  - Shared type aliases used by both frontend and backend
  - API contracts, entities, database-adjacent types

- `app/api/lib/helpers/`
  - Backend route helpers and business logic
  - No UI concerns; keep route handlers thin and declarative

- `Documentation/`
  - System-wide documentation lives at the root of this folder
  - Page-specific docs remain under appropriate subpages; general docs should live here

### Standards

- HTTP client: axios everywhere (no `fetch()` in source files)
- TypeScript: prefer `type` over `interface` declarations; no `any`
- Types location: only in `shared/types`, `lib/types`, or `app/api/lib/types`
- Separation of concerns: UI in components, logic in helpers/utils
- Error handling: try/catch with actionable messages; no silent failures
- Logging: minimal and meaningful; avoid noisy console logs
- React hooks: stable dependency arrays; avoid unnecessary deps
- Linting/build: `pnpm lint && pnpm build` must pass cleanly

### Timezone Standards

**Critical**: All date handling must follow Trinidad timezone (UTC-4) standards:

- **Database Storage**: All dates stored in UTC format
- **API Responses**: Use `convertResponseToTrinidadTime()` to convert dates to Trinidad time before sending to frontend
- **Date Queries**: Use `createTrinidadTimeDateRange()` to convert Trinidad time inputs to UTC for database queries
- **Frontend Display**: API responses already contain Trinidad time - display directly
- **Date Inputs**: Convert user-selected Trinidad time to UTC before API calls using `trinidadTimeToUtc()`

**Required Implementation:**

```typescript
// API routes - convert responses to Trinidad time
import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';
return NextResponse.json({ data: convertResponseToTrinidadTime(results) });

// Date range queries - convert Trinidad time to UTC
import { createTrinidadTimeDateRange } from '@/app/api/lib/utils/timezone';
const utcRange = createTrinidadTimeDateRange(startDate, endDate);

// Frontend date inputs - convert to UTC for API calls
import { trinidadTimeToUtc } from '@/app/api/lib/utils/timezone';
const utcDate = trinidadTimeToUtc(userSelectedDate);
```

**See [Timezone Documentation](timezone.md) for complete implementation guidelines.**

### Data flow and typing

1. API route (app/api/\*) → validate/transform → returns typed JSON
2. Frontend helpers (`lib/helpers/*`) → call APIs with axios → return typed data
3. Components consume typed data via props/state only

### Security

- **No secrets in client code** - All sensitive configuration in environment variables
- **Input validation and sanitization** - Validate and sanitize all input on the server side
- **Route protection** - Use middleware for authentication and authorization on all protected routes
- **HTTPS enforcement** - All communications must use secure protocols
- **Session management** - Secure JWT token handling with proper expiration
- **Audit logging** - Comprehensive logging for regulatory compliance (see [Auditing and Logging](auditing-and-logging.md))

### Performance

- Memoize expensive computations
- Debounce user input for search
- Avoid rendering waterfalls; batch network requests when possible

### Testing and verification

- Manual testing of critical flows during development
- Treat TypeScript errors as build failures

---

## API Route Structure & Organization

**CRITICAL**: All API routes must follow a clear, step-by-step structure with proper commenting and helper function extraction.

### File Structure Requirements

1. **File-Level Documentation** (Required):

   ```typescript
   /**
    * [Route Name] API Route
    *
    * This route handles [brief description of what the route does].
    * It supports:
    * - Feature 1
    * - Feature 2
    * - Feature 3
    *
    * @module app/api/[path]/route
    */
   ```

2. **Import Organization**:
   - Group imports logically: helpers, types, utilities, Next.js
   - Import helper functions from `app/api/lib/helpers/`
   - Import types from appropriate type files
   - Keep imports at the top, organized by source

3. **Helper Functions in Route File**:
   - Only include small, route-specific utility functions (e.g., `createEmptyResponse`)
   - All business logic must be extracted to helper files
   - Helper functions should be pure and testable

4. **Main Handler Structure**:

   ```typescript
   /**
    * Main [GET/POST/etc] handler for [route name]
    *
    * Flow:
    * 1. Step 1 description
    * 2. Step 2 description
    * 3. Step 3 description
    * ...
    */
   export async function GET(req: NextRequest) {
     const startTime = Date.now(); // Performance tracking

     try {
       // ============================================================================
       // STEP 1: [Clear step description]
       // ============================================================================
       // Implementation here

       // ============================================================================
       // STEP 2: [Clear step description]
       // ============================================================================
       // Implementation here

       // ... continue with numbered steps

       return NextResponse.json(response);
     } catch (err) {
       // Error handling with proper status codes
       const errorMessage = err instanceof Error ? err.message : 'Server Error';
       return NextResponse.json({ error: errorMessage }, { status: 500 });
     }
   }
   ```

### Step-by-Step Commenting Standards

- **Use visual separators**: `// ============================================================================`
- **Number each step**: `// STEP 1:`, `// STEP 2:`, etc.
- **Clear step descriptions**: Each step should have a concise, descriptive comment
- **Group related operations**: Multiple related operations can be in one step
- **Document complex logic**: Add inline comments for non-obvious business logic

### Helper Function Extraction

**Extract to `app/api/lib/helpers/` when:**

- Function is longer than 20-30 lines
- Function contains complex business logic
- Function is reusable across multiple routes
- Function performs database operations
- Function contains data transformation logic

**Keep in route file when:**

- Function is route-specific and very small (< 10 lines)
- Function is a simple response builder
- Function is only used once in the route

### File Length Guidelines

- **Maximum route file length**: ~400-500 lines
- **If route exceeds limit**: Extract more helper functions
- **Helper files**: Can be longer but should be organized by functionality
- **Each helper file**: Should focus on a single domain (e.g., `metersReport.ts`)

### Error Handling

- Always use try/catch blocks
- Return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Provide meaningful error messages
- Log errors for debugging (use `console.error` or logger)
- Track performance with `startTime` for slow operations

### Performance Tracking

- Track execution time for routes that may be slow
- Log performance metrics: `console.warn(\`Route completed in ${duration}ms\`)`
- Use this to identify optimization opportunities

**Reference Example:**

- `app/api/reports/meters/route.ts` - Exemplary API route structure

---

## Page.tsx Structure & Organization

**CRITICAL**: All `page.tsx` files must be lean and delegate logic to helpers and components.

### File Structure Requirements

1. **File-Level Documentation** (Required):

   ```typescript
   /**
    * [Page Name] Page
    * [Brief description of the page]
    *
    * Features:
    * - Feature 1
    * - Feature 2
    * - Feature 3
    */
   ```

2. **Page Component Structure**:

   ```typescript
   export default function PageName() {
     return (
       <ProtectedRoute requiredPage="page-name">
         <PageErrorBoundary>
           <PageContent />
         </PageErrorBoundary>
       </ProtectedRoute>
     );
   }
   ```

3. **Content Component** (if needed):
   - Extract to separate component if page logic is complex
   - Keep page.tsx as thin wrapper
   - Content component handles all state and data fetching

### Logic Extraction Rules

**Extract to `lib/helpers/` when:**

- Data fetching logic (API calls)
- Complex state management
- Business logic calculations
- Data transformation
- Filter/search logic

**Extract to Custom Hooks when:**

- Reusable stateful logic
- Multiple related state variables
- Complex useEffect dependencies
- Data fetching with caching

**Extract to Components when:**

- Reusable UI patterns
- Complex rendering logic
- Form handling
- Table/list rendering

### File Length Guidelines

- **Maximum page.tsx length**: ~100-150 lines (wrapper only)
- **Maximum content component length**: ~300-400 lines
- **If component exceeds limit**: Extract sub-components or custom hooks
- **Complex pages**: Break into multiple smaller components

### Commenting Standards

- Use section comments for major areas:

  ```typescript
  // ============================================================================
  // Data Fetching & State Management
  // ============================================================================

  // ============================================================================
  // Event Handlers
  // ============================================================================

  // ============================================================================
  // Render Logic
  // ============================================================================
  ```

**Reference Examples:**

- `app/page.tsx` - Lean page wrapper
- `app/reports/page.tsx` - Simple page structure

---

## Component Structure & Organization

**CRITICAL**: Components must be focused, readable, and properly organized.

### Component Structure

1. **Component Documentation**:

   ```typescript
   /**
    * [Component Name] Component
    * [Brief description of component purpose]
    *
    * @param props - Component props with clear type definitions
    */
   ```

2. **Component Organization**:

   ```typescript
   export default function ComponentName(props: ComponentProps) {
     // ============================================================================
     // Hooks & State
     // ============================================================================
     const [state, setState] = useState();
     const data = useCustomHook();

     // ============================================================================
     // Computed Values & Memoization
     // ============================================================================
     const computedValue = useMemo(() => {
       // Expensive computation
     }, [dependencies]);

     // ============================================================================
     // Event Handlers
     // ============================================================================
     const handleAction = useCallback(() => {
       // Handler logic
     }, [dependencies]);

     // ============================================================================
     // Effects
     // ============================================================================
     useEffect(() => {
       // Effect logic
     }, [dependencies]);

     // ============================================================================
     // Render
     // ============================================================================
     return (
       // JSX
     );
   }
   ```

### File Length Guidelines

- **Maximum component length**: ~400-500 lines
- **If component exceeds limit**: Extract sub-components or custom hooks
- **Complex components**: Break into smaller, focused components
- **Each component**: Should have a single, clear responsibility

### Commenting Standards

- Use section comments to organize component code
- Document complex logic with inline comments
- Explain non-obvious business rules
- Remove redundant comments that restate code

### Component Extraction Rules

**Extract sub-component when:**

- Component has multiple distinct sections
- Section is reusable elsewhere
- Section has its own state/logic
- Component is becoming hard to read

**Extract custom hook when:**

- Logic is reusable across components
- Multiple related state variables
- Complex data fetching logic
- Complex effect dependencies

**Reference Examples:**

- `components/reports/tabs/LocationsTab.tsx` - Well-organized component (though long, properly structured)

---

## Commenting & Documentation Standards

### File-Level Comments

**Required for:**

- All API routes
- All page.tsx files
- Complex components (>200 lines)
- Helper files with multiple functions

**Format:**

```typescript
/**
 * [Name] [Type]
 *
 * [Brief description of purpose]
 *
 * Features/Supports:
 * - Feature 1
 * - Feature 2
 *
 * @module [path] (for routes/helpers)
 */
```

### Function-Level Comments

**Required for:**

- All exported functions
- Complex functions (>20 lines)
- Functions with non-obvious logic
- Helper functions in `app/api/lib/helpers/`

**Format:**

```typescript
/**
 * [Function name] - [Brief description]
 *
 * [Detailed description if needed]
 *
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description of return value
 */
```

### Step-by-Step Comments

**Use for:**

- API route handlers (numbered steps)
- Complex algorithms
- Multi-step processes
- Data transformation pipelines

**Format:**

```typescript
// ============================================================================
// STEP 1: [Clear step description]
// ============================================================================
// Implementation

// ============================================================================
// STEP 2: [Clear step description]
// ============================================================================
// Implementation
```

### Section Comments

**Use for:**

- Organizing component code
- Grouping related functionality
- Separating concerns in long files

**Format:**

```typescript
// ============================================================================
// [Section Name]
// ============================================================================
```

### Inline Comments

**Use for:**

- Non-obvious business logic
- Workarounds or temporary solutions
- Complex calculations
- Important edge cases

**Avoid:**

- Comments that restate code
- Obvious comments
- Outdated comments

---

**Last Updated:** December 2024
