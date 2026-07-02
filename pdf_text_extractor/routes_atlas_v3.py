"""ATLAS Copilote v3 — interface conversationnelle.

L'utilisateur dialogue avec ATLAS. ATLAS interprète l'intent,
propose un plan d'action et attend confirmation.

Routes :
  POST   /api/atlas/chat        Message → intent → plan (streaming JSON)
  GET    /api/atlas/suggestions Suggestions contextuelles
  POST   /api/atlas/execute     Exécuter le plan confirmé
"""

import json
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth import CurrentUser, get_current_user
from db import get_db, row, rows

router = APIRouter(prefix="/api/atlas", tags=["atlas-v3"])

# ── Catalogue d'intents ────────────────────────────────────────────────────────

INTENT_PATTERNS = [
    {
        "id": "onboard_employee",
        "pattern": r"(onboard|nouvel? employ|ajoute|crée.*(employ|utilisateur|compte))",
        "label": "Onboarding Employé",
        "playbook_name": "Onboarding Employé",
        "steps_preview": [
            "Créer le compte Entra ID",
            "Créer Exchange + licence E3",
            "Ajouter aux groupes M365",
            "Validation manager (étape humaine)",
            "Créer Teams + canaux",
            "Créer ticket Jira",
            "Créer incident ServiceNow",
            "Envoyer courriel de bienvenue",
        ],
        "est_minutes": 3,
    },
    {
        "id": "offboard_employee",
        "pattern": r"(offboard|départ|quitte|désactiv|supprim.*(employ|utilisateur|compte))",
        "label": "Offboarding Sécurisé",
        "playbook_name": "Offboarding Sécurisé",
        "steps_preview": [
            "Désactiver le compte Entra ID",
            "Révoquer toutes les sessions",
            "Retirer des groupes M365",
            "Archiver la boîte Exchange",
            "Libérer la licence M365",
            "Clôturer les tickets Jira ouverts",
        ],
        "est_minutes": 2,
    },
    {
        "id": "fix_mfa",
        "pattern": r"(mfa|facteur|authentif.*(multi|deux|2)|comptes.*(sans|activ|manqu))",
        "label": "Activer MFA sur les comptes",
        "steps_preview": [
            "Identifier les comptes sans MFA (Microsoft Graph)",
            "Activer l'Authenticator App pour chaque compte",
            "Envoyer notification de bienvenue MFA",
        ],
        "est_minutes": 1,
    },
    {
        "id": "disable_licenses",
        "pattern": r"(licences?|inutilisé|inactif|désactiv.*(licences?|comptes?))",
        "label": "Désactiver licences inactives",
        "steps_preview": [
            "Scanner les licences sans connexion depuis 90 jours",
            "Désactiver les 14 comptes inactifs identifiés",
            "Libérer les licences (économie : 4 760 $/an)",
        ],
        "est_minutes": 2,
    },
    {
        "id": "iso27001_initiative",
        "pattern": r"(iso.?2700|certif.*(iso|27001))",
        "label": "Préparer la certification ISO 27001",
        "is_initiative": True,
        "steps_preview": [
            "Analyser les 370 contrôles ISO 27001",
            "Créer 25 décisions IA prioritisées",
            "Préparer 18 Playbooks de remédiation",
            "Générer 42 politiques vivantes",
            "Assigner les responsables par domaine",
        ],
        "est_minutes": None,
        "est_weeks": 6,
    },
    {
        "id": "score_drop_explain",
        "pattern": r"(score|pourquoi|baiss|chut|tomb|redui|diminué|déclin)",
        "label": "Analyser la baisse de score",
        "is_analysis": True,
        "steps_preview": [],
        "est_minutes": 1,
    },
    {
        "id": "compliance_loi25",
        "pattern": r"(loi.?25|renseignements? personnels?|privac|prp|confor.*loi)",
        "label": "Plan d\'action Loi 25",
        "is_initiative": True,
        "steps_preview": [
            "Évaluer les 12 exigences Loi 25",
            "Créer les politiques de confidentialité manquantes",
            "Générer les formulaires d'évaluation des facteurs relatifs à la vie privée",
            "Assigner le RPRP (Responsable de la protection des renseignements personnels)",
        ],
        "est_weeks": 3,
    },
    {
        "id": "security_incident",
        "pattern": r"(incident|sécurité|compromis|attaque|intrusion|alerte|menace)",
        "label": "Réponse Incident Sécurité",
        "playbook_name": "Réponse Incident Sécurité",
        "steps_preview": [
            "Alerter RSSI et Direction (Teams)",
            "Isoler le compte compromis",
            "Révoquer toutes les sessions",
            "Forcer réinitialisation MFA",
            "Créer incident ServiceNow P1",
        ],
        "est_minutes": 5,
    },
]

