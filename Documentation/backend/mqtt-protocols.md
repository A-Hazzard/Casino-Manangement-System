# MQTT Protocol Implementation & Developer Flow Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 17th, 2025

## Overview

This document provides a comprehensive guide to the MQTT protocol implementation for SMIB (Slot Machine Interface Board) communication in the CMS system. It covers the complete developer flow from UI to backend, including architecture, message protocols, and implementation details.

## System Architecture

The MQTT system follows a request-response pattern with real-time communication between:

1. **Frontend UI** (React/Next.js)
2. **Backend API** (Next.js API routes)
3. **MQTT Service** (Node.js MQTT client)
4. **MQTT Broker** (External broker)
5. **SMIB Devices** (Hardware devices)

## Complete Developer Flow

### 1. UI to Backend Flow

#### Frontend Component: Cabinet Details Page
**File:** `app/cabinets/[slug]/page.tsx`

```typescript
// 1. Page loads and extracts relayId from cabinet data
const relayId = cabinet.relayId || cabinet.smibBoard;

// 2. Establishes SSE connection for live updates
connectToConfigStream(relayId);

// 3. Requests initial configuration for all components
Promise.all([
  requestLiveConfig(relayId, "net"),    // Network config
  requestLiveConfig(relayId, "mqtt"),   // MQTT config
  requestLiveConfig(relayId, "coms"),   // Communication config
  requestLiveConfig(relayId, "ota"),    // OTA config
  requestLiveConfig(relayId, "app"),    // App config
]);
```

#### Custom Hook: SMIB Configuration
**File:** `lib/hooks/data/useSmibConfiguration.ts`

```typescript
// 1. Establishes SSE connection
const connectToConfigStream = useCallback((relayId: string) => {
  const eventSource = new EventSource(`/api/mqtt/config/subscribe?relayId=${relayId}`);
  
  eventSource.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "config_update") {
      // Update UI state with received configuration
      updateFormDataFromMessage(message.data);
    }
  };
}, []);

// 2. Requests live configuration
const requestLiveConfig = async (relayId: string, component: string) => {
  const response = await fetch("/api/mqtt/config/request", {
    method: "POST",
    body: JSON.stringify({ relayId, component }),
  });
};
```

### 2. Backend API Flow

#### SSE Subscription Endpoint
**File:** `app/api/mqtt/config/subscribe/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const relayId = searchParams.get("relayId");
  
  // 1. Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // 2. Subscribe to MQTT service callbacks
      mqttService.subscribeToConfig(relayId, (message) => {
        // 3. Forward MQTT messages to frontend via SSE
        const sseMessage = {
          type: "config_update",
          relayId: message.rly,
          component: message.comp,
          data: message,
        };
        controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
      });
    }
  });
  
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

#### Configuration Request Endpoint
**File:** `app/api/mqtt/config/request/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { relayId, component } = await request.json();
  
  // 1. Request configuration from SMIB via MQTT
  await mqttService.requestConfig(relayId, component);
  
  return NextResponse.json({ success: true });
}
```

### 3. MQTT Service Flow

#### MQTT Service Implementation
**File:** `lib/services/mqttService.ts`

```typescript
class MqttService {
  // 1. Connect to MQTT broker
  async connect() {
    this.client = mqtt.connect(process.env.MQTT_URI);
    await this.ensureConfigSubscription();
  }
  
  // 2. Subscribe to configuration responses
  async subscribeToConfig(relayId: string, callback: Function) {
    // Register callback for specific relayId
    this.configCallbacks.set(relayId, callback);
  }
  
  // 3. Request configuration from SMIB
  async requestConfig(relayId: string, component: string) {
    const topic = `sas/relay/${relayId}`;
    const payload = JSON.stringify({
      typ: "cfg",
      comp: component,
    });
    
    this.client.publish(topic, payload);
  }
  
