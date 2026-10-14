-- EURACONNECT V0.7 - Dossiers commerciaux partages et delegation par entreprise.
-- Appliquer uniquement apres 202610140005_entreprises_annuaire.sql.
-- Migration additive : aucune suppression d'utilisateur ou de donnees metier.
-- Les RPC ne se fient jamais a un role transmis par le navigateur.

begin;

create table if not exists public.ec07_assignations (
 candidature_id uuid not null references public.candidatures(id) on delete restrict,
 entreprise_id uuid not null references public.entreprises_ec(id) on delete restrict,
 assigne_a uuid not null references public.profiles(id) on delete restrict,
 attribue_par uuid not null references public.profiles(id),
 updated_at timestamptz not null default now(),
 primary key (candidature_id,entreprise_id)
);
create index if not exists ec07_projets_entreprise_idx
 on public.projets(entreprise_id,created_at desc) where entreprise_id is not null;
create index if not exists ec07_candidatures_prestataire_idx
 on public.candidatures(prestataire_id,created_at desc);
create index if not exists ec07_assignations_responsable_idx
 on public.ec07_assignations(assigne_a,entreprise_id);

create table if not exists public.ec07_historique_dossiers (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 entreprise_id uuid not null references public.entreprises_ec(id),
 candidature_id uuid not null references public.candidatures(id),
 auteur_id uuid not null references public.profiles(id),
 action text not null check (action in ('attribution','demande_relation','reponse_relation','message','statut')),
 detail text not null default '' check (char_length(detail)<=500),
 created_at timestamptz not null default now()
);
create index if not exists ec07_historique_recent_idx
 on public.ec07_historique_dossiers(entreprise_id,created_at desc);

alter table public.ec07_assignations enable row level security;
alter table public.ec07_historique_dossiers enable row level security;
revoke all on public.ec07_assignations,public.ec07_historique_dossiers from public,anon,authenticated;
-- Ecritures exclusivement via RPC; lecture aussi via RPC pour limiter les champs exposes.

-- L'administrateur global ne lit pas par defaut le contenu commercial prive.
-- La permission appartient a l'entreprise, pas au createur historique.
create or replace function public.ec07_droit_entreprise(p_entreprise uuid,p_ecriture boolean default false)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(
  select 1 from public.entreprise_membres_ec m
  join public.entreprises_ec e on e.id=m.entreprise_id
  join public.profiles pr on pr.id=m.profile_id
  where m.entreprise_id=p_entreprise and m.profile_id=auth.uid()
   and m.actif and pr.statut='actif' and pr.organisation_id=e.organisation_id
   and e.organisation_id=public.mon_organisation()
   and ((e.type='startup' and pr.role='incube')
     or (e.type='prestataire' and pr.role='prestataire'))
   and (not coalesce(p_ecriture,false) or m.role_membre in ('proprietaire','gestionnaire'))
 );
$fn$;

