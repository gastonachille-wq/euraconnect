-- EURACONNECT V0.8.5 - Favoris fiables et vocabulaire intelligent partage
-- Executer APRES 202610140008_favoris.sql. Migration additive, idempotente.
-- Ne pas rejouer toutes les migrations. Installer le frontend V0.8.5 avec cette migration.
create extension if not exists pg_trgm;

-- 1. CORRECTIF FAVORIS : la V0.8.4 insere sans utilisateur_id, colonne precedemment sans DEFAULT.
alter table public.favoris_ec alter column utilisateur_id set default auth.uid();
create index if not exists favoris_ec_utilisateur_date on public.favoris_ec(utilisateur_id,created_at desc);

create or replace function public.ec09_basculer_favori(p_type text,p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_uid uuid:=auth.uid();v_ok boolean:=false;v_suppression integer;
begin
 if v_uid is null or public.mon_role() is null then raise exception 'Connexion active requise';end if;
 if p_type not in ('entreprise','personne') or p_id is null then raise exception 'Favori invalide';end if;
 -- Verrou par utilisateur + cible: double clic et onglets concurrents sans etat incoherent.
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_type||':'||p_id::text,0));
 delete from public.favoris_ec where utilisateur_id=v_uid and cible_type=p_type and cible_id=p_id;
 get diagnostics v_suppression=row_count;
 if v_suppression>0 then return false;end if;
 if p_type='entreprise' then
  select exists(select 1 from public.entreprises_ec e
   where e.id=p_id and e.organisation_id=public.mon_organisation()
     and (e.statut='publiee' or public.ec_est_membre(e.id) or public.est_admin())) into v_ok;
 else
  select exists(select 1 from public.personnes_annuaire_ec a
   join public.profiles p on p.id=a.profile_id and p.statut='actif'
   left join public.entreprises_ec e on e.id=a.entreprise_id
   where a.profile_id=p_id and a.organisation_id=public.mon_organisation()
     and (a.profile_id=v_uid or public.est_admin() or
       (a.visible and e.statut='publiee' and exists(
          select 1 from public.entreprise_membres_ec m
          where m.entreprise_id=e.id and m.profile_id=a.profile_id and m.actif)))) into v_ok;
 end if;
 if not v_ok then raise exception 'Fiche indisponible : impossible de l ajouter aux favoris';end if;
 insert into public.favoris_ec(utilisateur_id,cible_type,cible_id) values(v_uid,p_type,p_id);
 return true;
end $fn$;
revoke all on function public.ec09_basculer_favori(text,uuid) from public,anon;
grant execute on function public.ec09_basculer_favori(text,uuid) to authenticated;

-- 2. UN SEUL CATALOGUE : public.competences_ec sert aussi de referentiel de tags.
-- Conserver les liens existants: aucune fusion destructive des anciennes competences.
alter table public.competences_ec add column if not exists cree_par uuid references public.profiles(id) on delete set null;
create index if not exists ec09_competences_cree_par on public.competences_ec(cree_par,created_at desc);
create or replace function public.ec09_normaliser_terme(p_texte text)
returns text language sql immutable set search_path='' as $fn$
 select regexp_replace(
   translate(lower(btrim(coalesce(p_texte,''))),
   'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
   'aaaaaaceeeeiiiinooooouuuuyy'),
   '[^a-z0-9+#]+','','g');
$fn$;

