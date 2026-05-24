const nodemailer = require('nodemailer');

const BASE_URL = process.env.BASE_URL || 'https://nexhire.ca';
const FROM = process.env.EMAIL_FROM || 'Nexhire <noreply@nexhire.ca>';

async function sendViaResend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.warn(`[Email] Resend error ${res.status}:`, JSON.stringify(data));
  } else {
    console.log(`[Email] Resend sent → ${to} | id: ${data.id}`);
  }
}

function getSmtpTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function emailTemplate(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px}
    .container{max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header{background:#023448;padding:28px 32px}
    .logo{color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px}
    .logo span{color:#6366F1}
    .content{padding:32px}
    h2{margin:0 0 16px;color:#023448;font-size:20px}
    p{color:#4B5563;line-height:1.6;margin:0 0 16px}
    .btn{display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0}
    .footer{padding:20px 32px;background:#F9FAFB;color:#9CA3AF;font-size:12px;text-align:center}
  </style></head><body>
  <div class="container">
    <div class="header"><div class="logo">Nex<span>hire</span></div></div>
    <div class="content"><h2>${title}</h2>${body}</div>
    <div class="footer">© 2026 Nexhire — Global AI Employment Platform<br>To unsubscribe from alerts, visit your account settings.</div>
  </div></body></html>`;
}

async function send(to, subject, html) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(to, subject, html);
  }
  const transport = getSmtpTransport();
  if (!transport) {
    console.log(`[Email stub — no SMTP/Resend] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, html });
}

async function sendVerificationEmail(email, token, firstName, lang = 'fr') {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  const isFr = lang === 'fr';
  const subject = isFr ? 'Vérifiez votre adresse email — Nexhire' : 'Verify your email — Nexhire';
  const body = isFr
    ? `<p>Bonjour ${firstName},</p><p>Cliquez sur le lien ci-dessous pour vérifier votre compte Nexhire.</p><a href="${link}" class="btn">Vérifier mon email</a><p style="color:#9CA3AF;font-size:12px;margin-top:24px">Si vous n'avez pas créé de compte, ignorez cet email.</p>`
    : `<p>Hello ${firstName},</p><p>Click below to verify your Nexhire account.</p><a href="${link}" class="btn">Verify my email</a><p style="color:#9CA3AF;font-size:12px;margin-top:24px">If you didn't create an account, ignore this email.</p>`;
  await send(email, subject, emailTemplate(isFr ? 'Vérification email' : 'Email verification', body));
}

async function sendPasswordResetEmail(email, token, firstName, lang = 'fr') {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  const isFr = lang === 'fr';
  const subject = isFr ? 'Réinitialisation de mot de passe — Nexhire' : 'Password reset — Nexhire';
  const body = isFr
    ? `<p>Bonjour ${firstName},</p><p>Utilisez ce lien pour réinitialiser votre mot de passe (valable 1h).</p><a href="${link}" class="btn">Réinitialiser mon mot de passe</a><p style="color:#9CA3AF;font-size:12px;margin-top:24px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`
    : `<p>Hello ${firstName},</p><p>Use this link to reset your password (valid 1 hour).</p><a href="${link}" class="btn">Reset my password</a><p style="color:#9CA3AF;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>`;
  await send(email, subject, emailTemplate(isFr ? 'Réinitialisation mot de passe' : 'Password Reset', body));
}

async function sendApplicationNotification(employerEmail, candidateName, jobTitle, applicationId) {
  const link = `${BASE_URL}/nexhire/?tab=jobs`;
  const subject = `Nouvelle candidature — ${jobTitle}`;
  const body = `
    <p>Bonjour,</p>
    <p><strong>${candidateName}</strong> vient de postuler à votre offre <strong>${jobTitle}</strong> sur Nexhire.</p>
    <p style="background:#F0F4FF;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Ce que vous pouvez faire :</strong><br>
      → Consulter son profil et son CV<br>
      → Le déplacer dans votre pipeline Kanban<br>
      → Lancer un entretien vidéo IA (plan Pro)
    </p>
    <a href="${link}" class="btn">Voir dans le tableau de bord →</a>
    <p style="color:#9CA3AF;font-size:12px;margin-top:24px">Allez dans <em>Mes offres → Pipeline</em> pour gérer toutes vos candidatures.</p>
  `;
  await send(employerEmail, subject, emailTemplate('Nouvelle candidature reçue', body));
}

async function sendJobAlertEmail(email, firstName, jobs, lang = 'en') {
  const isFr = lang === 'fr';
  const subject = isFr ? `${jobs.length} nouvelle(s) offre(s) correspondent à votre alerte — Nexhire` : `${jobs.length} new job(s) match your alert — Nexhire`;
  const jobList = jobs.map(j => {
    const title = isFr ? (j.title_fr || j.title_en) : (j.title_en || j.title_fr);
    const company = j.company_name || 'Company';
    const location = [j.city, j.province].filter(Boolean).join(', ') || (j.work_mode === 'remote' ? 'Remote' : '');
    return `<div style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="font-weight:700;color:#023448;font-size:15px">${title}</div>
      <div style="color:#4B5563;font-size:13px;margin:4px 0">${company}${location ? ` · ${location}` : ''}</div>
      <a href="${BASE_URL}/nexhire" style="color:#6366F1;font-size:13px;text-decoration:none;font-weight:600">${isFr ? 'Voir l\'offre →' : 'View job →'}</a>
    </div>`;
  }).join('');
  const body = isFr
    ? `<p>Bonjour ${firstName},</p><p>De nouvelles offres correspondent à votre alerte emploi :</p>${jobList}<a href="${BASE_URL}/nexhire" class="btn">Voir toutes les offres</a>`
    : `<p>Hello ${firstName},</p><p>New jobs match your job alert:</p>${jobList}<a href="${BASE_URL}/nexhire" class="btn">Browse all jobs</a>`;
  await send(email, subject, emailTemplate(isFr ? 'Nouvelles offres pour vous' : 'New jobs for you', body));
}

module.exports = { send, sendVerificationEmail, sendPasswordResetEmail, sendApplicationNotification, sendJobAlertEmail };
