# Gemini Code Assistant Context

This document provides instructional context for the Gemini Code Assistant, based on an analysis of the Evolution One CMS codebase. It outlines the project's architecture, conventions, and key operational guidelines to ensure that any code generated or modified by the assistant aligns with the established standards.

## Project Overview

Evolution One CMS is a comprehensive casino management system built with Next.js 15 (App Router) and a MongoDB backend. It provides real-time analytics, financial tracking, and management of casino operations, including locations, cabinets, and user administration. The system is designed for high performance and strict data integrity, with a focus on security and regulatory compliance.

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with Shadcn/UI components
- **State Management:** Zustand
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT with `jose`
- **Charting:** Recharts
- **Maps:** React Leaflet

## Development Environment

### Setup and Execution

1.  **Install Dependencies:** Use `pnpm install` to ensure consistent package management and dependency resolution.
2.  **Run Development Server:** `pnpm run dev`
3.  **Build for Production:** `pnpm run build`
4.  **Linting:** `pnpm run lint`
5.  **Type Checking:** `pnpm run type-check`

### Key Scripts

- `dev`: Starts the Next.js development server.
- `build`: Creates a production-ready build.
- `lint`: Runs ESLint to identify and fix code style issues.
- `type-check`: Verifies TypeScript types across the project.

## Architectural and Development Conventions

The project enforces a strict set of conventions to maintain code quality, consistency, and maintainability. These are documented in detail in `.cursor/rules/nextjs-rules.mdc`.

### 1. TypeScript and Type Safety

- **No `any` Type:** The use of `any` is strictly prohibited. All variables and functions must have explicit type definitions.
- **Type Over Interface:** Prefer `type` for all type definitions.
- **Directory Structure:**
  - `shared/types/`: For types shared between the frontend and backend.
  - `lib/types/`: For frontend-specific types.
  - `app/api/lib/types/`: For backend-specific types.

### 2. File and Component Structure

- **Lean `page.tsx` Files:** Pages should act as thin wrappers, delegating logic to child components and helpers.
- **Component Organization:** Components should be organized with clear sections for hooks, state, computed values, event handlers, and effects, separated by comments.
- **API Route Structure:** API routes must follow a standardized pattern with numbered steps, performance tracking, and clear error handling.

### 3. Loading States and Skeletons

- **Specific Skeletons:** Generic loading spinners or text are forbidden. Each page or component with asynchronous data must have a specific skeleton loader that matches its layout.
- **Visual Accuracy:** Skeletons must accurately represent the final content structure, including headers, cards, tables, and other UI elements.

### 4. Database and Backend

- **Mongoose Models:** Always use Mongoose models for database interactions; direct collection access is not allowed.
- **Query Methods:** Use `findOne({ _id: id })` instead of `findById(id)`.
- **Licensee Filtering:** All API routes must filter data by `licensee` to enforce data access permissions.
- **Performance:**
  - Use `.cursor({ batchSize: 1000 })` for all `Meters.aggregate()` calls.
  - Avoid expensive `$lookup` operations by using direct field access where possible.

### 5. Documentation and Comments

- **File-Level JSDoc:** Required for all API routes, pages, and complex components.
- **Section Comments:** Use comments to delineate major sections within components and API routes.
- **JSX Comments:** Mark major UI sections in JSX to improve readability.

## Operational Guidelines for Gemini

When assisting with this project, adhere to the following principles:

1.  **Analyze Before Modifying:** Before making any changes, thoroughly analyze the existing code, related files, and documentation to understand the established patterns and conventions.
2.  **Follow the Rules:** Strictly adhere to the rules outlined in `.cursor/rules/nextjs-rules.mdc`, especially regarding type safety, file structure, and loading states.
3.  **Verify Dependencies:** Before deleting any code, use `search_file_content` to check for dependencies and ensure that no part of the system will break.
4.  **Maintain Consistency:** Ensure that any new code matches the style, structure, and architectural patterns of the existing codebase.
5.  **Prioritize Performance:** When working with database queries or data-intensive components, prioritize performance by following the optimization guidelines.

## Key Features & Architecture Overview

### Core System Capabilities

- **Casino Management:** Comprehensive slot machine operations, financial tracking, member management, and regulatory compliance
- **Multi-Tenant Architecture:** Isolated licensee data with role-based access control
- **Real-Time Analytics:** Live financial metrics, meter readings, and performance tracking
- **Vault Management System:** Cash management with cash desks, floats, expenses, and transfers
- **SMIB Management:** Remote firmware updates, meter management, and device control
- **Collection Reports:** Automated financial reporting with SAS time validation and variance analysis

### Technology Stack Summary

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Zustand state management
- **Backend:** Next.js API Routes, MongoDB with Mongoose ODM, JWT authentication
- **Key Libraries:** Recharts (charts), React Leaflet (maps), Framer Motion (animations)

