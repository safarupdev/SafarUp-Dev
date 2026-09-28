/**
 * Authentication-related transactional emails — PRD §14 (Email Automation
 * → Authentication triggers: Welcome email, Email verification, Password
 * reset) and §141 (Email Template System: centrally managed templates with
 * {{variable}} placeholders).
 *
 * Booking/private-trip/trip-lifecycle email triggers from §14 are out of
 * scope for this phase (no Booking/Trip models exist yet) and will be
 * added alongside those domain models.
 */

const { sendMail } = require('../config/mailer');
const env = require('../config/env');

function layout(bodyHtml) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">SafarUp</h2>
      ${bodyHtml}
      <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
        SafarUp &middot; Travel. Planned Better.
      </p>
    </div>
  `;
}

async function sendVerificationEmail({ to, displayName, verificationToken }) {
  const verifyUrl = `${env.clientUrls.public}/verify-email?token=${verificationToken}`;
  await sendMail({
    to,
    subject: 'Verify your SafarUp account',
    html: layout(`
      <p>Hi ${displayName},</p>
      <p>Thanks for signing up with SafarUp. Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>If the button doesn't work, copy this link into your browser:<br/>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    `),
  });
}

async function sendWelcomeEmail({ to, displayName }) {
  await sendMail({
    to,
    subject: 'Welcome to SafarUp',
    html: layout(`
      <p>Hi ${displayName},</p>
      <p>Your email is verified and your SafarUp account is ready. Time to plan your next trip.</p>
      <p><a href="${env.clientUrls.public}/trips" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Explore Trips</a></p>
    `),
  });
}

async function sendPasswordResetEmail({ to, displayName, resetToken }) {
  const resetUrl = `${env.clientUrls.public}/reset-password?token=${resetToken}`;
  await sendMail({
    to,
    subject: 'Reset your SafarUp password',
    html: layout(`
      <p>Hi ${displayName},</p>
      <p>We received a request to reset your SafarUp password. If this wasn't you, you can safely ignore this email.</p>
      <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
    `),
  });
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail };
