-- ═══════════════════════════════════════════════════════════════════════════
-- Fix — Suppression des départements dupliqués
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor
-- Garde le département le plus ancien (created_at minimal) par nom+org
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Voir les doublons avant suppression (vérification)
SELECT organization_id, LOWER(name) AS name_lower, COUNT(*) AS cnt
FROM departments
GROUP BY organization_id, LOWER(name)
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 2. Supprimer les doublons (garde le plus ancien — id le plus petit)
DELETE FROM departments
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, LOWER(name)
             ORDER BY created_at ASC NULLS LAST, id ASC
           ) AS rn
    FROM departments
  ) ranked
  WHERE rn > 1
);

-- 3. Vérification finale (doit retourner 0 lignes)
SELECT organization_id, LOWER(name) AS name_lower, COUNT(*) AS cnt
FROM departments
GROUP BY organization_id, LOWER(name)
HAVING COUNT(*) > 1;
