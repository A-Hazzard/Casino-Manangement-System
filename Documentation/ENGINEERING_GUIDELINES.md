# Engineering Guidelines - Overview

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 27, 2025  
**Version:** 3.1.0

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [General Principles](#general-principles)
4. [Folder Structure](#folder-structure)
5. [TypeScript Standards](#typescript-standards)
6. [Security Guidelines](#security-guidelines)
7. [Performance Standards](#performance-standards)
8. [Code Quality](#code-quality)
9. [Documentation Standards](#documentation-standards)
10. [Detailed Guidelines](#detailed-guidelines)

## Overview

This document provides a high-level overview of engineering guidelines for the Evolution One CMS system. For detailed, implementation-specific guidelines, refer to:

- **[Frontend Guidelines](frontend/FRONTEND_GUIDELINES.md)** - Detailed frontend development standards
- **[Backend Guidelines](backend/BACKEND_GUIDELINES.md)** - Detailed backend/API development standards

## System Architecture

- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Strong typing for all components and APIs
- **MongoDB**: Document-based database with Mongoose ODM
- **Tailwind CSS**: Utility-first CSS framework for styling
- **JWT Authentication**: Secure authentication with role-based access control

## General Principles

- **Code Quality**: Maintainable, readable, and well-documented code
- **Type Safety**: Comprehensive TypeScript implementation with strict typing
- **Performance**: Optimized code with efficient algorithms and data structures
- **Security**: Secure coding practices and proper authentication/authorization
- **Scalability**: Architecture that supports growth and expansion
- **Modular Design**: Clear separation of concerns and reusable components

## Folder Structure

### Frontend Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components
- `lib/helpers/` - Frontend helper functions for data fetching
- `lib/utils/` - Pure utilities (formatting, pagination, debounce)
- `lib/types/` - Frontend-specific type aliases
- `lib/hooks/` - Custom React hooks
- `lib/store/` - State management (Zustand stores)
- `lib/contexts/` - React contexts
- `lib/constants/` - Application constants

### Backend Structure

- `app/api/` - API route handlers
- `app/api/lib/helpers/` - Backend business logic helpers
- `app/api/lib/models/` - MongoDB models (Mongoose schemas)
- `app/api/lib/types/` - Backend-specific types
- `app/api/lib/utils/` - Backend utilities
- `app/api/lib/middleware/` - Custom middleware

### Shared Structure

- `shared/types/` - Shared type aliases used by both frontend and backend

## TypeScript Standards

- **Prefer `type` over `interface`** - Use `type` consistently across the codebase
- **No `any` allowed** - Create appropriate type definitions for all variables and functions
- **No underscore prefixes** - Never prefix variables with underscores (except `_id` for MongoDB documents)
- **Type organization**:
  - Shared types → `shared/types/`
  - Frontend types → `lib/types/`
  - Backend types → `app/api/lib/types/`
- **Always check dependencies** before deleting types or functions

## Security Guidelines

- **No secrets in client code** - All sensitive configuration in environment variables
- **Input validation and sanitization** - Validate and sanitize all input on the server side
- **Route protection** - Use middleware for authentication and authorization on all protected routes
- **HTTPS enforcement** - All communications must use secure protocols
- **Session management** - Secure JWT token handling with proper expiration
- **Audit logging** - Comprehensive logging for regulatory compliance

## Performance Standards

- Memoize expensive computations
- Debounce user input for search
- Avoid rendering waterfalls; batch network requests when possible
- Track performance metrics for slow operations
- Use proper code-splitting and lazy loading

## Loading States & Skeleton Loaders - CRITICAL REQUIREMENTS

- **MANDATORY: Every page and component with async data MUST use specific skeleton loaders**
- **NEVER use generic loading states** like "Loading...", "Loading Data", or generic spinners
- **EVERY skeleton loader MUST exactly match the layout and structure of the actual content**
- **Skeleton loaders MUST be page/component-specific** - no generic reusable skeletons for different content types

### Skeleton Loader Requirements:

1. **Content-Specific Skeletons**: Each page must have its own skeleton that matches the exact layout of the real content
2. **Visual Accuracy**: Exact dimensions and spacing as the real content, proper visual hierarchy, all interactive elements represented
3. **Implementation Standards**: Use Shadcn Skeleton component, create dedicated skeleton files in `components/ui/skeletons/`
4. **File Organization**: Skeleton files in `components/ui/skeletons/[PageName]Skeletons.tsx`
5. **Mobile-Specific Requirements**: Every page and section must have mobile-specific loaders that match mobile layouts

For detailed skeleton loader requirements, see the Frontend Guidelines section 7.1.

## Code Quality

- **ESLint compliance** - Never ignore ESLint rule violations
- **Type safety** - Treat TypeScript errors as build failures
- **Error handling** - Try/catch with actionable messages; no silent failures
- **Logging** - Minimal and meaningful; avoid noisy console logs
- **Testing** - Manual testing of critical flows during development

## Documentation Standards

- **File-level JSDoc** - Required for all API routes, pages, and complex components
- **Function-level comments** - Required for exported functions and complex logic
- **Step-by-step comments** - Use for API route handlers and complex algorithms
- **Section comments** - Use for organizing component code
- **Inline comments** - Use for non-obvious business logic only

## Timezone Standards

**Critical**: All date handling must follow Trinidad timezone (UTC-4) standards:

- **Database Storage**: All dates stored in UTC format
- **API Responses**: Convert dates to Trinidad time before sending to frontend
- **Date Queries**: Convert Trinidad time inputs to UTC for database queries
- **Frontend Display**: API responses already contain Trinidad time - display directly
- **Date Inputs**: Convert user-selected Trinidad time to UTC before API calls

## Data Flow

1. **API route** (`app/api/*`) → validate/transform → returns typed JSON
2. **Frontend helpers** (`lib/helpers/*`) → call APIs with axios → return typed data
3. **Components** → consume typed data via props/state only

## Development Standards

- **HTTP client**: axios everywhere (no `fetch()` in source files)
- **Separation of concerns**: UI in components, logic in helpers/utils
- **React hooks**: Stable dependency arrays; avoid unnecessary deps
- **Linting/build**: `pnpm lint && pnpm build` must pass cleanly

## Refactoring & Code Maintenance

### Refactoring Tracking

The project maintains comprehensive tracking documents for refactoring progress:

- **[API Refactoring Tracker](API_REFACTORING_TRACKER.md)** - Tracks all backend API routes and helpers
- **[Frontend Refactoring Tracker](frontend/FRONTEND_REFACTORING_TRACKER.md)** - Tracks all frontend pages, components, helpers, utils, hooks, stores, types, and constants

### Refactoring Principles

When refactoring code:

1. **Maintain Functionality**: Ensure all existing functionality is preserved
2. **Follow Guidelines**: Adhere to structure requirements in detailed guidelines
3. **Update Trackers**: Mark files as completed in tracking documents
4. **Test Thoroughly**: Verify functionality after refactoring
5. **Incremental Changes**: Refactor in small, manageable chunks

### File Length Guidelines

| File Type              | Maximum Lines | Action if Exceeded                    |
| ---------------------- | ------------- | ------------------------------------- |
| `page.tsx` (wrapper)   | 100-150       | Extract content to separate component |
| Content Component      | 300-400       | Extract sub-components or hooks       |
| Regular Component      | 400-500       | Extract sub-components or hooks       |
| API Route File         | 400-500       | Extract more helper functions         |
| Helper File            | 500-600       | Split into multiple focused files     |
| Hook File              | 300-400       | Split into multiple hooks             |
| Util File              | 300-400       | Split into multiple util files        |

## Detailed Guidelines

For comprehensive, implementation-specific guidelines, see:

- **[Frontend Guidelines](frontend/FRONTEND_GUIDELINES.md)**
  - Page.tsx structure and organization
  - Component structure and organization
  - Frontend-specific code organization
  - JSX commenting and spacing standards
  - Frontend helper and hook extraction rules

- **[Backend Guidelines](backend/BACKEND_GUIDELINES.md)**
  - API route structure and organization
  - Step-by-step commenting standards
  - Helper function extraction rules
  - Backend-specific error handling
  - Performance tracking standards

---

**Last Updated:** November 22, 2025
