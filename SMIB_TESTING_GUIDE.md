# SMIB Management Features - Testing Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Date:** October 26th, 2025  
**Purpose:** Step-by-step testing instructions for new SMIB management features

---

## Where to Access the Features

### Primary Location

**Page:** Cabinets Page → SMIB Management Tab

**Navigation:**

1. Go to `/cabinets` page
2. Click on any cabinet to open details
3. Select the **"SMIB Management"** tab
4. You'll see all the new features below the configuration sections

---

## Feature 1: SMIB Search & Recovery

### Location

**Section:** "SMIB Search & Recovery" card (always visible at top of Operations section)

### How to Test

#### Test 1: Exact Match Search

1. Enter a complete SMIB relay ID in the search box (e.g., `78421c1bf944`)
2. Press Enter or click "Search" button
3. **Expected:**
   - One result with 100% match score (green badge)
   - Shows "Exact Match" label
   - Displays machine details (serial, game)
   - Shows online/offline status

#### Test 2: Partial Match Search

1. Enter partial SMIB ID (e.g., `7842`)
2. Press Enter or click "Search"
3. **Expected:**
   - Multiple results ranked by match score
   - Color-coded badges (green=80%+, yellow=60%+, orange=<60%)
   - Results sorted by match score (highest first)

#### Test 3: No Results

1. Enter non-existent ID (e.g., `ZZZZZ`)
2. Press Enter
3. **Expected:**
   - "No SMIBs found matching..." message

#### Test 4: Select SMIB from Search

1. Search for a SMIB
2. Click "Select" button on a result
3. **Expected:**
   - SMIB loads in the management tab
   - URL updates with `?smib={relayId}`
   - Configuration sections populate
   - Operations sections become available

#### Test 5: Restart for Confirmation

1. Search for a SMIB
2. Click "Restart" button on a result
3. **Expected:**
   - Toast notification: "Restart command sent successfully"
   - Check server logs for MQTT restart command
   - Check Activity Log for restart entry

---

## Feature 2: SMIB Restart

### Location

**Section:** "SMIB Restart" card (left column, below Search section)

### How to Test

#### Test 1: Restart Online SMIB

1. Select a SMIB from dropdown
2. Wait for it to show "SMIB Online"
3. Click "Restart SMIB" button
4. **Expected:**
   - Confirmation dialog appears
   - Shows warning about temporary disconnection
   - Dialog shows the relayId

5. Click "Restart SMIB" in dialog
6. **Expected:**
   - Toast: "Restart command sent successfully"
   - Button shows loading spinner briefly
   - Check server logs for: `📡 [MQTT] Sending restart command to {relayId}`
   - Check Activity Log for restart entry

#### Test 2: Restart Offline SMIB

1. Select an offline SMIB
2. Click "Restart SMIB" button
3. **Expected:**
   - Amber warning shows "SMIB is offline"
   - Restart still allowed (command sent anyway)
   - Toast confirmation

#### Test 3: Cancel Restart

1. Click "Restart SMIB"
2. Click "Cancel" in dialog
3. **Expected:**
   - Dialog closes
   - No restart command sent
   - No toast notification

#### Test 4: No SMIB Selected

1. Don't select any SMIB
2. **Expected:**
   - Button is disabled
   - Gray text shows "Select a SMIB to enable restart functionality"

---

## Feature 3: Get Meters & Reset Meters

### Location

**Section:** "Meter Data" card (left column, below Restart)

### How to Test

#### Test 1: Get Meters (Online SMIB)

1. Select an online SMIB
2. Click "Get Meters" button
3. **Expected:**
   - Toast: "Meter request sent successfully"
   - Button shows loading spinner briefly
   - Check server logs for: `📡 [MQTT] Requesting meter data from {relayId}`
   - SMIB should respond via MQTT (check for meter data in logs)

#### Test 2: Get Meters (Offline SMIB)