create or replace function public.ec07_est_assigne(p_candidature uuid,p_entreprise uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select public.ec07_droit_entreprise(p_entreprise,false) and exists(
   select 1 from public.ec07_assignations a
   where a.candidature_id=p_candidature and a.entreprise_id=p_entreprise
     and a.assigne_a=auth.uid()
 );
$fn$;

-- Une conversation existante pointe encore vers les auteurs originaux.
-- L'autorisation est recalculee depuis les entreprises et leurs membres ACTIFS.
create or replace function public.ec07_droit_conversation(p_conversation uuid,p_ecriture boolean default false)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
declare v record;
begin
 select cv.organisation_id,cv.incube_id,cv.prestataire_user_id,
   j.entreprise_id as startup_id,p.entreprise_id as prestataire_entreprise,
   j.organisation_id as startup_org,p.organisation_id as provider_org,
   cd.organisation_id as candidature_org,r.organisation_id as relation_org,
   cd.id as candidature_id, r.statut as relation_statut,cd.identite_revelee
 into v
 from public.conversations_ec cv
 join public.mises_en_relation r on r.id=cv.relation_id
 join public.candidatures cd on cd.id=r.candidature_id
 join public.projets j on j.id=cd.projet_id
 join public.prestataires p on p.id=cd.prestataire_id
 where cv.id=p_conversation;
 if not found or public.mon_organisation() is null
    or v.organisation_id is distinct from public.mon_organisation()
    or v.startup_org is distinct from v.organisation_id
    or v.provider_org is distinct from v.organisation_id
    or v.candidature_org is distinct from v.organisation_id
    or v.relation_org is distinct from v.organisation_id
    or v.relation_statut<>'acceptee' or not v.identite_revelee
    then return false; end if;
 return (
   (v.startup_id is not null and (
      public.ec07_droit_entreprise(v.startup_id,p_ecriture)
      or (coalesce(p_ecriture,false) and public.ec07_est_assigne(v.candidature_id,v.startup_id))
   ))
   or (v.startup_id is null and v.incube_id=auth.uid())
   or (v.prestataire_entreprise is not null and (
      public.ec07_droit_entreprise(v.prestataire_entreprise,p_ecriture)
      or (coalesce(p_ecriture,false) and public.ec07_est_assigne(v.candidature_id,v.prestataire_entreprise))
   ))
   or (v.prestataire_entreprise is null and v.prestataire_user_id=auth.uid())
 );
end $fn$;

-- Ne pas conserver les politiques V0.4 qui laissent lire un ancien participant
-- meme s'il a ete retire de son entreprise.
drop policy if exists ec_conversations_lecture on public.conversations_ec;
drop policy if exists ec_messages_lecture on public.messages_ec;
drop policy if exists ec_opportunites_lecture on public.opportunites_ec;
create policy ec07_conversations_lecture on public.conversations_ec
 for select to authenticated using(public.ec07_droit_conversation(id,false));
create policy ec07_messages_lecture on public.messages_ec
 for select to authenticated using(public.ec07_droit_conversation(conversation_id,false));
create policy ec07_opportunites_lecture on public.opportunites_ec
 for select to authenticated using(exists(
  select 1 from public.conversations_ec cv
  where cv.relation_id=opportunites_ec.relation_id
   and public.ec07_droit_conversation(cv.id,false)
 ));
-- Une candidature doit rester inaccessible en brut a l'entreprise incubee
-- pour ne jamais exposer prestataire_id avant revelation.
create policy ec07_candidatures_prestataire_lecture on public.candidatures
 for select to authenticated using(exists(
  select 1 from public.prestataires p
  where p.id=candidatures.prestataire_id and p.entreprise_id is not null
   and public.ec07_droit_entreprise(p.entreprise_id,false)
 ));
-- Remplacer les lectures historiques fondees sur les proprietaires, afin
-- qu'un ancien employe ne conserve pas l'acces a un dossier archive.
drop policy if exists projets_read on public.projets;
create policy ec07_projets_lecture on public.projets
 for select to authenticated using(
  (statut='publie' and organisation_id=public.mon_organisation())
  or (entreprise_id is not null and public.ec07_droit_entreprise(entreprise_id,false))
  or (entreprise_id is null and incube_id=auth.uid()
      and organisation_id=public.mon_organisation())
  or public.est_admin()
 );
drop policy if exists prestataire_read on public.prestataires;
create policy ec07_prestataire_lecture on public.prestataires
 for select to authenticated using(
  (statut='valide' and organisation_id=public.mon_organisation())
  or (entreprise_id is not null and public.ec07_droit_entreprise(entreprise_id,false))
  or (entreprise_id is null and proprietaire_id=auth.uid()
      and organisation_id=public.mon_organisation())
  or public.est_admin()
 );

-- Un besoin historique sans entreprise peut etre rattache par SON auteur uniquement.
create or replace function public.ec07_rattacher_besoin(p_besoin uuid,p_entreprise uuid)
returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.ec07_droit_entreprise(p_entreprise,true)
    or not exists(select 1 from public.entreprises_ec where id=p_entreprise and type='startup')
 then raise exception 'Droits insuffisants'; end if;
 update public.projets set entreprise_id=p_entreprise
 where id=p_besoin and entreprise_id is null and incube_id=auth.uid()
   and organisation_id=public.mon_organisation();
 if not found then raise exception 'Besoin non rattachable'; end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec07_rattacher_besoin','projets',p_besoin,jsonb_build_object('entreprise_id',p_entreprise));
end $fn$;

-- Liste expurgee : pas d'UUID de prestataire avant accord, ni email personnel.
-- Les collaborateurs voient les dossiers de leur entreprise, y compris historiques.
create or replace function public.ec07_lister_dossiers(p_entreprise uuid)
returns table(dossier_id uuid,nature text,projet_id uuid,titre text,candidature_id uuid,
 proposition text,candidat text,statut_candidature text,relation_id uuid,statut_relation text,
 conversation_id uuid,statut_opportunite text,assigne_a uuid,assigne_nom text,cree_le timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
declare v_type text;
begin
 if not public.ec07_droit_entreprise(p_entreprise,false) then
  raise exception 'Entreprise inaccessible'; end if;
 select type into v_type from public.entreprises_ec where id=p_entreprise;
 if v_type='startup' then
  return query
  select coalesce(c.id,j.id), 'besoin'::text,j.id,j.titre,c.id,c.message,
   case when c.id is null then null
        when c.identite_revelee and r.statut='acceptee' then p.nom_public
        else c.alias end::text,
   c.statut,r.id,r.statut,cv.id,o.statut,a.assigne_a,
   coalesce(nullif(pr.nom,''),'Collaborateur')::text,j.created_at
  from public.projets j
  left join public.candidatures c on c.projet_id=j.id and c.organisation_id=j.organisation_id
  left join public.prestataires p on p.id=c.prestataire_id
  left join public.mises_en_relation r on r.candidature_id=c.id
  left join public.conversations_ec cv on cv.relation_id=r.id
  left join public.opportunites_ec o on o.relation_id=r.id
  left join public.ec07_assignations a on a.candidature_id=c.id and a.entreprise_id=p_entreprise
  left join public.profiles pr on pr.id=a.assigne_a
  where j.entreprise_id=p_entreprise and j.organisation_id=public.mon_organisation()
  order by j.created_at desc,c.created_at desc nulls last limit 250;
 elsif v_type='prestataire' then
  return query
  select c.id, 'candidature'::text,j.id,j.titre,c.id,c.message,
   c.alias::text,c.statut,r.id,r.statut,cv.id,o.statut,a.assigne_a,
   coalesce(nullif(pr.nom,''),'Collaborateur')::text,c.created_at
  from public.prestataires p
  join public.candidatures c on c.prestataire_id=p.id
  join public.projets j on j.id=c.projet_id
  left join public.mises_en_relation r on r.candidature_id=c.id
  left join public.conversations_ec cv on cv.relation_id=r.id
  left join public.opportunites_ec o on o.relation_id=r.id
  left join public.ec07_assignations a on a.candidature_id=c.id and a.entreprise_id=p_entreprise
  left join public.profiles pr on pr.id=a.assigne_a
  where p.entreprise_id=p_entreprise and c.organisation_id=public.mon_organisation()
   and j.organisation_id=public.mon_organisation()
  order by c.created_at desc limit 250;
 end if;
end $fn$;

create or replace function public.ec07_besoins_disponibles(
 p_entreprise uuid,p_recherche text default '')
returns table(id uuid,titre text,description text,budget_centimes integer,
 score integer,deja_repondu boolean,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
declare v_prest uuid;
begin
 if not public.ec07_droit_entreprise(p_entreprise,false)
 or char_length(coalesce(p_recherche,''))>120
 then raise exception 'Recherche ou entreprise invalide'; end if;
 select p.id into v_prest from public.prestataires p
 where p.entreprise_id=p_entreprise and p.statut='valide';
 if v_prest is null then raise exception 'Validation prestataire requise'; end if;
 return query
 select j.id,j.titre,j.description,j.budget_centimes,
  (select (least(count(*),3)*30)::integer from public.projet_competences_ec pc
   join public.prestataire_competences_ec ps on ps.competence_id=pc.competence_id
   where pc.projet_id=j.id and ps.prestataire_id=v_prest)
  +case when coalesce(trim(p_recherche),'')<>'' and
    (j.titre ilike '%'||trim(p_recherche)||'%' or j.description ilike '%'||trim(p_recherche)||'%')
    then 25 else 0 end as score,
  exists(select 1 from public.candidatures ca where ca.projet_id=j.id and ca.prestataire_id=v_prest),
  j.created_at
 from public.projets j
 where j.organisation_id=public.mon_organisation() and j.statut='publie'
   and (j.entreprise_id is null or j.entreprise_id<>p_entreprise)
   and (coalesce(trim(p_recherche),'')='' or j.titre ilike '%'||trim(p_recherche)||'%'
        or j.description ilike '%'||trim(p_recherche)||'%')
 order by 5 desc,j.created_at desc limit 80;
end $fn$;

-- Une publication cible explicitement l'entreprise startup selectionnee.
create or replace function public.ec07_publier_besoin(
 p_entreprise uuid,p_titre text,p_description text,p_budget_centimes integer default null,
 p_html text default '')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;
begin
 if not public.ec07_droit_entreprise(p_entreprise,true)
  or not exists(select 1 from public.entreprises_ec where id=p_entreprise and type='startup')
 then raise exception 'Gestionnaire startup requis'; end if;
 if char_length(trim(coalesce(p_titre,''))) not between 8 and 150
   or char_length(trim(coalesce(p_description,'')))<50
   or (p_budget_centimes is not null and p_budget_centimes<0)
   or char_length(coalesce(p_html,''))>16000
 then raise exception 'Besoin invalide'; end if;
 insert into public.projets(organisation_id,incube_id,entreprise_id,titre,description,budget_centimes,description_html)
 values(public.mon_organisation(),auth.uid(),p_entreprise,trim(p_titre),trim(p_description),p_budget_centimes,coalesce(p_html,''))
 returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec07_publier_besoin','projets',v_id,jsonb_build_object('entreprise_id',p_entreprise));
 return v_id;
end $fn$;

-- Verrouille le prestataire AVANT le comptage du quota, pour garantir l'atomicite.
create or replace function public.ec07_candidater(
 p_entreprise uuid,p_projet uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_provider public.prestataires%rowtype;v_besoin public.projets%rowtype;
 v_quota integer;v_deja integer;v_id uuid;v_alias text;
begin
 if not public.ec07_droit_entreprise(p_entreprise,true)
 then raise exception 'Gestionnaire prestataire requis'; end if;
 select * into v_provider from public.prestataires
 where entreprise_id=p_entreprise and statut='valide' for update;
 if not found then raise exception 'Prestataire non valide'; end if;
 select * into v_besoin from public.projets where id=p_projet and statut='publie'
   and organisation_id=v_provider.organisation_id;
 if not found or v_besoin.entreprise_id=p_entreprise then raise exception 'Besoin inaccessible'; end if;
 if char_length(trim(coalesce(p_message,'')))<100 or char_length(p_message)>5000
 then raise exception 'Reponse : entre 100 et 5000 caracteres'; end if;
 if p_message ~* '(https?://|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?[0-9][0-9 .-]{8,}[0-9])'
 then raise exception 'Supprimez coordonnees et liens du message'; end if;
 select quota_candidatures into v_quota from public.plans where code=v_provider.plan_code and actif;
 if v_quota is null then raise exception 'Plan de service indisponible'; end if;
 select count(*) into v_deja from public.candidatures
 where prestataire_id=v_provider.id
   and created_at >= (date_trunc('month',now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
   and created_at < ((date_trunc('month',now() at time zone 'Europe/Paris')+interval '1 month') at time zone 'Europe/Paris');
 if v_deja>=v_quota then raise exception 'Quota mensuel de candidatures atteint'; end if;
 v_alias:='Expert '||upper(substr(md5(gen_random_uuid()::text),1,6));
 insert into public.candidatures(organisation_id,projet_id,prestataire_id,alias,message,identite_revelee)
 values(v_provider.organisation_id,p_projet,v_provider.id,v_alias,trim(p_message),false)
 returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec07_candidater','candidatures',v_id,jsonb_build_object('entreprise_id',p_entreprise));
 return v_id;
end $fn$;

create or replace function public.ec07_demander_relation(p_entreprise uuid,p_candidature uuid)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_org uuid;v_id uuid;
begin
 if not public.ec07_droit_entreprise(p_entreprise,true) then raise exception 'Gestionnaire startup requis'; end if;
 select j.organisation_id into v_org from public.candidatures c
 join public.projets j on j.id=c.projet_id
 where c.id=p_candidature and j.entreprise_id=p_entreprise and c.statut='envoyee' for update of c;
 if v_org is null or v_org<>public.mon_organisation() then raise exception 'Candidature inaccessible'; end if;
 insert into public.mises_en_relation(organisation_id,candidature_id)
 values(v_org,p_candidature) returning id into v_id;
 update public.candidatures set statut='relation_demandee' where id=p_candidature;
 insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action)
 values(v_org,p_entreprise,p_candidature,auth.uid(),'demande_relation');
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'ec07_demander_relation','mises_en_relation',v_id);
 return v_id;
end $fn$;

create or replace function public.ec07_repondre_relation(p_entreprise uuid,p_relation uuid,p_accepter boolean)
returns void language plpgsql security definer set search_path='' as $fn$
declare v_candidature uuid;v_org uuid;
begin
 if not public.ec07_droit_entreprise(p_entreprise,true) then raise exception 'Gestionnaire prestataire requis'; end if;
 select c.id,c.organisation_id into v_candidature,v_org from public.mises_en_relation r
 join public.candidatures c on c.id=r.candidature_id
 join public.prestataires p on p.id=c.prestataire_id
 join public.projets j on j.id=c.projet_id
 where r.id=p_relation and r.statut='demandee' and p.entreprise_id=p_entreprise
  and c.organisation_id=r.organisation_id and p.organisation_id=r.organisation_id
  and j.organisation_id=r.organisation_id
 for update of r;
 if v_candidature is null or v_org<>public.mon_organisation() then raise exception 'Demande inaccessible';end if;
 update public.mises_en_relation set statut=case when p_accepter then 'acceptee' else 'refusee' end,
  reponse_le=now() where id=p_relation;
 update public.candidatures set statut=case when p_accepter then 'relation_acceptee' else 'relation_refusee' end,
  identite_revelee=p_accepter where id=v_candidature;
 insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action,detail)
 values(v_org,p_entreprise,v_candidature,auth.uid(),'reponse_relation',case when p_accepter then 'acceptee' else 'refusee' end);
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec07_repondre_relation','mises_en_relation',p_relation,jsonb_build_object('accepte',p_accepter));
end $fn$;

create or replace function public.ec07_ouvrir_conversation(p_relation uuid)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v record;v_id uuid;
begin
 select r.id,r.organisation_id,j.entreprise_id as startup_ent,p.entreprise_id as prestataire_ent,
        j.incube_id,p.proprietaire_id,r.statut,c.identite_revelee
 into v
 from public.mises_en_relation r
 join public.candidatures c on c.id=r.candidature_id
 join public.projets j on j.id=c.projet_id and j.organisation_id=r.organisation_id
 join public.prestataires p on p.id=c.prestataire_id and p.organisation_id=r.organisation_id
 where r.id=p_relation and c.organisation_id=r.organisation_id for update of r;
 if not found or v.organisation_id<>public.mon_organisation()
 or v.statut<>'acceptee' or not v.identite_revelee then raise exception 'Relation indisponible';end if;
 if not (coalesce(public.ec07_droit_entreprise(v.startup_ent,false),false)
 or coalesce(public.ec07_droit_entreprise(v.prestataire_ent,false),false)
 or (v.startup_ent is null and v.incube_id=auth.uid())
 or (v.prestataire_ent is null and v.proprietaire_id=auth.uid()))
 then raise exception 'Relation non autorisee'; end if;
 insert into public.conversations_ec(organisation_id,relation_id,incube_id,prestataire_user_id)
 values(v.organisation_id,p_relation,v.incube_id,v.proprietaire_id)
 on conflict(relation_id) do nothing;
 select id into v_id from public.conversations_ec where relation_id=p_relation;
 insert into public.opportunites_ec(organisation_id,relation_id)
 values(v.organisation_id,p_relation) on conflict(relation_id) do nothing;
 return v_id;
end $fn$;

create or replace function public.ec07_envoyer_message(p_conversation uuid,p_corps text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_org uuid;v_id uuid;v_candidate uuid;v_startup uuid;v_prest uuid;
begin
 if not public.ec07_droit_conversation(p_conversation,true)
 then raise exception 'Ecriture interdite (attribution ou gestion requise)';end if;
 if char_length(trim(coalesce(p_corps,''))) not between 1 and 4000
 then raise exception 'Message invalide';end if;
 select cv.organisation_id,c.id,j.entreprise_id,p.entreprise_id
 into v_org,v_candidate,v_startup,v_prest
 from public.conversations_ec cv
 join public.mises_en_relation r on r.id=cv.relation_id
 join public.candidatures c on c.id=r.candidature_id
 join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 where cv.id=p_conversation;
 insert into public.messages_ec(organisation_id,conversation_id,auteur_id,corps)
 values(v_org,p_conversation,auth.uid(),trim(p_corps)) returning id into v_id;
 if coalesce(public.ec07_droit_entreprise(v_startup,false),false) then
  insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action)
  values(v_org,v_startup,v_candidate,auth.uid(),'message');
 elsif coalesce(public.ec07_droit_entreprise(v_prest,false),false) then
  insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action)
  values(v_org,v_prest,v_candidate,auth.uid(),'message');
 end if;
 return v_id;
end $fn$;

create or replace function public.ec07_suivre_opportunite(p_conversation uuid,p_statut text,p_commentaire text default '')
returns void language plpgsql security definer set search_path='' as $fn$
declare v_org uuid;v_rel uuid;v_candidate uuid;v_startup uuid;v_prest uuid;
begin
 if p_statut not in ('contact','rdv','proposition','gagnee','perdue')
 or char_length(coalesce(p_commentaire,''))>2000 then raise exception 'Suivi invalide';end if;
 if not public.ec07_droit_conversation(p_conversation,true)
 then raise exception 'Dossier non modifiable'; end if;
 select cv.organisation_id,cv.relation_id,c.id,j.entreprise_id,p.entreprise_id
 into v_org,v_rel,v_candidate,v_startup,v_prest
 from public.conversations_ec cv
 join public.mises_en_relation r on r.id=cv.relation_id
 join public.candidatures c on c.id=r.candidature_id
 join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 where cv.id=p_conversation;
 insert into public.opportunites_ec(organisation_id,relation_id,statut,commentaire,modifie_par)
 values(v_org,v_rel,p_statut,coalesce(p_commentaire,''),auth.uid())
 on conflict(relation_id) do update set statut=excluded.statut,commentaire=excluded.commentaire,
 modifie_par=auth.uid(),updated_at=now();
 if coalesce(public.ec07_droit_entreprise(v_startup,false),false) then
  insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action,detail)
  values(v_org,v_startup,v_candidate,auth.uid(),'statut',p_statut);
 elsif coalesce(public.ec07_droit_entreprise(v_prest,false),false) then
  insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action,detail)
  values(v_org,v_prest,v_candidate,auth.uid(),'statut',p_statut);
 end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec07_suivre_opportunite','mises_en_relation',v_rel,jsonb_build_object('statut',p_statut));