### Database & Financial Flow

- **Entity Hierarchy:** Licensee → GamingLocation → Machine → Sessions/Events → Collections → Reports
- **Financial Tracking:** Movement Delta Method using `movement.drop` and `movement.totalCancelledCredits`
- **Gaming Day Offset:** 8 AM Trinidad time boundaries for financial queries (critical for accuracy)

### Security & Compliance

- **Authentication:** JWT with HTTP-only cookies, session management
- **Access Control:** Role-based permissions with licensee/location filtering
- **Audit Trails:** Complete activity logging and financial compliance tracking
- **Data Integrity:** Soft deletes, secure multi-tenant isolation

### Development Standards

- **TypeScript Discipline:** No `any` types, `type` over `interface`, centralized type organization
- **API Patterns:** Structured routes with step-by-step documentation, performance tracking, error handling
- **Code Organization:** Lean page components, business logic in helpers, consistent file structure
- **Quality Assurance:** ESLint enforcement, specific skeleton loaders, comprehensive error boundaries

### Recent Major Updates (2025)

- **SMIB Management System:** OTA firmware updates, real-time meter control, location-wide operations
- **Collection Report Refactoring:** 86-95% code reduction with reusable components and hooks
- **Vault Management:** Complete cash management module with cashier interface
- **Authentication Enhancements:** Email login support, improved session management
- **UI/UX Improvements:** Content-specific skeleton loaders, responsive mobile design

## Coding Guidelines Overview

### Backend API Standards

- **File Structure:** JSDoc documentation, numbered step comments, performance tracking
- **Type Safety:** Strict TypeScript, no `any`, Mongoose models only (no direct collection access)
- **Error Handling:** Consistent responses, HTTP status codes, graceful degradation
- **Security:** Licensee filtering, role-based access, input validation

### Frontend Patterns

- **Component Organization:** Hooks for state, helpers for logic, context providers
- **State Management:** Zustand for global state, React Context for local
- **Loading States:** Specific skeleton loaders matching content structure
- **Caching:** User data caching with TTL and invalidation strategies

### Quality Requirements

- **Line Limits:** Route files ≤500 lines, helpers ≤600 lines
- **Imports:** Grouped and ordered (helpers, types, utilities, framework)
- **Documentation:** File-level JSDoc, function annotations, module tags
- **Build Process:** `pnpm` package management, ESLint compliance required
  }

````

### Error Handling

- Consistent error response format
- Proper HTTP status codes
- Detailed error logging
- Graceful degradation

## Performance Considerations

### Database Indexing

- Optimized indexes for common query patterns
- Compound indexes for multi-field queries
- Soft delete filtering with indexes

### Frontend Optimization

- Memoization with `useMemo` and `useCallback`
- Code splitting and lazy loading
- Efficient data fetching patterns
- GSAP animations for smooth UX

## Compliance and Auditing

### Financial Compliance

- All financial metrics traceable to source data
- Movement calculations with clear timestamps
- Audit trails for all collection activities
- Data integrity validation

### Regulatory Requirements

- Complete audit trails
- Financial report generation
- Movement tracking for compliance
- Variance analysis and reporting

## Common Patterns

### Data Fetching

```typescript
// Standard data fetching pattern
const fetchData = async () => {
  try {
    const response = await axios.get('/api/endpoint');
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};
````

### State Management

```typescript
// Zustand store pattern
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      // state and actions
    }),
    { name: 'store-name' }
  )
);
```

### Component Structure

```typescript
// Standard component pattern
export default function Component() {
  const [state, setState] = useState();
  const { data } = useStore();

  useEffect(() => {
    // side effects
  }, []);

  return (
    <div>
      {/* component JSX */}
    </div>
  );
}

// Confirmation Dialog Pattern (for non-destructive actions)
import { InfoConfirmationDialog } from "@/components/shared/ui/InfoConfirmationDialog";

const [showConfirmation, setShowConfirmation] = useState(false);

<InfoConfirmationDialog
  open={showConfirmation}
  onOpenChange={setShowConfirmation}
  title="Confirm Action"
  description="This action will create a collection report for the selected time."
  onConfirm={handleConfirm}
