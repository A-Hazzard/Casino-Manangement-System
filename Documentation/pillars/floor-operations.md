# Floor Operations Pillar (Floor)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Locations & Properties (`app/locations`)

Manages the physical gaming floor locations where machines are deployed.
- **Location Config**: Handles Game Day Offsets, Tax Settings, and Coordinate mapping.
- **Data Isolation**: All location data is scoped to the user's `assignedLocations`.

---

## 2. Cabinets & Machines (`app/cabinets`)

Manages the hardware inventory and real-time status of gaming terminals.
- **SMIB Integration**: Real-time telemetry via MQTT (Online/Offline, Last Activity).
- **SAS Field Mapping**: Maps raw machine fields (e.g. `serialNumber`) to custom asset numbers.
- **Metric Aggregation**: Calculates live financial stats per machine for the dashboard.

---

## 3. Players & Loyalty (`app/members`)

The 360-degree view of player behavior and financial performance.
- **Member Registry**: KYC data and loyalty point balances.
- **Win/Loss Engine**: Real-time session analytics (Money In vs. Out).
- **Session Tracking**: Chronological play history with "Card-In" and "Card-Out" event streams.

---

## 4. Live Operational Dashboard (`app/sessions`)

Real-time floor monitoring for Floor Managers and Security.
- **Pulse Dashboard**: Displays active sessions, daily handle, and recent jackpots.
- **Event Alerts**: Immediate notification of "Critical Events" (Illegal Door Open, High Payout).
- **Forensic Replay**: Drill-down into specific session events for dispute resolution.

---

## 5. Technical Interaction Map

| Component | Source of Truth | Primary Sync |
| :--- | :--- | :--- |
| **Status** | Machine Collection | SMIB MQTT Heartbeat |
| **Financials** | Meter Collection | 15-min SAS Poll |
| **Sessions** | MachineSession Collection | Card-In/Out Events |
| **Member Points** | Member Collection | GamesPlayedRatio Formula |

---
**Maintained By**: Evolution One Development Team
