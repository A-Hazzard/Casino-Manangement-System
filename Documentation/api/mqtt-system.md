# MQTT & Real-Time Logistics Architecture

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.0.0

---

## 1. System Overview

The MQTT bus is the "Central Nervous System" of the CMS. It facilitates low-latency, bidirectional communication between thousands of hardware SMIBs and the centralized cloud backend.

---

## 2. Topic Structure

Every device follows a strict hierarchical naming convention:

### 💓 Telemetry (Machine -> Backend)
- **`sunbox/[clientId]/heartbeat`**: Periodic ping (60s) used for Online/Offline status.
- **`sunbox/[clientId]/meters`**: Real-time SAS meter snapshots (Bill counts, coin flow).
- **`sunbox/[clientId]/events`**: Instant alerts (Card-In, Door Open, Jackpot Hit).

### ⌨️ Command (Backend -> Machine)
- **`config/[clientId]/command`**: Used for Lock/Unlock or Sync requests.
- **`config/[clientId]/firmware`**: Channel for delivering software update instructions.

### 🐞 Debug (The Raw Stream)
- **`raw/[clientId]/sas`**: A HEX-stream of the raw SAS-05 communication between the SMIB and the slot machine cabinet. Used by Technicians for forensic troubleshooting.

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