-- Table de cle canonique + alias pour des doublons preexistants ou synonymes.
create table if not exists public.ec09_cles_termes (
 cle text primary key,
 competence_id uuid not null references public.competences_ec(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index if not exists ec09_cles_termes_competence on public.ec09_cles_termes(competence_id);
insert into public.ec09_cles_termes(cle,competence_id)
select distinct on (public.ec09_normaliser_terme(c.libelle))
 public.ec09_normaliser_terme(c.libelle),c.id
from public.competences_ec c
where c.actif and public.ec09_normaliser_terme(c.libelle)<>''
order by public.ec09_normaliser_terme(c.libelle),c.created_at,c.id
on conflict(cle) do nothing;
insert into public.ec09_cles_termes(cle,competence_id)
select distinct on (public.ec09_normaliser_terme(s.synonyme))
 public.ec09_normaliser_terme(s.synonyme),c.id
from public.competences_ec c cross join lateral unnest(c.synonymes) s(synonyme)
where c.actif and public.ec09_normaliser_terme(s.synonyme)<>''
order by public.ec09_normaliser_terme(s.synonyme),c.created_at,c.id
on conflict(cle) do nothing;

alter table public.ec09_cles_termes enable row level security;
revoke all on public.ec09_cles_termes from anon,authenticated;

-- Score de similarite sans dependance au schema dans lequel pg_trgm est installe.
-- Dice sur les trigrammes normalises : tolerant aux accents, fautes de saisie legeres.
create or replace function public.ec09_similarite_termes(p_a text,p_b text)
returns double precision language sql immutable set search_path='' as $fn$
 with aa as (select distinct substr('  '||coalesce(p_a,'')||' ',i,3) t
    from generate_series(1,greatest(length('  '||coalesce(p_a,'')||' ')-2,0)) g(i)),
      bb as (select distinct substr('  '||coalesce(p_b,'')||' ',i,3) t
    from generate_series(1,greatest(length('  '||coalesce(p_b,'')||' ')-2,0)) g(i))
 select case when p_a=p_b then 1.0::double precision
 else coalesce(2.0*(select count(*) from aa join bb using(t))::double precision /
  nullif(((select count(*) from aa)+(select count(*) from bb)),0),0) end;
$fn$;
revoke all on function public.ec09_similarite_termes(text,text) from public,anon;
grant execute on function public.ec09_similarite_termes(text,text) to authenticated;

-- Score de suggestions: accentuation neutralisee, debuts de mots et similarite trigrams.
create or replace function public.ec09_suggerer_termes(p_recherche text,p_limite integer default 12)
returns table(id uuid,libelle text,score numeric)
language sql stable security definer set search_path='' as $fn$
 with saisie as (select public.ec09_normaliser_terme(p_recherche) cle),
 candidats as (
  select c.id,c.libelle,
    greatest(
      case when public.ec09_normaliser_terme(c.libelle)=(select cle from saisie) then 1.0
           when public.ec09_normaliser_terme(c.libelle) like (select cle from saisie)||'%' then 0.88
           else 0.0 end,
      public.ec09_similarite_termes(public.ec09_normaliser_terme(c.libelle),(select cle from saisie)),
      coalesce((select max(case when a.cle=(select cle from saisie) then 0.99
        else public.ec09_similarite_termes(a.cle,(select cle from saisie)) end)
        from public.ec09_cles_termes a where a.competence_id=c.id),0.0)
    )::numeric score
  from public.competences_ec c where c.actif
 )
 select r.id,r.libelle,r.score from candidats r
 where (select length(cle) from saisie)>=1 and r.score >= case when (select length(cle) from saisie)<3 then .80 else .24 end
 order by r.score desc, r.libelle
 limit least(greatest(coalesce(p_limite,12),1),30);
$fn$;
revoke all on function public.ec09_suggerer_termes(text,integer) from public,anon;
grant execute on function public.ec09_suggerer_termes(text,integer) to authenticated;

create or replace function public.ec09_creer_terme(p_libelle text,p_forcer boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_saisie text:=btrim(coalesce(p_libelle,''));v_cle text;v_id uuid;v_nom text;v_proche text;
begin
 if auth.uid() is null or public.mon_role() is null then raise exception 'Connexion active requise';end if;
 if char_length(v_saisie) not between 2 and 60 or v_saisie ~ '[<>[:cntrl:]]'
   or v_saisie ~* '(https?://|www\.|@)' then raise exception 'Tag invalide (2 a 60 caracteres, sans lien ni email)';end if;
 v_cle:=public.ec09_normaliser_terme(v_saisie);
 if char_length(v_cle)<2 then raise exception 'Tag trop court';end if;
 perform pg_advisory_xact_lock(hashtextextended('ec09_terme_'||v_cle,0));
 select c.id,c.libelle into v_id,v_nom from public.ec09_cles_termes k
 join public.competences_ec c on c.id=k.competence_id and c.actif where k.cle=v_cle;
 if found then return jsonb_build_object('id',v_id,'libelle',v_nom,'cree',false);end if;
 -- Rattrapage si une ancienne ligne a ete ajoutee en dehors du repertoire des cles.
 select id,libelle into v_id,v_nom from public.competences_ec
 where actif and public.ec09_normaliser_terme(libelle)=v_cle order by created_at,id limit 1;
 if found then
  insert into public.ec09_cles_termes(cle,competence_id) values(v_cle,v_id) on conflict do nothing;
  return jsonb_build_object('id',v_id,'libelle',v_nom,'cree',false);
 end if;
 if not coalesce(p_forcer,false) then
  select c.libelle into v_proche from public.competences_ec c
  where c.actif and public.ec09_normaliser_terme(c.libelle)<>v_cle
    and public.ec09_similarite_termes(public.ec09_normaliser_terme(c.libelle),v_cle)>=0.83
  order by public.ec09_similarite_termes(public.ec09_normaliser_terme(c.libelle),v_cle) desc limit 1;
  if v_proche is not null then
   raise exception 'Terme tres proche existant : %. Choisissez-le ou confirmez une creation distincte.',v_proche;
  end if;
 end if;
 if (select count(*) from public.competences_ec where cree_par=auth.uid()
      and created_at>now()-interval '24 hours')>=60
 then raise exception 'Limite de 60 nouveaux tags en 24 h atteinte';end if;
 insert into public.competences_ec(libelle,cree_par) values(v_saisie,auth.uid()) returning id into v_id;
 insert into public.ec09_cles_termes(cle,competence_id) values(v_cle,v_id);
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'creer_tag','competences_ec',v_id,jsonb_build_object('libelle',v_saisie));
 return jsonb_build_object('id',v_id,'libelle',v_saisie,'cree',true);
end $fn$;
revoke all on function public.ec09_creer_terme(text,boolean) from public,anon;
grant execute on function public.ec09_creer_terme(text,boolean) to authenticated;

-- 3. Associations multi-contextes. Aucun acces brut: lecture/ecriture par RPC controlee.
create table if not exists public.ec09_tags_cibles (
 cible_type text not null check(cible_type in('entreprise','personne','offre','besoin')),
 cible_id uuid not null,
 competence_id uuid not null references public.competences_ec(id) on delete restrict,
 cree_par uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 primary key(cible_type,cible_id,competence_id)
);
create index if not exists ec09_tags_competence on public.ec09_tags_cibles(competence_id,cible_type);
create index if not exists ec09_tags_cible on public.ec09_tags_cibles(cible_type,cible_id);
alter table public.ec09_tags_cibles enable row level security;
revoke all on public.ec09_tags_cibles from anon,authenticated;

create or replace function public.ec09_peut_modifier_tags(p_type text,p_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
declare v_ent uuid;
begin
 if public.mon_role() is null or p_id is null then return false;end if;
 if p_type='entreprise' then
  return exists(select 1 from public.entreprises_ec e where e.id=p_id and e.organisation_id=public.mon_organisation())
    and public.ec_peut_gerer_entreprise(p_id);
 elsif p_type='personne' then return p_id=auth.uid() and exists(select 1 from public.profiles p where p.id=p_id and p.statut='actif');
 elsif p_type='offre' then
  select p.entreprise_id into v_ent from public.offres o
  join public.prestataires p on p.id=o.prestataire_id where o.id=p_id;
  return coalesce(public.ec_peut_gerer_entreprise(v_ent),false);
 elsif p_type='besoin' then
  select j.entreprise_id into v_ent from public.projets j where j.id=p_id;
  return coalesce(public.ec07_droit_entreprise(v_ent,true),false);
 end if;
 return false;
end $fn$;

create or replace function public.ec09_peut_lire_tags(p_type text,p_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
begin
 if public.mon_role() is null or p_id is null then return false;end if;
 if public.ec09_peut_modifier_tags(p_type,p_id) then return true;end if;
 if p_type='entreprise' then
  return exists(select 1 from public.entreprises_ec e where e.id=p_id
   and e.statut='publiee' and e.organisation_id=public.mon_organisation());
 elsif p_type='personne' then
  return exists(select 1 from public.personnes_annuaire_ec a
   join public.entreprises_ec e on e.id=a.entreprise_id and e.statut='publiee'
   join public.profiles p on p.id=a.profile_id and p.statut='actif'
   join public.entreprise_membres_ec m on m.entreprise_id=e.id and m.profile_id=a.profile_id and m.actif
   where a.profile_id=p_id and a.visible and a.organisation_id=public.mon_organisation());
 elsif p_type='offre' then
  return exists(select 1 from public.offres o
   join public.prestataires p on p.id=o.prestataire_id
   where o.id=p_id and o.statut='publiee' and p.statut='valide'
     and o.organisation_id=public.mon_organisation());
 elsif p_type='besoin' then
  -- Les tags libres peuvent contenir des indices d'identification: lecture privee uniquement.
  return false;
 end if;
 return false;
end $fn$;

create or replace function public.ec09_lire_tags(p_type text,p_id uuid)
returns table(id uuid,libelle text) language plpgsql stable security definer set search_path='' as $fn$
begin
 if not public.ec09_peut_lire_tags(p_type,p_id) then raise exception 'Tags inaccessibles';end if;
 return query select c.id,c.libelle from public.ec09_tags_cibles l
 join public.competences_ec c on c.id=l.competence_id and c.actif
 where l.cible_type=p_type and l.cible_id=p_id order by c.libelle;
end $fn$;
revoke all on function public.ec09_lire_tags(text,uuid) from public,anon;
grant execute on function public.ec09_lire_tags(text,uuid) to authenticated;

create or replace function public.ec09_definir_tags(p_type text,p_id uuid,p_competences uuid[])
returns integer language plpgsql security definer set search_path='' as $fn$
declare v_total integer;
begin
 if not public.ec09_peut_modifier_tags(p_type,p_id) then raise exception 'Droits insuffisants pour modifier les tags';end if;
 v_total:=coalesce(cardinality(p_competences),0);
 if v_total>15 then raise exception 'Maximum 15 tags par fiche';end if;
 if exists(select 1 from unnest(coalesce(p_competences,array[]::uuid[])) t(id)
   where not exists(select 1 from public.competences_ec c where c.id=t.id and c.actif))
 then raise exception 'Un tag selectionne n existe plus';end if;
 perform pg_advisory_xact_lock(hashtextextended('ec09_cible_'||p_type||p_id::text,0));
 delete from public.ec09_tags_cibles where cible_type=p_type and cible_id=p_id;
 insert into public.ec09_tags_cibles(cible_type,cible_id,competence_id,cree_par)
 select p_type,p_id,t.id,auth.uid() from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) id)t;
 get diagnostics v_total=row_count;
 return v_total;
end $fn$;
revoke all on function public.ec09_definir_tags(text,uuid,uuid[]) from public,anon;
grant execute on function public.ec09_definir_tags(text,uuid,uuid[]) to authenticated;

-- Expose les labels de tags publics dans l'annuaire sans requete unitaire par carte.
-- Types de retour et signatures conserves pour compatibilite V0.8.4.
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
   coalesce((select array_agg(distinct c.libelle order by c.libelle)
     from public.competences_ec c where c.actif and c.id in (
      select ec.competence_id from public.entreprise_competences_ec ec where ec.entreprise_id=e.id
      union select et.competence_id from public.ec09_tags_cibles et
       where et.cible_type='entreprise' and et.cible_id=e.id
     )),'{}'::text[]) competences,
   (p_competence is null or exists(select 1 from public.entreprise_competences_ec ec
        where ec.entreprise_id=e.id and ec.competence_id=p_competence)
     or exists(select 1 from public.ec09_tags_cibles et
        where et.cible_type='entreprise' and et.cible_id=e.id and et.competence_id=p_competence)) skill_ok
  from public.entreprises_ec e
  where e.organisation_id=public.mon_organisation() and e.statut='publiee'
  union all
  select 'personne'::text,a.profile_id,a.nom_public,
     coalesce(nullif(a.titre,''),e.nom)::text,a.bio_html,a.avatar_path,a.entreprise_id,
     e.type,
     coalesce((select array_agg(distinct c.libelle order by c.libelle)
       from public.competences_ec c where c.actif and c.id in (
        select pc.competence_id from public.personne_competences_ec pc where pc.profile_id=a.profile_id
        union select et.competence_id from public.ec09_tags_cibles et
         where et.cible_type='personne' and et.cible_id=a.profile_id
       )),'{}'::text[]),
     (p_competence is null or exists(select 1 from public.personne_competences_ec pc
       where pc.profile_id=a.profile_id and pc.competence_id=p_competence)
     or exists(select 1 from public.ec09_tags_cibles et
        where et.cible_type='personne' and et.cible_id=a.profile_id and et.competence_id=p_competence))
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

-- Verrouillage explicite des objets sensibles ajoutes.
revoke all on function public.ec09_normaliser_terme(text) from public,anon;
revoke all on function public.ec09_peut_modifier_tags(text,uuid) from public,anon;
revoke all on function public.ec09_peut_lire_tags(text,uuid) from public,anon;
grant execute on function public.ec09_normaliser_terme(text) to authenticated;
grant execute on function public.ec09_peut_modifier_tags(text,uuid) to authenticated;
grant execute on function public.ec09_peut_lire_tags(text,uuid) to authenticated;
grant execute on function public.ec_annuaire_rechercher(text,text,uuid,integer,integer) to authenticated;

-- Creation avec tags dans la meme transaction: evite les fiches partiellement creees.
create or replace function public.ec09_publier_offre_tags(
 p_titre text,p_description text,p_html text,p_format text,p_tarif_centimes integer,p_tags uuid[])
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;
begin
 v_id:=public.ec_publier_offre_riche(p_titre,p_description,p_format,p_tarif_centimes,p_html);
 perform public.ec09_definir_tags('offre',v_id,p_tags);
 return v_id;
end $fn$;
revoke all on function public.ec09_publier_offre_tags(text,text,text,text,integer,uuid[]) from public,anon;
grant execute on function public.ec09_publier_offre_tags(text,text,text,text,integer,uuid[]) to authenticated;

create or replace function public.ec09_publier_besoin_tags(
 p_entreprise uuid,p_titre text,p_description text,p_titre_anonyme text,
 p_annonce_anonyme text,p_budget_centimes integer,p_html text,p_competences uuid[],p_tags uuid[])
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;
begin
 v_id:=public.ec08_publier_besoin(p_entreprise,p_titre,p_description,p_titre_anonyme,
                                  p_annonce_anonyme,p_budget_centimes,p_html);
 perform public.ec_set_competences('projet',v_id,p_competences);
 perform public.ec09_definir_tags('besoin',v_id,p_tags);
 return v_id;
end $fn$;
revoke all on function public.ec09_publier_besoin_tags(uuid,text,text,text,text,integer,text,uuid[],uuid[]) from public,anon;
grant execute on function public.ec09_publier_besoin_tags(uuid,text,text,text,text,integer,text,uuid[],uuid[]) to authenticated;

-- Mode 'Mes favoris' : pagination globale SUR les favoris (et non uniquement sur la page affichée).
create or replace function public.ec09_annuaire_favoris(
 p_texte text default '',p_type text default 'tous',p_competence uuid default null,
 p_limite integer default 24,p_offset integer default 0)
returns table(nature text,id uuid,nom text,sous_titre text,description_html text,
 image_path text,entreprise_id uuid,competences text[],nb_total bigint)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if public.mon_role() is null then raise exception 'Connexion active requise';end if;
 if p_type not in ('tous','entreprise','personne','startup','prestataire','autre')
 then raise exception 'Filtre invalide';end if;
 return query with favoris_visibles as (
  select 'entreprise'::text nature,e.id,e.nom,
   case e.type when 'startup' then 'Startup' when 'prestataire' then 'Prestataire'
    else 'Entreprise' end::text sous_titre,e.presentation_html description_html,
   e.logo_path image_path,e.id entreprise_id,e.type type_entreprise,
   coalesce((select array_agg(distinct c.libelle order by c.libelle)
    from public.competences_ec c where c.actif and c.id in (
     select ec.competence_id from public.entreprise_competences_ec ec where ec.entreprise_id=e.id
     union select t.competence_id from public.ec09_tags_cibles t
      where t.cible_type='entreprise' and t.cible_id=e.id)),array[]::text[]) competences,
   f.created_at favori_le
  from public.favoris_ec f join public.entreprises_ec e on e.id=f.cible_id
  where f.utilisateur_id=auth.uid() and f.cible_type='entreprise'
    and e.organisation_id=public.mon_organisation() and
     (e.statut='publiee' or public.ec_est_membre(e.id) or public.est_admin())
  union all
  select 'personne'::text,a.profile_id,a.nom_public,
   coalesce(nullif(a.titre,''),e.nom)::text,a.bio_html,a.avatar_path,a.entreprise_id,e.type,
   coalesce((select array_agg(distinct c.libelle order by c.libelle)
    from public.competences_ec c where c.actif and c.id in (
     select pc.competence_id from public.personne_competences_ec pc where pc.profile_id=a.profile_id
     union select t.competence_id from public.ec09_tags_cibles t
      where t.cible_type='personne' and t.cible_id=a.profile_id)),array[]::text[]),
   f.created_at
  from public.favoris_ec f join public.personnes_annuaire_ec a on a.profile_id=f.cible_id
   join public.profiles p on p.id=a.profile_id and p.statut='actif'
   join public.entreprises_ec e on e.id=a.entreprise_id
   join public.entreprise_membres_ec m on m.entreprise_id=e.id and m.profile_id=a.profile_id and m.actif
  where f.utilisateur_id=auth.uid() and f.cible_type='personne'
   and a.organisation_id=public.mon_organisation()
   and ((a.visible and e.statut='publiee') or a.profile_id=auth.uid() or public.est_admin())
 ), filtres as (
  select v.* from favoris_visibles v where
   (p_type='tous' or v.nature=p_type or (v.nature='entreprise' and v.type_entreprise=p_type))
   and (p_competence is null or exists(select 1 from public.competences_ec c
       where c.id=p_competence and c.libelle=any(v.competences)))
   and (coalesce(btrim(p_texte),'')='' or
    v.nom ilike '%'||btrim(p_texte)||'%' or v.sous_titre ilike '%'||btrim(p_texte)||'%' or
    regexp_replace(v.description_html,'<[^>]+>',' ','g') ilike '%'||btrim(p_texte)||'%' or
    exists(select 1 from unnest(v.competences) t where t ilike '%'||btrim(p_texte)||'%'))
 )
 select f.nature,f.id,f.nom,f.sous_titre,f.description_html,f.image_path,f.entreprise_id,
   f.competences,count(*) over() from filtres f
 order by f.favori_le desc,f.nom
 limit least(greatest(coalesce(p_limite,24),1),100)
 offset greatest(coalesce(p_offset,0),0);
end $fn$;
revoke all on function public.ec09_annuaire_favoris(text,text,uuid,integer,integer) from public,anon;
grant execute on function public.ec09_annuaire_favoris(text,text,uuid,integer,integer) to authenticated;

-- Rafraichir le cache PostgREST pour les nouvelles signatures RPC Supabase.
notify pgrst, 'reload schema';