/>
```

## Development Workflow

1. **Feature Development:**
   - Create types first
   - Implement backend API
   - Build frontend components
   - Add proper error handling
   - Test with real data

2. **Code Review Checklist:**
   - TypeScript types are correct
   - No ESLint violations
   - Proper error handling
   - Security considerations
   - Performance implications

3. **Testing:**
   - Manual testing of critical flows
   - API endpoint validation
   - Frontend component testing
   - Integration testing

## Troubleshooting

### Common Issues

1. **Build Failures:** Check for unused imports, type errors
2. **API Errors:** Verify database connections, validate input
3. **Performance Issues:** Check database indexes, optimize queries
4. **Type Errors:** Ensure proper type definitions and imports

### Debugging Tools

- MongoDB Compass for database inspection
- Browser DevTools for frontend debugging
- API testing with curl or Postman
- Console logging for development

## Future Considerations

### Planned Enhancements

- Real-time data synchronization
- Advanced analytics and reporting
- Mobile app development
- Enhanced security features

### Technical Debt

- ✅ **Type System Consolidation**: In progress - reducing 25+ type files to 8-10 core files
- ✅ **Authentication System**: Complete implementation with RBAC
- ✅ **Build Optimization**: Clean TypeScript compilation and ESLint
- **Database Query Optimization**: Continue optimizing MongoDB queries
- **Error Handling Consistency**: Standardize error responses across all APIs
- **Test Coverage**: Enhance automated testing coverage

## Recent System Updates (October 2025)

### SMIB Management System - Production Ready ✅

**Last Updated:** October 27th, 2025

The complete SMIB (Slot Machine Interface Board) management system has been implemented with comprehensive real-time control and monitoring capabilities:

#### Core Features

- **OTA Firmware Updates**: Upload firmware to MongoDB GridFS, serve via dynamic URLs, and push updates to SMIB devices over-the-air
- **SMIB Restart**: Restart individual SMIBs or all SMIBs at a location with countdown UI and confirmation dialogs
- **Meter Management**: Request current meter data and reset meters on non-SAS machines
- **Configuration Tracking**: Display "Last configured" timestamps for Network, MQTT, COMS, and OTA sections with `updatedAt` fields
- **Location-Wide Operations**: Batch operations for restarting multiple SMIBs and pushing firmware updates to all devices at a location
- **MQTT Discovery**: Real-time SMIB detection including unassigned SMIBs not linked to machines or locations

#### Firmware Management System

- **GridFS Storage**: Firmware binaries stored in MongoDB using GridFS for efficient large file handling
- **Upload System**: Web-based firmware upload interface with `.bin` file validation
- **Version Control**: Track firmware versions, product names, and version details
- **Dynamic Serving**: Temporarily download firmware from GridFS to `/public/firmwares/` and serve via `/firmwares/[filename]` endpoint
- **SMIB Download**: SMIBs append `?&relayId=<SMIB-ID>` query parameter when downloading firmware
- **Auto-Cleanup**: Firmware files automatically deleted after 30 minutes to conserve disk space

#### Technical Implementation

- **MQTT Protocol**: Proper MQTT message formats for configuration (`typ: "cfg"`), OTA updates (`typ: "ota_ud"`), meter requests (`typ: "cmd", "sta": "", "siz": 54, "pyd": "..."`), and restart commands (`typ: "rst"`)
- **SSE Integration**: Server-Sent Events for live configuration updates without page refreshes
- **Activity Logging**: Comprehensive logging of all SMIB operations for audit trails
- **Error Handling**: Robust error handling with user-friendly toast notifications
- **Type Safety**: Complete TypeScript type definitions in `shared/types/smib.ts`
- **Batch Processing**: Concurrent processing of up to 10 SMIBs for location-wide operations

#### UI Components

- **SMIB Management Tab**: Dedicated tab in cabinets page with configuration, restart, meters, and OTA sections
- **Cabinet Details Integration**: Same functionality available in individual cabinet detail pages
- **Location Filtering**: Filter SMIBs by location with "Restart All SMIBs" button for location-wide operations
- **Responsive Design**: Mobile-optimized with icon-based buttons for smaller screens
- **Visual Feedback**: 15-second countdown after restart with modern, clean design

#### API Endpoints

**Single SMIB Operations:**

- `/api/smib/restart` - Restart single SMIB
- `/api/smib/meters` - Request meter data
- `/api/smib/reset-meters` - Reset meters (non-SAS only)
- `/api/smib/ota-update` - Initiate OTA firmware update

**Location-Wide Operations:**

- `/api/locations/[locationId]/smib-restart` - Restart all SMIBs at location
- `/api/locations/[locationId]/smib-meters` - Request meters from all SMIBs
- `/api/locations/[locationId]/smib-ota` - Push firmware to all SMIBs

**Firmware Management:**

- `/api/firmwares` - Upload and list firmwares (GET/POST)
- `/api/firmwares/[id]/serve` - Download firmware from GridFS and serve temporarily
- `/api/firmwares/[filename]` - Serve firmware file to SMIB (handles query params)
- `/api/mqtt/discover-smibs` - MQTT-based SMIB discovery including unassigned devices

#### Files Created/Modified

**Backend (10 files):**

- `shared/types/smib.ts` - SMIB type definitions
- `app/api/smib/restart/route.ts` - Single SMIB restart
- `app/api/smib/meters/route.ts` - Meter data request
- `app/api/smib/reset-meters/route.ts` - Reset meters
- `app/api/smib/ota-update/route.ts` - OTA firmware update
- `app/api/locations/[locationId]/smib-restart/route.ts` - Location-wide restart
- `app/api/locations/[locationId]/smib-meters/route.ts` - Location-wide meters
- `app/api/locations/[locationId]/smib-ota/route.ts` - Location-wide OTA
- `app/api/firmwares/[id]/serve/route.ts` - Firmware serving from GridFS
- `app/firmwares/[filename]/route.ts` - Firmware download endpoint

**Frontend (7 files):**

- `lib/hooks/data/useSmibRestart.ts` - Restart hook
- `lib/hooks/data/useSmibMeters.ts` - Meters management hook
- `lib/hooks/data/useSmibOTA.ts` - OTA update hook
- `components/cabinets/smibManagement/RestartSection.tsx` - Restart UI
- `components/cabinets/smibManagement/MeterDataSection.tsx` - Meters UI
- `components/cabinets/smibManagement/OTAUpdateSection.tsx` - OTA UI
- `components/cabinets/SMIBManagementTab.tsx` - Main management interface

**Database Schema:**

- Added `updatedAt` to `smibConfig.net`, `smibConfig.mqtt`, `smibConfig.coms`, `smibConfig.ota`
- Added `firmwareUpdatedAt` to `smibConfig.ota`

### Collection Report Creation & SAS Time System - Production Ready ✅

**Last Updated:** October 10th, 2025

- **SAS Time Calculation Fix**: Removed incorrect frontend SAS time calculation that was overriding backend logic
- **Smart Detection System**: Enhanced detection logic to catch SAS time issues (same-day start times, inverted times)
- **Fix SAS Times Button**: Automatic detection and fixing of SAS time issues on Collection Report Details page
- **Confirmation Dialogs**: Added calm, informative confirmation dialogs for report creation and editing
- **Frontend-Backend Separation**: Backend now solely responsible for SAS metrics calculation using previous collection timestamps
- **Type Safety Improvements**: Fixed TypeScript errors in collection modals with proper type definitions
- **Race Condition Prevention**: Added time buffer logic to prevent SAS time validation failures
- **Collection History Management**: Proper cleanup and synchronization of collectionMetersHistory
- **Mobile Modal Enhancements**: Fixed display issues and improved mobile collection workflow

### Gaming Day Offset & Date Filtering System - Production Ready ✅

**Last Updated:** October 10th, 2025

- **Complete Gaming Day Offset Implementation**: All financial APIs use gaming day boundaries
- **Local Time vs UTC Conversion**: Proper handling of Trinidad time (UTC-4) to UTC conversion
- **Time Period Support**: Today, Yesterday, Last 7 Days, Last 30 Days, All Time, Custom
- **Movement Delta Method**: All financial calculations use sum of movement fields (no cumulative)
- **API Consistency**: Standardized date filtering across all endpoints
- **Collection Reports**: Use local time filtering (not gaming day offset)
- **Bill Validator**: Gaming day offset for predefined periods, local time for custom
- **Search by ID**: Added \_id search capability across locations, machines, and cabinets pages
- **Licensee Mapping**: Name to ObjectId conversion system for multi-tenant API compatibility
- **Comprehensive Documentation**: `.cursor/gaming-day-offset-rules.md` with implementation guide

### Custom Date Range & Time Inputs - Production Ready ✅

**Last Updated:** October 10th, 2025

- **Modern Date Range Picker**: Shadcn UI-based date range picker with optional time inputs
- **Time Picker Component**: Custom hour/minute selectors with dropdown interface
- **Proper State Management**: Fixed infinite loop issues with controlled component patterns
- **Date Range Indicator**: Dynamic display with time information when custom times are set
- **Timezone Handling**: Correct local time to UTC conversion for custom date ranges
- **Dropdown Improvements**: Responsive dropdowns with proper width constraints
- **Error Prevention**: Validation to prevent invalid date ranges and time selections
- **User Experience**: Immediate feedback when dates are selected, smooth transitions

### Financial Metrics System - Verified & Documented ✅

**Last Updated**: October 10th, 2025

- **Movement Delta Method**: Standard calculation method across all APIs
- **SAS GROSS Calculation**: Fixed to use movement delta method (not cumulative)
- **Collection Report Details**: Accurate SAS metrics using movement.drop and movement.totalCancelledCredits
- **Live Metrics**: Updated to use $last for cumulative fields (coinIn, coinOut, gamesPlayed, etc.)
- **API Consistency**: All endpoints return matching values for same time periods
- **Database Verification**: Comprehensive testing scripts to verify MongoDB vs API accuracy
- **Documentation**: Complete guide in `Documentation/backend/sas-gross-calculation-system.md`

### UI/UX Improvements - October 2025 ✅

- **Skeleton Loaders**: Content-specific skeleton loaders for all pages and components
- **Pagination**: Working pagination on locations and location details pages
- **Error Handling**: React Error Boundaries for graceful error handling
- **Loading States**: Proper loading states with skeleton loaders (no generic spinners)
- **Responsive Design**: Mobile-optimized layouts with proper touch targets
- **Date Display**: Consistent date/time formatting across all components
- **Console Cleanup**: Minimal API logging (only errors, no spam)

## Recent System Updates (November 2025)

### Unauthorized Access Error Handling System ✅ (December 2025)

**Last Updated:** December 2025

- **UnauthorizedError Component**: Dedicated error component for displaying user-friendly "Access Denied" messages when users attempt to access resources they don't have permission for
- **Location-Based Access Control**: Comprehensive security checks across all location-based endpoints:
  - Cabinet details pages (`/api/locations/[locationId]/cabinets/[cabinetId]`)
  - Machine details pages (`/api/machines/[machineId]`)
  - Location details pages (`/api/locations/[locationId]`)
  - Collection report pages (`/api/collection-report/[reportId]`)
  - Machine listing by location (`/api/machines?locationId=...`)
- **Security Implementation**: `checkUserLocationAccess()` helper function centralizes location access verification logic
- **User Experience**: Context-aware error messages with guidance to contact manager or customer support
- **Error Detection**: Frontend helpers detect 403 errors and re-throw with `isUnauthorized` flag for proper UI handling
- **Pages Protected**: Cabinet details, machine details, location details, and collection report detail pages all show proper unauthorized messages instead of generic errors
- **Files**: `components/shared/ui/errors/UnauthorizedError.tsx`, `app/api/lib/helpers/licenseeFilter.ts`, `lib/helpers/cabinets.ts`, `lib/helpers/collectionReport.ts`

### User Management Enhancements ✅ (December 2025)

**Last Updated:** December 2025

- **Account Status Toggle**: `isEnabled` checkbox in UserModal allows admins and managers to enable/disable user accounts
  - Managers can only toggle status for users in their licensee
  - Visual badge displays account status in view mode
- **Email Preservation Fix**: Fixed issue where email field would appear empty when editing other user fields
  - Email value now properly preserved from original user data when not explicitly changed
  - Prevents false "Email address cannot be empty" errors
- **Specific Error Messages**: Username and email conflict errors now show specific messages:
  - "Username already exists" (instead of generic "Username or email already exists")
  - "Email already exists" (instead of generic "Username or email already exists")
  - "Username and email already exist" (when both conflict)
- **Last Login Tracking**: `lastLoginAt` field automatically updated on successful login
- **Session Management**: `sessionVersion` incremented ONLY when permissions change (licensees, locations, roles), NOT on login
  - Allows multiple concurrent sessions across devices/tabs
  - Sessions invalidated only when admin changes user permissions
- **Files**: `components/administration/UserModal.tsx`, `app/api/lib/helpers/users.ts`, `app/api/users/route.ts`

### Authentication System Enhancements ✅ (December 2025)

**Last Updated:** December 2025

- **Email as Username Support**: Users can now log in with email address even if it's set as their username
  - Backend `authenticateUser()` checks both email and username fields
  - Frontend validation allows email-like patterns for username-based login
  - Users with email as username are prompted via ProfileValidationModal to change it
- **Hard Delete Detection**: Users are automatically logged out if their account is hard deleted from database
  - `getUserFromServer()` checks for user existence, soft-delete status, and disabled status
  - Middleware validates user status and forces logout with appropriate error messages
  - Login page displays specific messages for `user_not_found` and `user_deleted` scenarios
- **Logout Success Message**: Logout now properly redirects to login page with "Logout Successful" message instead of "Session Expired"
  - Logout button redirects to `/login?logout=success`
  - Login page parses URL parameters and displays appropriate success/error messages
- **Session Version Management**:
  - `sessionVersion` incremented ONLY when permissions change (licensees, locations, roles)
  - NOT incremented on login - allows multiple concurrent sessions
  - Profile updates that change critical fields (username, email, name, password) increment `sessionVersion` to force re-authentication
- **Files**: `app/api/lib/helpers/auth.ts`, `app/api/auth/login/route.ts`, `app/api/lib/helpers/users.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `components/layout/AppSidebar.tsx`

