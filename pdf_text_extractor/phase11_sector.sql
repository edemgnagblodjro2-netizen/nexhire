-- Phase 11 : Types sectoriels + structure de départements par défaut
-- Exécuter dans Supabase SQL Editor (une seule fois)

alter table public.organizations
  add column if not exists org_type text default 'entreprise'
    check (org_type in ('entreprise','hopital','municipalite','universite'));
