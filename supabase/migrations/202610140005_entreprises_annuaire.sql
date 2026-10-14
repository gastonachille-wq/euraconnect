-- EURACONNECT V0.6 - migration additive, appliquer apres 001 a 004.
-- Important : organisations = structure d'incubation, entreprises_ec = entreprise utilisatrice.
-- Executer en recette d'abord; aucune suppression de table ni de compte.
create extension if not exists pg_trgm;

create table if not exists public.entreprises_ec (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 nom text not null check (char_length(trim(nom)) between 2 and 160),
 type text not null check (type in ('prestataire','startup','autre')),
 statut text not null default 'brouillon' check (statut in ('brouillon','publiee','masquee')),
 presentation_html text not null default '' check (char_length(presentation_html)<=16000),
 site_web text check (site_web is null or char_length(site_web)<=300),
 logo_path text,
 cree_par uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists entreprises_ec_org_nom on public.entreprises_ec(organisation_id,nom);
create index if not exists entreprises_ec_nom_trgm on public.entreprises_ec using gin(nom gin_trgm_ops);

create table if not exists public.entreprise_membres_ec (
 entreprise_id uuid not null references public.entreprises_ec(id) on delete restrict,
 profile_id uuid not null references public.profiles(id) on delete restrict,
 role_membre text not null check(role_membre in ('proprietaire','gestionnaire','collaborateur')),
 actif boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(entreprise_id,profile_id)
);
create index if not exists entreprise_membres_ec_personne on public.entreprise_membres_ec(profile_id,actif);

alter table public.profiles add column if not exists entreprise_id uuid references public.entreprises_ec(id);
alter table public.prestataires add column if not exists entreprise_id uuid references public.entreprises_ec(id);
create unique index if not exists prestataires_entreprise_ec_unique on public.prestataires(entreprise_id) where entreprise_id is not null;
alter table public.offres add column if not exists description_html text not null default '';
alter table public.offres add column if not exists image_path text;
alter table public.projets add column if not exists description_html text not null default '';
alter table public.projets add column if not exists entreprise_id uuid references public.entreprises_ec(id);
alter table public.prestataires add column if not exists presentation_html text not null default '';

create table if not exists public.personnes_annuaire_ec (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 organisation_id uuid not null references public.organisations(id),
 entreprise_id uuid references public.entreprises_ec(id),
 nom_public text not null check(char_length(trim(nom_public)) between 2 and 120),
 titre text not null default '' check(char_length(titre)<=160),
 bio_html text not null default '' check(char_length(bio_html)<=16000),
 avatar_path text,
 visible boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.entreprise_competences_ec (
 entreprise_id uuid not null references public.entreprises_ec(id) on delete cascade,
 competence_id uuid not null references public.competences_ec(id),
 created_at timestamptz not null default now(),
 primary key(entreprise_id,competence_id)
);
create table if not exists public.personne_competences_ec (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 competence_id uuid not null references public.competences_ec(id),
 created_at timestamptz not null default now(),
 primary key(profile_id,competence_id)
);

-- Rattrapage : une entreprise par prestataire historique, sans changer les UUID existants.
do $do$
declare v record; v_ent uuid;
begin
 for v in select p.id,p.organisation_id,p.proprietaire_id,p.nom_public,p.description,p.statut
          from public.prestataires p where p.entreprise_id is null
 loop
  insert into public.entreprises_ec(organisation_id,nom,type,statut,presentation_html,cree_par)
  values(v.organisation_id,v.nom_public,'prestataire',
         case when v.statut='valide' then 'publiee' else 'brouillon' end,
         '',v.proprietaire_id) returning id into v_ent;
  update public.prestataires set entreprise_id=v_ent where id=v.id;
  insert into public.entreprise_membres_ec(entreprise_id,profile_id,role_membre)
  values(v_ent,v.proprietaire_id,'proprietaire') on conflict do nothing;
  update public.profiles set entreprise_id=coalesce(entreprise_id,v_ent)
  where id=v.proprietaire_id;
 end loop;
 update public.projets j set entreprise_id=p.entreprise_id
 from public.profiles p where j.incube_id=p.id and j.entreprise_id is null;
 insert into public.entreprise_competences_ec(entreprise_id,competence_id)
 select distinct p.entreprise_id, pc.competence_id
 from public.prestataire_competences_ec pc join public.prestataires p on p.id=pc.prestataire_id
 where p.entreprise_id is not null on conflict do nothing;
end $do$;

-- Interdit de rendre un lien entreprise / role incoherent via Administration V0.5.
create or replace function public.ec_verifier_role_entreprise() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.role is distinct from old.role and exists(
  select 1 from public.entreprise_membres_ec m
  join public.entreprises_ec e on e.id=m.entreprise_id
  where m.profile_id=new.id and m.actif
    and ((e.type='startup' and new.role<>'incube') or
         (e.type='prestataire' and new.role<>'prestataire'))
 ) then raise exception 'Detachez ou transferez les rattachements entreprise avant changement de role'; end if;
 return new;
end $fn$;
drop trigger if exists ec06_role_entreprise on public.profiles;
create trigger ec06_role_entreprise before update of role on public.profiles
for each row execute function public.ec_verifier_role_entreprise();

-- Fonctions utilitaires : lecture hors RLS, avec controle du profil actif.
create or replace function public.ec_est_membre(p_entreprise uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists (
  select 1 from public.entreprise_membres_ec m
  join public.profiles p on p.id=m.profile_id
  join public.entreprises_ec e on e.id=m.entreprise_id
  where m.entreprise_id=p_entreprise and m.profile_id=auth.uid()
    and m.actif and p.statut='actif' and p.organisation_id=e.organisation_id
 );
$fn$;
create or replace function public.ec_peut_gerer_entreprise(p_entreprise uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select public.est_admin() or exists (
  select 1 from public.entreprise_membres_ec m
  join public.profiles p on p.id=m.profile_id
  join public.entreprises_ec e on e.id=m.entreprise_id
  where m.entreprise_id=p_entreprise and m.profile_id=auth.uid() and m.actif
    and m.role_membre in ('proprietaire','gestionnaire')
    and p.statut='actif' and p.organisation_id=e.organisation_id
 );
$fn$;

alter table public.entreprises_ec enable row level security;
alter table public.entreprise_membres_ec enable row level security;
alter table public.personnes_annuaire_ec enable row level security;
alter table public.entreprise_competences_ec enable row level security;
alter table public.personne_competences_ec enable row level security;

create policy ec06_entreprise_lecture on public.entreprises_ec for select to authenticated using (
 (statut='publiee' and organisation_id=public.mon_organisation())
 or public.ec_est_membre(id) or public.est_admin()
);
create policy ec06_membres_lecture on public.entreprise_membres_ec for select to authenticated using (
 profile_id=auth.uid() or public.ec_peut_gerer_entreprise(entreprise_id)
);
create policy ec06_personne_lecture on public.personnes_annuaire_ec for select to authenticated using (
 profile_id=auth.uid() or public.est_admin() or
 (visible and organisation_id=public.mon_organisation() and
 exists(select 1 from public.profiles p join public.entreprises_ec e on e.id=entreprise_id
 where p.id=profile_id and p.statut='actif' and e.statut='publiee'))
);
create policy ec06_ent_comp_lecture on public.entreprise_competences_ec for select to authenticated using (
 exists(select 1 from public.entreprises_ec e where e.id=entreprise_id)
);
create policy ec06_person_comp_lecture on public.personne_competences_ec for select to authenticated using (
 profile_id=auth.uid() or public.est_admin() or
 exists(select 1 from public.personnes_annuaire_ec a where a.profile_id=personne_competences_ec.profile_id)
);
create policy ec06_prestataire_membre_lecture on public.prestataires for select to authenticated using (
 entreprise_id is not null and public.ec_est_membre(entreprise_id)
);

-- Tables privees en ecriture : seules les RPC transactionnelles autorisent des modifications.
revoke all on public.entreprises_ec,public.entreprise_membres_ec,
 public.personnes_annuaire_ec,public.entreprise_competences_ec,public.personne_competences_ec
 from anon,authenticated;
grant select on public.entreprises_ec,public.entreprise_membres_ec,
 public.personnes_annuaire_ec,public.entreprise_competences_ec,public.personne_competences_ec
 to authenticated;
grant select(entreprise_id) on public.profiles to authenticated;
grant select(entreprise_id,presentation_html) on public.prestataires to authenticated;
grant select(description_html,entreprise_id) on public.projets to authenticated;
grant select(description_html,image_path) on public.offres to authenticated;

-- Medias publics UNIQUEMENT pour fiches opt-in : JPG/PNG/WEBP, 2 Mo.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('euraconnect-media','euraconnect-media',true,2097152,
 array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy ec06_media_public_read on storage.objects for select to public
 using(bucket_id='euraconnect-media');
create policy ec06_media_authorized_upload on storage.objects for insert to authenticated
 with check (
 bucket_id='euraconnect-media'
 and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
 and (
  (split_part(name,'/',1)='entreprises' and
     public.ec_peut_gerer_entreprise(split_part(name,'/',2)::uuid))
  or (split_part(name,'/',1)='personnes' and
      split_part(name,'/',2)=auth.uid()::text
      and public.mon_role() is not null)
  or (split_part(name,'/',1)='offres' and exists(
      select 1 from public.offres o join public.prestataires p on p.id=o.prestataire_id
      where o.id=split_part(name,'/',2)::uuid
        and public.ec_peut_gerer_entreprise(p.entreprise_id)))
 )
);
-- Chaque image possede un nom unique ; aucun UPDATE ou DELETE client autorise.

-- La nouvelle creation d'un prestataire cree obligatoirement l'entreprise et son proprietaire.
create or replace function public.creer_prestataire(p_nom text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;v_ent uuid;v_org uuid;
begin
 if public.mon_role()<>'prestataire' then raise exception 'Compte prestataire requis'; end if;
 if char_length(trim(coalesce(p_nom,'')))<3 or char_length(trim(coalesce(p_description,'')))<100
 then raise exception 'Nom ou description insuffisants'; end if;
 if exists(select 1 from public.prestataires where proprietaire_id=auth.uid()) then
   raise exception 'Une entreprise prestataire existe deja pour ce compte';
 end if;
 v_org:=public.mon_organisation();
 insert into public.entreprises_ec(organisation_id,nom,type,statut,cree_par)
 values(v_org,trim(p_nom),'prestataire','brouillon',auth.uid()) returning id into v_ent;
 insert into public.entreprise_membres_ec(entreprise_id,profile_id,role_membre)
 values(v_ent,auth.uid(),'proprietaire');
 insert into public.prestataires(organisation_id,proprietaire_id,nom_public,description,entreprise_id)
 values(v_org,auth.uid(),trim(p_nom),trim(p_description),v_ent) returning id into v_id;
 update public.profiles set entreprise_id=coalesce(entreprise_id,v_ent) where id=auth.uid();
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'creer_prestataire','prestataires',v_id,jsonb_build_object('entreprise_id',v_ent));
 return v_id;
end $fn$;

-- Prestataire partage : les collaborateurs de gestion peuvent publier des offres.
-- Les candidatures/messageries historiques restent attribuees au compte proprietaire.
create or replace function public.mon_prestataire() returns uuid
language sql stable security definer set search_path='' as $fn$
 select p.id from public.prestataires p
 where p.proprietaire_id=auth.uid()
    or (p.entreprise_id is not null and exists(
      select 1 from public.entreprise_membres_ec m join public.profiles pr on pr.id=m.profile_id
      where m.entreprise_id=p.entreprise_id and m.profile_id=auth.uid() and m.actif
      and m.role_membre in ('proprietaire','gestionnaire') and pr.statut='actif'
      and pr.organisation_id=p.organisation_id))
 order by case when p.proprietaire_id=auth.uid() then 0 else 1 end,
          case when p.entreprise_id=(select pr.entreprise_id from public.profiles pr where pr.id=auth.uid()) then 0 else 1 end
 limit 1;
$fn$;
create or replace function public.publier_offre(p_titre text,p_description text,p_format text,p_tarif_centimes integer)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_provider public.prestataires%rowtype;v_quota integer;v_count integer;v_id uuid;
begin
 select * into v_provider from public.prestataires
 where id=public.mon_prestataire() for update;
 if not found or v_provider.statut<>'valide' or not public.ec_peut_gerer_entreprise(v_provider.entreprise_id)
 then raise exception 'Prestataire non valide ou droits insuffisants'; end if;
 select quota_offres into v_quota from public.plans where code=v_provider.plan_code;
 select count(*) into v_count from public.offres where prestataire_id=v_provider.id and statut='publiee';
 if v_count>=v_quota then raise exception 'Quota d offres atteint'; end if;
 if char_length(trim(coalesce(p_titre,'')))<8 or char_length(trim(coalesce(p_description,'')))<50
 or p_format not in('distance','site','mixte') or p_tarif_centimes<0
 then raise exception 'Champs offre invalides'; end if;
 insert into public.offres(organisation_id,prestataire_id,titre,description,format,tarif_centimes)
 values(v_provider.organisation_id,v_provider.id,trim(p_titre),trim(p_description),p_format,p_tarif_centimes)
 returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'publier_offre','offres',v_id);
 return v_id;
end $fn$;
create or replace function public.publier_besoin(p_titre text,p_description text,p_budget_centimes integer)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;v_ent uuid;
begin
 if public.mon_role()<>'incube' then raise exception 'Acces reserve aux incubes'; end if;
 if char_length(trim(coalesce(p_titre,'')))<8 or char_length(trim(coalesce(p_description,'')))<50
 or p_budget_centimes<0 then raise exception 'Besoin invalide'; end if;
 select entreprise_id into v_ent from public.profiles where id=auth.uid();
 insert into public.projets(organisation_id,incube_id,entreprise_id,titre,description,budget_centimes)
 values(public.mon_organisation(),auth.uid(),v_ent,trim(p_titre),trim(p_description),p_budget_centimes)
 returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'publier_besoin','projets',v_id);
 return v_id;
end $fn$;

create or replace function public.ec_publier_offre_riche(
 p_titre text,p_description text,p_format text,p_tarif_centimes integer,p_html text default '')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;
begin
 if char_length(coalesce(p_html,''))>16000 then raise exception 'Description enrichie trop longue'; end if;
 v_id:=public.publier_offre(p_titre,p_description,p_format,p_tarif_centimes);
 update public.offres set description_html=coalesce(p_html,'') where id=v_id;
 return v_id;
end $fn$;
create or replace function public.ec_publier_besoin_riche(
 p_titre text,p_description text,p_budget_centimes integer,p_html text default '')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;
begin
 if char_length(coalesce(p_html,''))>16000 then raise exception 'Description enrichie trop longue'; end if;
 v_id:=public.publier_besoin(p_titre,p_description,p_budget_centimes);
 update public.projets set description_html=coalesce(p_html,'') where id=v_id;
 return v_id;
end $fn$;

create or replace function public.ec_creer_entreprise(
 p_nom text,p_type text,p_presentation_html text default '')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_org uuid;v_ent uuid;
begin
 v_org:=public.mon_organisation();
 if v_org is null then raise exception 'Session inactive'; end if;
 if p_type not in ('startup','autre') or (not public.est_admin() and (public.mon_role()<>'incube' or p_type<>'startup'))
 then raise exception 'Type d entreprise non autorise'; end if;
 if char_length(trim(coalesce(p_nom,''))) not between 2 and 160 or char_length(coalesce(p_presentation_html,''))>16000
 then raise exception 'Donnees entreprise invalides'; end if;
 if not public.est_admin() and exists(
   select 1 from public.entreprise_membres_ec m join public.entreprises_ec e on e.id=m.entreprise_id
   where m.profile_id=auth.uid() and m.actif and e.type='startup')
 then raise exception 'Vous etes deja rattache a une startup'; end if;
 insert into public.entreprises_ec(organisation_id,nom,type,presentation_html,statut,cree_par)
 values(v_org,trim(p_nom),p_type,coalesce(p_presentation_html,''),'brouillon',auth.uid()) returning id into v_ent;
 insert into public.entreprise_membres_ec(entreprise_id,profile_id,role_membre)
 values(v_ent,auth.uid(),'proprietaire');
 update public.profiles set entreprise_id=coalesce(entreprise_id,v_ent) where id=auth.uid();
 update public.projets set entreprise_id=v_ent where incube_id=auth.uid() and entreprise_id is null;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'creer_entreprise','entreprises_ec',v_ent);
 return v_ent;
end $fn$;

create or replace function public.ec_modifier_entreprise(
 p_entreprise uuid,p_nom text,p_presentation_html text,p_site_web text,
 p_logo_path text,p_publier boolean)
returns void language plpgsql security definer set search_path='' as $fn$
declare v_ent public.entreprises_ec%rowtype;v_prest text;
begin
 select * into v_ent from public.entreprises_ec where id=p_entreprise for update;
 if not found or not public.ec_peut_gerer_entreprise(p_entreprise)
 then raise exception 'Entreprise inaccessible'; end if;
 if char_length(trim(coalesce(p_nom,''))) not between 2 and 160
    or char_length(coalesce(p_presentation_html,''))>16000
    or char_length(coalesce(p_site_web,''))>300 then raise exception 'Valeurs invalides'; end if;
 if p_site_web is not null and trim(p_site_web)<>'' and trim(p_site_web) !~* '^https?://[^ ]+$'
 then raise exception 'URL de site invalide'; end if;
 if p_logo_path is not null and p_logo_path not like ('entreprises/'||p_entreprise::text||'/%')
 then raise exception 'Image non autorisee'; end if;
 if v_ent.type='prestataire' and coalesce(p_publier,false) then
  select statut into v_prest from public.prestataires where entreprise_id=v_ent.id;
  if v_prest is distinct from 'valide' then raise exception 'Validation administrative necessaire'; end if;
 end if;
 if v_ent.type='prestataire' and trim(p_nom) is distinct from v_ent.nom then
  update public.prestataires set nom_public=trim(p_nom),updated_at=now() where entreprise_id=p_entreprise;
 end if;
 update public.entreprises_ec set nom=trim(p_nom),presentation_html=coalesce(p_presentation_html,''),
 site_web=nullif(trim(coalesce(p_site_web,'')),''),logo_path=p_logo_path,
 statut=case when p_publier then 'publiee' else 'brouillon' end,updated_at=now()
 where id=p_entreprise;
 -- Les changements de nom necessitent une nouvelle validation du prestataire dans la V2 finale.
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'modifier_entreprise','entreprises_ec',p_entreprise,
        jsonb_build_object('publiee',p_publier));
end $fn$;

-- Une personne est un individu distinct de son entreprise. Fiche opt-in seulement.
create or replace function public.ec_sauver_personne(
 p_nom_public text,p_titre text,p_bio_html text,p_visible boolean,p_avatar_path text)
returns void language plpgsql security definer set search_path='' as $fn$
declare v_ent uuid;v_org uuid;
begin
 v_org:=public.mon_organisation();
 select entreprise_id into v_ent from public.profiles where id=auth.uid() and statut='actif';
 if v_org is null then raise exception 'Compte inactif'; end if;
 if position('@' in coalesce(p_nom_public,''))>0 then raise exception 'Le nom public ne doit pas contenir un email'; end if;
 if char_length(trim(coalesce(p_nom_public,''))) not between 2 and 120
 or char_length(coalesce(p_titre,''))>160 or char_length(coalesce(p_bio_html,''))>16000
 then raise exception 'Fiche personnelle invalide';end if;
 if p_visible and (v_ent is null or not public.ec_est_membre(v_ent))
 then raise exception 'Rattachement entreprise necessaire pour la publication'; end if;
 if p_avatar_path is not null and p_avatar_path not like ('personnes/'||auth.uid()::text||'/%')
 then raise exception 'Photo non autorisee'; end if;
 insert into public.personnes_annuaire_ec(profile_id,organisation_id,entreprise_id,nom_public,titre,bio_html,avatar_path,visible)
 values(auth.uid(),v_org,v_ent,trim(p_nom_public),trim(coalesce(p_titre,'')),coalesce(p_bio_html,''),p_avatar_path,p_visible)
 on conflict(profile_id) do update set nom_public=excluded.nom_public,titre=excluded.titre,
 bio_html=excluded.bio_html,avatar_path=excluded.avatar_path,entreprise_id=excluded.entreprise_id,
 visible=excluded.visible,updated_at=now();
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'sauver_personne','personnes_annuaire_ec',auth.uid(),jsonb_build_object('visible',p_visible));
end $fn$;

