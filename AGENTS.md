# AGENTS.md

## Commands

- `bun run dev` - Start dev server at localhost:3000
- `bun run check` - Run type-check && lint before committing
- **Use bun exclusively** — not npm/yarn/pnpm

## Critical Conventions

### React Imports (CRITICAL)

Never import the React namespace. Always import directly:

```typescript
import { useState, useEffect, FC } from 'react';
```

Do NOT use `import React from 'react'` or `React.useState`.

### TypeScript

- Use `type` over `interface`
- **No `any`** — create proper types
- Path aliases: `@/*` = root, `@shared/*` = `shared/`

### Cookie Security

When setting auth cookies, use `getAuthCookieOptions()` from `lib/utils/cookieSecurity.ts` — never hardcode `secure: true`. Set `COOKIE_SECURE=false` in `.env.local` for HTTP/LAN access.

### Gaming Day Offset

Business days run **8 AM to 8 AM Trinidad time (UTC-4)**, not midnight. Apply to financial metrics only. Use `lib/utils/gamingDayRange.ts`.

## Architecture

- Next.js 16 with App Router
- MongoDB/Mongoose with singleton connection (`app/api/lib/middleware/db.ts`)
- Multi-tenant: all API queries must filter by user's licencee context
- API responses use standardized format: `{ success: true/false, data/error, ... }`

## Key Env Vars

- `MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECURE`
- `SENDGRID_API_KEY`, `INFOBIP_BASE_URL`/`INFOBIP_API_KEY`
- `MQTT_URI`, `MQTT_PUB_TOPIC`, `MQTT_SUB_TOPIC`

## Verification

Before any commit: run `bun run check` (type-check + lint)
