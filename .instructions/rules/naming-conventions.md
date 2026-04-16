---
description: Naming conventions and folder structure rules for the Evolution One CMS project.
globs: **/*.{ts,tsx}
---

# Project Naming Conventions & Folder Structure

This document defines the architectural standards for component naming, file organization, and type definitions to ensure codebase consistency and readability.

## 1. Component Naming Conventions

### Page Components

All page-level content components must follow the `[PageName]PageContent` pattern.

- ✅ `ReportsPageContent.tsx`
- ✅ `DashboardPageContent.tsx`

### Tab-Specific Components

Components residing within a multi-tab system must be prefixed with the page name and their section.

- Pattern: `[PageName][Section][ComponentName]`
- ✅ `ReportsMachinesOverview.tsx`
- ✅ `ReportsLocationsTable.tsx`

### Feature-Specific Components

Components dedicated to a specific feature should be prefixed with the feature name.

- ✅ `AuthLoginForm.tsx`
- ✅ `MemberDetailsCard.tsx`

### Reusable UI Components

Low-level, project-wide reusable components live in `components/ui/` and should have simple, descriptive names.

- ✅ `Button.tsx`
- ✅ `Card.tsx`

## 2. Prop Type Naming Conventions

Prop types must match the component name with a `Props` suffix.

- ✅ `type ReportsLocationsTableProps = { ... }`
- ✅ `type DashboardMetricsCardProps = { ... }`

All prop types should be exported and placed in:

1. `lib/types/components.ts` for shared component props.
2. The component file itself ONLY if the type is unique and not used elsewhere (though centralized types are preferred).

## 3. Function Naming Conventions

### Event Handlers

Prefix with `handle`.

- ✅ `const handleRefresh = () => { ... }`
- ✅ `const onLocationClick = (id: string) => { ... }` (when passed as prop)

### Data Fetching

Prefix with `fetch`.

- ✅ `const fetchLocationData = async () => { ... }`

### Transformation/Formatting

Prefix with `format`, `calculate`, or `map`.

- ✅ `const formatCurrency = (val: number) => { ... }`
- ✅ `const calculateTotals = (data: Data[]) => { ... }`

## 4. Folder Structure

### Components Organization

`components/`
├── `[PageName]/` (Page-specific components)
│ ├── `tabs/` (Sub-folders for each main tab)
│ │ ├── `[TabName]/`
│ └── `[PageName]PageContent.tsx`
├── `ui/` (Project-wide reusable components)
│ └── `skeletons/` (Loading states)
├── `layout/` (Wrappers and navigation)

### 4.1. Component Grouping & Subfolders

**CRITICAL**: Even if a page doesn't have tabs, components should be grouped in subfolders for better organization and discoverability.

#### Subfolder Categories

When organizing page-specific components, use the following subfolder structure:

- **`tabs/`** - For tab-specific components (only when page has tabs)
  - Example: `components/reports/tabs/machines/ReportsMachinesOverview.tsx`

- **`modals/`** - For all modal components (create, edit, delete, issue, etc.)
  - Example: `components/collectionReport/modals/CollectionReportNewCollectionModal.tsx`

- **`layouts/`** - For desktop/mobile layout variants (when multiple layout files exist)
  - Example: `components/collectionReport/tabs/collection/CollectionReportListDesktop.tsx`

- **`details/`** - For detail page components
  - Example: `components/collectionReport/details/CollectionReportDetailsPageContent.tsx`

- **`sections/`** - For section components within a page
  - Example: `components/administration/sections/AdministrationUsersSection.tsx`

- **`common/`** - For shared components used across multiple tabs/sections
  - Example: `components/members/common/MembersMemberCard.tsx`

- **`forms/`** - For form-related components (form fields, form sections, etc.)
  - Example: `components/collectionReport/forms/CollectionReportNewCollectionFormFields.tsx`

- **`tables/`** - For table components (if multiple tables exist)
  - Example: `components/administration/tables/AdministrationUserTable.tsx`

- **`cards/`** - For card components (if multiple card types exist)
  - Example: `components/administration/cards/AdministrationUserCard.tsx`

- **`skeletons/`** - For skeleton/loading components (optional - can also use `components/ui/skeletons/`)
  - Example: `components/administration/skeletons/AdministrationUserTableSkeleton.tsx`

- **`mobile/`** - For mobile-specific components (when mobile components don't fit other categories)
  - Example: `components/collectionReport/mobile/CollectionReportMobileCollectedListPanel.tsx`

#### Folder Structure Examples

**Pages with tabs:**

```
components/reports/
├── tabs/
│   ├── machines/
│   │   └── ReportsMachinesOverview.tsx
│   └── locations/
│       └── ReportsLocationsTab.tsx
└── ReportsPageContent.tsx
```

**Pages without tabs but with modals:**

```
components/cabinets/
├── modals/
│   ├── CabinetsNewCabinetModal.tsx
│   └── CabinetsEditCabinetModal.tsx
├── details/
│   └── [detail components]
└── CabinetsPageContent.tsx
```

**Pages with multiple component types:**

```
components/collectionReport/
├── tabs/
│   ├── collection/
│   ├── monthly/
│   └── collector/
├── modals/
│   └── [modal components]
├── forms/
│   └── [form components]
└── CollectionReportPageContent.tsx
```

**Reference**: The `components/reports/` folder serves as the ideal example of proper organization with tabs, clear naming conventions, and grouped chart components.

### API Organization

`app/api/`
├── `lib/`
│ ├── `helpers/` (Business logic)
│ ├── `models/` (Mongoose schemas)
│ └── `types/` (Backend-specific types)
└── `[route]/` (Route handlers)

## 5. Utility File Organization & Naming

### 5.1. File Naming Based on Use Cases

**CRITICAL**: File names should reflect what the code **does** or **is used for**, not where it runs or technical implementation details.

**Good Examples:**

- ✅ `machine.ts` - For machine movement calculations (not `frontendCalculation.ts`)
- ✅ `mapping.ts` - For data transformation/mapping utilities
- ✅ `normalization.ts` - For form value normalization
- ✅ `validation.ts` - For validation logic
- ✅ `totals.ts` - For calculating totals
- ✅ `colors.ts` - For color coding utilities

**Bad Examples:**

- ❌ `frontendCalculation.ts` - Too generic, doesn't indicate use case
- ❌ `clientUtils.ts` - Technical detail, not use case
- ❌ `backendHelpers.ts` - Technical detail, not use case

**Rules:**

- Name files based on **actual usage patterns** and **business purpose**
- Avoid prefixes like "frontend", "client", "server" unless necessary for disambiguation
- Use descriptive names that indicate the file's primary purpose
- When in doubt, check how the file is actually used in the codebase

### 5.2. Grouping Related Files

**When to Group in Subfolders:**

- Multiple files (3+) related to the same domain/feature
- Files serve distinct but related purposes
- Files are substantial (>100 lines) and warrant separation

**When to Merge Files:**

- Files are small (<100 lines each) and serve similar purposes
- Files are tightly related (e.g., normalization and formatting)
- Merging improves code discoverability without creating bloat

**Grouping Structure:**

```
lib/utils/[domain]/
├── [purpose].ts (e.g., mapping.ts, normalization.ts, validation.ts)
├── [purpose].ts
└── index.ts (central re-exports)
```

**Examples:**

- `lib/utils/movement/` - movement/calculation.ts, movement/requests.ts, movement/machine.ts
- `lib/utils/financial/` - financial/totals.ts, financial/colors.ts
- `lib/utils/cabinet/` - cabinet/mapping.ts, cabinet/normalization.ts, cabinet/validation.ts

### 5.3. File Organization Checklist

Before grouping or merging files:

1. ✅ **Check file sizes** - Small files (<100 lines) may be merge candidates
2. ✅ **Review use cases** - Files should be named based on actual usage
3. ✅ **Evaluate relationships** - Tightly related small files → merge; Distinct purposes → group
4. ✅ **Consider discoverability** - Does grouping/merging improve code navigation?
5. ✅ **Verify imports** - Update all imports after changes

## 6. React Imports (CRITICAL)

**Never import the React namespace itself.**

```typescript
// ✅ CORRECT - Direct named imports
import { useState, useEffect, useMemo } from 'react';
import { FC, ChangeEvent, ReactNode } from 'react';

// ❌ WRONG - React namespace
import React from 'react';
import * as React from 'react';
React.useState(); // Never do this
```

## 7. Component Section Comments (Internal)

To ensure code maintainability and consistent structure, all components MUST use descriptive section headers instead of generic ones.

### Header Pattern

Use the standardized separator: `// ============================================================================`

### Rule 1: Descriptive Headers

Headers must be specific to the component's domain logic.

- ❌ `// Hooks & State`
- ✅ `// Router & Component State`
- ✅ `// Navigation & Persistence Hooks`
- ❌ `// Computed Values`
- ✅ `// Metric Summary & Variations`
- ✅ `// Performance Calculations`
- ❌ `// Event Handlers`
- ✅ `// Machine Interaction Handlers`
- ✅ `// Form Submission & Validation`

### Rule 2: Remove "Render Logic" Header

The `// Render Logic` header is prohibited. Transitions from logic to the `return` statement should be clean or use a specific domain header if the component is exceptionally large.

- ❌ `// Render Logic`
- ✅ `// Machine Table Composition` (if needed)
- ✅ (No header before `return`)

---

---

## 8. Hook Organization

See [nextjs-rules.md](../rules/nextjs-rules.md) section **4.4. Custom Hook Structure** for the mandatory hook organization pattern. Key points:

- **Section order**: External Dependencies → Type Definitions → Helper Functions → Main Hook → Store State → Local State (grouped) → Form Data Bindings → Computed Values → Debounced Values → Refs → Effects → Event Handlers → Return
- **State grouping**: Group related state by concern (e.g., "Selection State", "Processing State", "Form State")
- **Event handlers**: Group by category (e.g., "Location Selection", "Machine Entry", "Form Submission")
- **Reference**: `lib/hooks/collectionReport/useNewCollectionModal.ts`

---

## 9. Summary of Best Practices

- **Lean Wrappers**: Keep `page.tsx` files minimal, delegating logic to a `PageContent` component.
- **Specific Loading States**: Create content-specific skeletons in `components/ui/skeletons/`.
- **Centralized Types**: Prefer `shared/types/` for data entities and `lib/types/` for UI-related types.
- **No Generic Names**: Avoid vague names like `Table.tsx` or `Map.tsx` outside of `components/ui/`.
- **Use Case-Based Naming**: File names should reflect what the code does, not where it runs.
- **Logical Grouping**: Group related files in subfolders when they serve distinct purposes.
- **Merge When Appropriate**: Consider merging small related files instead of grouping if it improves organization.
- **Descriptive Sections**: Replace generic engineering comments with domain-specific summaries.
- **Hook Structure**: Follow the hook organization pattern documented in nextjs-rules.md
