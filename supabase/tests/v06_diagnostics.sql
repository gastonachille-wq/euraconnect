-- Tests de presence a executer dans le SQL Editor apres la migration V0.6.
-- Lecture seule. Les tests RLS reels necessitent des sessions authenticated de roles differents.
select 'entreprises_ec' as objet, to_regclass('public.entreprises_ec') is not null as ok
union all select 'entreprise_membres_ec',to_regclass('public.entreprise_membres_ec') is not null
union all select 'personnes_annuaire_ec',to_regclass('public.personnes_annuaire_ec') is not null
union all select 'entreprise_competences_ec',to_regclass('public.entreprise_competences_ec') is not null
union all select 'personne_competences_ec',to_regclass('public.personne_competences_ec') is not null
union all select 'bucket-media',exists(select 1 from storage.buckets where id='euraconnect-media')
union all select 'fonction-annuaire',to_regprocedure('public.ec_annuaire_rechercher(text,text,uuid,integer,integer)') is not null
union all select 'fonction-dashboard',to_regprocedure('public.ec_dashboard_v06()') is not null;

select p.id,p.nom_public,p.entreprise_id,e.nom as entreprise,
 m.role_membre,m.actif
from public.prestataires p
left join public.entreprises_ec e on e.id=p.entreprise_id
left join public.entreprise_membres_ec m on m.entreprise_id=e.id and m.profile_id=p.proprietaire_id
order by p.created_at;

select c.relname as table_name,c.relrowsecurity as rls_active
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('entreprises_ec','entreprise_membres_ec','personnes_annuaire_ec',
  'entreprise_competences_ec','personne_competences_ec')
order by c.relname;
