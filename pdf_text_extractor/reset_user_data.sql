-- ═══════════════════════════════════════════════════════════════════════════
-- RESET : Vider tous les comptes utilisateurs et organisations
-- Usage  : Supabase SQL Editor — rôle service_role requis
-- Effet  : Supprime TOUTES les données utilisateurs/organisations.
--          Préserve : partners, app_registry, installed_apps,
--                     diagnostic_benchmarks (is_demo=true)
-- ⚠️  IRRÉVERSIBLE — faire un backup Supabase avant si nécessaire
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl text;
  -- Tables à vider (dans l'ordre : feuilles d'abord, racines en dernier)
  -- Les tables inexistantes sont ignorées silencieusement.
  tables_to_clear text[] := ARRAY[
    -- Sales Intelligence
    'si_crm_syncs', 'si_agent_runs', 'si_campaign_prospects',
    'si_messages', 'si_meetings', 'si_conversations',
    'si_prospects', 'si_campaigns', 'si_templates', 'si_profiles',

    -- Conformité
    'compliance_nonconformities', 'compliance_action_plans',
    'compliance_controls', 'compliance_frameworks',

    -- Workflow / automatisation
    'policy_rule_runs', 'policy_rules', 'policies',
    'playbook_step_runs', 'playbook_runs', 'playbooks',
    'orchestration_runs', 'orchestrations',
    'ai_decisions', 'initiatives', 'platform_events',

    -- Diagnostic
    'diagnostic_answers', 'diagnostic_sessions',

    -- M365 / Entra
    'entra_signin_anomalies', 'entra_risky_users', 'entra_ca_policies',
    'security_group_members', 'sharepoint_dept_mappings', 'connector_departments',

    -- Identité / sécurité
    'license_usage', 'license_assignments', 'license_pools',
    'identity_accounts', 'identities', 'security_postures', 'org_units',

    -- Entreprise
    'financial_transactions', 'vendors', 'assets', 'contracts',
    'budget_entries', 'monthly_reports', 'it_applications',
    'applications', 'servers', 'service_accounts',

    -- Connecteurs
    'connectors',

    -- Knowledge
    'knowledge_documents',

    -- Membres / équipes
    'role_change_requests', 'department_members', 'departments',
    'pending_invitations',

    -- Intelligence
    'risk_findings', 'entity_correlations', 'entities',

    -- Facturation / Stripe
    'stripe_processed_events', 'audit_billing', 'subscriptions',

    -- RGPD / Loi 25
    'data_deletion_requests', 'consent_records', 'mfa_factors', 'security_alerts',

    -- Usage / analytics
    'usage_counters', 'usage_events', 'usage_events_archive',
    'audit_logs', 'audit_logs_archive', 'conversations_archive',

    -- Conversations / documents
    'documents', 'conversations', 'licenses',

    -- Racines (cascade sur tout le reste)
    'users', 'organizations'
  ];
BEGIN
  -- Désactiver les triggers FK pour éviter les conflits d'ordre
  SET session_replication_role = replica;

  FOREACH tbl IN ARRAY tables_to_clear LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', tbl);
      RAISE NOTICE 'TRUNCATED: public.%', tbl;
    ELSE
      RAISE NOTICE 'SKIPPED (not found): public.%', tbl;
    END IF;
  END LOOP;

  -- Réactiver les triggers
  SET session_replication_role = DEFAULT;

  RAISE NOTICE '✓ Reset public schema terminé.';
END $$;

-- ── Supprimer tous les comptes Supabase Auth ─────────────────────────────────
-- Supprime définitivement sessions, tokens JWT et comptes de connexion.
DELETE FROM auth.users;

-- ── Vérification ─────────────────────────────────────────────────────────────
SELECT table_name, cnt::text AS remaining
FROM (
  SELECT 'auth.users'              AS table_name, (SELECT COUNT(*) FROM auth.users)              AS cnt
  UNION ALL
  SELECT 'public.users',                          (SELECT COUNT(*) FROM public.users)
  UNION ALL
  SELECT 'public.organizations',                  (SELECT COUNT(*) FROM public.organizations)
  UNION ALL
  SELECT 'public.partners (conservés)',           (SELECT COUNT(*) FROM public.partners)
  UNION ALL
  SELECT 'diagnostic_benchmarks demo',            (SELECT COUNT(*) FROM public.diagnostic_benchmarks WHERE is_demo = true)
) t
ORDER BY table_name;
