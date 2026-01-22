# MQTT Integration - Frontend

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2025

## Quick Search Guide

Use **Ctrl+F** to find these key topics:

- **sse connection** - How Server-Sent Events work for live updates
- **config stream** - How configuration streaming works
- **smib hook** - The useSmibConfiguration hook
- **live updates** - Real-time SMIB configuration updates
- **config request** - How to request configuration from SMIB
- **config publish** - How to publish configuration updates
- **connection state** - Managing SSE connection state
- **form management** - Managing SMIB configuration forms

## Overview

The frontend MQTT integration provides real-time communication with SMIB devices through Server-Sent Events (SSE). It enables live configuration updates, real-time data synchronization, and interactive SMIB management without page refreshes.

### Key Components

- **SMIB Configuration Hook** (`lib/hooks/data/useSmibConfiguration.ts`)
- **SMIB Management Tab** (`components/CMS/cabinets/CabinetsSMIBManagementTab.tsx`)
- **Cabinet Details Page** (`app/cabinets/[slug]/page.tsx`)
- **SSE Connection Management** (EventSource API)
- **Configuration Forms** (Network, MQTT, COMS with updatedAt tracking)
- **Operations Sections** (Restart, Meters, OTA Updates)

### Architecture Overview

```
┌──────────────────┐
│  Cabinet Details │  ← User Interface
│      Page        │
└─────────┬────────┘
          │
          │ (1) Establishes SSE Connection
          ▼
┌──────────────────┐
│  EventSource     │  ← /api/mqtt/config/subscribe?relayId=...
│  Connection      │
└─────────┬────────┘
          │
          │ (2) Receives Live Updates
          ▼
┌──────────────────┐
│ useSmibConfiguration │ ← State Management
│      Hook        │
└─────────┬────────┘
          │
          │ (3) Updates Form Data
          ▼
┌──────────────────┐
│   Form State     │  ← React State
│   (formData)     │
└──────────────────┘
```

## useSmibConfiguration Hook

### Purpose

The `useSmibConfiguration` hook centralizes all SMIB configuration management logic, including:

- SSE connection lifecycle management
- Configuration data fetching and caching
- Form state management with validation
- Live update processing from MQTT
- Configuration publishing to SMIB devices

### File Location

**File:** `lib/hooks/data/useSmibConfiguration.ts`

### Hook Interface

```typescript
type UseSmibConfigurationReturn = {
  // UI State
  smibConfigExpanded: boolean;
  isEditMode: boolean;
  communicationMode: string;
  firmwareVersion: string;

  // Connection State
  isConnectedToMqtt: boolean;
  isLoadingMqttConfig: boolean;
  hasReceivedRealSmibData: boolean;
  isManuallyFetching: boolean;
  hasConfigBeenFetched: boolean;

  // Configuration Data
  mqttConfigData: MqttConfigData | null;
  formData: FormData;
  originalData: FormData;

  // UI Actions
  toggleSmibConfig: () => void;
  setEditMode: (edit: boolean) => void;
  updateFormData: (field: string, value: string) => void;
  resetFormData: () => void;

  // Configuration Management
  setCommunicationModeFromData: (data: CabinetDetail) => void;
  setFirmwareVersionFromData: (data: CabinetDetail) => void;
  saveConfiguration: (cabinetId: string, machineControl?: string) => Promise<boolean>;

  // Database Operations
  fetchMqttConfig: (cabinetId: string) => Promise<void>;
  fetchSmibConfiguration: (relayId: string) => Promise<void>;

  // SSE Connection Management
  connectToConfigStream: (relayId: string) => void;
  disconnectFromConfigStream: () => void;

  // MQTT Operations
  requestLiveConfig: (relayId: string, component: string) => Promise<void>;
  publishConfigUpdate: (relayId: string, config: object) => Promise<void>;

  // Component-Specific Updates
  updateNetworkConfig: (relayId: string, networkData: {...}) => Promise<void>;
  updateMqttConfig: (relayId: string, mqttData: {...}) => Promise<void>;
  updateComsConfig: (relayId: string, comsData: {...}) => Promise<void>;
  updateOtaConfig: (relayId: string, otaData: {...}) => Promise<void>;
  updateAppConfig: (relayId: string, appData: {...}) => Promise<void>;
};
```

