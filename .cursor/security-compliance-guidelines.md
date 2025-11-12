# Security Compliance Guidance

> **Purpose**: Ensure every update, feature, or fix respects the product’s latest security, privacy, and regulatory commitments. Treat this file as the authoritative checklist before shipping any work that touches user data, authentication, permissions, or operational tooling.

---

## 1. Authentication & Session Management
- Never downgrade password requirements or allow weak credentials.
- Preserve or increase hashing/entropy standards; no plaintext storage outside ephemeral runtime validation.
- Verify that `sessionVersion` logic remains intact; increment on permission, role, or scope changes.
- Respect token lifetimes and scopes; never extend expiry without explicit approval.
- Ensure multi-factor or secondary authentication flows remain optional only when documented.

## 2. Profile & Identity Integrity
- Do not bypass the profile validation lock unless replacing it with stronger enforcement.
- Keep `lastLoginPassword` handling ephemeral; no logging or persistence.
- Require real-time validation of usernames, legal names, gender selection, phone numbers, and password strength in alignment with `lib/utils/validation.ts`.
- Treat `profile.identification.dateOfBirth` as mandatory; reject future-dated or malformed values and document UI messaging.
- Document user-facing messaging for security changes; keep professional tone referencing compliance requirements.

## 3. Authorization & Access Control
- Honor licensee/location filtering and role-based access as defined in `.cursor/licensee-access-context.md`.
- Never expose cross-licensee data; ensure API queries are filtered via `getUserLocationFilter` and `userAccessibleLicensees`.
- Preserve `shouldShowNoLicenseeMessage` logic on the client; no data render prior to access check.
- Ensure rate-limiting or throttling is maintained when touching sensitive endpoints.

## 4. Data Handling & Logging
- Avoid logging PII, passwords, tokens, or session cookies.
- Sanitize and validate all inputs to backup, migration, or admin scripts.
- When exporting data (e.g., backups), restrict output to approved destinations and JSON formatting; overwrite previous data intentionally and document run results.
- Confirm that new scripts respect environment variables for connections and have clear error messages.

## 5. UI & UX Compliance Messaging
- Security-related modals or banners must explain requirements succinctly, referencing compliance or policy updates.
- Disable navigation or interactions when compliance conditions are unmet.
- Provide actionable remediation steps (e.g., “Update Profile” button) and accessible text.

## 6. Documentation & Communication
- Update relevant documentation under `Documentation/` when compliance controls change.
- Reflect security-related changes in the root `CHANGELOG.md`.
- Note new enforcement rules in `.cursorrules` or other context files where developers will see them.

## 7. Testing & Verification
- Include test notes verifying profile validation, session invalidation, and access control.
- Run `npm run lint` and applicable automated tests before merging.
- For scripts affecting data, perform dry runs or use mock databases when possible.

## 8. Review & Sign-off
- Flag pull requests with “Security Impact” when any item above is touched.
- Require review from security/compliance owner for changes altering policies, password rules, or data-handling pipelines.
- Defer deployment if new controls are not fully documented or tested.

---

**Remember**: Security compliance is a feature. Treat it as non-negotiable technical debt prevention. When in doubt, escalate to the security owner before proceeding.***

