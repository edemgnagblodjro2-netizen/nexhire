-- Phase 12 : Types de département + tableaux de bord personnalisés
-- Exécuter dans Supabase SQL Editor (une seule fois)

alter table public.departments
  add column if not exists dept_type text default 'general'
    check (dept_type in (
      'finance','hr','it','legal','operations',
      'marketing','direction','approvisionnement','general'
    ));
