"""
Sales Intelligence — Couche service & agents IA

8 agents spécialisés, tous construits sur le pattern run_agent() existant
ou des appels OpenAI directs avec logs dans si_agent_runs.
"""
import json
import os
import time
from datetime import UTC, datetime
from typing import Any

from db import get_db, row

_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

try:
    from openai import AsyncOpenAI
    _oai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    _OAI_OK = True
except ImportError:
    _OAI_OK = False
    _oai = None


# ──────────────────────────────────────────────────────────────────────────
# Helpers internes
# ──────────────────────────────────────────────────────────────────────────

def _log_run(org_id: str, agent_type: str, status: str, input_data: dict,
             output_data: dict, duration_ms: int, tokens: int = 0,
             prospect_id: str | None = None, campaign_id: str | None = None,
             conversation_id: str | None = None, error: str | None = None) -> None:
    with get_db() as cur:
        cur.execute("""
            INSERT INTO si_agent_runs
              (organization_id, agent_type, prospect_id, campaign_id, conversation_id,
               status, input_data, output_data, error_message, tokens_used,
               model_used, duration_ms, completed_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s,%s,NOW())
        """, (org_id, agent_type, prospect_id, campaign_id, conversation_id,
              status, json.dumps(input_data), json.dumps(output_data),
              error, tokens, _OPENAI_MODEL, duration_ms))


async def _call_llm(system: str, user: str, json_mode: bool = True) -> tuple[str, int]:
    if not _OAI_OK:
        return json.dumps({"mock": True, "message": "OpenAI non disponible en dev"}), 0
    kwargs: dict[str, Any] = {
        "model": _OPENAI_MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.3,
        "max_tokens": 1500,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = await _oai.chat.completions.create(**kwargs)
    tokens = response.usage.total_tokens if response.usage else 0
    return response.choices[0].message.content, tokens


def _safe_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": raw}


# ──────────────────────────────────────────────────────────────────────────
# 1. RESEARCH AGENT — enrichissement données entreprise
# ──────────────────────────────────────────────────────────────────────────

async def research_agent(prospect: dict, org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()
    system_prompt = """Tu es un agent de recherche commercial expert.
Analyse les données disponibles sur l'entreprise prospect et retourne un JSON structuré avec :
- enrichment: { sector_refined, revenue_estimate, growth_signals, tech_stack, recent_news }
- intent_signals: [ { signal, strength (1-10), source } ]
- decision_makers: [ { name, title, linkedin_url, email_pattern } ]
- summary: string (2-3 phrases résumant le prospect)
Réponds UNIQUEMENT en JSON valide."""

    user_prompt = f"""Entreprise : {prospect.get('company_name')}
Site web : {prospect.get('website', 'inconnu')}
LinkedIn : {prospect.get('linkedin_url', 'inconnu')}
Secteur : {prospect.get('sector', 'inconnu')}
Pays : {prospect.get('country', 'inconnu')}
Employés : {prospect.get('employee_count', 'inconnu')}
Contact connu : {prospect.get('contact_name', 'inconnu')} ({prospect.get('contact_title', '')})"""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "research", "success",
                 {"prospect_id": str(prospect["id"]), "company": prospect["company_name"]},
                 result, duration, tokens, prospect_id=str(prospect["id"]))
        return result
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "research", "error",
                 {"prospect_id": str(prospect["id"])}, {}, duration,
                 prospect_id=str(prospect["id"]), error=str(exc))
        return {"enrichment": {}, "intent_signals": [], "summary": "Enrichissement indisponible"}


# ──────────────────────────────────────────────────────────────────────────
# 2. QUALIFICATION AGENT — scoring ICP 0–100 avec facteurs explicatifs
# ──────────────────────────────────────────────────────────────────────────

