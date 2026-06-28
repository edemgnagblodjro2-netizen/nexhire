import hmac
import logging
import os
from datetime import timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rate_limiter import limiter
from diagnostic_questions import (
    QUESTIONS_BY_CODE, SCORE_MAP, TOTAL_CORE,
    get_next_question, compute_imai,
)
from privacy import K_ANON_MIN, TEST_SESSION_SECRET

logger = logging.getLogger("diagnostic")

router = APIRouter(prefix="/api/diagnostic", tags=["diagnostic"])

MAX_EMAIL_SENDS_PER_SESSION = 2

_NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}

SECTORS = [
    "Professionnels", "Commercial", "Communications",
    "Associations et regroupements", "Alimentation, hôtellerie et restauration",
    "Industriel manufacturier", "Immobilier", "Événementiel",
    "Finances", "Construction", "Santé",
    "Arts et culture", "Éducation", "Environnement",
    "Entreprises de services", "Administration publique", "Autre",
]

SIZE_RANGES = ["1-9", "10-49", "50-199", "200+"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_partner_id(cur, partner_slug: str) -> str:
    cur.execute(
        """
        SELECT p.id FROM partners p
        JOIN installed_apps ia ON ia.partner_id = p.id
        WHERE p.slug = %s AND p.is_active = true
          AND ia.app_slug = 'diagnostic-ia' AND ia.is_enabled = true
        LIMIT 1
        """,
        (partner_slug,),
    )
    r = row(cur)
    if not r:
        raise HTTPException(status_code=404, detail="Workspace introuvable ou Diagnostic IA non activé.")
    return str(r["id"])


def _session_answers(cur, session_id: str) -> tuple[list[str], dict[str, str], list[dict]]:
    cur.execute(
        "SELECT question_code, answer, score, dimension FROM diagnostic_answers WHERE session_id = %s ORDER BY answered_at",
        (session_id,),
    )
    ans_rows = rows(cur)
    answered_codes = [a["question_code"] for a in ans_rows]
    answers_by_code = {a["question_code"]: a["answer"] for a in ans_rows}
    return answered_codes, answers_by_code, ans_rows


def _fmt_question(q: dict) -> dict:
    return {
        "code":      q["code"],
        "dimension": q["dimension"],
        "text":      q["text"],
        "hint":      q.get("hint"),
        "is_conditional": q["is_conditional"],
    }


# ── POST /api/diagnostic/session — Démarrer une session ──────────────────────

class StartPayload(BaseModel):
    partner_slug:       str       = Field(min_length=1, max_length=80)
    company_name:       str       = Field(min_length=1, max_length=255)
    sector:             str       = Field(min_length=1, max_length=100)
    size_range:         str
    priority_challenge: str | None = Field(None, max_length=255)


@router.post("/session")
@limiter.limit("10/minute")
def start_session(request: Request, payload: StartPayload):
    if payload.size_range not in SIZE_RANGES:
        raise HTTPException(status_code=422, detail=f"size_range invalide. Valeurs acceptées : {SIZE_RANGES}")
    if payload.sector not in SECTORS:
        raise HTTPException(status_code=422, detail="Secteur invalide.")

    # Comparaison à temps constant — secret vide désactive le marquage (sécurité par défaut).
    test_header = request.headers.get("X-Test-Session", "")
    is_test = bool(TEST_SESSION_SECRET) and hmac.compare_digest(test_header, TEST_SESSION_SECRET)

    with get_db() as cur:
        partner_id = _get_partner_id(cur, payload.partner_slug)
        cur.execute(
            """
            INSERT INTO diagnostic_sessions
              (partner_id, company_name, sector, size_range, priority_challenge, status, is_test)
            VALUES (%s, %s, %s, %s, %s, 'in_progress', %s)
            RETURNING id
            """,
            (partner_id, payload.company_name, payload.sector,
             payload.size_range, payload.priority_challenge, is_test),
        )
        session_id = str(row(cur)["id"])

    first_q = get_next_question([], {})
    return JSONResponse(
        content={
            "session_id":     session_id,
            "first_question": _fmt_question(first_q),
            "total_core":     TOTAL_CORE,
        },
        headers=_NO_CACHE,
    )


# ── POST /api/diagnostic/session/{id}/answer — Soumettre une réponse ─────────

class AnswerPayload(BaseModel):
    question_code: str
    answer:        str  # oui | partiellement | non


@router.post("/session/{session_id}/answer")
@limiter.limit("60/minute")
def submit_answer(request: Request, session_id: str, payload: AnswerPayload):
    if payload.answer not in SCORE_MAP:
        raise HTTPException(status_code=422, detail="Réponse invalide. Valeurs acceptées : oui, partiellement, non.")

    q = QUESTIONS_BY_CODE.get(payload.question_code)
    if not q:
        raise HTTPException(status_code=422, detail=f"Question inconnue : {payload.question_code}")

    score = SCORE_MAP[payload.answer]

    with get_db() as cur:
        cur.execute("SELECT id FROM diagnostic_sessions WHERE id = %s AND status = 'in_progress' LIMIT 1", (session_id,))
        if not row(cur):
            raise HTTPException(status_code=404, detail="Session introuvable.")

        # Insérer la réponse (upsert — au cas où l'utilisateur revient en arrière)
        cur.execute(
            """
            INSERT INTO diagnostic_answers
              (session_id, question_code, dimension, answer, score, is_conditional)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (session_id, question_code) DO UPDATE
              SET answer = EXCLUDED.answer,
                  score  = EXCLUDED.score,
                  answered_at = now()
            """,
            (session_id, payload.question_code, q["dimension"],
             payload.answer, score, q["is_conditional"]),
        )

        answered_codes, answers_by_code, _ = _session_answers(cur, session_id)

    next_q = get_next_question(answered_codes, answers_by_code)
    answered_core = sum(1 for c in answered_codes if not QUESTIONS_BY_CODE.get(c, {}).get("is_conditional"))

    return JSONResponse(
        content={
            "next_question":  _fmt_question(next_q) if next_q else None,
            "completed":      next_q is None,
            "progress": {
                "answered_core": answered_core,
                "total_core":    TOTAL_CORE,
            },
        },
        headers=_NO_CACHE,
    )


# ── POST /api/diagnostic/session/{id}/complete — Finaliser ───────────────────

class CompletePayload(BaseModel):
    company_email: EmailStr | None = None


@router.post("/session/{session_id}/complete")
@limiter.limit("10/minute")
def complete_session(request: Request, session_id: str, payload: CompletePayload):
    with get_db() as cur:
        cur.execute(
            "SELECT id, partner_id FROM diagnostic_sessions WHERE id = %s AND status = 'in_progress' LIMIT 1",
            (session_id,),
        )
        sess = row(cur)
        if not sess:
            raise HTTPException(status_code=404, detail="Session introuvable ou déjà complétée.")

        answered_codes, answers_by_code, ans_rows = _session_answers(cur, session_id)

        if len(answered_codes) < TOTAL_CORE:
            raise HTTPException(
                status_code=422,
                detail=f"Parcours incomplet — {len(answered_codes)}/{TOTAL_CORE} questions core répondues.",
            )

        result = compute_imai(ans_rows)

        cur.execute(
            """
            UPDATE diagnostic_sessions SET
              status = 'completed',
              company_email      = %s,
              imai_score         = %s,
              niveau             = %s,
              score_strategie    = %s,
              score_personnes    = %s,
              score_processus    = %s,
              score_technologies = %s,
              score_gouvernance  = %s,
              completed_at       = now()
            WHERE id = %s
            """,
            (
                str(payload.company_email) if payload.company_email else None,
                result["imai_score"], result["niveau"],
                result["score_strategie"],    result["score_personnes"],
                result["score_processus"],    result["score_technologies"],
                result["score_gouvernance"],
                session_id,
            ),
        )

        # Benchmark pour comparaison
        cur.execute(
            """
            SELECT imai_avg, imai_p25, imai_p75, sample_size, is_demo,
                   dim_strategie_avg, dim_personnes_avg, dim_processus_avg,
                   dim_technologies_avg, dim_gouvernance_avg
            FROM diagnostic_benchmarks
            WHERE partner_id = %s AND sector IS NULL AND size_range IS NULL
            ORDER BY period_start DESC LIMIT 1
            """,
            (str(sess["partner_id"]),),
        )
        bench = row(cur)

    return JSONResponse(
        content=_build_result(session_id, result, bench),
        headers=_NO_CACHE,
    )


# ── PATCH /api/diagnostic/session/{id}/email — Enregistrer l'email post-résultats ──

class EmailPayload(BaseModel):
    company_email: EmailStr


def _send_rapport_async(to_email, company_name, partner_name,
                        score, niveau, primary_color, rapport_url):
    """Exécuté après la réponse HTTP — n'impacte jamais le temps de réponse."""
    try:
        from email_service import send_diagnostic_rapport_email
        send_diagnostic_rapport_email(
            to_email=to_email, company_name=company_name,
            partner_name=partner_name, score=score, niveau=niveau,
            primary_color=primary_color, rapport_url=rapport_url,
        )
    except Exception:
        logger.exception("Échec envoi rapport à %s", to_email)


@router.patch("/session/{session_id}/email")
@limiter.limit("5/hour;15/day")
def save_email(
    request: Request,
    session_id: str,
    payload: EmailPayload,
    background_tasks: BackgroundTasks,
):
    with get_db() as cur:
        cur.execute(
            """
            UPDATE diagnostic_sessions SET
                company_email      = %s,
                email_send_count   = email_send_count + 1,
                last_email_sent_at = now()
            WHERE id = %s
              AND status = 'completed'
              AND email_send_count < %s
            RETURNING id, company_name, imai_score, niveau,
                      (SELECT name          FROM partners WHERE id = diagnostic_sessions.partner_id) AS partner_name,
                      (SELECT primary_color FROM partners WHERE id = diagnostic_sessions.partner_id) AS primary_color
            """,
            (str(payload.company_email), session_id, MAX_EMAIL_SENDS_PER_SESSION),
        )
        sess = row(cur)

        if not sess:
            cur.execute(
                "SELECT email_send_count FROM diagnostic_sessions WHERE id = %s AND status = 'completed' LIMIT 1",
                (session_id,),
            )
            existing = row(cur)
            if existing and existing["email_send_count"] >= MAX_EMAIL_SENDS_PER_SESSION:
                raise HTTPException(
                    status_code=429,
                    detail="Limite d'envois atteinte. Utilisez le lien direct vers votre rapport.",
                )
            raise HTTPException(status_code=404, detail="Session introuvable.")

    app_url = os.environ.get("APP_URL", "https://agenthub.nexhire.ca")
    rapport_url = f"{app_url}/rapport/{session_id}"

    background_tasks.add_task(
        _send_rapport_async,
        to_email=str(payload.company_email),
        company_name=sess["company_name"] or "",
        partner_name=sess["partner_name"] or "AgentHub",
        score=float(sess["imai_score"] or 0),
        niveau=sess["niveau"] or "debutant",
        primary_color=sess["primary_color"] or "#2563eb",
        rapport_url=rapport_url,
    )

    return JSONResponse(
        content={"ok": True, "email_queued": True, "rapport_url": rapport_url},
        headers=_NO_CACHE,
    )


# ── GET /api/diagnostic/session/{id}/result — Récupérer les résultats ────────

@router.get("/session/{session_id}/result")
@limiter.limit("30/minute")
def get_result(request: Request, session_id: str):
    with get_db() as cur:
        cur.execute(
            """
            SELECT s.id, s.partner_id, s.imai_score, s.niveau,
                   s.score_strategie, s.score_personnes, s.score_processus,
                   s.score_technologies, s.score_gouvernance, s.status
            FROM diagnostic_sessions s
            WHERE s.id = %s AND s.status = 'completed' LIMIT 1
            """,
            (session_id,),
        )
        sess = row(cur)
        if not sess:
            raise HTTPException(status_code=404, detail="Session introuvable.")

        _, _, ans_rows = _session_answers(cur, session_id)

        cur.execute(
            """
            SELECT imai_avg, imai_p25, imai_p75, sample_size, is_demo,
                   dim_strategie_avg, dim_personnes_avg, dim_processus_avg,
                   dim_technologies_avg, dim_gouvernance_avg
            FROM diagnostic_benchmarks
            WHERE partner_id = %s AND sector IS NULL AND size_range IS NULL
            ORDER BY period_start DESC LIMIT 1
            """,
            (str(sess["partner_id"]),),
        )
        bench = row(cur)

    # Recalculer les recommandations depuis les réponses sauvegardées
    result = compute_imai(ans_rows)
    result["imai_score"]         = float(sess["imai_score"] or result["imai_score"])
    result["niveau"]             = sess["niveau"] or result["niveau"]
    result["score_strategie"]    = float(sess["score_strategie"]    or 0)
    result["score_personnes"]    = float(sess["score_personnes"]    or 0)
    result["score_processus"]    = float(sess["score_processus"]    or 0)
    result["score_technologies"] = float(sess["score_technologies"] or 0)
    result["score_gouvernance"]  = float(sess["score_gouvernance"]  or 0)

    return JSONResponse(content=_build_result(session_id, result, bench), headers=_NO_CACHE)


# ── GET /api/diagnostic/{partner_slug}/stats ──────────────────────────────────

@router.get("/{partner_slug}/stats")
@limiter.limit("30/minute")
def get_stats(request: Request, partner_slug: str, user: CurrentUser = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("SELECT id FROM partners WHERE slug = %s AND is_active = true LIMIT 1", (partner_slug,))
        p = row(cur)
        if not p:
            raise HTTPException(status_code=404, detail="Partenaire introuvable.")
        if str(getattr(user, "partner_id", None)) != str(p["id"]):
            raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur de ce workspace.")

        partner_id = str(p["id"])

        cur.execute(
            """
            SELECT
                COUNT(*)                                           AS total,
                ROUND(AVG(imai_score)::numeric, 1)                AS imai_avg,
                COUNT(*) FILTER (WHERE niveau = 'debutant')       AS nb_debutant,
                COUNT(*) FILTER (WHERE niveau = 'intermediaire')  AS nb_intermediaire,
                COUNT(*) FILTER (WHERE niveau = 'avance')         AS nb_avance,
                ROUND(AVG(score_strategie)::numeric, 1)           AS dim_strategie,
                ROUND(AVG(score_personnes)::numeric, 1)           AS dim_personnes,
                ROUND(AVG(score_processus)::numeric, 1)           AS dim_processus,
                ROUND(AVG(score_technologies)::numeric, 1)        AS dim_technologies,
                ROUND(AVG(score_gouvernance)::numeric, 1)         AS dim_gouvernance
            FROM diagnostic_sessions
            WHERE partner_id = %s AND status = 'completed' AND is_test = false
            """,
            (partner_id,),
        )
        overall = row(cur)

        cur.execute(
            """
            SELECT sector, COUNT(*) AS count,
                   ROUND(AVG(imai_score)::numeric, 1) AS imai_avg
            FROM diagnostic_sessions
            WHERE partner_id = %s AND status = 'completed' AND is_test = false AND sector IS NOT NULL
            GROUP BY sector
            HAVING COUNT(*) >= %s
            ORDER BY count DESC LIMIT 8
            """,
            (partner_id, K_ANON_MIN),
        )
        by_sector = rows(cur)

        cur.execute(
            """
            SELECT priority_challenge AS label, COUNT(*) AS count
            FROM diagnostic_sessions
            WHERE partner_id = %s AND status = 'completed' AND is_test = false
              AND priority_challenge IS NOT NULL AND priority_challenge <> ''
            GROUP BY priority_challenge
            HAVING COUNT(*) >= %s
            ORDER BY count DESC LIMIT 6
            """,
            (partner_id, K_ANON_MIN),
        )
        challenges = rows(cur)

    total = int(overall["total"] or 0)
    return JSONResponse(
        content={
            "total":    total,
            "imai_avg": float(overall["imai_avg"] or 0),
            "niveaux": {
                "debutant":      int(overall["nb_debutant"]      or 0),
                "intermediaire": int(overall["nb_intermediaire"] or 0),
                "avance":        int(overall["nb_avance"]        or 0),
            },
            "dimensions": {
                "strategie":    float(overall["dim_strategie"]    or 0),
                "personnes":    float(overall["dim_personnes"]    or 0),
                "processus":    float(overall["dim_processus"]    or 0),
                "technologies": float(overall["dim_technologies"] or 0),
                "gouvernance":  float(overall["dim_gouvernance"]  or 0),
            },
            "by_sector": [
                {"sector": s["sector"], "count": int(s["count"]),
                 "imai_avg": float(s["imai_avg"] or 0)}
                for s in by_sector
            ],
            "challenges": [
                {"label": c["label"], "count": int(c["count"])}
                for c in challenges
            ],
        },
        headers=_NO_CACHE,
    )


# ── GET /api/diagnostic/{partner_slug}/benchmark ──────────────────────────────

@router.get("/{partner_slug}/benchmark")
@limiter.limit("30/minute")
def get_benchmark(request: Request, partner_slug: str, user: CurrentUser = Depends(get_current_user)):
    with get_db() as cur:
        cur.execute("SELECT id FROM partners WHERE slug = %s AND is_active = true LIMIT 1", (partner_slug,))
        p = row(cur)
        if not p:
            raise HTTPException(status_code=404, detail="Partenaire introuvable.")
        if str(getattr(user, "partner_id", None)) != str(p["id"]):
            raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur de ce workspace.")

        cur.execute(
            """
            SELECT imai_avg, imai_p25, imai_p75, sample_size, is_demo, period_start,
                   sector, size_range,
                   dim_strategie_avg, dim_personnes_avg, dim_processus_avg,
                   dim_technologies_avg, dim_gouvernance_avg
            FROM diagnostic_benchmarks
            WHERE partner_id = %s
            ORDER BY period_start DESC, sector NULLS FIRST
            """,
            (str(p["id"]),),
        )
        bench_rows = rows(cur)

    return JSONResponse(
        content={
            "partner_slug": partner_slug,
            "benchmarks": [
                {
                    "period_start":        str(b["period_start"]),
                    "sector":              b["sector"],
                    "size_range":          b["size_range"],
                    "sample_size":         b["sample_size"],
                    "is_demo":             b["is_demo"],
                    "imai_avg":            float(b["imai_avg"] or 0),
                    "imai_p25":            float(b["imai_p25"] or 0),
                    "imai_p75":            float(b["imai_p75"] or 0),
                    "dim_strategie_avg":    float(b["dim_strategie_avg"]   or 0),
                    "dim_personnes_avg":    float(b["dim_personnes_avg"]   or 0),
                    "dim_processus_avg":    float(b["dim_processus_avg"]   or 0),
                    "dim_technologies_avg": float(b["dim_technologies_avg"] or 0),
                    "dim_gouvernance_avg":  float(b["dim_gouvernance_avg"] or 0),
                }
                for b in bench_rows
            ],
        },
        headers=_NO_CACHE,
    )


# ── Helper de construction de réponse résultats ───────────────────────────────

def _build_result(session_id: str, result: dict, bench: dict | None) -> dict:
    benchmark = None
    if bench:
        benchmark = {
            "imai_avg":    float(bench["imai_avg"] or 0),
            "imai_p25":    float(bench["imai_p25"] or 0),
            "imai_p75":    float(bench["imai_p75"] or 0),
            "sample_size": bench["sample_size"],
            "is_demo":     bench["is_demo"],
            "dimensions": {
                "strategie":    float(bench["dim_strategie_avg"]   or 0),
                "personnes":    float(bench["dim_personnes_avg"]   or 0),
                "processus":    float(bench["dim_processus_avg"]   or 0),
                "technologies": float(bench["dim_technologies_avg"] or 0),
                "gouvernance":  float(bench["dim_gouvernance_avg"] or 0),
            },
        }

    return {
        "session_id":   session_id,
        "imai_score":   result["imai_score"],
        "niveau":       result["niveau"],
        "scores": {
            "strategie":    result["score_strategie"],
            "personnes":    result["score_personnes"],
            "processus":    result["score_processus"],
            "technologies": result["score_technologies"],
            "gouvernance":  result["score_gouvernance"],
        },
        "recommendations": result["recommendations"],
        "benchmark":       benchmark,
    }
