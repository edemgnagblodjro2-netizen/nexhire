-- ── Injection démo : Parc IT avec cycle de vie ──────────────────────────────
-- Injecte 15 équipements couvrant les 3 états : 🟢 récent / 🟡 surveiller / 🔴 remplacer
-- Utilise la première organisation trouvée (à ajuster si multi-tenant)

DO $$
DECLARE
  v_org_id  UUID;
  v_dept_ti UUID;
  v_dept_rh UUID;
  v_dept_fi UUID;
BEGIN

  -- ── Récupère l'organisation ──────────────────────────────────────────────
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Aucune organisation trouvée.'; END IF;

  -- ── Récupère ou crée les départements ───────────────────────────────────
  SELECT id INTO v_dept_ti FROM public.departments
    WHERE organization_id = v_org_id AND name ILIKE '%technolog%' LIMIT 1;
  SELECT id INTO v_dept_rh FROM public.departments
    WHERE organization_id = v_org_id AND name ILIKE '%ressources%' LIMIT 1;
  SELECT id INTO v_dept_fi FROM public.departments
    WHERE organization_id = v_org_id AND name ILIKE '%financ%' LIMIT 1;

  -- ── Supprime les données démo existantes (évite les doublons) ───────────
  DELETE FROM public.servers
    WHERE organization_id = v_org_id AND notes ILIKE '%[demo]%';

  -- ════════════════════════════════════════════════════════════════════════
  -- 🟢 ACTIFS RÉCENTS  (achetés après juin 2024 → moins de 2 ans)
  -- ════════════════════════════════════════════════════════════════════════

  INSERT INTO public.servers (
    organization_id, department_id, device_type, hostname, ip_address,
    environment, os, cpu_cores, ram_gb, storage_gb,
    location, status, asset_tag, purchase_price,
    acquisition_date, warranty_end_date, replacement_date, notes
  ) VALUES

  (v_org_id, v_dept_ti, 'laptop', 'laptop-martin-01', '192.168.1.101',
   'production', 'Windows 11 Pro', 8, 16, 512,
   'Bureau principal', 'active', 'TAG-0101', 1799.00,
   '2025-02-10', '2028-02-10', '2028-03-01',
   'Dell Latitude 5540 — [demo]'),

  (v_org_id, v_dept_rh, 'laptop', 'laptop-sophie-02', '192.168.1.102',
   'production', 'Windows 11 Pro', 8, 16, 512,
   'Bureau principal', 'active', 'TAG-0102', 1799.00,
   '2025-03-15', '2028-03-15', '2028-04-01',
   'Dell Latitude 5540 — [demo]'),

  (v_org_id, v_dept_fi, 'laptop', 'laptop-benoit-03', '192.168.1.103',
   'production', 'macOS Sequoia', 10, 16, 512,
   'Bureau principal', 'active', 'TAG-0103', 2299.00,
   '2024-11-20', '2027-11-20', '2027-12-01',
   'MacBook Air M3 — [demo]'),

  (v_org_id, v_dept_ti, 'server', 'srv-app-01', '10.0.0.10',
   'production', 'Ubuntu 24.04 LTS', 16, 64, 2000,
   'Datacenter Montréal', 'active', 'TAG-SRV-01', 8500.00,
   '2025-01-08', '2030-01-08', '2030-06-01',
   'Dell PowerEdge R550 — [demo]'),

  (v_org_id, v_dept_ti, 'switch', 'sw-core-01', '10.0.0.1',
   'production', NULL, NULL, NULL, NULL,
   'Salle réseau', 'active', 'TAG-NET-01', 2200.00,
   '2024-09-01', '2029-09-01', '2029-10-01',
   'Cisco Catalyst 9200 — [demo]'),

  -- ════════════════════════════════════════════════════════════════════════
  -- 🟡 À SURVEILLER  (achetés entre juin 2022 et juin 2024 → 2-4 ans)
  -- ════════════════════════════════════════════════════════════════════════

  (v_org_id, v_dept_ti, 'laptop', 'laptop-jean-04', '192.168.1.104',
   'production', 'Windows 11 Pro', 8, 8, 256,
   'Bureau principal', 'active', 'TAG-0104', 1499.00,
   '2023-01-15', '2026-01-15', '2026-06-01',
   'Lenovo ThinkPad E15 — [demo]'),

  (v_org_id, v_dept_rh, 'laptop', 'laptop-marie-05', '192.168.1.105',
   'production', 'Windows 10 Pro', 4, 8, 256,
   'Bureau principal', 'active', 'TAG-0105', 1299.00,
   '2022-08-20', '2025-08-20', NULL,
   'HP ProBook 450 G8 — [demo]'),

  (v_org_id, v_dept_fi, 'desktop', 'desktop-finance-01', '192.168.1.111',
   'production', 'Windows 11 Pro', 8, 16, 512,
   'Bureau principal', 'active', 'TAG-0201', 1100.00,
   '2023-06-10', '2026-06-10', '2027-01-01',
   'HP EliteDesk 800 G9 — [demo]'),

  (v_org_id, v_dept_ti, 'firewall', 'fw-edge-01', '10.0.0.254',
   'production', NULL, NULL, NULL, NULL,
   'Salle réseau', 'active', 'TAG-NET-02', 3500.00,
   '2022-11-05', '2025-11-05', '2027-12-01',
   'Fortinet FortiGate 60F — [demo]'),

  -- ════════════════════════════════════════════════════════════════════════
  -- 🔴 REMPLACEMENT RECOMMANDÉ  (achetés avant juin 2022 → 4+ ans)
  -- ════════════════════════════════════════════════════════════════════════

  (v_org_id, v_dept_rh, 'laptop', 'laptop-pierre-06', '192.168.1.106',
   'production', 'Windows 10 Pro', 4, 8, 256,
   'Bureau principal', 'active', 'TAG-0106', 1100.00,
   '2020-06-15', '2023-06-15', NULL,
   'Dell Latitude 5410 — [demo]'),

  (v_org_id, v_dept_fi, 'laptop', 'laptop-finance-03', '192.168.1.107',
   'production', 'Windows 10 Home', 4, 8, 128,
   'Bureau principal', 'idle', 'TAG-0107', 999.00,
   '2019-01-10', '2022-01-10', '2024-06-01',
   'HP Pavilion 15 — [demo]'),

  (v_org_id, v_dept_ti, 'server', 'srv-legacy-02', '10.0.0.20',
   'production', 'Windows Server 2012 R2', 8, 32, 1000,
   'Datacenter Montréal', 'to_decommission', 'TAG-SRV-02', 4200.00,
   '2018-03-01', '2021-03-01', '2026-09-01',
   'Dell PowerEdge R430 — fin de vie — [demo]'),

  (v_org_id, v_dept_ti, 'router', 'rtr-wan-01', '10.0.0.2',
   'production', NULL, NULL, NULL, NULL,
   'Salle réseau', 'active', 'TAG-NET-03', 1800.00,
   '2019-05-20', '2022-05-20', '2026-09-01',
   'Cisco ISR 1111 — [demo]'),

  (v_org_id, v_dept_rh, 'desktop', 'desktop-rh-old', '192.168.1.112',
   'production', 'Windows 7 Pro', 2, 4, 128,
   'Bureau principal', 'idle', 'TAG-0202', 750.00,
   '2017-09-12', '2020-09-12', '2026-12-01',
   'HP Compaq Pro 6300 — très vieux — [demo]'),

  (v_org_id, v_dept_fi, 'printer', 'printer-main-01', NULL,
   'production', NULL, NULL, NULL, NULL,
   'Salle commune', 'active', 'TAG-PRT-01', 850.00,
   '2020-02-28', '2023-02-28', '2026-12-01',
   'Brother MFC-L8900CDW — [demo]');

  RAISE NOTICE '✅ 15 équipements démo injectés pour org_id = %', v_org_id;
END;
$$;