async def qualification_agent(prospect: dict, icp: dict | None, org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()
    icp_desc = icp.get("icp_description", "PME technologique, 50-500 employés") if icp else "PME technologique"
    sectors = icp.get("target_sectors", []) if icp else []
    countries = icp.get("target_countries", ["CA", "FR"]) if icp else ["CA"]
    emp_min = icp.get("employee_min", 10) if icp else 10
    emp_max = icp.get("employee_max", 5000) if icp else 5000

    system_prompt = """Tu es un expert en qualification de prospects commerciaux.
Note ce prospect sur 10 critères (chacun de 0 à 10) puis calcule un score global de 0 à 100.
Retourne un JSON avec :
- score: int (0-100)
- factors: { sector_fit, size_fit, geography_fit, budget_potential, tech_maturity, growth_stage, decision_maker_access, urgency_signals, competitive_landscape, timing_fit } (chacun 0-10)
- explanation: string (2-3 phrases justifiant le score)
- recommendation: string (prochaine action recommandée)
Réponds UNIQUEMENT en JSON valide."""

    user_prompt = f"""ICP cible : {icp_desc}
Secteurs visés : {', '.join(sectors) or 'tous'}
Pays cibles : {', '.join(countries)}
Taille entreprise cible : {emp_min}–{emp_max} employés

Prospect :
- Entreprise : {prospect.get('company_name')}
- Secteur : {prospect.get('sector', 'inconnu')}
- Pays : {prospect.get('country', 'inconnu')}
- Employés : {prospect.get('employee_count', 'inconnu')}
- Budget estimé : {prospect.get('estimated_budget', 'inconnu')}
- Signaux d'intention : {json.dumps(prospect.get('intent_signals', []))}
- Score facteurs enrichissement : {json.dumps(prospect.get('score_factors', {}))}"""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "qualification", "success",
                 {"prospect_id": str(prospect["id"])},
                 result, duration, tokens, prospect_id=str(prospect["id"]))
        return result
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "qualification", "error",
                 {"prospect_id": str(prospect["id"])}, {}, duration,
                 prospect_id=str(prospect["id"]), error=str(exc))
        return {"score": 50, "factors": {}, "explanation": "Score par défaut — qualification indisponible", "recommendation": "Enrichir le profil prospect"}


# ──────────────────────────────────────────────────────────────────────────
# 3. SALES AGENT — message de premier contact personnalisé
# ──────────────────────────────────────────────────────────────────────────

async def sales_agent(prospect: dict, template: dict | None, org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()
    template_body = template.get("body", "") if template else ""
    template_subject = template.get("subject", "") if template else ""

    system_prompt = """Tu es un expert en vente B2B et en rédaction d'emails de prospection.
Rédige un email de premier contact professionnel, personnalisé et convaincant.
Retourne un JSON avec :
- subject: string (objet de l'email)
- message: string (corps de l'email, format texte ou HTML minimal)
- key_hooks: [ string ] (3 éléments de personnalisation utilisés)
Réponds UNIQUEMENT en JSON valide. L'email doit être en français si le pays est CA, FR, BE ou CH."""

    user_prompt = f"""Prospect :
- Entreprise : {prospect.get('company_name')}
- Contact : {prospect.get('contact_name', 'Directeur')} ({prospect.get('contact_title', 'Décideur')})
- Secteur : {prospect.get('sector', 'inconnu')}
- Pays : {prospect.get('country', 'Canada')}
- Employés : {prospect.get('employee_count', 'inconnu')}
- Signaux d'intérêt : {json.dumps(prospect.get('intent_signals', []))}

Template de référence (adapter, ne pas copier mot pour mot) :
Objet : {template_subject or "Sujet à personnaliser"}
Corps : {template_body or "Email de présentation à personnaliser"}

Personnalise l'email en utilisant des éléments spécifiques à cette entreprise."""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "sales", "success",
                 {"prospect_id": str(prospect["id"])},
                 result, duration, tokens, prospect_id=str(prospect["id"]))
        return {**result, "tokens_used": tokens}
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "sales", "error",
                 {"prospect_id": str(prospect["id"])}, {}, duration,
                 prospect_id=str(prospect["id"]), error=str(exc))
        return {
            "subject": f"Collaboration avec {prospect.get('company_name')}",
            "message": "Email de prise de contact personnalisé indisponible.",
            "tokens_used": 0,
        }


# ──────────────────────────────────────────────────────────────────────────
# 4. FOLLOW-UP AGENT — relance intelligente basée sur l'historique
# ──────────────────────────────────────────────────────────────────────────

async def followup_agent(conversation: dict, messages: list[dict], org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()
    history = "\n".join([f"[{m['role']}] {m['content'][:500]}" for m in messages[-5:]])

    system_prompt = """Tu es un expert en relance commerciale.
Analyse le fil de conversation et rédige un message de relance approprié.
Retourne un JSON avec :
- subject: string
- message: string
- delay_days: int (délai recommandé en jours avant envoi)
- strategy: string (stratégie choisie : valeur_ajoutée|urgence|social_proof|question|abandon)
Réponds UNIQUEMENT en JSON valide."""

    user_prompt = f"""Prospect : {conversation.get('company_name', 'Inconnu')}
Historique (derniers échanges) :
{history}

Sentiment actuel : {conversation.get('sentiment', 'neutral')}
Statut : {conversation.get('status', 'open')}
Dernière action : {conversation.get('next_action', 'aucune')}"""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "followup", "success",
                 {"conversation_id": str(conversation["id"])},
                 result, duration, tokens,
                 conversation_id=str(conversation["id"]))
        return result
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "followup", "error",
                 {"conversation_id": str(conversation["id"])}, {}, duration,
                 conversation_id=str(conversation["id"]), error=str(exc))
        return {"subject": "Suivi de notre échange", "message": "Bonjour, je reviens vers vous concernant notre échange récent.", "delay_days": 3, "strategy": "valeur_ajoutée"}


