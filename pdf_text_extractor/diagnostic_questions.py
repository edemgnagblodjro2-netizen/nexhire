"""
Catalogue de questions IMAI — Parcours IA PME
10 questions core + 5 questions conditionnelles = 15 questions max

Pondération des dimensions :
  Gouvernance  25 %
  Stratégie    25 %
  Technologies 20 %
  Processus    20 %
  Personnes    10 %
"""

WEIGHTS: dict[str, float] = {
    "gouvernance": 0.25,
    "strategie": 0.25,
    "technologies": 0.20,
    "processus": 0.20,
    "personnes": 0.10,
}

SCORE_MAP: dict[str, int] = {"oui": 2, "partiellement": 1, "non": 0}

QUESTIONS: list[dict] = [
    # ── Stratégie ─────────────────────────────────────────────────────────────
    {
        "code": "S1",
        "dimension": "strategie",
        "order": 1,
        "is_conditional": False,
        "condition": None,
        "text": "Votre organisation a-t-elle une vision ou une stratégie formelle pour l'intégration de l'intelligence artificielle ?",
        "hint": "Politique IA, feuille de route, plan numérique.",
    },
    {
        "code": "S2",
        "dimension": "strategie",
        "order": 2,
        "is_conditional": False,
        "condition": None,
        "text": "Avez-vous alloué un budget ou des ressources spécifiques à des projets d'IA au cours des 12 derniers mois ?",
        "hint": "Budget dédié, poste de travail, temps alloué.",
    },
    {
        "code": "S_c1",
        "dimension": "strategie",
        "order": 3,
        "is_conditional": True,
        "condition": {"question_code": "S1", "answer": "non"},
        "text": "Avez-vous au moins évalué ou discuté des opportunités offertes par l'IA au niveau de la direction ?",
        "hint": "Discussions formelles ou informelles sur l'IA lors de réunions de direction.",
    },
    # ── Personnes ─────────────────────────────────────────────────────────────
    {
        "code": "P1",
        "dimension": "personnes",
        "order": 4,
        "is_conditional": False,
        "condition": None,
        "text": "Avez-vous des employés possédant des compétences spécifiques en IA, en données ou en automatisation ?",
        "hint": "Analyste de données, développeur, technicien numérique.",
    },
    {
        "code": "P2",
        "dimension": "personnes",
        "order": 5,
        "is_conditional": False,
        "condition": None,
        "text": "Proposez-vous des formations sur les outils numériques ou l'IA à vos équipes ?",
        "hint": "Formation en entreprise, remboursement de cours, webinaires.",
    },
    {
        "code": "P_c1",
        "dimension": "personnes",
        "order": 6,
        "is_conditional": True,
        "condition": {"question_code": "P1", "answer": "non"},
        "text": "Avez-vous identifié les compétences en IA ou en données dont votre organisation aurait besoin ?",
        "hint": "Analyse de besoins, plan de recrutement ou de formation à venir.",
    },
    # ── Processus ─────────────────────────────────────────────────────────────
    {
        "code": "PR1",
        "dimension": "processus",
        "order": 7,
        "is_conditional": False,
        "condition": None,
        "text": "Avez-vous automatisé au moins un processus métier à l'aide d'un outil numérique ou d'IA ?",
        "hint": "Facturation automatique, chatbot, RPA, flux de travail automatisé.",
    },
    {
        "code": "PR2",
        "dimension": "processus",
        "order": 8,
        "is_conditional": False,
        "condition": None,
        "text": "Utilisez-vous des données structurées pour prendre vos décisions opérationnelles courantes ?",
        "hint": "Tableaux de bord, rapports réguliers, indicateurs de performance (KPI).",
    },
    {
        "code": "PR_c1",
        "dimension": "processus",
        "order": 9,
        "is_conditional": True,
        "condition": {"question_code": "PR1", "answer": "non"},
        "text": "Avez-vous documenté vos processus internes en vue d'une automatisation future ?",
        "hint": "Procédures écrites, cartographie de processus, manuel opérationnel.",
    },
    # ── Technologies ──────────────────────────────────────────────────────────
    {
        "code": "T1",
        "dimension": "technologies",
        "order": 10,
        "is_conditional": False,
        "condition": None,
        "text": "Utilisez-vous au moins un outil intégrant l'IA dans vos opérations quotidiennes ?",
        "hint": "Assistant IA (Copilot, ChatGPT), outil de génération de contenu, analyse prédictive.",
    },
    {
        "code": "T2",
        "dimension": "technologies",
        "order": 11,
        "is_conditional": False,
        "condition": None,
        "text": "Vos données opérationnelles sont-elles centralisées et accessibles dans un système structuré ?",
        "hint": "ERP, CRM, base de données, entrepôt de données (data warehouse).",
    },
    {
        "code": "T_c1",
        "dimension": "technologies",
        "order": 12,
        "is_conditional": True,
        "condition": {"question_code": "T2", "answer": "non"},
        "text": "Avez-vous un plan pour centraliser ou structurer vos données au cours des 12 prochains mois ?",
        "hint": "Projet en cours, budget réservé, appel d'offres lancé.",
    },
    # ── Gouvernance ───────────────────────────────────────────────────────────
    {
        "code": "G1",
        "dimension": "gouvernance",
        "order": 13,
        "is_conditional": False,
        "condition": None,
        "text": "Votre organisation a-t-elle une politique ou des lignes directrices sur l'utilisation responsable de l'IA ?",
        "hint": "Charte IA, politique d'usage acceptable, comité d'éthique numérique.",
    },
    {
        "code": "G2",
        "dimension": "gouvernance",
        "order": 14,
        "is_conditional": False,
        "condition": None,
        "text": "Avez-vous mis en place des mécanismes pour surveiller ou contrôler les outils d'IA que vous utilisez ?",
        "hint": "Audit régulier, revue des accès, suivi des biais ou erreurs.",
    },
    {
        "code": "G_c1",
        "dimension": "gouvernance",
        "order": 15,
        "is_conditional": True,
        "condition": {"question_code": "G1", "answer": "non"},
        "text": "Êtes-vous informé des réglementations applicables à l'IA dans votre secteur ?",
        "hint": "Loi 25 (Québec), Règlement européen sur l'IA, obligations sectorielles.",
    },
]

