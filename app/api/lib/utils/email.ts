import sgMail from '@sendgrid/mail';

// Set the API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

/**
 * Sends an email using SendGrid.
 *
 * @param to - Recipient email address.
 * @param subject - Email subject.
 * @param text - Plain text content.
 * @param html - HTML content.
 * @returns Promise resolving to an object indicating success or failure, and an optional message.
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  from?: string
) {
  try {
    const msg = {
      to,
      from: from || process.env.EMAIL_FROM || process.env.EMAIL_USER || '', // Use provided from, or fallback to env vars
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      message: errorMessage,
    };
  }
}