-- Referentiel de competences partage, sans tag libre non modere.
create or replace function public.ec_definir_competences_v06(
 p_type text,p_id uuid,p_competences uuid[])
returns void language plpgsql security definer set search_path='' as $fn$
declare v_cnt integer;v_provider uuid;
begin
 v_cnt:=coalesce(cardinality(p_competences),0);
 if v_cnt>20 then raise exception 'Maximum 20 competences'; end if;
 if exists(select 1 from unnest(coalesce(p_competences,array[]::uuid[])) x
    where not exists(select 1 from public.competences_ec c where c.id=x and c.actif))
 then raise exception 'Competence inconnue'; end if;
 if p_type='entreprise' then
  if not public.ec_peut_gerer_entreprise(p_id) then raise exception 'Acces entreprise refuse'; end if;
  perform 1 from public.entreprises_ec where id=p_id for update;
  delete from public.entreprise_competences_ec where entreprise_id=p_id;
  insert into public.entreprise_competences_ec(entreprise_id,competence_id)
  select p_id,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x) t;
  -- Compatibilite matching V0.4.
  select id into v_provider from public.prestataires where entreprise_id=p_id;
  if v_provider is not null then
   delete from public.prestataire_competences_ec where prestataire_id=v_provider;
   insert into public.prestataire_competences_ec(prestataire_id,competence_id)
   select v_provider,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x) t;
  end if;
 elsif p_type='personne' and p_id=auth.uid() and public.mon_role() is not null then
  delete from public.personne_competences_ec where profile_id=p_id;
  insert into public.personne_competences_ec(profile_id,competence_id)
  select p_id,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x) t;
 else raise exception 'Cible inaccessible';end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'competences_v06',p_type,p_id);
