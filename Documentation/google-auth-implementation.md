# Google Authenticator (TOTP) Implementation Guide

This document explains how Two-Factor Authentication (2FA) via Google Authenticator is implemented in the Evolution One CMS.

## 1. Overview

The system uses **Time-based One-Time Passwords (TOTP)** as defined in [RFC 6238](https://tools.ietf.org/html/rfc6238). This allows users to generate 6-digit verification codes on their mobile devices (via Google Authenticator, Authy, etc.) that rotate every 30 seconds.

## 2. Technical Stack

- **Library**: `otplib` (v13+) for secret generation and verification.
- **QR Codes**: `qrcode` for generating setup QR codes.
- **Storage**: User secrets are stored in the `UserModel` as `totpSecret` (Base32 encoded).

---

## 3. Core Workflow

### Phase A: Setup Flow
1. **Initiate**: The frontend calls `/api/auth/totp/setup`.
2. **Generate**: The backend generates a Base32 secret and an `otpauth://` URI.
3. **Display**: The frontend displays a QR code (generated from the URI).
4. **Confirm**: The user scans the QR and enters the first 6-digit code.
5. **Activate**: The backend verifies the code and sets `totpEnabled: true` in the DB.

### Phase B: Verification (Gating) Flow
1. **Trigger**: A sensitive action (e.g., viewing a password) is intercepted.
2. **Check**: The frontend checks the user's 2FA status (`/api/auth/totp/status`).
3. **Prompt**: If enabled, the `VaultAuthenticatorModal` appears.
4. **Verify**: The user enters their code, which is sent to `/api/auth/verify-totp`.
5. **Proceed**: If valid, the modal closes and the original action continues.

---

## 4. API Endpoints

### `GET /api/auth/totp/status`
Checks the 2FA status for the logged-in user.
- **Returns**: `{ enabled: boolean, hasSecret: boolean, needsSetup: boolean }`

### `POST /api/auth/totp/setup`
Initiates the setup process by generating or retrieving the user's secret.
- **Returns**: `{ success: true, qrCodeUrl: string, secret: string }`

### `POST /api/auth/totp/confirm`
Standardizes the setup by verifying the very first code.
- **Body**: `{ token: string }`
- **Logic**: If valid, updates user record to `totpEnabled: true`.

### `POST /api/auth/verify-totp`
The primary verification endpoint used for gating sensitive actions.
- **Body**: `{ token: string }`
- **Returns**: `{ success: true }` or `{ error: string }`

---

## 5. Helper Functions (`lib/helpers/auth/totp.ts`)

| Function | Purpose |
| :--- | :--- |
| `generateTOTPSecret()` | Creates a random Base32 string using `otplib`. |
| `generateOTPAuthURI()` | Creates the `otpauth://` string required for QR codes. |
| `verifyTOTPCode(token, secret)` | Validates a 6-digit code. Includes a **60-second drift tolerance** (to handle clocks being slightly off on mobile devices). |

---

## 6. Frontend Components

### `VaultAuthenticatorModal.tsx`
The primary UI gate. It handles:
- Checking if the user needs to set up 2FA for the first time.
- Displaying the 6-digit input field.
- Executing the verification against the API.

### `VaultAuthenticatorSetup.tsx`
A sub-component that guides the user through scanning the QR code and confirming their first code.

---

## 7. Security Notes

- **Secret Storage**: Secrets should be treated with the same sensitivity as passwords.
- **Drift Tolerance**: We allow a ±1 step tolerance (60 seconds) to ensure a good user experience even if the mobile device's clock is slightly out of sync.
- **Session Protection**: All 2FA endpoints are protected by the standard session middleware and require a valid logged-in user.
