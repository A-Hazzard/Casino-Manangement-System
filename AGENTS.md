# Evolution One CMS - Agent Guide

This document provides essential information for AI agents working on the Evolution One CMS codebase.

## 1. Build, Lint, and Test Commands

Use `pnpm` for all package management tasks.

| Action             | Command                         | Notes                              |
| :----------------- | :------------------------------ | :--------------------------------- |
| **Install**        | `pnpm install`                  |                                    |
| **Build**          | `pnpm run build`                | Next.js production build           |
| **Dev Server**     | `pnpm run dev`                  | Starts development server          |
| **Lint**           | `pnpm run lint`                 | Runs ESLint                        |
| **Lint Fix**       | `pnpm run lint:fix`             | Auto-fixes ESLint issues           |
| **Type Check**     | `pnpm run type-check`           | Runs TypeScript compiler (no emit) |
| **Format**         | `pnpm run format`               | Runs Prettier                      |
| **Test (All)**     | `pnpm run test`                 | Runs Jest tests                    |
| **Test (Watch)**   | `pnpm run test:watch`           | Watch mode                         |
| **Test (Single)**  | `npx jest path/to/file.test.ts` | Run specific test file             |
| **Test (Pattern)** | `pnpm run test -t 'pattern'`    | Run tests matching name pattern    |

**Validation Workflow:**
After changes, always run: `pnpm run type-check && pnpm run lint`

## 2. Code Style & Architecture

### TypeScript Rules

- **Strict Typing**: No `any` types allowed.
- **Preference**: Use `type` over `interface` unless extending.
- **Location**:
  - Shared types: `shared/types/` (Database, Entities, API).
  - Backend types: `app/api/lib/types/`.
  - Component types: `lib/types/` or co-located if unique.
- **Imports**: Group imports: Helpers -> Types -> Utils -> Next.js -> External.

### Naming Conventions

- **Components**: `[PageName]PageContent.tsx`, `[PageName][Section][Component].tsx`.
- **Props**: `[ComponentName]Props`.
- **Functions**:
  - Event Handlers: `handle[Event]` (e.g., `handleRefresh`).
  - Data Fetching: `fetch[Data]` (e.g., `fetchLocationData`).
  - Utils: `format...`, `calculate...`, `map...`.
- **Utils**: Name by use-case (e.g., `machine.ts`, `totals.ts`), not technical layer.

### Directory Structure

- **Frontend Components**: `components/[PageName]/` (subfolders: `tabs/`, `modals/`, `forms/`, `tables/`).
- **Reusable UI**: `components/ui/` (base components).
- **Backend API**:
  - Routes: `app/api/[feature]/route.ts`.
  - Helpers: `app/api/lib/helpers/` (Business logic).
  - Models: `app/api/lib/models/` (Mongoose schemas).

### API Route Standards (`app/api/**/route.ts`)

1. **Structure**: Lean handlers with extracted logic in helpers.
2. **Documentation**: File-level JSDoc required.
3. **Comments**: Use step-by-step numbered comments with separators:
   ```typescript
   // ============================================================================
   // STEP 1: Parse and validate request parameters
   // ============================================================================
   ```
4. **Error Handling**: `try/catch` blocks with appropriate HTTP status codes (500, 400, 403).
5. **Filtering**: MUST implement licensee/location filtering using `getUserLocationFilter`.

### Database (Mongoose)

- **Models**: ALWAYS import from `app/api/lib/models/`.
- **No Direct Access**: NEVER use `db.collection()`.
- **IDs**: Use `findOne({ _id: id })` (string IDs), NOT `findById` (requires ObjectId).
- **Performance**:
  - `Meters.aggregate` MUST use `.cursor({ batchSize: 1000 })`.
  - Use `location` field directly in Meters queries (avoid `$lookup` on machines).

### Frontend Guidelines

- **Page Wrapper**: `page.tsx` should be a thin wrapper around a `PageContent` component.
- **Data Fetching**: Use `fetchUserWithCache` for user data.
- **Loading States**:
  - NO generic "Loading..." text or spinners.
  - Use specific skeleton components (e.g., `ReportsOverviewSkeleton`) matching actual layout.
  - Skeletons live in `components/ui/skeletons/`.

## 3. Cursor/Copilot Rules Summary

- **Performance**: 7d queries <10s. Batch DB queries (eliminate N+1).
- **Security**: Validate inputs. Secure headers. No secrets in client code.
- **Refactoring**: When moving/deleting, use `grep` to check for all usages first.

Ref: `.cursor/rules/guidlines.mdc`, `.cursor/rules/nextjs-rules.mdc`, `.cursor/rules/naming-conventions.mdc`