end $fn$;

-- Operations atomiques : profil + competences, aucun enregistrement partiel.
create or replace function public.ec_sauver_fiche_entreprise(
 p_entreprise uuid,p_nom text,p_presentation_html text,p_site_web text,
 p_logo_path text,p_publier boolean,p_competences uuid[])
returns void language plpgsql security definer set search_path='' as $fn$
begin
 perform public.ec_modifier_entreprise(p_entreprise,p_nom,p_presentation_html,p_site_web,p_logo_path,p_publier);
 perform public.ec_definir_competences_v06('entreprise',p_entreprise,p_competences);
end $fn$;
create or replace function public.ec_sauver_fiche_personne(
 p_nom_public text,p_titre text,p_bio_html text,p_visible boolean,
 p_avatar_path text,p_competences uuid[])
returns void language plpgsql security definer set search_path='' as $fn$
begin
 perform public.ec_sauver_personne(p_nom_public,p_titre,p_bio_html,p_visible,p_avatar_path);
 perform public.ec_definir_competences_v06('personne',auth.uid(),p_competences);
end $fn$;

create or replace function public.ec_mes_entreprises()
returns table(id uuid,nom text,type text,statut text,presentation_html text,
 site_web text,logo_path text,role_membre text)
language sql stable security definer set search_path='' as $fn$
 select e.id,e.nom,e.type,e.statut,e.presentation_html,e.site_web,e.logo_path,m.role_membre
 from public.entreprise_membres_ec m join public.entreprises_ec e on e.id=m.entreprise_id
 join public.profiles p on p.id=m.profile_id
 where m.profile_id=auth.uid() and m.actif and p.statut='actif'
   and e.organisation_id=public.mon_organisation()
 order by e.nom
