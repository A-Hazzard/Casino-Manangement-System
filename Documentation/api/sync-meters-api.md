# Sync Meters & Telemetry API (`/api/collections/sync-meters`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.0.0

---

## 1. Domain Overview

The Sync Meters API is the real-time gateway that bridges the gap between the database and physical hardware. It is responsible for orchestrating the timing-critical "Meter Snapshot" required for accurate financial reporting.

---

## 2. Core Endpoints

### 📡 `GET /api/collections/sync-meters`
Triggers a live SAS poll for a specific machine.
- **How it works (The Handshake)**:
  1. The API receives a request for `Machine-X`.
  2. It identifies the target SMIB via its `MQTTClientID`.
  3. It publishes a `GET_METERS` command to the `sunbox/[id]/config` topic.
  4. It waits 3000ms for an inbound MQTT response.
  5. If successful, it returns the raw integer meters (Drop, Coin-In, Win).
- **Fallback**: If the machine is offline, it returns the `lastKnownSafe` meters from the database with a `status: "offline"` payload.

### 📤 `POST /api/collections/sync-meters/all`
Bulk sync for an entire Location floor.
- **Concurrency Control**: To prevent saturating the property's network, the API processes machines in parallel batches of 10.

---

## 3. High-Level Logic (The "Sync" Process)

### 🕒 Time-Calibration logic
Accuracy depends on knowing *exactly* when the meter reading was taken relative to the physical cash count.
- **The "Drift" Check**: The API compares the `syncTime` with the property's local server time. If the drift is > 5 seconds, it flags the reading as `desynchronized`.
- **Game Day Alignment**: Automatically buckets the synced meters into the correct `GamingDayID` based on the location's 8 AM (or custom) offset.

---

## 4. Icons & Technical Feedback

- 🛰️ **Sat-Icon**: Indicates the reading was verified live via SMIB.
- 💾 **Disk-Icon**: Indicates the reading is a fallback from the database (SMIB was unreachable).
- 🕒 **Clock-Icon**: Indicates a "Stale Reading" where the last sync happened > 15 minutes ago.

---

## 5. Security & Filtering

### 🏢 Property Scope
Every sync request is validated against the user's `sessionLocation`. A user at **Property A** cannot trigger sync commands for machines at **Property B** even if they have global Admin rights (Prevents cross-site interference).

### 🛡️ Rate Limiting
The API enforces a 30-second cooldown per machine to prevent SMIB CPU exhaustion from rapid-fire sync requests.

---
**Internal Document** - IoT & SMIB Integration Team
