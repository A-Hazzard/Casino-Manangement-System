## Evolution One CMS - Engineering Guidelines

This document is the single source of truth for how this system is structured and the standards contributors must follow. Newcomers should read this first.

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
  - No interfaces; use `type` consistently

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
- TypeScript: prefer `type` over `interface`; no `any`
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
import { convertResponseToTrinidadTime } from "@/app/api/lib/utils/timezone";
return NextResponse.json({ data: convertResponseToTrinidadTime(results) });

// Date range queries - convert Trinidad time to UTC
import { createTrinidadTimeDateRange } from "@/app/api/lib/utils/timezone";
const utcRange = createTrinidadTimeDateRange(startDate, endDate);

// Frontend date inputs - convert to UTC for API calls
import { trinidadTimeToUtc } from "@/app/api/lib/utils/timezone";
const utcDate = trinidadTimeToUtc(userSelectedDate);
```

**See [Timezone Documentation](timezone.md) for complete implementation guidelines.**

### Data flow and typing

1. API route (app/api/*) → validate/transform → returns typed JSON
2. Frontend helpers (`lib/helpers/*`) → call APIs with axios → return typed data
3. Components consume typed data via props/state only

### Security

- No secrets in client code
- Validate and sanitize all input on the server
- Use middleware for route protection where required

### Auditing and Logging

**Critical Importance:** Comprehensive auditing and logging are essential for casino management systems due to regulatory compliance requirements, security monitoring, and operational transparency.

#### API Logging Standards
- **Use `APILogger` utility** (`app/api/lib/utils/logger.ts`) for all API endpoints
- **Log all CRUD operations** with success/failure status, duration, and context
- **Include user identification** when available for audit trail
- **Log security-relevant events** (login attempts, permission changes, data access)
- **Format:** `[timestamp] [level] (duration) METHOD endpoint: message [context]`

#### Activity Logging Requirements
- **Track all user actions** that modify system data or access sensitive information
- **Record before/after values** for data changes to enable rollback and audit
- **Include IP addresses and user agents** for security investigation
- **Store logs in dedicated collections** with proper indexing for performance
- **Implement log retention policies** according to regulatory requirements

#### Compliance Considerations
- **Gaming regulations** require detailed audit trails for all financial transactions
- **Data protection laws** mandate logging of personal data access and modifications
- **Security standards** require monitoring of privileged operations and access patterns
- **Operational transparency** enables troubleshooting and performance optimization

#### Implementation Guidelines
- **Use structured logging** with consistent field names and data types
- **Implement log levels** (INFO, WARNING, ERROR) for appropriate filtering
- **Include correlation IDs** to trace related operations across systems
- **Ensure log data integrity** with proper validation and sanitization
- **Monitor log performance** to prevent system impact during high-volume operations

### Performance

- Memoize expensive computations
- Debounce user input for search
- Avoid rendering waterfalls; batch network requests when possible

### Testing and verification

- Manual testing of critical flows during development
- Treat TypeScript errors as build failures