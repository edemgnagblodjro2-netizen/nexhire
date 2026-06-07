-- ═══════════════════════════════════════════════════════════════════════════
-- NexHire — Données de démonstration
-- Exécuter dans Supabase SQL Editor (service_role)
-- Cible : la 1ʳᵉ organisation trouvée dans la table organizations
-- Idempotent : ne duplique pas si exécuté plusieurs fois
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_org   uuid;
  d_it    uuid;
  d_fin   uuid;
  d_hr    uuid;
  d_mkt   uuid;
  d_ops   uuid;
begin

-- ── 0. Organisation cible ────────────────────────────────────────────────
select id into v_org from public.organizations order by created_at limit 1;
if v_org is null then
  raise exception 'Aucune organisation trouvée. Créez-en une via l''interface avant de lancer ce script.';
end if;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DÉPARTEMENTS (5 — profils variés pour le dashboard)
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.departments (id, organization_id, name, description, annual_budget, currency)
values
  (gen_random_uuid(), v_org, 'Technologies de l''Information', 'Infrastructure, sécurité, applications d''entreprise', 480000, 'CAD'),
  (gen_random_uuid(), v_org, 'Finance & Comptabilité',          'Gestion budgétaire, paie, rapports financiers',          220000, 'CAD'),
  (gen_random_uuid(), v_org, 'Ressources Humaines',             'Recrutement, formation, gestion des talents',            160000, 'CAD'),
  (gen_random_uuid(), v_org, 'Marketing & Communications',      'Stratégie digitale, contenus, campagnes publicitaires',  195000, 'CAD'),
  (gen_random_uuid(), v_org, 'Opérations & Logistique',         'Gestion des fournisseurs, achats, logistique interne',   270000, 'CAD')
on conflict do nothing;

-- Récupérer les IDs
select id into d_it  from public.departments where organization_id = v_org and name ilike 'Technologies%'     limit 1;
select id into d_fin from public.departments where organization_id = v_org and name ilike 'Finance%'          limit 1;
select id into d_hr  from public.departments where organization_id = v_org and name ilike 'Ressources%'       limit 1;
select id into d_mkt from public.departments where organization_id = v_org and name ilike 'Marketing%'        limit 1;
select id into d_ops from public.departments where organization_id = v_org and name ilike 'Opérations%'       limit 1;

-- Ajouter dept_type si la colonne existe (Phase 12)
begin
  update public.departments set dept_type = 'it'           where id = d_it;
  update public.departments set dept_type = 'finance'      where id = d_fin;
  update public.departments set dept_type = 'hr'           where id = d_hr;
  update public.departments set dept_type = 'marketing'    where id = d_mkt;
  update public.departments set dept_type = 'operations'   where id = d_ops;
exception when undefined_column then null;
end;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. BUDGET — colonnes réelles : allocated (prévu) / actual (dépensé)
--    1 ligne par catégorie avec les deux montants côte à côte
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.budget_entries
  (organization_id, department_id, category, label, year, allocated, actual, currency, notes)
