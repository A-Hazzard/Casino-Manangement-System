# Custom Hooks Organization

This directory contains all custom React hooks organized by functionality for better maintainability and discoverability.

## Folder Structure

### `/auth` - Authentication & User Management

- `useAuth.ts` - Main authentication hook with role-based access control
- `useUserProfileValidation.ts` - User profile validation logic
- `useUserValidation.ts` - Comprehensive user validation with API integration

### `/data` - Data Fetching & State Management

- `useAcceptedBills.ts` - Bill validator data fetching
- `useAdministrationData.ts` - Administration data fetching (users, licensees, activity logs)
- `useAdministrationModals.ts` - Administration modal state management
- `useCabinetData.ts` - Cabinet data management and filtering
- `useCabinetDetailsData.ts` - Cabinet details data fetching
- `useCabinetFilters.ts` - Cabinet search and filter state management
- `useCabinetModals.ts` - Cabinet modal state management
- `useCabinetSorting.ts` - Cabinet sorting and pagination logic
- `useCollectionReportModals.ts` - Collection report modal state management
- `useDashboardData.ts` - Dashboard data fetching and state
- `useDashboardFilters.ts` - Dashboard filter state and logic
- `useDashboardRefresh.ts` - Dashboard refresh functionality
- `useDashboardScroll.ts` - Dashboard scroll behavior and floating button
- `useLocationData.ts` - Location data fetching and search
- `useLocationDetails.ts` - Location details data management
- `useLocationMachineStats.ts` - Location machine statistics management
- `useLocationModals.ts` - Location modal state management
- `useLocationPagination.ts` - Location pagination logic
- `useLocationSorting.ts` - Location sorting and filtering
- `useMembersTabContent.ts` - Members tab content rendering and state
- `useReportsTabContent.ts` - Reports tab content rendering and state
- `useSessions.ts` - Sessions data fetching and pagination
- `useSessionsFilters.ts` - Sessions filtering and search functionality
- `useSessionsNavigation.ts` - Sessions navigation and routing
- `useSmibConfiguration.ts` - SMIB configuration state management

### `/navigation` - Navigation & Routing

- `useCabinetNavigation.ts` - Cabinet section navigation
- `useCollectionNavigation.ts` - Collection report navigation
- `useMembersNavigation.ts` - Members page navigation with permissions
- `useReportsNavigation.ts` - Reports navigation with role-based access

### `/reports` - Reports & Analytics

- `useDashboardReports.ts` - Dashboard analytics data
- `useGenerateCustomReport.ts` - Custom report generation
- `useLocationsReports.ts` - Location-based reports
- `useLogisticsReports.ts` - Logistics and movement reports
- `useMachinesReports.ts` - Machine performance reports

### `/ui` - UI & Utility Hooks

- `useHasMounted.ts` - Client-side mounting detection
- `useSafeGSAPAnimation.ts` - Safe GSAP animations for React 19

### `/validation` - Validation Hooks

- Reserved for future validation hooks
- User validation hooks are in the `/auth` folder

## Usage

### Import from specific categories:

```typescript
// Data hooks
import {
  useCabinetData,
  useLocationData,
  useDashboardFilters,
  useLocationMachineStats,
  useSessionsFilters,
} from '@/lib/hooks/data';

// Navigation hooks
import {
  useCabinetNavigation,
  useReportsNavigation,
} from '@/lib/hooks/navigation';

// Auth hooks
import { useAuth, useUserValidation } from '@/lib/hooks/auth';

// Reports hooks
import {
  useGenerateCustomReport,
  useDashboardReports,
} from '@/lib/hooks/reports';

// UI hooks
import { useHasMounted, useSafeGSAPAnimation } from '@/lib/hooks/ui';
```

### Import from main index:

```typescript
// All hooks
import { useAuth, useCabinetData, useCabinetNavigation } from '@/lib/hooks';
```

## Benefits of This Organization

1. **Logical Grouping**: Hooks are grouped by functionality, making them easier to find
2. **Reduced Import Paths**: Shorter, more semantic import paths
3. **Better Maintainability**: Related hooks are co-located
4. **Clear Separation**: Different concerns are separated into different folders
5. **Scalability**: Easy to add new hooks to appropriate categories
6. **Type Safety**: All exports are properly typed and documented

## Adding New Hooks

When adding new hooks, follow these guidelines:

1. **Choose the right folder** based on the hook's primary purpose
2. **Update the folder's index.ts** to export the new hook
3. **Update the main index.ts** if needed
4. **Follow naming conventions**: `use[Purpose][Function]`
5. **Add proper TypeScript types** and JSDoc comments
6. **Test the hook** thoroughly before committing

## Key Features in Hooks

### Gaming Day Offset Support

Many data hooks (particularly dashboard, location, and cabinet hooks) support gaming day offset functionality:

- Default gaming day starts at 8 AM (configurable per location)
- Local time (Trinidad UTC-4) is converted to UTC for database queries
- Custom date ranges with time inputs for precise filtering

### Financial Calculations

Data hooks use the **Movement Delta Method** for all financial calculations:

- Sum of `movement.drop` for money in
- Sum of `movement.totalCancelledCredits` for money out
- Gross = Drop - Total Cancelled Credits

### Authentication & Permissions

Auth hooks implement comprehensive role-based access control (RBAC):

- Super Admin, Admin, Manager, Collector, Viewer roles
- Granular permissions for all actions
- Automatic session management and token refresh

## Migration Notes

All existing imports have been updated to use the new organized structure. The old individual hook imports have been replaced with category-based imports for better maintainability.

---

**Last Updated**: November 4th, 2025  
**Version**: 2.0.0