1. Select an offline SMIB
2. Click "Get Meters"
3. **Expected:**
   - Command still sent
   - Amber warning shows "SMIB is offline"
   - Toast confirmation
   - No response expected (SMIB offline)

#### Test 3: Reset Meters (Non-SAS Machine)

**Prerequisites:** Select a SMIB with `comsMode = 1` or `2` (Non-SAS or IGT)

1. Click "Reset Meters" button (red button)
2. **Expected:**
   - Confirmation dialog appears
   - Shows warning: "This action cannot be undone!"
   - Explains meter memory will be cleared

3. Click "Reset Meters" in dialog
4. **Expected:**
   - Toast: "Meters reset successfully"
   - Check server logs for: `📡 [MQTT] Sending reset meters command`
   - Check Activity Log for reset entry with comsMode info

#### Test 4: Reset Meters (SAS Machine - Disabled)

**Prerequisites:** Select a SMIB with `comsMode = 0` (SAS)

1. **Expected:**
   - "Reset Meters" button is replaced with disabled gray box
   - Shows text: "Reset Meters (Non-SAS only)"
   - Tooltip explains restriction
   - Cannot click/activate

#### Test 5: Backend Validation (SAS Protection)

**API Test:**

1. Try sending POST to `/api/smib/reset-meters` with SAS machine relayId
2. **Expected:**
   - 400 error response
   - Error message: "Reset meters is only available for non-SAS machines"

---

## Feature 4: OTA Firmware Updates

### Location

**Section:** "OTA Firmware Update" card (right column)

### How to Test

#### Test 1: Load Firmware List

1. Select any SMIB
2. OTA section loads automatically
3. Click firmware dropdown
4. **Expected:**
   - Dropdown shows available firmware versions
   - Format: "Product v1.2.3 - Details"
   - Loads from `/api/firmwares` endpoint

#### Test 2: Initiate OTA Update (Online SMIB)

1. Select an online SMIB
2. Choose firmware from dropdown
3. Click "Initiate OTA Update" button
4. **Expected:**
   - Confirmation dialog appears
   - Shows firmware details (product, version)
   - Warns about download time and auto-restart

5. Click "Start Update"
6. **Expected:**
   - Toast: "OTA update initiated successfully"
   - Check server logs for: `📡 [MQTT] Sending OTA update command`
   - Check Activity Log for OTA update entry with firmware version

#### Test 3: OTA Update (Offline SMIB - Disabled)

1. Select an offline SMIB
2. **Expected:**
   - "Initiate OTA Update" button is disabled
   - Amber warning shows "SMIB must be online for OTA updates"
   - Cannot click button

#### Test 4: No Firmware Selected

1. Don't select any firmware
2. **Expected:**
   - "Initiate OTA Update" button is disabled
   - No action possible

#### Test 5: Cancel OTA Update

1. Select firmware
2. Click "Initiate OTA Update"
3. Click "Cancel" in dialog
4. **Expected:**
   - Dialog closes
   - No OTA command sent
   - Firmware selection remains

---

## Backend API Testing (Postman/cURL)

### API Endpoints to Test

#### 1. Single SMIB Restart

```bash
POST /api/smib/restart
Body: { "relayId": "78421c1bf944" }
Expected: { "success": true, "message": "Restart command sent successfully" }
```

#### 2. Single SMIB Get Meters

```bash
POST /api/smib/meters
Body: { "relayId": "78421c1bf944" }
Expected: { "success": true, "message": "Meter request sent successfully" }
```

#### 3. Single SMIB Reset Meters (Non-SAS)

```bash
POST /api/smib/reset-meters
Body: { "relayId": "78421c1bf944" }
Expected: { "success": true } OR { "success": false, "error": "only available for non-SAS" }
```

#### 4. Single SMIB OTA Update

```bash
POST /api/smib/ota-update
Body: {
  "relayId": "78421c1bf944",
  "firmwareUrl": "http://example.com/firmware.bin",
  "firmwareId": "507f1f77bcf86cd799439011",
  "firmwareVersion": "1.2.3"
}
Expected: { "success": true, "message": "OTA update command sent successfully" }
```

