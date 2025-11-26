/**
 * Email Utility Functions
 *
 * Utility functions for sending emails via SendGrid.
 *
 * Features:
 * - SendGrid integration
 * - HTML and plain text email support
 * - Error handling
 * - Environment-based configuration
 */

import sgMail from '@sendgrid/mail';

// ============================================================================
// SendGrid Configuration
// ============================================================================
// Set the API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// ============================================================================
// Email Functions
// ============================================================================
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
  html: string
) {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM || '', // Your verified sender email in SendGrid
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
