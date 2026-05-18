import { Router } from "express";
import { z } from "zod";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// ── Schema init ─────────────────────────────────────────────────────────────
// Called once per tenant on first request to ensure tables exist.
const initializedSchemas = new Set<string>();

async function ensureAzTables(schema: string) {
  if (initializedSchemas.has(schema)) return;
  // Mark immediately to prevent concurrent init races
  initializedSchemas.add(schema);

  // Each CREATE TABLE in its own query — pg driver doesn't support multi-statement strings
  await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".az_sites (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        TEXT NOT NULL,
    city        TEXT NOT NULL,
    address     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    counters    INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".az_staff (
    id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    site_id      VARCHAR(36),
    full_name    TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'agent',
    guichet      TEXT,
    status       TEXT NOT NULL DEFAULT 'offline',
    served_today INT NOT NULL DEFAULT 0,
    avg_time_sec INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".az_queues (
    id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    site_id    VARCHAR(36),
    name       TEXT NOT NULL DEFAULT 'File principale',
    prefix     TEXT NOT NULL DEFAULT 'A',
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".az_tickets (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    queue_id    VARCHAR(36),
    site_id     VARCHAR(36),
    number      TEXT NOT NULL,
    client_name TEXT,
    phone       TEXT,
    priority    TEXT NOT NULL DEFAULT 'normal',
    status      TEXT NOT NULL DEFAULT 'waiting',
    guichet     TEXT,
    staff_id    VARCHAR(36),
    called_at   TIMESTAMPTZ,
    served_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".az_appointments (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    site_id     VARCHAR(36),
    client_name TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    service     TEXT NOT NULL,
    appt_date   DATE NOT NULL,
    appt_time   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".az_crm_clients (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    client_name TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    tags        JSONB NOT NULL DEFAULT '[]',
    notes       TEXT,
    is_vip      BOOLEAN NOT NULL DEFAULT false,
    visit_count INT NOT NULL DEFAULT 0,
    last_visit  DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  // Seed demo data only if tables are empty
  const siteCount = await pool.query(`SELECT count(*) FROM "${schema}".az_sites`);
  if (siteCount.rows[0].count === "0") {
    await pool.query(`
      INSERT INTO "${schema}".az_sites (name, city, address, status, counters) VALUES
        ('Bureau Principal',    'Montréal',  '1000 rue Saint-Denis',      'active',   6),
        ('Succursale Nord',     'Laval',     '345 boul. Cartier O.',       'active',   3),
        ('Succursale Sud',      'Longueuil', '880 chemin Chambly',         'active',   4),
        ('Point de service Est','Repentigny','225 rue Notre-Dame',         'inactive', 2),
        ('Kiosque Aéroport',    'Dorval',    'Aéroport Montréal-Trudeau', 'active',   2)
    `);

    const sites = await pool.query(`SELECT id FROM "${schema}".az_sites WHERE status='active' LIMIT 1`);
    const siteId: string = sites.rows[0]?.id;

    if (siteId) {
      await pool.query(
        `INSERT INTO "${schema}".az_queues (site_id, name, prefix) VALUES ($1, 'File principale', 'A')`,
        [siteId]
      );
      await pool.query(
        `INSERT INTO "${schema}".az_staff (site_id, full_name, role, guichet, status, served_today, avg_time_sec) VALUES
          ($1, 'Marie Thibault',   'agent_principal', 'Guichet 1', 'active',  48, 372),
          ($1, 'Jean-Paul Dubois', 'agent',           'Guichet 2', 'active',  44, 426),
          ($1, 'Sara Khalil',      'agent_principal', 'Guichet 3', 'active',  52, 348),
          ($1, 'Karim Benali',     'agent',           'Guichet 4', 'paused',  39, 504),
          ($1, 'Lucie Fontaine',   'superviseur',     NULL,        'offline',  0,  0)`,
        [siteId]
      );
      await pool.query(
        `INSERT INTO "${schema}".az_appointments (site_id, client_name, email, phone, service, appt_date, appt_time, status) VALUES
          ($1, 'Marie Dupont',   'marie@example.com',  '514-555-0101', 'Service civil',        '2026-05-18', '09:00', 'confirmed'),
          ($1, 'Ahmed Benali',   'ahmed@example.com',  '438-555-0202', 'Immigration',           '2026-05-18', '09:30', 'confirmed'),
          ($1, 'Julie Tremblay', 'julie@example.com',  '450-555-0303', 'Permis construction',  '2026-05-18', '10:00', 'pending'),
          ($1, 'Carlos Morales', 'carlos@example.com', '514-555-0404', 'Consultation sociale', '2026-05-18', '10:30', 'confirmed'),
          ($1, 'Fatima Osei',    'fatima@example.com', '514-555-0505', 'Impôts / fiscalité',   '2026-05-19', '14:00', 'pending')`,
        [siteId]
      );
      await pool.query(
        `INSERT INTO "${schema}".az_crm_clients (client_name, email, phone, tags, notes, is_vip, visit_count, last_visit) VALUES
          ('Marie Dupont',   'marie@example.com',  '514-555-0101', '["VIP","Service civil"]',  'Cliente régulière, préfère les matins', true,  24, '2026-05-18'),
          ('Ahmed Benali',   'ahmed@example.com',  '438-555-0202', '["Immigration"]',           'Dossier immigration en cours',         false, 12, '2026-05-15'),
          ('Julie Tremblay', 'julie@example.com',  '450-555-0303', '["Construction"]',          'Permis mensuel suivi',                 false,  8, '2026-05-10'),
          ('Carlos Morales', 'carlos@example.com', '514-555-0404', '["VIP","Interprète"]',      'Interprète requis — espagnol',         true,  31, '2026-05-17'),
          ('Fatima Osei',    'fatima@example.com', '514-555-0505', '["Impôts"]',                '',                                     false,  5, '2026-05-12')`
      );
    }
  }

}