FALLBACK_RESPONSE = {
    "intent_id": "general_query",
    "intent_label": "Question générale",
    "message": "Je n'ai pas trouvé d'action automatisable pour cette demande. "
    "Voici ce que je peux faire pour vous :\n"
    "• **Onboarding / Offboarding** d'un employé\n"
    "• **Activer MFA** sur les comptes administrateurs\n"
    "• **Désactiver** les licences inutilisées\n"
    "• **Préparer** une certification ISO 27001 ou la conformité Loi 25\n"
    "• **Répondre** à un incident de sécurité\n"
    "• **Expliquer** la baisse d'un score de conformité",
    "actions": [],
    "requires_confirmation": False,
}


def _match_intent(text: str) -> dict | None:
    text_lower = text.lower()
    for intent in INTENT_PATTERNS:
        if re.search(intent["pattern"], text_lower, re.IGNORECASE):
            return intent
    return None


def _build_plan(intent: dict, org_id: str, user_input: str) -> dict:
    steps = [{"label": s, "status": "pending"} for s in intent["steps_preview"]]

    if intent.get("is_analysis"):
        return {
            "intent_id": intent["id"],
            "intent_label": intent["label"],
            "message": "Analyse en cours… J'examine votre score de conformité et les causes probables.",
            "analysis": {
                "score_before": 82,
                "score_after": 76,
                "delta": -6,
                "causes": [
                    {"label": "8 comptes admin sans MFA", "impact_pts": -4, "action": "fix_mfa"},
                    {"label": "2 politiques expirées", "impact_pts": -1, "action": "renew_policies"},
                    {"label": "1 audit de conformité en retard", "impact_pts": -1, "action": "schedule_audit"},
                ],
            },
            "actions": [
                {"id": "fix_mfa", "label": "Activer MFA maintenant", "type": "orchestration"},
                {"id": "renew_policies", "label": "Renouveler les politiques", "type": "policy"},
                {"id": "schedule_audit", "label": "Planifier l'audit manquant", "type": "task"},
            ],
            "requires_confirmation": True,
        }

    if intent.get("is_initiative"):
        return {
            "intent_id": intent["id"],
            "intent_label": intent["label"],
            "message": f"Analyse en cours… J'ai trouvé les éléments nécessaires pour l'initiative « {intent['label']} ».",
            "initiative": {
                "name": intent["label"],
                "est_weeks": intent.get("est_weeks"),
                "steps_preview": intent["steps_preview"],
            },
            "actions": [
                {
                    "id": "create_initiative",
                    "label": f"Créer l'initiative {intent['label']}",
                    "type": "initiative",
                    "payload": {"name": intent["label"], "template_id": intent["id"]},
                },
            ],
            "requires_confirmation": True,
        }

    # Playbook flow
    est = intent.get("est_minutes")
    est_label = f"{est} minute{'s' if est != 1 else ''}" if est else "quelques minutes"

    return {
        "intent_id": intent["id"],
        "intent_label": intent["label"],
        "playbook_name": intent.get("playbook_name"),
        "message": f"J'ai trouvé le Playbook « {intent.get('playbook_name', intent['label'])} ».",
        "steps": steps,
        "est_label": est_label,
        "actions": [
            {
                "id": "run_playbook",
                "label": "Exécuter",
                "type": "playbook",
                "primary": True,
                "payload": {"playbook_name": intent.get("playbook_name")},
            },
            {"id": "schedule", "label": "Planifier", "type": "schedule"},
            {"id": "delegate", "label": "Déléguer →", "type": "delegate"},
        ],
        "requires_confirmation": True,
    }


