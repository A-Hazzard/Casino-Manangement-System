# Casino Analytics Integration - Cursor Prompt

You are tasked with integrating sophisticated Casino Analytics Platform features into the existing **Evolution1 Casino Management System (CMS)**. The goal is to add comprehensive casino analytics capabilities as a **single analytics page with tabbed interface** while strictly preserving the current design system, architecture patterns, and development guidelines.

## 🎯 CRITICAL REQUIREMENTS

### Design & Architecture Preservation
- **KEEP the existing design system, colors, typography, and component styling**
- **PRESERVE the current Next.js 15 App Router structure and navigation patterns**
- **DO NOT change the sidebar/navigation layout, color scheme, or existing UI patterns**
- **MAINTAIN the existing Tailwind CSS configuration and custom classes**
- **REFERENCE existing pages to understand the established look and feel**
- **FOLLOW the existing folder structure and file organization patterns**
- **USE Recharts for data visualization** (as specified in the tech stack)

### Integration Approach
1. **Study existing pages first** - Examine current components, layouts, and styling patterns
2. **Match the visual language** - Use the same button styles, card designs, spacing, and typography
3. **Adapt, don't replace** - Integrate casino analytics features using existing design components
4. **Maintain consistency** - Ensure new analytics page feels native to the existing application
5. **Follow established patterns** - Use the same routing, error handling, and component structure

## 📊 Single Page Analytics Implementation

### Core Analytics Features
Create **ONE analytics page** with tabbed interface containing these sections:

```typescript
// Single analytics route to add to existing navigation
/analytics                       // Single analytics page with tabbed interface

// Tab-based sections within the single page:
- Dashboard Tab                  // Casino KPIs and performance overview
- Locations Tab                  // Comparative analysis between casino locations  
- Machines Tab                   // Individual gaming machine performance
- Reports Tab                    // Custom analytics report generation
- Logistics Tab                  // Equipment movement tracking and audit trails
```

### Technical Implementation Following Evolution1 Patterns

#### 1. Single Page Structure Integration
```
app/
├── analytics/                   # NEW: Single analytics page
│   ├── page.tsx                # Main analytics page with tab interface
│   └── not-found.tsx           # Analytics 404 handling
├── api/                        # Extend existing API structure
│   ├── analytics/              # NEW: Analytics API endpoints
│   │   ├── dashboard/          # Dashboard data endpoints
│   │   ├── locations/          # Location analytics endpoints
│   │   ├── machines/           # Machine analytics endpoints
│   │   ├── reports/            # Report generation endpoints
│   │   └── logistics/          # Logistics endpoints
│   └── lib/                    # Extend existing API lib
│       ├── helpers/            # Add analytics helper functions HERE
│       ├── models/             # Add analytics database models HERE
│       ├── types/              # Add analytics API types HERE
│       └── utils/              # Add analytics utility functions HERE
components/
├── analytics/                  # NEW: Analytics-specific components
│   ├── AnalyticsPage.tsx       # Main page component with tab navigation
│   ├── tabs/                   # Tab content components
│   │   ├── DashboardTab.tsx    # Dashboard tab content
│   │   ├── LocationsTab.tsx    # Locations tab content
│   │   ├── MachinesTab.tsx     # Machines tab content
│   │   ├── ReportsTab.tsx      # Reports tab content
│   │   └── LogisticsTab.tsx    # Logistics tab content
│   ├── charts/                 # Chart components using Recharts
│   ├── common/                 # Common analytics components
│   └── ui/                     # Analytics-specific UI components
lib/
├── helpers/                    # Add analytics business logic HERE
├── types/                      # Add analytics application types HERE
├── utils/                      # Add analytics utility functions HERE
├── store/                      # Add analytics Zustand stores HERE
└── hooks/                      # Add analytics custom hooks HERE
```

#### 2. Required Dependencies (Add if Missing)
```bash
# Analytics dependencies (Recharts already in tech stack)
pnpm add date-fns react-dnd react-dnd-html5-backend
# Note: Zustand and Recharts should already be available as per tech stack
```

