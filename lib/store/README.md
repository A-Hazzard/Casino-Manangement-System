# Zustand Stores

Global client state lives here — one store per domain. These hold **UI/session state**, not server data.

> **Server state belongs in React Query (TanStack Query), not Zustand.** Use a store only for state that is genuinely global and client-owned: the selected licencee, theme/currency, modal open/close, multi-step form drafts, in-progress action context. API data is fetched with `useQuery`/`useMutation`.

See [`CLAUDE.md` → State Management](../../CLAUDE.md) for the full rule.

---

## Stores

| Store | File | Holds |
| --- | --- | --- |
| Dashboard | `dashboardStore.ts` | `selectedLicencee`, `activeMetricsFilter`, `displayCurrency`, `gameDayOffset`, custom date range — persisted to `localStorage` |
| User / auth | `userStore.ts` | Authenticated user, init flag, vault shift status |
| Auth session | `authSessionStore.ts` | Session lifecycle / invalidation state |
| Notifications | `notificationStore.ts` | Floating notification-bell alerts (float requests, discrepancies) |
| Reports | `reportsStore.ts` | Reports page tab + filter state |
| Collection modal | `collectionModalStore.ts` | Collection report modal open/close + draft context |
| Cabinet UI | `cabinetUIStore.ts` | Cabinet page view/UI state |
| Cabinet actions | `cabinetActionsStore.ts` | In-flight cabinet action context (edit/delete/restore target) |
| New cabinet | `newCabinetStore.ts` | New-cabinet form draft |
| Firmware actions | `firmwareActionsStore.ts` | Firmware management action context |
| Location actions | `locationActionsStore.ts` | In-flight location action context |
| Member actions | `memberActionsStore.ts` | In-flight member action context |
| Movement request actions | `movementRequestActionsStore.ts` | Movement-request action context |

---

## Conventions

- **One domain per store.** Don't add cross-domain state to an existing store — create a new one.
- **Type the store explicitly**: `create<MyStore>(...)` with the type from `lib/types/`.
- **Persist deliberately.** Only persist what must survive reload (e.g. `dashboardStore` selected licencee/currency). Don't persist transient action context.
- **Reset on auth changes.** Clear user-scoped stores on logout / session invalidation.
- **Selectors over whole-store reads** in components to avoid needless re-renders: `useDashBoardStore(state => state.selectedLicencee)`.
