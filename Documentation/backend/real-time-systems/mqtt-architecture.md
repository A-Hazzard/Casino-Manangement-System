# MQTT System Architecture & Implementation Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2025

## Overview

This document provides a comprehensive architectural overview of the MQTT system implementation in the CMS (Casino Management System). The system uses MQTT's **publish-subscribe (pub/sub)** model to enable real-time communication between the CMS server and SMIB devices, with Server-Sent Events (SSE) providing live updates to the frontend.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Cabinet Details │  │ SMIB Config     │  │ Live Updates    │ │
│  │ Page            │  │ Hook            │  │ (SSE)           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/SSE
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ SSE Subscribe   │  │ Config Request  │  │ Config Update   │ │
│  │ Endpoint        │  │ Endpoint        │  │ Endpoint        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Service Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 MQTT Service                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │ Connection  │  │ Callback    │  │ Message     │         │ │
│  │  │ Manager     │  │ Manager     │  │ Router      │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ MQTT Protocol
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MQTT Broker                                 │
│              (mq.sas.backoffice.ltd:1883)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ MQTT Topics
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SMIB Devices                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ SMIB Device 1   │  │ SMIB Device 2   │  │ SMIB Device N   │ │
│  │ (relayId: ...)  │  │ (relayId: ...)  │  │ (relayId: ...)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Components

#### Cabinet Details Page

**File:** `app/cabinets/[slug]/page.tsx`

**Responsibilities:**

- Display cabinet information and SMIB configuration
- Establish SSE connection for live updates
- Request initial configuration data
- Handle user interactions for configuration updates

**Key Functions:**

```typescript
// Establish SSE connection
connectToConfigStream(relayId);

// Request initial configuration
requestLiveConfig(relayId, component);

// Handle configuration updates
handleSaveSMIBConfig();
```

#### SMIB Configuration Hook

**File:** `lib/hooks/data/useSmibConfiguration.ts`

**Responsibilities:**

- Manage SMIB configuration state
- Handle SSE connections and message processing
- Provide configuration update functions
- Manage form data and validation

**Key Functions:**

```typescript
// SSE connection management
connectToConfigStream(relayId);
disconnectFromConfigStream();

// Configuration requests
requestLiveConfig(relayId, component);
publishConfigUpdate(relayId, config);

// State management
updateFormData(field, value);
saveConfiguration(cabinetId, machineControl);
```

### 2. API Layer

#### SSE Subscription Endpoint

**File:** `app/api/mqtt/config/subscribe/route.ts`

**Responsibilities:**

- Establish Server-Sent Events stream
- Subscribe to MQTT service callbacks
- Forward MQTT messages to frontend
- Handle client disconnection

**Key Functions:**

```typescript
// Create SSE stream
const stream = new ReadableStream({
  start(controller) {
    // Subscribe to MQTT callbacks
    mqttService.subscribeToConfig(relayId, handleConfigMessage);
  },
});

// Handle MQTT messages
const handleConfigMessage = message => {
  const sseMessage = {
    type: 'config_update',
    relayId: message.rly,
    component: message.comp,
    data: message,
  };
  controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
};
```

#### Configuration Request Endpoint

**File:** `app/api/mqtt/config/request/route.ts`

**Responsibilities:**

- Handle configuration requests from frontend
- Forward requests to MQTT service
- Validate request parameters

**Key Functions:**

```typescript
// Process configuration request
const { relayId, component } = await request.json();
await mqttService.requestConfig(relayId, component);
```

#### Configuration Update Endpoint

**File:** `app/api/mqtt/config/publish/route.ts`

**Responsibilities:**

- Handle configuration updates from frontend
- Publish updates to SMIB devices via MQTT
- Validate update payloads

**Key Functions:**

```typescript
// Process configuration update
const { relayId, config } = await request.json();
await mqttService.publishConfigUpdate(relayId, config);
```

### 3. Service Layer

#### MQTT Service

**File:** `app/api/lib/services/mqttService.ts`

**Responsibilities:**

- Manage MQTT broker connection
- Handle message publishing and subscription
- Route messages to appropriate callbacks
- Manage connection lifecycle
- Execute SMIB operations (OTA, restart, meters)

**Key Functions:**

```typescript
// Connection management
async connect();
async disconnect();

// Configuration management
async subscribeToConfig(relayId, callback);
async requestConfig(relayId, component);
async publishConfigUpdate(relayId, config);

// SMIB Operations
async sendOTAUpdateCommand(relayId, firmwareBinUrl);
async configureOTAUrl(relayId, otaURL);
async requestMeterData(relayId);
async resetMeterData(relayId);
async restartSmib(relayId);
async getFirmwareVersion(relayId);

// Callback management
private handleMessage(topic, message);
private routeMessage(payload);
```

