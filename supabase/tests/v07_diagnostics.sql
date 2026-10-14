-- EURACONNECT V0.7 - diagnostics non destructifs apres migration 006.
-- Executer sur projet de recette avec le role postgres (Supabase SQL Editor).
do $verify$
declare v_func text;
begin
 if to_regclass('public.ec07_assignations') is null or
    to_regclass('public.ec07_historique_dossiers') is null then
  raise exception 'Tables V0.7 manquantes'; end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='ec07_assignations' and c.relrowsecurity)
 or not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='ec07_historique_dossiers' and c.relrowsecurity)
 then raise exception 'RLS inactive sur une table V0.7';end if;
 foreach v_func in array array[
  'public.ec07_lister_dossiers(uuid)',
  'public.ec07_droit_entreprise(uuid,boolean)',
  'public.ec07_droit_conversation(uuid,boolean)',
  'public.ec07_besoins_disponibles(uuid,text)',
  'public.ec07_publier_besoin(uuid,text,text,integer,text)',
  'public.ec07_candidater(uuid,uuid,text)',
  'public.ec07_demander_relation(uuid,uuid)',
  'public.ec07_repondre_relation(uuid,uuid,boolean)',
  'public.ec07_ouvrir_conversation(uuid)',
  'public.ec07_envoyer_message(uuid,text)',
  'public.ec07_suivre_opportunite(uuid,text,text)',
  'public.ec07_assigner_dossier(uuid,uuid,uuid)',
  'public.ec07_historique(uuid,uuid)',
  'public.ec07_rattacher_besoin(uuid,uuid)'
 ] loop
  if to_regprocedure(v_func) is null then raise exception 'RPC manquante: %',v_func;end if;
  if not has_function_privilege('authenticated',to_regprocedure(v_func),'EXECUTE') then
   raise exception 'RPC non accessible aux membres connectes: %',v_func;end if;
  if has_function_privilege('anon',to_regprocedure(v_func),'EXECUTE') then
   raise exception 'RPC ouverte a anon: %',v_func;end if;
 end loop;
 if has_table_privilege('authenticated','public.ec07_assignations','SELECT') or
    has_table_privilege('authenticated','public.ec07_historique_dossiers','INSERT') or
    has_table_privilege('authenticated','public.ec07_assignations','UPDATE') then
  raise exception 'Privileges directs trop larges';end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='conversations_ec'
   and policyname='ec_conversations_lecture') then
  raise exception 'Ancienne politique conversation toujours en place';end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='messages_ec'
   and policyname='ec07_messages_lecture') then
  raise exception 'Nouvelle politique messages manquante';end if;
 raise notice 'EURACONNECT V0.7 : structure, permissions et politiques conformes aux controles';
end $verify$;

select 'v07_ok' as resultat,
 (select count(*) from public.ec07_assignations) as dossiers_attribues,
 (select count(*) from public.ec07_historique_dossiers) as actions_tracees,
 (select count(*) from public.entreprises_ec) as entreprises_existantes;
