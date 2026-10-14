-- EURACONNECT V0.4 - migration additive, a executer APRES 001 et 002.
-- Matching deterministe, conversations privees apres relation acceptee, suivi commercial.
create extension if not exists pg_trgm;
create table if not exists public.competences_ec (
 id uuid primary key default gen_random_uuid(), libelle text not null unique,
 synonymes text[] not null default '{}', actif boolean not null default true,
 created_at timestamptz not null default now());
create index if not exists competences_ec_libelle_trgm on public.competences_ec using gin(libelle gin_trgm_ops);
create table if not exists public.prestataire_competences_ec (
 prestataire_id uuid not null references public.prestataires(id),
 competence_id uuid not null references public.competences_ec(id),
 created_at timestamptz not null default now(), primary key(prestataire_id,competence_id));
create table if not exists public.projet_competences_ec (
 projet_id uuid not null references public.projets(id), competence_id uuid not null references public.competences_ec(id),
 created_at timestamptz not null default now(), primary key(projet_id,competence_id));
create table if not exists public.conversations_ec (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
 relation_id uuid not null unique references public.mises_en_relation(id),
 incube_id uuid not null references public.profiles(id), prestataire_user_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now());
create table if not exists public.messages_ec (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
 conversation_id uuid not null references public.conversations_ec(id), auteur_id uuid not null references public.profiles(id),
 corps text not null check(char_length(trim(corps)) between 1 and 4000),
 created_at timestamptz not null default now());
create index if not exists messages_ec_fil_date on public.messages_ec(conversation_id, created_at);
create table if not exists public.opportunites_ec (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
 relation_id uuid not null unique references public.mises_en_relation(id),
 statut text not null default 'contact' check(statut in('contact','rdv','proposition','gagnee','perdue')),
 commentaire text not null default '' check(char_length(commentaire)<=2000),
 modifie_par uuid references public.profiles(id), updated_at timestamptz not null default now(),
 created_at timestamptz not null default now());

insert into public.competences_ec(libelle,synonymes) values
 ('Comptabilite',array['compta','expert comptable','finance']),
 ('Propriete intellectuelle',array['brevet','protection invention','marque']),
 ('Reglementation sante',array['reglementaire','medical device','dispositif medical']),
 ('Marketing et communication',array['marketing digital','communication']),
 ('UX et design',array['ergonomie','ux','design produit']),
 ('Developpement informatique',array['logiciel','application','site web']),
 ('Financement',array['levee de fonds','subvention','investissement']),
 ('Etudes cliniques',array['essais cliniques','investigation clinique']),
 ('Ressources humaines',array['rh','recrutement'])
on conflict(libelle) do nothing;

alter table public.competences_ec enable row level security;
alter table public.prestataire_competences_ec enable row level security;
alter table public.projet_competences_ec enable row level security;
alter table public.conversations_ec enable row level security;
alter table public.messages_ec enable row level security;
alter table public.opportunites_ec enable row level security;

create policy ec_competences_lecture on public.competences_ec for select to authenticated using(actif);
create policy ec_pc_lecture on public.prestataire_competences_ec for select to authenticated using(
 exists(select 1 from public.prestataires p where p.id=prestataire_id and p.organisation_id=public.mon_organisation()
 and (p.statut='valide' or p.proprietaire_id=auth.uid())) or public.est_admin());
create policy ec_jc_lecture on public.projet_competences_ec for select to authenticated using(
 exists(select 1 from public.projets j where j.id=projet_id and j.organisation_id=public.mon_organisation()
 and (j.statut='publie' or j.incube_id=auth.uid())) or public.est_admin());
create policy ec_conversations_lecture on public.conversations_ec for select to authenticated using(
 organisation_id=public.mon_organisation() and (incube_id=auth.uid() or prestataire_user_id=auth.uid()));
create policy ec_messages_lecture on public.messages_ec for select to authenticated using(
 exists(select 1 from public.conversations_ec c where c.id=conversation_id and c.organisation_id=public.mon_organisation()
 and (c.incube_id=auth.uid() or c.prestataire_user_id=auth.uid())));
create policy ec_opportunites_lecture on public.opportunites_ec for select to authenticated using(
 exists(select 1 from public.conversations_ec c where c.relation_id=relation_id and c.organisation_id=public.mon_organisation()
 and (c.incube_id=auth.uid() or c.prestataire_user_id=auth.uid())));

