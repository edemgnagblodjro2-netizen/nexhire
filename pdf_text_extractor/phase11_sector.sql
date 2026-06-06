-- Phase 11 : Type d'organisation (secteur) + IA contextuelle par secteur
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- 1. Ajouter la colonne org_type sur la table organizations
alter table public.organizations
  add column if not exists org_type text default 'entreprise'
    check (org_type in ('entreprise', 'hopital', 'municipalite', 'universite'));

-- 2. Mettre à jour les organisations existantes (valeur par défaut)
update public.organizations
  set org_type = 'entreprise'
  where org_type is null;