#### 5. SMIB Search

```bash
GET /api/smib/search?query=7842
Expected: {
  "success": true,
  "results": [...],
  "count": 3
}
```

#### 6. Location-wide Restart

```bash
POST /api/locations/{locationId}/smib-restart
Body: {}
Expected: {
  "success": true,
  "results": { "total": 10, "successful": 10, "failed": 0 }
}
```

#### 7. Location-wide Get Meters

```bash
POST /api/locations/{locationId}/smib-meters
Body: {}
Expected: { "success": true, "results": {...} }
```

#### 8. Location-wide OTA Update

```bash
POST /api/locations/{locationId}/smib-ota
Body: {
  "firmwareUrl": "http://example.com/firmware.bin",
  "firmwareVersion": "1.2.3"
}
Expected: { "success": true, "results": {...} }
```

#### 9. Get Location SMIB Configs

```bash
GET /api/locations/{locationId}/smib-configs
Expected: {
  "success": true,
  "configs": [...],
  "summary": { "total": 10, "online": 7, "offline": 3 }
}
```

---

## Verification Checklist

### Server Logs to Monitor

When testing, watch the server console for these log messages:

#### MQTT Service Logs

- `📡 [MQTT] Sending OTA update command to {relayId}`
- `📡 [MQTT] Requesting meter data from {relayId}`
- `📡 [MQTT] Sending reset meters command to {relayId}`
- `📡 [MQTT] Sending restart command to {relayId}`
- `✅ Config request sent for {component} to sas/relay/{relayId}`

#### API Logs

- `🔧 SMIB Config Update Request:`
- `📡 Sending SMIB config via MQTT to: {relayId}`

### Database Verification

#### Check Activity Logs Collection

```javascript
db.activitylogs
  .find({
    'metadata.relayId': '78421c1bf944',
  })
  .sort({ createdAt: -1 })
  .limit(10);
```

**Expected entries:**

- "Restart command sent to SMIB..."
- "Meter data request sent to SMIB..."
- "Meters reset command sent to SMIB..."
- "OTA firmware update initiated for SMIB..."

#### Check Machines Collection

```javascript
db.machines.findOne({
  $or: [{ relayId: '78421c1bf944' }, { smibBoard: '78421c1bf944' }],
});
```

**Verify:**

- `smibConfig.coms.comsMode` (for reset meters validation)
- `updatedAt` timestamp changes after updates

---

## UI Behavior Verification

### Visual Elements to Check

#### 1. Search Results

- ✅ Match score badges (green/yellow/orange)
- ✅ Online status indicator (green dot + "Online")
- ✅ Offline status (no indicator)
- ✅ Serial number and game name display
- ✅ "Select" button (green)
- ✅ "Restart" button (orange outline)

#### 2. Restart Section

- ✅ "Restart SMIB" button (orange)
- ✅ Loading spinner when restarting
- ✅ Offline warning when SMIB offline
- ✅ Disabled state when no SMIB selected

#### 3. Meter Data Section

- ✅ "Get Meters" button (blue)
- ✅ "Reset Meters" button (red) - only for non-SAS
- ✅ Disabled gray box for SAS machines
- ✅ Info card about MQTT response time
- ✅ Loading spinners on both buttons

#### 4. OTA Update Section

- ✅ Firmware dropdown populated
- ✅ "Initiate OTA Update" button (purple)
- ✅ Disabled when offline
- ✅ Disabled when no firmware selected
- ✅ Info card about update process

### Responsive Design Testing

- ✅ Mobile: Single column layout
- ✅ Tablet: 2-column grid for operations
- ✅ Desktop: Full width with proper spacing

---

## Network Traffic Verification (Browser DevTools)

### 1. Open DevTools Network Tab

### 2. Test Each Feature and Watch for:

#### Search SMIB

```
GET /api/smib/search?query=7842
Status: 200
Response: { success: true, results: [...] }
```

