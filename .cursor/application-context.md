# Evolution One Casino Management System - Application Context

**Author:** Aaron Hazzard - Senior Software Engineer  

**Last Updated:** September 23rd, 2025

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
// Primary calculation
const gross = drop - totalCancelledCredits;

// Alternative handle/win analysis
const handle = coinIn;
const win = coinOut + jackpot;
const actualRtp = win / handle;
const actualHold = 1 - actualRtp;
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
1. **SAS Metrics Calculation:**
   - Query meters collection by machine (serialNumber | customName | machineId)
   - Calculate drop, totalCancelledCredits, gross from movement objects
   - Set sasStartTime from machineSessions.collectionTime
   - Set sasEndTime to current time or custom input

2. **Movement Calculation:**
   - `metersIn = currentMetersIn - previousMetersIn` (from collectionMeters)
   - `metersOut = currentMetersOut - previousMetersOut` (from collectionMeters)

3. **Machine Updates:**
   - Update machine.collectionMeters with new metersIn/metersOut
   - Update machine.collectionTime

### Collection Report Creation
- Aggregates multiple collections by location
- Calculates totals: totalDrop, totalGross, totalCancelled
- Tracks variance between expected and actual collections
- Links to collections via locationReportId

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

### Multi-Tenant Architecture
- Each licensee has isolated data
- All queries filter by `rel.licencee`
- No cross-tenant data access

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


## Recent System Updates (September 2025)

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

## Current System Status

### Type System Consolidation - Active
- **Status**: In progress with comprehensive analysis completed
- **Target**: Reduce 25+ type files to 8-10 core files
- **Progress**: Authentication types consolidated, API types standardized
- **Next Steps**: Entity type consolidation and component type optimization
- **Documentation**: See `TYPE_CONSOLIDATION_ANALYSIS.md` and `TYPE_SYSTEM_INVENTORY.md`

### Build System Status
- **TypeScript Compilation**: ✅ Clean (no errors)
- **ESLint**: ✅ Clean (no warnings)
- **Build Process**: ✅ Optimized production builds working
- **Type Safety**: ✅ Comprehensive coverage across all components

### Authentication System Status
- **JWT Implementation**: ✅ Complete with secure token handling
- **Role-Based Access**: ✅ All pages protected with proper permissions
- **Session Management**: ✅ Automatic logout and token refresh
- **Security Monitoring**: ✅ Activity logging and account locking

## Current Development Priorities

### High Priority
1. **Type System Consolidation**: Complete the systematic reduction of duplicate type files
2. **API Response Standardization**: Ensure all endpoints use consistent response formats
3. **Component Type Optimization**: Create generic component types for reusability

### Medium Priority
1. **Database Query Optimization**: Improve performance of MongoDB queries
2. **Error Handling Enhancement**: Standardize error responses across all APIs
3. **Documentation Updates**: Keep all documentation current with system changes

### Low Priority
1. **Test Coverage Enhancement**: Increase automated testing coverage
2. **Performance Monitoring**: Implement comprehensive performance tracking
3. **Mobile App Development**: Plan for future mobile application

## Recent System Updates (January 2025)

### Collection System Implementation
- **Complete Collection Management System** implemented with full CRUD operations
- **Collection Reports**: Main dashboard for viewing, filtering, and managing collection reports
- **Collection Detail Views**: Detailed machine-level and location-level financial analysis
- **New Collection Modal**: Comprehensive interface for creating collection reports with machine selection
- **Financial Calculations**: Accurate drop, cancelled credits, gross revenue, and variance calculations
- **Multi-tab Interface**: Collection, Monthly, Manager, and Collector schedule management
- **Real-time Data**: Live updates and refresh functionality across all collection components

### Date Filter System Enhancement
- **Custom Date Range Fix**: Resolved timezone conversion issues for accurate date filtering
- **All Time Filter**: Implemented proper "All Time" filtering across all endpoints
- **Independent Date Filters**: Activity Log and Bill Validator now have separate date filters
- **MUI TimePicker Integration**: Professional time selection components replacing basic HTML inputs
- **Date Range Validation**: Comprehensive date validation and error handling

### Cabinet Management System
- **SMIB Configuration**: Complete SMIB (Slot Machine Interface Board) management interface
- **Firmware Management**: Upload, version control, and deployment of SMIB firmware
- **Movement Requests**: Cabinet relocation workflow with approval system
- **Real-time Monitoring**: Live cabinet status tracking and performance analytics
- **Collection Settings**: Configure collection parameters and track collection state

### Sample Data Removal
- **All sample and mock data has been removed** from the codebase
- Components now use empty arrays and placeholder messages for MongoDB integration
- All hardcoded data arrays replaced with TODO comments for future MongoDB implementation
- TypeScript errors from sample data removal resolved with proper type handling

### Skeleton Loading System Implementation
- **Comprehensive skeleton loading system** implemented across all pages
- Each page has specific skeleton loaders that match exact content layout
- Mobile-specific skeleton loaders for responsive design
- Skeleton files organized in `components/ui/skeletons/` directory
- All generic loading states replaced with content-specific skeletons

### MongoDB Integration Status
- **All APIs now use real MongoDB data** - no sample data in API routes
- Frontend components prepared for MongoDB data fetching
- Placeholder implementations ready for real data integration
- Financial calculations and business logic preserved for real data

---

This context file provides a comprehensive overview of the Evolution One Casino Management System. Use this as reference when working on any part of the system to maintain consistency and understand the broader context of your changes.
