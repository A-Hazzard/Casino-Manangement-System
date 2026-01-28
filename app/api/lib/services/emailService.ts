/**
 * Email Service
 *
 * Email service using Gmail SMTP with app password authentication.
 * Handles sending emails with HTML templates for cashier onboarding.
 *
 * @module app/api/lib/services/emailService
 */

import nodemailer from 'nodemailer';

type EmailData = {
  to: string;
  subject: string;
  html: string;
};

type CashierWelcomeEmailData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
};

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter with Gmail configuration
   */
  private initializeTransporter(): void {
    if (!process.env.GMAIL_APP_PASSWORD || !process.env.GMAIL_USER) {
      console.error('❌ Email Service: Missing Gmail configuration');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  /**
   * Generate HTML template for cashier welcome email
   */
  private generateCashierWelcomeTemplate(
    data: CashierWelcomeEmailData
  ): string {
    const { firstName, lastName, username, email, tempPassword, loginUrl } = data;
    
    // Sanitize URL: remove quotes and trim
    const sanitizedUrl = loginUrl.replace(/['"]+/g, '').trim();
    const finalUrl = sanitizedUrl.startsWith('http') ? sanitizedUrl : 'http://' + sanitizedUrl;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Evolution One CMS</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ECF0F9;
          }
          .container {
            background-color: #FFFFFF;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            background-color: #2ab2e8;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .welcome-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 25px;
            text-align: center;
          }
          .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #2ab2e8;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .info-item {
            margin-bottom: 12px;
            font-size: 16px;
          }
          .info-label {
            font-weight: 600;
            color: #555;
            display: inline-block;
            width: 120px;
          }
          .info-value {
            color: #333;
            font-weight: 500;
          }
          .password-box {
            background-color: #fff3cd;
            border: 2px solid #FFA203;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .password-label {
            font-size: 14px;
            color: #856404;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .password-value {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
          }
          .login-button {
            display: inline-block;
            background-color: #2ab2e8;
            color: #ffffff !important;
            padding: 15px 35px;
            text-decoration: none !important;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            margin: 30px 0;
            cursor: pointer !important;
            transition: background-color 0.3s ease;
          }
          .login-button:hover {
            background-color: #09920a;
          }
          .security-note {
            background-color: #e3f2fd;
            border: 1px solid #4EA7FF;
            border-radius: 6px;
            padding: 15px;
            margin-top: 25px;
            font-size: 14px;
            color: #0c5460;
          }
          .security-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #0a58ca;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
          }
          .highlight {
            color: #2ab2e8;
            font-weight: 600;
          }
          .warning {
            color: #FFA203;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">EVOLUTION ONE</div>
          </div>
          
          <h1 class="welcome-text">Welcome to Evolution One CMS!</h1>
          
          <div class="info-box">
            <div class="info-item">
              <span class="info-label">Name:</span>
              <span class="info-value">${firstName} ${lastName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Username:</span>
              <span class="info-value">${username}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${email}</span>
            </div>
          </div>

          <div class="password-box">
            <div class="password-label">⚠️ IMPORTANT: Your Temporary Password</div>
            <div class="password-value">${tempPassword}</div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${finalUrl}"
              style="background-color: #2ab2e8; color: #ffffff !important; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; min-width: 200px;">
              Login to Your Account
            </a>
          </div>

          <div class="security-note">
            <div class="security-title">🔒 Security Notice:</div>
            <ul style="margin: 0; padding-left: 20px;">
              <li>You will be <span class="warning">required to change this temporary password</span> upon your first login.</li>
              <li>Choose a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.</li>
              <li>Never share your password with anyone.</li>
              <li>If you didn't request this account, please contact your administrator immediately.</li>
            </ul>
          </div>

          <div class="footer">
            <p>This is an automated message from Evolution One CMS.</p>
            <p>For support, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send cashier welcome email with temporary password
   */
  async sendCashierWelcomeEmail(
    data: CashierWelcomeEmailData
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      this.initializeTransporter();
    }

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email transporter not initialized. Check Gmail configuration.',
      };
    }

    const html = this.generateCashierWelcomeTemplate(data);

    const mailOptions: EmailData = {
      to: data.email,
      subject: `Welcome to Evolution One CMS - Your Account Details`,
      html,
    };

    try {
      console.log(`📧 Sending welcome email to cashier: ${data.email}`);

      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
      });

      console.log(`✅ Welcome email sent successfully to: ${data.email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send cashier welcome email:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      this.initializeTransporter();
    }

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email transporter not initialized. Check Gmail configuration.',
      };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service configuration verified successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Email service configuration test failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Configuration test failed',
      };
    }
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  }
}

// Export singleton instance
export const emailService = new EmailService();
