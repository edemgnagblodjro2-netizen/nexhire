"""Service d'envoi d'emails via Resend API (https://resend.com)."""
from __future__ import annotations

import os
import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL     = os.environ.get("EMAIL_FROM", "NexHire <noreply@nexhire.ca>")
APP_URL        = os.environ.get("APP_URL", "https://myportal.nexhire.ca")


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

    subject = f"Vous êtes invité à rejoindre {org_name} sur NexHire EIP"
    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

    <!-- En-tête -->
    <div style="background:#0f172a;padding:26px 32px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:1.25rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle">EIP</span>
      </span>
      <span style="color:#94a3b8;font-size:.82rem">Invitation</span>
    </div>

    <!-- Corps -->
    <div style="padding:32px">
      <!-- Titre invitation -->
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:#eef2ff;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:1.6rem;margin-bottom:12px">✉️</div>
        <h2 style="margin:0 0 6px;color:#0f172a;font-size:1.2rem;font-weight:800">Vous êtes invité à rejoindre {org_name}</h2>
        <p style="margin:0;color:#64748b;font-size:.9rem"><strong style="color:#0f172a">{invited_by_name}</strong> vous a ajouté en tant que <strong style="color:#6366f1">{role_label}</strong>.</p>
      </div>

      <!-- Description NexHire EIP -->
      <div style="background:#f8faff;border:1.5px solid #e0e7ff;border-radius:12px;padding:20px 22px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:.88rem;color:#3730a3;font-weight:700;text-transform:uppercase;letter-spacing:.05em">À propos de NexHire EIP</p>
        <p style="margin:0 0 14px;color:#475569;font-size:.9rem;line-height:1.65">
          NexHire EIP est une <strong style="color:#0f172a">plateforme d'intelligence et de gouvernance d'entreprise</strong> alimentée par l'IA.
          Elle connecte vos systèmes, données et applications afin de fournir une <strong style="color:#0f172a">vue unifiée de votre organisation</strong>,
          des analyses en temps réel et des recommandations intelligentes pour soutenir la prise de décision.
        </p>
        <!-- Pills connecteurs -->
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#475569">Microsoft 365</span>
          <span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#475569">Salesforce</span>
          <span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#475569">Jira</span>
          <span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#475569">SAP</span>
          <span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#475569">SharePoint</span>
          <span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#475569">Power BI</span>
          <span style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:99px;padding:3px 10px;font-size:.76rem;font-weight:600;color:#6366f1">+ bien d'autres</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 20px">
        <a href="{invite_url}"
           style="display:inline-block;background:linear-gradient(135deg,#818CF8,#6366f1);color:#fff;padding:14px 36px;border-radius:10px;font-weight:700;text-decoration:none;font-size:.95rem;letter-spacing:.01em;box-shadow:0 4px 14px rgba(99,102,241,.35)">
          Accepter l'invitation →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:.78rem;text-align:center;margin:0">
        Ce lien est valide <strong>7 jours</strong>. Si vous ne reconnaissez pas cette invitation, ignorez cet email.
      </p>
    </div>

    <!-- Pied de page -->
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.76rem">
        © 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> · Conçu pour les organisations canadiennes 🍁
      </p>
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
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 CivicAI Inc. · Vous recevez cet email car vous êtes admin de {org_name}.</p>
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
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> · Vous recevez ce rapport car vous êtes admin de {org_name}.</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_monthly_report_rich(
    to_email: str,
    org_name: str,
    total_queries: int,
    avg_rating: float,
    active_users: int,
    expiring_licenses: int,
    avg_health: int = 0,
    dept_count: int = 0,
    total_savings: int = 0,
    top_depts: list[dict] | None = None,
) -> bool:
    from datetime import datetime
    month_label = datetime.now().strftime("%B %Y")
    rating_stars = "★" * round(avg_rating) + "☆" * (5 - round(avg_rating)) if avg_rating else "—"
    subject = f"📊 Rapport mensuel NexHire — {org_name} ({month_label})"

    health_color = "#16a34a" if avg_health >= 80 else "#f59e0b" if avg_health >= 60 else "#dc2626"

    savings_html = (
        f'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;'
        f'padding:18px;text-align:center;flex:1;min-width:120px">'
        f'<div style="font-size:1.6rem;font-weight:800;color:#16a34a">{total_savings:,} $</div>'
        f'<div style="font-size:.8rem;color:#64748b;margin-top:4px">Économies identifiées</div>'
        f'</div>'
    ) if total_savings > 0 else ""

    top_depts_html = ""
    if top_depts:
        rows_html = "".join(
            f'<tr><td style="padding:6px 8px;color:#1e293b">{d["name"]}</td>'
            f'<td style="padding:6px 8px;text-align:right;font-weight:700;'
            f'color:{"#16a34a" if d["score"]>=80 else "#f59e0b" if d["score"]>=60 else "#dc2626"}">'
            f'{d["score"]}%</td></tr>'
            for d in top_depts
        )
        top_depts_html = f"""
      <h3 style="font-size:.88rem;font-weight:700;color:#1e293b;margin:24px 0 10px">🏆 Top départements ce mois</h3>
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;background:#f8fafc;border-radius:8px;overflow:hidden">
        {rows_html}
      </table>"""

    expiry_html = (
        f'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;'
        f'padding:12px 16px;margin:20px 0">'
        f'<p style="margin:0;color:#c2410c;font-weight:600">⚠️ {expiring_licenses} licence(s) expirent dans les 30 prochains jours</p>'
        f'</div>'
    ) if expiring_licenses > 0 else ""

    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

    <div style="background:#0f172a;padding:26px 32px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:1.25rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle">EIP</span>
      </span>
      <span style="color:#94a3b8;font-size:.82rem">Rapport · {month_label}</span>
    </div>

    <div style="padding:28px 32px">
      <h2 style="margin:0 0 4px;color:#0f172a;font-size:1.1rem">Rapport mensuel — {org_name}</h2>
      <p style="color:#64748b;margin:0 0 24px;font-size:.88rem">Résumé de votre activité NexHire pour <strong>{month_label}</strong></p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
        <div style="flex:1;min-width:110px;background:#eef2ff;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:#6366f1">{total_queries}</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:3px">Requêtes IA</div>
        </div>
        <div style="flex:1;min-width:110px;background:#f0fdf4;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:#16a34a">{active_users}</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:3px">Utilisateurs actifs</div>
        </div>
        <div style="flex:1;min-width:110px;background:#fef9c3;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:1.1rem;font-weight:800;color:#a16207">{rating_stars}</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:3px">Satisfaction ({avg_rating:.1f}/5)</div>
        </div>
        {f'<div style="flex:1;min-width:110px;background:#f0f9ff;border-radius:10px;padding:16px;text-align:center"><div style="font-size:1.8rem;font-weight:800;color:{health_color}">{avg_health}%</div><div style="font-size:.78rem;color:#64748b;margin-top:3px">Santé org. ({dept_count} depts)</div></div>' if dept_count > 0 else ""}
        {savings_html}
      </div>

      {expiry_html}
      {top_depts_html}

      <div style="text-align:center;margin:28px 0 8px">
        <a href="{APP_URL}#stats"
           style="display:inline-block;background:#6366f1;color:#fff;padding:13px 32px;
                  border-radius:8px;font-weight:700;text-decoration:none;font-size:.92rem">
          Voir le tableau de bord complet →
        </a>
      </div>
    </div>

    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.76rem">
        © 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> ·
        Vous recevez ce rapport car vous êtes admin de {org_name}.
        <a href="{APP_URL}#settings" style="color:#6366f1">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_welcome_email(
    to_email: str,
    full_name: str,
    org_name: str,
    trial_days: int = 14,
) -> bool:
    first_name = full_name.split()[0] if full_name else "là"
    subject = f"Bienvenue sur NexHire, {first_name} 👋"
    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:26px 32px">
      <span style="font-size:1.25rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle">EIP</span>
      </span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#0f172a">Bienvenue, {first_name} ! 🎉</h2>
      <p style="color:#475569;margin:0 0 20px">Votre organisation <strong>{org_name}</strong> est prête sur NexHire Enterprise Intelligence Platform. Vous disposez de <strong>{trial_days} jours d'essai gratuit</strong> pour explorer toutes les fonctionnalités.</p>

      <div style="background:#eef2ff;border-radius:10px;padding:20px;margin:0 0 24px">
        <p style="margin:0 0 12px;font-weight:700;color:#3730a3">Pour commencer :</p>
        <ol style="margin:0;padding-left:20px;color:#475569;line-height:1.8">
          <li>Ajoutez vos départements dans <strong>Workspaces</strong></li>
          <li>Connectez vos outils (Microsoft 365, SAP, Jira…) dans <strong>Connecteurs</strong></li>
          <li>Invitez votre équipe dans <strong>Équipe</strong></li>
          <li>Posez votre première question à l'<strong>Agent IA</strong></li>
        </ol>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="{APP_URL}"
           style="display:inline-block;background:#6366f1;color:#fff;padding:13px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:.95rem">
          Accéder à mon tableau de bord →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:.82rem;text-align:center;margin:0">Des questions ? Répondez à cet email — nous sommes là pour vous aider.</p>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.76rem">© 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> 🍁</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_trial_expiry_warning(
    to_email: str,
    org_name: str,
    days_left: int,
) -> bool:
    subject = f"⏳ Votre essai NexHire se termine dans {days_left} jour{'s' if days_left > 1 else ''}"
    urgency_color = "#dc2626" if days_left <= 3 else "#f59e0b"
    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:24px 32px">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span></span>
    </div>
    <div style="padding:28px 32px">
      <div style="background:{urgency_color}15;border:1px solid {urgency_color}40;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center">
        <p style="margin:0;font-size:1.1rem;font-weight:700;color:{urgency_color}">⏳ Plus que {days_left} jour{'s' if days_left > 1 else ''} d'essai</p>
      </div>
      <p style="color:#475569;margin:0 0 16px">L'essai gratuit de <strong>{org_name}</strong> se termine bientôt. Pour continuer à utiliser NexHire sans interruption, souscrivez un abonnement.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-weight:700;color:#1e293b">Plans disponibles :</p>
        <p style="margin:0 0 4px;color:#475569">• <strong>Mensuel</strong> — 99 $/mois · Sans engagement</p>
        <p style="margin:0;color:#475569">• <strong>Annuel</strong> — 990 $/an · 2 mois offerts</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="{APP_URL}#settings"
           style="display:inline-block;background:#6366f1;color:#fff;padding:13px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:.95rem">
          Activer mon abonnement →
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.76rem">© 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a></p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_subscription_cancelled_email(
    to_email: str,
    org_name: str,
) -> bool:
    subject = f"Abonnement NexHire annulé — {org_name}"
    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1e293b;padding:24px 32px;text-align:center">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span></span>
    </div>
    <div style="padding:28px 32px">
      <h2 style="margin:0 0 12px;color:#1e293b">Votre abonnement a été annulé</h2>
      <p style="color:#475569;margin:0 0 16px">L'abonnement de <strong>{org_name}</strong> a été annulé. Vous conservez l'accès jusqu'à la fin de la période payée.</p>
      <p style="color:#475569;margin:0 0 24px">Si c'est une erreur ou si vous souhaitez reprendre votre abonnement, vous pouvez le réactiver depuis les Paramètres.</p>
      <div style="text-align:center">
        <a href="{APP_URL}#settings"
           style="display:inline-block;background:#6366f1;color:#fff;padding:11px 28px;border-radius:8px;font-weight:700;text-decoration:none">
          Réactiver mon abonnement
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 CivicAI Inc. · contact@nexhire.ca</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_connector_alert(
    to_email: str,
    org_name: str,
    failed_connectors: list[dict],
) -> bool:
    """Alerte l'owner quand un ou plusieurs connecteurs sont en erreur."""
    if not failed_connectors:
        return False
    count = len(failed_connectors)
    subject = f"🔴 {count} connecteur{'s' if count > 1 else ''} déconnecté{'s' if count > 1 else ''} — {org_name}"

    rows_html = "".join(
        f"""<tr>
          <td style="padding:10px 12px;border-top:1px solid #e2e8f0;font-weight:600;color:#1e293b">{c.get('connector_type','').upper()}</td>
          <td style="padding:10px 12px;border-top:1px solid #e2e8f0;color:#dc2626;font-size:.82rem">{c.get('last_error','Erreur inconnue')[:120]}</td>
          <td style="padding:10px 12px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:.8rem">{str(c.get('updated_at',''))[:16].replace('T',' ')}</td>
        </tr>"""
        for c in failed_connectors
    )

    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

    <div style="background:#0f172a;padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle">EIP</span>
      </span>
      <span style="color:#94a3b8;font-size:.82rem">Alerte connecteurs</span>
    </div>

    <div style="padding:28px 32px">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:1rem;font-weight:700;color:#dc2626">
          🔴 {count} connecteur{'s' if count > 1 else ''} déconnecté{'s' if count > 1 else ''} chez {org_name}
        </p>
        <p style="margin:6px 0 0;color:#7f1d1d;font-size:.88rem">
          Les données de {'ces systèmes sont' if count > 1 else 'ce système est'} indisponibles dans NexHire.
          Le tableau de bord Direction peut afficher des informations incomplètes.
        </p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr style="background:#f8fafc">
          <th style="padding:10px 12px;text-align:left;color:#1e293b;font-size:.8rem">CONNECTEUR</th>
          <th style="padding:10px 12px;text-align:left;color:#1e293b;font-size:.8rem">ERREUR</th>
          <th style="padding:10px 12px;text-align:left;color:#1e293b;font-size:.8rem">DÉTECTÉ</th>
        </tr>
        {rows_html}
      </table>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin:24px 0 20px">
        <p style="margin:0;font-weight:700;color:#92400e;font-size:.88rem">Action requise</p>
        <p style="margin:6px 0 0;color:#78350f;font-size:.85rem">
          Reconnectez les connecteurs concernés dans NexHire → <strong>Connecteurs</strong>.
          Si le problème persiste, vérifiez que les permissions n'ont pas été révoquées dans le système source.
        </p>
      </div>

      <div style="text-align:center;margin:20px 0">
        <a href="{APP_URL}#connectors"
           style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;
                  border-radius:8px;font-weight:700;text-decoration:none;font-size:.92rem">
          Gérer les connecteurs →
        </a>
      </div>
    </div>

    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.76rem">
        © 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> ·
        Vous recevez cet email car vous êtes admin de {org_name}.
      </p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_executive_briefing(
    to_email: str,
    org_name: str,
    score: float,
    badge: str,
    depts_total: int,
    depts_at_risk: int,
    contracts_due: int,
    savings_potential: float,
    budget_pct: float,
    top_risks: list[dict],
    date_str: str = "",
) -> bool:
    """Briefing exécutif hebdomadaire — envoyé chaque lundi matin."""
    from datetime import date as _date
    if not date_str:
        date_str = _date.today().strftime("%d %B %Y")

    score_colors = {"green": "#22c55e", "yellow": "#f59e0b", "red": "#ef4444"}
    score_bgs    = {"green": "#f0fdf4", "yellow": "#fffbeb", "red": "#fef2f2"}
    score_color  = score_colors.get(badge, "#ef4444")
    score_bg     = score_bgs.get(badge, "#fef2f2")
    score_label  = "Excellente" if score >= 70 else ("À surveiller" if score >= 40 else "Critique")

    budget_status = "critique" if budget_pct >= 95 else ("attention" if budget_pct >= 80 else "normal")
    budget_color  = "#ef4444" if budget_status == "critique" else ("#f59e0b" if budget_status == "attention" else "#22c55e")
    budget_bg     = "#fef2f2" if budget_status == "critique" else ("#fffbeb" if budget_status == "attention" else "#f0fdf4")

    def fmt_cad(v: float) -> str:
        return f"{int(v):,} $".replace(",", " ")

    risks_rows = ""
    for r in top_risks:
        rc = score_colors.get(r.get("badge", "red"), "#ef4444")
        risks_rows += (
            f'<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:.85rem">{r.get("dept","")}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">'
            f'<span style="background:{rc}20;color:{rc};padding:2px 10px;border-radius:20px;font-size:.78rem;font-weight:700">{int(r.get("score",0))}/100</span>'
            f"</td></tr>"
        )

    risks_section = ""
    if top_risks:
        risks_section = (
            '<div style="padding:20px 32px 0">'
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">'
            '<thead><tr style="background:#f8fafc">'
            '<th style="padding:10px 12px;text-align:left;font-size:.8rem;color:#64748b;font-weight:600">Département à risque</th>'
            '<th style="padding:10px 12px;text-align:center;font-size:.8rem;color:#64748b;font-weight:600">Score</th>'
            f"</tr></thead><tbody>{risks_rows}</tbody></table></div>"
        )

    actions = []
    if savings_potential > 0:
        actions.append("Examiner les licences sous-utilisées pour récupérer les coûts identifiés")
    if contracts_due > 0:
        actions.append(f"Traiter les <strong>{contracts_due} contrat{'s' if contracts_due != 1 else ''}</strong> à renouveler avant expiration")
    if depts_at_risk > 0:
        actions.append(f"Revoir les <strong>{depts_at_risk} département{'s' if depts_at_risk != 1 else ''}</strong> en score rouge")
    if budget_pct >= 80:
        actions.append(f"Surveiller la consommation budgétaire — {budget_pct:.0f} % consommé")
    actions.append("Consulter le tableau de bord complet pour les détails")
    actions_html = "".join(f'<li style="margin-bottom:6px">{a}</li>' for a in actions)

    subject = f"Briefing NexHire — {org_name} · Score {int(score)}/100"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#818CF8 0%,#6366f1 100%);padding:28px 32px;text-align:center">
    <p style="margin:0 0 6px;color:rgba(255,255,255,.7);font-size:.82rem">BRIEFING EXÉCUTIF &nbsp;·&nbsp; {date_str}</p>
    <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700">{org_name}</h1>
  </div>
  <div style="padding:28px 32px 0">
    <div style="display:flex;align-items:center;gap:20px;padding:20px 24px;background:{score_bg};border:2px solid {score_color}45;border-radius:12px">
      <div style="text-align:center;min-width:72px">
        <div style="font-size:3rem;font-weight:900;color:{score_color};line-height:1">{int(score)}</div>
        <div style="font-size:.7rem;color:#94a3b8;font-weight:600">/100</div>
      </div>
      <div>
        <div style="font-size:.72rem;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Score Santé Organisationnelle</div>
        <div style="font-size:1.1rem;font-weight:700;color:{score_color};margin-bottom:6px">{score_label}</div>
        <div style="font-size:.82rem;color:#64748b">
          {depts_total} département{'s' if depts_total != 1 else ''}&nbsp;&nbsp;&middot;&nbsp;&nbsp;{depts_at_risk} à risque&nbsp;&nbsp;&middot;&nbsp;&nbsp;{contracts_due} contrat{'s' if contracts_due != 1 else ''} à renouveler
        </div>
      </div>
    </div>
  </div>
  <div style="padding:16px 32px 0">
    <div style="padding:16px 20px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;display:flex;align-items:center;gap:14px">
      <span style="font-size:1.5rem">💡</span>
      <div>
        <div style="font-size:.72rem;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Économies potentielles identifiées</div>
        <div style="font-size:1.45rem;font-weight:800;color:#15803d">{fmt_cad(savings_potential)}</div>
      </div>
    </div>
  </div>
  <div style="padding:12px 32px 0">
    <div style="padding:13px 18px;background:{budget_bg};border:1.5px solid {budget_color}40;border-radius:10px">
      <span style="color:{budget_color};font-weight:600;font-size:.88rem">💰 Budget consommé : {budget_pct:.1f}&nbsp;%{'  ⚠️' if budget_status != 'normal' else '  ✅'}</span>
    </div>
  </div>
  {risks_section}
  <div style="padding:20px 32px 0">
    <h3 style="margin:0 0 10px;font-size:.9rem;font-weight:700;color:#374151">Actions recommandées cette semaine</h3>
    <ul style="margin:0;padding-left:18px;color:#475569;font-size:.85rem;line-height:1.8">{actions_html}</ul>
  </div>
  <div style="padding:28px 32px;text-align:center">
    <a href="{APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#818CF8,#6366f1);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:.92rem">Ouvrir NexHire EIP →</a>
  </div>
  <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="margin:0;color:#94a3b8;font-size:.75rem">© 2026 CivicAI Inc. · Briefing automatique chaque lundi · <a href="{APP_URL}" style="color:#818CF8;text-decoration:none">nexhire.ca</a></p>
  </div>