end $fn$;

create or replace function public.ec07_assigner_dossier(
 p_entreprise uuid,p_candidature uuid,p_responsable uuid)
returns void language plpgsql security definer set search_path='' as $fn$
declare v_org uuid;v_member_role text;
begin
 if not public.ec07_droit_entreprise(p_entreprise,true)
 then raise exception 'Gestionnaire requis pour attribuer';end if;
 select e.organisation_id into v_org from public.entreprises_ec e where e.id=p_entreprise;
 if not exists (
   select 1 from public.candidatures c
   join public.projets j on j.id=c.projet_id
   join public.prestataires p on p.id=c.prestataire_id
   where c.id=p_candidature and c.organisation_id=v_org
   and j.organisation_id=v_org and p.organisation_id=v_org
   and (j.entreprise_id=p_entreprise or p.entreprise_id=p_entreprise)
 ) then raise exception 'Dossier hors entreprise'; end if;
 select m.role_membre into v_member_role from public.entreprise_membres_ec m
 join public.profiles pr on pr.id=m.profile_id
 where m.entreprise_id=p_entreprise and m.profile_id=p_responsable
  and m.actif and pr.statut='actif' and pr.organisation_id=v_org
  and ((pr.role='prestataire' and exists(select 1 from public.entreprises_ec
         where id=p_entreprise and type='prestataire'))
    or (pr.role='incube' and exists(select 1 from public.entreprises_ec
         where id=p_entreprise and type='startup')));
 if v_member_role is null then raise exception 'Collaborateur non actif'; end if;
 insert into public.ec07_assignations(candidature_id,entreprise_id,assigne_a,attribue_par)
 values(p_candidature,p_entreprise,p_responsable,auth.uid())
 on conflict(candidature_id,entreprise_id) do update
  set assigne_a=excluded.assigne_a,attribue_par=excluded.attribue_par,updated_at=now();
 insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action,detail)
 values(v_org,p_entreprise,p_candidature,auth.uid(),'attribution','Collaborateur attribue');
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec07_assigner_dossier','candidatures',p_candidature,jsonb_build_object('entreprise_id',p_entreprise,'assigne_a',p_responsable));
end $fn$;

