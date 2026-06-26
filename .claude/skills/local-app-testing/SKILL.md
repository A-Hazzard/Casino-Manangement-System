---
name: local-app-testing
description: Logging in and manually testing the Evolution One CMS in a real browser on localhost. Use when driving the app via the browser (Claude in Chrome) to verify a change, test a flow, or reproduce a bug. Contains the dev login credentials.
---

# Local App Testing

Use this when testing the running app in a real browser (Claude in Chrome) against the local dev server.

## Dev server

- The dev server usually runs at `http://localhost:3000` and is **often already running** — do not start a new one without checking. If the user says it's running, trust that.
- This is a **real browser** flow (Claude in Chrome MCP), not the Claude Preview tools.

## Login credentials (dev)

Try these in order — **always try admin first**:

1. **Primary (admin):** username `admin` / password `Sunny2026!`
2. **Fallback:** username `ahazzard` / password `Decrypted12!`

Only fall back to the second account if the admin login is rejected.

## Notes

- The admin account has the broadest role (Developer/Owner/Admin), so it sees all locations and machines — best for end-to-end verification.
- After logging in, navigate to the relevant page (e.g. `/collection-report`, `/locations`, `/cabinets`) to test.
- For collection-report variation checks: a non-zero variation appears when a machine's entered/synced meter movement disagrees with the live SAS-derived movement. WOW machines have no live SAS relay, so they should never raise a variation on their own.

> Security note: these are local dev credentials. This file is git-tracked — avoid committing real/production secrets here.