</div>
</body></html>"""
    return _send(to_email, subject, html)


def send_account_deletion_warning(
    to_email: str,
    org_name: str,
    days_until_deletion: int,
) -> bool:
    """Email d'avertissement de suppression de compte — 4 envois (23, 16, 9, 2 jours restants)."""
    if days_until_deletion <= 2:
        urgency_color = "#b91c1c"
        urgency_bg    = "#fef2f2"
        urgency_border = "#fecaca"
        prefix = "FINAL —"
    elif days_until_deletion <= 9:
        urgency_color = "#c2410c"
        urgency_bg    = "#fff7ed"
        urgency_border = "#fed7aa"
        prefix = "URGENT —"
    else:
        urgency_color = "#b45309"
        urgency_bg    = "#fffbeb"
        urgency_border = "#fde68a"
        prefix = "Avertissement —"

    subject = f"{prefix} Votre compte NexHire sera supprimé dans {days_until_deletion} jours"

    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">

    <div style="background:#0f172a;padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle">EIP</span>
      </span>
      <span style="color:#94a3b8;font-size:.8rem">Suppression de compte</span>
    </div>

    <div style="padding:28px 32px">

      <div style="background:{urgency_bg};border:1.5px solid {urgency_border};border-radius:12px;padding:18px 22px;margin-bottom:24px;text-align:center">
        <div style="font-size:2.8rem;font-weight:900;color:{urgency_color};line-height:1">{days_until_deletion}</div>
        <div style="font-size:.82rem;font-weight:700;color:{urgency_color};margin-top:4px">JOURS AVANT SUPPRESSION DÉFINITIVE</div>
      </div>

      <h2 style="margin:0 0 10px;color:#0f172a;font-size:1.05rem;font-weight:800">
        Votre compte <em>{org_name}</em> va être supprimé
      </h2>
      <p style="color:#475569;margin:0 0 16px;font-size:.9rem;line-height:1.6">
        Votre abonnement NexHire n'a pas été renouvelé. Conformément à notre politique,
        toutes les données de <strong>{org_name}</strong> seront <strong>définitivement supprimées</strong>
        dans <strong>{days_until_deletion} jours</strong>.
      </p>

      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:22px">
        <p style="margin:0 0 8px;font-weight:700;color:#1e293b;font-size:.88rem">Ce qui sera supprimé :</p>
        <ul style="margin:0;padding-left:18px;color:#64748b;font-size:.85rem;line-height:1.9">
          <li>Tous les documents et résumés IA</li>
          <li>Données d'organisation et profils utilisateurs</li>
          <li>Connecteurs et configurations</li>
          <li>Rapports, audits et historique d'activité</li>
        </ul>
      </div>

      <div style="text-align:center;margin:24px 0 18px">
        <a href="{APP_URL}#billing"
           style="display:inline-block;background:linear-gradient(135deg,#818CF8,#6366f1);color:#fff;
                  padding:14px 36px;border-radius:10px;font-weight:700;text-decoration:none;
                  font-size:.95rem;box-shadow:0 4px 14px rgba(99,102,241,.3)">
          Réactiver mon abonnement →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:.78rem;text-align:center;margin:0">
        Si vous avez déjà réactivé votre abonnement, ignorez cet email.
        Des questions ? Contactez-nous à <a href="mailto:support@nexhire.ca" style="color:#6366f1">support@nexhire.ca</a>
      </p>
    </div>

    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.76rem">
        © 2026 CivicAI Inc. · <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> 🍁
      </p>
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
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 CivicAI Inc. · contact@nexhire.ca</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_diagnostic_rapport_email(
    to_email: str,
    company_name: str,
    partner_name: str,
    score: float,
    niveau: str,
    primary_color: str,
    rapport_url: str,
) -> bool:
    niveau_labels = {"debutant": "Débutant", "intermediaire": "Intermédiaire", "avance": "Avancé"}
    niveau_colors = {"debutant": "#ef4444",  "intermediaire": "#f59e0b",       "avance": "#10b981"}
    niveau_label = niveau_labels.get(niveau, niveau)
    nc = niveau_colors.get(niveau, "#6366f1")
    subject = f"Votre rapport de maturité IA — {company_name}"
    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1)">

    <div style="background:{primary_color};padding:28px 36px;color:#fff">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;opacity:.75;margin-bottom:8px">Accélérateur IA · {partner_name}</div>
      <div style="font-size:22px;font-weight:900">Votre rapport est prêt</div>
      <div style="font-size:13px;opacity:.82;margin-top:4px">Rapport de maturité IA — IMAI /100</div>
    </div>

    <div style="padding:28px 36px">
      <p style="color:#475569;font-size:14px;margin:0 0 20px">Bonjour,</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.65">
        Votre diagnostic <strong>Parcours IA</strong> pour <strong>{company_name}</strong> est maintenant disponible.
        Voici un résumé de vos résultats :
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center">
        <div style="font-size:48px;font-weight:900;color:{nc};line-height:1">{score:.0f}</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:8px">/100 — Indice IMAI</div>
        <span style="display:inline-block;background:{nc}20;color:{nc};padding:5px 18px;border-radius:99px;font-size:14px;font-weight:700">{niveau_label}</span>
      </div>

      <div style="text-align:center;margin:24px 0">
        <a href="{rapport_url}"
           style="display:inline-block;background:{primary_color};color:#fff;padding:14px 36px;
                  border-radius:10px;font-weight:700;text-decoration:none;font-size:15px">
          Voir mon rapport complet →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
        Ce rapport est confidentiel et généré pour {company_name} dans le cadre du programme {partner_name}.
      </p>
    </div>

    <div style="background:#f8fafc;padding:14px 36px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.75rem">
        Propulsé par <strong style="color:#0f172a">AgentHub Platform</strong> ·
        <a href="{APP_URL}" style="color:#6366f1">myportal.nexhire.ca</a> · © 2026 CivicAI Inc.
      </p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject, html)


