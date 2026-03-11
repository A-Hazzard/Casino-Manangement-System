import nodemailer from 'nodemailer';

/**
 * Email Service
 * 
 * Provides utility for sending emails using Gmail SMTP.
 * Used for 2FA recovery and other system communications.
 */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: `"Evolution One CMS" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('[EmailService] Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Send error:', error);
    return { success: false, error };
  }
}

export async function send2FARecoveryEmail(email: string, recoveryToken: string) {
  const recoveryUrl = `${process.env.API_BASE_URL}/auth/recovery/2fa?token=${recoveryToken}`;
  
  const subject = '2FA Recovery - Evolution One CMS';
  const text = `You requested a 2FA reset. Please use the following link to reset your authenticator: ${recoveryUrl}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #1a202c;">2FA Recovery Request</h2>
      <p style="color: #4a5568;">You requested a reset for your Google Authenticator. Click the button below to set up a new one.</p>
      <div style="margin: 30px 0;">
        <a href="${recoveryUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Authenticator</a>
      </div>
      <p style="color: #718096; font-size: 14px;">If you did not request this, please ignore this email or contact security.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #a0aec0; font-size: 12px;">Evolution One CMS Security Agent</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}
