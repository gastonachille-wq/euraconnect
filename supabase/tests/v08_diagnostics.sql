-- EURACONNECT V0.8 - diagnostics READ ONLY pour SQL Editor.
-- Le SQL Editor (postgres) contourne RLS; tester les permissions avec des JWT applicatifs.
select 'tables' as categorie, nom,
 case when to_regclass('public.'||nom) is not null then 'OK' else 'MANQUANT' end as resultat
from (values('projets'),('prestataires'),('candidatures'),('reservations_rdv'),
 ('disponibilites_rdv'),('ec08_historique_besoins'),('entreprises_ec'),('entreprise_membres_ec')) t(nom)
order by nom;

select 'colonnes' as categorie, table_name||'.'||column_name as nom,
 'OK' as resultat
from information_schema.columns
where table_schema='public' and (
 (table_name='projets' and column_name in
  ('alias_demandeur','titre_anonyme','annonce_anonyme','statut_suivi','statut_modifie_le'))
 or (table_name='reservations_rdv' and column_name in
  ('startup_entreprise_id','alias_demandeur','objet_public','details_prives','projet_id','motif_annulation'))
 or (table_name='disponibilites_rdv' and column_name='intervenant_id'))
order by table_name,column_name;

select 'rpc' as categorie, p.proname as nom,
 case when has_function_privilege('authenticated',p.oid,'EXECUTE') then 'AUTH_OK'
      else 'AUTH_REFUSE' end as resultat
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'ec08_publier_besoin','ec08_mes_besoins','ec08_fil_besoins',
 'ec08_changer_statut_besoin','ec08_historique_besoin',
 'ec08_proposer_creneau','ec08_lister_creneaux','ec08_reserver_rdv',
 'ec08_lister_rdv','ec08_annuler_rdv','ec08_lister_messages')
order by p.proname;

select 'rls' as categorie, tablename||'.'||policyname as nom,
 cmd as resultat
from pg_policies
where schemaname='public' and tablename in
 ('projets','conversations_ec','messages_ec','opportunites_ec','reservations_rdv')
order by tablename,policyname;

select statut_suivi,count(*) as nombre
from public.projets group by statut_suivi order by statut_suivi;

select count(*) as besoins_sans_alias from public.projets
 where alias_demandeur is null or length(alias_demandeur)<10;

select count(*) as reservations_actives_dupliquees from (
 select disponibilite_id from public.reservations_rdv
 where statut='confirme' group by disponibilite_id having count(*)>1
) x;