  // 4. Handle incoming messages
  private handleMessage(topic: string, message: Buffer) {
    const payload = JSON.parse(message.toString());
    const relayId = payload.rly;
    
    // Route message to appropriate callback
    const callback = this.configCallbacks.get(relayId);
    if (callback) {
      callback(payload);
    }
  }
}
```

## Topic Structure

### Server → SMIB Communication
- **Topic:** `sas/relay/[relayId]`
  - Server publishes configuration requests TO specific SMIB devices
  - Example: `sas/relay/e831cdfa8384`
  - Direction: Server → SMIB

### SMIB → Server Communication
- **Topic:** `smib/config`
  - Server subscribes to receive configuration responses FROM all SMIB devices
  - All messages include the `rly` field for message routing to specific clients
  - Direction: SMIB → Server

### SMIB → Server General Data
- **Topic:** `sas/gli/server/[relayId]`
  - Server subscribes to receive general server data FROM specific SMIB devices
  - Example: `sas/gli/server/e831cdfa8384`
  - Direction: SMIB → Server

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MQTT Broker                          │
│  (mq.sas.backoffice.ltd:1883)                          │
└─────────────────────────────────────────────────────────┘
                 │                    │                    │
                 │                    │                    │
            Publish to            Subscribe to         Publish to
         sas/relay/[relayId]      smib/config      sas/gli/server/[relayId]
                 │                    │                    │
                 ▼                    ▲                    ▲
        ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
        │    Server    │      │   SMIB 1     │    │   SMIB 2     │
        │   (CMS)      │      │ (relayId:    │    │ (relayId:    │
        │              │      │  e831...)    │    │  78421...)   │
        │ Subscribes:  │      │              │    │              │
        │ - smib/config│      │ Subscribes:  │    │ Subscribes:  │
        │ - sas/gli/   │      │ - sas/relay/ │    │ - sas/relay/ │
        │   server     │      │   [relayId]  │    │   [relayId]  │
        │              │      │              │    │              │
        │ Publishes:   │      │ Publishes:   │    │ Publishes:   │
        │ - sas/relay/ │      │ - smib/config│    │ - smib/config│
        │   [relayId]  │      │ - sas/gli/   │    │ - sas/gli/   │
        │              │      │   server/... │    │   server/... │
        └──────────────┘      └──────────────┘    └──────────────┘
                 │
                 │ SSE Stream
                 ▼
        ┌──────────────┐
        │   Frontend   │
        │     UI       │
        │ (React/Next) │
        └──────────────┘
```

## Message Protocols

### Configuration Request Format
All configuration requests follow this base structure:

```json
{
  "typ": "cfg",
  "comp": "component_name"
}
```

### Supported Components

#### 1. MQTT Configuration Request
```json
{
  "typ": "cfg",
  "comp": "mqtt"
}
```

#### 2. OTA (Over-The-Air) Configuration Request
```json
{
  "typ": "cfg",
  "comp": "ota"
}
```

#### 3. COMS (Communication) Configuration Request
```json
{
  "typ": "cfg",
  "comp": "coms"
}
```

#### 4. Network Configuration Request
```json
{
  "typ": "cfg",
  "comp": "net"
}
```

#### 5. App Configuration Request
```json
{
  "typ": "cfg",
  "comp": "app"
}
```

## Update Payloads

### MQTT Configuration Update
```json
{
  "typ": "cfg",
  "comp": "mqtt",
  "mqttSecure": 0,
  "mqttQOS": 2,
  "mqttURI": "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883",
  "mqttSubTopic": "sas/relay/",
  "mqttPubTopic": "sas/gli/server",
  "mqttCfgTopic": "smib/config",
  "mqttIdleTimeS": 30
}
```

### COMS Configuration Update
```json
{
  "typ": "cfg",
  "comp": "coms",
  "comsMode": 1,
  "comsAddr": 1,
  "comsRateMs": 200,
  "comsRTE": 0,
  "comsGPC": 0
}
```

### Network Configuration Update
```json
{
  "typ": "cfg",
  "comp": "net",
  "netMode": 0,
  "netStaSSID": "Cloudy-SMIB",
  "netStaPwd": "dynamic1group",
  "netStaChan": 1
}
```

## Response Format

### Standard Response Structure
All responses from SMIB devices include the relay ID and follow this format:

```json
{
  "rly": "e831cdfa8384",
  "typ": "cfg",
  "comp": "component_name",
  // Component-specific fields...
}
```

### MQTT Configuration Response
```json
{
  "rly": "e831cdfa8384",
  "typ": "cfg",
  "comp": "mqtt",
  "mqttSecure": 0,
  "mqttQOS": 2,
  "mqttURI": "mqtt://rabbit.sbox.site:1883",
  "mqttSubTopic": "sas/relay/78421c1bf944",
  "mqttPubTopic": "sas/gli/server",
  "mqttCfgTopic": "smib/config",
  "mqttIdleTimeS": 30
}
```

### Network Configuration Response
```json
{
  "rly": "78421c1bf944",
  "typ": "cfg",
  "comp": "net",
  "netMode": 0,
  "netStaSSID": "Cloudy-SMIB",
  "netStaPwd": "dynamic1group",
  "netStaChan": 1
}
```

## Field Definitions

