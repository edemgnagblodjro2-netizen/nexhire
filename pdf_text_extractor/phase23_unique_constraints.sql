-- phase23_unique_constraints.sql
-- Déduplique les serveurs et apps, puis ajoute des index UNIQUE.

-- 1. Supprime les doublons dans servers (garde le premier ctid de chaque hostname/org)
DELETE FROM servers a
USING servers b
WHERE a.organization_id = b.organization_id
  AND a.hostname = b.hostname
  AND a.ctid > b.ctid;

-- 2. Supprime les doublons dans it_applications (garde le premier ctid de chaque name/org)
DELETE FROM it_applications a
USING it_applications b
WHERE a.organization_id = b.organization_id
  AND a.name = b.name
  AND a.ctid > b.ctid;

-- 3. Index unique sur servers
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_org_hostname
  ON servers (organization_id, hostname);

-- 4. Index unique sur it_applications
CREATE UNIQUE INDEX IF NOT EXISTS idx_it_applications_org_name
  ON it_applications (organization_id, name);