#### 3. Type System Structure (Following Evolution1 Patterns)
```typescript
// lib/types/analytics.ts - Application-wide analytics types
export type AnalyticsView = 'dashboard' | 'locations' | 'machines' | 'logistics' | 'reports'

export type KpiMetric = {
  title: string
  value: number
  previousValue: number
  format: 'currency' | 'percentage' | 'number'
  trend: 'up' | 'down' | 'neutral'
}

export type ChartData = {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    borderColor?: string | string[]
    backgroundColor?: string | string[]
    fill?: boolean
  }>
}

export type CasinoLocation = {
  id: string
  name: string
  region: string
  address?: string
  isActive: boolean
}

export type GamingMachine = {
  id: string
  locationId: string
  manufacturer: string
  gameTitle: string
  isActive: boolean
  installDate: string
}

export type DailyMetric = {
  id: string
  date: string
  machineId: string
  locationId: string
  coinIn: number
  coinOut: number
  jackpot: number
  gamesPlayed: number
  drop: number
  totalCancelledCredits: number
}

export type LogisticsEntry = {
  id: string
  machineId: string
  fromLocationId: string | null
  toLocationId: string
  moveDate: string
  reason: string
  status: 'pending' | 'completed' | 'cancelled'
  notes?: string
}

// app/api/lib/types/analytics.ts - API-specific analytics types
export type ApiResponse<T> = {
  data: T
  success: boolean
  message?: string
}

export type MetricsFilters = {
  dateRange?: {
    start: string
    end: string
  }
  locationIds?: string[]
  machineIds?: string[]
  manufacturers?: string[]
  gameTypes?: string[]
}

export type AggregatedMetrics = {
  totalHandle: number
  totalWin: number
  totalJackpots: number
  totalGamesPlayed: number
  actualHoldPercentage: number
  averageBetPerGame: number
}
```

#### 4. Component Architecture (Following Evolution1 Patterns)
```typescript
// components/analytics/ - Single page with tabbed interface
components/analytics/
├── AnalyticsPage.tsx          # Main page component with tab navigation
├── tabs/                      # Individual tab content components
│   ├── DashboardTab.tsx       # Dashboard tab with KPIs and overview
│   ├── LocationsTab.tsx       # Location comparison and analytics
│   ├── MachinesTab.tsx        # Machine performance analytics
│   ├── ReportsTab.tsx         # Report builder and generation
│   └── LogisticsTab.tsx       # Machine movement tracking
├── charts/                    # Recharts-based chart components
│   ├── KpiCard.tsx           # Metric display cards
│   ├── PerformanceChart.tsx  # Performance visualization
│   ├── ComparisonChart.tsx   # Location/machine comparisons
│   └── TrendChart.tsx        # Trend analysis charts
├── common/                    # Shared analytics components
│   ├── DateRangePicker.tsx   # Date filtering component
│   ├── FilterPill.tsx        # Filter UI elements
│   ├── TabNavigation.tsx     # Tab navigation component
│   └── ExportButton.tsx      # Data export functionality
└── ui/                        # Analytics-specific UI components
    ├── MetricCard.tsx         # Individual metric display
    ├── DataTable.tsx          # Data table component
    └── LoadingSpinner.tsx     # Loading states
```

#### 5. State Management with Zustand (Following Evolution1 Patterns)
```typescript
// lib/store/ - Analytics stores integrated with existing store structure
lib/store/
├── useAnalyticsStore.ts       # Main analytics state (active tab, global filters)
├── useAnalyticsDataStore.ts   # Core analytics data and caching
├── useFilterStore.ts          # Filtering, date ranges, and search
└── useReportStore.ts          # Report builder state and export functions
```

#### 6. Helper Functions (Following Evolution1 Patterns)
```typescript
// lib/helpers/analytics/ - Business logic helpers
lib/helpers/analytics/
├── calculationHelpers.ts     # Metric calculations
├── dataTransformHelpers.ts   # Data transformation utilities
├── chartHelpers.ts           # Chart data preparation
└── reportHelpers.ts          # Report generation logic

// app/api/lib/helpers/analytics/ - API-specific helpers
app/api/lib/helpers/analytics/
├── metricsHelpers.ts         # Metrics data processing
├── aggregationHelpers.ts     # Data aggregation functions
└── validationHelpers.ts      # Input validation
```

