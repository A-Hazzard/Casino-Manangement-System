# Gemini Code Assistant Context

This document provides instructional context for the Gemini Code Assistant, based on an analysis of the Evolution One CMS codebase. It outlines the project's architecture, conventions, and key operational guidelines to ensure that any code generated or modified by the assistant aligns with the established standards.

## Project Overview

Evolution One CMS is a comprehensive casino management system built with Next.js 15 (App Router) and a MongoDB backend. It provides real-time analytics, financial tracking, and management of casino operations, including locations, cabinets, and user administration. The system is designed for high performance and strict data integrity, with a focus on security and regulatory compliance.

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with Shadcn/UI components
- **State Management:** Zustand
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT with `jose`
- **Charting:** Recharts
- **Maps:** React Leaflet

## Development Environment

### Setup and Execution

1.  **Install Dependencies:** Use `pnpm install` to ensure consistent package management and dependency resolution.
2.  **Run Development Server:** `pnpm run dev`
3.  **Build for Production:** `pnpm run build`
4.  **Linting:** `pnpm run lint`
5.  **Type Checking:** `pnpm run type-check`

### Key Scripts

- `dev`: Starts the Next.js development server.
- `build`: Creates a production-ready build.
- `lint`: Runs ESLint to identify and fix code style issues.
- `type-check`: Verifies TypeScript types across the project.

## Architectural and Development Conventions

The project enforces a strict set of conventions to maintain code quality, consistency, and maintainability. These are documented in detail in `.cursor/rules/nextjs-rules.mdc`.

### 1. TypeScript and Type Safety

- **No `any` Type:** The use of `any` is strictly prohibited. All variables and functions must have explicit type definitions.
- **Type Over Interface:** Prefer `type` for all type definitions.
- **Directory Structure:**
    - `shared/types/`: For types shared between the frontend and backend.
    - `lib/types/`: For frontend-specific types.
    - `app/api/lib/types/`: For backend-specific types.

### 2. File and Component Structure

- **Lean `page.tsx` Files:** Pages should act as thin wrappers, delegating logic to child components and helpers.
- **Component Organization:** Components should be organized with clear sections for hooks, state, computed values, event handlers, and effects, separated by comments.
- **API Route Structure:** API routes must follow a standardized pattern with numbered steps, performance tracking, and clear error handling.

### 3. Loading States and Skeletons

- **Specific Skeletons:** Generic loading spinners or text are forbidden. Each page or component with asynchronous data must have a specific skeleton loader that matches its layout.
- **Visual Accuracy:** Skeletons must accurately represent the final content structure, including headers, cards, tables, and other UI elements.

### 4. Database and Backend

- **Mongoose Models:** Always use Mongoose models for database interactions; direct collection access is not allowed.
- **Query Methods:** Use `findOne({ _id: id })` instead of `findById(id)`.
- **Licensee Filtering:** All API routes must filter data by `licensee` to enforce data access permissions.
- **Performance:**
    - Use `.cursor({ batchSize: 1000 })` for all `Meters.aggregate()` calls.
    - Avoid expensive `$lookup` operations by using direct field access where possible.

### 5. Documentation and Comments

- **File-Level JSDoc:** Required for all API routes, pages, and complex components.
- **Section Comments:** Use comments to delineate major sections within components and API routes.
- **JSX Comments:** Mark major UI sections in JSX to improve readability.

## Operational Guidelines for Gemini

When assisting with this project, adhere to the following principles:

1.  **Analyze Before Modifying:** Before making any changes, thoroughly analyze the existing code, related files, and documentation to understand the established patterns and conventions.
2.  **Follow the Rules:** Strictly adhere to the rules outlined in `.cursor/rules/nextjs-rules.mdc`, especially regarding type safety, file structure, and loading states.
3.  **Verify Dependencies:** Before deleting any code, use `search_file_content` to check for dependencies and ensure that no part of the system will break.
4.  **Maintain Consistency:** Ensure that any new code matches the style, structure, and architectural patterns of the existing codebase.
5.  **Prioritize Performance:** When working with database queries or data-intensive components, prioritize performance by following the optimization guidelines.
