-- Phase 27 : Bucket Supabase Storage pour les logos d'organisation
-- À exécuter une seule fois via le SQL Editor de Supabase.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,                                               -- URL publiques accessibles sans auth
  2097152,                                            -- 2 Mo max
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;
