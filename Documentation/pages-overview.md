# Pages Overview

This document provides a comprehensive overview of all pages in the Dynamic1 Casino Management System and their documentation status.

## Main Pages

### ✅ Dashboard
- **File:** `app/page.tsx`
- **URL:** `/`
- **Documentation:** `dashboard.md`
- **Status:** Main landing page with real-time metrics and analytics
- **Features:** Real-time financial metrics, machine status, performance charts, date filtering

### ✅ Login
- **File:** `app/(auth)/login/page.tsx`
- **URL:** `/login`
- **Documentation:** `login.md`
- **Status:** Authentication page with secure login form
- **Features:** Email/password authentication, validation, error handling, responsive design

### ✅ Administration
- **File:** `app/administration/page.tsx`
- **URL:** `/administration`
- **Documentation:** `administration.md`
- **Status:** User and licensee management with roles and permissions
- **Features:** User management, licensee management, activity logs, role-based access

### ✅ Collection Report
- **File:** `app/collection-report/page.tsx`
- **URL:** `/collection-report`
- **Documentation:** `collection-report.md`
- **Status:** Comprehensive collection reporting and management
- **Features:** Collection reports, monthly reports, manager/collector schedules, filtering

### ✅ Cabinets
- **File:** `app/cabinets/page.tsx`
- **URL:** `/cabinets`
- **Documentation:** `cabinets.md`
- **Status:** Cabinet management with SMIB configuration and firmware
- **Features:** Cabinet listing, filtering, sorting, movement requests, SMIB data upload

### ✅ Locations
- **File:** `app/locations/page.tsx`
- **URL:** `/locations`
- **Documentation:** `locations.md`
- **Status:** Location management with performance metrics
- **Features:** Location listing, filtering, sorting, machine status tracking, management

## Detail Pages

### ✅ Cabinet Details
- **File:** `app/cabinets/[slug]/page.tsx`
- **URL:** `/cabinets/[slug]`
- **Documentation:** `cabinet-details.md`
- **Status:** Individual cabinet configuration and metrics
- **Features:** SMIB configuration, real-time status, metrics filtering, firmware management

### ✅ Location Cabinets
- **File:** `app/locations/[slug]/page.tsx`
- **URL:** `/locations/[slug]`
- **Documentation:** `location-cabinets.md`
- **Status:** Cabinets assigned to a specific location
- **Features:** Location-specific cabinet management, filtering, sorting, pagination

### ✅ Location Details
- **File:** `app/locations/[slug]/details/page.tsx`
- **URL:** `/locations/[slug]/details`
- **Documentation:** `location-details.md`
- **Status:** Detailed location overview with metrics
- **Features:** Location analytics, cabinet breakdowns, performance metrics, time filtering

### ✅ Collection Report Details
- **File:** `app/collection-report/report/[reportId]/page.tsx`
- **URL:** `/collection-report/report/[reportId]`
- **Documentation:** `collection-report-details.md`
- **Status:** Individual collection report details
- **Features:** Machine metrics, location metrics, SAS metrics comparison, pagination

## Redirect Pages

### ✅ Collections Redirect
- **File:** `app/collections/page.tsx`
- **URL:** `/collections`
- **Documentation:** `redirect-pages.md`
- **Status:** Redirects to `/collection-report`

### ✅ Collection Redirect
- **File:** `app/collection/page.tsx`
- **URL:** `/collection`
- **Documentation:** `redirect-pages.md`
- **Status:** Redirects to `/collection-report`

### ✅ Collection Reports Redirect
- **File:** `app/collection-reports/page.tsx`
- **URL:** `/collection-reports`
- **Documentation:** `redirect-pages.md`
- **Status:** Redirects to `/collection-report`

## Error Pages

### ✅ Not Found (Global)
- **File:** `app/not-found.tsx`
- **URL:** Any non-existent route
- **Documentation:** Referenced in individual page docs
- **Status:** Global 404 error page

### ✅ Cabinet Not Found
- **File:** `app/cabinets/[slug]/not-found.tsx`
- **URL:** `/cabinets/[invalid-slug]`
- **Documentation:** Referenced in `cabinet-details.md`
- **Status:** Cabinet-specific 404 page

### ✅ Location Not Found
- **File:** `app/locations/[slug]/not-found.tsx`
- **URL:** `/locations/[invalid-slug]`
- **Documentation:** Referenced in `location-details.md`
- **Status:** Location-specific 404 page

## Removed Pages

### ❌ Reports Module
- **Previous File:** `app/reports/page.tsx`
- **Previous URL:** `/reports`
- **Documentation:** `reports.md`
- **Status:** Removed pending redesign and stakeholder feedback

## Documentation Status

- ✅ **Complete:** All main pages and detail pages have comprehensive documentation
- ✅ **Technical Depth:** Each page includes detailed technical architecture, API integration, and data flow
- ✅ **Component Analysis:** All documentation includes component hierarchy and dependency analysis
- ✅ **Consistent Structure:** All documentation follows the same comprehensive format
- ✅ **Developer-Friendly:** Documentation includes imports, helpers, utils, and shared dependencies
- ✅ **Organized:** Documentation is properly categorized and easy to navigate

## Navigation Structure

```
/                           → Dashboard (Real-time metrics & analytics)
/login                      → Login (Authentication)
/administration             → Administration (User & licensee management)
/collection-report          → Collection Reports (Main collection management)
/collection-report/report/[id] → Collection Report Details (Individual report analysis)
/cabinets                   → Cabinet Management (All cabinets)
/cabinets/[id]              → Cabinet Details (Individual cabinet configuration)
/locations                  → Location Management (All locations)
/locations/[id]             → Location Cabinets (Cabinets for specific location)
/locations/[id]/details     → Location Details (Detailed location analytics)
/collections                → Redirect to /collection-report
/collection                 → Redirect to /collection-report
/collection-reports         → Redirect to /collection-report
```

## Technical Architecture Overview

### State Management
- **Zustand Stores:** Dashboard store for shared state, cabinet actions store for modals
- **React Hooks:** Local state management for page-specific functionality
- **Context Providers:** Authentication and theme context

### API Integration
- **RESTful Endpoints:** Consistent API structure for all data operations
- **Helper Functions:** Organized helper modules for API interactions
- **Error Handling:** Comprehensive error handling and user feedback

### Component Architecture
- **Layout Components:** Consistent header, sidebar, and navigation
- **UI Components:** Reusable components with proper TypeScript typing
- **Page Components:** Page-specific components with clear separation of concerns

### Data Flow
- **Server-Side:** Next.js API routes with proper validation
- **Client-Side:** React components with efficient state management
- **Real-time Updates:** WebSocket integration for live data updates

All pages maintain consistent navigation through the sidebar and follow the established design patterns, user experience guidelines, and technical architecture standards. 