create or replace function public.ec07_historique(p_entreprise uuid,p_candidature uuid)
returns table(action text,detail text,auteur text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if not public.ec07_droit_entreprise(p_entreprise,false) then raise exception 'Acces refuse';end if;
 if not exists (
  select 1 from public.candidatures c
  join public.projets j on j.id=c.projet_id
  join public.prestataires p on p.id=c.prestataire_id
  where c.id=p_candidature and c.organisation_id=public.mon_organisation()
    and j.organisation_id=public.mon_organisation() and p.organisation_id=public.mon_organisation()
    and (j.entreprise_id=p_entreprise or p.entreprise_id=p_entreprise)
 ) then raise exception 'Dossier inaccessible'; end if;
 return query select h.action,h.detail,
  coalesce(nullif(pr.nom,''),'Collaborateur')::text,h.created_at
 from public.ec07_historique_dossiers h
 join public.profiles pr on pr.id=h.auteur_id
 where h.entreprise_id=p_entreprise and h.candidature_id=p_candidature
 order by h.created_at desc limit 60;
end $fn$;

-- Garder les appels historiques mais les faire passer par les memes autorisations.
create or replace function public.ec_ouvrir_conversation(p_relation uuid)
returns uuid language sql security definer set search_path='' as $fn$
 select public.ec07_ouvrir_conversation(p_relation);
$fn$;
create or replace function public.ec_envoyer_message(p_conversation uuid,p_corps text)
returns uuid language sql security definer set search_path='' as $fn$
 select public.ec07_envoyer_message(p_conversation,p_corps);
$fn$;
create or replace function public.ec_suivre_opportunite(p_relation uuid,p_statut text,p_commentaire text default '')
returns void language plpgsql security definer set search_path='' as $fn$
declare v_conv uuid;
begin
 v_conv:=public.ec07_ouvrir_conversation(p_relation);
 perform public.ec07_suivre_opportunite(v_conv,p_statut,p_commentaire);
end $fn$;

-- Compatibilite du parcours V0.6 sans privilegier le proprietaire sorti de l'equipe.
create or replace function public.envoyer_candidature_ouverte(p_projet_id uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_ent uuid;
begin
 select p.entreprise_id into v_ent from public.prestataires p
 join public.entreprise_membres_ec m on m.entreprise_id=p.entreprise_id
 where m.profile_id=auth.uid() and m.actif and m.role_membre in ('proprietaire','gestionnaire')
 order by case when p.entreprise_id=(select entreprise_id from public.profiles where id=auth.uid()) then 0 else 1 end
 limit 1;
 if v_ent is null then raise exception 'Rattachement prestataire requis'; end if;
 return public.ec07_candidater(v_ent,p_projet_id,p_message);
end $fn$;

-- Compatibilite et revocation dans les anciens parcours V0.3-V0.6.
-- L'ancienne fonction mon_prestataire donnait encore priorite au proprietaire
-- historique, meme retire de l'entreprise. Ce droit n'existe plus.
create or replace function public.mon_prestataire()
returns uuid language sql stable security definer set search_path='' as $fn$
 select p.id from public.prestataires p
 where (p.entreprise_id is not null and public.ec07_droit_entreprise(p.entreprise_id,true))
    or (p.entreprise_id is null and p.proprietaire_id=auth.uid()
        and public.mon_role()='prestataire' and p.organisation_id=public.mon_organisation())
 order by case when p.entreprise_id=(select entreprise_id from public.profiles
  where id=auth.uid()) then 0 else 1 end,p.created_at
 limit 1;
$fn$;

-- L'incube sorti d'une startup ne voit plus ses candidatures historiques.
create or replace function public.lister_mes_candidatures()
returns table(id uuid,projet_id uuid,alias text,message text,statut text,
 identite_revelee boolean,prestataire_nom text,mise_en_relation text)
language sql stable security definer set search_path='' as $fn$
 select c.id,c.projet_id,c.alias,c.message,c.statut,c.identite_revelee,
  case when c.identite_revelee and m.statut='acceptee' then p.nom_public else null end,
  m.statut
 from public.candidatures c
 join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 left join public.mises_en_relation m on m.candidature_id=c.id
 where public.mon_role()='incube' and j.organisation_id=public.mon_organisation()
  and ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,false))
   or (j.entreprise_id is null and j.incube_id=auth.uid()));