### Form Data Structure

```typescript
type FormData = {
  // Network Configuration
  networkSSID: string;
  networkPassword: string;
  networkChannel: string;

  // Communication Configuration
  communicationMode: string;
  comsMode: string;
  comsAddr: string;
  comsRateMs: string;
  comsRTE: string;
  comsGPC: string;

  // Firmware
  firmwareVersion: string;

  // MQTT Configuration
  mqttHost: string;
  mqttPort: string;
  mqttTLS: string;
  mqttQOS: string;
  mqttIdleTimeout: string;
  mqttUsername: string;
  mqttPassword: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttURI: string;
};
```

## SSE Connection Management

### Establishing SSE Connection

#### When Connection is Established

The SSE connection is established when:

1. Cabinet details page loads
2. Valid relayId is available
3. SMIB configuration section is accessed

#### Connection Lifecycle

```typescript
// 1. Establish connection
connectToConfigStream(relayId);
// - Creates EventSource to /api/mqtt/config/subscribe
// - Sets up message handlers
// - Starts heartbeat monitoring

// 2. During connection
// - Receives config_update messages
// - Receives heartbeat messages (every 5s)
// - Updates form data in real-time

// 3. Disconnect
disconnectFromConfigStream();
// - Closes EventSource
// - Clears callbacks
// - Resets connection state
```

### SSE Message Types

#### 1. Connected Message

Sent immediately upon SSE connection establishment.

```json
{
  "type": "connected",
  "relayId": "e831cdfa8384",
  "timestamp": "2025-10-26T10:30:00.000Z",
  "message": "Connected to MQTT config stream"
}
```

#### 2. Config Update Message

Sent when SMIB responds with configuration data.

```json
{
  "type": "config_update",
  "relayId": "e831cdfa8384",
  "component": "mqtt",
  "data": {
    "rly": "e831cdfa8384",
    "typ": "cfg",
    "comp": "mqtt",
    "mqttSecure": 0,
    "mqttQOS": 2,
    "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
    "mqttSubTopic": "sas/relay/",
    "mqttPubTopic": "sas/gy/server",
    "mqttCfgTopic": "smib/config",
    "mqttIdleTimeS": 30
  },
  "timestamp": "2025-10-26T10:30:01.000Z"
}
```

#### 3. Heartbeat Message

Sent every 5 seconds to maintain connection.

```json
{
  "type": "heartbeat",
  "relayId": "e831cdfa8384",
  "timestamp": "2025-10-26T10:30:05.000Z"
}
```

### SSE Connection Code

```typescript
const connectToConfigStream = useCallback((relayId: string) => {
  // Create EventSource connection
  const eventSource = new EventSource(
    `/api/mqtt/config/subscribe?relayId=${relayId}`
  );

  // Handle messages
  eventSource.onmessage = event => {
    const message = JSON.parse(event.data);

    if (message.type === 'heartbeat') {
      // Update heartbeat timestamp
      lastHeartbeatRef.current = Date.now();
      return;
    }

    if (message.type === 'connected') {
      // SSE connection established
      setIsConnectedToMqtt(true);
      return;
    }

    if (message.type === 'config_update' && message.data) {
      // Process configuration update
      const configData = message.data;

      // Check if this is real SMIB data
      const hasRealData =
        (configData.comp === 'net' && configData.netStaSSID) ||
        (configData.comp === 'coms' && configData.comsMode !== undefined) ||
        (configData.comp === 'mqtt' && configData.mqttURI);

      if (hasRealData) {
        setHasReceivedRealSmibData(true);
        updateFormDataFromMessage(configData);
      }
    }
  };

  // Handle errors
  eventSource.onerror = error => {
    console.error('❌ [HOOK] EventSource error:', error);
    setIsConnectedToMqtt(false);
  };

  // Store reference
  eventSourceRef.current = eventSource;
  currentRelayIdRef.current = relayId;
}, []);
```