### 4. SMIB Operations

#### OTA Firmware Updates

**Purpose:** Over-the-air firmware updates for SMIB devices

**Process:**

1. Upload firmware binary to MongoDB GridFS
2. Download firmware to `/public/firmwares/` temporarily
3. Configure OTA URL on SMIB
4. Send update command with firmware filename
5. SMIB downloads and installs firmware
6. Auto-cleanup after 30 minutes

**MQTT Commands:**

```json
// Configure OTA URL
{
  "typ": "cfg",
  "comp": "ota",
  "otaURL": "http://192.168.0.211:3000/firmwares/"
}

// Initiate Update
{
  "typ": "ota_ud",
  "bin": "wifi.bin"
}
```

#### SMIB Restart

**Purpose:** Restart SMIB devices remotely

**MQTT Command:**

```json
{
  "typ": "rst"
}
```

**Features:**

- Individual SMIB restart
- Location-wide batch restart
- 15-second countdown UI
- Automatic data refresh after restart

#### Meter Management

**Purpose:** Request and reset meter data on SMIB devices

**Get Meters Command:**

```json
{
  "typ": "cmd",
  "sta": "",
  "siz": 54,
  "pyd": "016F16000000000100040003002200240002000C0005000600E180"
}
```

**Reset Meters Command (Non-SAS only):**

```json
{
  "typ": "cmd",
  "cmd": "met_reset"
}
```

#### Firmware Version Query

**Purpose:** Query current firmware version from SMIB

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

## Data Flow

### 1. Configuration Request Flow (Pub/Sub Model)

```
Frontend → API → MQTT Service → MQTT Broker → SMIB Device
    │         │        │            │            │
    │         │        │            │            │
    ▼         ▼        ▼            ▼            ▼
1. Request  2. Route  3. Publish  4. Route     5. Process
   Config     to        to MQTT     to SMIB     Request
   via API    Service   Broker      Device      (Subscribe)
```

**Detailed Steps:**

1. **Frontend Request**

   ```typescript
   // In useSmibConfiguration.ts
   await requestLiveConfig(relayId, 'mqtt');
   ```

2. **API Processing**

   ```typescript
   // In /api/mqtt/config/request/route.ts
   await mqttService.requestConfig(relayId, component);
   ```

3. **MQTT Publishing**

   ```typescript
   // In mqttService.ts
   const topic = `sas/relay/${relayId}`;
   const payload = JSON.stringify({ typ: 'cfg', comp: component });
   this.client.publish(topic, payload);
   ```

4. **SMIB Response**
   ```json
   {
     "rly": "e831cdfa8384",
     "typ": "cfg",
     "comp": "mqtt",
     "mqttSecure": 0,
     "mqttQOS": 2,
     "mqttURI": "mqtt://rabbit.sbox.site:1883"
   }
   ```

### 2. Configuration Response Flow (Pub/Sub Model)

```
SMIB Device → MQTT Broker → MQTT Service → SSE Endpoint → Frontend
     │            │             │             │            │
     │            │             │             │            │
     ▼            ▼             ▼             ▼            ▼
1. Publish    2. Route      3. Route to    4. Forward   5. Update
   Response     to Server     Callback      via SSE      UI State
   (Pub)        (Sub)         (Filter)      (Stream)     (Live)
```

**Detailed Steps:**

1. **SMIB Response**
   - SMIB device publishes response to `smib/config` topic

2. **MQTT Service Processing**

   ```typescript
   // In mqttService.ts
   private handleMessage(topic, message) {
     const payload = JSON.parse(message.toString());
     const relayId = payload.rly;
     const callback = this.configCallbacks.get(relayId);
     if (callback) {
       callback(payload);
     }
   }
   ```

3. **SSE Forwarding**

   ```typescript
   // In /api/mqtt/config/subscribe/route.ts
   const sseMessage = {
     type: 'config_update',
     relayId: payload.rly,
     component: payload.comp,
     data: payload,
   };
   controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
   ```

4. **Frontend Update**
   ```typescript
   // In useSmibConfiguration.ts
   eventSource.onmessage = event => {
     const message = JSON.parse(event.data);
     if (message.type === 'config_update') {
       updateFormDataFromMessage(message.data);
     }
   };
   ```

