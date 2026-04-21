# Rules System Architecture

This directory contains the engineering standards, architectural invariants, and domain-specific guidelines for the Evolution One CMS project.

## Folder Structure

```text
.instructions/rules/
├── ARCHITECTURE.md             # This file (meta-documentation)
├── nextjs-rules.md             # Senior Engineering: React, Hooks, UI, and General Patterns
├── type-safety.md              # Data Integrity: Strict TypeScript rules, "zero-any" policy
├── application-context.md      # Domain Knowledge: High-level business logic
├── licencee-access-context.md  # Multi-tenancy: Critical rules for data isolation
├── currency-display.md         # Formatting: Handling financial numbers and scales
├── http-https-cookie-rules.md  # Security: Cookie and network security standards
└── naming-conventions.md       # Consistency: File and variable naming standards
```

## How to Use These Rules

1. **Always-Apply Rules**: Files like `nextjs-rules.md` and `type-safety.md` have `alwaysApply: true` in their frontmatter. They should be considered the "Constitution" of the codebase.
2. **Context-Specific Rules**: Rules like `currency-display.md` apply to specific features. Reference them when working on those domains.
3. **Hierarchy**:
   - `CLAUDE.md` (Root) → Absolute Master Context (System Philosophy)
   - `.instructions/rules/` → Implementation Standards (Engineering Constitution)
   - `.claude/skills/` → Operational Capabilities (AI Tooling & Patterns)

## Maintenance

- When introducing a new architectural pattern (e.g., a new state management library), update `nextjs-rules.md`.
- When a new type of financial metric is added, update `currency-display.md`.
- Changes to cross-cutting rules must be reflected in the relevant AI "skills" in `.claude/skills/`.
