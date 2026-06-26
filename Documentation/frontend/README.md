# Frontend Documentation

**Author:** Aaron Hazzard  
**Last Updated:** June 25, 2026

## Structure

```
Documentation/frontend/
├── pages/              # Per-page documentation for every app route
│   ├── administration-page.md
│   ├── cabinets-page.md
│   ├── dashboard-page.md
│   ├── frontend-standards.md
│   ├── history-fix-page.md
│   ├── locations-page.md
│   ├── login-page.md
│   ├── members-page.md
│   ├── sessions-page.md
│   ├── system-config-page.md
│   ├── vault-implementation.md
│   └── vault-page.md
└── README.md           # This file
```

## `pages/` — Per-Page Documentation

Each file corresponds to one app route (`app/[page]/`). Docs cover component hierarchy, state management (Zustand stores, React Query), data fetching patterns, loading/error states, and mobile vs desktop layout variants.

See `pages/README.md` for a full catalog.

## `frontend-standards.md` — Cross-Cutting Patterns

Documents patterns shared across all pages: skeleton loader requirements, error boundary usage, responsive modal patterns, currency display conventions, and the `PageLayout` wrapper API.
