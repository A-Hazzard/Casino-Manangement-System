# Engineering Guidelines

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 5th, 2025  
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

**Last Updated:** October 20th, 2025