### 3. Configuration Update Flow (Pub/Sub Model)

```
Frontend → API → MQTT Service → MQTT Broker → SMIB Device
    │         │        │            │            │
    │         │        │            │            │
    ▼         ▼        ▼            ▼            ▼
1. Update  2. Route  3. Publish  4. Route     5. Apply
   Config     to        to MQTT     to SMIB     Config
   via API    Service   Broker      Device      (Subscribe)
```

**Detailed Steps:**

1. **Frontend Update**

   ```typescript
   // In useSmibConfiguration.ts
   await publishConfigUpdate(relayId, config);
   ```

2. **API Processing**

   ```typescript
   // In /api/mqtt/config/publish/route.ts
   await mqttService.publishConfigUpdate(relayId, config);
   ```

3. **MQTT Publishing**
   ```typescript
   // In mqttService.ts
   const topic = `sas/relay/${relayId}`;
   const payload = JSON.stringify(config);
   this.client.publish(topic, payload);
   ```

## Message Routing

### Topic Structure

#### Server → SMIB

- **Topic:** `sas/relay/[relayId]`
- **Purpose:** Configuration requests and updates
- **Example:** `sas/relay/e831cdfa8384`

#### SMIB → Server

- **Topic:** `smib/config`
- **Purpose:** Configuration responses
- **Routing:** Uses `rly` field to route to specific clients

#### SMIB → Server (General)

- **Topic:** `sas/gli/server/[relayId]`
- **Purpose:** General server data
- **Example:** `sas/gli/server/e831cdfa8384`

### Callback Management

```typescript
// MQTT Service callback management
class MqttService {
  private configCallbacks = new Map<string, Function[]>();

  async subscribeToConfig(relayId: string, callback: Function) {
    if (!this.configCallbacks.has(relayId)) {
      this.configCallbacks.set(relayId, []);
    }
    this.configCallbacks.get(relayId)!.push(callback);
  }

  private routeMessage(payload: any) {
    const relayId = payload.rly;
    const callbacks = this.configCallbacks.get(relayId);
    if (callbacks) {
      callbacks.forEach(callback => callback(payload));
    }
  }
}
```

## State Management

### Frontend State

#### Form Data State

```typescript
const [formData, setFormData] = useState({
  communicationMode: 'No Value Provided',
  firmwareVersion: 'No Value Provided',
  networkSSID: 'No Value Provided',
  networkPassword: 'No Value Provided',
  networkChannel: 'No Value Provided',
  mqttHost: 'No Value Provided',
  mqttPort: 'No Value Provided',
  mqttTLS: 'No Value Provided',
  mqttIdleTimeout: 'No Value Provided',
  mqttUsername: 'No Value Provided',
  mqttPassword: 'No Value Provided',
  // COMS fields
  comsMode: 'No Value Provided',
  comsAddr: 'No Value Provided',
  comsRateMs: 'No Value Provided',
  comsRTE: 'No Value Provided',
  comsGPC: 'No Value Provided',
  // MQTT Topics fields
  mqttPubTopic: 'No Value Provided',
  mqttCfgTopic: 'No Value Provided',
  mqttURI: 'No Value Provided',
});
```

#### Connection State

```typescript
const [isConnectedToMqtt, setIsConnectedToMqtt] = useState(false);
const [isLoadingMqttConfig, setIsLoadingMqttConfig] = useState(false);
```

### Backend State

#### MQTT Service State

```typescript
class MqttService {
  private client: mqtt.MqttClient | null = null;
  private isConnected: boolean = false;
  private configCallbacks = new Map<string, Function[]>();
}
```

## Error Handling

### Frontend Error Handling

```typescript
// SSE connection error handling
eventSource.onerror = error => {
  console.error('❌ [HOOK] EventSource error:', error);
  setIsConnectedToMqtt(false);
};

// Configuration request error handling
try {
  await requestLiveConfig(relayId, component);
} catch (error) {
  console.error('❌ [HOOK] Error requesting live config:', error);
}
```

### Backend Error Handling

```typescript
// MQTT connection error handling
client.on('error', error => {
  console.error('❌ MQTT connection error:', error);
  this.isConnected = false;
});

// Message processing error handling
try {
  const payload = JSON.parse(message.toString());
  this.routeMessage(payload);
} catch (error) {
  console.error('❌ Error parsing MQTT message:', error);
}
```

## Performance Considerations

### Connection Management