#### Restart SMIB

```
POST /api/smib/restart
Body: { "relayId": "..." }
Status: 200
Response: { success: true, message: "Restart command sent successfully" }
```

#### Get Meters

```
POST /api/smib/meters
Body: { "relayId": "..." }
Status: 200
Response: { success: true }
```

#### Reset Meters

```
POST /api/smib/reset-meters
Body: { "relayId": "..." }
Status: 200 (non-SAS) or 400 (SAS)
```

#### OTA Update

```
POST /api/smib/ota-update
Body: { "relayId": "...", "firmwareUrl": "...", "firmwareId": "..." }
Status: 200
Response: { success: true }
```

---

## MQTT Broker Verification

### Using MQTT Explorer or mqttx

#### 1. Connect to MQTT Broker

- Host: `rabbit.sbox.site`
- Port: `1883`
- Protocol: `mqtt://`

#### 2. Subscribe to Topics

```
sas/relay/#      (all relay commands)
smib/config      (config responses)
smib/meters      (meter responses - future)
smib/ota         (OTA status - future)
smib/restart     (restart confirmations - future)
```

#### 3. Trigger Actions and Watch for Messages

**Restart Command:**

```
Topic: sas/relay/78421c1bf944
Payload: { "typ": "rst" }
```

**Get Meters Command:**

```
Topic: sas/relay/78421c1bf944
Payload: { "typ": "cmd", "cmd": "get_meters" }
```

**Reset Meters Command:**

```
Topic: sas/relay/78421c1bf944
Payload: { "typ": "cmd", "cmd": "reset_meters" }
```

**OTA Update Command:**

```
Topic: sas/relay/78421c1bf944
Payload: { "typ": "cmd", "cmd": "ota", "url": "http://..." }
```

---

## Quick Testing Scenarios

### Scenario 1: Complete Restart Flow

1. Navigate to Cabinets → Select a cabinet → SMIB Management tab
2. Select a SMIB from dropdown (wait for config to load)
3. Scroll down to "SMIB Restart" section
4. Click "Restart SMIB"
5. Confirm in dialog
6. ✅ Verify: Toast notification, server logs, activity log entry

### Scenario 2: Search and Select Unknown SMIB

1. Go to SMIB Management tab (no SMIB selected)
2. Type partial ID in search box (e.g., "784")
3. Press Enter
4. Click "Select" on best match
5. ✅ Verify: SMIB loads, URL updates, config sections populate

### Scenario 3: OTA Update Flow

1. Select online SMIB
2. Scroll to "OTA Firmware Update"
3. Open firmware dropdown
4. Select a firmware version
5. Click "Initiate OTA Update"
6. Confirm in dialog
7. ✅ Verify: Toast, server logs show MQTT command, activity log entry

### Scenario 4: Get Meters from Multiple SMIBs

1. Note the location ID of current cabinet
2. Open Postman/Browser console
3. Send: `POST /api/locations/{locationId}/smib-meters`
4. ✅ Verify: Response shows batch results, server logs show multiple meter requests

### Scenario 5: Reset Meters Validation

1. Select SAS machine (comsMode = 0)
2. ✅ Verify: Reset button shows as disabled gray box with tooltip
3. Select Non-SAS machine (comsMode = 1 or 2)
4. ✅ Verify: Reset button is red and clickable

---

## Error Scenarios to Test

### 1. Invalid RelayId

- Send API request with non-existent relayId
- **Expected:** 404 error "Machine not found"

### 2. Empty Search Query

- Search with empty string
- **Expected:** No search performed, results cleared

### 3. MQTT Connection Failure

- Disconnect MQTT broker
- Try any SMIB operation
- **Expected:** 500 error "Failed to send command to SMIB"

### 4. Reset Meters on SAS Machine

- Send POST to `/api/smib/reset-meters` with SAS machine
- **Expected:** 400 error "only available for non-SAS machines"

### 5. OTA Update Without Firmware URL

