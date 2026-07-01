"""Conformité Loi 25 (Québec) / PIPEDA (Canada) — Niveau 5.

Droits des personnes concernées :
  GET  /api/compliance/my-data          → export de toutes les données personnelles
  POST /api/compliance/delete-request   → demande de suppression (right to be forgotten)
  GET  /api/compliance/processing       → registre des traitements (ce qu'on collecte et pourquoi)
  POST /api/compliance/consent          → enregistrement du consentement
  GET  /api/compliance/alerts           → alertes sécurité non acquittées (admin)
  POST /api/compliance/alerts/{id}/ack  → acquitter une alerte (admin)
"""
import os
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


# ── 1. Export données personnelles ────────────────────────────────────────────

@router.get("/my-data")
def export_my_data(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    """Exporte toutes les données personnelles de l'utilisateur courant (Loi 25 art. 27).

    Retourne un JSON structuré avec : profil, audit logs, documents, connecteurs.
    """
    uid  = str(user.id)
    oid  = str(user.organization_id)

    # Profil
    with get_db() as cur:
        cur.execute(
            "SELECT id, email, full_name, role, created_at FROM users WHERE id = %s LIMIT 1",
            (uid,),
        )
        profile = row(cur) or {}

    # Historique des actions (audit logs — 90 derniers jours)
    with get_db() as cur:
        cur.execute(
            """SELECT action, query, ip_address, success, http_status, created_at
               FROM audit_logs
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT 500""",
            (uid,),
        )
        audit_history = [dict(r) for r in rows(cur)]

    # Documents uploadés
    with get_db() as cur:
        cur.execute(
            "SELECT id, filename, created_at FROM documents WHERE user_id = %s ORDER BY created_at DESC",
            (uid,),
        )
        documents = [dict(r) for r in rows(cur)]

    # Connecteurs configurés (sans les credentials — chiffrés et jamais exposés)
    with get_db() as cur:
        cur.execute(
            """SELECT connector_type, status, created_at, updated_at
               FROM connectors WHERE organization_id = %s""",
            (oid,),
        )
        connectors = [dict(r) for r in rows(cur)]

    log_audit(AuditEvent(
        action="compliance_data_export",
        user_id=uid,
        organization_id=oid,
        ip_address=client_ip(request),
        success=True,
        http_status=200,
    ))

    return {
        "exported_at":    datetime.now(UTC).isoformat(),
        "subject":        "Loi 25 (Québec) — PIPEDA (Canada) — Droit d'accès",
        "profile":        {k: str(v) if v is not None else None for k, v in profile.items()},
        "audit_history":  [{k: str(v) if v is not None else None for k, v in a.items()} for a in audit_history],
        "documents":      [{k: str(v) if v is not None else None for k, v in d.items()} for d in documents],
        "connectors_org": [{k: str(v) if v is not None else None for k, v in c.items()} for c in connectors],
        "note":           "Les mots de passe et tokens OAuth ne sont jamais stockés en clair et ne figurent pas dans cet export.",
    }


# ── 2. Demande de suppression ────────────────────────────────────────────────

class DeleteRequestPayload(BaseModel):
    reason: str | None = Field(None, max_length=500)

@router.post("/delete-request", status_code=201)
def request_deletion(
    request: Request,
    payload: DeleteRequestPayload,
    user: CurrentUser = Depends(get_current_user),
):
    """Soumet une demande de suppression de données (droit à l'effacement).

    La demande est traitée manuellement par NexHire dans un délai de 30 jours
    (Loi 25 — délai légal).
    """
    uid = str(user.id)
    oid = str(user.organization_id)

    with get_db() as cur:
        cur.execute(
            """INSERT INTO data_deletion_requests (user_id, organization_id, reason)
               VALUES (%s, %s, %s) RETURNING id""",
            (uid, oid, payload.reason),
        )
        result = row(cur)

    log_audit(AuditEvent(
        action="compliance_deletion_request",
        user_id=uid,
        organization_id=oid,
        ip_address=client_ip(request),
        success=True,
        http_status=201,
        metadata={"request_id": str(result["id"]) if result else None},
    ))

    # Notifier l'admin
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT email FROM users WHERE organization_id = %s AND role = 'owner' LIMIT 1",
                (oid,),
            )
            admin = row(cur)
        if admin:
            from email_service import _send
            _send(
                os.environ.get("DPO_EMAIL", "dpo@nexhire.ca"),
                f"Loi 25 — Demande de suppression reçue",
                f"<p>Utilisateur : {uid}<br>Organisation : {oid}<br>"
                f"Raison : {payload.reason or 'non précisée'}</p>"
                f"<p>Délai légal : 30 jours pour traitement.</p>",
            )
    except Exception:
        pass

    return {
        "ok":      True,
        "request_id": str(result["id"]) if result else None,
        "message": "Demande enregistrée. NexHire traitera votre demande dans un délai maximum de 30 jours conformément à la Loi 25.",
    }


# ── 3. Registre des traitements ──────────────────────────────────────────────