values
  -- IT — 72 % dépensé → 🟢 sain
  (v_org, d_it,  'infrastructure', 'Cloud & Infrastructure',   2026, 280000, 184000, 'CAD', 'AWS + Azure combinés'),
  (v_org, d_it,  'licenses',       'Licences logiciels',       2026, 120000,  62000, 'CAD', 'M365, Jira, Zoom, sécurité'),
  (v_org, d_it,  'services',       'Maintenance & consulting',  2026,  80000,  40000, 'CAD', null),

  -- Finance — 91 % dépensé → 🟡 attention
  (v_org, d_fin, 'software',       'Logiciels & licences ERP', 2026, 140000,  78000, 'CAD', 'SAP, Oracle, DocuSign'),
  (v_org, d_fin, 'training',       'Formation & audit',         2026,  50000,  76000, 'CAD', '⚠️ Dépassement audit externe'),
  (v_org, d_fin, 'operations',     'Dépenses opérationnelles',  2026,  30000,  46000, 'CAD', null),

  -- RH — 58 % dépensé → 🟢 sain
  (v_org, d_hr,  'workforce',      'Recrutement & formation',   2026,  90000,  57000, 'CAD', null),
  (v_org, d_hr,  'software',       'Outils SIRH',               2026,  70000,  36000, 'CAD', 'Workday, LinkedIn Recruiter'),

  -- Marketing — 107 % dépensé → 🔴 dépassement budget
  (v_org, d_mkt, 'advertising',    'Campagnes digitales',       2026, 100000, 119000, 'CAD', '⚠️ Google Ads + Meta dépassés'),
  (v_org, d_mkt, 'agency',         'Agence créative retainer',  2026,  60000,  48000, 'CAD', 'Publicis Groupe'),
  (v_org, d_mkt, 'events',         'Salons & événements',       2026,  35000,  42000, 'CAD', '⚠️ Dépassement salons T1'),

  -- Opérations — 83 % dépensé → 🟡 attention
  (v_org, d_ops, 'vendors',        'Fournisseurs & achats',     2026, 150000, 112000, 'CAD', null),
  (v_org, d_ops, 'logistics',      'Logistique & transport',    2026,  70000,  54000, 'CAD', null),
  (v_org, d_ops, 'facilities',     'Entretien & locaux',        2026,  50000,  58000, 'CAD', '⚠️ Entretien dépasse le budget')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. APPLICATIONS IT
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.it_applications (organization_id, department_id, name, category, vendor, status, monthly_cost, user_count)
values
  (v_org, d_it,  'Microsoft 365',         'productivity',  'Microsoft',  'active',          4800, 120),
  (v_org, d_it,  'Azure Cloud',           'cloud',         'Microsoft',  'active',          7200,  12),
  (v_org, d_it,  'Jira Software',         'devops',        'Atlassian',  'active',           980,  28),
  (v_org, d_it,  'Zoom',                  'communication', 'Zoom',       'active',           720,  35),
  (v_org, d_it,  'Cisco AnyConnect VPN',  'security',      'Cisco',      'active',           380, 110),
  (v_org, d_it,  'Trend Micro Endpoint',  'security',      'Trend Micro','active',           540, 120),
  (v_org, d_fin, 'SAP ERP',               'erp',           'SAP',        'active',          6800,  18),
  (v_org, d_fin, 'QuickBooks Online',     'accounting',    'Intuit',     'unused',           220,   3),
  (v_org, d_hr,  'Workday HCM',           'hrms',          'Workday',    'active',          3200,  85),
  (v_org, d_hr,  'LinkedIn Recruiter',    'recruiting',    'LinkedIn',   'active',           980,   5),
  (v_org, d_mkt, 'HubSpot Marketing',     'crm',           'HubSpot',    'active',          1800,  14),
  (v_org, d_mkt, 'Adobe Creative Cloud',  'design',        'Adobe',      'active',          2400,   9),
  (v_org, d_mkt, 'Hootsuite',             'social',        'Hootsuite',  'unused',           180,   2),
  (v_org, d_ops, 'ServiceNow ITSM',       'itsm',          'ServiceNow', 'active',          4200,  60),
  (v_org, d_ops, 'Monday.com',            'pm',            'Monday',     'active',           960,  40),
  (v_org, d_it,  'ManageEngine SDPlus',   'itsm',          'ManageEngine','decommissioned',    0,   0)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LICENCES — mix bien utilisé / sous-utilisé pour l'IA
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.licenses
  (organization_id, department_id, product_name, vendor, license_type, quantity, assigned_count,
   cost_per_unit, billing_cycle, purchase_date, expiration_date, renewal_date, auto_renew, notes)