## Configuration Request Flow

### Requesting Live Configuration

#### Component Types

- **mqtt** - MQTT broker and topic configuration
- **net** - Network (WiFi) configuration
- **coms** - Communication mode and protocol settings
- **ota** - Over-the-Air firmware update settings
- **app** - Application-specific configuration

#### Request Implementation

```typescript
const requestLiveConfig = async (relayId: string, component: string) => {
  const response = await fetch('/api/mqtt/config/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relayId, component }),
  });

  if (!response.ok) {
    throw new Error('Failed to request live config');
  }

  // Response comes via SSE, not this response
  return await response.json();
};
```

#### Request Flow Diagram

```
Frontend → /api/mqtt/config/request → MQTT Service → MQTT Broker → SMIB Device
   ↑                                                                      ↓
   │                                                            (publishes response)
   │                                                                      ↓
   │← SSE Stream ← /api/mqtt/config/subscribe ← MQTT Service ← MQTT Broker
```

## Configuration Update Flow

### Publishing Configuration Updates

#### Update Components

Configuration can be updated for different components:

- **Network Config**: WiFi SSID, password, channel
- **MQTT Config**: Broker URI, topics, QoS, TLS settings
- **COMS Config**: Communication mode, rate, protocol
- **OTA Config**: Firmware update URL
- **App Config**: Application-specific settings

#### Update Implementation

```typescript
const updateMqttConfig = async (
  relayId: string,
  mqttData: {
    mqttSecure?: number;
    mqttQOS?: number;
    mqttURI?: string;
    mqttSubTopic?: string;
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttIdleTimeS?: number;
  }
) => {
  const config = {
    typ: 'cfg',
    comp: 'mqtt',
    ...mqttData,
  };

  await publishConfigUpdate(relayId, config);
};

const publishConfigUpdate = async (relayId: string, config: object) => {
  const response = await fetch('/api/mqtt/config/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relayId, config }),
  });

  if (!response.ok) {
    throw new Error('Failed to publish config update');
  }

  return await response.json();
};
```

## Form Management

### Initial Data Loading

```typescript
// 1. Load from database (fallback)
await fetchMqttConfig(cabinetId);

// 2. Connect to SSE stream for live updates
connectToConfigStream(relayId);

// 3. Request live config from SMIB
await Promise.all([
  requestLiveConfig(relayId, 'net'),
  requestLiveConfig(relayId, 'mqtt'),
  requestLiveConfig(relayId, 'coms'),
  requestLiveConfig(relayId, 'ota'),
  requestLiveConfig(relayId, 'app'),
]);
```

### Form Data Updates

#### From Database

```typescript
const fetchMqttConfig = async (cabinetId: string) => {
  setIsLoadingMqttConfig(true);

  const response = await fetch(`/api/mqtt/config?cabinetId=${cabinetId}`);
  const data = await response.json();

  if (data.success) {
    // Update form with database values
    setFormData(prev => ({
      ...prev,
      networkSSID: data.data.networkSSID || 'No Value Provided',
      mqttHost: data.data.mqttHost || 'No Value Provided',
      // ... other fields
    }));
    setMqttConfigData(data.data);
  }

  setIsLoadingMqttConfig(false);
};
```

#### From Live SMIB Response

