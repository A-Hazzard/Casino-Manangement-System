# 📊 Machine CoinIn Snapshot by Game Day Offset

## 🎯 Goal

For each machine in a given location:

* Respect the location’s **`gameDayOffset`** (hour of day local Trinidad time, UTC-4).
* Build a **cutoff timestamp** = *N days ago at that offset hour*.
* Query the `meters` collection for the **most recent document at or before that cutoff** (`createdAt <= cutoff`).
* Return the meter’s values (at minimum `coinIn`) with the machine’s `serialNumber` (fallback to `custom.name` if missing).

---

## ⚙️ Logic Flow

### 1. Get location

```js
const loc = db.gaminglocations.findOne({ _id: locationId }, { gameDayOffset: 1 });
const startHourLocal = Number(loc.gameDayOffset) || 0; // e.g. 11
```

### 2. Compute cutoff

* Work in Trinidad time (UTC-4).
* Example: If today is `2025-08-27 15:30 local` and `gameDayOffset = 11`, then:

  * “7 days ago at offset” = `2025-08-20 11:00 local`
  * UTC equivalent = `2025-08-20T15:00:00Z`

```js
const nowUTC   = new Date();
const nowLocal = new Date(nowUTC.getTime() - 4 * 60 * 60 * 1000); // UTC-4

const cutoffLocal = new Date(
  nowLocal.getFullYear(),
  nowLocal.getMonth(),
  nowLocal.getDate() - daysAgo,
  startHourLocal, 0, 0, 0
);

// Option 2 (preferred): use cutoffLocal directly (avoids double offset)
const cutoffUTC = cutoffLocal;
```

### 3. Query meters

```js
const latest = db.meters.find(
  { machine: m._id, createdAt: { $lte: cutoffUTC } },
  { coinIn: 1, createdAt: 1 }
).sort({ createdAt: -1 }).limit(1).toArray()[0];
```

### 4. Output

```json
{ "serialNumberOrName": "GM03387", "coinIn": 146749.5 }
```

---

## 📌 Example 1: One machine manually

Manual query (your test):

```js
db.meters.find(
  {
    machine: "3444acf2565c850291839221",
    createdAt: { $lte: ISODate("2025-08-22T11:00:38-04:00") }
  }
).sort({ createdAt: -1 }).limit(1);
```

Returns:

```json
{ "serialNumberOrName": "GM03387", "coinIn": 146749.5 }
```

---

## 📌 Example 2: All machines in D’Fastlime

Using script with `daysAgo = 7`:

```json
{
  "location": "D'Fastlime",
  "gameDayOffsetHour": 11,
  "cutoffUTC": "2025-08-20T15:00:00Z",
  "machines": [
    { "serialNumberOrName": "GM03387", "coinIn": 146749.5 },
    { "serialNumberOrName": "000000003389", "coinIn": 216075.1 },
    { "serialNumberOrName": "GMID2", "coinIn": 103992.25 }
  ]
}
```

---

## ✅ Key Rules for Developers

* Always anchor cutoffs to **gameDayOffset** in local Trinidad time (UTC-4).
* Use **`createdAt <= cutoff` + sort desc + limit 1** (not a range window).
* For display:

  * Prefer `serialNumber`
  * Fallback to `custom.name` if blank
* Return minimal fields unless more are explicitly requested (e.g., `coinOut`, `jackpot`).