// ── Auth middleware shorthand ────────────────────────────────────────────────
function requireTenant(req: any, res: any): boolean {
  if (!req.tenantUser || !req.tenant) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// SITES
// ════════════════════════════════════════════════════════════════════════════
router.get("/attentezero/sites", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const { rows } = await pool.query(
    `SELECT id, name, city, address, status, counters,
            (SELECT count(*) FROM "${s}".az_tickets
             WHERE site_id = az_sites.id AND status IN ('waiting','called')
               AND created_at::date = CURRENT_DATE)::int AS today_clients
     FROM "${s}".az_sites ORDER BY created_at`
  );
  res.json(rows);
});

router.post("/attentezero/sites", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const B = z.object({ name: z.string().min(1), city: z.string().min(1), address: z.string().default(""), counters: z.number().int().min(1).default(1) });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const { rows } = await pool.query(
    `INSERT INTO "${s}".az_sites (name, city, address, counters) VALUES ($1,$2,$3,$4) RETURNING *`,
    [p.data.name, p.data.city, p.data.address, p.data.counters]
  );
  res.status(201).json(rows[0]);
});

router.patch("/attentezero/sites/:id", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const B = z.object({ name: z.string().min(1).optional(), city: z.string().min(1).optional(), address: z.string().optional(), status: z.enum(["active","inactive"]).optional(), counters: z.number().int().min(1).optional() });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const sets: string[] = []; const vals: any[] = [];
  let i = 1;
  if (p.data.name    !== undefined) { sets.push(`name=$${i++}`);     vals.push(p.data.name); }
  if (p.data.city    !== undefined) { sets.push(`city=$${i++}`);     vals.push(p.data.city); }
  if (p.data.address !== undefined) { sets.push(`address=$${i++}`);  vals.push(p.data.address); }
  if (p.data.status  !== undefined) { sets.push(`status=$${i++}`);   vals.push(p.data.status); }
  if (p.data.counters!== undefined) { sets.push(`counters=$${i++}`); vals.push(p.data.counters); }
  if (!sets.length) { res.status(400).json({ error: "Nothing to update" }); return; }
  sets.push(`updated_at=now()`);
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE "${s}".az_sites SET ${sets.join(",")} WHERE id=$${i} RETURNING *`, vals);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════════════════════════
// STAFF
// ════════════════════════════════════════════════════════════════════════════
router.get("/attentezero/staff", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const { rows } = await pool.query(
    `SELECT id, site_id, full_name, role, guichet, status, served_today,
            CASE WHEN avg_time_sec=0 THEN '—' ELSE ROUND(avg_time_sec/60.0,1)||' min' END as avg_time
     FROM "${s}".az_staff ORDER BY created_at`
  );
  res.json(rows);
});

router.patch("/attentezero/staff/:id/status", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  const B = z.object({ status: z.enum(["active","paused","offline"]) });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const { rows } = await pool.query(
    `UPDATE "${s}".az_staff SET status=$1, updated_at=now() WHERE id=$2 RETURNING *`,
    [p.data.status, req.params.id]
  );
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════════════════════════
// QUEUES + TICKETS
// ════════════════════════════════════════════════════════════════════════════
router.get("/attentezero/queues", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const siteId = req.query.site_id as string | undefined;
  const where = siteId ? `WHERE site_id=$1` : "";
  const vals  = siteId ? [siteId] : [];
  const { rows } = await pool.query(`SELECT * FROM "${s}".az_queues ${where} ORDER BY created_at`, vals);
  res.json(rows);
});

router.get("/attentezero/tickets", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const siteId  = req.query.site_id  as string | undefined;
  const queueId = req.query.queue_id as string | undefined;
  const status  = req.query.status   as string | undefined;
  const conditions: string[] = ["created_at::date = CURRENT_DATE"];
  const vals: any[] = [];
  let i = 1;
  if (siteId)  { conditions.push(`site_id=$${i++}`);  vals.push(siteId); }
  if (queueId) { conditions.push(`queue_id=$${i++}`); vals.push(queueId); }
  if (status)  { conditions.push(`status=$${i++}`);   vals.push(status); }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const { rows } = await pool.query(
    `SELECT * FROM "${s}".az_tickets ${where} ORDER BY
       CASE priority WHEN 'urgent' THEN 0 WHEN 'vip' THEN 1 ELSE 2 END,
       created_at`,
    vals
  );
  res.json(rows);
});

router.post("/attentezero/tickets", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const B = z.object({
    queue_id:    z.string().min(1),
    site_id:     z.string().min(1).optional(),
    client_name: z.string().optional(),
    phone:       z.string().optional(),
    priority:    z.enum(["normal","vip","urgent"]).default("normal"),
  });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }

  const queueRow = await pool.query(`SELECT prefix FROM "${s}".az_queues WHERE id=$1`, [p.data.queue_id]);
  if (!queueRow.rows[0]) { res.status(400).json({ error: "Queue not found" }); return; }
  const prefix: string = p.data.priority === "vip" ? "V" : p.data.priority === "urgent" ? "U" : queueRow.rows[0].prefix;

  const countRow = await pool.query(
    `SELECT count(*) FROM "${s}".az_tickets WHERE queue_id=$1 AND created_at::date=CURRENT_DATE`,
    [p.data.queue_id]
  );
  const num = parseInt(countRow.rows[0].count) + 100;
  const ticketNumber = `${prefix}-${num}`;

  const { rows } = await pool.query(
    `INSERT INTO "${s}".az_tickets (queue_id, site_id, number, client_name, phone, priority)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [p.data.queue_id, p.data.site_id ?? null, ticketNumber, p.data.client_name ?? null, p.data.phone ?? null, p.data.priority]
  );
  res.status(201).json(rows[0]);
});