```typescript
// In SSE message handler
if (message.type === 'config_update') {
  const configData = message.data;

  if (configData.comp === 'mqtt') {
    setFormData(prev => ({
      ...prev,
      mqttPubTopic: configData.mqttPubTopic || prev.mqttPubTopic,
      mqttCfgTopic: configData.mqttCfgTopic || prev.mqttCfgTopic,
      mqttURI: configData.mqttURI || prev.mqttURI,
      // ... other MQTT fields
    }));
  }

  if (configData.comp === 'net') {
    setFormData(prev => ({
      ...prev,
      networkSSID: configData.netStaSSID || prev.networkSSID,
      networkPassword: configData.netStaPwd || prev.networkPassword,
      networkChannel: configData.netStaChan?.toString() || prev.networkChannel,
    }));
  }

  if (configData.comp === 'coms') {
    setFormData(prev => ({
      ...prev,
      comsMode: configData.comsMode?.toString() || prev.comsMode,
      comsAddr: configData.comsAddr?.toString() || prev.comsAddr,
      comsRateMs: configData.comsRateMs?.toString() || prev.comsRateMs,
      comsRTE: configData.comsRTE?.toString() || prev.comsRTE,
      comsGPC: configData.comsGPC?.toString() || prev.comsGPC,
    }));
  }
}
```

### Saving Configuration

```typescript
const saveConfiguration = async (
  cabinetId: string,
  machineControl?: string
): Promise<boolean> => {
  try {
    // Build SMIB config object from form data
    const smibConfig: SmibConfig = {
      coms: {
        comsMode: parseInt(formData.comsMode) || 0,
        comsAddr: parseInt(formData.comsAddr) || 1,
        comsRateMs: parseInt(formData.comsRateMs) || 200,
        comsRTE: parseInt(formData.comsRTE) || 0,
        comsGPC: parseInt(formData.comsGPC) || 0,
      },
      net: {
        netMode: 0,
        netStaSSID: formData.networkSSID,
        netStaPwd: formData.networkPassword,
        netStaChan: parseInt(formData.networkChannel) || 1,
      },
      mqtt: {
        mqttSecure: parseInt(formData.mqttTLS) || 0,
        mqttQOS: parseInt(formData.mqttQOS) || 2,
        mqttURI: formData.mqttURI,
        mqttIdleTimeS: parseInt(formData.mqttIdleTimeout) || 30,
      },
    };

    // Send to API
    const response = await fetch(`/api/cabinets/${cabinetId}/smib-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smibConfig, machineControl }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error saving configuration:', error);
    return false;
  }
};
```

## Connection State Management

### SSE Connection States

#### 1. Disconnected

- Initial state
- SSE connection not established
- No live updates available

#### 2. Connected

- SSE connection established
- Receiving heartbeat messages
- Ready to receive config updates

#### 3. Received Real Data

- Connected AND received actual SMIB data
- SMIB device is online and responsive
- Configuration data is current

### Connection Indicators

```typescript
const [isConnectedToMqtt, setIsConnectedToMqtt] = useState(false);
const [hasReceivedRealSmibData, setHasReceivedRealSmibData] = useState(false);