- Send POST to `/api/smib/ota-update` without firmwareUrl
- **Expected:** 400 error "RelayId and firmwareUrl are required"

---

## Activity Log Verification

### Check Activity Logs in Database

Navigate to Activity Logs (if UI available) or query MongoDB:

```javascript
db.activitylogs
  .find({
    action: { $in: ['update', 'read'] },
    'metadata.relayId': { $exists: true },
  })
  .sort({ createdAt: -1 });
```

**Expected Log Entries:**

#### Restart Operation

```json
{
  "action": "update",
  "details": "Restart command sent to SMIB 78421c1bf944 for machine ABC123",
  "ipAddress": "192.168.1.100",
  "metadata": {
    "relayId": "78421c1bf944",
    "machineId": "...",
    "restartedAt": "2025-10-26T..."
  }
}
```

#### Meter Request

```json
{
  "action": "read",
  "details": "Meter data request sent to SMIB 78421c1bf944...",
  "metadata": {
    "relayId": "78421c1bf944",
    "requestedAt": "2025-10-26T..."
  }
}
```

#### OTA Update

```json
{
  "action": "update",
  "details": "OTA firmware update initiated for SMIB 78421c1bf944... to version 1.2.3",
  "metadata": {
    "relayId": "78421c1bf944",
    "firmwareUrl": "...",
    "firmwareVersion": "1.2.3"
  }
}
```

---

## Performance Testing

### Location-Wide Operations (Batch Processing)

1. **Find location with 20+ machines**
2. Send location-wide operation:
   ```bash
   POST /api/locations/{locationId}/smib-restart
   ```
3. **Watch server logs:**
   - Should see MQTT commands in batches of 10
   - Check timing: batches should process in parallel
   - Total time should be ~2-3 seconds per batch

4. **Verify response:**
   ```json
   {
     "success": true,
     "results": {
       "total": 25,
       "successful": 23,
       "failed": 2,
       "errors": [...]
     }
   }
   ```

---

## Browser Console Debugging

### Enable Verbose Logging

All SMIB operations log to browser console. Look for:

- `🔗 [SMIB MANAGEMENT] Connecting to config stream`
- `📡 [MQTT] Requesting ... config for ...`
- `✅ Config request sent`
- Search results logged with match scores

### React DevTools

- Check component state for loading flags
- Verify hook states (isRestarting, isRequestingMeters, etc.)
- Watch for re-renders during operations

---

## Success Criteria

✅ **All features accessible from SMIB Management tab**  
✅ **Toast notifications for all operations**  
✅ **Confirmation dialogs for destructive actions**  
✅ **Loading states prevent duplicate operations**  
✅ **Server logs show MQTT commands being sent**  
✅ **Activity logs record all operations**  
✅ **Validation prevents invalid operations (SAS meter reset)**  
✅ **Online/offline status affects button availability**  
✅ **Search returns accurate match scores**  
✅ **Responsive design works on all screen sizes**

---

## Common Issues & Solutions

### Issue: "SMIB shows online but is actually offline"

**Solution:** Fixed in recent commit - SSE heartbeats no longer mark SMIB as online, only actual config_update messages do

### Issue: "Reset Meters button visible on SAS machine"

**Solution:** Check `machineData.smibConfig.coms.comsMode` - should be disabled for mode 0

### Issue: "OTA update not working"

**Solution:** Ensure SMIB is online and firmwareUrl is accessible

### Issue: "Search returns no results for valid ID"

**Solution:** Check if machine has relayId or smibBoard field populated in database

---

## Testing Complete When...

- ✅ All 5 UI features visible and functional
- ✅ All confirmation dialogs work correctly
- ✅ All toast notifications appear
- ✅ Server logs show MQTT commands
- ✅ Activity logs record operations
- ✅ Validation prevents invalid operations
- ✅ Search returns accurate results
- ✅ Responsive design works on mobile/tablet/desktop

**Ready for Production Testing!** 🚀
