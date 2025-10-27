# SMIB Management System Specification

## 1. Overview

The SMIB Management System provides centralized control, monitoring, and maintenance of SMIB devices deployed across one or more locations. It includes capabilities for configuration management, MQTT-based communication, over-the-air firmware updates, device restarts, and smart search features for identifying or recovering misconfigured SMIBs.

## 2. Functional Requirements

### 2.1 Configuration Management

#### 2.1.1 Get and Update SMIB Configurations

- The system shall support retrieving current configurations for individual SMIBs and all SMIBs at a specified location.
- The system shall support updating configuration parameters such as:
  - Network settings
  - MQTT settings
  - Communication protocol configurations

#### 2.1.2 Configuration Version Tracking

- Each configuration record shall include:
  - Last Updated: Timestamp of the most recent configuration change.

#### 2.1.3 Network Configuration

The system shall manage network parameters such as:

- Network mode (static/dynamic)
- SSID and Password
- Channel
- Network mode

#### 2.1.4 MQTT Configuration

The system shall support updating MQTT broker details, including:

- Broker URL / IP
- Port
- Credentials (username, password)
- Topic prefixes and subscriptions
- Keep-alive interval and QoS level

#### 2.1.5 Communication Settings

The system shall manage communication parameters used between SMIB and external services or devices, including:

- Communication mode (IGT, SAS, Pulse) — abstracted away from communication modes 1, 2, and 3 used internally
- Polling rates
- RTE Mode
- GPC
- Address

### 2.2 Over-the-Air (OTA) Update Management

#### 2.2.1 OTA Update Links

- The system shall allow specifying update URLs for firmware.

#### 2.2.2 OTA Update Prompt

The system shall be able to:

- Prompt a SMIB to initiate an OTA update.
- Track and display OTA update status (pending, in progress, complete, failed).

#### 2.2.3 Firmware Directory Management

The system shall maintain a directory of available firmware builds that can be deployed via OTA.

Each firmware entry shall contain:

- Firmware version
- Build date
- Target device compatibility

### 2.3 Meter Management

#### 2.3.1 Get Meters Command

The system shall support a Get Meters command to retrieve accounting information to verify that the machine is communicating properly.

#### 2.3.2 Meter Scope

The command shall operate at two levels:

- Single Machine: Retrieve meter data from one SMIB.
- Location-wide: Retrieve meter data from all SMIBs at a specified location.

#### 2.3.3 Reset Meters on Non-SAS Machines

The system must be able to clear meter memory on non-SAS machines.

### 2.4 SMIB Restart Management

#### 2.4.1 Restart Operations

The system shall allow restart operations to be triggered:

- For a single SMIB.
- For all SMIBs at a location.

#### 2.4.2 Restart Confirmation

Upon restart, each SMIB shall publish a confirmation via MQTT to indicate successful reboot and reinitialization.

### 2.5 Accounting Display

#### 2.5.1 Show Accounting Denomination

The system shall provide a command or UI view to display accounting denominations reported by the SMIB (e.g., counts or totals by denomination type).

### 2.6 SMIB Search and Recovery

#### 2.6.1 SMIB Search

- The system shall allow searching for SMIBs by ID or partial ID.
- The system shall support fuzzy or partial matching against known SMIB IDs.

#### 2.6.2 MQTT Stream Listening

- The system shall listen to the MQTT message stream for SMIB activity (heartbeat, configuration, or status messages).
- If a message partially matches a search query, the system shall:
  - Log and display potential matches.
  - Allow the user to confirm a match.

#### 2.6.3 Restart for Confirmation

The system shall be capable of issuing a restart command to SMIBs that partially match a search pattern, to confirm active connection and identity.

#### 2.6.4 Recently Restarted SMIBs

The system shall display a list of SMIBs that have been recently restarted, to assist in match confirmation and diagnostics.

## 3. Non-Functional Requirements

### 3.1 Communication

- All communication between the system and SMIBs shall use secure MQTT (MQTTS) where supported.
- The system shall handle message loss gracefully and retry failed operations.

### 3.2 Performance

- Configuration updates should propagate within 2 seconds under normal network conditions.
- OTA update prompts should be acknowledged within 10 seconds.

### 3.3 Reliability

- The system should maintain state consistency across reboots.
- Failed OTA updates should revert to the last known working firmware version.

### 3.4 Scalability

- The system shall support managing at least 100 SMIBs per location and up to 1,000 SMIBs in total.

### 3.5 Auditability

- All configuration changes, restarts, and OTA updates shall be logged with timestamps and user identifiers.

## 4. Interfaces

| Interface                         | Description                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| MQTT Broker                       | Used for real-time communication, telemetry, configuration updates, and command execution.           |
| REST API                          | Used by external services or dashboards to manage configurations, initiate updates, and view status. |
| Web UI                            | Used by operators to monitor, update, and search SMIBs.                                              |
| File Storage (Firmware Directory) | Stores firmware binaries and metadata for OTA updates.                                               |
