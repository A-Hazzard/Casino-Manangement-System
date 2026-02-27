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
 * Sends a generic SMS message.
 * 
 * @param to - Recipient phone number (format: +1234567890)
 * @param text - Message content
 * @param from - Sender ID (default: 'InfoSMS')
 */
export async function sendSMS(to: string, text: string, from: string = 'Bet Cabana Verification') {
  try {
    const infobip = getInfobipClient();
    const response = await infobip.channels.sms.send({
      messages: [
        {
          from,
          destinations: [{ to }],
          text,
        },
      ],
    });
    return { success: true, data: response.data };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending SMS';
    console.error('[SMS Helper] Failed to send SMS:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Generates a verification code and sends it to the member's phone number.
 * Updates the member record with the new code and timestamp.
 * 
 * @param memberId - The identifier of the member
 * @param phoneNumber - The phone number to send the code to
 */
export async function sendVerificationSMS(memberId: string, phoneNumber: string) {
  try {
    // Generate a 4-digit numeric code
    const smsCode = Math.floor(1000 + Math.random() * 9000);

    // Format phone number with + prefix if not present
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // STEP 1: Send SMS via Infobip
    const data = await sendSMS(
      formattedPhone,
      `Your Evolution Activation Code: ${smsCode}`
    );

    // STEP 2: Update member
    const updatedMember = (await Member.findOneAndUpdate(
      { _id: memberId },
      {
        smsCode,
        smsCodeTime: new Date()
      },
      { new: true, lean: true }
    ));

    if (!updatedMember) throw new Error(`Member with ID ${memberId} not found`);

    return { success: true, smsCode, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during SMS verification';
    console.error('[SMS Helper] sendVerificationSMS failed:', errorMessage);
    throw new Error(errorMessage);
  }
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