## 🎨 Design Integration Guidelines

### Visual Consistency
- **Use existing color palette** - Reference current Tailwind config and CSS variables
- **Follow existing spacing patterns** - Use the same margins, padding, and grid systems
- **Match typography hierarchy** - Use existing heading styles, font weights, and sizes
- **Adopt existing card/container styles** - Use the same border radius, shadows, and backgrounds
- **Follow existing button patterns** - Use the same button classes and variants

### Component Styling Examples
```tsx
// Match existing button patterns from other pages
<button className="existing-primary-btn-classes">
  View Analytics
</button>

// Use existing card styling found in other components
<div className="existing-card-classes">
  <h3 className="existing-heading-classes">Casino Performance</h3>
  {/* Analytics content */}
</div>

// Follow existing layout patterns from other pages
<div className="existing-page-container-classes">
  <div className="existing-header-classes">
    <h1 className="existing-page-title-classes">Casino Analytics</h1>
  </div>
  {/* Content */}
</div>
```

### Navigation Integration
```tsx
// Add single analytics link to existing sidebar following current patterns
// Reference components/layout/Sidebar.tsx for existing structure
// Add one "Analytics" menu item that navigates to /analytics
```

## 🏗️ Development Rules & Guidelines (STRICTLY FOLLOW)

### 1. 📦 Package Management & Build Integrity
- **Use `pnpm` exclusively** for all package management tasks
- After any code or dependency change, always run `pnpm build`
- If a build error occurs, fix the error, then re-run `pnpm build`
- Repeat this process recursively until the project builds cleanly
- For development, use `pnpm dev` to start the local development server

### 2. 🔷 TypeScript Discipline & Types Organization
- **All type definitions must reside in the appropriate types directories:**
  - Application-wide analytics types: `lib/types/analytics.ts`
  - API-specific analytics types: `app/api/lib/types/analytics.ts`
- **Prefer `type` over `interface`** for consistency
- **No `any` allowed** - Create appropriate type definitions for all variables and functions
- Always import types from their respective type files - avoid redefining types

### 3. 📁 File Organization & Separation of Concerns
- **Keep all `page.tsx` and component files lean**
  - Offload complex logic into helper functions in `lib/helpers/analytics/`
- **API-related logic should reside in `app/api/lib/helpers/analytics/`**
- **Shared utilities should reside in `lib/utils/`**
- **Analytics business logic goes in `lib/helpers/analytics/`**
- Do not mix API logic with UI or utility logic

### 4. 📝 Comments & Documentation
- **Remove redundant comments** that simply restate well-named code
- In helper and utility files, every function should have a concise block comment describing:
  - Its purpose
  - Its parameters  
  - Its return value
- Document complex business logic with clear explanations

### 5. ⚛️ Component Structure & State Management
- Use appropriate state management solutions based on scope:
  - React's `useState` and `useReducer` for local component state
  - Zustand stores in `lib/store/analytics/` for analytics state management
- Keep components focused on a single responsibility
- Extract reusable UI elements into separate components in `components/analytics/common/`

### 6. 🔒 Security & Best Practices
- **Follow OWASP standards** for all analytics features
- Never expose sensitive information in client-side code
- Always validate and sanitize user input
- Use middleware for route protection where necessary

## 🔧 Implementation Steps

1. **FIRST**: Examine existing pages thoroughly to understand:
   - Current color scheme and CSS patterns in `app/globals.css`
   - Component styling patterns in `components/ui/` and other component directories
   - Layout patterns in existing pages
   - Navigation structure in `components/layout/`
   - Typography and spacing patterns

