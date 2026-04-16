# Collection Reporting Pillar (Collections)

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** April 2026  
**Version:** 4.3.0

---

## 1. System Overview

The Collection Reporting system is the primary workflow for reconciling physical machine cash with electronic SAS meters. It ensures that the casino's reported profit matches the actual bank deposits.

### Key Capabilities
- **Multi-Step Collection Wizard**: Guided flow for Drop, Soft Count, and Variance Audit.
- **SAS Calibration**: Real-time tools to identify SMIB/Meter drift.
- **Master History Fix**: Automated resolution of "Ghost Meter" entries or overlapping reporting periods.
- **Profit Calculation**: Complex sharing logic (Partner Profit, Tax, Licensee Net) computed on-the-fly.

---

## 2. Technical Architecture

- **`CollectionReport`**: The top-level document summarizing multiple machines/locations.
- **`Collection`**: individual machine-level records containing snapshots of `sasMeters` and `physicalCount`.
- **`History`**: High-performance time-series entries that link collections to historical machine status.

### Performance Strategies
- **Batch Processing**: The system processes hundreds of machines in parallel during "Finalization."
- **Immutable Records**: Once a report is "Closed," it cannot be modified; any corrections require a `Fix Report` transaction.

---

## 3. Frontend Implementation (`app/collection-report`)

- **Main Dashboard**: Overview of recent reports, pending variances, and total revenue.
- **Collection Wizard**: A structured UI with 3-panels:
  1. **Drop Verification** (Electronic SAS).
  2. **Soft Count Entry** (Physical Cash).
  3. **Variance Audit** (Resolution).
- **History Fix Tool**: specialized interface for technicians to manually bridge gaps in reporting history.

---

## 4. Business Logic (Critical)

- **BR-COL-01**: A report cannot be closed if any machine has an "Unresolved Variance" above the property's tolerance (Default: \$50).
- **BR-COL-03**: The "Source of Truth" for financials is always the **Physical Soft Count**. If SAS differs, the variance is logged and a "Meter Sync" is forced.

---

## 5. Technical Documentation
For deep-dive documentation on API endpoints, data flow, and the calculation pipeline, refer to the [Collections Technical Reference](./COLLECTIONS_TECHNICAL_REFERENCE.md).

---
**Maintained By**: Evolution One Development Team
