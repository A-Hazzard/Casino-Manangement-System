# Financial & Analytics Pillar (Finance)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 3.0.0

---

## 1. Vault & Cash Management (`app/vault`)

The VMS ledger system for physical cash inventory.
- **Double-Entry Ledger**: Immutable `VaultTransaction` records for every cent.
- **Blind Closing**: Cashier audit integrity workflow.
- **TOTP Gating**: Security protocols for safe access and large payouts.

---

## 2. Calculation Engine

The mathematical core of the CMS.
- **Delta-Based Accounting**: Summing `movement` increments to ensure no data loss.
- **Revenue (Gross)**: `Sum(Drop) - Sum(Cancelled Credits)`.
- **Time Normalization**: Respecting `gameDayOffset` (Trinidad Midnight logic).
- **RAM Clear Stitching**: Logic to maintain meter continuity across hardware resets.

---

## 3. Analytics & Reporting (`app/reports`)

Business intelligence and executive summaries.
- **Performance Dashboards**: Revenue trends, Hold %, and Uptime heatmaps.
- **SAS vs. Manual Audit**: Identifying variance between electronic and physical data.
- **Parallel Processing**: High-speed monthly reporting via concurrent backend queries.
- **Export Engine**: PDF and Excel generation with verified real-time data.

---

## 4. Operational Dashboard (`app/page.tsx`)

The high-level "Pulse" of the system.
- **Financial Tickers**: Live Gross Revenue and Handle metrics.
- **Spatial Map**: Leaflet integration for geographic performance monitoring.
- **Competitive Ranking**: Leaderboards for properties and individual games.

---

## 5. Key Metrics Definition

| Metric | Source | Formula |
| :--- | :--- | :--- |
| **Gross Revenue** | Meters | `Bill In - Cancelled Credits` |
| **House Edge** | Sessions | `Handle - Player Wins` |
| **Hold %** | Reports | `(Gross Revenue / Drop) * 100` |
| **Yield** | Analytics | `Revenue / Active Days` |

---
**Maintained By**: Evolution One Development Team