router.patch("/attentezero/tickets/:id/call", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  const B = z.object({ guichet: z.string().min(1) });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const { rows } = await pool.query(
    `UPDATE "${s}".az_tickets SET status='called', guichet=$1, called_at=now() WHERE id=$2 AND status='waiting' RETURNING *`,
    [p.data.guichet, req.params.id]
  );
  if (!rows[0]) { res.status(404).json({ error: "Ticket not found or already called" }); return; }
  res.json(rows[0]);
});

router.patch("/attentezero/tickets/:id/serve", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  const { rows } = await pool.query(
    `UPDATE "${s}".az_tickets SET status='served', served_at=now() WHERE id=$1 AND status='called' RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) { res.status(404).json({ error: "Ticket not found or not called" }); return; }
  res.json(rows[0]);
});

router.delete("/attentezero/tickets/:id", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await pool.query(`DELETE FROM "${s}".az_tickets WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ════════════════════════════════════════════════════════════════════════════
router.get("/attentezero/appointments", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const status  = req.query.status   as string | undefined;
  const siteId  = req.query.site_id  as string | undefined;
  const dateStr = req.query.date     as string | undefined;
  const conditions: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (status)  { conditions.push(`status=$${i++}`);          vals.push(status); }
  if (siteId)  { conditions.push(`site_id=$${i++}`);         vals.push(siteId); }
  if (dateStr) { conditions.push(`appt_date=$${i++}::date`); vals.push(dateStr); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT * FROM "${s}".az_appointments ${where} ORDER BY appt_date, appt_time`,
    vals
  );
  res.json(rows);
});

router.post("/attentezero/appointments", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const B = z.object({
    site_id:     z.string().optional(),
    client_name: z.string().min(1),
    email:       z.string().email().optional(),
    phone:       z.string().optional(),
    service:     z.string().min(1),
    appt_date:   z.string().min(1),
    appt_time:   z.string().min(1),
    notes:       z.string().optional(),
  });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const { rows } = await pool.query(
    `INSERT INTO "${s}".az_appointments (site_id, client_name, email, phone, service, appt_date, appt_time, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [p.data.site_id ?? null, p.data.client_name, p.data.email ?? null, p.data.phone ?? null,
     p.data.service, p.data.appt_date, p.data.appt_time, p.data.notes ?? null]
  );
  res.status(201).json(rows[0]);
});

router.patch("/attentezero/appointments/:id", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  const B = z.object({ status: z.enum(["pending","confirmed","cancelled","done"]).optional(), notes: z.string().optional() });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const sets: string[] = []; const vals: any[] = [];
  let i = 1;
  if (p.data.status !== undefined) { sets.push(`status=$${i++}`); vals.push(p.data.status); }
  if (p.data.notes  !== undefined) { sets.push(`notes=$${i++}`);  vals.push(p.data.notes); }
  if (!sets.length) { res.status(400).json({ error: "Nothing to update" }); return; }
  sets.push("updated_at=now()");
  vals.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE "${s}".az_appointments SET ${sets.join(",")} WHERE id=$${i} RETURNING *`, vals
  );
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════════════════════════
// CRM
// ════════════════════════════════════════════════════════════════════════════
router.get("/attentezero/crm", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const q = req.query.q as string | undefined;
  const where = q ? `WHERE client_name ILIKE $1 OR email ILIKE $1` : "";
  const vals  = q ? [`%${q}%`] : [];
  const { rows } = await pool.query(
    `SELECT * FROM "${s}".az_crm_clients ${where} ORDER BY visit_count DESC, client_name`, vals
  );
  res.json(rows);
});

router.post("/attentezero/crm", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);
  const B = z.object({
    client_name: z.string().min(1),
    email:       z.string().email().optional(),
    phone:       z.string().optional(),
    tags:        z.array(z.string()).default([]),
    notes:       z.string().optional(),
    is_vip:      z.boolean().default(false),
  });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const { rows } = await pool.query(
    `INSERT INTO "${s}".az_crm_clients (client_name, email, phone, tags, notes, is_vip)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [p.data.client_name, p.data.email ?? null, p.data.phone ?? null, JSON.stringify(p.data.tags), p.data.notes ?? null, p.data.is_vip]
  );
  res.status(201).json(rows[0]);
});