$fn$;

create or replace function public.ec_mes_relations_acceptees()
returns table(relation_id uuid)
language sql stable security definer set search_path='' as $fn$
 select r.id from public.mises_en_relation r
 join public.candidatures c on c.id=r.candidature_id
 join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 where r.statut='acceptee' and c.identite_revelee
 and r.organisation_id=public.mon_organisation()
 and ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,false))
   or (p.entreprise_id is not null and public.ec07_droit_entreprise(p.entreprise_id,false))
   or (j.entreprise_id is null and j.incube_id=auth.uid())
   or (p.entreprise_id is null and p.proprietaire_id=auth.uid()));
$fn$;

create or replace function public.demander_mise_en_relation(p_candidature_id uuid)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_ent uuid;v_org uuid;v_id uuid;
begin
 select j.entreprise_id,j.organisation_id into v_ent,v_org
 from public.candidatures c join public.projets j on j.id=c.projet_id
 where c.id=p_candidature_id;
 if v_org is null or v_org<>public.mon_organisation() then raise exception 'Candidature inaccessible'; end if;
 if v_ent is not null then
  return public.ec07_demander_relation(v_ent,p_candidature_id);
 end if;
 if public.mon_role()<>'incube' or not exists(
  select 1 from public.candidatures c join public.projets j on j.id=c.projet_id
  where c.id=p_candidature_id and j.incube_id=auth.uid() and c.statut='envoyee')
 then raise exception 'Demande interdite'; end if;
 insert into public.mises_en_relation(organisation_id,candidature_id)
 values(v_org,p_candidature_id) returning id into v_id;
 update public.candidatures set statut='relation_demandee' where id=p_candidature_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'demander_relation','mises_en_relation',v_id);
 return v_id;