values
  -- IT — licences bien gérées
  (v_org, d_it, 'Microsoft 365 E3',        'Microsoft', 'subscription', 50, 48, 38.00, 'monthly',
   '2025-01-01', '2026-12-31', '2026-12-31', true,  'Renouvellement automatique — surveiller la hausse tarifaire 2027'),
  (v_org, d_it, 'Jira Software Cloud',     'Atlassian', 'subscription', 30, 24, 8.15,  'monthly',
   '2025-03-01', '2027-02-28', '2027-02-28', true,  null),
  (v_org, d_it, 'Zoom Pro',                'Zoom',      'subscription', 40, 14, 15.99, 'monthly',
   '2025-06-01', '2026-05-31', '2026-07-10', false,
   '26 licences non attribuées — évaluer réduction à 20 sièges'),

  -- Finance — licences critiques
  (v_org, d_fin, 'SAP ERP Professional',   'SAP',       'volume',       18, 18, 280.00, 'annual',
   '2024-09-01', '2026-08-31', '2026-08-01', false,
   'Renouvellement dans 60 jours — négocier volume Q3'),
  (v_org, d_fin, 'DocuSign Business Pro',  'DocuSign',  'subscription',  8,  5, 45.00, 'monthly',
   '2025-04-01', '2027-03-31', '2027-03-31', true,  null),

  -- RH — bonne utilisation
  (v_org, d_hr, 'Workday HCM',             'Workday',   'subscription', 90, 82, 35.00, 'monthly',
   '2025-02-01', '2027-01-31', '2027-01-31', true,  null),
  (v_org, d_hr, 'LinkedIn Recruiter',      'LinkedIn',  'subscription',  5,  5, 835.00, 'annual',
   '2025-11-01', '2026-10-31', '2026-09-15', false, null),

  -- Marketing — sous-utilisation importante
  (v_org, d_mkt, 'Adobe Creative Cloud',   'Adobe',     'volume',       20,  7, 59.99, 'monthly',
   '2025-01-15', '2026-12-31', '2026-12-31', true,
   '13 licences non attribuées — potentiel économie 9 320 $ CAD/an'),
  (v_org, d_mkt, 'HubSpot Marketing Pro',  'HubSpot',   'subscription', 15, 11, 90.00, 'monthly',
   '2025-05-01', '2027-04-30', '2027-04-30', true,  null),
  (v_org, d_mkt, 'Hootsuite Team',         'Hootsuite', 'subscription', 10,  2, 49.00, 'monthly',
   '2025-08-01', '2026-07-31', '2026-07-31', false,
   '8 licences inactives depuis 4 mois — envisager résiliation'),

  -- Opérations
  (v_org, d_ops, 'ServiceNow ITSM',        'ServiceNow', 'subscription', 65, 58, 80.00, 'monthly',
   '2025-03-01', '2027-02-28', '2027-02-28', true,  null),
  (v_org, d_ops, 'Monday.com Enterprise',  'Monday',    'subscription', 50, 42, 16.00, 'monthly',
   '2025-07-01', '2026-06-30', '2026-06-20', false,
   'Renouvellement dans 14 jours — décision requise')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CONTRATS FOURNISSEURS — plusieurs à risque (< 60 jours)
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.contracts
  (organization_id, department_id, vendor, description, category, annual_value, currency,
   start_date, end_date, renewal_date, auto_renew, negotiation_potential, status, notes)
values
  -- Contrats critiques < 60 jours
  (v_org, d_ops, 'Bell Canada',
   'Télécommunications — fibres 10 Gbps + lignes fixes',
   'telecom', 52800, 'CAD',
   '2024-07-01', '2026-06-30', (current_date + interval '18 days')::date,
   false, 12.00, 'active',
   '⚠️ Renouvellement dans 18 jours — soumission Bell + Rogers à demander'),

  (v_org, d_fin, 'Oracle Corporation',
   'Licences Oracle Database Enterprise + support annuel',
   'software', 98400, 'CAD',
   '2024-09-01', '2026-08-31', (current_date + interval '38 days')::date,
   false, 18.00, 'active',
   '⚠️ Potentiel migration PostgreSQL — économie estimée 40-60 % sur le renouvellement'),

  (v_org, d_ops, 'GDI Services (Canada)',
   'Contrat entretien & nettoyage des locaux',
   'facilities', 21600, 'CAD',
   '2024-01-01', '2026-06-30', (current_date + interval '24 days')::date,
   false, 8.00, 'active',
   'Concurrence : Groupe Nordik 15 % moins cher selon soumission mars 2026'),

  (v_org, d_it, 'CDW Canada',
   'Matériel IT — renouvellement parc informatique 60 postes',
   'hardware', 144000, 'CAD',
   '2024-06-01', '2026-05-31', (current_date + interval '55 days')::date,
   false, 7.00, 'active',
   'Option leasing Dell Financial à évaluer — libère CAPEX'),

  -- Contrats stables > 90 jours
  (v_org, d_it, 'Microsoft',
   'Enterprise Agreement M365 + Azure + Defender',
   'software', 138000, 'CAD',
   '2025-01-01', '2027-12-31', '2027-12-01',
   true, 5.00, 'active',
   'EA 3 ans — révision annuelle possible via Microsoft Partner'),

  (v_org, d_it, 'Amazon Web Services',
   'Réservations EC2/RDS + support Business tier',
   'cloud', 68400, 'CAD',
   '2025-04-01', '2027-03-31', '2027-03-01',
   true, 10.00, 'active',
   'Reserved Instances 1 an — économie 35 % vs on-demand'),

  (v_org, d_mkt, 'Publicis Groupe (Agence)',
   'Retainer créatif mensuel — stratégie et production',
   'services', 120000, 'CAD',
   '2025-10-01', '2027-09-30', '2027-09-01',
   false, 15.00, 'active',
   'KPI de performance à intégrer au prochain avenant — ROI actuellement non mesuré'),

  (v_org, d_hr, 'Ceridian Dayforce',
   'Paie & gestion du temps — 110 employés',
   'software', 32400, 'CAD',
   '2025-01-15', '2026-12-31', '2026-11-15',
   true, 6.00, 'active',
   null),

  -- Contrat expiré / en négociation
  (v_org, d_ops, 'Purolator',
   'Livraisons express & courrier interne',
   'services', 18000, 'CAD',
   '2024-01-01', '2025-12-31', '2026-01-31',
   false, 20.00, 'under_negotiation',
   'Comparatif FedEx en cours — tarifs Purolator augmentés 22 % en 2025')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. PROCESSUS WORKFORCE — détection des tâches manuelles coûteuses
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.workforce_processes
  (organization_id, department_id, name, description, team_size,
   manual_hours_per_month, automation_potential, hourly_cost, status, notes)
