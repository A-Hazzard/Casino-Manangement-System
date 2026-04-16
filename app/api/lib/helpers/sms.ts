import { Member } from '@/app/api/lib/models/members';
import type { CasinoMember } from '@/shared/types';
import { AuthType, Infobip } from '@infobip-api/sdk';

/**
 * SMS Service Configuration
 * 
 * Uses Infobip SDK to send SMS messages.
 */

// Lazy-loaded Infobip client to prevent build-time errors in environments with missing env vars
let infobip: Infobip | null = null;

function getInfobipClient(): Infobip {
  if (infobip) return infobip;

  const baseUrl = process.env.INFOBIP_BASE_URL;
  const apiKey = process.env.INFOBIP_API_KEY;

  if (!baseUrl || !apiKey) throw new Error(
    `Infobip configuration missing. INFOBIP_BASE_URL: ${!!baseUrl}, INFOBIP_API_KEY: ${!!apiKey}`
  );

  infobip = new Infobip({
    baseUrl,
    apiKey,
    authType: AuthType.ApiKey,
  });

  return infobip;
}

/**
 * Sends a generic SMS message via Infobip.
 * Validates the Infobip response — HTTP 200 does NOT guarantee delivery.
 * Infobip returns per-message status codes that must be checked.
 *
 * @param to - Recipient phone number in E.164 format (e.g. +18684921566)
 * @param text - Message content
 * @param from - Sender ID — must be registered on the Infobip account
 */
export async function sendSMS(to: string, text: string, from: string = 'InfoSMS') {
  const client = getInfobipClient();

  console.info(`[SMS] Sending to ${to} from "${from}"`);

  // NOTE: @infobip-api/sdk swallows errors — it returns them instead of throwing.
  // We must check if the returned value is an Error before accessing .data.
  const response = await client.channels.sms.send({
    messages: [{ from, destinations: [{ to }], text }],
  });

  // SDK returned an Error object (e.g. 401 Unauthorized, bad config, network error)
  if (response instanceof Error) {
    // Axios errors carry response details on .response.data
    const axiosData = (response as unknown as { response?: { status?: number; data?: unknown } }).response;
    if (axiosData) {
      console.error(`[SMS] Infobip HTTP ${axiosData.status} error for ${to}:`, JSON.stringify(axiosData.data, null, 2));
      throw new Error(`Infobip API error ${axiosData.status}: ${JSON.stringify(axiosData.data)}`);
    }
    console.error(`[SMS] Infobip SDK error for ${to}:`, response.message);
    throw new Error(`SMS send failed: ${response.message}`);
  }

  // Log the full Infobip response for debugging
  const rawResponse = response.data as Record<string, unknown> | undefined;
  console.info(`[SMS] Infobip raw response:`, JSON.stringify(rawResponse, null, 2));

  if (!rawResponse) {
    console.error(`[SMS] Infobip response.data is undefined for ${to} — response keys:`, Object.keys(response ?? {}));
    throw new Error('SMS send failed: Infobip returned no response body');
  }

  // Infobip returns messages[] with per-message status — check it
  const messages = (rawResponse.messages as Array<{
    messageId?: string;
    status?: { groupName?: string; name?: string; description?: string; groupId?: number };
    to?: string;
  }>) ?? [];

  if (messages.length === 0) {
    console.error(`[SMS] Infobip returned no messages array for recipient ${to}. Full response:`, JSON.stringify(rawResponse, null, 2));
    throw new Error('SMS send failed: Infobip returned no message confirmation');
  }

  const msg = messages[0];
  const status = msg.status;

  console.info(`[SMS] Message ${msg.messageId} → to: ${msg.to}, status: ${status?.groupName} / ${status?.name} — "${status?.description}"`);

  // groupId 1 = PENDING (accepted), 3 = DELIVERED — anything else is a failure
  // groupId 2 = UNDELIVERABLE, 5 = REJECTED, etc.
  const acceptedGroupIds = [1, 3];
  if (status?.groupId !== undefined && !acceptedGroupIds.includes(status.groupId)) {
    console.error(`[SMS] Infobip rejected message to ${to}: [${status.groupId}] ${status.groupName} — ${status.description}`);
    throw new Error(`SMS rejected by carrier: ${status.name} — ${status.description}`);
  }

  return {
    messageId: msg.messageId,
    statusGroup: status?.groupName,
    statusName: status?.name,
    statusDescription: status?.description,
  };
}

/**
 * Generates a verification code and sends it to the member's phone number.
 * Updates the member record with the new code and timestamp.
 * 
 * @param memberId - The identifier of the member
 * @param phoneNumber - The phone number to send the code to
 */
export async function sendVerificationSMS(memberId: string, phoneNumber: string) {
  // Generate a 4-digit numeric code
  const smsCode = Math.floor(1000 + Math.random() * 9000);

  // Format phone number with + prefix if not present
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  console.info(`[SMS] sendVerificationSMS → memberId: ${memberId}, phone: ${formattedPhone}`);

  // STEP 1: Send SMS — throws on failure (carrier rejection, config error, etc.)
  const smsResult = await sendSMS(
    formattedPhone,
    `Your Evolution Activation Code: ${smsCode}`
  );

  console.info(`[SMS] SMS accepted for ${formattedPhone} — messageId: ${smsResult.messageId}, status: ${smsResult.statusName}`);

  // STEP 2: Update member record with new code
  const updatedMember = await Member.findOneAndUpdate(
    { _id: memberId },
    { smsCode, smsCodeTime: new Date() },
    { new: true, lean: true }
  );

  if (!updatedMember) throw new Error(`Member with ID ${memberId} not found`);

  console.info(`[SMS] Member ${memberId} updated with new smsCode`);

  // NOTE: smsCode is intentionally NOT returned to the client
  return {
    messageId: smsResult.messageId,
    statusName: smsResult.statusName,
    statusDescription: smsResult.statusDescription,
    phone: formattedPhone,
  };
}

/**
 * Sends the member's existing PIN via SMS.
 * 
 * @param memberId - The identifier of the member
 * @param phoneNumber - The phone number to send the PIN to
 */
export async function sendPINVerificationSMS(memberId: string, phoneNumber: string) {
  try {
    // Retrieve member to get their PIN
    // Cast through unknown to satisfy strict overlap checks per project rules
    const member = (await Member.findOne({ _id: memberId }).lean()) as unknown as CasinoMember | null;

    if (!member) {
      throw new Error(`Member with ID ${memberId} not found`);
    }

    if (!member.pin) {
      throw new Error(`Member with ID ${memberId} has no PIN set`);
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Send the PIN
    await sendSMS(
      formattedPhone,
      `Your Evolution Activation Code: ${member.pin}`
    );

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending PIN SMS';
    console.error('[SMS Helper] sendPINVerificationSMS failed:', errorMessage);
    throw new Error(errorMessage);
  }
}