$fn$;

create or replace function public.ec_lister_membres(p_entreprise uuid)
returns table(profile_id uuid,nom_public text,role_membre text,actif boolean)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if not public.ec_est_membre(p_entreprise) and not public.est_admin()
 then raise exception 'Entreprise inaccessible'; end if;
 return query select m.profile_id,coalesce(nullif(a.nom_public,''),nullif(p.nom,''),'Utilisateur')::text,
 m.role_membre,m.actif from public.entreprise_membres_ec m
 join public.profiles p on p.id=m.profile_id
 left join public.personnes_annuaire_ec a on a.profile_id=m.profile_id
 where m.entreprise_id=p_entreprise order by m.created_at;
end $fn$;

-- Ajout d'un compte Auth EXISTANT, par un administrateur seulement.
-- Aucun email n'est expose au catalogue. L'invitation/consentement restent un lot separe.
create or replace function public.ec_admin_rattacher_membre(
 p_entreprise uuid,p_email text,p_role_membre text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;v_org uuid;v_type text;v_role text;
begin
 if not public.est_admin() then raise exception 'Administration requise'; end if;
 if p_role_membre not in ('proprietaire','gestionnaire','collaborateur')
 then raise exception 'Role membre invalide'; end if;
 select organisation_id,type into v_org,v_type from public.entreprises_ec where id=p_entreprise;
 if v_org is null then raise exception 'Entreprise inconnue'; end if;
 select u.id,p.role into v_id,v_role from auth.users u
 join public.profiles p on p.id=u.id
 where lower(u.email)=lower(trim(p_email)) and p.organisation_id=v_org and p.statut='actif';
 if v_id is null then raise exception 'Compte actif introuvable dans cette structure'; end if;
 if (v_type='startup' and v_role<>'incube') or
    (v_type='prestataire' and v_role<>'prestataire')
 then raise exception 'Le role du compte est incompatible avec le type entreprise'; end if;
 if p_role_membre='proprietaire' and v_type='prestataire' and not exists(
   select 1 from public.prestataires where entreprise_id=p_entreprise and proprietaire_id=v_id)
 then raise exception 'Le transfert du proprietaire prestataire necessite une procedure dediee';end if;
 insert into public.entreprise_membres_ec(entreprise_id,profile_id,role_membre,actif)
 values(p_entreprise,v_id,p_role_membre,true)
 on conflict(entreprise_id,profile_id) do update
  set role_membre=excluded.role_membre,actif=true,updated_at=now();
 update public.profiles set entreprise_id=coalesce(entreprise_id,p_entreprise) where id=v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'rattacher_membre','entreprises_ec',p_entreprise,
 jsonb_build_object('profile_id',v_id,'role_membre',p_role_membre));
 return v_id;
end $fn$;

create or replace function public.ec_admin_lister_entreprises(p_recherche text default '')
returns table(id uuid,nom text,type text,statut text,nb_membres bigint)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if not public.est_admin() then raise exception 'Administration requise'; end if;
 return query select e.id,e.nom,e.type,e.statut,count(m.profile_id)::bigint
 from public.entreprises_ec e left join public.entreprise_membres_ec m
  on m.entreprise_id=e.id and m.actif
 where (coalesce(trim(p_recherche),'')='' or e.nom ilike '%'||trim(p_recherche)||'%')
 group by e.id,e.nom,e.type,e.statut order by e.nom limit 100;
end $fn$;

-- Recherche unifiee entreprises + personnes, uniquement les fiches autorisees.
-- Aucun email, numero de telephone ou contact prive dans les colonnes retournees.
create or replace function public.ec_annuaire_rechercher(
 p_texte text default '', p_type text default 'tous',
 p_competence uuid default null,p_limite integer default 30,p_offset integer default 0)
returns table(nature text,id uuid,nom text,sous_titre text,description_html text,
 image_path text,entreprise_id uuid,competences text[],nb_total bigint)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if public.mon_role() is null then raise exception 'Connexion requise'; end if;
 if p_type not in ('tous','entreprise','personne','startup','prestataire','autre')
 then raise exception 'Filtre invalide'; end if;
 return query
 with lignes as (
  select 'entreprise'::text nature,e.id,e.nom,
   case e.type when 'startup' then 'Startup' when 'prestataire' then 'Prestataire' else 'Entreprise' end::text sous_titre,
   e.presentation_html description_html,e.logo_path image_path,e.id entreprise_id,e.type type_entreprise,
   coalesce((select array_agg(c.libelle order by c.libelle)
     from public.entreprise_competences_ec ec join public.competences_ec c on c.id=ec.competence_id
     where ec.entreprise_id=e.id),'{}'::text[]) competences,
   (p_competence is null or exists(select 1 from public.entreprise_competences_ec ec
        where ec.entreprise_id=e.id and ec.competence_id=p_competence)) skill_ok
  from public.entreprises_ec e
  where e.organisation_id=public.mon_organisation() and e.statut='publiee'
  union all
  select 'personne'::text,a.profile_id,a.nom_public,
     coalesce(nullif(a.titre,''),e.nom)::text,a.bio_html,a.avatar_path,a.entreprise_id,
     e.type,
     coalesce((select array_agg(c.libelle order by c.libelle)
       from public.personne_competences_ec pc join public.competences_ec c on c.id=pc.competence_id
       where pc.profile_id=a.profile_id),'{}'::text[]),
     (p_competence is null or exists(select 1 from public.personne_competences_ec pc
       where pc.profile_id=a.profile_id and pc.competence_id=p_competence))
  from public.personnes_annuaire_ec a
  join public.profiles pr on pr.id=a.profile_id and pr.statut='actif'
  join public.entreprises_ec e on e.id=a.entreprise_id and e.statut='publiee'
  join public.entreprise_membres_ec m on m.profile_id=a.profile_id
    and m.entreprise_id=e.id and m.actif
  where a.visible and a.organisation_id=public.mon_organisation()
 ), filtres as (
 select l.* from lignes l where l.skill_ok and
   (p_type='tous' or l.nature=p_type or
      (l.nature='entreprise' and l.type_entreprise=p_type)) and
   (coalesce(trim(p_texte),'')='' or
     l.nom ilike '%'||trim(p_texte)||'%' or
     l.sous_titre ilike '%'||trim(p_texte)||'%' or
     regexp_replace(l.description_html,'<[^>]+>',' ','g') ilike '%'||trim(p_texte)||'%' or
     exists(select 1 from unnest(l.competences) c where c ilike '%'||trim(p_texte)||'%'))
 )
 select f.nature,f.id,f.nom,f.sous_titre,f.description_html,f.image_path,
   f.entreprise_id,f.competences,count(*) over() from filtres f
 order by f.nom limit least(greatest(coalesce(p_limite,30),1),100)
 offset greatest(coalesce(p_offset,0),0);