def send_m365_token_expiry_alert(
    to_email: str,
    org_name: str,
    days_left: int,
    service_account_email: str = "",
) -> bool:
    """Alerte l'admin/owner que le refresh token du compte de service M365 expire bientôt."""
    is_expired = days_left <= 0
    urgency_color  = "#dc2626" if days_left <= 7 else "#d97706"
    urgency_bg     = "#fef2f2" if days_left <= 7 else "#fffbeb"
    urgency_border = "#fecaca" if days_left <= 7 else "#fde68a"

    if is_expired:
        subject_line = f"🔴 Connexion M365 expirée — reconnexion requise — {org_name}"
        headline = "La connexion Microsoft 365 est expirée"
        body_msg = "Le token du compte de service Microsoft 365 a expiré. Les données M365 (licences, SharePoint, Entra) ne sont plus synchronisées."
    else:
        subject_line = f"⚠️ Connexion M365 expire dans {days_left} jour{'s' if days_left > 1 else ''} — {org_name}"
        headline = f"Connexion M365 — expiration dans {days_left} jour{'s' if days_left > 1 else ''}"
        body_msg = f"Le token OAuth du compte de service Microsoft 365 expirera dans <strong>{days_left} jour{'s' if days_left > 1 else ''}</strong>. Reconnectez-le avant l'expiration pour éviter toute interruption."

    account_row = f'<p style="margin:6px 0 0;font-size:.85rem;color:#475569">Compte : <strong>{service_account_email}</strong></p>' if service_account_email else ""

    html = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:24px 32px">
      <span style="font-size:1.2rem;font-weight:800;color:#fff">Nex<span style="color:#818CF8">hire</span>
        <span style="font-size:.65rem;background:rgba(129,140,248,.2);color:#818CF8;padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle">EIP</span>
      </span>
    </div>
    <div style="padding:28px 32px">
      <div style="background:{urgency_bg};border:1px solid {urgency_border};border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0;font-size:1rem;font-weight:700;color:{urgency_color}">{'🔴' if is_expired else '⚠️'} {headline}</p>
        {account_row}
      </div>
      <p style="color:#475569;margin:0 0 16px">{body_msg}</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:20px 0">
        <p style="margin:0;font-weight:700;color:#0369a1;font-size:.9rem">Action requise</p>
        <p style="margin:6px 0 0;color:#0c4a6e;font-size:.85rem">
          Connectez-vous à NexHire → <strong>Connecteurs → Microsoft 365</strong> → cliquez <strong>Reconnecter</strong>
          et utilisez le <strong>compte de service dédié</strong> (ex&nbsp;: nexhire-service@votreorg.com).
        </p>
      </div>
      <div style="text-align:center;margin-top:24px">
        <a href="{APP_URL}/?tab=connectors"
           style="display:inline-block;background:#0078d4;color:#fff;padding:11px 28px;border-radius:8px;font-weight:700;text-decoration:none">
          Reconnecter Microsoft 365 →
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 CivicAI Inc. · contact@nexhire.ca</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, subject_line, html)
