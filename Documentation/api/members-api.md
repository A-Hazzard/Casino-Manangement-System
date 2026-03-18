# Members & CRM API (`/api/members`)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.2.0

---

## 1. Domain Overview

Manages player identities, loyalty points, Win/Loss analytics, and KYC compliance records. Links member documents to the `MachineSessions` collection to compute on-the-fly financial metrics.

---

## 2. Core Endpoints

### 👤 `GET /api/members`
Returns a paginated, searchable player registry enriched with financial metrics.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse query params** — Reads `search`, `page`, `limit`, `sortBy`, `sortOrder`, `startDate`, `endDate`, `winLossFilter` (`positive`/`negative`/`zero`/`all`), `locationFilter`, `currency`, and `licencee`.
3. **Build query filters** — Constructs a MongoDB `$match` object:
   - If `search` is provided: matches against `profile.firstName`, `profile.lastName`, `username`, or `_id` using case-insensitive `$regex`.
   - If `startDate`/`endDate` are provided: filters by `createdAt` range.
   - If `locationFilter` is set: filters by `gamingLocation` (supports comma-separated multi-select).
4. **Build aggregation pipeline** using 8 stages:
   - **Stage 1 (`$match`)**: Applies the query filter from Step 3.
   - **Stage 2 (`$lookup` → `gaminglocations`)**: Joins by `gamingLocation` field to get the location name. Uses `$expr` with both `$eq [_id, location]` and `$eq [toString(_id), toString(location)]` to handle mixed ID types.
   - **Stage 3 (`$lookup` → `machinesessions`)**: Joins on `memberId` to pull in all sessions for this member.
   - **Stage 4 (`$addFields`)**: Calculates `totalMoneyIn` (sum of `endMeters.movement.drop`), `totalMoneyOut` (sum of `endMeters.movement.totalCancelledCredits`), and `totalHandle` (sum of `endMeters.movement.coinIn`) from the `sessions` array using `$reduce`.
   - **Stage 5 (`$addFields`)**: Computes `winLoss = totalMoneyIn - totalMoneyOut` and `grossRevenue = totalMoneyIn - totalMoneyOut`.
   - **Stage 6 (`$match` — conditional)**: If `winLossFilter` is set, applies `winLoss { $gt: 0 }` (positive), `{ $lt: 0 }` (negative), or `{ $eq: 0 }` (zero).
   - **Stage 7 (`$project`)**: Projects only necessary fields — removes raw `sessions` array from the response to prevent payload bloat.
   - **Stage 8 (`$sort`)**: Sorts by `relevanceScore desc` (if searching), then by the requested `sortBy` field.
5. **Execute with pagination** — Runs a `$count` pipeline in parallel to get `totalMembers`, then adds `$skip` and `$limit` to the main pipeline and executes both.
6. **Apply currency conversion** — Calls `applyCurrencyConversionToMetrics()` to convert financial fields if the licencee has a non-USD currency.
7. **Return paginated list** — Responds with `{ success, data: { members, pagination }, currency, converted }`.

---

### 🆕 `POST /api/members`
Enrolls a new casino member.

**Steps:**
1. **Connect to database** — Establishes the Mongoose connection.
2. **Parse & validate request body** — Reads `profile`, `username`, `phoneNumber`, `pin`, `points`, `gamingLocation`, etc.
3. **Validate required fields** — Trims `firstName`, `lastName`, and `username`. Returns `400` if any of these are empty after trimming.
4. **Check username uniqueness** — Calls `Member.findOne({ username })`. Returns `400` with "Username already exists" if a collision is found.
5. **Generate member ID** — Calls `generateMongoId()` to create a new unique ObjectId hex string for `_id`.
6. **Create member document** — Constructs a `new Member({...})` with all required fields pre-populated with sensible defaults (e.g. `loggedIn: false`, `points: 0`, `accountLocked: false`).
7. **Save to database** — Calls `newMember.save()`.
8. **Log activity** — Calls `logActivity({ action: 'CREATE', ... })` to write to the audit trail with `changes` diff showing the new field values.
9. **Return created member** — Responds with the new document at `201 Created`.

---

## 3. Business Logic

### 🎡 Win/Loss Calculation
Win/Loss is computed on-the-fly per request — it is not a stored field. The aggregation `$reduce`s each session's `endMeters.movement.drop` (money in) and `totalCancelledCredits` (money out), then subtracts them. This ensures the value is always fresh and consistent with any session corrections.

### 📋 KYC Compliance (BR-MEM)
- **BR-MEM-01**: A member cannot be created without a unique username.
- **BR-MEM-02**: Point redemptions are blocked if the member's `accountLocked: true`.
- **BR-MEM-03**: Staff with `Cashier` role see masked ID numbers and phone numbers via the frontend `PIIMask` component (not enforced at API level, enforced in UI layer).

---
**Technical Reference** - CRM & Loyalty Team