// Connection indicator logic
if (!isConnectedToMqtt) {
  // Show: "Not connected to MQTT stream"
  // Status: Offline
} else if (isConnectedToMqtt && !hasReceivedRealSmibData) {
  // Show: "Waiting for SMIB response..."
  // Status: Connecting
} else {
  // Show: "Connected to SMIB"
  // Status: Online
}
```

### Heartbeat Monitoring

```typescript
// Heartbeat checking every 2 seconds
heartbeatCheckIntervalRef.current = setInterval(() => {
  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;

  // Consider disconnected if no heartbeat for 15 seconds
  if (timeSinceLastHeartbeat > 15000 && isConnectedToMqttRef.current) {
    console.warn('⚠️ [HOOK] No heartbeat for 15s - marking as disconnected');
    setIsConnectedToMqtt(false);
  }
}, 2000);
```

## Component Configuration

### Network Configuration

```typescript
const updateNetworkConfig = async (
  relayId: string,
  networkData: {
    netStaSSID?: string;
    netStaPwd?: string;
    netStaChan?: number;
  }
) => {
  const config = {
    typ: 'cfg',
    comp: 'net',
    netMode: 0, // WiFi Station mode
    ...networkData,
  };

  await publishConfigUpdate(relayId, config);
};
```

### MQTT Configuration

```typescript
const updateMqttConfig = async (
  relayId: string,
  mqttData: {
    mqttSecure?: number;
    mqttQOS?: number;
    mqttURI?: string;
    mqttSubTopic?: string;
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttIdleTimeS?: number;
  }
) => {
  const config = {
    typ: 'cfg',
    comp: 'mqtt',
    ...mqttData,
  };

  await publishConfigUpdate(relayId, config);
};
```

### COMS Configuration

```typescript
const updateComsConfig = async (
  relayId: string,
  comsData: {
    comsMode?: number;
    comsAddr?: number;
    comsRateMs?: number;
    comsRTE?: number;
    comsGPC?: number;
  }
) => {
  const config = {
    typ: 'cfg',
    comp: 'coms',
    ...comsData,
  };

  await publishConfigUpdate(relayId, config);
};
```

### OTA Configuration

```typescript
const updateOtaConfig = async (
  relayId: string,
  otaData: {
    otaURL?: string;
  }
) => {
  const config = {
    typ: 'cfg',
    comp: 'ota',
    ...otaData,
  };

  await publishConfigUpdate(relayId, config);
};
```

## Cabinet Details Page Integration

### Component Mount

```typescript
useEffect(() => {
  if (!cabinet || !relayId) return;

  // 1. Set initial form data from cabinet
  setCommunicationModeFromData(cabinet);
  setFirmwareVersionFromData(cabinet);

  // 2. Fetch database config as fallback
  fetchMqttConfig(cabinet._id);

  // 3. Connect to SSE stream
  connectToConfigStream(relayId);

  // 4. Request live config from SMIB
  Promise.all([
    requestLiveConfig(relayId, 'net'),
    requestLiveConfig(relayId, 'mqtt'),
    requestLiveConfig(relayId, 'coms'),
    requestLiveConfig(relayId, 'ota'),
    requestLiveConfig(relayId, 'app'),
  ]).catch(error => {
    console.error('Error requesting live configs:', error);
  });

  // 5. Cleanup on unmount
  return () => {
    disconnectFromConfigStream();
  };
}, [cabinet, relayId]);
```

### SMIB Configuration Display

```typescript
<div className="smib-configuration-section">
  {/* Connection Status */}
  <div className="connection-status">
    {isConnectedToMqtt && hasReceivedRealSmibData ? (
      <span className="text-green-500">● Connected to SMIB</span>
    ) : isConnectedToMqtt ? (
      <span className="text-yellow-500">● Waiting for SMIB...</span>
    ) : (
      <span className="text-red-500">● Not Connected</span>
    )}
  </div>

  {/* Configuration Forms */}
  <div className="config-forms">
    {/* Network Configuration */}
    <input
      value={formData.networkSSID}
      onChange={(e) => updateFormData('networkSSID', e.target.value)}
      disabled={!isEditMode}
    />

    {/* MQTT Configuration */}
    <input
      value={formData.mqttHost}
      onChange={(e) => updateFormData('mqttHost', e.target.value)}
      disabled={!isEditMode}
    />

    {/* Save Button */}
    <button onClick={() => saveConfiguration(cabinet._id)}>
      Save Configuration
    </button>
  </div>
</div>
```

## Error Handling

### SSE Connection Errors

```typescript
eventSource.onerror = error => {
  console.error('❌ [HOOK] EventSource error:', error);
  setIsConnectedToMqtt(false);

  // Toast notification
  toast.error('Lost connection to MQTT stream');

  // Attempt reconnection after delay
  setTimeout(() => {
    if (currentRelayIdRef.current) {
      connectToConfigStream(currentRelayIdRef.current);
    }
  }, 5000);
};
```

### Configuration Request Errors

```typescript
try {
  await requestLiveConfig(relayId, component);
} catch (error) {
  console.error('Error requesting live config:', error);
  toast.error(`Failed to request ${component} configuration`);
}
```

### Configuration Save Errors

```typescript
const success = await saveConfiguration(cabinetId, machineControl);

