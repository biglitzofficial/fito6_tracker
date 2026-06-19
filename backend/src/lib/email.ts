import nodemailer from 'nodemailer';
import { config } from '../config';

function getTransport() {
  if (!config.smtp.configured) return null;

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }

  await transport.sendMail({
    from: config.smtp.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to,
    subject: 'Fito6 — Reset your admin password',
    text: `Hi ${name},\n\nReset your password using this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>Hi ${name},</p>
      <p>Click the link below to reset your <strong>Fito6 admin</strong> password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function sendStaffWelcomeEmail(
  to: string,
  name: string,
  temporaryPassword: string
): Promise<void> {
  const loginUrl = `${config.frontendUrl}/login`;

  await sendEmail({
    to,
    subject: 'Fito6 — Your staff account',
    text: `Hi ${name},\n\nAn admin created your Fito6 staff account.\nLogin: ${loginUrl}\nEmail: ${to}\nTemporary password: ${temporaryPassword}\n\nPlease change your password after logging in if your admin asks you to.`,
    html: `
      <p>Hi ${name},</p>
      <p>An admin created your <strong>Fito6</strong> staff account.</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p><strong>Email:</strong> ${to}<br/><strong>Temporary password:</strong> ${temporaryPassword}</p>
      <p>Contact your admin if you need a new password.</p>
    `,
  });
}
