# Inter-Property Transfers Documentation
**Component:** `VaultTransfersPageContent`, `InterLocationTransferForm`
**Route:** `/vault/transfers`

## Overview
Transfers manage the movement of physical cash between different gaming properties (e.g., from Main Casino to Mini-Casino).

## The Transfer Workflow

### 1. Initiating a Transfer (Outgoing)
1.  **Select Destination:** Choose the receiving property from assigned locations.
2.  **Enter Amount:** Specify the total value.
3.  **Specify Denominations:** Record exactly which bills are leaving the building.
4.  **Submission:** The funds are logically "in transit." They are deducted from the source Vault's `currentBalance` but not yet added to the destination.

### 2. Receiving a Transfer (Incoming)
Managers at the destination property can view incoming "In-Transit" transfers.
1.  **Count Funds:** Physically verify the bills received.
2.  **Approve:** Clicking "Approve" adds the funds to the destination Vault's `currentBalance`.
3.  **Discrepancy:** If the count doesn't match, the manager can **Reject** the transfer, requiring a full audit/void sequence.

## Features
*   **Transfer History:** A table tracking all Sent and Received funds.
*   **In-Transit Status:** Highlights funds currently between buildings to ensure they aren't "lost" in the system.

## API Interface
*   **List Transfers:** `GET /api/vault/transfers?locationId=[ID]`
*   **Create Transfer:** `POST /api/vault/transfers`
*   **Approve Transfer:** `POST /api/vault/transfers/approve`
*   **Reject Transfer:** `POST /api/vault/transfers/reject`