# ──────────────────────────────────────────────────────────────────────────
# 5. MEETING AGENT — proposition de rendez-vous
# ──────────────────────────────────────────────────────────────────────────

async def meeting_agent(prospect: dict, conversation: dict, org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()

    system_prompt = """Tu es un agent spécialisé dans la planification de réunions commerciales.
Propose un plan de prise de rendez-vous.
Retourne un JSON avec :
- email_subject: string
- email_body: string (invitation à un appel de 30 min)
- suggested_duration: int (minutes)
- meeting_agenda: [ string ] (3-5 points d'agenda)
- value_statement: string (pourquoi ce RDV vaut le temps du prospect)
Réponds UNIQUEMENT en JSON valide."""

    user_prompt = f"""Prospect : {prospect.get('company_name')}
Contact : {prospect.get('contact_name')} ({prospect.get('contact_title')})
Score de qualification : {prospect.get('ai_score', 'non scoré')}/100
Résumé conversation : {conversation.get('ai_summary', 'Échanges préliminaires positifs')}
Probabilité de conversion : {conversation.get('conversion_prob', 50)}%"""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "meeting", "success",
                 {"prospect_id": str(prospect["id"])},
                 result, duration, tokens, prospect_id=str(prospect["id"]))
        return result
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "meeting", "error",
                 {"prospect_id": str(prospect["id"])}, {}, duration,
                 prospect_id=str(prospect["id"]), error=str(exc))
        return {"email_subject": "Appel de découverte", "email_body": "Bonjour, je vous propose un appel de 30 minutes.", "suggested_duration": 30, "meeting_agenda": ["Présentation"], "value_statement": ""}


# ──────────────────────────────────────────────────────────────────────────
# 6. PROPOSAL AGENT — génération d'offre commerciale
# ──────────────────────────────────────────────────────────────────────────

async def proposal_agent(prospect: dict, icp: dict | None, org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()
    products = icp.get("products", []) if icp else []
    value_prop = icp.get("value_proposition", "") if icp else ""

    system_prompt = """Tu es un expert en rédaction d'offres commerciales B2B.
Génère une offre commerciale personnalisée.
Retourne un JSON avec :
- title: string
- executive_summary: string (3-4 phrases)
- sections: [ { heading, content } ] (5-7 sections)
- recommended_products: [ string ]
- estimated_value: string (ex: "15 000$ à 30 000$ / an")
- next_steps: [ string ]
Réponds UNIQUEMENT en JSON valide."""

    user_prompt = f"""Prospect : {prospect.get('company_name')}
Secteur : {prospect.get('sector', 'inconnu')}
Employés : {prospect.get('employee_count', 'inconnu')}
Budget estimé : {prospect.get('estimated_budget', 'à qualifier')}
Score ICP : {prospect.get('ai_score', 50)}/100
Notes : {prospect.get('notes', '')}

Nos produits : {json.dumps(products)}
Notre proposition de valeur : {value_prop}"""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "proposal", "success",
                 {"prospect_id": str(prospect["id"])},
                 result, duration, tokens, prospect_id=str(prospect["id"]))
        return result
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "proposal", "error",
                 {"prospect_id": str(prospect["id"])}, {}, duration,
                 prospect_id=str(prospect["id"]), error=str(exc))
        return {"title": "Offre commerciale", "executive_summary": "Offre personnalisée indisponible.", "sections": [], "next_steps": []}


# ──────────────────────────────────────────────────────────────────────────
# 7. CRM SYNC AGENT — synchronisation vers HubSpot/Salesforce
# ──────────────────────────────────────────────────────────────────────────

