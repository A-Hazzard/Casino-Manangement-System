# Detailed Vault Implementation Strategy

**High-Integrity Lifecycle:**
1. **Open Vault**: Property Safe counts are verified.
2. **Floats**: VM approves cash delivery to desks.
3. **Operations**: Cashiers process payouts and ticket redemptions.
4. **Blind Close**: Cashiers enter physical counts for EOD without seeing system numbers.
5. **Review**: Variance > \$5 triggers an automated incident report for the VM.

**TOTP Gating Strategy:**
- **Setup**: One-time scan of Google Authenticator QR.
- **Enforcement**: Middleware checks the `totpCookie` and rejects `/api/vault/*` mutations if verification is > 1 hour old.
