import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  username: string;
  organizationName: string;
  verificationUrl?: string;
  isNewOrganization?: boolean;
  role?: string;
}

export interface PasswordResetEmailData {
  firstName: string;
  lastName: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface EmailVerificationData {
  firstName: string;
  lastName: string;
  verificationUrl: string;
  expiresAt: Date;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private emailEnabled: boolean;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@blocktrade.com';
    this.emailEnabled = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    
    if (this.emailEnabled) {
      this.initializeTransporter();
    } else {
      logger.warn('📧 Email service disabled - SMTP configuration not found');
    }
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // For development only
        },
      });

      // Verify connection
      if (this.transporter) {
        this.transporter.verify((error: any, success: any) => {
          if (error) {
            logger.error('📧 Email service configuration error:', error);
          } else {
            logger.info('📧 Email service is ready to send messages');
          }
        });
      }
    } catch (error) {
      logger.error('❌ Failed to initialize email transporter:', error);
      this.emailEnabled = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailEnabled || !this.transporter) {
      logger.warn('📧 Email service not available - skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email sent successfully to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<boolean> {
    const subject = `Welcome to BlockTrade, ${data.firstName}!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to BlockTrade</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Welcome to BlockTrade</h1>
              <p>Your Blockchain Trade Finance Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${data.firstName} ${data.lastName}!</h2>
              <p>Welcome to BlockTrade! Your account has been successfully created.</p>
              
              <h3>📋 Account Details:</h3>
              <ul>
                <li><strong>Username:</strong> ${data.username}</li>
                <li><strong>Organization:</strong> ${data.organizationName} ${data.isNewOrganization ? '(New Organization)' : '(Existing Organization)'}</li>
                <li><strong>Role:</strong> ${data.role || 'User'}</li>
                <li><strong>Email:</strong> ${email}</li>
              </ul>
              
              ${data.isNewOrganization ? `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <strong>🎉 Congratulations!</strong> You have successfully created a new organization on BlockTrade. As the founder, you have administrative privileges to manage your organization.
                </div>
              ` : `
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <strong>👥 Welcome to the team!</strong> You have joined an existing organization on BlockTrade. Your role and permissions have been assigned by your organization administrator.
                </div>
              `}
              
              ${data.verificationUrl ? `
                <p>Please verify your email address to activate your account:</p>
                <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
              ` : ''}
              
              <h3>🛡️ Getting Started:</h3>
              <ol>
                <li>Complete your profile information</li>
                <li>Set up two-factor authentication for enhanced security</li>
                <li>Explore the platform features</li>
                <li>Start your first trade finance transaction</li>
              </ol>
              
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>© 2025 BlockTrade. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to BlockTrade, ${data.firstName}!
      
      Your account has been successfully created.
      Username: ${data.username}
      Organization: ${data.organizationName}
      Email: ${email}
      
      ${data.verificationUrl ? `Please verify your email: ${data.verificationUrl}` : ''}
      
      Best regards,
      BlockTrade Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(email: string, data: PasswordResetEmailData): Promise<boolean> {
    const subject = 'Reset Your BlockTrade Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset - BlockTrade</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>BlockTrade Security</p>
            </div>
            <div class="content">
              <h2>Hello ${data.firstName} ${data.lastName},</h2>
              <p>We received a request to reset your BlockTrade password.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and contact our support team immediately.
              </div>
              
              <p>Click the button below to reset your password:</p>
              <a href="${data.resetUrl}" class="button">Reset Password</a>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link will expire on ${data.expiresAt.toLocaleString()}</li>
                <li>You can only use this link once</li>
                <li>For security, we recommend using a strong, unique password</li>
              </ul>
              
              <p>If the button doesn't work, copy and paste this link:</p>
              <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 5px;">${data.resetUrl}</p>
            </div>
            <div class="footer">
              <p>© 2025 BlockTrade. All rights reserved.</p>
              <p>This is an automated security message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request - BlockTrade
      
      Hello ${data.firstName} ${data.lastName},
      
      We received a request to reset your BlockTrade password.
      
      Reset your password: ${data.resetUrl}
      
      This link expires on: ${data.expiresAt.toLocaleString()}
      
      If you didn't request this, please contact support.
      
      BlockTrade Security Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendLoginAlert(email: string, data: { firstName: string; lastName: string; loginTime: Date; ipAddress: string; userAgent: string }): Promise<boolean> {
    const subject = 'New Login to Your BlockTrade Account';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Login Alert - BlockTrade</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #17a2b8; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Login Alert</h1>
              <p>Security Notification</p>
            </div>
            <div class="content">
              <h2>Hello ${data.firstName} ${data.lastName},</h2>
              <p>We detected a new login to your BlockTrade account.</p>
              
              <div class="info-box">
                <h3>Login Details:</h3>
                <ul>
                  <li><strong>Time:</strong> ${data.loginTime.toLocaleString()}</li>
                  <li><strong>IP Address:</strong> ${data.ipAddress}</li>
                  <li><strong>Device:</strong> ${data.userAgent}</li>
                </ul>
              </div>
              
              <p>If this was you, no action is needed.</p>
              <p><strong>If this wasn't you:</strong></p>
              <ol>
                <li>Change your password immediately</li>
                <li>Enable two-factor authentication</li>
                <li>Contact our support team</li>
              </ol>
            </div>
            <div class="footer">
              <p>© 2025 BlockTrade. All rights reserved.</p>
              <p>This is an automated security alert.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  isEnabled(): boolean {
    return this.emailEnabled;
  }
}

export const emailService = new EmailService();
export default emailService;
