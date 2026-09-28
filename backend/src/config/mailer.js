/**
 * Mail transport configuration — PRD §14 (Email Automation) and §141
 * (Email Template System: "Templates should be centrally managed.").
 *
 * In development, if SMTP credentials are not configured, emails are
 * logged to the console instead of sent, so the auth flow (which depends
 * on verification emails) can still be exercised end-to-end locally
 * without a real mail provider. This must NOT happen in production —
 * §92/§95 require production to run against real, correctly configured
 * secrets, not silent fallbacks.
 */

const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('../utils/logger');

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter = null;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else if (env.isProduction) {
  throw new Error(
    'SMTP is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). Refusing to start in production without email delivery.'
  );
}

const fromAddress = process.env.MAIL_FROM || 'SafarUp <no-reply@safarup.in>';

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} message
 */
async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    logger.info('Email dispatch skipped (SMTP not configured) — logging content instead', {
      to,
      subject,
    });
    logger.debug('Email body preview', { html: html?.slice(0, 500) });
    return { skipped: true };
  }

  return transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
    text,
  });
}

module.exports = { sendMail, smtpConfigured };
