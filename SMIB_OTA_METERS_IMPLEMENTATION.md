# SMIB OTA & Meters Implementation Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 26th, 2025

## Overview

This document describes the complete implementation of SMIB (Smart Machine Interface Board) OTA firmware updates, meter data retrieval, and firmware version management.

---

## 1. OTA Firmware Update System

### How It Works

The OTA firmware update process follows a two-step protocol:

1. **Configure OTA URL**: Tell the SMIB where to download firmware files
2. **Send Update Command**: Initiate the download and installation

### MQTT Protocol

#### Step 1: Configure OTA URL

```json
{
  "typ": "cfg",
  "comp": "ota",
  "otaURL": "https://yourserver.com/api/firmwares/download/"
}
```

#### Step 2: Initiate Update

```json
{
  "typ": "ota_ud",
  "bin": "v1.0.1"
}
```

The SMIB will then:

- Request the firmware from: `{otaURL}{bin}` (e.g., `https://yourserver.com/api/firmwares/download/v1.0.1`)
- Download the `.bin` file
- Verify and install the firmware
- Automatically restart

### Implementation Details

**Files Modified:**

- `lib/services/mqttService.ts` - Added `configureOTAUrl()` and updated `sendOTAUpdateCommand()`
- `app/api/smib/ota-update/route.ts` - Updated to send both configuration and update commands
- `lib/hooks/data/useSmibOTA.ts` - Simplified to only require `firmwareVersion`
- `components/cabinets/smibManagement/OTAUpdateSection.tsx` - Updated UI to use firmware version

**New API Endpoints:**

- `GET /api/firmwares/download/[version]` - Serves `.bin` files by version number
- `GET /api/firmwares/[id]/download` - Serves `.bin` files by firmware ID

### Firmware Storage

Firmwares are stored in MongoDB using GridFS:

- **Collection**: `firmwares`
- **Binary Files**: GridFS bucket named `firmwares`
- **Fields**:
  - `product`: Firmware product name
  - `version`: Version number (e.g., "v1.0.1")
  - `versionDetails`: Description of changes
  - `fileName`: Original filename (e.g., "firmware_v1.0.1.bin")
  - `fileId`: GridFS file ID
  - `fileSize`: File size in bytes

### Upload Process

1. User uploads `.bin` file via SMIB Firmware tab
2. File is stored in GridFS
3. Metadata is saved in `firmwares` collection
4. Firmware becomes available in OTA Update section

### Download Process

When SMIB requests firmware:

1. SMIB sends HTTP GET to `/api/firmwares/download/{version}`
2. Server queries MongoDB for firmware with matching version
3. File is streamed from GridFS
4. Response includes proper headers for binary download

---

## 2. Meter Data Management

### Get Meters

Retrieves current meter values from the SMIB.

**MQTT Command:**

```json
{
  "typ": "cmd",
  "cmd": "met_get"
}
```

**Response:**
The SMIB will publish meter data to `sas/relay/config/{relayId}` with current meter values.

**Implementation:**

- MQTT Service: `requestMeterData(relayId)`
- API: `POST /api/smib/meters`
- Component: `MeterDataSection.tsx`

### Reset Meters

Resets meter values on non-SAS machines.

**MQTT Command:**

```json
{
  "typ": "cmd",
  "cmd": "met_reset"
}
```

**Important Notes:**

- Only works on non-SAS machines (comsMode !== 1)
- Requires confirmation dialog
- Activity is logged for audit purposes

**Implementation:**

- MQTT Service: `resetMeterData(relayId)`
- API: `POST /api/smib/reset-meters`
- Component: `MeterDataSection.tsx`

---

## 3. Firmware Version Query

### Get Current Firmware Version

Queries the SMIB for its current firmware information.

**MQTT Command:**

```json
{
  "typ": "cfg",
  "comp": "app"
}
```

**Response:**

```json
{
  "rly": "98f4ab0b1e30",
  "typ": "cfg",
  "comp": "app",
  "firmware": "cloudy",
  "version": "v0.0.1"
}
```

**Implementation:**

- MQTT Service: `getFirmwareVersion(relayId)`
- Response received on topic: `sas/relay/config/{relayId}`

---

## 4. Countdown Improvements

### Restart Countdown

After a successful SMIB restart:

- **Duration**: 15 seconds (changed from 5)
- **Design**: Simple, modern white overlay with orange text
- **Behavior**: Automatically refreshes all SMIB data when countdown reaches 0

**Visual Design:**

- Clean white background with subtle backdrop blur
- Orange countdown number (text-6xl)
- Simple, readable typography
- No excessive animations or gradients

---

## 5. Removed Features

### Search & Recovery Section

**Removed:**

