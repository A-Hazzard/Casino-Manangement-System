# Project Overview

**Evolution1 Casino Management System (CMS)** is a robust, Next.js (App Router) based software application for real-time casino operations, financial tracking, and compliance monitoring.

**Key Technologies:**

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS, Shadcn/UI, Radix UI, MUI
- **Database:** MongoDB / Mongoose 8
- **State Management:** Zustand (Global), TanStack React Query (Server)
- **Authentication:** jose (JWT) with HttpOnly cookies, otplib (TOTP 2FA)
- **Other:** Recharts, React Leaflet, Framer Motion, Axios, MQTT

**Core Systems:**

- **Collection Reports:** 3-step wizard with Movement Delta Method for accurate financial calculations.
- **Vault Management System (VMS):** Multi-tenant accounting ledger, shift tracking, and atomic transaction history.
- **Gaming Day Offset:** 8 AM Trinidad Time (UTC-4) offset applied to all meter-based queries.

# Building and Running

This project uses **bun** exclusively as the package manager.

- **Install Dependencies:** `bun install`
- **Development Server:** `bun run dev` (Runs on http://localhost:3000)
- **Production Build:** `bun run build`
- **Start Production Server:** `bun run start`
- **Type Checking:** `bun run type-check` (tsc --noEmit)
- **Linting:** `bun run lint` (or `bun run check` for both type-check and lint)

_Note: Environment variables are required in a `.env.local` file (e.g. `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, etc.)_

# Engineering Guidelines & Rules

## 1. Next.js & React Structure

- **Lean Pages:** `page.tsx` must be a thin wrapper handling routing/auth. Delegate logic to `[PageName]PageContent.tsx`.
- **Component Organization:** Group components logically in subfolders (`tabs/`, `modals/`, `forms/`).
- **No React Namespace:** Never import `React` directly (`import * as React from 'react'`). Use direct named imports (`import { useState, FC } from 'react'`).
- **Loading States:** MANDATORY specific skeleton loaders for async data. NO generic spinners or "Loading..." text. Create skeletons in `components/ui/skeletons/` that match exact layouts.
- **Hook Structure:** Group state by concern. Order: external deps -> types -> helpers -> main hook -> store state -> local state -> form bindings -> computed values -> debounced -> refs -> effects -> handlers -> return.

## 2. API Routes Structure

- **Required JSDoc:** File-level JSDoc explaining the route purpose, features, and an outline of the flow.
- **Step-by-Step Comments:** Use visual separators and numbered steps (e.g., `// === STEP 1: Parse Params ===`).
- **Helper Extraction:** Extract complex logic (>20-30 lines), DB operations, or reusable code to `app/api/lib/helpers/`.
- **Licencee/Location Filtering:** Always apply the user's accessible locations via `getUserLocationFilter` to queries.

## 3. Strict Type Safety & Mongoose Typing

- **Zero `any` Policy:** The use of `any` is strictly prohibited.
- **`type` over `interface`:** Use `type` for defining data structures.
- **Mongoose Typing:**
  - **NEVER** cast to `Record<string, unknown>`.
  - **Always** use `.lean<T>()` for single documents.
  - **Always** use `.lean<T>().cursor().toArray()` for large result sets.
  - **Always** pass generic shapes to aggregations: `.aggregate<T>([...])`.
- **Single Source of Truth:** `shared/types/` for shared types, `lib/types/` for frontend, `app/api/lib/types/` for backend.
- **Parameter Guards:** Validate required parameters explicitly at the start of functions.

## 4. Database Access

- **Always use Mongoose Models:** Never use direct `db.collection()` access. Import models from `app/api/lib/models/`.
- **Finding by ID:** Use `findOne({ _id: id })` instead of `findById(id)`.
- **Aggregations over Loops:** Consolidate sequential queries into single aggregations or batch queries. Eliminate N+1 query patterns.

## 5. Security & Cookies

- **Conditional Secure Flag:** The `secure` flag for cookies must never be hardcoded to `true`. Always use the `isSecureContext(request)` helper from `lib/utils/cookieSecurity.ts`.
- **SameSite:** Default to `lax`.

## 6. Financial Formatting & Currency

- **Global Currency:** Use `useCurrencyFormat()` hook. Never hardcode `$` symbols in the UI.
- **Color Coding:** Positive values/income must be green (`text-green-600`); negative values/losses must be red (`text-red-600`). Use `getFinancialColorClass()`.
- **Math on Frontend:** Avoid math calculations on the frontend; rely on backend APIs fetching data with `?currency=[displayCurrency]`.

## 7. General Naming Conventions

- **Variable Names:** No single-letter variables anywhere.
- **File Names:** Reflect the business purpose/use case (e.g., `movement/machine.ts` instead of `frontendCalculation.ts`).
- **Function Prefixes:** `handle` (events), `fetch` (data), `format`/`calculate` (transformations).
