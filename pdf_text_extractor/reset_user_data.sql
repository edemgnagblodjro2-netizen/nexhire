-- ═══════════════════════════════════════════════════════════════════════════
-- RESET : Vider tous les comptes utilisateurs et organisations
-- Usage  : Supabase SQL Editor — rôle service_role requis
-- Effet  : Supprime TOUTES les données utilisateurs/organisations.
--          Préserve : partners, app_registry, installed_apps,
--                     diagnostic_benchmarks (is_demo=true)
-- ⚠️  IRRÉVERSIBLE — faire un backup Supabase avant si nécessaire
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Étape 1 : Désactiver temporairement les triggers pour éviter les conflits
SET session_replication_role = replica;

-- ── Étape 2 : Vider toutes les tables de données utilisateurs/organisations
--    RESTART IDENTITY remet les séquences à zéro
--    CASCADE propage la suppression aux tables enfants

TRUNCATE TABLE
  -- ── Données Sales Intelligence ──────────────────────────────────────────
  public.si_crm_syncs,
  public.si_agent_runs,
  public.si_campaign_prospects,
  public.si_messages,
  public.si_meetings,
  public.si_conversations,
  public.si_prospects,
  public.si_campaigns,
  public.si_templates,
  public.si_profiles,

  -- ── Données conformité ──────────────────────────────────────────────────
  public.compliance_nonconformities,
  public.compliance_action_plans,
  public.compliance_controls,
  public.compliance_frameworks,

  -- ── Données workflow / automatisation ───────────────────────────────────
  public.policy_rule_runs,
  public.policy_rules,
  public.policies,
  public.playbook_step_runs,
  public.playbook_runs,
  public.playbooks,
  public.orchestration_runs,
  public.orchestrations,
  public.ai_decisions,
  public.initiatives,
  public.platform_events,

  -- ── Données diagnostic ──────────────────────────────────────────────────
  public.diagnostic_answers,
  public.diagnostic_sessions,

  -- ── Données M365 / Entra ────────────────────────────────────────────────
  public.entra_signin_anomalies,
  public.entra_risky_users,
  public.entra_ca_policies,
  public.security_group_members,
  public.sharepoint_dept_mappings,
  public.connector_departments,

  -- ── Données identité / sécurité ─────────────────────────────────────────
  public.license_usage,
  public.license_assignments,
  public.license_pools,
  public.identity_accounts,
  public.identities,
  public.security_postures,
  public.org_units,

  -- ── Données entreprise ──────────────────────────────────────────────────
  public.financial_transactions,
  public.vendors,
  public.assets,
  public.contracts,
  public.budget_entries,
  public.monthly_reports,
  public.it_applications,
  public.applications,
  public.servers,
  public.service_accounts,

  -- ── Connecteurs ─────────────────────────────────────────────────────────
  public.connectors,

  -- ── Knowledge ───────────────────────────────────────────────────────────
  public.knowledge_documents,

  -- ── Membres / équipes ───────────────────────────────────────────────────
  public.role_change_requests,
  public.department_members,
  public.departments,
  public.pending_invitations,

  -- ── Intelligence / corrélations ─────────────────────────────────────────
  public.risk_findings,
  public.entity_correlations,
  public.entities,

  -- ── Facturation / Stripe ────────────────────────────────────────────────
  public.stripe_processed_events,
  public.audit_billing,
  public.subscriptions,

  -- ── Conformité RGPD / Loi 25 ────────────────────────────────────────────
  public.data_deletion_requests,
  public.consent_records,
  public.mfa_factors,
  public.security_alerts,

  -- ── Usage / analytics ───────────────────────────────────────────────────
  public.usage_counters,
  public.usage_events,
  public.usage_events_archive,
  public.audit_logs,
  public.audit_logs_archive,
  public.conversations_archive,

  -- ── Conversations / documents ────────────────────────────────────────────
  public.documents,
  public.conversations,
  public.licenses,

  -- ── Racines : users et organizations (cascade sur tout le reste) ─────────
  public.users,
  public.organizations

RESTART IDENTITY CASCADE;

-- ── Étape 3 : Réactiver les triggers
SET session_replication_role = DEFAULT;

-- ── Étape 4 : Supprimer tous les comptes auth.users (Supabase Auth)
--    Cela supprime définitivement les sessions, tokens JWT et comptes de connexion.
DELETE FROM auth.users;

-- ── Étape 5 : Vérification
SELECT
  'auth.users'       AS table_name, COUNT(*) AS remaining FROM auth.users
UNION ALL SELECT 'public.users',         COUNT(*) FROM public.users
UNION ALL SELECT 'public.organizations', COUNT(*) FROM public.organizations
UNION ALL SELECT 'public.partners',      COUNT(*) FROM public.partners
UNION ALL SELECT 'diagnostic_benchmarks (demo)', COUNT(*) FROM public.diagnostic_benchmarks WHERE is_demo = true
ORDER BY table_name;

-- ── Résultat attendu ────────────────────────────────────────────────────────
-- auth.users                       → 0
-- public.users                     → 0
-- public.organizations             → 0
-- public.partners                  → N (partenaires conservés, ex: demo)
-- diagnostic_benchmarks (demo)     → N (benchmarks démo conservés)