### Collection Report System - Major Refactoring ✅

**Last Updated:** December 22nd, 2025

#### Complete Component Refactoring

**Code Reduction Achievement:**

- `NewCollectionModal`: 3,604 lines → ~495 lines (86% reduction)
- `EditCollectionModal`: 2,877 lines → ~225 lines (92% reduction)
- `MobileCollectionModal`: 2,163 lines → ~100 lines (95% reduction)
- `MobileEditCollectionModal`: 3,795 lines → ~293 lines (92% reduction)
- `LocationsTab`: 5,118 lines → ~548 lines (89% reduction)
- `MetersTab`: 1,930 lines → ~403 lines (79% reduction)

**New Reusable Components** (`components/collectionReport/forms/`):

- `NewCollectionLocationMachineSelection`: Location and machine selection for new reports
- `NewCollectionFormFields`: Collection time, meter inputs, RAM clear, and notes
- `NewCollectionFinancials`: Shared financial inputs (Taxes, Advance, Variance, etc.)
- `NewCollectionCollectedMachines`: Display of collected machine entries
- `EditCollectionLocationMachineSelection`: Location and machine selection for editing
- `EditCollectionFormFields`: Collection time, meter inputs, RAM clear, and notes for editing
- `EditCollectionFinancials`: Financial inputs for editing reports
- `MobileLocationSelector`: Location selection for mobile modals
- `MobileMachineList`: Machine listing and selection for mobile
- `MobileEditLocationSelector`: Location selector for mobile edit modal
- `MobileEditMachineList`: Machine list for mobile edit modal

