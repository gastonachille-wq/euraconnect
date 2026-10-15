-- EURACONNECT V0.8.5 - favoris fiabilises et taxonomie collaborative
-- A executer apres 202610140008_favoris.sql; additive, ne supprime aucune donnee.
create extension if not exists pg_trgm;
-- La colonne obligatoire etait absente des INSERT du client V0.8.4.
alter table public.favoris_ec alter column utilisateur_id set default auth.uid();
create index if not exists favoris_ec_personne on public.favoris_ec(utilisateur_id,created_at desc);
-- Conserver les policies deja posees; l'insert explicite fonctionne aussi.

create table if not exists public.tags_ec (
 id uuid primary key default gen_random_uuid(),
 libelle text not null check (char_length(trim(libelle)) between 2 and 60),
 cle text not null unique check(char_length(cle) between 2 and 120),
 cree_par uuid references public.profiles(id),
 created_at timestamptz not null default now()
);
create index if not exists tags_ec_libelle_trgm on public.tags_ec using gin(libelle gin_trgm_ops);
create table if not exists public.tags_liens_ec (
 tag_id uuid not null references public.tags_ec(id) on delete restrict,
 cible_type text not null check(cible_type in ('entreprise','personne','offre','besoin')),
 cible_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(tag_id,cible_type,cible_id)
);
create index if not exists tags_liens_ec_cible on public.tags_liens_ec(cible_type,cible_id);
alter table public.tags_ec enable row level security;
alter table public.tags_liens_ec enable row level security;
drop policy if exists tags_ec_lecture on public.tags_ec;
create policy tags_ec_lecture on public.tags_ec for select to authenticated using(public.mon_organisation() is not null);
drop policy if exists tags_liens_ec_lecture on public.tags_liens_ec;
-- Lecture des associations seulement si l'entite est lisible. Jamais exposer une demande privee.
create policy tags_liens_ec_lecture on public.tags_liens_ec for select to authenticated using (
 (cible_type='entreprise' and exists(select 1 from public.entreprises_ec e where e.id=cible_id))
 or (cible_type='personne' and exists(select 1 from public.personnes_annuaire_ec p where p.profile_id=cible_id))
 or (cible_type='offre' and exists(select 1 from public.offres o where o.id=cible_id))
 or (cible_type='besoin' and exists(select 1 from public.projets j where j.id=cible_id))
);
grant select on public.tags_ec,public.tags_liens_ec to authenticated;
-- Les ecritures passent uniquement par des RPC verifiant les droits; aucune ecriture directe.
revoke insert,update,delete on public.tags_ec,public.tags_liens_ec from anon,authenticated;

create or replace function public.ec085_normaliser_tag(p_text text)
returns text language sql immutable set search_path='' as $fn$
 select trim(both '-' from regexp_replace(translate(lower(trim(coalesce(p_text,''))),
 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿæœ',
 'aaaaaaceeeeiiiinooooouuuuyyao'), '[^a-z0-9]+','-','g'));
$fn$;

create or replace function public.ec085_creer_tag(p_libelle text)
returns public.tags_ec language plpgsql security definer set search_path='' as $fn$
declare v_cle text; v_nom text; v_tag public.tags_ec;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.statut='actif') then
  raise exception 'Compte actif requis'; end if;
 v_nom:=trim(regexp_replace(coalesce(p_libelle,''),'\s+',' ','g'));
 v_cle:=public.ec085_normaliser_tag(v_nom);
 if char_length(v_nom) not between 2 and 60 or char_length(v_cle) not between 2 and 120 then
  raise exception 'Tag invalide (2 a 60 caracteres)';end if;
 -- Unicite atomique sous concurrence: deux libelles avec la meme cle retournent le meme ID.
 insert into public.tags_ec(libelle,cle,cree_par) values(v_nom,v_cle,auth.uid())
 on conflict(cle) do nothing returning * into v_tag;
 if v_tag.id is null then select * into v_tag from public.tags_ec where cle=v_cle;end if;
 return v_tag;
end;
$fn$;

create or replace function public.ec085_peut_modifier_tags(p_type text,p_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and statut='actif') then return false;end if;
 if p_type='entreprise' then return public.ec_peut_gerer_entreprise(p_id);
 elsif p_type='personne' then return p_id=auth.uid() or public.est_admin();
 elsif p_type='offre' then return exists (
  select 1 from public.offres o join public.prestataires p on p.id=o.prestataire_id
  where o.id=p_id and ((p.entreprise_id is not null and public.ec_peut_gerer_entreprise(p.entreprise_id))
   or (p.proprietaire_id=auth.uid() and p.entreprise_id is null))) or public.est_admin();
 elsif p_type='besoin' then return exists(
  select 1 from public.projets j where j.id=p_id and
  ((j.entreprise_id is not null and public.ec_peut_gerer_entreprise(j.entreprise_id))
   or (j.entreprise_id is null and j.incube_id=auth.uid()))) or public.est_admin();
 end if;
 return false;
end;
$fn$;

create or replace function public.ec085_definir_tags(p_type text,p_id uuid,p_tags uuid[])
returns integer language plpgsql security definer set search_path='' as $fn$
declare v_count integer;
begin
 if not public.ec085_peut_modifier_tags(p_type,p_id) then raise exception 'Acces refuse pour cette fiche';end if;
 if coalesce(array_length(p_tags,1),0)>20 then raise exception '20 tags au maximum';end if;
 if exists(select 1 from unnest(coalesce(p_tags,'{}'::uuid[])) x where not exists(select 1 from public.tags_ec t where t.id=x)) then
  raise exception 'Tag inconnu';end if;
 delete from public.tags_liens_ec where cible_type=p_type and cible_id=p_id;
 insert into public.tags_liens_ec(tag_id,cible_type,cible_id)
 select distinct x,p_type,p_id from unnest(coalesce(p_tags,'{}'::uuid[])) x where x is not null;
 select count(*) into v_count from public.tags_liens_ec where cible_type=p_type and cible_id=p_id;
 return v_count;
end;
$fn$;
revoke all on function public.ec085_creer_tag(text),public.ec085_definir_tags(text,uuid,uuid[]),public.ec085_peut_modifier_tags(text,uuid) from public;
grant execute on function public.ec085_creer_tag(text),public.ec085_definir_tags(text,uuid,uuid[]),public.ec085_peut_modifier_tags(text,uuid) to authenticated;
-- normalisation sans privilege sur les donnees
revoke all on function public.ec085_normaliser_tag(text) from public;
grant execute on function public.ec085_normaliser_tag(text) to authenticated;
