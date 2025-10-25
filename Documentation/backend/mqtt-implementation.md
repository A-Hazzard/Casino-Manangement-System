# MQTT Implementation Documentation

## Overview

This document provides comprehensive documentation for the MQTT implementation in the Evolution One CMS casino machine management system. The MQTT implementation enables real-time communication between the CMS and Slot Machine Interface Boards (SMIBs) for configuration updates, machine control commands, and event monitoring.

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

### Core Service (`lib/services/mqttService.ts`)

The MQTT service is implemented as a singleton class that handles:

- **Connection Management**: Automatic connection, reconnection, and error handling
- **Configuration Publishing**: Sending SMIB configuration updates
- **Machine Control**: Sending control commands to machines
- **Event Handling**: Connection status, errors, and disconnections

#### Key Features

```typescript
class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private config: MQTTConfig;
  private isConnected = false;

  // Connection management
  async connect(): Promise<void>;

  // SMIB configuration updates
  async sendSMIBConfigUpdate(
    cabinetId: string,
    smibConfig: SmibConfig
  ): Promise<void>;

  // Machine control commands
  async sendMachineControlCommand(
    cabinetId: string,
    command: string
  ): Promise<void>;
}
```

#### Configuration

The service uses environment variables for configuration:

```typescript
type MQTTConfig = {
  mqttURI: string; // MQTT broker URI (e.g., "mqtt://localhost:1883")
  mqttPubTopic: string; // Topic for publishing events
  mqttCfgTopic: string; // Topic for configuration updates
};
```

Environment variables:

- `MQTT_URI`: MQTT broker connection string
- `MQTT_CFG_TOPIC`: Configuration topic prefix

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

### SMIB Configuration Endpoint

**POST** `/api/cabinets/[cabinetId]/smib-config`

Updates SMIB configuration and sends via MQTT.

#### Request Body

```json
{
  "smibConfig": {
    "coms": { "comsMode": 0 },
    "net": { "netMode": 1, "netStaSSID": "Casino_WiFi" },
    "mqtt": { "mqttURI": "mqtt.casino.com" }
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

### Get Configuration Endpoint

**GET** `/api/cabinets/[cabinetId]/smib-config`

Retrieves current SMIB configuration.

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

## Frontend Integration

### SMIB Configuration Hook

The frontend uses a custom hook (`useSmibConfiguration`) to manage:

- **Form State**: Configuration form data and validation
- **Edit Mode**: Toggle between view and edit modes
- **Data Synchronization**: Sync with backend data
- **Save Operations**: Handle configuration saves with MQTT publishing

### Key Components

#### Cabinet Details Page

- **SMIB Configuration Section**: Expandable section with configuration options
- **Edit Mode**: Toggle to enable/disable editing
- **Save Buttons**: Individual save buttons for different configuration sections
- **Machine Controls**: RESTART, LOCK, UNLOCK buttons

#### Form Fields

- **Communication Mode**: SAS/non-SAS/IGT selection
- **Network Configuration**: WiFi SSID, password, channel
- **MQTT Configuration**: Host, port, TLS, authentication
- **Firmware Version**: Version selection and update

## Topic Structure

### MQTT Topics

The system uses a hierarchical topic structure:

```
smib/config/{cabinetId}/control    # Machine control commands
smib/config/{cabinetId}/config     # Configuration updates
smib/events/{cabinetId}            # Event publishing
sas/gy/server                      # SAS server communication
sas/relay/{cabinetId}              # SMIB-specific SAS topics
```

### Topic Examples

```
smib/config/e831cdfa8464/control   # Control commands for cabinet e831cdfa8464
smib/config/e831cdfa8464/config    # Configuration for cabinet e831cdfa8464
smib/events/e831cdfa8464           # Events from cabinet e831cdfa8464
sas/relay/e831cdfa8464             # SAS communication for cabinet e831cdfa8464
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

### Development Testing

1. **Local MQTT Broker**: Use Mosquitto for local development

   ```bash
   # Install Mosquitto
   sudo apt-get install mosquitto mosquitto-clients

   # Start broker
   mosquitto -v
   ```

2. **Test Client**: Use mosquitto_pub/sub for testing

   ```bash
   # Subscribe to configuration topics
   mosquitto_sub -h localhost -t "smib/config/+/config"

   # Publish test message
   mosquitto_pub -h localhost -t "smib/config/test/config" -m '{"test": "message"}'
   ```

### Debugging Tools

1. **Console Logging**: Comprehensive logging in MQTT service
2. **Network Monitoring**: Monitor MQTT traffic with Wireshark
3. **Broker Logs**: Check MQTT broker logs for connection issues
4. **Frontend DevTools**: Use browser dev tools to debug API calls

### Common Issues

1. **Connection Refused**: Check MQTT broker is running and accessible
2. **Authentication Failed**: Verify MQTT credentials
3. **Message Not Received**: Check topic names and subscriptions
4. **QoS Issues**: Verify QoS levels match between publisher and subscriber

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

## Future Enhancements

### Planned Features

1. **Real-time Monitoring**: Live status monitoring of SMIB devices
2. **Batch Operations**: Bulk configuration updates for multiple machines
3. **Configuration Templates**: Predefined configuration templates
4. **Event Streaming**: Real-time event streaming from machines
5. **Analytics Integration**: Integration with analytics systems

### Technical Improvements

1. **Message Compression**: Implement message compression for large configurations
2. **Caching**: Implement configuration caching for improved performance
3. **WebSocket Integration**: Real-time updates via WebSocket
4. **GraphQL Support**: GraphQL API for flexible data querying

## Conclusion

The MQTT implementation provides a robust, scalable solution for casino machine management. It enables real-time configuration updates, machine control, and event monitoring through a well-structured publish-subscribe architecture. The implementation follows best practices for security, error handling, and performance optimization.

For questions or issues, refer to the development team or check the project documentation.