**New Custom Hooks** (`lib/hooks/collectionReport/`):

- `useNewCollectionModal.ts`: All state and logic for new collection modal
- `useEditCollectionModal.ts`: All state and logic for edit collection modal
- `useMobileCollectionModal.ts`: All state and logic for mobile collection modal
- `useMobileEditCollectionModal.ts`: All state and logic for mobile edit collection modal

**New Helper Files** (`lib/helpers/collectionReport/`):

- `newCollectionModalHelpers.ts`: Helper functions for new collection modal
- `editCollectionModalHelpers.ts`: Helper functions for edit collection modal
- `mobileEditCollectionModalHelpers.ts`: Helper functions for mobile edit collection modal

**Benefits:**

- Single responsibility components for better maintainability
- Reusable across create and edit modals
- Consistent UI/UX patterns
- Easier testing and debugging
- Proper scroll behavior (fixed headers/footers, scrollable content only)

#### Reports Tab Refactoring

**LocationsTab Refactoring:**

- Extracted `useLocationsTabData.ts` hook for all data fetching
- Created sub-components: `LocationsOverviewTab`, `LocationsSASEvaluationTab`, `LocationsRevenueAnalysisTab`
- Extracted helpers: `locationsTabHelpers.ts` for export functionality

**MetersTab Refactoring:**

