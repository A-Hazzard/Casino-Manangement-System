# Evolution One Casino Management System - Application Context

**Author:** Aaron Hazzard - Senior Software Engineer

**Last Updated:** October 10th, 2025

## System Overview

The Evolution One Casino Management System (CMS) is a comprehensive casino management platform built with Next.js, TypeScript, and MongoDB. It manages slot machine operations, financial tracking, member management, and regulatory compliance for casino operations.

## Core Architecture

### Technology Stack

- **Frontend:** Next.js 15.3.0 with TypeScript, React, Tailwind CSS
- **Backend:** Next.js API Routes with MongoDB
- **Database:** MongoDB with Mongoose ODM
- **State Management:** Zustand for global state, React Context for local state
- **UI Components:** Radix UI (Shadcn), Lucide React icons, Framer Motion animations
- **Authentication:** JWT with `jose` library, HTTP-only cookies
- **Build Tool:** pnpm for package management
- **Type System:** Comprehensive TypeScript with centralized shared types

### Project Structure

```
evolution-one-cms/
├── app/                          # Next.js App Router
│   ├── api/                     # Backend API routes
│   │   ├── lib/                 # Shared backend utilities
│   │   │   ├── models/          # Mongoose schemas
│   │   │   ├── helpers/         # Business logic helpers
│   │   │   └── middleware/      # Database and auth middleware
│   │   └── [endpoints]/         # API route handlers
│   ├── [pages]/                 # Frontend pages
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   ├── layout/                  # Layout components
│   └── [feature]/               # Feature-specific components
├── lib/                         # Shared utilities
│   ├── helpers/                 # Frontend helpers
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript type definitions
│   └── store/                   # Zustand stores
├── shared/                      # Shared types and utilities
└── Documentation/               # System documentation
```

## Core Business Logic

### Casino Machine Financial Flow

The system tracks the complete financial lifecycle of slot machines:

1. **Member Gaming Session** → **Machine Events** → **Meter Readings** → **Collections** → **Collection Reports**

### Key Financial Metrics

Based on `Documentation/financial-metrics-guide.md`:

- **Drop (Money In):** Physical cash inserted into machines (`movement.drop`)
- **Total Cancelled Credits (Money Out):** Manual payouts (`movement.totalCancelledCredits`)
- **Gross Revenue:** `Drop - Total Cancelled Credits`
- **Coin In:** Total bets placed (`movement.coinIn`)
- **Coin Out:** Automatic winnings paid (`movement.coinOut`)
- **Games Played:** Total games played (`movement.gamesPlayed`)

### Financial Calculations

```typescript
// Primary calculation (Movement Delta Method)
// Used across all financial APIs - sums movement fields from meters
const gross = drop - totalCancelledCredits;

// Alternative handle/win analysis
const handle = coinIn;
const win = coinOut + jackpot;
const actualRtp = win / handle;
const actualHold = 1 - actualRtp;

// IMPORTANT: All calculations use Movement Delta Method
// - Sum movement.drop for money in
// - Sum movement.totalCancelledCredits for money out
// - NEVER use first/last cumulative approach
```

## Database Relationships

### Core Entity Hierarchy

```
Licencee → GamingLocation → Machine → MachineSession → MachineEvent
                ↓              ↓
            Collection    CollectionReport
                ↓
            Meters (for financial tracking)
```

### Key Relationships (from `Documentation/frontend/database-relationships.md`):

1. **Licencee → GamingLocation:** Multi-tenant architecture
2. **GamingLocation → Machine:** Physical slot machines at locations
3. **Machine → MachineSession:** Player gaming sessions
4. **MachineSession → MachineEvent:** Detailed event logging
5. **Machine → Collection:** Financial collection records
6. **Collection → CollectionReport:** Aggregated financial summaries
7. **Machine → Meters:** Real-time meter readings

### Critical Fields for Collections

- **`locationReportId`:** Links collections to collection reports
- **`collectionMeters`:** Previous collection tracking in machines
- **`collectionTime`:** SAS time period calculation
- **`collectorDenomination`:** Collection report multiplier

## Collection and Collection Report System

### Collection Creation Process

1. **SAS Metrics Calculation (Backend Only):**
   - Query meters collection by machine (serialNumber | customName | machineId)
   - Calculate drop, totalCancelledCredits, gross from movement objects
   - Set sasStartTime from **previous collection timestamp** (not current machine.collectionTime)
   - Set sasEndTime to current collection time
   - **Race Condition Prevention**: 1-minute buffer to prevent simultaneous collection conflicts

