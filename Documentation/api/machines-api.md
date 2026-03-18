# Cabinets & Machines API (`/api/machines`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.0.0

---

## 1. Domain Overview

The Cabinets/Machines API manages the hardware lifecycle, SMIB integration, and real-time connectivity state. It acts as the bridge between the backend database and the physical MQTT message bus.

---

## 2. Core Endpoints

### 🎰 `GET /api/machines`
Returns a paginated list of all hardware units across assigned properties.
- **Connectivity Status**: Calculated on-the-fly. A machine is `online` if `lastActivity` < 3 minutes from `Date.now()`.
- **Searchable Metadata**: `serialNumber`, `custom.name` (Asset Number), `manufacturer`, and `game`.
- **Filters**: Support for `onlineStatus`, `machineType`, and `locationId`.

### 👁️ `GET /api/machines/[id]`
Returns the full machine forensic profile and configuration.
- **SAS Snapshot**: Includes `currentMeters` (Bill-In, Coin-In, Jackpots) fetched from the SMIB's last report.
- **Collection History**: Embeds the last 5 `Collection` entries for this machine to provide a trendline of performance.
- **SMIB Configuration**: Details the `smibIP`, `sasAddress`, and `pollingInterval`.

---

## 3. Real-Time Infrastructure (MQTT & SAS)

### 📡 SMIB Integration
- **Heartbeat**: Machines publish to the MQTT bus every 60 seconds. The API updates `lastActivity` in the database to reflect the "Live" status on the dashboard.
- **Command Bus**: The system supports remote commands like `SYNC`, `LOCK`, and `UNLOCK` by publishing to `sunbox/[machineId]/command`.

### 📊 Field Mapping (SAS to DB)
- `Total In` -> `movement.drop` (Physical cash/tickets inserted).
- `Total Out` -> `movement.cancelledCredits` (Player cash-outs).
- `Handle` -> `movement.coinIn` (Total amount bet).
- `Wins` -> `movement.totalWonCredits` (Total won by player).

---

## 4. Business Rules (BR-CAB)

- **BR-CAB-02**: `AssetNumber` (Custom Name) must be unique within a specific Location.
- **BR-CAB-03**: Moving a machine between locations triggers an automatic "History Gap" entry to prevent revenue double-counting at the destination.

---

## 5. Performance Optimizations

### 🚀 Indexed Lookups
The API uses a compound index on `{ gamingLocation: 1, deletedAt: 1 }` to handle fleet-wide status queries in <100ms.

### 📤 SSE Integration
Status changes detected at the API level (via MQTT update) are immediately broadcasted to the frontend through the `/api/analytics/machines/stream` Server-Sent Events endpoint.

---
**Technical Reference** - Engineering Team
