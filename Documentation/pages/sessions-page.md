# Sessions & Operations Page Implementation (`/sessions`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Page Overview

Real-time floor monitoring and session forensic replay.

---

## 2. Data & API Architecture (By Section)

### 📋 Session History Table
The central grid for searching and auditing player journeys.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Session ID** | `_id` | `GET /api/sessions` |
| **Machine Asset** | `machineCustomName` | `GET /api/sessions` |
| **Member Name** | `memberName` | `GET /api/sessions` |
| **Outcome** | `totalLoss` / `NetResult` | `GET /api/sessions` |

- **Filters**: Responsive to `Search` (ID/Asset/Member), `Licencee`, and `Date Range` (Today, 7d, 30d, Custom).
- **Implementation**: `SessionsPageContent` using the `useSessions` hook for server-side pagination.

### 🕵️ Session Details Panel
The side-drawer or modal providing a deep-dive into a specific record.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Start/End Time** | `startTime` / `endTime` | `GET /api/sessions/[sessionId]` |
| **Duration** | `duration` (Computed) | `GET /api/sessions/[sessionId]` |
| **Status** | `active` / `completed` | `GET /api/sessions/[sessionId]` |

- **Forensic Feed**: Lists every discrete MQTT event (Card-In, Spin, Win, Card-Out) associated with the session ID.
- **Implementation**: `SessionDetailsDrawer` component triggered by row selection.

### ⚙️ Member Loyalty Settings
Displays the jurisdictional and loyalty parameters active during the play session.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Points Multiplier** | `locationMembershipSettings.multiplier` | `GET /api/sessions/[sessionId]` |
| **Tier Bonus** | `locationMembershipSettings.tierBonus` | `GET /api/sessions/[sessionId]` |

- **Inheritance**: Shows settings derived from the Member's profile, falling back to the Location's default if the member is unranked.
- **Implementation**: `renderLocationSettings` helper within the details view.

### 💓 Real-time Operations Ticker
Live feed of floor activity for instant situational awareness.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Live Event** | `eventType`, `machineId`, `timestamp` | `SSE /api/analytics/machines/stream` |
| **Active Count** | `currentlyPlaying` | `GET /api/analytics/dashboard` |

- **Function**: Pushes real-time alerts for Jackpots, Door Opens, and High-Value Card-Ins without requiring a page refresh.
- **Implementation**: `LiveTicker` component subscribed to the Server-Sent Events (SSE) bus.

---

## 3. Interaction & Filtering

- **Dynamic Search**: The `Search` input supports partial matching for Session IDs and Machine Asset Names. The API returns results sorted by a custom **Relevance Score**.
- **Role Detection**: 
  - **Managers**: Can see PII (First/Last Names) of members.
  - **Security/Auditors**: Can view raw hexadecimal trace logs for technical troubleshooting.
  - **Standard Staff**: See masked member IDs to comply with data privacy regulations.

---

## 4. Visual Indicators & Icons

- 👤 **Member Badge**: Indicates a tracked session with a loyalty card.
- 🌫️ **Anonymous Badge**: Indicates "Cardless" play activity detected by the SMIB.
- 🔴 **Discrepancy Icon**: Appears if a `Card-Out` is received without a matching `Card-In`, flagging the session for forensic review.

---

## 5. Technical UI Standards

- **Skeleton UX**: Uses `SessionTableSkeleton` during initial data load.
- **Auto-Refresh**: The table data is periodically invalidated via React Query to keep the list current (refresh interval: 120s).
- **Responsive Design**: The table collapses into a "Mobile-Card" view on smaller screens, prioritizing `MachineAsset` and `Status`.

---
**Internal Document** - Engineering Team