2. **Movement Calculation:**
   - `metersIn = currentMetersIn - previousMetersIn` (from collectionMeters)
   - `metersOut = currentMetersOut - previousMetersOut` (from collectionMeters)

3. **Machine Updates:**
   - Update machine.collectionMeters with new metersIn/metersOut
   - Update machine.collectionTime and machine.previousCollectionTime
   - Update collectionMetersHistory with proper timestamps

### Collection Report Creation

- Aggregates multiple collections by location
- Calculates totals: totalDrop, totalGross, totalCancelled
- Tracks variance between expected and actual collections
- Links to collections via locationReportId
- **Smart Detection**: Automatically detects SAS time issues (inverted times, same-day starts)
- **Fix SAS Times**: Button to automatically correct SAS time issues and recalculate metrics
- **Confirmation Dialogs**: User confirmation for report creation and editing operations

### SAS Time Validation System

- **Pre-Creation Validation**: Prevents creation of reports with invalid SAS times
- **Smart Detection Logic**: Detects various SAS time anomalies:
  - Inverted times (start >= end)
  - Same-day start times (should be previous day)
  - Unreasonable date ranges (too old, future dates)
  - Unusual time spans (< 1 hour or > 48 hours)
- **Automatic Fixing**: Recalculates SAS metrics and updates machine history
- **Collection History Sync**: Ensures collectionMetersHistory matches actual collection timestamps

## Engineering Guidelines

### TypeScript Discipline

- All types in `shared/types/`, `lib/types/`, or `types/` directories
- **Single Source of Truth**: Types consolidated in `shared/types/` to eliminate duplication
- Prefer `type` over `interface` for consistency
- No `any` types allowed - use proper type definitions
- Always check dependencies before deleting code
- **Type Consolidation**: Systematic reduction of duplicate type files across frontend/backend

### Code Organization

- Keep page components lean, offload logic to helpers
- API logic in `lib/helpers/` or feature directories
- Shared utilities in `lib/utils/`
- Context providers in `lib/contexts/`

### Build and Quality

- Use `pnpm` exclusively for package management
- Always run `pnpm build` after changes
- Never ignore ESLint violations
- Follow established code style

### Loading States and Skeleton Loaders - CRITICAL REQUIREMENTS

- **MANDATORY: Every page and component with async data MUST use specific skeleton loaders**
- **NEVER use generic loading states** like "Loading...", "Loading Data", or generic spinners
- **EVERY skeleton loader MUST exactly match the layout and structure of the actual content**
- **Skeleton loaders MUST be page/component-specific** - no generic reusable skeletons for different content types

#### Skeleton Loader Requirements:

1. **Content-Specific Skeletons:** Each page must have its own skeleton that matches the exact layout of the real content
2. **Visual Accuracy:** Exact dimensions and spacing as the real content, proper visual hierarchy, all interactive elements represented
3. **Implementation Standards:** Use Shadcn Skeleton component, create dedicated skeleton files in `components/ui/skeletons/`
4. **File Organization:** Skeleton files in `components/ui/skeletons/[PageName]Skeletons.tsx`
5. **Mobile-Specific Requirements:** Every page and section must have mobile-specific loaders that match mobile layouts

### Security

- JWT tokens with `jose` library and HTTP-only cookies
- OWASP standards compliance
- Never expose sensitive data client-side
- Validate and sanitize all user input
- **Role-Based Access Control**: Comprehensive permission system with casino hierarchy
- **Session Management**: Secure token handling with automatic logout
- **Activity Logging**: Complete audit trail for all user actions
- **Account Security**: Failed login tracking and account locking

## Key Features

### Gaming Day Offset System ⭐ CRITICAL

**See: `.cursor/gaming-day-offset-rules.md` for complete documentation**

- **Purpose**: Align financial reporting with actual business operations
- **Default**: Gaming day starts at 8 AM Trinidad time (not midnight)
- **Storage**: `gamingLocations.gameDayOffset` (0-23 hours)
- **Local Time vs UTC**: Users query in Trinidad time (UTC-4), database stores in UTC
- **Time Conversion**: Backend converts local time to UTC before querying
- **When Applied**: All meter-based financial queries (machines, locations, dashboard)
- **When NOT Applied**: Collection reports, activity logs, custom date ranges with times