async def crm_sync_agent(prospect: dict, org_id: str, user_id: str) -> dict:
    t0 = time.monotonic()
    crm_type = "hubspot"

    try:
        from connector_loader import load_creds
        creds = load_creds(org_id, crm_type)
    except Exception:
        creds = None

    if creds:
        try:
            if crm_type == "hubspot":
                from hubspot_service import sync_contact
                crm_id = await sync_contact(creds, prospect)
            else:
                from salesforce_service import sync_lead
                crm_id = await sync_lead(creds, prospect)

            duration = int((time.monotonic() - t0) * 1000)
            result = {"crm_type": crm_type, "crm_record_id": str(crm_id), "status": "synced",
                      "data": {"company": prospect["company_name"], "email": prospect.get("contact_email")}}
            _log_run(org_id, "crm_sync", "success",
                     {"prospect_id": str(prospect["id"]), "crm_type": crm_type},
                     result, duration, prospect_id=str(prospect["id"]))
            return result
        except Exception as exc:
            duration = int((time.monotonic() - t0) * 1000)
            _log_run(org_id, "crm_sync", "error",
                     {"prospect_id": str(prospect["id"])}, {},
                     duration, prospect_id=str(prospect["id"]), error=str(exc))
            return {"crm_type": crm_type, "status": "failed", "data": {}}

    duration = int((time.monotonic() - t0) * 1000)
    _log_run(org_id, "crm_sync", "error",
             {"prospect_id": str(prospect["id"])}, {},
             duration, prospect_id=str(prospect["id"]),
             error=f"Connecteur {crm_type} non configuré pour cette organisation")
    return {"crm_type": crm_type, "status": "failed", "data": {}, "error": f"Connecteur {crm_type} non configuré"}


# ──────────────────────────────────────────────────────────────────────────
# 8. PROSPECTOR AGENT — identification automatique de prospects
# ──────────────────────────────────────────────────────────────────────────

async def prospector_agent(icp: dict, org_id: str, campaign_id: str | None = None) -> list[dict]:
    """Génère une liste de prospects candidats basée sur le profil ICP.
    En production, connecterait à une API de données (Apollo, LinkedIn Sales Nav, etc.)
    Pour l'instant, utilise le LLM pour simuler la découverte."""
    t0 = time.monotonic()

    system_prompt = """Tu es un agent de prospection commerciale expert.
Génère une liste réaliste de prospects potentiels correspondant au profil ICP fourni.
Retourne un JSON avec :
- prospects: [ { company_name, website, sector, country, city, employee_count, contact_name, contact_title, contact_email, source, reason } ]
Génère exactement 5 prospects réalistes et diversifiés.
Réponds UNIQUEMENT en JSON valide."""

    user_prompt = f"""Profil ICP :
- Description : {icp.get('icp_description', 'PME tech')}
- Secteurs cibles : {', '.join(icp.get('target_sectors', []))}
- Pays cibles : {', '.join(icp.get('target_countries', ['CA']))}
- Taille (employés) : {icp.get('employee_min', 10)}–{icp.get('employee_max', 500)}
- Langues : {', '.join(icp.get('languages', ['fr']))}
- Proposition de valeur : {icp.get('value_proposition', '')}"""

    try:
        raw, tokens = await _call_llm(system_prompt, user_prompt)
        result = _safe_json(raw)
        prospects = result.get("prospects", [])
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "prospector", "success",
                 {"campaign_id": campaign_id},
                 {"count": len(prospects)}, duration, tokens, campaign_id=campaign_id)
        return prospects
    except Exception as exc:
        duration = int((time.monotonic() - t0) * 1000)
        _log_run(org_id, "prospector", "error",
                 {"campaign_id": campaign_id}, {}, duration,
                 campaign_id=campaign_id, error=str(exc))
        return []


# ──────────────────────────────────────────────────────────────────────────
# Tâche planifiée — relances automatiques
# ──────────────────────────────────────────────────────────────────────────

async def process_scheduled_followups() -> dict:
    """À appeler depuis scheduler.py — traite les conversations en attente de relance."""
    processed, errors = 0, 0
    with get_db() as cur:
        cur.execute("""
            SELECT c.*, p.company_name, p.contact_name
            FROM si_conversations c
            JOIN si_prospects p ON c.prospect_id = p.id
            WHERE c.status = 'open'
              AND c.next_action = 'followup'
              AND c.next_action_at <= NOW()
            LIMIT 50
        """)
        pending = cur.fetchall()

    for conv in pending:
        try:
            with get_db() as cur:
                cur.execute(
                    "SELECT * FROM si_messages WHERE conversation_id = %s ORDER BY sent_at DESC LIMIT 10",
                    (conv["id"],),
                )
                messages = cur.fetchall()

            result = await followup_agent(dict(conv), [dict(m) for m in messages],
                                          conv["organization_id"], "scheduler")
            with get_db() as cur:
                cur.execute("""
                    INSERT INTO si_messages (conversation_id, organization_id, role, content, subject, agent_type)
                    VALUES (%s, %s, 'ai', %s, %s, 'followup')
                """, (conv["id"], conv["organization_id"],
                      result.get("message", ""), result.get("subject", "")))
                cur.execute(
                    "UPDATE si_conversations SET next_action = NULL, next_action_at = NULL WHERE id = %s",
                    (conv["id"],),
                )
            processed += 1
        except Exception:
            errors += 1

    return {"processed": processed, "errors": errors}