end $fn$;

create or replace function public.ec_dashboard_v06()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare v_org uuid;v_role text;v_provider uuid;
begin
 v_org:=public.mon_organisation();v_role:=public.mon_role();v_provider:=public.mon_prestataire();
 if v_org is null then raise exception 'Connexion requise'; end if;
 return jsonb_build_object(
  'role',v_role,
  'entreprises',(select count(*) from public.entreprises_ec
    where organisation_id=v_org and (statut='publiee' or public.est_admin())),
  'personnes',(select count(*) from public.personnes_annuaire_ec a
    join public.profiles p on p.id=a.profile_id
    where a.organisation_id=v_org and p.statut='actif' and (a.visible or public.est_admin())),
  'offres',(select count(*) from public.offres o join public.prestataires p on p.id=o.prestataire_id
    where o.organisation_id=v_org and o.statut='publiee' and p.statut='valide'),
  'besoins',(select count(*) from public.projets where organisation_id=v_org and statut='publie'),
  'mes_offres',(select count(*) from public.offres where prestataire_id=v_provider and statut='publiee'),
  'mes_besoins',(select count(*) from public.projets where incube_id=auth.uid() and statut='publie'),
  'candidatures',(select count(*) from public.candidatures c
     join public.projets j on j.id=c.projet_id where j.organisation_id=v_org and (
       public.est_admin() or j.incube_id=auth.uid() or c.prestataire_id=v_provider)),
  'relations',(select count(*) from public.mises_en_relation r
     join public.candidatures c on c.id=r.candidature_id
     join public.projets j on j.id=c.projet_id
     where r.organisation_id=v_org and r.statut='acceptee' and (
       public.est_admin() or j.incube_id=auth.uid() or c.prestataire_id=v_provider)),
  'prestataires_en_attente',case when public.est_admin()
      then (select count(*) from public.prestataires where statut='en_validation' and organisation_id=v_org)
      else 0 end
 );
