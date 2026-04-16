# Cabinets Page Implementation (`/cabinets`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Page Overview

Real-time telemetry and hardware management hub for all gaming machines across the property fleet.

---

## 2. Data & API Architecture (By Section)

### 📟 Fleet Inventory Table
The primary management grid for all gaming hardware across the floor.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Asset #** | `custom.name` | `GET /api/machines` |
| **Serial Number** | `serialNumber` | `GET /api/machines` |
| **Game Title** | `game` | `GET /api/machines` |
| **Live Status** | `isOnline` (Computed) | `GET /api/machines` |
| **Location** | `gamingLocation.name` | `GET /api/machines` |
| **Manufacturer** | `manufacturer` | `GET /api/machines` |

- **Filters**: Responsive to `Location`, `Manufacturer`, `Online Status` (All/Online/Offline), and `Machine Type` (Slot/VGT/Roulette/Terminal).
- **Search**: Matches against `serialNumber`, `custom.name`, and `game` using case-insensitive partial match.
- **Implementation**: `CabinetsPageContent` using the `useFetchMachines` hook with server-side pagination and search.

### 🕹️ Machine Details Drawer
A comprehensive fly-out panel providing a 360-degree view of a single asset. Opened by clicking any row in the Fleet Inventory Table.

#### Accounting Metrics Tab
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Money In** | `moneyIn` (movement.drop) | `GET /api/machines/aggregation` |
| **Money Out** | `moneyOut` (Base + Jackpot if applicable) | `GET /api/machines/aggregation` |
| **Gross** | `gross` (Money In - Money Out) | `GET /api/machines/aggregation` |
| **Net Gross** | `netGross` (True Profit) | `GET /api/machines/aggregation` |
| **Jackpot** | `jackpot` (movement.jackpot) | `GET /api/machines/aggregation` |

#### Live SAS Meters Tab
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Coin In** | `currentMeters.coinIn` | `GET /api/machines/[id]` |
| **Coin Out** | `currentMeters.coinOut` | `GET /api/machines/[id]` |
| **Current Credits** | `currentMeters.currentCredits` | `GET /api/machines/[id]` |
| **Total Drop** | `currentMeters.totalDrop` | `GET /api/machines/[id]` |

#### Bill Validator Tab
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Denomination** | `denomination` | `GET /api/bill-validator/[id]` |
| **Bill Count** | `count` | `GET /api/bill-validator/[id]` |
| **Subtotal** | `subtotal` | `GET /api/bill-validator/[id]` |

#### Audit Logs Tab
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Event Type** | `eventType` | `GET /api/machines/by-id/events` |
| **Description** | `eventDescription` | `GET /api/machines/by-id/events` |
| **Timestamp** | `timestamp` | `GET /api/machines/by-id/events` |

- **Date Filtering**: All tabs support specific ranges (Today, Yesterday, 7d, 30d, All Time, Custom).
- **Lazy Loading**: Each tab only fetches its data when selected (no upfront double-fetching).

### ⚙️ SMIB Configuration Panel
Hardware-level settings for the on-board system module (SMIB). Available within the Machine Details Drawer.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **SMIB IP** | `smibIP` | `GET /api/mqtt/machine-config` |
| **SAS Address** | `sasAddress` | `GET /api/mqtt/machine-config` |
| **Polling Interval** | `interval` | `GET /api/mqtt/machine-config` |
| **MQTT Topic** | `mqttTopic` | `GET /api/mqtt/machine-config` |

- **Security**: Editing these fields requires the `Developer` or `Technician` role.
- **Implementation**: `SmibConfigForm` sub-component within the Details Drawer.

---

## 3. Remote Operations & Commands

The interface provides a **"Command Center"** for direct hardware interaction (visible inside the Machine Details Drawer):
- **Sync Meters**: Manually forces the SMIB to poll the machine for the latest cumulative readings. Triggers `POST /api/machines/command` with `{ action: 'SYNC' }`.
- **Remote Lock**: Disables the machine cabinet for floor maintenance. Triggers `POST /api/machines/command` with `{ action: 'LOCK' }`.
- **Remote Unlock**: Re-enables a locked machine. Triggers `POST /api/machines/command` with `{ action: 'UNLOCK' }`.
- **Audit Log**: Every command execution is written to the activity log with the operator's user ID and timestamp.

---

## 4. Real-Time Status Logic (SSE)

- **Connectivity Pulse**: The 🟢 icon on the fleet table is updated instantly via **Server-Sent Events (SSE)**. If a machine misses two consecutive heartbeats (>180s), the icon automatically transitions to 🔴 without requiring a page reload.
- **Jackpot Alert**: A ⚡ animation flashes on the table row when a `Handpaid Jackpot` event is pushed through the SSE bus, requiring floor manager acknowledgement.
- **Door Open Alert**: A 🚨 door icon appears instantly on the row when the SMIB sends a `DOOR_OPEN` event via MQTT.

---

## 5. Role-Based Access Control (RBAC)

- **Technicians**: Full access to "Remote Commands" and "SMIB Config" tab.
- **Managers**: Limited to "Accounting Metrics" and "Audit Logs" for dispute resolution.
- **Auditors**: Can view "Bill Validator" data but are restricted from triggering Sync, Lock or Unlock commands.
- **Location Admins**: Only see machines belonging to locations explicitly assigned to their profile; the table is auto-filtered on page load.

---

## 6. Technical UI Standards

- **Skeleton UX**: `MachineRowSkeleton` used during initial table hydration.
- **Performance**: The Details Drawer uses memoization to prevent re-renders when the background SSE feed updates status icons in the main table.
- **Search Debounce**: 300ms debounce on the search input to prevent excessive API calls while the user is typing.
- **Responsive Design**: On mobile devices, the table hides `Manufacturer` and `Game Title` columns, showing a condensed "Asset Card" with `Live Status` and `Net Gross`.

---
**Internal Document** - Engineering Team
