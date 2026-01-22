# MQTT Implementation Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2025

## Overview

This document provides comprehensive documentation for the MQTT implementation in the Evolution One CMS casino machine management system. The MQTT implementation enables real-time communication between the CMS and Slot Machine Interface Boards (SMIBs) for configuration updates, machine control commands, and event monitoring through a publish-subscribe architecture with Server-Sent Events (SSE) for frontend updates.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [MQTT Service Implementation](#mqtt-service-implementation)
3. [SMIB Configuration Management](#smib-configuration-management)
4. [Machine Control Commands](#machine-control-commands)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Topic Structure](#topic-structure)
8. [Security Considerations](#security-considerations)
9. [Error Handling](#error-handling)
10. [Testing and Debugging](#testing-and-debugging)

## Architecture Overview

The MQTT implementation follows a publish-subscribe pattern where:

- **CMS (Central Management System)**: Acts as the MQTT client that publishes configuration updates and control commands
- **SMIB (Slot Machine Interface Board)**: Acts as the MQTT client that subscribes to configuration topics and publishes events
- **MQTT Broker**: Central message broker that handles message routing (typically Mosquitto or similar)

```
┌─────────────────┐    MQTT     ┌─────────────────┐    MQTT     ┌─────────────────┐
│   CMS Frontend  │ ──────────► │  MQTT Broker    │ ◄────────── │   SMIB Device   │
│                 │             │                 │             │                 │
│ - Configuration │             │ - Message       │             │ - Machine       │
│ - Control UI    │             │   Routing       │             │ - Event         │
│ - Monitoring    │             │ - QoS Handling  │             │   Publishing    │
└─────────────────┘             └─────────────────┘             └─────────────────┘
```

## MQTT Service Implementation

### Core Service (`app/api/lib/services/mqttService.ts`)

The MQTT service is implemented as a singleton class that handles:

- **Connection Management**: Automatic connection, reconnection, and error handling
- **Callback Routing**: Routes messages to appropriate subscribers using relayId
- **Configuration Publishing**: Sending SMIB configuration updates
- **Machine Control**: Sending control commands to machines
- **Event Handling**: Connection status, errors, and disconnections
- **Subscription Management**: Manages config callbacks for multiple relayIds

#### Complete Service Interface

```typescript
class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private config: MQTTConfig;
  private isConnected = false;
  private configCallbacks: Map<string, ConfigCallback[]> = new Map();
  private isSubscribedToConfig = false;

  // Connection management
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  isMQTTConnected(): boolean;
  getConfig(): MQTTConfig;

  // SMIB configuration management
  async sendSMIBConfigUpdate(cabinetId: string, smibConfig: SmibConfig): Promise<void>;
  async sendNetworkConfigUpdate(cabinetId: string, networkConfig: {...}): Promise<void>;
  async sendCommunicationModeUpdate(cabinetId: string, comsMode: number): Promise<void>;

  // Machine control commands
  async sendMachineControlCommand(cabinetId: string, command: string): Promise<void>;

  // Configuration request/response
  async requestConfig(relayId: string, component: string): Promise<void>;
  async publishConfig(relayId: string, config: object): Promise<void>;

  // Callback management
  async subscribeToConfig(relayId: string, callback: ConfigCallback): Promise<void>;
  async subscribeAndRequestConfig(relayId: string, component: string, callback: ConfigCallback): Promise<void>;
  unsubscribeFromConfig(relayId: string): void;
  unsubscribeCallback(relayId: string, callback: ConfigCallback): void;

  // Topic subscription
  async subscribe(topic: string): Promise<void>;
  async subscribeToServerData(relayId: string, callback: ConfigCallback): Promise<void>;

  // Message handling
  onMessage(callback: (topic: string, message: Buffer) => void): void;
}
```

#### Service Configuration

The service uses environment variables for MQTT broker configuration:

```typescript
type MQTTConfig = {
  mqttURI: string; // MQTT broker URI with credentials
  mqttPubTopic: string; // Topic prefix for publishing (sas/relay/)
  mqttCfgTopic: string; // Topic for config responses (smib/config)
  mqttGliTopic: string; // Topic prefix for server data (sas/gli/server/)
};
```

**Environment Variables:**

- `MQTT_URI`: MQTT broker connection string (default: `mqtt://localhost:1883`)
- `MQTT_PUB_TOPIC`: Publish topic prefix (default: `sas/relay/`)
- `MQTT_CFG_TOPIC`: Configuration response topic (default: `smib/config`)
- `MQTT_SUB_TOPIC`: GLI server topic prefix (default: `sas/gli/server/`)

**Current Configuration:**

```
MQTT_URI=mqtt://rabbit.sbox.site
MQTT_PUB_TOPIC=sas/relay/
MQTT_CFG_TOPIC=smib/config
MQTT_SUB_TOPIC=sas/gli/server/
```

#### Connection Settings

```typescript
// Connection options
{
  protocol: 'mqtt',
  port: 1883,
  keepalive: 60,           // Send ping every 60 seconds
  reconnectPeriod: 5000,   // Reconnect after 5 seconds if disconnected
  connectTimeout: 30000    // Wait 30 seconds for initial connection
}
```

## Message Routing and Callback Management

### How Message Routing Works

The MQTT service uses a callback-based routing system:

1. **Callback Registration**: Each SSE connection registers a callback for its relayId
2. **Message Reception**: MQTT service receives messages on `smib/config` topic
3. **RelayId Extraction**: Extracts `rly` field from message payload
4. **Callback Execution**: Executes all registered callbacks for that relayId
5. **SSE Forwarding**: Callback forwards message via SSE to frontend

```typescript
// Callback storage
private configCallbacks: Map<string, ConfigCallback[]> = new Map();

// Register callback
async subscribeToConfig(relayId: string, callback: ConfigCallback) {
  if (!this.configCallbacks.has(relayId)) {
    this.configCallbacks.set(relayId, []);
  }
  this.configCallbacks.get(relayId)!.push(callback);
}

// Message routing
private handleMessage(topic: string, message: Buffer) {
  if (topic === 'smib/config' || topic === 'sas/server') {
    const payload = JSON.parse(message.toString());
    const relayId = payload.rly;

    if (relayId && this.configCallbacks.has(relayId)) {
      const callbacks = this.configCallbacks.get(relayId);
      callbacks?.forEach(callback => callback(payload));
    }
  }
}
```

### Callback Lifecycle

```typescript
// 1. SSE Connection Established
// Frontend: connectToConfigStream(relayId)
// Backend: GET /api/mqtt/config/subscribe?relayId=...

// 2. Callback Registration
await mqttService.subscribeToConfig(relayId, handleConfigMessage);

// 3. Message Reception
// SMIB publishes to smib/config
// Service routes to all callbacks for relayId

// 4. SSE Forwarding
const sseMessage = {
  type: 'config_update',
  relayId: message.rly,
  component: message.comp,
  data: message,
};
controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);

// 5. Client Disconnection
request.signal.addEventListener('abort', () => {
  mqttService.unsubscribeCallback(relayId, handleConfigMessage);
});
```

### Multiple Client Support

The system supports multiple clients subscribing to the same relayId:

- Each client gets its own callback in the array
- Messages are forwarded to all registered callbacks
- Cleanup removes only the specific callback, not all callbacks
- If no callbacks remain, the relayId entry is removed from the Map

## SMIB Configuration Management

### Configuration Structure

SMIB configuration is structured as follows:

```typescript
type SmibConfig = {
  coms: {
    comsMode: number; // 0 = SAS, 1 = non-SAS, 2 = IGT
    comsRateMs: number; // Communication rate in milliseconds
    comsRTE: number; // Real-time events enabled
    comsGPC: number; // Game protocol configuration
  };
  net: {
    netMode: number; // 1 = WiFi client mode
    netStaSSID: string; // WiFi network name
    netStaPwd: string; // WiFi password
    netStaChan: number; // WiFi channel
  };
  mqtt: {
    mqttSecure: number; // TLS encryption (0 = off, 1 = on)
    mqttQOS: number; // Quality of service level
    mqttURI: string; // MQTT broker address
    mqttSubTopic: string; // Topic for receiving commands
    mqttPubTopic: string; // Topic for publishing events
    mqttCfgTopic: string; // Topic for configuration updates
    mqttIdleTimeS: number; // Idle timeout in seconds
    mqttUsername?: string; // MQTT username
    mqttPassword?: string; // MQTT password
  };
};
```

### Configuration Update Flow

1. **User Interface**: User modifies configuration in the cabinet details page
2. **Form Validation**: Frontend validates the configuration data
3. **API Call**: Frontend sends POST request to `/api/cabinets/[cabinetId]/smib-config`
4. **Database Update**: API updates the machine's `smibConfig` field in MongoDB
5. **MQTT Publishing**: API publishes configuration to MQTT broker
6. **SMIB Reception**: SMIB device receives and applies the configuration
7. **Confirmation**: SMIB can publish confirmation back to CMS

## Machine Control Commands

### Supported Commands

The system supports the following machine control commands:

- **RESTART**: Restart the SMIB device
- **LOCK MACHINE**: Lock the gaming machine
- **UNLOCK MACHINE**: Unlock the gaming machine

### Command Format

Commands are sent as JSON payloads:

```json
{
  "command": "RESTART",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "restart"
}
```

### Command Processing

1. **User Action**: User clicks control button in the UI
2. **API Request**: Frontend sends command to `/api/cabinets/[cabinetId]/smib-config`
3. **MQTT Publishing**: API publishes command to MQTT broker
4. **SMIB Execution**: SMIB device receives and executes the command
5. **Status Update**: SMIB can publish status updates back to CMS

## API Endpoints

### 1. SMIB Configuration Update

**POST** `/api/cabinets/[cabinetId]/smib-config`

Updates SMIB configuration in database and sends via MQTT.

#### Request Body

```json
{
  "smibConfig": {
    "coms": { "comsMode": 0 },
    "net": { "netMode": 1, "netStaSSID": "Casino_WiFi" },
    "mqtt": { "mqttURI": "mqtt.casino.com" }
  },
  "smibVersion": {
    "firmware": "1.0.0"
  },
  "machineControl": "RESTART" // Optional
}
```

#### Response

```json
{
  "success": true,
  "data": {
    /* updated machine object */
  },
  "mqttSent": true
}
```

### 2. Get SMIB Configuration

**GET** `/api/cabinets/[cabinetId]/smib-config`

Retrieves current SMIB configuration from database.

#### Response

```json
{
  "success": true,
  "data": {
    "smibConfig": {
      /* current configuration */
    },
    "smibVersion": {
      /* firmware version */
    },
    "relayId": "e831cdfa8464"
  }
}
```

### 3. Get MQTT Configuration

**GET** `/api/mqtt/config?cabinetId=[cabinetId]`

Fetches formatted MQTT configuration values for a specific cabinet.

#### Query Parameters

- `cabinetId` (string, required): Cabinet/Machine ID

#### Response

```json
{
  "success": true,
  "data": {
    "smibId": "e831cdfa8464",
    "networkSSID": "Casino_WiFi",
    "networkPassword": "***",
    "networkChannel": "1",
    "communicationMode": "sas",
    "firmwareVersion": "1.0.0",
    "mqttHost": "mq.sas.backoffice.ltd",
    "mqttPort": "1883",
    "mqttTLS": "0",
    "mqttQOS": "2",
    "mqttIdleTimeout": "30",
    "mqttPubTopic": "sas/gy/server",
    "mqttCfgTopic": "smib/config",
    "mqttSubTopic": "sas/relay/",
    "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
    "serverTopic": "sas/gy/server",
    "otaURL": "http://api.sas.backoffice.ltd/firmwares/",
    "comsMode": "0",
    "comsAddr": "1",
    "comsRateMs": "200",
    "comsRTE": "0",
    "comsGPC": "0"
  }
}
```

### 4. MQTT Config Request (SSE Pattern)

**POST** `/api/mqtt/config/request`

Requests live configuration from SMIB device via MQTT pub/sub.

#### Request Body

```json
{
  "relayId": "e831cdfa8384",
  "component": "mqtt" // mqtt, ota, coms, net, app
}
```

#### Response

```json
{
  "success": true,
  "message": "Config request sent for mqtt to relayId: e831cdfa8384",
  "relayId": "e831cdfa8384",
  "component": "mqtt",
  "timestamp": "2025-10-26T10:30:00.000Z"
}
```

**Note:** The actual response data comes via SSE subscription endpoint.

### 5. MQTT Config Publish

**POST** `/api/mqtt/config/publish`

Publishes configuration updates to SMIB device via MQTT.

#### Request Body

```json
{
  "relayId": "e831cdfa8384",
  "config": {
    "typ": "cfg",
    "comp": "mqtt",
    "mqttSecure": 0,
    "mqttQOS": 2,
    "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
    "mqttSubTopic": "sas/relay/",
    "mqttPubTopic": "sas/gy/server",
    "mqttCfgTopic": "smib/config",
    "mqttIdleTimeS": 30
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Config update published for mqtt to relayId: e831cdfa8384",
  "relayId": "e831cdfa8384",
  "config": {
    /* sent config */
  },
  "timestamp": "2025-10-26T10:30:00.000Z"
}
```

### 6. MQTT Config Subscribe (SSE)

**GET** `/api/mqtt/config/subscribe?relayId=[relayId]`

Establishes Server-Sent Events stream for live MQTT config updates.

#### Query Parameters

- `relayId` (string, required): Relay ID of the SMIB device

#### Response

Server-Sent Events stream with messages:

```
data: {"type":"connected","relayId":"e831cdfa8384","timestamp":"2025-10-26T10:30:00.000Z","message":"Connected to MQTT config stream"}

data: {"type":"config_update","relayId":"e831cdfa8384","component":"mqtt","data":{...},"timestamp":"2025-10-26T10:30:01.000Z"}

data: {"type":"heartbeat","relayId":"e831cdfa8384","timestamp":"2025-10-26T10:30:05.000Z"}
```

**Note:** Heartbeat messages are sent every 5 seconds to maintain connection.

### 7. MQTT Test Endpoint

**POST** `/api/mqtt/test`

Testing endpoint for MQTT connectivity and message publishing/subscription.

#### Request Body

```json
{
  "action": "connect" | "publish" | "subscribe",
  "relayId": "e831cdfa8384", // Optional, defaults to e831cdfa8384
  "message": "custom message" // Optional, for publish action
}
```

#### Response

```json
{
  "success": true,
  "action": "publish",
  "relayId": "e831cdfa8384",
  "topic": "sas/relay/e831cdfa8384",
  "timestamp": "2025-10-26T10:30:00.000Z",
  "messages": [
    "Connected to MQTT broker",
    "Published to sas/relay/e831cdfa8384: {\"command\":\"test\",\"timestamp\":\"2025-10-26T10:30:00.000Z\",\"source\":\"api-test\"}"
  ],
  "publishedMessage": "{\"command\":\"test\",\"timestamp\":\"2025-10-26T10:30:00.000Z\",\"source\":\"api-test\"}"
}
```

## Frontend Integration

### SMIB Configuration Hook

**File:** `lib/hooks/data/useSmibConfiguration.ts`

The frontend uses a custom hook (`useSmibConfiguration`) to manage:

- **Form State**: Configuration form data and validation
- **Edit Mode**: Toggle between view and edit modes
- **SSE Connection**: Real-time connection for live MQTT updates
- **Data Synchronization**: Sync with backend data and live SMIB responses
- **Save Operations**: Handle configuration saves with MQTT publishing

#### Key Hook Functions

```typescript
// SSE Connection Management
connectToConfigStream(relayId: string): void
disconnectFromConfigStream(): void

// Configuration Requests
requestLiveConfig(relayId: string, component: string): Promise<void>
fetchMqttConfig(cabinetId: string): Promise<void>
fetchSmibConfiguration(relayId: string): Promise<void>

// Configuration Updates
publishConfigUpdate(relayId: string, config: object): Promise<void>
updateNetworkConfig(relayId: string, networkData: {...}): Promise<void>
updateMqttConfig(relayId: string, mqttData: {...}): Promise<void>
updateComsConfig(relayId: string, comsData: {...}): Promise<void>
updateOtaConfig(relayId: string, otaData: {...}): Promise<void>
updateAppConfig(relayId: string, appData: {...}): Promise<void>

// Save Operations
saveConfiguration(cabinetId: string, machineControl?: string): Promise<boolean>
```

#### Hook State Management

```typescript
const {
  // Configuration State
  formData, // Current form values
  originalData, // Original data for reset
  mqttConfigData, // MQTT config from database

  // UI State
  smibConfigExpanded, // Config panel expanded/collapsed
  isEditMode, // Edit mode active
  isLoadingMqttConfig, // Loading state

  // Connection State
  isConnectedToMqtt, // SSE connection status
  hasReceivedRealSmibData, // Received actual SMIB data
  hasConfigBeenFetched, // Initial config fetch complete

  // Display State
  communicationMode, // Human-readable comm mode
  firmwareVersion, // Current firmware version
} = useSmibConfiguration();
```

### Key Components

#### Cabinet Details Page

**File:** `app/cabinets/[slug]/page.tsx`

- **SMIB Configuration Section**: Expandable section with live configuration
- **SSE Connection**: Establishes SSE stream on mount
- **Configuration Requests**: Requests config for all components (net, mqtt, coms, ota, app)
- **Edit Mode**: Toggle to enable/disable editing
- **Save Buttons**: Individual save buttons for different configuration sections
- **Machine Controls**: RESTART, LOCK, UNLOCK buttons
- **Live Updates**: Real-time configuration updates via SSE

#### Form Fields

- **Communication Mode**: SAS/non-SAS/IGT selection (from `comsMode`)
- **Network Configuration**: WiFi SSID, password, channel
- **MQTT Configuration**: Host, port, TLS, QoS, idle timeout, topics
- **COMS Configuration**: Address, rate, RTE, GPC settings
- **Firmware Version**: Current firmware version display
- **OTA Configuration**: Firmware update URL

## Topic Structure

### MQTT Topics

The system uses a topic structure for pub/sub communication:

```
sas/relay/[relayId]       # Server → SMIB: Configuration requests and updates
smib/config               # SMIB → Server: Configuration responses (all devices)
sas/gli/server/[relayId]  # SMIB → Server: General server data (specific device)
```

### Topic Details

#### Server to SMIB (Publish)

- **Topic:** `sas/relay/[relayId]`
- **Purpose:** Server publishes configuration requests and updates to specific SMIB devices
- **Direction:** Server → SMIB
- **Example:** `sas/relay/e831cdfa8384`
- **QoS:** 0 (default)

#### SMIB to Server - Config Responses (Subscribe)

- **Topic:** `smib/config`
- **Purpose:** Server subscribes to receive configuration responses from all SMIB devices
- **Direction:** SMIB → Server
- **Routing:** Uses `rly` field in message payload to route to specific callbacks
- **QoS:** 0 (default)

#### SMIB to Server - General Data (Subscribe)

- **Topic:** `sas/gli/server/[relayId]`
- **Purpose:** Server subscribes to receive general server data from specific SMIB devices
- **Direction:** SMIB → Server
- **Example:** `sas/gli/server/e831cdfa8384`
- **QoS:** 0 (default)

### Topic Examples

```
# Server requests config from SMIB e831cdfa8384
Topic: sas/relay/e831cdfa8384
Payload: {"typ":"cfg","comp":"mqtt"}

# SMIB e831cdfa8384 responds with config
Topic: smib/config
Payload: {"rly":"e831cdfa8384","typ":"cfg","comp":"mqtt","mqttSecure":0,...}

# Server updates SMIB e831cdfa8384 config
Topic: sas/relay/e831cdfa8384
Payload: {"typ":"cfg","comp":"mqtt","mqttSecure":0,"mqttQOS":2,...}
```

## Security Considerations

### Authentication

- **MQTT Username/Password**: Optional authentication for MQTT broker
- **TLS Encryption**: Optional TLS encryption for secure communication
- **User Authorization**: Frontend checks user permissions before allowing configuration changes

### Data Protection

- **Password Fields**: Network and MQTT passwords are masked in the UI
- **Secure Storage**: Sensitive configuration data is stored securely in MongoDB
- **Audit Logging**: All configuration changes are logged for audit purposes

### Network Security

- **Firewall Rules**: MQTT broker should be protected by firewall
- **VPN Access**: Consider VPN for remote access to MQTT broker
- **Certificate Management**: Proper SSL/TLS certificate management for production

## Error Handling

### Connection Errors

```typescript
// Automatic reconnection with exponential backoff
client.on('error', error => {
  console.error('MQTT connection error:', error);
  // Automatic reconnection handled by mqtt.js
});

client.on('disconnect', () => {
  console.warn('MQTT disconnected');
  // Reconnection will be attempted automatically
});
```

### Publishing Errors

```typescript
// Error handling for failed publications
client.publish(topic, payload, { qos: 1 }, error => {
  if (error) {
    console.error('Failed to publish:', error);
    // Handle error (retry, log, notify user)
  } else {
    console.log('Published successfully');
  }
});
```

### Frontend Error Handling

- **API Errors**: Display user-friendly error messages
- **Validation Errors**: Client-side validation before API calls
- **Network Errors**: Handle network connectivity issues
- **Timeout Handling**: Set appropriate timeouts for MQTT operations

## Testing and Debugging

### API Testing Endpoints

#### 1. MQTT Test API

**Endpoint:** `POST /api/mqtt/test`

Use this endpoint to test MQTT connectivity:

```bash
# Test connection
curl -X POST http://localhost:3000/api/mqtt/test \
  -H "Content-Type: application/json" \
  -d '{"action": "connect"}'

# Test publish
curl -X POST http://localhost:3000/api/mqtt/test \
  -H "Content-Type: application/json" \
  -d '{"action": "publish", "relayId": "e831cdfa8384"}'

# Test subscribe
curl -X POST http://localhost:3000/api/mqtt/test \
  -H "Content-Type: application/json" \
  -d '{"action": "subscribe", "relayId": "e831cdfa8384"}'
```

#### 2. Config Request Test

```bash
# Request MQTT configuration
curl -X POST http://localhost:3000/api/mqtt/config/request \
  -H "Content-Type: application/json" \
  -d '{"relayId": "e831cdfa8384", "component": "mqtt"}'

# Request network configuration
curl -X POST http://localhost:3000/api/mqtt/config/request \
  -H "Content-Type: application/json" \
  -d '{"relayId": "e831cdfa8384", "component": "net"}'
```

#### 3. SSE Subscription Test

```bash
# Establish SSE connection
curl -N http://localhost:3000/api/mqtt/config/subscribe?relayId=e831cdfa8384
```

### Development Testing

1. **MQTT Explorer Tool**: Use MQTT Explorer GUI for visual debugging
   - Connect to broker: `mqtt://rabbit.sbox.site`
   - Subscribe to: `smib/config`, `sas/relay/+`
   - Monitor message flow in real-time

2. **Browser DevTools**:
   - **Network Tab**: Monitor SSE connection and API requests
   - **Console**: View SSE messages and MQTT logs
   - **Application Tab**: Inspect EventSource connections

3. **HTML Test Page**: Use `mqtt-example.html` for direct MQTT testing
   - Open in browser
   - Test connection to broker
   - Publish/subscribe to topics

### Debugging Tools

#### Console Logging

The system includes comprehensive logging:

```typescript
// MQTT Service logs
✅ MQTT connected successfully
📡 Registered config callback for relayId: e831cdfa8384
📡 [MQTT] Requesting mqtt config for e831cdfa8384
✅ Config request sent for mqtt to sas/relay/e831cdfa8384
🔍 [MQTT] Received config response for relayId: e831cdfa8384

// API logs
🔍 [API] SSE Subscribe request received for relayId: e831cdfa8384
✅ [SSE] Successfully subscribed to config for relayId: e831cdfa8384
📡 [API] Config request sent successfully for mqtt to relayId: e831cdfa8384
```

#### Network Monitoring

- **Wireshark**: Monitor MQTT traffic on port 1883
- **MQTT Broker Logs**: Check broker logs for connection/subscription issues
- **Browser DevTools**: Monitor SSE connections and message flow

### Common Issues

1. **Connection Refused**
   - **Cause**: MQTT broker not accessible
   - **Solution**: Verify broker URL and network connectivity
   - **Check**: `ping mq.sas.backoffice.ltd`

2. **No SSE Messages**
   - **Cause**: Callback not registered or MQTT not connected
   - **Solution**: Check SSE connection in Network tab, verify callback registration
   - **Check**: Look for "Successfully subscribed to config" log

3. **SMIB Not Responding**
   - **Cause**: SMIB device offline or incorrect relayId
   - **Solution**: Verify relayId and SMIB device status
   - **Check**: Test with MQTT Explorer to see if SMIB is publishing

4. **Config Updates Not Applied**
   - **Cause**: Invalid payload or SMIB not receiving updates
   - **Solution**: Validate config structure, check SMIB logs
   - **Check**: Monitor `sas/relay/[relayId]` topic for published messages

## Performance Considerations

### Connection Management

- **Connection Pooling**: Reuse MQTT connections when possible
- **Connection Limits**: Monitor broker connection limits
- **Heartbeat**: Use keep-alive to maintain connections

### Message Optimization

- **Message Size**: Keep messages small and efficient
- **QoS Levels**: Use appropriate QoS levels (0 for fire-and-forget, 1 for at-least-once)
- **Retained Messages**: Use retained messages for configuration updates

### Scaling

- **Broker Clustering**: Consider broker clustering for high availability
- **Load Balancing**: Distribute MQTT load across multiple brokers
- **Monitoring**: Implement comprehensive monitoring for MQTT infrastructure

## Complete Flow Example

### Scenario: Updating WiFi Configuration

#### 1. User Action

```typescript
// In Cabinet Details page
// User changes WiFi SSID from "Old_WiFi" to "New_WiFi"
// User clicks "Save Network Configuration"
```

#### 2. Frontend Processing

```typescript
// In useSmibConfiguration hook
const updateNetworkConfig = async (relayId, networkData) => {
  const config = {
    typ: 'cfg',
    comp: 'net',
    netMode: 0,
    netStaSSID: 'New_WiFi',
    netStaPwd: 'password123',
    netStaChan: 1,
  };

  await publishConfigUpdate(relayId, config);
};
```

#### 3. API Processing

```typescript
// POST /api/mqtt/config/publish
const { relayId, config } = await request.json();
await mqttService.publishConfig(relayId, config);
```

#### 4. MQTT Publishing

```typescript
// mqttService.publishConfig()
const topic = 'sas/relay/e831cdfa8384';
const payload = JSON.stringify({
  typ: 'cfg',
  comp: 'net',
  netMode: 0,
  netStaSSID: 'New_WiFi',
  netStaPwd: 'password123',
  netStaChan: 1,
});

this.client.publish(topic, payload);
```

#### 5. SMIB Reception

```
SMIB device subscribed to sas/relay/e831cdfa8384
Receives message and applies WiFi configuration
Reconnects to "New_WiFi" network
```

#### 6. SMIB Confirmation (Optional)

```typescript
// SMIB publishes confirmation to smib/config
{
  "rly": "e831cdfa8384",
  "typ": "cfg",
  "comp": "net",
  "netMode": 0,
  "netStaSSID": "New_WiFi",
  "netStaPwd": "password123",
  "netStaChan": 1
}
```

#### 7. Frontend Update

```typescript
// SSE message received
eventSource.onmessage = event => {
  const message = JSON.parse(event.data);
  // Updates form with confirmed values
  setFormData(prev => ({
    ...prev,
    networkSSID: message.data.netStaSSID,
    networkPassword: message.data.netStaPwd,
    networkChannel: message.data.netStaChan.toString(),
  }));
};
```

## Future Enhancements

### Planned Features

1. **Real-time Monitoring**: Live status monitoring of all SMIB devices
2. **Batch Operations**: Bulk configuration updates for multiple machines
3. **Configuration Templates**: Predefined configuration templates
4. **Event Streaming**: Real-time event streaming from machines to frontend
5. **Analytics Integration**: MQTT message analytics and insights
6. **Configuration History**: Track all configuration changes over time

### Technical Improvements

1. **Message Compression**: Implement message compression for large configurations
2. **Caching**: Configuration caching for improved performance
3. **WebSocket Integration**: Alternative to SSE for bi-directional communication
4. **GraphQL Support**: GraphQL API for flexible data querying
5. **Rate Limiting**: Implement rate limiting for MQTT operations
6. **Message Queue**: Queue for handling high-volume message traffic

## Related Documentation

- [MQTT Architecture](./mqtt-architecture.md) - System architecture and design patterns
- [MQTT Protocols](./mqtt-protocols.md) - Protocol specifications and message formats
- [Frontend MQTT Integration](../frontend/mqtt-integration.md) - Frontend implementation
- [Cabinets API](./cabinets-api.md) - Cabinet management API
- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js) - MQTT client library
- [SSE Specification](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) - Server-Sent Events

## Conclusion

The MQTT implementation provides a robust, scalable solution for casino machine management. It enables real-time configuration updates, machine control, and event monitoring through a well-structured publish-subscribe architecture with SSE for frontend integration. The implementation follows best practices for security, error handling, performance optimization, and supports multiple concurrent clients.

The system is production-ready and provides a complete foundation for real-time SMIB communication with proper error handling, connection management, and message routing capabilities.
