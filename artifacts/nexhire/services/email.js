const nodemailer = require('nodemailer');

const BASE_URL = process.env.BASE_URL || 'https://nexhire.com';
const FROM = process.env.EMAIL_FROM || 'Nexhire <noreply@nexhire.com>';

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function emailTemplate(title, body, lang = 'fr') {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px}
    .container{max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header{background:#0F172A;padding:28px 32px}
    .logo{color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px}
    .logo span{color:#6366F1}
    .content{padding:32px}
    h2{margin:0 0 16px;color:#0F172A;font-size:20px}
    p{color:#4B5563;line-height:1.6;margin:0 0 16px}
    .btn{display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0}
    .footer{padding:20px 32px;background:#F9FAFB;color:#9CA3AF;font-size:12px;text-align:center}
  </style></head><body>
  <div class="container">
    <div class="header"><div class="logo">Nex<span>hire</span></div></div>
    <div class="content"><h2>${title}</h2>${body}</div>
    <div class="footer">© 2026 Nexhire — Global AI Employment Platform</div>
  </div></body></html>`;
}

async function send(to, subject, html) {
  const transport = getTransport();
  if (!transport) { console.log(`[Email stub] To: ${to} | Subject: ${subject}`); return; }
  await transport.sendMail({ from: FROM, to, subject, html });
}

async function sendVerificationEmail(email, token, firstName, lang = 'fr') {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  const isFr = lang === 'fr';
  const subject = isFr ? 'Vérifiez votre adresse email — Nexhire' : 'Verify your email — Nexhire';
  const body = isFr
    ? `<p>Bonjour ${firstName},</p><p>Cliquez sur le lien ci-dessous pour vérifier votre compte Nexhire.</p><a href="${link}" class="btn">Vérifier mon email</a>`
    : `<p>Hello ${firstName},</p><p>Click below to verify your Nexhire account.</p><a href="${link}" class="btn">Verify my email</a>`;
  await send(email, subject, emailTemplate(isFr ? 'Vérification email' : 'Email verification', body, lang));
}

async function sendPasswordResetEmail(email, token, firstName, lang = 'fr') {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  const isFr = lang === 'fr';
  const subject = isFr ? 'Réinitialisation de mot de passe — Nexhire' : 'Password reset — Nexhire';
  const body = isFr
    ? `<p>Bonjour ${firstName},</p><p>Utilisez ce lien pour réinitialiser votre mot de passe (valable 1h).</p><a href="${link}" class="btn">Réinitialiser mon mot de passe</a>`
    : `<p>Hello ${firstName},</p><p>Use this link to reset your password (valid 1 hour).</p><a href="${link}" class="btn">Reset my password</a>`;
  await send(email, subject, emailTemplate(isFr ? 'Réinitialisation mot de passe' : 'Password Reset', body, lang));
}

async function sendApplicationNotification(employerEmail, candidateName, jobTitle, applicationId) {
  const link = `${BASE_URL}/employer/applications/${applicationId}`;
  const subject = `New application — ${jobTitle}`;
  const body = `<p>Hello,</p><p><strong>${candidateName}</strong> applied for <strong>${jobTitle}</strong> on Nexhire.</p><a href="${link}" class="btn">View application</a>`;
  await send(employerEmail, subject, emailTemplate('New Application Received', body, 'en'));
}

module.exports = { send, sendVerificationEmail, sendPasswordResetEmail, sendApplicationNotification };
