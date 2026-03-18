# System Configuration Page Implementation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.1.0

---

## 1. Page Overview

Global management of firmware binaries, localization, and hardware profiles.

---

## 2. Data & API Architecture (By Section)

### 📁 Firmware Repository
| Data Element | Source API | Trigger |
| :--- | :--- | :--- |
| **File List** | `GET /api/config/firmware` | Page Load |
| **Checksum / Size** | `GET /api/config/firmware` | Page Load |
| **Upload Status** | `POST /api/upload/firmware` | File Drop |

- **Implementation**: Files are streamed to GridFS. Progress tracked via an XHR upload event listener.

### 📡 Migration Monitor
| Data Element | Source API | Trigger |
| :--- | :--- | :--- |
| **Job Progress (%)** | `GET /api/config/firmware/jobs` | 5s Polling |
| **Target Machines** | `GET /api/config/firmware/jobs/[id]` | On Expand |

- **Logic**: Migration commands are sent via MQTT; progress is updated in the DB as SMIBs report download completion.

### 🌍 Localization
| Data Element | Source API | Trigger |
| :--- | :--- | :--- |
| **Active Rates** | `GET /api/config/rates` | Page Load |
| **Jurisdiction Flags**| `GET /api/config/settings` | Page Load |

---

## 3. Feature Triggers

- **Push Update**: Triggers `POST /api/config/firmware/migrate` with a list of target `MachineIDs`.
- **Set Tax Rate**: Triggers `PUT /api/config/jurisdiction`.

---

## 4. Role Detection

- **Developer**: Full read/write access to "Binary Seeding" and "Rate Overrides."
- **Admin**: Can trigger migrations but cannot modify the "Master Firmware" records.

---

## 5. Visual Status

- 📦 **Binary Icon**: Green if hash verified; Red if checksum mismatch detected.
- 🚀 **Progress Bar**: Blue (Downloading), Green (Installing), Red (Failed).

---
**Internal Document** - Engineering Team
