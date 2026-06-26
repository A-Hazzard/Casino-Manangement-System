# Sync Meters & Telemetry API (`/api/cabinets/[cabinetId]/sync-meters`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Version:** 4.4.0  
**Last Updated:** June 25, 2026

---

## 1. Domain Overview

The Sync Meters API is the real-time gateway that bridges the gap between the database and physical hardware. It is responsible for orchestrating the timing-critical "Meter Snapshot" required for accurate financial reporting.

---

## 2. Core Endpoints

### 📡 `POST /api/cabinets/[cabinetId]/sync-meters`

Triggers a live SAS poll for a specific machine. This is a **POST** endpoint because it initiates a mutation (sync operation).

**How it works:**

1. The API receives a POST request for `cabinetId`.
2. It resolves the cabinet's parent location via `Machine.gamingLocation`.
3. It **redirects** to the location-specific endpoint: `/api/locations/${locationId}/cabinets/${cabinetId}/sync-meters`.
4. The location-specific handler performs the actual SAS poll via MQTT.
5. If successful, it returns the raw integer meters (Drop, Coin-In, Win).
- **Fallback**: If the machine is offline, it returns the `lastKnownSafe` meters from the database with a `status: "offline"` payload.

> **Note:** There is no `/sync-meters/all` endpoint. Each cabinet must be synced individually.

---

## 3. High-Level Logic (The "Sync" Process)

### 🕒 Time-Calibration logic

Accuracy depends on knowing _exactly_ when the meter reading was taken relative to the physical cash count.

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