router.patch("/attentezero/crm/:id", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  const B = z.object({
    client_name: z.string().min(1).optional(),
    email:       z.string().email().optional(),
    phone:       z.string().optional(),
    tags:        z.array(z.string()).optional(),
    notes:       z.string().optional(),
    is_vip:      z.boolean().optional(),
  });
  const p = B.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: p.error.flatten() }); return; }
  const sets: string[] = []; const vals: any[] = [];
  let i = 1;
  if (p.data.client_name !== undefined) { sets.push(`client_name=$${i++}`); vals.push(p.data.client_name); }
  if (p.data.email       !== undefined) { sets.push(`email=$${i++}`);       vals.push(p.data.email); }
  if (p.data.phone       !== undefined) { sets.push(`phone=$${i++}`);       vals.push(p.data.phone); }
  if (p.data.tags        !== undefined) { sets.push(`tags=$${i++}`);        vals.push(JSON.stringify(p.data.tags)); }
  if (p.data.notes       !== undefined) { sets.push(`notes=$${i++}`);       vals.push(p.data.notes); }
  if (p.data.is_vip      !== undefined) { sets.push(`is_vip=$${i++}`);      vals.push(p.data.is_vip); }
  if (!sets.length) { res.status(400).json({ error: "Nothing to update" }); return; }
  sets.push("updated_at=now()");
  vals.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE "${s}".az_crm_clients SET ${sets.join(",")} WHERE id=$${i} RETURNING *`, vals
  );
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
router.get("/attentezero/analytics/summary", async (req, res) => {
  if (!requireTenant(req, res)) return;
  const s = req.tenant!.schemaName;
  await ensureAzTables(s);

  const [served, avgWait, hourly, weekly, staffStats] = await Promise.all([
    pool.query(`SELECT count(*)::int as total FROM "${s}".az_tickets WHERE status='served' AND created_at::date=CURRENT_DATE`),
    pool.query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (served_at - created_at))/60),1) as avg_min FROM "${s}".az_tickets WHERE status='served' AND served_at IS NOT NULL AND created_at::date=CURRENT_DATE`),
    pool.query(`
      SELECT EXTRACT(HOUR FROM created_at)::int as hour, count(*)::int as clients
      FROM "${s}".az_tickets WHERE created_at::date=CURRENT_DATE
      GROUP BY 1 ORDER BY 1`),
    pool.query(`
      SELECT created_at::date as day, count(*)::int as served
      FROM "${s}".az_tickets WHERE status='served' AND created_at > CURRENT_DATE - INTERVAL '7 days'
      GROUP BY 1 ORDER BY 1`),
    pool.query(`
      SELECT full_name as name, served_today as served,
             CASE WHEN avg_time_sec=0 THEN '—' ELSE ROUND(avg_time_sec/60.0,1)||' min' END as avg_time
      FROM "${s}".az_staff WHERE status != 'offline' ORDER BY served_today DESC LIMIT 6`),
  ]);

  res.json({
    served_today:   served.rows[0].total ?? 0,
    avg_wait_min:   parseFloat(avgWait.rows[0].avg_min ?? "0") || 0,
    hourly_flow:    hourly.rows,
    weekly_served:  weekly.rows,
    staff_perf:     staffStats.rows,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC — ticket by phone (no auth, for QR code portal)
// ════════════════════════════════════════════════════════════════════════════
router.post("/attentezero/public/:tenantSlug/ticket", async (req, res) => {
  const { tenantSlug } = req.params;
  const { Pool: Pool2 } = pg;
  const p2 = new Pool2({ connectionString: process.env.DATABASE_URL });
  const { db: dbI } = await import("@workspace/db");
  const { tenants: tenantsT } = await import("@workspace/db/schema");
  const { eq: eqI } = await import("drizzle-orm");
  const [t] = await dbI.select().from(tenantsT).where(eqI(tenantsT.subdomain, tenantSlug)).limit(1);
  if (!t) { res.status(404).json({ error: "Tenant not found" }); return; }
  const s = t.schemaName;
  await ensureAzTables(s);

  const B = z.object({ client_name: z.string().optional(), phone: z.string().optional(), priority: z.enum(["normal","vip","urgent"]).default("normal") });
  const parsed = B.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const queueRow = await p2.query(`SELECT id, prefix FROM "${s}".az_queues WHERE status='open' ORDER BY created_at LIMIT 1`);
  if (!queueRow.rows[0]) { res.status(503).json({ error: "No open queue" }); return; }
  const queue = queueRow.rows[0];
  const prefix = parsed.data.priority === "vip" ? "V" : parsed.data.priority === "urgent" ? "U" : queue.prefix;
  const countRow = await p2.query(`SELECT count(*) FROM "${s}".az_tickets WHERE queue_id=$1 AND created_at::date=CURRENT_DATE`, [queue.id]);
  const num = parseInt(countRow.rows[0].count) + 100;

  const siteRow = await p2.query(`SELECT id FROM "${s}".az_sites WHERE status='active' LIMIT 1`);
  const { rows } = await p2.query(
    `INSERT INTO "${s}".az_tickets (queue_id, site_id, number, client_name, phone, priority)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [queue.id, siteRow.rows[0]?.id ?? null, `${prefix}-${num}`, parsed.data.client_name ?? null, parsed.data.phone ?? null, parsed.data.priority]
  );

  // Return position
  const posRow = await p2.query(
    `SELECT count(*)::int as position FROM "${s}".az_tickets
     WHERE queue_id=$1 AND status='waiting' AND created_at < $2`,
    [queue.id, rows[0].created_at]
  );
  const waitingCount = await p2.query(`SELECT count(*)::int FROM "${s}".az_tickets WHERE queue_id=$1 AND status='waiting'`, [queue.id]);

  res.status(201).json({
    ticket: rows[0],
    position: (posRow.rows[0].position ?? 0) + 1,
    total_waiting: parseInt(waitingCount.rows[0].count) || 1,
    estimated_wait_min: ((posRow.rows[0].position ?? 0) + 1) * 4,
  });
});

// Public: get tenant info + open queues (no auth — for the citizen landing page)
router.get("/attentezero/public/:tenantSlug/info", async (req, res) => {
  const { tenantSlug } = req.params;
  const { db: dbI } = await import("@workspace/db");
  const { tenants: tenantsT } = await import("@workspace/db/schema");
  const { eq: eqI } = await import("drizzle-orm");
  const [t] = await dbI.select().from(tenantsT).where(eqI(tenantsT.subdomain, tenantSlug)).limit(1);
  if (!t) { res.status(404).json({ error: "Tenant not found" }); return; }
  const s = t.schemaName;
  await ensureAzTables(s);

  const sitesRow = await pool.query(`SELECT id, name, city, address, status FROM "${s}".az_sites WHERE status='active' ORDER BY name LIMIT 10`);
  const queuesRow = await pool.query(`SELECT id, name, prefix, site_id FROM "${s}".az_queues WHERE status='open' ORDER BY name`);
  const waitRow = await pool.query(`SELECT count(*)::int as waiting FROM "${s}".az_tickets WHERE status='waiting' AND created_at::date=CURRENT_DATE`);

  res.json({
    tenantName: t.name ?? tenantSlug,
    sites: sitesRow.rows,
    queues: queuesRow.rows,
    totalWaiting: waitRow.rows[0]?.waiting ?? 0,
  });
});

// Public: get ticket status (for polling)
router.get("/attentezero/public/:tenantSlug/ticket/:ticketId", async (req, res) => {
  const { tenantSlug, ticketId } = req.params;
  const { db: dbI } = await import("@workspace/db");
  const { tenants: tenantsT } = await import("@workspace/db/schema");
  const { eq: eqI } = await import("drizzle-orm");
  const [t] = await dbI.select().from(tenantsT).where(eqI(tenantsT.subdomain, tenantSlug)).limit(1);
  if (!t) { res.status(404).json({ error: "Tenant not found" }); return; }
  const s = t.schemaName;

  const ticketRow = await pool.query(`SELECT * FROM "${s}".az_tickets WHERE id=$1`, [ticketId]);
  if (!ticketRow.rows[0]) { res.status(404).json({ error: "Ticket not found" }); return; }
  const ticket = ticketRow.rows[0];

  if (ticket.status === "waiting") {
    const posRow = await pool.query(
      `SELECT count(*)::int as position FROM "${s}".az_tickets
       WHERE queue_id=$1 AND status='waiting' AND created_at <= $2`,
      [ticket.queue_id, ticket.created_at]
    );
    const pos = posRow.rows[0].position ?? 1;
    res.json({ ticket, position: pos, estimated_wait_min: pos * 4 });
  } else {
    res.json({ ticket, position: 0, estimated_wait_min: 0 });
  }
});

export default router;
