# MQTT & Real-Time Logistics Architecture

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** May 4, 2026  
**Version:** 4.3.0

---

## 1. System Overview

The MQTT bus is the "Central Nervous System" of the CMS. It facilitates low-latency, bidirectional communication between thousands of hardware SMIBs and the centralized cloud backend.

---

## 2. Topic Structure

### 📤 Publish (Backend -> Device)

- **`sas/relay/{relayId}`** (env: `MQTT_PUB_TOPIC`, default: `sas/relay/`): Commands sent to individual SMIB relays (Lock/Unlock, Sync, firmware updates). The `{relayId}` identifies the target device.

### 📥 Subscribe (Device -> Backend)

- **`sas/gy/server`** (env: `MQTT_SUB_TOPIC`, default: `sas/gy/server`): Primary topic for device responses — SAS meter snapshots, events, heartbeat, and status messages from all SMIBs.
- **`sas/server`** (hardcoded): Additional subscribe topic used for server-wide notifications.

### ⚙️ Config

- **`smib/config`** (env: `MQTT_CFG_TOPIC`, default: `smib/config`): Configuration channel for device provisioning and parameter updates.

### 🐞 GLI Integration

- **`sas/gli/server/{relayId}`** (env: `MQTT_GLI_TOPIC`, default: `sas/gli/server/`): Dedicated topic for GLI (Gaming Laboratories International) server communication with specific relays.

---

## 3. High-Level Logic (How it works)

### 📡 The MQTT Hub (Node.js)

- **The Singleton**: A persistent `MQTTClient` instance manages the connection pool.
- **Message Router**: When a package arrives, the router identifies the `action` and delegates to the correct service (e.g. `EventService`, `MeterSyncService`).

### 📦 Reliability (QoS 1)

All financial messages (Meters/Events) use **Quality of Service (QoS) Level 1**.

- **Logic**: The SMIB will continue to re-publish a message until the backend sends an `ACK` (Acknowledgement). This prevents data loss during intermittent internet outages.

---

## 4. Icons & Visual Status

- 📡 **Radio Icon**: Indicates a successful MQTT handshake.
- 💤 **Sleep Icon**: Indicates a "Last Will" message was received (Graceful disconnect).
- ⚡ **Flash Icon**: High-priority real-time alert (Jackpot).

---

## 5. Security & Encryption

### 🛡️ Transport Security

- **TLS/SSL**: All traffic is encrypted via MQTTS (Port 8883) to prevent sniffing of sensitive financial data on property networks.
- **ACL (Access Control Lists)**: Each SMIB is provisioned with a unique token that only allows it to publish/subscribe to its own designated sub-topics.

---

**Technical Reference** - IoT & Security Team
