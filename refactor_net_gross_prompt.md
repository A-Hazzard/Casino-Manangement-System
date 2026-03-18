# Refactor Net Gross Logic & Implement Archiving System

## 1. Objective
Refactor the "Net Gross" configuration and calculation logic, and implement a robust "Archive" system for locations and machines.

## 2. Global Net Gross Refactor
### A. Change Configuration Level
- **Constraint**: Net Gross should be configured at the **Licencee** level, not the Location level.
- **Task**:
    - Update `Licencee` model (`app/api/lib/models/licencee.ts`) to include `useNetGross: { type: Boolean, default: false }`.
    - Update `GamingLocations` model (`app/api/lib/models/gaminglocations.ts`) to remove `useNetGross`.
    - **UI (Administration)**:
        - Update `AdministrationLicenceeTable.tsx` to add a "USES NET GROSS" column displaying "Yes" or "No".
        - Update `AdministrationAddLicenceeModal.tsx` and `AdministrationEditLicenceeModal.tsx` to include a checkbox for "Uses Net Gross".
    - **Backend Logic**:
        - All aggregation routes (e.g., `app/api/machines/aggregation/route.ts`) must now fetch the `useNetGross` setting from the associated `Licencee` instead of the `Location`.

### B. Overhaul Calculation Logic
- **New Money Out Definition**: `New Money Out = movement.totalCancelledCredits - movement.jackpot` (**only if `movement.jackpot > 0`**).
- **New Gross Definition**: `New Gross = movement.drop - New Money Out`.
    - *Simplified*: `Gross = drop - (totalCancelledCredits - jackpot)` (if jackpot > 0), else `Gross = drop - totalCancelledCredits`.
- **Global Application**: Apply this logic to the Dashboard, Locations, Location Details, Cabinets, and Cabinet Details pages.

### C. Visual Changes (Metrics & Tables)
- **Remove Net Gross**: Completely remove the "Net Gross" metric card and table columns across the entire application.
- **Add Jackpot**:
    - Add a "Jackpot" metric card to all relevant pages (Dashboard, Locations, Location Details, Cabinets, Cabinet Details).
    - The Jackpot card should appear **before** the Gross card.
    - Ensure Jackpot is present in tables and mobile cards on these pages.
- **Skeleton Loaders**: Update skeleton loaders in `components/ui/skeletons/` and `components/shared/ui/FinancialMetricsCards.tsx` to reflect the 4-card layout (Money In, Money Out, Jackpot, Gross).

## 3. Archive & Deletion Logic
### A. Role-Based Deletion Flow
- **Developers**:
    - When clicking the delete icon for a location or machine, show a modal asking: "Do you want to Archive or permanently Delete?"
    - **Archive** sets `deletedAt = new Date()`.
    - **Delete** performs a permanent removal (if possible) or a hard delete.
- **Non-Developers**:
    - Retain the current "Are you sure?" modal, but ensure it sets `deletedAt = new Date()`.

### B. Viewing Archived Items
- **Filter**: Add an "Archived" filter to the `Locations` page and `Cabinets` page.
- **Table Columns**: When the "Archived" filter is active, add two new columns to the tables:
    1. **Archived When**: The timestamp from `deletedAt`.
    2. **Archived For**: Calculated duration since `deletedAt` (e.g., "15 days", "3 hours").
- **Backend Query**: Update the relevant API routes to support an `archived=true` parameter that filters for `deletedAt` greater than the default value (e.g., `deletedAt > new Date(-1)`).

## 4. Key Files to Review/Modify
- **Models**: `app/api/lib/models/licencee.ts`, `app/api/lib/models/gaminglocations.ts`, `app/api/lib/models/machines.ts`.
- **API Routes**: `app/api/machines/aggregation/route.ts`, `app/api/locations/route.ts`, `app/api/machines/route.ts`.
- **UI Components**:
    - `components/shared/ui/FinancialMetricsCards.tsx`
    - `components/CMS/administration/tables/AdministrationLicenceeTable.tsx`
    - `components/CMS/locations/LocationsLocationTable.tsx`
    - `components/CMS/cabinets/CabinetsLocationTable.tsx` (or equivalent)
- **Analytics**:
    - `app/api/analytics/dashboard/route.ts`
    - `app/api/analytics/locations/route.ts`
    - `app/api/analytics/machines/route.ts`
    - `app/api/analytics/winloss-trends/route.ts`
    - (And other relevant subdirectories in `app/api/analytics/`)
- **Modals**: `LocationsDeleteLocationModal.tsx`, `CabinetsDeleteCabinetModal.tsx`, `AdministrationAddLicenceeModal.tsx`.
- **Logic Helpers**: `app/api/lib/helpers/licenceeFilter.ts`, `lib/utils/financial.ts`.

## 5. Instructions for Implementation
- **Consistency**: Ensure the `moneyOut` shown in cards matches the `moneyOut` used in `Gross` calculation.
- **Performance**: Use efficient aggregations (e.g., `$lookup` for Licencee settings in machine aggregation).
- **Type Safety**: Maintain strict TypeScript adherence (avoid `any`).
- **Persistence**: Ensure the "Archived" filter state is reflected in the URL where applicable.
