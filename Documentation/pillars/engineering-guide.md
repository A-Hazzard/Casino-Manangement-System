# Engineering & Platform Pillar (Platform)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 3.0.0

---

## 1. Frontend Standards

- **Architecture**: Lean `page.tsx` wrappers delegating to `Content` components and `lib/helpers`.
- **Uniformity**: Standard section-commented structure for all complex components.
- **Loading UX**: Mandatory machine-accurate Skeletons for all views.
- **State**: Zustand for global UI state; React Query for server data.

---

## 2. Backend Standards

- **Route Pattern**: Standard Step-by-Step (Parse -> Auth -> Logic -> Response) architecture.
- **Mongoose**: Strict usage of defined models with `.lean()` for performance.
- **Concurrency**: Use `Promise.all()` for aggregate queries spanning multiple locations.
- **UTC Baseline**: Store all data in UTC; convert to Trinidad Time (UTC-4) at the API boundary.

---

## 3. Real-time Infrastructure (MQTT)

- **SMIB Telemetry**: Subscribes to `sunbox/` for machine metrics and state changes.
- **Remote Control**: Publishes to `config/` for firmware updates and lockdowns.
- **Event Bus**: SAS events are piped from SMIBs to the `machineevents` collection for real-time dashboard updates.

---

## 4. Territory & Device Config

- **Jurisdictions**: Country-level rules (Max Bet, Currency Symbols, Timezones).
- **Firmware Repository**: GridFS storage with SHA-256 checksum validation.
- **Migration Engine**: Scheduled mass-updates of hardware software via MQTT.

---

## 5. Engineering Workflows

| Task | tool | Location |
| :--- | :--- | :--- |
| **New API** | Route Handler | `app/api/[domain]/route.ts` |
| **New Logic** | Helper Class | `app/api/lib/helpers/` |
| **New UI** | Component | `components/[DOMAIN]/` |
| **New State** | Zustand Store | `lib/store/` |

---
**Maintained By**: Evolution One Development Team