revoke all on public.competences_ec,public.prestataire_competences_ec,public.projet_competences_ec,
 public.conversations_ec,public.messages_ec,public.opportunites_ec from public,anon,authenticated;
grant select on public.competences_ec,public.prestataire_competences_ec,public.projet_competences_ec,
 public.conversations_ec,public.messages_ec,public.opportunites_ec to authenticated;

create or replace function public.ec_set_competences(p_cible text,p_id uuid,p_competences uuid[]) returns void
 language plpgsql security definer set search_path='' as $$
declare v_org uuid;
begin
 if coalesce(array_length(p_competences,1),0)>15 then raise exception 'Maximum 15 competences'; end if;
 if exists(select 1 from unnest(coalesce(p_competences,array[]::uuid[])) x where not exists(select 1 from public.competences_ec t where t.id=x and t.actif)) then raise exception 'Competence inconnue';end if;
 if p_cible='prestataire' then
  select organisation_id into v_org from public.prestataires where id=p_id and proprietaire_id=auth.uid() and statut='valide' for update;
  if v_org is null then raise exception 'Prestataire inaccessible'; end if;
  delete from public.prestataire_competences_ec where prestataire_id=p_id;
  insert into public.prestataire_competences_ec(prestataire_id,competence_id) select p_id,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x)t;
 elsif p_cible='projet' then
  select organisation_id into v_org from public.projets where id=p_id and incube_id=auth.uid() for update;
  if v_org is null then raise exception 'Projet inaccessible'; end if;
  delete from public.projet_competences_ec where projet_id=p_id;
  insert into public.projet_competences_ec(projet_id,competence_id) select p_id,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x)t;
 else raise exception 'Type de cible incorrect'; end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'competences_actualisees',p_cible,p_id);
end $$;

-- Classement exact via competences etiquetees; texte libre par correspondance explicable.
-- Retourne uniquement des projets visibles au prestataire, sans details d'identite incube.
create or replace function public.ec_matching_besoins(p_texte text default '',p_limite integer default 30)
 returns table(projet_id uuid,titre text,description text,score integer,raisons text[])
 language sql stable security definer set search_path='' as $$
 with prest as (select id from public.prestataires where proprietaire_id=auth.uid() and statut='valide'),
 termes as (select lower(trim(coalesce(p_texte,''))) q),
 resultat as (
 select j.id,j.titre,j.description,
  exists(select 1 from public.projet_competences_ec jc join public.prestataire_competences_ec pc on pc.competence_id=jc.competence_id
   where jc.projet_id=j.id and pc.prestataire_id=(select id from prest)) correspondance,
  (select count(*) from public.projet_competences_ec jc join public.prestataire_competences_ec pc on pc.competence_id=jc.competence_id
   where jc.projet_id=j.id and pc.prestataire_id=(select id from prest)) nb,
  (select q from termes) q
 from public.projets j where j.statut='publie' and j.organisation_id=public.mon_organisation() and exists(select 1 from prest))
 select r.id,r.titre,r.description,
 (least(r.nb,3)*30 + case when r.q<>'' and (lower(r.titre) like '%'||r.q||'%' or lower(r.description) like '%'||r.q||'%') then 25 else 0 end)::integer,
 array_remove(array[case when r.correspondance then 'Competences communes' end,
 case when r.q<>'' and (lower(r.titre) like '%'||r.q||'%' or lower(r.description) like '%'||r.q||'%') then 'Recherche textuelle' end],null)::text[]
 from resultat r where r.q='' or lower(r.titre) like '%'||r.q||'%' or lower(r.description) like '%'||r.q||'%'
 order by 4 desc,r.titre limit least(greatest(coalesce(p_limite,30),1),100)
$$;