if (!success) {
  toast.error('Failed to save configuration');
} else {
  toast.success('Configuration saved successfully');
  setIsEditMode(false);
}
```

## Performance Considerations

### Connection Management

- **Single SSE Connection**: One EventSource per relayId
- **Automatic Cleanup**: Disconnects on component unmount
- **Heartbeat Monitoring**: Detects stale connections
- **Reconnection Logic**: Automatic reconnection on errors

### State Optimization

- **Ref-based State**: Uses refs for heartbeat and connection checks
- **Conditional Updates**: Only updates when real data received
- **Batched Requests**: Requests all components in parallel
- **Memoized Callbacks**: Prevents unnecessary re-renders

### Memory Management

- **Cleanup on Unmount**: Proper cleanup of EventSource and intervals
- **Callback Removal**: Unsubscribes callbacks on disconnect
- **Ref Clearing**: Clears all refs on cleanup

## Best Practices

### 1. Connection Management

```typescript
// ✅ Good - Establish connection early
useEffect(() => {
  if (relayId) {
    connectToConfigStream(relayId);
    return () => disconnectFromConfigStream();
  }
}, [relayId]);

// ❌ Bad - No cleanup
useEffect(() => {
  connectToConfigStream(relayId);
  // Missing cleanup!
}, [relayId]);
```

### 2. Configuration Requests

```typescript
// ✅ Good - Request all components in parallel
await Promise.all([
  requestLiveConfig(relayId, 'net'),
  requestLiveConfig(relayId, 'mqtt'),
  requestLiveConfig(relayId, 'coms'),
]);

// ❌ Bad - Sequential requests (slower)
await requestLiveConfig(relayId, 'net');
await requestLiveConfig(relayId, 'mqtt');
await requestLiveConfig(relayId, 'coms');
```

### 3. Error Handling

```typescript
// ✅ Good - Comprehensive error handling
try {
  await requestLiveConfig(relayId, 'mqtt');
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to request configuration');
}

// ❌ Bad - No error handling
await requestLiveConfig(relayId, 'mqtt'); // May throw unhandled error
```

## Troubleshooting

### Common Issues

#### 1. SSE Connection Not Establishing

**Symptoms:** `isConnectedToMqtt` stays false

**Causes:**

- Invalid relayId
- API endpoint not responding
- Network connectivity issues

**Solutions:**

- Check relayId value in cabinet data
- Verify `/api/mqtt/config/subscribe` endpoint is accessible
- Check browser Network tab for SSE request

#### 2. No Live Config Updates

**Symptoms:** `hasReceivedRealSmibData` stays false

**Causes:**

- SMIB device offline
- MQTT broker connectivity issues
- Incorrect topic configuration

**Solutions:**

- Check SMIB device status
- Verify MQTT broker is accessible
- Check MQTT topics configuration

#### 3. Configuration Not Saving

**Symptoms:** Save button doesn't update configuration

**Causes:**

- API endpoint errors
- Invalid configuration values
- MQTT publishing failures

**Solutions:**

- Check browser console for API errors
- Validate all form field values
- Check MQTT service connection status

### Debug Tools

#### Browser DevTools

- **Network Tab**: Check SSE connection and API requests
- **Console**: View SSE messages and errors
- **Application Tab**: Inspect EventSource connections

#### Console Logging

The hook includes comprehensive logging:

```
🔗 [HOOK] connectToConfigStream called with relayId: e831cdfa8384
📨 [HOOK] EventSource message received: {...}
✅ [HOOK] Real SMIB data received for component: mqtt
⚠️ [HOOK] No heartbeat for 15s - marking as disconnected
```

## Related Documentation

- [MQTT Architecture](../backend/mqtt-architecture.md) - System architecture overview
- [MQTT Implementation](../backend/mqtt-implementation.md) - Backend implementation
- [MQTT Protocols](../backend/mqtt-protocols.md) - Protocol and message formats
- [Cabinet Details](./machine-details.md) - Cabinet details page documentation
- [SMIB Configuration](../backend/cabinets-api.md) - Backend API documentation
