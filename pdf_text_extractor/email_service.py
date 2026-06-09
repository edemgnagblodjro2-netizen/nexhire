"""Service d'envoi d'emails via Resend API (https://resend.com)."""
from __future__ import annotations

import os
import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL     = os.environ.get("EMAIL_FROM", "NexHire <noreply@nexhire.ca>")
APP_URL        = os.environ.get("APP_URL", "https://agenthub.nexhire.ca")


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
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">agenthub.nexhire.ca</a> · Conçu pour les organisations canadiennes 🍁</p>
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
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">agenthub.nexhire.ca</a> · Vous recevez ce rapport car vous êtes admin de {org_name}.</p>
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
        © 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">agenthub.nexhire.ca</a> ·
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
      <p style="margin:0;color:#94a3b8;font-size:.76rem">© 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">agenthub.nexhire.ca</a> 🍁</p>
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
      <p style="margin:0;color:#94a3b8;font-size:.76rem">© 2026 Nexhire Inc. · <a href="{APP_URL}" style="color:#6366f1">agenthub.nexhire.ca</a></p>
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
      <p style="margin:0;color:#94a3b8;font-size:.78rem">© 2026 Nexhire Inc. · contact@nexhire.ca</p>
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