-- Creation paresseuse de la conversation : impossible avant consentement bilaterale.
create or replace function public.ec_ouvrir_conversation(p_relation uuid) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v public.mises_en_relation%rowtype; v_incube uuid;v_prest uuid;v_id uuid;
begin
 select * into v from public.mises_en_relation where id=p_relation and statut='acceptee' for update;
 if not found then raise exception 'Mise en relation non acceptee'; end if;
 select j.incube_id,p.proprietaire_id into v_incube,v_prest
 from public.candidatures c join public.projets j on j.id=c.projet_id join public.prestataires p on p.id=c.prestataire_id
 where c.id=v.candidature_id and c.identite_revelee=true and c.organisation_id=public.mon_organisation();
 if v_incube is null or auth.uid() not in (v_incube,v_prest) then raise exception 'Acces interdit'; end if;
 insert into public.conversations_ec(organisation_id,relation_id,incube_id,prestataire_user_id)
 values(v.organisation_id,p_relation,v_incube,v_prest) on conflict(relation_id) do nothing;
 select id into v_id from public.conversations_ec where relation_id=p_relation;
 insert into public.opportunites_ec(organisation_id,relation_id) values(v.organisation_id,p_relation) on conflict(relation_id) do nothing;
 return v_id;
end $$;

create or replace function public.ec_envoyer_message(p_conversation uuid,p_corps text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v public.conversations_ec%rowtype; v_id uuid;
begin
 select * into v from public.conversations_ec where id=p_conversation;
 if not found or v.organisation_id is distinct from public.mon_organisation() or auth.uid() not in (v.incube_id,v.prestataire_user_id) then raise exception 'Conversation inaccessible'; end if;
 if char_length(trim(coalesce(p_corps,''))) not between 1 and 4000 then raise exception 'Message invalide (1 a 4000 caracteres)'; end if;
 if not exists(select 1 from public.mises_en_relation where id=v.relation_id and statut='acceptee') then raise exception 'Relation non active'; end if;
 insert into public.messages_ec(organisation_id,conversation_id,auteur_id,corps)
 values(v.organisation_id,p_conversation,auth.uid(),trim(p_corps)) returning id into v_id;
 return v_id;
end $$;

create or replace function public.ec_suivre_opportunite(p_relation uuid,p_statut text,p_commentaire text default '') returns void
 language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_statut not in('contact','rdv','proposition','gagnee','perdue') or char_length(coalesce(p_commentaire,''))>2000 then raise exception 'Statut ou commentaire incorrect'; end if;
 select id into v_id from public.conversations_ec where relation_id=p_relation and organisation_id=public.mon_organisation()
 and (incube_id=auth.uid() or prestataire_user_id=auth.uid());
 if v_id is null then raise exception 'Opportunite inaccessible';end if;
 update public.opportunites_ec set statut=p_statut,commentaire=coalesce(p_commentaire,''),updated_at=now(),modifie_par=auth.uid() where relation_id=p_relation;
 if not found then
  insert into public.opportunites_ec(organisation_id,relation_id,statut,commentaire,modifie_par)
  select organisation_id,relation_id,p_statut,coalesce(p_commentaire,''),auth.uid() from public.conversations_ec where id=v_id;
 end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail) values(auth.uid(),'suivi_opportunite','mises_en_relation',p_relation,jsonb_build_object('statut',p_statut));
end $$;

revoke all on function public.ec_set_competences(text,uuid,uuid[]),public.ec_matching_besoins(text,integer),
 public.ec_ouvrir_conversation(uuid),public.ec_envoyer_message(uuid,text),public.ec_suivre_opportunite(uuid,text,text) from public,anon;
grant execute on function public.ec_set_competences(text,uuid,uuid[]),public.ec_matching_besoins(text,integer),
 public.ec_ouvrir_conversation(uuid),public.ec_envoyer_message(uuid,text),public.ec_suivre_opportunite(uuid,text,text) to authenticated;

-- Liste des relations acceptees accessible aux DEUX parties sans divulguer les relations d'autrui.
create or replace function public.ec_mes_relations_acceptees() returns table(relation_id uuid)
 language sql stable security definer set search_path='' as $$
 select r.id from public.mises_en_relation r
 join public.candidatures ca on ca.id=r.candidature_id
 join public.projets j on j.id=ca.projet_id
 join public.prestataires p on p.id=ca.prestataire_id
 where r.statut='acceptee' and ca.identite_revelee and r.organisation_id=public.mon_organisation()
 and (j.incube_id=auth.uid() or p.proprietaire_id=auth.uid())
$$;
revoke all on function public.ec_mes_relations_acceptees() from public,anon;
grant execute on function public.ec_mes_relations_acceptees() to authenticated;