values
  -- RH — processus manuels chronophages
  (v_org, d_hr, 'Onboarding nouveaux employés',
   'Création comptes AD, attribution équipement, accès apps, signature documents',
   3, 52.0, 85.0, 55.00, 'manual',
   'Outil recommandé : BambooHR Workflows ou Workday Onboarding — ROI < 8 mois'),

  (v_org, d_hr, 'Gestion des congés & absences',
   'Saisie manuelle dans Excel + validation email par les managers',
   2, 28.0, 90.0, 50.00, 'manual',
   'Module congés Workday non activé — activation incluse dans le contrat actuel'),

  (v_org, d_hr, 'Rapports RH mensuels',
   'Consolidation données paie, turnover, absentéisme pour la direction',
   1, 18.0, 70.0, 55.00, 'semi_automated',
   'Power BI connecté à Dayforce partiellement — finaliser les pipelines'),

  -- Finance — réconciliation et rapports
  (v_org, d_fin, 'Rapports de dépenses employés',
   'Validation et saisie des notes de frais papier dans SAP',
   2, 36.0, 80.0, 60.00, 'manual',
   'Module SAP Concur disponible — déploiement estimé 3 semaines'),

  (v_org, d_fin, 'Clôture comptable mensuelle',
   'Réconciliation manuelle des comptes et préparation des états financiers',
   3, 45.0, 55.0, 65.00, 'manual',
   'Process critique — semi-automatisation possible via règles SAP FI'),

  (v_org, d_fin, 'Relances fournisseurs & AP',
   'Suivi manuel des factures en attente, relances téléphoniques',
   1, 24.0, 75.0, 55.00, 'manual',
   'SAP S/4HANA AP automation inclus dans licence — non configuré'),

  -- Marketing — production de contenu
  (v_org, d_mkt, 'Mise à jour contenu site web',
   'Rédaction, mise en forme et publication manuelle via CMS sans workflow',
   2, 48.0, 70.0, 50.00, 'manual',
   'HubSpot CMS Pro déjà payé — activer les workflows de publication'),

  (v_org, d_mkt, 'Rapports performance campagnes',
   'Extraction manuelle des KPIs Google Ads + Meta + HubSpot dans Excel',
   1, 22.0, 90.0, 50.00, 'manual',
   'Looker Studio (gratuit) + connecteurs natifs — setup : 1 jour'),

  -- IT — support & déploiements
  (v_org, d_it, 'Déploiement postes de travail',
   'Image, configuration et livraison manuelle des postes neufs',
   2, 30.0, 75.0, 65.00, 'semi_automated',
   'Microsoft Autopilot activable via M365 E3 existant — ne nécessite pas de budget'),

  (v_org, d_it, 'Gestion des tickets IT niveau 1',
   'Triage et assignation manuelle des tickets entrants',
   1, 20.0, 60.0, 60.00, 'semi_automated',
   'ServiceNow Virtual Agent disponible — configuration 2 semaines'),

  (v_org, d_it, 'Revue hebdomadaire des alertes sécurité',
   'Analyse manuelle des logs Trend Micro et Azure Defender',
   2, 16.0, 65.0, 65.00, 'manual',
   'SIEM Microsoft Sentinel inclus dans Azure EA — activer les playbooks'),

  -- Opérations — logistique & achats
  (v_org, d_ops, 'Bon de commande & approbation achats',
   'Processus papier : demande → manager → finance → émission PO manuelle dans SAP',
   4, 62.0, 80.0, 50.00, 'manual',
   'Processus le plus coûteux — 3 100 $/mois en temps humain. SAP MM workflow configurable'),

  (v_org, d_ops, 'Suivi inventaire & réception marchandises',
   'Comptage physique bi-mensuel et réconciliation Excel vs SAP',
   3, 40.0, 65.0, 48.00, 'manual',
   'Scan code-barres + SAP WM réduirait les écarts d''inventaire estimés à 8 000 $/an'),

  (v_org, d_ops, 'Facturation clients',
   'Génération et envoi automatique des factures via SAP + DocuSign',
   1,  4.0, 95.0, 55.00, 'automated',
   'Processus optimisé — modèle à reproduire ailleurs')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SERVEURS (inventaire infrastructure)
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.servers
  (organization_id, department_id, hostname, ip_address, environment, os,
   cpu_cores, ram_gb, storage_gb, location, status, monthly_cost, notes)