#### Critical Rules:

1. **Meter Data = Gaming Day Offset**: All financial metrics use gaming day boundaries
2. **Event Data = Local Time**: Collection reports and activity logs use calendar days
3. **Custom Dates = User's Exact Times**: No gaming day adjustment for user-specified times
4. **Always Default to 8**: Use `gameDayOffset ?? 8` (not `|| 8` which fails for 0)
5. **Convert Local to UTC**: Add 4 hours to local time for database queries

### Multi-Tenant Architecture

- Each licensee has isolated data
- All queries filter by `rel.licencee`
- No cross-tenant data access
- Licensee name to ObjectId mapping system for API compatibility

### Soft Delete System

- `deletedAt` field for all major entities
- Active records: `deletedAt: null` or `deletedAt < 1970-01-01`
- Deleted records: `deletedAt >= 1970-01-01`

### Currency System

- Zustand-based currency management
- Support for USD, TTD, GYD, BBD
- Real-time exchange rate fetching
- Automatic currency conversion in financial displays

### Activity Logging

- Comprehensive audit trail
- User action tracking
- Resource-based filtering
- Time-based queries with hour/minute/second precision

## API Patterns

### Standard Endpoint Structure

```typescript
// GET endpoints with filtering
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const filter = buildFilter(searchParams);
  const results = await Model.find(filter).lean();
  return NextResponse.json(results);
}

// POST endpoints with validation
export async function POST(req: NextRequest) {
  await connectDB();
  const data = await req.json();
  const validated = validateData(data);
  const created = await Model.create(validated);
  return NextResponse.json(created);
}
```

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
```

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
import { InfoConfirmationDialog } from "@/components/ui/InfoConfirmationDialog";

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

## Recent System Updates (October 2025)

### Authentication & Authorization System - Complete Implementation

- **JWT-Based Authentication**: Secure token-based authentication with access and refresh tokens
- **Role-Based Access Control (RBAC)**: Comprehensive permission system with casino hierarchy
  - **Super Admin**: Full system access and management capabilities
  - **Admin**: User management, system configuration, and reporting
  - **Manager**: Location and machine management, collection oversight
  - **Collector**: Collection operations and basic reporting
  - **Viewer**: Read-only access to reports and analytics
- **Protected Routes**: All main pages wrapped with `ProtectedRoute` HOC for access control
- **Permission-Based UI**: Components show/hide based on user permissions
- **Session Management**: Secure session handling with automatic logout on token expiration
- **Activity Logging**: Comprehensive audit trail for all authentication events
- **Account Security**: Failed login attempt tracking, account locking, and security monitoring

### Type System Consolidation - In Progress

- **Centralized Types**: All authentication types consolidated in `shared/types/auth.ts`
- **Eliminated Duplicates**: Removed duplicate type definitions across frontend/backend
- **Standardized Imports**: Consistent type imports from shared locations
- **Type Safety**: Comprehensive TypeScript coverage across all components
- **API Response Standardization**: Unified response formats across all endpoints
- **Build Optimization**: Reduced bundle size and improved compilation performance

### API & Data Management Enhancements

- **Real MongoDB Integration**: All APIs now use actual database queries instead of mock data
- **Activity Logging**: Comprehensive `logActivity` function with standardized parameters
- **Error Handling**: Consistent error response formats across all endpoints
- **Data Validation**: Server-side validation for all API operations
- **Performance Optimization**: Efficient database queries with proper indexing

### Collection Report System - Complete Implementation

- **Multi-Platform Collection Interface**: Desktop and mobile-optimized collection report creation
- **Mobile-First Design**: Complete mobile collection modal with slide-up animations and touch-optimized workflow
- **Location-Based Machine Selection**: Select location → view machines → add to collection list
- **Financial Input Management**: Default values (0) for optional fields, collected amount as only required field
- **Rollover Warning System**: Individual machine warnings when meters in < previous meters in
- **Real-time Validation**: Frontend and backend validation for all collection data
- **Activity Logging**: Comprehensive audit trail for all collection activities
- **Multi-tab Interface**: Collection, Monthly, Manager, and Collector schedule management
- **SAS Metrics Integration**: Accurate meter calculations and financial reporting

### Mobile Collection Modal System

- **Responsive Design**: Tailwind CSS-based mobile detection without JavaScript
- **Slide-up List Panel**: Animated list view for managing collected machines
- **Touch-Optimized Interface**: Large buttons, proper spacing, mobile-friendly inputs
- **Contextual Navigation**: Edit/close buttons with smooth animations
- **Location-Machine Workflow**: Streamlined mobile collection process
- **Modern Date/Time Picker**: Shadcn UI components for professional date selection

### Cabinet Management Enhancements

- **Manufacturer Field Integration**: Dynamic manufacturer selection from existing machine data
- **SMIB Board Validation**: Comprehensive validation for SMIB board serial numbers
- **Serial Number Auto-Capitalization**: Automatic uppercase conversion for serial numbers
- **Game Type Management**: Full CRUD operations for game types in create/edit modals
- **Collection Settings**: Configure collection parameters and track collection state
- **Firmware Management**: Upload, version control, and deployment of SMIB firmware
- **Movement Requests**: Cabinet relocation workflow with approval system

### API and Data Management

- **Manufacturers API**: Dynamic manufacturer fetching from machines collection
- **Countries Integration**: Country selection with proper ID storage
- **Geolocation Support**: Automatic lat/long detection for location creation
- **Backend Validation**: Server-side validation for all cabinet and location operations
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Error Handling**: Graceful error handling with user feedback

### Skeleton Loading System - Production Ready

- **Content-Specific Skeletons**: Each page has unique skeleton loaders matching exact layouts
- **Mobile-Responsive Skeletons**: Separate mobile and desktop skeleton implementations
- **Component-Specific Loaders**: Dedicated skeletons for modals, tables, cards, and forms
- **Animation Consistency**: Smooth loading transitions matching real content
- **Performance Optimized**: Efficient skeleton rendering without layout shifts

### Financial System Enhancements

- **Default Value Management**: Smart defaults for optional financial fields
- **Required Field Validation**: Clear indication of required vs optional fields
- **Currency Support**: Multi-currency support with real-time conversion
- **Variance Tracking**: Comprehensive variance analysis and reporting
- **Audit Trail**: Complete financial transaction logging

### Security and Validation

- **Input Sanitization**: All user inputs properly validated and sanitized
- **Backend Validation**: Server-side validation for all API endpoints
- **Type Safety**: Comprehensive TypeScript coverage preventing runtime errors
- **Error Boundaries**: Graceful error handling throughout the application
- **Activity Logging**: Complete audit trail for all user actions

## Current System Status (October 27th, 2025)

### Build System Status ✅

- **TypeScript Compilation**: ✅ Clean (no errors)
- **ESLint**: ✅ Clean (no warnings)
- **Type Check**: ✅ Passing with strict mode
- **Production Build**: ✅ Optimized and working
- **Type Safety**: ✅ Comprehensive coverage across all components
- **Bundle Size**: ✅ Optimized with code splitting

### Gaming Day Offset System ✅

- **Implementation**: ✅ Complete across all financial APIs
- **Documentation**: ✅ Comprehensive rules file in `.cursor/gaming-day-offset-rules.md`
- **Testing**: ✅ Verified with MongoDB comparison scripts
- **API Coverage**: ✅ Machines, Locations, Dashboard, Bill Validator
- **Exception Handling**: ✅ Collection reports use local time correctly
- **Edge Cases**: ✅ Handles offset = 0, missing offsets, custom dates

### Financial Metrics System ✅

- **Calculation Method**: ✅ Movement Delta Method standardized
- **API Consistency**: ✅ All endpoints return matching values
- **SAS GROSS**: ✅ Fixed to use correct movement delta calculation
- **Live Metrics**: ✅ Properly displays cumulative values
- **Database Verification**: ✅ Scripts confirm accuracy vs MongoDB
- **Documentation**: ✅ Complete implementation guides

### UI/UX System ✅

- **Date Range Picker**: ✅ Working with optional time inputs
- **Pagination**: ✅ Functional on all table views
- **Skeleton Loaders**: ✅ Content-specific loaders for all pages
- **Error Handling**: ✅ Error boundaries implemented
- **Responsive Design**: ✅ Mobile-optimized layouts
- **Loading States**: ✅ No generic spinners, all content-specific

### Authentication System Status ✅

- **JWT Implementation**: ✅ Complete with secure token handling
- **Role-Based Access**: ✅ All pages protected with proper permissions
- **Session Management**: ✅ Automatic logout and token refresh
- **Security Monitoring**: ✅ Activity logging and account locking
- **Licensee Filtering**: ✅ Multi-tenant data isolation working

### SMIB Management System Status ✅

- **OTA Firmware Updates**: ✅ GridFS storage, dynamic serving, auto-cleanup
- **SMIB Restart**: ✅ Individual and location-wide with visual feedback
- **Meter Management**: ✅ Request and reset meters with proper validation
- **Configuration Tracking**: ✅ updatedAt timestamps for all config sections
- **Location Operations**: ✅ Batch processing for multiple SMIBs
- **MQTT Discovery**: ✅ Real-time detection including unassigned SMIBs
- **Activity Logging**: ✅ Complete audit trail for all operations
- **Type Safety**: ✅ Full TypeScript coverage with shared types

## Current Development Priorities (October 2025)

### Completed ✅

1. ✅ **Gaming Day Offset System**: Complete implementation with comprehensive documentation
2. ✅ **Financial Metrics Accuracy**: All APIs return consistent, verified values
3. ✅ **Date Filtering System**: Proper timezone handling across all endpoints
4. ✅ **Custom Date Ranges**: Working time inputs with proper validation
5. ✅ **UI/UX Polish**: Skeleton loaders, pagination, error handling
6. ✅ **API Consistency**: Standardized response formats and calculation methods
7. ✅ **Collection Report Creation**: Fixed SAS time calculation and validation system
8. ✅ **SAS Time Detection**: Smart detection and automatic fixing of SAS time issues
9. ✅ **Type Safety**: All TypeScript errors resolved with proper type definitions
10. ✅ **SMIB Management System**: Complete OTA, restart, meters, and configuration management
11. ✅ **Firmware Management**: GridFS storage, upload, download, and dynamic serving system
12. ✅ **Location-Wide Operations**: Batch SMIB operations with MQTT discovery
13. ✅ **Real-time MQTT Control**: Live configuration updates and device management

### High Priority

1. **Performance Optimization**: Optimize MongoDB aggregation queries for large datasets
2. **Real-time Updates**: Implement WebSocket or polling for live data updates
3. **Advanced Analytics**: Enhanced reporting and data visualization features
4. **Mobile App Development**: Native mobile application for collection operations

### Medium Priority

1. **Test Coverage**: Increase automated testing coverage for critical paths
2. **Error Monitoring**: Implement comprehensive error tracking (e.g., Sentry)
3. **Performance Monitoring**: Add performance tracking and analytics
4. **Documentation**: Keep all documentation current with system changes

### Low Priority

1. **Type System Consolidation**: Further reduce duplicate type files
2. **Code Cleanup**: Remove unused code and optimize bundle size
3. **Accessibility**: Enhance ARIA labels and keyboard navigation
4. **Internationalization**: Add multi-language support

## Key Documentation Files

### Architecture & Guidelines

- **`.cursor/application-context.md`** (this file): Complete system overview and current status
- **`.cursor/rules/nextjs-rules.mdc`**: Engineering rules and best practices
- **`.cursor/gaming-day-offset-rules.md`**: Gaming day offset implementation guide

### Feature Documentation

- **`Documentation/financial-metrics-guide.md`**: Financial calculations and metrics
- **`Documentation/backend/sas-gross-calculation-system.md`**: SAS GROSS implementation
- **`Documentation/backend/gaming-day-offset-system.md`**: Gaming day offset details
- **`Documentation/backend/bill-validator-calculation-system.md`**: Bill validator system
- **`Documentation/currency-converter-system.md`**: Currency conversion system
- **`Documentation/frontend/database-relationships.md`**: Database schema relationships

### Best Practices

- **Always check `.cursor/gaming-day-offset-rules.md`** before implementing date filtering
- **Refer to engineering rules** in `.cursor/rules/nextjs-rules.mdc` for code standards
- **Use Movement Delta Method** for all financial calculations (sum of movement fields)
- **Convert local time to UTC** for all database queries (Trinidad UTC-4 → UTC)
- **Test with MongoDB scripts** to verify API accuracy before deployment

---

This context file provides a comprehensive overview of the Evolution One Casino Management System. Use this as reference when working on any part of the system to maintain consistency and understand the broader context of your changes.

**Last Major Update:** October 27th, 2025 - SMIB Management System Complete, OTA Firmware Updates, Location-Wide Operations, Real-time MQTT Control