- **Single MQTT Connection:** One connection per server instance
- **Callback Management:** Efficient routing using Map data structure
- **SSE Streams:** One stream per client connection

### Message Optimization

- **JSON Parsing:** Efficient parsing of MQTT messages
- **State Updates:** Batched updates to prevent excessive re-renders
- **Memory Management:** Proper cleanup of callbacks and connections

### Scalability

- **Horizontal Scaling:** Multiple server instances can connect to same MQTT broker
- **Load Balancing:** SSE connections distributed across server instances
- **Message Routing:** Efficient routing based on relayId

## Security Considerations

### Authentication

- **MQTT Credentials:** Embedded in connection URI
- **Topic Permissions:** Restricted access based on device roles
- **API Authentication:** JWT-based authentication for API endpoints

### Data Protection

- **TLS/SSL:** Encrypted connections for production environments
- **Input Validation:** Validation of all incoming data
- **Error Handling:** Secure error messages without sensitive information

## Monitoring and Logging

### Logging Strategy

```typescript
// Frontend logging
console.log('🔗 [HOOK] connectToConfigStream called with relayId:', relayId);
console.log('📨 [HOOK] EventSource message received:', event.data);

// Backend logging
console.log('📡 [MQTT] Publishing to:', topic, payload);
console.log('📡 [MQTT] Received from:', topic, message.toString());
```

### Monitoring Points

- **Connection Status:** MQTT broker connectivity
- **Message Flow:** Request/response message counts
- **Error Rates:** Failed requests and connection errors
- **Performance Metrics:** Response times and throughput

## Testing Strategy

### Unit Testing

- **MQTT Service:** Test connection management and message routing
- **API Endpoints:** Test request/response handling
- **Frontend Hooks:** Test state management and SSE handling

### Integration Testing

- **End-to-End Flow:** Test complete configuration request/response cycle
- **Error Scenarios:** Test error handling and recovery
- **Performance Testing:** Test under load conditions

### Manual Testing

- **MQTT Explorer:** Test direct MQTT communication
- **Browser DevTools:** Test SSE connections and message flow
- **API Testing:** Test API endpoints with curl or Postman

## Deployment Considerations

### Environment Configuration

```bash
# Required environment variables
MQTT_URI=mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883
MQTT_PUB_TOPIC=sas/relay/
MQTT_CFG_TOPIC=smib/config
MQTT_SUB_TOPIC=sas/gli/server/
```

### Production Deployment

- **MQTT Broker:** High availability MQTT broker setup
- **Load Balancing:** Multiple server instances behind load balancer
- **Monitoring:** Comprehensive monitoring and alerting
- **Backup:** MQTT broker backup and recovery procedures

## Troubleshooting Guide

### Common Issues

#### 1. No Response from SMIB

**Symptoms:** Configuration requests timeout without response
**Causes:**

- Incorrect relayId
- SMIB device offline
- MQTT broker connectivity issues
  **Solutions:**
- Verify relayId in database
- Check SMIB device status
- Test MQTT broker connectivity

#### 2. SSE Connection Issues

**Symptoms:** Frontend not receiving live updates
**Causes:**

- SSE endpoint not called
- MQTT service callback not registered
- Network connectivity issues
  **Solutions:**
- Check browser Network tab for SSE requests
- Verify MQTT service callback registration
- Test network connectivity

#### 3. Configuration Update Failures

**Symptoms:** Configuration updates not applied
**Causes:**

- Invalid payload format
- SMIB device not responding
- MQTT publishing errors
  **Solutions:**
- Validate payload format
- Check SMIB device logs
- Test MQTT publishing

### Debug Tools

#### MQTT Explorer

- Connect to MQTT broker
- Monitor topic messages
- Test manual publishing

#### Browser DevTools

- Monitor SSE connections
- Check API requests
- View console logs

#### Server Logs

- MQTT service logs
- API endpoint logs
- Error logs

## Future Enhancements

### Planned Features

- **Batch Configuration:** Update multiple devices simultaneously
- **Configuration Templates:** Predefined configuration templates
- **Real-time Monitoring:** Live device status monitoring
- **Historical Data:** Configuration change history

### Performance Improvements

- **Message Compression:** Compress large configuration payloads
- **Connection Pooling:** Optimize MQTT connections
- **Caching:** Cache frequently accessed configurations
- **WebSocket:** Replace SSE with WebSocket for better performance

## References

- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)
- [MQTT Protocol Specification](https://mqtt.org/mqtt-specification/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Hooks](https://reactjs.org/docs/hooks-intro.html)
