# Spec: Manual Meter Creation for Non-SMIB Locations

**Author:** Antigravity (AI Assistant)  
**Date:** April 2026  
**Status:** Draft / Specification  

---

## 1. Overview
In locations flagged as "No SMIB" (Non-SAS locations), electronic meter readings via the SAS protocol are unavailable. Currently, manual meter readings entered during collection reports are only stored within the report itself. This specification requires these readings to be synchronized with the `meters` collection to power universal analytics.

### Data Model Source of Truth
*   **Location:** `noSMIBLocation: boolean`  
*   **Cabinet:** `isSasMachine: boolean`  

## 2. Eligibility Criteria
A cabinet is eligible for manual meter creation if:
1.  **Site-Wide:** The location has `noSMIBLocation: true`.
2.  **Cabinet-Specific:** The cabinet has `isSasMachine: false`.
3.  **Hardware State:** The cabinet lacks a valid `smibBoard` / `smbId`.

## 3. Field Usage & Page Context

| Page / Modal | Field(s) Used | Purpose |
| :--- | :--- | :--- |
| **Locations Page** | `noSMIBLocation` | Sets the default site behavior (Manual vs. SAS). |
| **Cabinets Page** | `isSasMachine` | Individual cabinet override for non-SAS hardware. |
| **Cabinets List** | `smbId` / `smibBoard` | Displays **"NO SMIB"** if missing, signaling manual collection required. |
| **Collection Report** | `noSMIBLocation` & `isSasMachine` | Logic switch that swaps UI to manual meter entry fields. |

## 4. Operation Steps

### 4.1. Report Creation (POST `/api/collection-reports`)
When a collection report is finalized, for each non-SMIB cabinet:
1.  **Generate a Manual Meter ID:** Create a unique `_id` string using `new ObjectId().toHexString()`.
2.  **Calculate Deltas:** Compute `Movement In` and `Movement Out` using the RAM Clear logic defined below.
3.  **Persist Meter Document:** Save a new meter object to the `meters` collection with `isSasCreated: false`.
4.  **Link to Collection:** Store the manual meter's `_id` in the corresponding item of the `collections` array within the report.

### 4.2. Report Editing (PATCH)
Updating a collection report should:
1.  Locate the linked manual meter using the stored `_id`.
2.  Overwrite the meter object's `drop` and `totalCancelledCredits` (both top-level and movement blocks) with the new values.
3.  Update the `updatedAt` timestamp.

### 4.3. Report Deletions (DELETE)
Deleting a collection report must archive/delete all manual Meter objects linked to the cabinets in that report.

## 5. Calculations (Ref: `lib/utils/movement/cabinet.ts`)
*   **Movement In** = `Ram Clear Meter In (if exists) - Previous Meter In + Current Meter In`
*   **Movement Out** = `Ram Clear Meter Out (if exists) - Previous Meter Out + Current Meter Out`

## 6. Manual Meter Object Structure
The created meter document must strictly follow the schema below. 
**Note:** `_id` must be a **String** generated using `toHexString()`.

```json
{
  "_id": "<String(ObjectId())>",
  "cabinet": "<CabinetId>",
  "location": "<LocationId>",
  "movement": {
    "coinIn": 0,
    "coinOut": 0,
    "jackpot": 0,
    "totalHandPaidCancelledCredits": 0,
    "totalCancelledCredits": <Movement Out>,
    "gamesPlayed": 0,
    "gamesWon": 0,
    "currentCredits": 0,
    "totalWonCredits": 0,
    "drop": <Movement In> 
  },
  "coinIn": 0,
  "coinOut": 0,
  "jackpot": 0,
  "totalHandPaidCancelledCredits": 0,
  "totalCancelledCredits": <Current Meter Out>,
  "gamesPlayed": 0,
  "gamesWon": 0,
  "currentCredits": 0,
  "totalWonCredits": 0,
  "drop": <Current Meter In>,
  "isSasCreated": false,
  "readAt": <currentDateTime>,
  "createdAt": <currentDateTime>,
  "updatedAt": <currentDateTime>
}
```

---
**Note:** Always ensure the `isSasCreated` flag is set to `false` for manual entries to distinguish them from auto-generated SAS data in fiscal audits.