end $fn$;

create or replace function public.ec_image_offre(p_offre uuid,p_image_path text)
returns void language plpgsql security definer set search_path='' as $fn$
declare v_ent uuid;
begin
 select p.entreprise_id into v_ent from public.offres o
 join public.prestataires p on p.id=o.prestataire_id where o.id=p_offre;
 if v_ent is null or not public.ec_peut_gerer_entreprise(v_ent)
 then raise exception 'Offre inaccessible'; end if;
 if p_image_path is not null and p_image_path not like ('offres/'||p_offre::text||'/%')
 then raise exception 'Chemin image invalide'; end if;
 update public.offres set image_path=p_image_path where id=p_offre;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'image_offre','offres',p_offre);
end $fn$;
revoke all on function public.ec_sauver_fiche_entreprise(uuid,text,text,text,text,boolean,uuid[]),
 public.ec_sauver_fiche_personne(text,text,text,boolean,text,uuid[]) from public,anon;
grant execute on function public.ec_sauver_fiche_entreprise(uuid,text,text,text,text,boolean,uuid[]),
 public.ec_sauver_fiche_personne(text,text,text,boolean,text,uuid[]) to authenticated;
revoke all on function public.ec_image_offre(uuid,text) from public,anon;
grant execute on function public.ec_image_offre(uuid,text) to authenticated;