2. **SECOND**: Create analytics components that mirror existing component styles:
   - Copy styling patterns from existing components
   - Use same card/container styling from current pages
   - Match form input styling from existing forms
   - Follow existing spacing and layout patterns

 3. **THIRD**: Integrate analytics route into existing navigation:
    - Add single "Analytics" link to existing sidebar component
    - Create `/analytics` route in `app/` directory following existing patterns
    - Use existing error handling patterns with `not-found.tsx`

4. **FOURTH**: Implement data layer following Evolution1 patterns:
   - Create analytics API endpoints in `app/api/analytics/`
   - Add helper functions in appropriate directories
   - Implement Zustand stores for state management
   - Create mock casino data for development

 5. **FIFTH**: Add analytics types following the established pattern:
    - Application types in `lib/types/analytics.ts`
    - API types in `app/api/lib/types/analytics.ts`
    - Tab state types for managing active tabs and content
    - Ensure all types are properly exported and imported

## 📋 Quality Requirements

### TypeScript Discipline
- All analytics types in designated type directories
- No `any` types allowed anywhere
- Proper type imports and exports following existing patterns

### Code Organization  
- Follow existing Evolution1 file structure patterns exactly
- Keep components focused and reusable
- Extract business logic to helper functions in `lib/helpers/analytics/`
- API logic only in `app/api/lib/helpers/analytics/`

### Build Integrity
- Always run `pnpm build` after changes
- Fix all TypeScript errors immediately
- Ensure ESLint compliance
- Address all linting warnings before proceeding

## ⚠️ What NOT to Change

- **DO NOT modify existing page layouts, navigation, or sidebar structure**
- **DO NOT change the color scheme, design system, or existing styling**
- **DO NOT alter existing component styling or Tailwind configuration**
- **DO NOT modify existing routing patterns or page structure**
- **DO NOT change the established folder structure outside of adding analytics**
- **DO NOT modify existing API patterns or database models**
- **DO NOT create multiple analytics routes - use ONE page with tabs**

## 🎯 Success Criteria

✅ Single analytics page integrates seamlessly with existing Evolution1 CMS design
✅ Tabbed interface works smoothly with proper state management
✅ No visual inconsistencies with current pages  
✅ All builds pass without errors or warnings
✅ TypeScript compliance maintained throughout
✅ Existing functionality remains completely unchanged
✅ New analytics page feels native to the existing application
✅ All helper functions, utilities, and types are in their designated directories
✅ Analytics business logic is properly separated from UI components
✅ API logic is contained within the appropriate API directories
✅ Recharts integration follows existing design patterns

## 📊 Analytics Features to Implement

### Dashboard Analytics
- Real-time KPI metrics with trend indicators
- Interactive charts for handle vs win analysis  
- Location performance overview
- Live activity feed

### Location Analytics
- Side-by-side location comparison
- Performance trend analysis over time
- Top performing machines per location
- Geographic performance insights

### Machine Analytics  
- Individual machine performance tracking
- Hold percentage comparisons
- Revenue analysis charts
- Machine contribution percentages

### Report Builder
- Custom report creation with field selection
- Multiple chart types (line, bar, pie, table)
- Advanced filtering options
- Export to PDF and CSV formats

### Machine Logistics
- Equipment movement tracking
- Audit trail maintenance
- Status monitoring and alerts
- Historical movement logs

The goal is to add powerful casino analytics capabilities as a **single tabbed page** that looks and feels like it was always part of the original Evolution1 CMS application, while strictly following all established development patterns and guidelines.

## 📋 Tab Implementation Details

### Tab Structure
```typescript
// Main analytics page with 5 tabs
export type AnalyticsTab = 'dashboard' | 'locations' | 'machines' | 'reports' | 'logistics'

// Tab navigation should match existing UI patterns
const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'locations', label: 'Locations', icon: '🏢' },
  { id: 'machines', label: 'Machines', icon: '🎰' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'logistics', label: 'Logistics', icon: '🚚' }
]
```

### Implementation Notes
- Use existing tab styling patterns from other pages in the CMS
- Implement smooth transitions between tabs
- Maintain state when switching between tabs
- Use Recharts for all data visualizations
- Follow existing loading states and error handling patterns
- Ensure responsive design matches existing pages 