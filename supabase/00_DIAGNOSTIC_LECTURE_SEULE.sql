-- EURASANTE / Audit structurel : lecture seule.
-- Exécuter dans Supabase SQL Editor ; aucune donnée ni structure modifiée.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('prospects','projets','sourcing','historique','prospect_projets','organisations','contacts_relation','rendez_vous','rdv_contacts','referentiel_services_partenariats','partenariats','engagements_partenariat','actions_pilotage_partenariat','realisations_engagement_partenariat')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;

select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;

select tc.table_name,tc.constraint_name,tc.constraint_type,kcu.column_name,
       ccu.table_name as referenced_table,ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
left join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name and tc.table_schema=ccu.table_schema
where tc.table_schema='public'
order by tc.table_name,tc.constraint_name;
