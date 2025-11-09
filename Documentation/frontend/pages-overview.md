# Pages Overview

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 9th, 2025  
**Version:** 2.1.0

## Table of Contents

1. [Overview](#overview)
2. [Main Pages](#main-pages)
3. [Collection System Pages](#collection-system-pages)
4. [Redirect Pages](#redirect-pages)
5. [Page Relationships](#page-relationships)
6. [Navigation Structure](#navigation-structure)
7. [Authentication Requirements](#authentication-requirements)
8. [Documentation Status](#documentation-status)

## Overview

This document provides a comprehensive overview of all pages in the Evolution One Casino Management System. It serves as a central reference for understanding the system's page structure, functionality, and user interface organization.

### Key Principles

- **User Experience**: Intuitive navigation and consistent interface design
- **Functionality**: Complete feature coverage across all system components
- **Security**: Role-based access control and authentication requirements
- **Performance**: Optimized page loading and real-time data updates

### System Architecture

- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Strong typing for all page components and data
- **Tailwind CSS**: Responsive design with consistent styling
- **Real-time Updates**: Live data synchronization across all pages

### Page Categories

- **Main Pages**: Core system functionality and navigation
- **Collection System**: Financial collection and reporting pages
- **Administration**: User management and system administration
- **Analytics**: Reporting and performance analysis pages

## Main Pages

### ✅ Dashboard

- **File:** `app/page.tsx`
- **URL:** `/`
- **Documentation:** `dashboard.md`
- **Status:** Main landing page with real-time metrics and analytics
- **Access:** Evolution Admin, Admin, Manager (with assigned licensees)
- **Licensee Filtering:** ✅ Supported
- **Features:** Real-time financial metrics, machine status, performance charts, date filtering, licensee dropdown

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
- **Access:** Evolution Admin, Admin only
- **Licensee Filtering:** N/A (manages all licensees)
- **Features:** User management with licensee assignment, session tracking, location permissions, role-based access, activity logs

### ✅ Collection Report

- **File:** `app/collection-report/page.tsx`
- **URL:** `/collection-report`
- **Documentation:** `collection-report.md`
- **Status:** Comprehensive collection reporting and management
- **Access:** Evolution Admin, Admin, Manager, Collector, Location Admin
- **Licensee Filtering:** ✅ Supported (role-dependent)
- **Features:** Collection reports, monthly reports, manager/collector schedules, filtering, role-based edit restrictions

### ✅ Cabinets

- **File:** `app/cabinets/page.tsx`
- **URL:** `/cabinets`
- **Documentation:** `machines.md`
- **Status:** Cabinet management with SMIB configuration and firmware
- **Access:** All authenticated users (data filtered by role)
- **Licensee Filtering:** ✅ Supported (admins/managers see dropdown, others auto-filtered)
- **Features:** Cabinet listing, filtering, sorting, movement requests, SMIB data upload, location-based filtering

### ✅ Locations

- **File:** `app/locations/page.tsx`
- **URL:** `/locations`
- **Documentation:** `locations.md`
- **Status:** Location management with performance metrics
- **Access:** Evolution Admin, Admin, Manager, Location Admin
- **Licensee Filtering:** ✅ Supported (role-dependent visibility)
- **Features:** Location listing, filtering, sorting, machine status tracking, CRUD operations, licensee-based filtering

### ✅ Reports

- **File:** `app/reports/page.tsx`
- **URL:** `/reports`
- **Documentation:** `Reports FRD.md`
- **Status:** Comprehensive reporting module with multi-tab layout
- **Access:** Evolution Admin only
- **Licensee Filtering:** ✅ Supported
- **Features:** Dashboard, locations, machines, and meters reports with export functionality

### ✅ Members

- **File:** `app/members/page.tsx`
- **URL:** `/members`
- **Documentation:** `members.md`
- **Status:** Complete member management with session tracking
- **Access:** Evolution Admin only
- **Licensee Filtering:** ✅ Supported
- **Features:** Member profiles, session analytics, data export, performance tracking

### ✅ Sessions

- **File:** `app/sessions/page.tsx`
- **URL:** `/sessions`
- **Documentation:** `sessions.md`
- **Status:** Comprehensive session monitoring and machine event tracking
- **Access:** Evolution Admin only
- **Licensee Filtering:** ✅ Supported
- **Features:** Session listing, search, filtering, machine event monitoring

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

### ✅ Member Details

- **File:** `app/members/[id]/page.tsx`
- **URL:** `/members/[id]`
- **Documentation:** `members.md`
- **Status:** Individual member profile with session history
- **Features:** Member profile, session tracking, view filtering (session/day/week/month), data export

### ✅ Session Events

- **File:** `app/sessions/[sessionId]/[machineId]/events/page.tsx`
- **URL:** `/sessions/[sessionId]/[machineId]/events`
- **Documentation:** `sessions.md`
- **Status:** Detailed machine event logs for specific sessions
- **Features:** Event filtering, sequence expansion, machine activity monitoring

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

Currently no pages have been removed from the system. All major modules are active and documented.

## Documentation Status

- ✅ **Complete:** All main pages and detail pages have comprehensive documentation
- ✅ **Technical Depth:** Each page includes detailed technical architecture, API integration, and data flow
- ✅ **Component Analysis:** All documentation includes component hierarchy and dependency analysis
- ✅ **Consistent Structure:** All documentation follows the same comprehensive format
- ✅ **Developer-Friendly:** Documentation includes imports, helpers, utils, and shared dependencies
- ✅ **Organized:** Documentation is properly categorized and easy to navigate

## Navigation Structure

```
/                              → Dashboard (Real-time metrics & analytics)
/login                         → Login (Authentication)
/administration                → Administration (User & licensee management)
/collection-report             → Collection Reports (Main collection management)
/collection-report/report/[id] → Collection Report Details (Individual report analysis)
/cabinets                      → Cabinet Management (All cabinets)
/cabinets/[id]                 → Cabinet Details (Individual cabinet configuration)
/locations                     → Location Management (All locations)
/locations/[id]                → Location Cabinets (Cabinets for specific location)
/locations/[id]/details        → Location Details (Detailed location analytics)
/reports                       → Reports Module (Multi-tab reporting with export)
/members                       → Member Management (Player profiles and sessions)
/members/[id]                  → Member Details (Individual member profile and sessions)
/sessions                      → Session Management (All gaming sessions)
/sessions/[sessionId]/[machineId]/events → Session Events (Machine event logs)
/collections                   → Redirect to /collection-report
/collection                    → Redirect to /collection-report
/collection-reports            → Redirect to /collection-report
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

---

## Role-Based Access Control Matrix

### Page Access by Role

| Page | Evolution Admin | Admin | Manager | Collector | Location Admin | Technician |
|------|----------------|-------|---------|-----------|----------------|------------|
| **Dashboard** | ✅ Full | ✅ Full | ✅ Filtered | ❌ | ❌ | ❌ |
| **Locations** | ✅ Full | ✅ Full | ✅ Filtered | ❌ | ✅ Filtered | ❌ |
| **Cabinets** | ✅ Full | ✅ Full | ✅ Filtered | ✅ Filtered | ✅ Filtered | ✅ Filtered |
| **Collection Reports** | ✅ Full | ✅ Full | ✅ Filtered | ✅ Filtered | ✅ Filtered | ❌ |
| **Sessions** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Members** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Administration** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ |

### Licensee Filtering by Role

| Role | Licensee Dropdown | Filtering Behavior | Location Access |
|------|------------------|-------------------|----------------|
| **Evolution Admin** | ✅ Always shown | Can view all or filter by specific licensee | All locations |
| **Admin** | ✅ Always shown | Can view all or filter by specific licensee | All locations |
| **Manager** | ✅ If 2+ licensees | Shows ONLY assigned licensees | All locations for assigned licensees |
| **Collector** | ✅ If 2+ licensees | Shows ONLY assigned licensees | ONLY assigned locations (intersection) |
| **Location Admin** | ❌ Never shown | Auto-filtered to assigned locations | ONLY assigned locations |
| **Technician** | ❌ Never shown | Auto-filtered to assigned locations | ONLY assigned locations |

### Data Isolation Rules

1. **Evolution Admin / Admin**:
   - No licensee restrictions (can assign/view all)
   - Licensee dropdown is an optional filter
   - Full CRUD access across all licensees

2. **Manager**:
   - MUST be assigned to 1+ licensees
   - Can view ALL locations within assigned licensees
   - Location permissions don't restrict (see all for licensee)
   - Cannot see data from non-assigned licensees

3. **Collector / Location Admin / Technician**:
   - MUST be assigned to 1+ licensees
   - MUST be assigned to specific locations
   - Can ONLY see locations in: `Intersection(licensee locations, assigned locations)`
   - Cannot see data from other locations or licensees

### Session Management

- **Session Version**: Incremented when admin changes user permissions (licensees, locations, roles)
- **Auto-Logout**: User automatically logged out when `sessionVersion` increments
- **Toast Notification**: User sees "Your session has been invalidated" message
- **Re-authentication**: User must login again to get new JWT with updated permissions

### Permission Change Flow

```
1. Admin edits user permissions (licensees/locations/roles)
2. Server increments user.sessionVersion
3. User's current JWT becomes invalid (version mismatch)
4. Next API call fails with 401 Unauthorized
5. Frontend Axios interceptor catches 401
6. User redirected to /login with toast message
7. User logs in with new credentials
8. New JWT issued with updated permissions
```

---

**Last Updated:** November 9th, 2025  
**Version:** 2.1.0