- `components/cabinets/smibManagement/SearchRecoverySection.tsx`
- `lib/hooks/data/useSmibSearch.ts`
- `app/api/smib/search/route.ts`

**Reason:** The "Select SMIB Device" dropdown at the top of the SMIB Management tab already provides this functionality, making the search section redundant.

---

## 6. MQTT Service Methods

### OTA Methods

```typescript
// Configure where the SMIB should download firmwares from
await mqttService.configureOTAUrl(relayId, otaURL);

// Tell the SMIB which firmware version to download and install
await mqttService.sendOTAUpdateCommand(relayId, firmwareVersion);
```

### Meter Methods

```typescript
// Request current meter values
await mqttService.requestMeterData(relayId);

// Reset meters (non-SAS only)
await mqttService.resetMeterData(relayId);
```

### Version Query

```typescript
// Get firmware version information
await mqttService.getFirmwareVersion(relayId);
```

### Restart

```typescript
// Restart the SMIB
await mqttService.restartSmib(relayId);
```

---

## 7. API Endpoints Summary

### Firmware Management

- `GET /api/firmwares` - List all firmwares
- `POST /api/firmwares` - Upload new firmware
- `GET /api/firmwares/[id]/download` - Download by firmware ID
- `GET /api/firmwares/download/[version]` - Download by version (used by SMIBs)

### SMIB Operations

- `POST /api/smib/ota-update` - Initiate OTA firmware update
- `POST /api/smib/meters` - Request meter data
- `POST /api/smib/reset-meters` - Reset meters
- `POST /api/smib/restart` - Restart SMIB

### Location-Wide Operations

- `POST /api/locations/[locationId]/smib-ota` - Batch OTA updates
- `POST /api/locations/[locationId]/smib-meters` - Batch meter requests
- `POST /api/locations/[locationId]/smib-restart` - Batch restarts

---

## 8. Security Considerations

### Firmware Downloads

- Only serves firmwares that are not marked as deleted
- Includes cache-control headers to prevent stale downloads
- Logs all download requests

### OTA Updates

- Requires user authentication
- Validates SMIB exists in database
- Logs all update initiations with user info

### Meter Operations

- Reset only allowed on non-SAS machines
- All operations are logged for audit trail
- Requires proper user permissions

---

## 9. Testing OTA Updates

### Prerequisites

1. Firmware file uploaded via SMIB Firmware tab
2. SMIB device online and connected to MQTT
3. User has appropriate permissions

### Steps

1. Navigate to SMIB Management tab
2. Select SMIB from dropdown
3. Scroll to "OTA Firmware Update" section
4. Select firmware version from dropdown
5. Click "Initiate OTA Update"
6. Confirm in dialog
7. Monitor MQTT logs for confirmation
8. SMIB will download, install, and restart automatically

### Expected MQTT Messages

```
📡 [MQTT] Configuring OTA URL for {relayId}
✅ OTA URL configured for sas/relay/{relayId}
📡 [MQTT] Sending OTA update command to {relayId}
✅ OTA command sent to sas/relay/{relayId}
```

### SMIB Behavior

1. Receives OTA configuration
2. Receives update command
3. Downloads firmware from configured URL
4. Verifies firmware integrity
5. Installs firmware
6. Automatically restarts with new firmware

---

## 10. Troubleshooting

### OTA Update Fails

- **Check**: SMIB is online and connected to MQTT
- **Check**: Firmware file exists and version matches
- **Check**: Network connectivity between SMIB and server
- **Check**: MQTT broker is running
- **Logs**: Check browser console and server logs

### Meter Commands Not Working

- **Check**: SMIB is online
- **Check**: SMIB supports meter commands (firmware version)
- **Check**: For reset: Ensure machine is non-SAS (comsMode !== 1)

### Firmware Download 404

- **Check**: Version string matches exactly (case-sensitive)
- **Check**: Firmware not marked as deleted in database
- **Check**: GridFS file exists

---

## 11. Future Enhancements

Potential improvements:

- Progress tracking for OTA updates
- Firmware download retry logic
- Batch firmware updates with progress dashboard
- Firmware version comparison/compatibility checks
- Automatic rollback on failed updates
- Scheduled firmware updates
- Firmware signature verification

---

## Summary

The SMIB OTA and Meters implementation provides:
✅ Complete OTA firmware update workflow  
✅ Firmware management via MongoDB GridFS  
✅ Meter data retrieval and reset  
✅ Firmware version querying  
✅ Comprehensive logging and audit trail  
✅ Clean, modern UI with improved countdown  
✅ Proper MQTT protocol implementation

All features follow the official SMIB MQTT protocol documentation and adhere to the project's engineering guidelines.