# Index par code pour accès rapide
QUESTIONS_BY_CODE: dict[str, dict] = {q["code"]: q for q in QUESTIONS}

TOTAL_CORE: int = sum(1 for q in QUESTIONS if not q["is_conditional"])  # 10

# ── Recommandations par niveau et dimension ────────────────────────────────────
RECOMMENDATIONS: dict[str, dict[str, str]] = {
    "debutant": {
        "strategie": "Organisez un atelier de 2 heures avec votre direction pour identifier 2-3 processus où l'IA pourrait créer de la valeur — c'est votre point de départ.",
        "personnes": "Identifiez un «champion numérique» dans votre équipe et inscrivez-le à une formation de base en IA (ex: éléments.ai, Coursera IA pour PME).",
        "processus": "Documentez vos 3 processus les plus répétitifs : c'est la première étape vers l'automatisation et un prérequis pour toute solution IA.",
        "technologies": "Explorez des outils IA accessibles sans compétence technique : Microsoft Copilot, ChatGPT Teams ou des outils spécifiques à votre secteur.",
        "gouvernance": "Prenez connaissance de la Loi 25 (Québec) et de ses obligations concernant la protection des renseignements personnels dans vos outils numériques.",
    },
    "intermediaire": {
        "strategie": "Formalisez votre feuille de route IA sur 12-24 mois avec des indicateurs de succès mesurables et présentez-la à votre conseil d'administration.",
        "personnes": "Mettez en place un programme de formation continue : au moins une formation IA par équipe par an, avec un budget dédié.",
        "processus": "Mesurez le ROI de vos automatisations actuelles et planifiez le prochain cas d'usage à fort impact (ex: service client, gestion des stocks).",
        "technologies": "Évaluez l'intégration de vos outils IA avec vos systèmes existants (ERP, CRM) pour éviter les silos de données.",
        "gouvernance": "Rédigez une politique d'utilisation responsable de l'IA et nommez un responsable IA au sein de votre organisation.",
    },
    "avance": {
        "strategie": "Positionnez-vous comme leader IA dans votre secteur — rejoignez des consortiums, partagez vos apprentissages et influencez les standards.",
        "personnes": "Créez un Centre d'excellence IA interne pour capitaliser vos apprentissages et les diffuser à l'ensemble de l'organisation.",
        "processus": "Explorez les IA prédictives et génératives pour des processus à haute valeur ajoutée : prévisions, personnalisation, optimisation en temps réel.",
        "technologies": "Évaluez les agents IA autonomes et les LLM spécialisés pour votre secteur — vous êtes en position de tester ces technologies avant vos compétiteurs.",
        "gouvernance": "Contribuez à l'élaboration des standards de gouvernance IA de votre industrie et publiez un rapport annuel sur votre usage responsable de l'IA.",
    },
}


def get_next_question(
    answered_codes: list[str],
    answers_by_code: dict[str, str],
) -> dict | None:
    """Retourne la prochaine question à poser, en respectant la logique conditionnelle."""
    for q in QUESTIONS:
        if q["code"] in answered_codes:
            continue
        if q["is_conditional"]:
            cond = q["condition"]
            if answers_by_code.get(cond["question_code"]) != cond["answer"]:
                continue  # condition non déclenchée — ignorer
        return q
    return None  # parcours terminé


def compute_imai(answers: list[dict]) -> dict:
    """
    Calcule le score IMAI /100 à partir des réponses.
    answers = [{"dimension": str, "score": int}, ...]
    """
    by_dim: dict[str, list[int]] = {}
    for a in answers:
        by_dim.setdefault(a["dimension"], []).append(a["score"])

    dim_scores: dict[str, float] = {}
    for dim, scores in by_dim.items():
        max_s = len(scores) * 2
        dim_scores[dim] = round((sum(scores) / max_s * 100) if max_s else 0.0, 2)

    imai = sum(dim_scores.get(d, 0.0) * w for d, w in WEIGHTS.items())
    imai = round(imai, 2)

    if imai < 34:
        niveau = "debutant"
    elif imai < 67:
        niveau = "intermediaire"
    else:
        niveau = "avance"

    # 3 recommandations pour les dimensions les plus faibles
    sorted_dims = sorted(WEIGHTS.keys(), key=lambda d: dim_scores.get(d, 0.0))
    top3_recs = {d: RECOMMENDATIONS[niveau][d] for d in sorted_dims[:3]}

    return {
        "imai_score": imai,
        "niveau": niveau,
        "score_strategie": dim_scores.get("strategie", 0.0),
        "score_personnes": dim_scores.get("personnes", 0.0),
        "score_processus": dim_scores.get("processus", 0.0),
        "score_technologies": dim_scores.get("technologies", 0.0),
        "score_gouvernance": dim_scores.get("gouvernance", 0.0),
        "recommendations": top3_recs,
    }