end $fn$;

create or replace function public.publier_besoin(p_titre text,p_description text,p_budget_centimes integer)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_ent uuid;
begin
 select entreprise_id into v_ent from public.profiles where id=auth.uid();
 if v_ent is null then raise exception 'Associez votre compte a une startup avant publication'; end if;
 return public.ec07_publier_besoin(v_ent,p_titre,p_description,p_budget_centimes,'');
end $fn$;

-- Le parametrage des competences historiques suit les memes autorisations.
create or replace function public.ec_set_competences(p_cible text,p_id uuid,p_competences uuid[])
returns void language plpgsql security definer set search_path='' as $fn$
declare v_ent uuid;
begin
 if coalesce(array_length(p_competences,1),0)>15 then
  raise exception 'Maximum 15 competences';end if;
 if exists(select 1 from unnest(coalesce(p_competences,array[]::uuid[])) x
  where not exists(select 1 from public.competences_ec s where s.id=x and s.actif))
 then raise exception 'Competence inconnue';end if;
 if p_cible='prestataire' then
  select entreprise_id into v_ent from public.prestataires where id=p_id;
  if v_ent is null or not public.ec07_droit_entreprise(v_ent,true)
  then raise exception 'Prestataire inaccessible'; end if;
  delete from public.prestataire_competences_ec where prestataire_id=p_id;
  insert into public.prestataire_competences_ec(prestataire_id,competence_id)
  select p_id,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x)t;
 elsif p_cible='projet' then
  select entreprise_id into v_ent from public.projets where id=p_id;
  if not ((v_ent is not null and public.ec07_droit_entreprise(v_ent,true))
    or (v_ent is null and exists(select 1 from public.projets
       where id=p_id and incube_id=auth.uid() and organisation_id=public.mon_organisation())))
  then raise exception 'Projet inaccessible'; end if;
  delete from public.projet_competences_ec where projet_id=p_id;
  insert into public.projet_competences_ec(projet_id,competence_id)
  select p_id,x from (select distinct unnest(coalesce(p_competences,array[]::uuid[])) x)t;
 else raise exception 'Cible incorrecte'; end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'competences_actualisees',p_cible,p_id);