-- Un ajout de competence a une entreprise agit sur le matching d'offres V0.4.
-- Aucune donnees de contact privee n'est exposee a l'annuaire.
revoke all on function public.ec_est_membre(uuid),public.ec_peut_gerer_entreprise(uuid),
 public.ec_publier_offre_riche(text,text,text,integer,text),public.ec_publier_besoin_riche(text,text,integer,text),
 public.ec_creer_entreprise(text,text,text),public.ec_modifier_entreprise(uuid,text,text,text,text,boolean),
 public.ec_sauver_personne(text,text,text,boolean,text),public.ec_definir_competences_v06(text,uuid,uuid[]),
 public.ec_mes_entreprises(),public.ec_lister_membres(uuid),public.ec_admin_rattacher_membre(uuid,text,text),
 public.ec_admin_lister_entreprises(text),public.ec_annuaire_rechercher(text,text,uuid,integer,integer),
 public.ec_dashboard_v06() from public,anon;
grant execute on function public.ec_est_membre(uuid),public.ec_peut_gerer_entreprise(uuid),
 public.ec_publier_offre_riche(text,text,text,integer,text),public.ec_publier_besoin_riche(text,text,integer,text),
 public.ec_creer_entreprise(text,text,text),public.ec_modifier_entreprise(uuid,text,text,text,text,boolean),
 public.ec_sauver_personne(text,text,text,boolean,text),public.ec_definir_competences_v06(text,uuid,uuid[]),
 public.ec_mes_entreprises(),public.ec_lister_membres(uuid),public.ec_admin_rattacher_membre(uuid,text,text),
 public.ec_admin_lister_entreprises(text),public.ec_annuaire_rechercher(text,text,uuid,integer,integer),
 public.ec_dashboard_v06() to authenticated;
