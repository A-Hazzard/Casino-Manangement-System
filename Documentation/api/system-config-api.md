# System Configuration & GridFS API (`/api/config`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.0.0

---

## 1. Domain Overview

The Configuration API manages global system constants, jurisdictional rules (tax, game-day), and binary firmware storage. It is the "Brain" for tenant-wide settings that affect all properties.

---

## 2. Core Endpoints

### 📦 `GET /api/config/firmware` (GridFS)
- **What it is**: Retrieves firmware binary metadata.
- **How it works**: Uses the `gridfs-stream` to read the Large Binary Object (LOB) from the database without loading it into Node.js memory.

### 🏢 `GET /api/licencees`
- **Scope**: Returns the full profiles of corporate owners.
- **Calculated Logic**: Includes real-time counts for `maxMachines` vs. `actualMachines`.

### 🌍 `GET /api/config/localization`
- **How it works**: Returns the currency code (TTD, USD), number formatting (decimal places), and timezone for the requested Licencee.
- **Logic**: Used by the frontend to format all financial strings globally.

---

## 3. Operations & Remote Commands

### 🚀 `POST /api/config/firmware/migrate`
Triggers the fleet update.
- **Payload**: `{ sourceId, targetId, machineList: [] }`.
- **Logic**: Sends the migration package to each machine's MQTT `command` channel.
- **Status Log**: Creates a `FirmwareMigration` document to track the progress of every individual machine down to the byte.

---

## 4. Icons & Technical Status Code

- 📦 **Package Icon**: Firmware binary.
- ⚙️ **Gear Icon**: General System Config.
- 🔄 **Sync Arrow**: Active migration task.

---

## 5. Security & RBAC

- **Developer Only**: Endpoint `POST /api/config/seed` (Used for initial property setup).
- **Admin**: Can upload firmware and read configuration.
- **Manager**: Read-only access to localization and currency rates.

---
**Technical Reference** - Engineering & Platform Team