## Coding Guidelines

rule("Backend API route files must follow strict structure and documentation for maintainability, clarity, and code quality.") {
appliesTo: "app/api/\*_/_/.ts"

checklist: [
"File-level JSDoc with summary, features, and @module tag",
"Imports grouped and ordered: helpers, types, utilities, Next.js, external libraries",
"Handler functions (e.g., GET) must use documented step-by-step visual comments and numbered steps",
"Each major operation inside handlers must be labeled as `STEP N: [Description]` with separator lines",
"Flow must be pre-documented in handler JSDoc (listing steps)",
"Complex or reusable logic extracted to app/api/lib/helpers/[feature].ts and imported",
"Performance tracking added (measure elapsed time; log >1000ms and on error)",
"Proper try/catch error handling with suitable HTTP status codes and safe error messages",
"No use of any types; types defined and imported where necessary",
"No direct db.collection access; always use imported Mongoose models from app/api/lib/models/",
"when querying by id, use findOne({ \_id: id }) not findById(id)",
"Licensee/location-based filtering for data according to user context"
]

rationale: """ - Ensures routes are easy to maintain, audit, and extend - Establishes uniform code/comment/documentation style - Prevents accidental type safety, security, or organization regressions - Enables scalable helper extraction and modularization - Prevents performance regressions by highlighting slow routes - Reduces error-proneness in database access
"""

examples: [
section("File-level JSDoc") {
snippet("""
/**
_ Machines API Route
_
_ This route handles machine record retrieval and status reporting.
_ It supports:
_ - List all machines
_ - Filter by location/licensee
_ - Fetch machine status info
_
_ @module app/api/machines/route
_/
""")
},
section("Import order") {
snippet("""
// Helpers
import { getUserFromServer } from '@/app/api/lib/helpers/auth';
import { fetchMachines } from '@/app/api/lib/helpers/machines';
// Types
import { type Machine, type MachineStatus } from '@/app/api/lib/types';
// Utilities
import { connectDB } from '@/app/api/lib/utils/db';
// Next.js
import { NextRequest, NextResponse } from 'next/server';
""")
},
section("Handler structure with comments and flow doc") {
snippet("""
/**
_ Main GET handler for machines
_
_ Flow:
_ 1. Parse and validate request parameters
_ 2. Authenticate user and get allowed locations
_ 3. Fetch machines from database
_ 4. Transform results
_ 5. Return JSON response
\*/
export async function GET(req: NextRequest) {
const startTime = Date.now();
try {
// ============================================================================
// STEP 1: Parse and validate request parameters
// ============================================================================
const { searchParams } = new URL(req.url);
const licensee = searchParams.get('licensee') || searchParams.get('licencee');

           // ============================================================================
           // STEP 2: Authenticate user and get allowed locations
           // ============================================================================
           const user = await getUserFromServer();
           const allowedLocationIds = await getUserLocationFilter(licensee ?? undefined);

           // ============================================================================
           // STEP 3: Fetch machines from database
           // ============================================================================
           const machines = await fetchMachines({ ...params, allowedLocationIds });

           // ============================================================================
           // STEP 4: Transform results
           // ============================================================================
           const response = machines.map(transformMachine);

           // ============================================================================
           // STEP 5: Return response
           // ============================================================================
           const duration = Date.now() - startTime;
           if (duration > 1000) {
             console.warn(`[Machines API] Completed in ${duration}ms`);
           }
           return NextResponse.json(response);
         } catch (err) {
           const duration = Date.now() - startTime;
           console.error(`[Machines API] Failed after ${duration}ms:`, err);
           const errorMessage = err instanceof Error ? err.message : 'Server Error';
           return NextResponse.json({ error: errorMessage }, { status: 500 });
         }
       }
       """)
     }

]

antiPatterns: [
"Missing step-by-step comments or visual separators",
"No file-level JSDoc or @module tag",
"Direct use of db.collection(...) or findById/findByIdAndUpdate",
"Overly long handler functions: >20-30 lines per helper/logic block",
"Usage of any type in parameters or results",
"Untracked slow operations",
"Comments that do not match executed steps",
"No input validation or missing HTTP status codes on error"
]
}

