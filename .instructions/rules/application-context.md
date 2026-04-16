---
description: Comprehensive application context, business logic, and architectural guidelines for the Evolution One CMS.
globs: **/*
---

# Evolution One Casino Management System - Application Context

## 📚 Essential Documentation References

- **Collection Report System:** [Backend](../Documentation/backend/collection-report.md) | [Frontend](../Documentation/frontend/collection-report.md)
- **Vault System:** [Backend](../Documentation/backend/vault/README.md) | [Frontend](../Documentation/frontend/vault/README.md)
- **Financial Metrics:** [Financial Metrics Guide](../Documentation/financial-metrics-guide.md)
- **Database:** [Database Models & Relationships](../Documentation/database-models.md)
- **Type System:** [TypeScript Type Safety Rules](../Documentation/typescript-type-safety-rules.md)
- **Engineering Guidelines:** [Engineering Guidelines](../Documentation/ENGINEERING_GUIDELINES.md)

## 🏢 Core Architecture

### Technology Stack
- **Frontend:** Next.js 16.0.7, React 18.3.1, TypeScript, Tailwind CSS, Zustand, Radix UI.
- **Backend:** Next.js API Routes, MongoDB with Mongoose ODM (v8.18+).
- **Infrastructure:** `bun` / `bun` for package management, JWT (jose) for auth.

### Project Structure (Key Directories)
- `app/api/lib/models`: Mongoose schemas.
- `app/api/lib/helpers`: Server-side business logic.
- `shared/types`: Centralized TypeScript definitions (Single Source of Truth).
- `components/shared/ui/skeletons`: Mandatory content-specific loading states.

## 💰 Business Logic & Financials

### Financial Flow
`Member Session` → `Machine Events` → `Meter Readings` → `Collections` → `Collection Reports`

### Metrics Dashboard
- **Drop (Money In):** Physical cash inserted (`movement.drop`).
- **Money Out:** Manual payouts (`movement.totalCancelledCredits`).
- **Gross Revenue:** `Drop - Money Out`.
- **Jackpot:** Total handpaid jackpots from the machine.
- **Net Gross:** `Gross - Jackpot`. **MANDATORY** metric for true revenue tracking.
- **SAS Gross vs Machine Gross:**
  - **Machine Gross:** Calculated from movement fields stored on the machine.
  - **SAS Gross:** Calculated by querying meters based specifically on SAS time intervals (start/end) during collection reports.
- **Movement Delta Method:** **MANDATORY**. Sum movement fields from meters; never use cumulative approach alone for periodic analysis.

### Gaming Day Offset
- **Business Rule:** Gaming day starts at **8 AM** Trinidad Time (UTC-4).
- **Implementation:** All meter-based queries must apply the offset. Calendar events (logs) use UTC/Local as is.
- **SAS Time:** SAS protocol interactions often follow specific start/end timestamps which define the "SAS Period" for collections.

## 🛠️ Engineering Guidelines (CRITICAL)

### 1. Loading States (Skeleton Loaders)
- **MANDATORY:** Every page/component with async data must use a specific skeleton loader.
- **NO GENERIC SPINNERS:** Skeletons must exactly match the layout of the final content.
- **Mobile-Specific:** Skeletons must be responsive and match mobile views.

### 2. Responsive Modals (Dialogs)
- **Pattern:** Modals should be full-screen on mobile (`isMobileFullScreen={true}`) and constrained on desktop (`md:` classes).
- **Implementation:** Use `DialogContent` with `inset-0 w-full h-[100dvh]` for mobile, and `md:left-[50%] md:top-[50%]` etc., for desktop.
- **Scrolling:** Use `flex flex-col` on `DialogContent` and `flex-1 overflow-y-auto` on the inner container to ensure long forms are scrollable on mobile.
- **Close Button:** Ensure `z-index` is at least `z-50` to remain visible over scrollable content.

### 3. Floating Notifications & Actions
- **Floating Action Buttons (FAB):** The `NotificationBell` and `Refresh` buttons should be integrated via `PageLayout`'s `onRefresh` prop to enable floating behavior on scroll.
- **Consistency:** All Vault Management pages (Overview, Cashier Dashboard, Transactions) must show the floating notification bell for rapid response to alerts.

### 4. TypeScript Discipline
- **No `any` allowed.** Use proper types from `shared/types`.
- **Single Source of Truth:** Prefer types in `shared/types/` to eliminate frontend/backend duplication.
- **Cast through unknown:** When casting Mongoose `.lean()` results to strict types, cast through `unknown` first to satisfy strict overlap checks.
- **Never import React namespace:** Always use direct named imports: `import { useState, FC } from 'react'`

## 🚀 Key Modules Status (February 2026)

### Vault Management System (VMS)
- **Vault Dashboard:** Features "Advanced Dashboard" with real-time charts and optimized grid for top 4 cashiers.
- **Mobile UX:** Optimized for high-volume cashier operations with full-screen responsive modals and amount-only payout entries.
- **Vault Management:** Strict atomic ledger tracking for every bill movement (floats, collections, expenses).
- **Shift System:** Mandatory "currentBalance" tracking and discrepancy resolution via "Shift Review Panel".
- **Notification Integration:** Floating notification bell provides real-time alerts for pending float requests and shift discrepancies across all vault contexts.

### SMIB Management (Slot Machine Interface Board)
- **Real-time Control:** Restart, meter requests, and firmware (OTA) updates over MQTT.
- **GridFS Storage:** Firmware binaries stored in MongoDB.

### Gaming Day & Date Filters
- Standardized across all endpoints using Trinidad Local Time to UTC conversion.