end $fn$;

-- Les disponibilites sont des ressources de l'entreprise prestataire.
create or replace function public.proposer_disponibilite(
 p_debut timestamptz,p_fin timestamptz,p_modalite text,p_lieu text default null)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_p public.prestataires%rowtype;v_id uuid;
begin
 select * into v_p from public.prestataires where id=public.mon_prestataire() for update;
 if not found or v_p.statut<>'valide'
 or not public.ec07_droit_entreprise(v_p.entreprise_id,true)
 then raise exception 'Prestataire non valide';end if;
 if p_debut<now()+interval '12 hours' or p_debut>now()+interval '90 days'
  or p_fin<=p_debut or p_fin>p_debut+interval '90 minutes'
 then raise exception 'Creneau hors delais';end if;
 if p_modalite not in('visio','telephone','sur_site') then raise exception 'Modalite invalide';end if;
 if exists(select 1 from public.disponibilites_rdv d
  where d.prestataire_id=v_p.id and tstzrange(d.debut,d.fin,'[)') && tstzrange(p_debut,p_fin,'[)'))
 then raise exception 'Creneau en conflit';end if;
 insert into public.disponibilites_rdv(prestataire_id,organisation_id,debut,fin,modalite,lieu_ou_lien)
 values(v_p.id,v_p.organisation_id,p_debut,p_fin,p_modalite,p_lieu) returning id into v_id;
 return v_id;
