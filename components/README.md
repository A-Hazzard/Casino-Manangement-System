# Components

UI components, organized by operating mode and feature. Page logic is kept thin — `app/**/page.tsx` files are wrappers that delegate to a `[PageName]PageContent` component here.

> Naming and structure rules are in [`CLAUDE.md`](../CLAUDE.md) and the `page-component-structure` / `file-organization` skills. This file is the map.

---

## Top-level layout

```
components/
├── CMS/        # CMS-mode features (casino management, reports, collections, members…)
├── VAULT/      # Vault-mode features (cash desk, floats, transfers, cashier shifts)
├── shared/     # Cross-mode building blocks (layout, auth guards, UI, skeletons, errors)
│   └── ui/
│       └── skeletons/   # Feature skeleton loaders
└── ui/         # Shadcn/Radix base primitives + additional skeletons
    └── skeletons/
```

- **`CMS/` and `VAULT/`** mirror the page routes under `app/` and the `process.env.APPLICATION` mode split.
- **`ui/`** is for low-level, project-wide reusable primitives (`Button`, `Card`, dialogs). Prefer an existing primitive before adding a new one.
- **`shared/`** is for things used across both modes (page layout, header, protected-route wrappers, error boundaries, shared skeletons).

---

## Naming conventions

| Kind | Pattern | Example |
| --- | --- | --- |
| Page content | `[PageName]PageContent.tsx` | `CabinetsPageContent.tsx` |
| Feature component | `[Feature][Section][Name].tsx` | `CabinetsDetailsSMIBManagementSection.tsx` |
| Prop type | `type [ComponentName]Props` | `type CabinetsActionsProps` |
| Reusable primitive | simple noun (in `ui/` only) | `Button.tsx`, `Card.tsx` |

Avoid generic names (`Table.tsx`, `Map.tsx`) outside `components/ui/`.

---

## Feature subfolders

Group a feature's components into subfolders by role — even when the page has no tabs:

| Subfolder | For |
| --- | --- |
| `tabs/` | Tab-specific components (when the page has tabs) |
| `modals/` | Create / edit / delete / confirm dialogs |
| `details/` | Detail-page components |
| `sections/` | Sections within a page |
| `forms/` | Form fields and form sections |
| `tables/` / `cards/` | Table / card variants when several exist |
| `layouts/` | Desktop vs mobile layout variants |
| `common/` | Shared across a feature's tabs/sections |
| `mobile/` | Mobile-only components that don't fit elsewhere |
| `skeletons/` | Feature-local skeletons (or use `components/ui/skeletons/`) |

---

## Component rules (summary)

- **No React namespace import** — `import { useState, FC } from 'react'`, never `import React`.
- **Section order**: Hooks → Computed → Handlers → Effects → Render, with `// ====` separators using domain-specific labels.
- **Skeletons, not spinners** — every async UI needs a dedicated skeleton matching the real layout (desktop + mobile).
- **Responsive**: `hidden md:block` for desktop, `md:hidden` for mobile; modals full-screen on mobile, constrained on desktop.
- **Currency**: render via `formatCurrencyWithCodeString` + `useCurrencyFormat()`; never hardcode `$`.
- Keep components under ~400–500 lines; extract sub-components or hooks past that.