values
  (v_org, d_it, 'nexhire-web-prod-01',  '10.0.1.10', 'production',  'Ubuntu 22.04',  8, 32, 500,  'Datacenter MTL', 'active',            380, null),
  (v_org, d_it, 'nexhire-web-prod-02',  '10.0.1.11', 'production',  'Ubuntu 22.04',  8, 32, 500,  'Datacenter MTL', 'active',            380, 'Load balancer pair de prod-01'),
  (v_org, d_it, 'nexhire-db-prod-01',   '10.0.1.20', 'production',  'Ubuntu 22.04', 16, 64, 2000, 'Datacenter MTL', 'active',            620, 'PostgreSQL 15 — RTO < 4h'),
  (v_org, d_it, 'nexhire-db-backup-01', '10.0.1.21', 'backup',      'Ubuntu 22.04',  4, 16, 4000, 'Datacenter QC',  'active',            280, 'Réplication async — rétention 30 jours'),
  (v_org, d_it, 'nexhire-dev-01',       '10.0.2.10', 'development', 'Ubuntu 22.04',  4,  8,  250, 'Bureau principal','active',           120, null),
  (v_org, d_it, 'nexhire-staging-01',   '10.0.2.20', 'staging',     'Ubuntu 22.04',  4, 16,  500, 'Datacenter MTL', 'idle',              220, '⚠️ Inactif depuis 6 semaines — candidat décommission'),
  (v_org, d_it, 'old-fileserver-01',    '10.0.3.10', 'production',  'Windows Server 2016', 4, 8, 2000, 'Salle serveurs', 'to_decommission', 190, 'Migration vers SharePoint terminée — planifier extinction T3 2026'),
  (v_org, d_ops, 'erp-sap-app-01',     '10.1.1.10', 'production',  'RHEL 8',       16, 64, 1000, 'Datacenter MTL', 'active',            850, 'SAP S/4HANA application server'),
  (v_org, d_ops, 'erp-sap-db-01',      '10.1.1.20', 'production',  'RHEL 8',       32, 128, 8000,'Datacenter MTL', 'active',           1400, 'SAP HANA DB — contrat SAP Basis inclus')
on conflict do nothing;

raise notice '✅ Données de démo insérées avec succès pour l''organisation %', v_org;
raise notice '   • 5 départements | budget, licences, apps, serveurs';
raise notice '   • 9 contrats fournisseurs (4 à renouveler < 60 jours)';
raise notice '   • 12 licences (plusieurs sous-utilisées)';
raise notice '   • 14 processus (12 manuels/semi — potentiel optimisation élevé)';
raise notice '   • 9 serveurs (2 candidats décommission)';

end $$;
