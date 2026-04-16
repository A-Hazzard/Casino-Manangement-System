# Members Page Implementation (`/members`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. Page Overview

CRM hub for player identity, loyalty management, and win/loss analytics. Provides full lifecycle management of casino members from enrolment to compliance auditing.

---

## 2. Data & API Architecture (By Section)

### 👥 Members List Tab

The primary directory of all enrolled players.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Member Name** | `profile.firstName`, `profile.lastName` | `GET /api/members` |
| **Member ID** | `memberId` | `GET /api/members` |
| **Points Balance** | `pointsBalance` | `GET /api/members` |
| **Status** | `isActive` (Computed) | `GET /api/members` |
| **KYC Status** | `kycComplete` | `GET /api/members` |
| **Last Seen** | `lastSessionDate` | `GET /api/members` |

- **Filters**: Responsive to `Licencee`, `Location` (Multi-select), `Search` (Name/ID/Phone), and `Sorting` (Name/Points/Last Session).
- **Search**: Debounced 350ms search that matches across `firstName`, `lastName`, `memberId`, and `phone`.
- **Implementation**: `MembersListTab` using batch loading (50 per page).

### 📊 Members Summary Report Tab

High-level registration and activity metrics for management reporting.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Total Registered** | `totalMembers` | `GET /api/members/summary` |
| **Active Today** | `activeToday` | `GET /api/members/summary` |
| **New This Month** | `newThisMonth` | `GET /api/members/summary` |
| **KYC Pending** | `kycPending` | `GET /api/members/summary` |

- **Heading**: "Members Summary Report"
- **Implementation**: `MembersSummaryTab` component.

### 🗃️ Member 360 Profile (Details Panel)

A full-screen profile view accessed by clicking any row in the Members List.
| UI Term | Data Element | Source API |
| :--- | :--- | :--- |
| **Personal Details** | `profile.*` | `GET /api/members/[id]` |
| **KYC Documents** | `kycDocuments[]` | `GET /api/members/[id]` |
| **Points History** | `pointsHistory[]` | `GET /api/members/[id]` |
| **Win/Loss Summary** | `winLoss.totalWon`, `winLoss.totalLoss` | `GET /api/members/[id]/winloss` |
| **Session History** | `session._id`, `session.duration` | `GET /api/sessions?memberId=[id]` |

- **Tabs within Profile**: `Overview`, `Sessions`, `Points History`, `Documents`, `Win/Loss Report`.
- **Implementation**: `MemberProfileDetailsPanel` triggered by `handleMemberClick`.

---

## 3. CRUD & Operational Triggers

- **Enrol Member**: Triggers `POST /api/members` via the "Register Member" modal. Requires legal name, DOB (age verification), and photo ID.
- **Upload ID Document**: Triggers `POST /api/upload/id-card` — streams directly to GridFS for secure storage.
- **Adjust Points**: Triggers `PATCH /api/members/[id]/adjust-points` with a mandatory audit note explaining the reason for the manual adjustment.
- **Suspend Member**: Triggers `PUT /api/members/[id]` with `{ isActive: false }`. Sets a "Self-Exclusion" or "Banned" flag for compliance reporting.
- **Verify KYC**: Triggers `PATCH /api/members/[id]/kyc-verify`. Creates an audit log with the verifying staff member's ID.

---

## 4. PII Masking & Role Detection

- **Managers**: Full visibility — see real phone numbers, National ID numbers, and KYC images.
- **Cashiers**: Sensitive fields like `National ID` are masked to `XXXX-1234` and `Phone` to `+1 (868) XXX-XXXX` via the `PIIMask` frontend component.
- **Compliance / Auditors**: Can view and download the original scanned ID document images stored in GridFS.

---

## 5. Visual Indicators

- 🔴 **KYC Incomplete**: Appears when the API returns `kycComplete: false`. The member is restricted from certain loyalty benefits.
- 🟢 **Active Session**: A pulsing green icon shows when the member currently has an open `MachineSession`, indicating they are on the floor right now.
- ⭐ **VIP Tier**: A coloured tier badge (Bronze/Silver/Gold/Platinum) reflects the member's current loyalty tier, derived from lifetime points.
- 🚫 **Blacklisted**: A red badge appears for members flagged with `isBlacklisted: true`, visible to all staff as an immediate floor alert.

---

## 6. Technical UI Standards

- **Skeleton UX**: `MembersListSkeleton` and `ProfileSkeleton` are used during data fetch.
- **Debounced Search**: 350ms debounce on the search input.
- **Lazy Loaded Tabs**: Session history and Win/Loss data are only fetched when the user navigates to that specific tab within the 360 Profile view.
- **Performance**: Member cards use `memo` to prevent re-renders when the global licencee filter changes.

---

**Internal Document** - Engineering Team
