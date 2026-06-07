"""Service d'envoi d'emails via Resend API (https://resend.com)."""
from __future__ import annotations

import os
import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL     = os.environ.get("EMAIL_FROM", "NexHire <noreply@nexhire.ca>")
APP_URL        = os.environ.get("APP_URL", "https://nexhire.ca")


def _send(to: str, subject: str, html: str) -> bool:
    """Envoie un email via Resend. Retourne True si succès, False sinon (dégradation silencieuse)."""
    if not RESEND_API_KEY:
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        return resp.status_code in (200, 201)
    except Exception:
        return False


def send_invite_email(
    to_email: str,
    org_name: str,
    role: str,
    invite_token: str,
    invited_by_name: str = "Un administrateur",
) -> bool:
    invite_url = f"{APP_URL}?invite={invite_token}"
    role_labels = {
        "user":    "Utilisateur",
        "manager": "Manager",
        "admin":   "Administrateur",
    }
    role_label = role_labels.get(role, role)

    subject = f"Invitation à rejoindre {org_name} sur NexHire"
    html = f"""
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1e293b;padding:28px 32px;text-align:center">
      <span style="font-size:1.4rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span></span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:1.15rem">Vous êtes invité à rejoindre {org_name}</h2>
      <p style="color:#475569;margin:0 0 20px">{invited_by_name} vous a invité à rejoindre <strong>{org_name}</strong> sur NexHire Enterprise Assistant avec le rôle <strong>{role_label}</strong>.</p>
      <p style="color:#475569;margin:0 0 24px">NexHire est un assistant IA enterprise bilingue qui connecte tous vos systèmes d'entreprise (Microsoft 365, Salesforce, Jira, SAP, etc.) en un seul agent conversationnel.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="{invite_url}"
           style="display:inline-block;background:#6366f1;color:#fff;padding:13px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:.95rem">
          Accepter l'invitation
        </a>
      </div>
      <p style="color:#94a3b8;font-size:.8rem;text-align:center;margin:0">Ce lien est valide 7 jours. Si vous ne reconnaissez pas cette invitation, ignorez cet email.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">nexhire.ca</a> · Conçu pour les organisations canadiennes 🍁</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_license_expiry_alert(
    to_email: str,
    org_name: str,
    licenses: list[dict],
) -> bool:
    if not licenses:
        return False
    subject = f"⚠️ {len(licenses)} licence(s) expirent bientôt — {org_name}"
    rows_html = "".join(
        f"""<tr>
          <td style="padding:8px;border-top:1px solid #e2e8f0">{lic.get('software_name','')}</td>
          <td style="padding:8px;border-top:1px solid #e2e8f0;text-align:center">{lic.get('seats', '—')}</td>
          <td style="padding:8px;border-top:1px solid #e2e8f0;color:#dc2626;font-weight:600">{lic.get('expires_at','')[:10] if lic.get('expires_at') else '—'}</td>
        </tr>"""
        for lic in licenses
    )
    html = f"""
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1e293b;padding:24px 32px">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span></span>
      <span style="color:#94a3b8;font-size:.85rem;margin-left:12px">Alerte de renouvellement</span>
    </div>
    <div style="padding:28px 32px">
      <h2 style="margin:0 0 8px;color:#dc2626">⚠️ Licences expirant bientôt</h2>
      <p style="color:#475569;margin:0 0 20px">Les licences suivantes de <strong>{org_name}</strong> expirent dans les 30 prochains jours :</p>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <tr style="background:#f8fafc">
          <th style="padding:8px;text-align:left;color:#1e293b">Logiciel</th>
          <th style="padding:8px;text-align:center;color:#1e293b">Sièges</th>
          <th style="padding:8px;text-align:left;color:#1e293b">Expiration</th>
        </tr>
        {rows_html}
      </table>
      <div style="text-align:center;margin:24px 0">
        <a href="{APP_URL}#parc-it/licenses"
           style="display:inline-block;background:#6366f1;color:#fff;padding:11px 28px;border-radius:8px;font-weight:700;text-decoration:none">
          Voir les licences
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · Vous recevez cet email car vous êtes admin de {org_name}.</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_monthly_report(
    to_email: str,
    org_name: str,
    total_queries: int,
    avg_rating: float,
    active_users: int,
    expiring_licenses: int,
) -> bool:
    from datetime import datetime
    month_label = datetime.now().strftime("%B %Y")
    rating_stars = "★" * round(avg_rating) + "☆" * (5 - round(avg_rating))
    subject = f"📊 Rapport mensuel NexHire — {org_name} ({month_label})"
    html = f"""
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1e293b;padding:28px 32px">
      <span style="font-size:1.3rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span></span>
      <span style="color:#94a3b8;font-size:.85rem;margin-left:12px">Rapport mensuel · {month_label}</span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 6px;color:#1e293b">Rapport d'activité — {org_name}</h2>
      <p style="color:#64748b;margin:0 0 28px;font-size:.9rem">Voici le résumé de votre activité NexHire pour {month_label}.</p>

      <div style="display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap">
        <div style="flex:1;min-width:120px;background:#f0f4ff;border-radius:10px;padding:18px;text-align:center">
          <div style="font-size:2rem;font-weight:800;color:#6366f1">{total_queries}</div>
          <div style="font-size:.8rem;color:#64748b;margin-top:4px">Requêtes IA</div>
        </div>
        <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:10px;padding:18px;text-align:center">
          <div style="font-size:2rem;font-weight:800;color:#16a34a">{active_users}</div>
          <div style="font-size:.8rem;color:#64748b;margin-top:4px">Utilisateurs actifs</div>
        </div>
        <div style="flex:1;min-width:120px;background:#fef9c3;border-radius:10px;padding:18px;text-align:center">
          <div style="font-size:1.4rem;font-weight:800;color:#a16207">{rating_stars}</div>
          <div style="font-size:.8rem;color:#64748b;margin-top:4px">Satisfaction ({avg_rating:.1f}/5)</div>
        </div>
      </div>

      {'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;margin-bottom:20px"><p style="margin:0;color:#c2410c;font-weight:600">⚠️ ' + str(expiring_licenses) + ' licence(s) expirent dans les 30 prochains jours.</p></div>' if expiring_licenses > 0 else ''}

      <div style="text-align:center;margin:24px 0">
        <a href="{APP_URL}#stats"
           style="display:inline-block;background:#6366f1;color:#fff;padding:13px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:.95rem">
          Voir les statistiques complètes
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">nexhire.ca</a> · Vous recevez ce rapport car vous êtes admin de {org_name}.</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_subscription_confirmation(
    to_email: str,
    org_name: str,
    plan: str,
    amount: str,
) -> bool:
    plan_labels = {"monthly": "Mensuel", "annual": "Annuel"}
    plan_label = plan_labels.get(plan, plan)
    subject = f"✅ Abonnement NexHire activé — {org_name}"
    html = f"""
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#16a34a;padding:24px 32px;text-align:center">
      <span style="font-size:1.3rem;font-weight:800;color:#fff">✅ Abonnement activé</span>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#475569;margin:0 0 16px">Bonjour,</p>
      <p style="color:#475569;margin:0 0 16px">L'abonnement <strong>{plan_label}</strong> de <strong>{org_name}</strong> est maintenant actif.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;color:#166534;font-weight:600">Plan : {plan_label} — {amount}</p>
      </div>
      <p style="color:#475569;margin:0 0 24px">Vous pouvez accéder à votre tableau de bord et gérer votre abonnement depuis les Paramètres.</p>
      <div style="text-align:center">
        <a href="{APP_URL}#settings"
           style="display:inline-block;background:#6366f1;color:#fff;padding:11px 28px;border-radius:8px;font-weight:700;text-decoration:none">
          Accéder à NexHire
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · contact@nexhire.ca</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)
