# Collection Reports Documentation

**Author:** Aaron Hazzard  
**Last Updated:** June 25, 2026

## Structure

```
Documentation/collection-reports/
├── overview/           # High-level financial formulas and concepts
│   └── collection-report-finances.md
├── api/                # API endpoint reference
│   └── collections-api.md
├── frontend/           # Frontend page documentation
│   └── collection-report-page.md
├── reference/          # Bug fixes, variation fixes, manual meter specs, flow docs
│   ├── collection-report-variation-fix.md
│   ├── manual-meters-flow.md
│   └── manual-meters-spec.md
├── assets/             # PNG diagrams referenced by the docs
└── README.md           # This file
```

## Subfolder Breakdown

| Directory | Contents |
|-----------|----------|
| `overview/` | Financial formulas (SAS gross, machine gross, variation), collection types, gaming day application |
| `api/` | REST endpoints for collections CRUD, report finalization, batch update-history |
| `frontend/` | Page component hierarchy, modal systems (create/edit, desktop/mobile), `isEditing` flag UX |
| `reference/` | Variation fix implementation, manual meter entry flow diagrams/specs, edge case documentation |
| `assets/` | PNG diagrams (variation fix flow, manual meters flow) |

## Related Backend API Docs

Additional collection-report references live under `Documentation/backend/api/`:

- `collection-reports-v2-movement.md` — RAM clear, no-SMIB, offline SMIB movement patterns
- `collections-technical-deep-dive.md` — Full lifecycle: prevIn/prevOut sources, history sync, `isEditing` state machine
- `calculation-engine.md` — Movement delta formulas, reviewer scaling, currency conversion