end $fn$;

-- Application en lecture seule des privileges explicites d'une entreprise :
-- chaque RPC doit etre revequee a PUBLIC (execute accorde par defaut en PostgreSQL).
revoke all on function public.ec07_droit_entreprise(uuid,boolean),
 public.ec07_est_assigne(uuid,uuid),public.ec07_droit_conversation(uuid,boolean),
 public.ec07_rattacher_besoin(uuid,uuid),public.ec07_lister_dossiers(uuid),
 public.ec07_besoins_disponibles(uuid,text),public.ec07_publier_besoin(uuid,text,text,integer,text),
 public.ec07_candidater(uuid,uuid,text),public.ec07_demander_relation(uuid,uuid),
 public.ec07_repondre_relation(uuid,uuid,boolean),public.ec07_ouvrir_conversation(uuid),
 public.ec07_envoyer_message(uuid,text),public.ec07_suivre_opportunite(uuid,text,text),
 public.ec07_assigner_dossier(uuid,uuid,uuid),public.ec07_historique(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.ec07_droit_entreprise(uuid,boolean),
 public.ec07_est_assigne(uuid,uuid),public.ec07_droit_conversation(uuid,boolean),
 public.ec07_rattacher_besoin(uuid,uuid),public.ec07_lister_dossiers(uuid),
 public.ec07_besoins_disponibles(uuid,text),public.ec07_publier_besoin(uuid,text,text,integer,text),
 public.ec07_candidater(uuid,uuid,text),public.ec07_demander_relation(uuid,uuid),
 public.ec07_repondre_relation(uuid,uuid,boolean),public.ec07_ouvrir_conversation(uuid),
 public.ec07_envoyer_message(uuid,text),public.ec07_suivre_opportunite(uuid,text,text),
 public.ec07_assigner_dossier(uuid,uuid,uuid),public.ec07_historique(uuid,uuid)
 to authenticated;

commit;