rule("Backend API helper files must be modular, documented, and typed.") {
appliesTo: "app/api/lib/helpers/\*_/_/.ts"
checklist: [
"File-level JSDoc with feature/domain description and @module tag",
"Sectioned with visual comments for function grouping (data fetch, transform, etc)",
"All exported functions have JSDoc with params and return annotated",
"No use of any type; all params and results are well-typed",
"Helper must be focused on one business domain (e.g., metersReport, auth, machines)"
]
rationale: "Ensures helpers are reusable, clear, and testable; supports IDE navigation and onboarding."
}

rule("Backend API route and helper files must not exceed line limits.") {
appliesTo: [
{ pattern: "app/api/**/route.ts", maxLines: 500 },
{ pattern: "app/api/lib/helpers/**/*.ts", maxLines: 600 },
{ pattern: "app/api/lib/models/**/*.ts", maxLines: 400 },
{ pattern: "app/api/lib/utils/**/*.ts", maxLines: 400 }
]
remedy: "Extract to more helper files or split by domain when exceeding limit."
}

rule("All backend code must use strict TypeScript standards.") {
appliesTo: "app/api/\*_/_"
checklist: [
"Prefer type over interface unless extending interfaces",
"No any types",
"No underscore-prefixed variables, except _id for MongoDB",
"Types organized: shared/types (cross-domain), app/api/lib/types (backend only)",
"Database types modelled using InferSchemaType<typeof schema> & Document for Mongoose"
]
rationale: "Type safety, maintainability, and clarity for all contributors."
}

rule("All backend database access must use Mongoose models, not direct collection calls.") {
appliesTo: "app/api/\*_/_/.ts"
must: [
"Import models from @/app/api/lib/models/ (e.g., import { Machine } from '@/app/api/lib/models/machines')",
"Use Model.findOne({ _id: id }) for string IDs, not findById",
"Never use db.collection(), Model.findById(), Model.findByIdAndUpdate()"
]
rationale: "Prevents type-unsafe code and leverages Mongoose features."
modelsList: [
"Member", "Machine", "GamingLocations", "Meters", "MachineSession", "MachineEvents", "Licencee",
"Countries", "Collections", "CollectionReport", "MovementRequest", "Feedback", "Firmware",
"Scheduler", "AcceptedBills", "ActivityLog", "User"
]
remedy: "See all models in app/api/lib/models/; always use model methods and string \_id."
}

rule("Licensee/location-based filtering is required for all appropriate backend queries.") {
appliesTo: "app/api/\*_/_/.ts"
snippet("""
// Always support both spellings
const licensee = searchParams.get('licensee') || searchParams.get('licencee');
// Get user's accessible locations
const allowedLocationIds = await getUserLocationFilter(licensee || undefined);
// Apply filter to query
if (allowedLocationIds !== 'all') {
matchStage['gamingLocation'] = { $in: allowedLocationIds };
}
""")
rationale: "Enforces correct access control."
}