@router.get("/processing")
def data_processing_manifest():
    """Registre des traitements de données — transparent et public."""
    return {
        "responsable":    "NexHire / Edem Gnagblodjro",
        "contact_dpo":    os.environ.get("DPO_EMAIL", "dpo@nexhire.ca"),
        "loi_applicable": ["Loi 25 (Québec)", "PIPEDA (Canada fédéral)"],
        "traitements": [
            {
                "nom":       "Authentification",
                "données":   ["email", "mot de passe haché (Supabase)", "JWT token"],
                "finalité":  "Identification et accès sécurisé",
                "durée":     "Durée de vie du compte + 90 jours logs",
                "base_légale": "Exécution du contrat",
            },
            {
                "nom":       "Documents uploadés",
                "données":   ["contenu du document", "nom du fichier", "date upload"],
                "finalité":  "Analyse IA et résumés automatisés",
                "durée":     "Jusqu'à suppression par l'utilisateur",
                "base_légale": "Exécution du contrat",
            },
            {
                "nom":       "Connecteurs organisationnels",
                "données":   ["tokens OAuth chiffrés", "type de connecteur", "statut"],
                "finalité":  "Accès aux systèmes tiers pour l'IA décisionnelle",
                "durée":     "Jusqu'à déconnexion du connecteur",
                "base_légale": "Exécution du contrat",
            },
            {
                "nom":       "Journaux d'audit",
                "données":   ["IP", "action", "horodatage", "identifiant utilisateur"],
                "finalité":  "Sécurité, détection fraude, conformité",
                "durée":     "90 jours minimum",
                "base_légale": "Obligation légale (Loi 25 art. 11)",
            },
            {
                "nom":       "Facturation",
                "données":   ["email", "plan", "ID client Stripe"],
                "finalité":  "Gestion des abonnements",
                "durée":     "7 ans (obligation comptable)",
                "base_légale": "Obligation légale",
            },
        ],
        "droits": [
            "Droit d'accès (GET /api/compliance/my-data)",
            "Droit de rectification (via paramètres du compte)",
            "Droit à l'effacement (POST /api/compliance/delete-request)",
            "Droit à la portabilité (export JSON)",
            "Droit d'opposition (contacter le DPO)",
        ],
        "transferts_internationaux": "Données hébergées sur Render (US-East) + Supabase (US-East). "
                                     "Encadrés par clauses contractuelles types.",
    }


# ── 4. Consentement explicite ────────────────────────────────────────────────

class ConsentPayload(BaseModel):
    consent_type: str = Field(..., pattern="^(analytics|marketing|ai_training)$")
    granted: bool

@router.post("/consent", status_code=201)
def record_consent(
    request: Request,
    payload: ConsentPayload,
    user: CurrentUser = Depends(get_current_user),
):
    """Enregistre le consentement explicite de l'utilisateur (Loi 25 art. 12)."""
    uid = str(user.id)
    oid = str(user.organization_id)

    with get_db() as cur:
        cur.execute(
            """INSERT INTO consent_records
               (user_id, organization_id, consent_type, granted, ip_address, user_agent)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (uid, oid, payload.consent_type, payload.granted,
             client_ip(request),
             request.headers.get("user-agent", "")[:255]),
        )

    return {"ok": True, "consent_type": payload.consent_type, "granted": payload.granted}


# ── 5. Alertes sécurité (admin) ───────────────────────────────────────────────

@router.get("/alerts")
def list_security_alerts(
    user: CurrentUser = Depends(require_min_role("admin")),
    unacked_only: bool = True,
):
    """Retourne les alertes sécurité de l'organisation."""
    sql = """
        SELECT id, alert_type, severity, details, ip_address,
               user_id, is_acknowledged, acknowledged_at, created_at
        FROM security_alerts
        WHERE organization_id = %s
    """
    params: list = [str(user.organization_id)]
    if unacked_only:
        sql += " AND NOT is_acknowledged"
    sql += " ORDER BY created_at DESC LIMIT 100"

    with get_db() as cur:
        cur.execute(sql, params)
        alerts = rows(cur)

    return [
        {**dict(a), "id": str(a["id"]), "created_at": str(a["created_at"])}
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(
    alert_id: str,
    request: Request,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Marque une alerte comme acquittée."""
    with get_db() as cur:
        cur.execute(
            """UPDATE security_alerts
               SET is_acknowledged = TRUE,
                   acknowledged_by = %s,
                   acknowledged_at = NOW()
               WHERE id = %s AND organization_id = %s
               RETURNING id""",
            (str(user.id), alert_id, str(user.organization_id)),
        )
        updated = row(cur)

    if not updated:
        raise HTTPException(status_code=404, detail="Alerte introuvable.")

    log_audit(AuditEvent(
        action="security_alert_acknowledged",
        user_id=str(user.id),
        organization_id=str(user.organization_id),
        ip_address=client_ip(request),
        success=True,
        http_status=200,
        resource_ids=[alert_id],
    ))
    return {"ok": True}