### MQTT Configuration Fields
- `mqttSecure`: TLS/SSL enabled (0 = disabled, 1 = enabled)
- `mqttQOS`: Quality of Service level (0, 1, or 2)
- `mqttURI`: Complete MQTT broker URI with credentials
- `mqttSubTopic`: Topic prefix for subscribing to SMIB messages
- `mqttPubTopic`: Topic prefix for publishing to SMIB devices
- `mqttCfgTopic`: Topic for configuration responses
- `mqttIdleTimeS`: Idle timeout in seconds

### COMS Configuration Fields
- `comsMode`: Communication mode (0 = SAS, 1 = Non-SAS, 2 = IGT)
- `comsAddr`: Communication address
- `comsRateMs`: Communication rate in milliseconds
- `comsRTE`: Real-time enable flag (0 = disabled, 1 = enabled)
- `comsGPC`: Game protocol configuration

### Network Configuration Fields
- `netMode`: Network mode (0 = WiFi Station mode)
- `netStaSSID`: WiFi network name
- `netStaPwd`: WiFi password
- `netStaChan`: WiFi channel

## Implementation Examples

### Complete Flow Example

#### 1. Frontend Request
```typescript
// In Cabinet Details Page
const relayId = "e831cdfa8384";
await requestLiveConfig(relayId, "mqtt");
```

#### 2. API Route Processing
```typescript
// In /api/mqtt/config/request/route.ts
const { relayId, component } = await request.json();
await mqttService.requestConfig(relayId, component);
```

#### 3. MQTT Service Publishing
```typescript
// In mqttService.ts
const topic = `sas/relay/${relayId}`;
const payload = JSON.stringify({ typ: "cfg", comp: component });
this.client.publish(topic, payload);
```

#### 4. SMIB Response
```json
{
  "rly": "e831cdfa8384",
  "typ": "cfg",
  "comp": "mqtt",
  "mqttSecure": 0,
  "mqttQOS": 2,
  "mqttURI": "mqtt://rabbit.sbox.site:1883",
  "mqttSubTopic": "sas/relay/e831cdfa8384",
  "mqttPubTopic": "sas/gli/server",
  "mqttCfgTopic": "smib/config",
  "mqttIdleTimeS": 30
}
```

#### 5. Backend Processing
```typescript
// In mqttService.ts
const callback = this.configCallbacks.get(relayId);
if (callback) {
  callback(payload);
}
```

#### 6. SSE Forwarding
```typescript
// In /api/mqtt/config/subscribe/route.ts
const sseMessage = {
  type: "config_update",
  relayId: payload.rly,
  component: payload.comp,
  data: payload,
};
controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
```

#### 7. Frontend Update
```typescript
// In useSmibConfiguration.ts
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "config_update" && message.data.comp === "mqtt") {
    setFormData(prev => ({
      ...prev,
      mqttPubTopic: message.data.mqttPubTopic,
      mqttCfgTopic: message.data.mqttCfgTopic,
      mqttURI: message.data.mqttURI,
    }));
  }
};
```

## Error Handling

### Connection Errors
- **WebSocket Connection Failed**: Check MQTT broker URL and credentials
- **Topic Subscription Failed**: Verify topic permissions and format
- **Message Publishing Failed**: Check payload format and topic existence

### Response Errors
- **Invalid JSON**: Parse error in response payload
- **Missing Fields**: Required fields not present in response
- **Invalid Values**: Field values outside expected range

## Security Considerations

1. **Credentials**: MQTT credentials are embedded in URIs - ensure secure transmission
2. **TLS/SSL**: Use `mqttSecure: 1` for encrypted connections in production
3. **Topic Permissions**: Restrict topic access based on device roles
4. **Authentication**: Implement proper MQTT authentication mechanisms

## Testing

### Manual Testing
Use the provided HTML example (`mqtt-example.html`) to test basic connectivity:

```bash
# Open mqtt-example.html in browser
# Test connection to MQTT broker
# Publish test messages to sas/relay/[relayId]
# Subscribe to smib/config for responses
```

### API Testing
Use the MQTT test API endpoints:

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

## Troubleshooting

### Common Issues

1. **No Response from SMIB**
   - Verify relayId is correct
   - Check SMIB device is online
   - Confirm MQTT broker connectivity

2. **Invalid Configuration Updates**
   - Validate JSON payload format
   - Check field names and types
   - Verify required fields are present

3. **Connection Timeouts**
   - Check network connectivity
   - Verify MQTT broker is running
   - Confirm firewall settings

### Debug Logging
Enable debug logging in the MQTT service to troubleshoot issues:

```javascript
// In mqttService.ts
console.log("📡 Publishing to:", topic, payload);
console.log("📡 Received from:", topic, message.toString());
```

## References

- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)
- [MQTT Protocol Specification](https://mqtt.org/mqtt-specification/)
- [SMIB Hardware Documentation](internal-reference)
- [Casino Management System API](internal-reference)