section("Checklists and Refactoring Tracker") {

body: """

### For every API route file:

- File-level JSDoc added
- Step-by-step comments
- Numbered steps in handlers
- Helper extraction done
- Performance & error handling
- Imports organized
- No any
- Within line limits
- Refactoring tracker updated if refactored

### For every helper file:

- File-level JSDoc and section comments
- Typed params/results
- Focus on a single feature domain

### Refactoring Checklist

- File-level JSDoc added
- Step-by-step comments
- Numbered steps in handlers
- Helper extraction done
- Performance & error handling
- Imports organized
- No any
- Within line limits
- Refactoring tracker updated if refactored
  """
  }

reference("Examples") {
files: [
"app/api/reports/meters/route.ts",
"app/api/lib/helpers/metersReport.ts",
"app/api/dashboard/totals/route.ts"
]
rationale: "Use as reference for ideal structure."
}

rule("User data caching patterns for frontend components.") {
appliesTo: "lib/**/\*.ts", "components/**/_.tsx", "app/\*\*/_.tsx"

checklist: [
"Use fetchUserWithCache for user-related API calls that don't change frequently",
"Use CACHE_KEYS constants for cache key names",
"Clear cache when user data changes (login/logout)",
"Understand in-flight request deduplication",
"Set appropriate TTL based on data freshness requirements"
]

rationale: """ - Prevents duplicate API calls for the same data - Reduces server load and improves performance - Ensures data consistency across components - Prevents race conditions with concurrent requests
"""

whenToUse: """
**When to use userCache:** - User profile data that doesn't change frequently - User permissions that are cached for session duration - Current user data that multiple components need - Any user-related data fetched from /api/auth/current-user or similar

    **When NOT to use:**
    - Real-time data that changes frequently
    - Data that must always be fresh (use React Query with short staleTime instead)
    - One-time data that won't be reused

"""

howToUse: """

````typescript
import { CACHE_KEYS, fetchUserWithCache } from '@/lib/utils/userCache';

    // Example: Fetching user profile with caching
    const userProfile = await fetchUserWithCache(
      CACHE_KEYS.USER_PROFILE,
      async () => {
        const response = await axios.get('/api/user/profile');
        return response.data;
      },
      5 * 60 * 1000 // TTL: 5 minutes (optional, defaults to 5 min)
    );
    ```

    **Cache Keys:**
    - CACHE_KEYS.CURRENT_USER - Current authenticated user data
    - CACHE_KEYS.USER_PROFILE - User profile information
    - CACHE_KEYS.USER_PERMISSIONS - User permissions and roles

    **TTL (Time To Live):**
    - Default: 5 minutes (5 * 60 * 1000 ms)
    - Customize based on data freshness requirements
    - Longer TTL for stable data (user roles, profile)
    - Shorter TTL for data that changes more frequently

"""

whyToUse: """
**Performance Benefits:** - Prevents duplicate API calls when multiple components need same data - Reduces network requests and server load - Improves perceived performance (instant data from cache)

    **In-Flight Deduplication:**
    - If multiple components request same data simultaneously, they share the same promise
    - Prevents race conditions and duplicate requests
    - First request fetches, others wait for same promise

    **Cache Invalidation:**
    - Automatically cleared when user logs in/out (via userStore)
    - Call clearUserCache() manually when user data changes
    - Cache expires based on TTL (automatic cleanup)

"""

examples: [
section("Basic usage") {
snippet("""
import { CACHE_KEYS, fetchUserWithCache } from '@/lib/utils/userCache';

      const userData = await fetchUserWithCache(
        CACHE_KEYS.CURRENT_USER,
        async () => {
          const res = await axios.get('/api/auth/current-user');
          return res.data;
        }
      );
      """)
    },
    section("Custom TTL") {
      snippet("""
      // Cache for 10 minutes instead of default 5
      const data = await fetchUserWithCache(
        CACHE_KEYS.USER_PROFILE,
        fetchFn,
        10 * 60 * 1000 // 10 minutes
      );
      """)
    },
    section("Cache invalidation") {
      snippet("""
      import { clearUserCache } from '@/lib/utils/userCache';

      // Clear all user cache (e.g., on logout)
      clearUserCache();
      """)
    }

]

antiPatterns: [
"Caching real-time data that changes frequently",
"Not clearing cache on user changes",
"Using cache for data that must always be fresh",
"Creating custom cache keys instead of using CACHE_KEYS constants",
"Setting TTL too long for frequently changing data"
]
}

meta {
lastUpdated: "2025-11-22"
author: "Aaron Hazzard"
version: "1.1.0"
}
````