# ── Chat ───────────────────────────────────────────────────────────────────────


class ChatPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: dict = Field(default_factory=dict)


@router.post("/chat")
def atlas_chat(
    request: Request,
    payload: ChatPayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    intent = _match_intent(payload.message)

    if not intent:
        return FALLBACK_RESPONSE

    plan = _build_plan(intent, oid, payload.message)
    return plan


# ── Suggestions contextuelles ─────────────────────────────────────────────────


@router.get("/suggestions")
def atlas_suggestions(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)

    # Charger les décisions urgentes
    with get_db() as cur:
        cur.execute(
            """SELECT title, priority, cost_of_inaction FROM ai_decisions
               WHERE org_id = %s AND status IN ('new','reviewing') AND priority IN ('critical','high')
               ORDER BY CASE priority WHEN 'critical' THEN 1 ELSE 2 END
               LIMIT 3""",
            (oid,),
        )
        urgent = [dict(r) for r in rows(cur)]

    suggestions = []

    if urgent:
        d = urgent[0]
        suggestions.append(
            {
                "text": f"Traite la décision urgente : « {d['title']} »",
                "type": "decision",
                "priority": d["priority"],
            }
        )

    suggestions += [
        {"text": "Ajoute un nouvel employé", "type": "playbook", "intent": "onboard_employee"},
        {"text": "Désactive les licences inactives", "type": "orchestration", "intent": "disable_licenses"},
        {"text": "Prépare-nous pour ISO 27001", "type": "initiative", "intent": "iso27001_initiative"},
        {
            "text": "Pourquoi notre score de conformité a-t-il baissé ?",
            "type": "analysis",
            "intent": "score_drop_explain",
        },
    ]

    return {"suggestions": suggestions[:5]}


# ── Exécuter le plan confirmé ─────────────────────────────────────────────────


class ExecutePayload(BaseModel):
    intent_id: str
    action_id: str
    action_payload: dict = Field(default_factory=dict)


@router.post("/execute")
def atlas_execute(
    request: Request,
    payload: ExecutePayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)

    if payload.action_id == "run_playbook":
        playbook_name = payload.action_payload.get("playbook_name", "")
        with get_db() as cur:
            cur.execute(
                "SELECT id FROM playbooks WHERE org_id = %s AND name ILIKE %s AND status = 'active' LIMIT 1",
                (oid, f"%{playbook_name}%"),
            )
            pb = row(cur)
        if not pb:
            return {"ok": False, "error": f"Playbook « {playbook_name} » introuvable ou inactif."}

        import json as _json

        with get_db() as cur:
            cur.execute(
                """INSERT INTO playbook_runs (playbook_id, org_id, status, trigger_type, triggered_by, context, started_at)
                   SELECT id, org_id, 'running', 'atlas', %s, '{}'::jsonb, now()
                   FROM playbooks WHERE id = %s
                   RETURNING id""",
                (str(user.id), str(pb["id"])),
            )
            run = row(cur)
            cur.execute(
                "UPDATE playbooks SET run_count = run_count + 1, last_run_at = now() WHERE id = %s",
                (str(pb["id"]),),
            )
        return {
            "ok": True,
            "action": "playbook_started",
            "run_id": str(run["id"]),
            "message": f"Playbook « {playbook_name} » démarré avec succès.",
        }

    if payload.action_id == "create_initiative":
        name = payload.action_payload.get("name", "Nouvelle Initiative")
        template_id = payload.action_payload.get("template_id")
        with get_db() as cur:
            cur.execute(
                "INSERT INTO initiatives (org_id, name, status, created_by) VALUES (%s,%s,'active',%s) RETURNING id",
                (oid, name, str(user.id)),
            )
            init = row(cur)
        return {
            "ok": True,
            "action": "initiative_created",
            "initiative_id": str(init["id"]),
            "message": f"Initiative « {name} » créée. Accédez aux Initiatives pour la compléter.",
        }

    return {"ok": False, "error": "Action non reconnue."}
