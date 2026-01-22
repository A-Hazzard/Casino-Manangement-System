# Pages Overview

## Table of Contents

- [Overview](#overview)
- [Documentation Structure](#documentation-structure)
- [Page Documentation Links](#page-documentation-links)
- [Common Patterns](#common-patterns)

## Overview

This document provides an overview of all pages in the Evolution One CMS frontend application. Each page has detailed documentation following a standardized structure.

**Last Updated:** January 2025

## Documentation Structure

All page documentation files follow a consistent structure:

1. **Overview** - Brief description of the page
2. **File Information** - Main file path, URL pattern, authentication requirements
3. **Page Sections** - Detailed breakdown of each major section with:
   - Purpose
   - Components used
   - API endpoints
   - Data flow
   - Key functions
   - Notes
4. **API Endpoints** - Complete list of endpoints used
5. **State Management** - Hooks, stores, and state structures
6. **Key Functions** - Important functions and their purposes

## Page Documentation Links

### Main Dashboard & Navigation

- **[Dashboard](./dashboard.md)** (`/`)
  - Main dashboard with financial metrics, charts, location map, and top performing locations/cabinets
  - URL: `/`
  - File: `app/page.tsx`

### Administration

- **[Administration](./administration.md)** (`/administration`)
  - User management, licensee management, activity logs, and feedback
  - URL: `/administration`
  - File: `app/administration/page.tsx`

### Locations

- **[Locations](./locations.md)** (`/locations`)
  - Gaming locations listing with financial metrics, search, filters, and management
  - URL: `/locations`
  - File: `app/locations/page.tsx`

- **[Location Details](./location-details.md)** (`/locations/[slug]`)
  - Individual location details with metrics, machines, and members
  - URL: `/locations/[slug]`
  - File: `app/locations/[slug]/page.tsx`

### Machines/Cabinets

- **[Machines/Cabinets](./machines.md)** (`/cabinets`)
  - Machine/cabinet listing with tabs for Cabinets, SMIB Management, Movement Requests, and Firmware
  - URL: `/cabinets`
  - File: `app/cabinets/page.tsx`

- **[Machine Details](./machine-details.md)** (`/cabinets/[slug]`)
  - Individual cabinet/machine details with metrics, accounting, charts, and SMIB configuration
  - URL: `/cabinets/[slug]`
  - File: `app/cabinets/[slug]/page.tsx`

### Members

- **[Members](./members.md)** (`/members`)
  - Member listing and management with tabs for Members List and Summary Report
  - URL: `/members`
  - File: `app/members/page.tsx`

- **[Member Details](./members.md#member-details-page)** (`/members/[id]`)
  - Individual member profile with sessions and machine events
  - URL: `/members/[id]`
  - File: `app/members/[id]/page.tsx`
  - Documented in: [members.md](./members.md)

### Sessions

- **[Sessions](./sessions.md)** (`/sessions`)
  - Gaming sessions listing with search, filters, and pagination
  - URL: `/sessions`
  - File: `app/sessions/page.tsx`

- **[Session Events](./sessions.md#session-events-page)** (`/sessions/[sessionId]/[machineId]/events`)
  - Machine events for a specific session
  - URL: `/sessions/[sessionId]/[machineId]/events`
  - File: `app/sessions/[sessionId]/[machineId]/events/page.tsx`
  - Documented in: [sessions.md](./sessions.md)

### Collection Reports

- **[Collection Reports](./collection-report.md)** (`/collection-report`)
  - Collection report management with tabs for Collection, Monthly, Collector, and Manager schedules
  - URL: `/collection-report`
  - File: `app/collection-report/page.tsx`

- **[Collection Report Details](./collection-report-details.md)** (`/collection-report/report/[reportId]`)
  - Individual collection report details with machine metrics, location metrics, and SAS comparison
  - URL: `/collection-report/report/[reportId]`
  - File: `app/collection-report/report/[reportId]/page.tsx`

### Authentication

- **[Login](./login.md)** (`/login`)
  - User authentication page with login form, password update, and profile validation
  - URL: `/login`
  - File: `app/(auth)/login/page.tsx`
  - Authentication: Not Required (Public Access)

### Vault Management System

- **[Vault Management](./vault.md)** (`/vault/management`)
  - Cash management system with vault overview, cash desks, floats, expenses, transactions, transfers, and reports
  - URL: `/vault/management` and sub-routes
  - File: `app/vault/management/page.tsx` and sub-pages
  - Access: Vault Manager roles required

- **[Vault Cashier](./vault.md#cashier-pages)** (`/vault/cashier`)
  - Cashier interface with payouts, shifts, and float requests
  - URL: `/vault/cashier` and sub-routes
  - File: `app/vault/cashier/page.tsx` and sub-pages
  - Access: Cashier roles required

## Common Patterns

### Authentication & Authorization

- Most pages require authentication via `ProtectedRoute` component
- Role-based access control enforced at page and component levels
- Licensee and location filtering based on user permissions

### State Management

- **Zustand Stores:**
  - `useDashBoardStore` - Dashboard state, selected licensee, date filters
  - `useUserStore` - Current user data
  - Feature-specific stores (e.g., `useMemberActionsStore`, `useLocationActionsStore`)

- **Custom Hooks:**
  - Data fetching hooks (e.g., `useSessions`, `useMembers`)
  - Page-specific hooks (e.g., `useCabinetsPageData`, `useLocationsPageData`)
  - Navigation hooks (e.g., `useMembersNavigation`, `useCollectionNavigation`)

### API Integration

- All API calls use Axios
- Error handling with toast notifications (Sonner)
- Loading states with skeleton loaders
- Pagination with batch loading optimization

### UI Components

- **Layout Components:**
  - `PageLayout` - Main page layout wrapper
  - `Header` - Top navigation header
  - `Sidebar` - Persistent navigation sidebar

- **UI Components:**
  - Tables and cards for data display
  - Modals for create/edit operations
  - Filters and search components
  - Date filters (integrated with dashboard store)
  - Pagination controls

### Responsive Design

- Desktop-first approach with mobile breakpoints
- Separate components for desktop/mobile views where needed
- Responsive tables and cards
- Touch-friendly interactions on mobile

### Performance Optimizations

- Batch loading for pagination
- Memoization for expensive calculations
- Skeleton loaders for better perceived performance
- Lazy loading for heavy components
- Optimized database queries (cursors, indexes, aggregations)

## Documentation Status

See [DOCUMENTATION_UPDATE_TRACKER.md](./DOCUMENTATION_UPDATE_TRACKER.md) for current documentation status and update progress.

**Updated Documentation Files:**

- ✅ dashboard.md
- ✅ administration.md
- ✅ locations.md
- ✅ machines.md
- ✅ members.md
- ✅ sessions.md
- ✅ collection-report.md
- ✅ collection-report-details.md
- ✅ login.md

**Pending Documentation Files:**

- ⏳ machine-details.md (exists, needs restructuring)
- ⏳ location-details.md (needs analysis)
- ⏳ location-machines.md (needs analysis)

## Quick Reference

### Main Pages

- Dashboard: `/`
- Administration: `/administration`
- Locations: `/locations`
- Machines: `/cabinets`
- Members: `/members`
- Sessions: `/sessions`
- Collection Reports: `/collection-report`

### Detail Pages

- Location Details: `/locations/[slug]`
- Machine Details: `/cabinets/[slug]`
- Member Details: `/members/[id]`
- Collection Report Details: `/collection-report/report/[reportId]`
- Session Events: `/sessions/[sessionId]/[machineId]/events`

### Authentication

- Login: `/login`
