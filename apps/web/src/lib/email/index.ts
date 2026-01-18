/**
 * LeDesign Email Service
 *
 * Uses SendGrid to send transactional emails with LeDesign branding.
 * Configure SENDGRID_API_KEY in .env.local to enable email sending.
 *
 * Email types:
 * - Verification: Sent on registration to verify email address
 * - Password Reset: Sent when user requests password reset
 * - Welcome: Sent after successful email verification
 * - Notification: Generic notifications with optional CTA
 */

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
} from './sendgrid';
