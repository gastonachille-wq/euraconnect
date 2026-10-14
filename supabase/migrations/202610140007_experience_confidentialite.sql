-- EURACONNECT V0.8 | UX, confidentialite asymetrique, suivi des besoins et rendez-vous.
-- NON DESTRUCTIF sur les donnees : conserver comptes, entreprises, offres, candidatures.
-- APRES 202610140006_collaboration_dossiers.sql. Tester en recette.
begin;

-- 1. Les besoins ont un statut public independant de l'etat technique publie/archive.
-- Le texte anonymise est explicite. Les annonces anciennes deviennent GENERIQUES
-- jusqu'a la publication volontaire d'un resume par leur proprietaire.
alter table public.projets
 add column if not exists alias_demandeur text not null default ('Startup #'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 add column if not exists titre_anonyme text not null default 'Besoin d expertise professionnelle',
 add column if not exists annonce_anonyme text not null default 'Une startup recherche un prestataire. Contactez la plateforme pour obtenir plus de precisions.',
 add column if not exists statut_suivi text not null default 'ouvert',
 add column if not exists statut_modifie_le timestamptz not null default now(),
 add column if not exists reouvert_le timestamptz,
 add column if not exists motif_cloture text;
alter table public.projets drop constraint if exists ec08_statut_suivi_check;
alter table public.projets add constraint ec08_statut_suivi_check
 check(statut_suivi in ('ouvert','en_echanges','rdv_planifie','devis_recu','en_realisation','termine','en_pause','sans_suite','reouvert'));
alter table public.projets drop constraint if exists ec08_titre_anon_check;
alter table public.projets add constraint ec08_titre_anon_check check(char_length(titre_anonyme) between 8 and 150);
alter table public.projets drop constraint if exists ec08_annonce_anon_check;
alter table public.projets add constraint ec08_annonce_anon_check check(char_length(annonce_anonyme) between 50 and 1500);
create index if not exists ec08_projets_statut_idx on public.projets(organisation_id,statut_suivi,created_at desc);

create table if not exists public.ec08_historique_besoins (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 projet_id uuid not null references public.projets(id),
 ancien_statut text not null,
 nouveau_statut text not null,
 acteur_id uuid not null references public.profiles(id),
 commentaire text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists ec08_historique_projet on public.ec08_historique_besoins(projet_id,created_at desc);
alter table public.ec08_historique_besoins enable row level security;
revoke all on public.ec08_historique_besoins from public,anon,authenticated;
-- La chronologie detaillee est consulte via RPC controlee par l'entreprise.

-- Seule la vue logicielle de l'incube peut consulter l'identite d'un demandeur.
-- Aucun SELECT brut des projets pour les prestataires, meme si PREMIUM.
drop policy if exists ec07_projets_lecture on public.projets;
drop policy if exists projets_read on public.projets;
create policy ec08_projets_prives on public.projets
 for select to authenticated using (
  public.est_admin()
  or (entreprise_id is not null and public.ec07_droit_entreprise(entreprise_id,false))
  or (entreprise_id is null and incube_id=auth.uid()
      and organisation_id=public.mon_organisation())
 );

create or replace function public.ec08_premium_entreprise(p_entreprise uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(
  select 1 from public.prestataires p
  where p.entreprise_id=p_entreprise and p.plan_code='premium' and p.statut='valide'
   and p.organisation_id=public.mon_organisation()
   and public.ec07_droit_entreprise(p_entreprise,false)
 );
$fn$;

-- Aucun texte libre cense etre anonyme ne doit comporter les identifiants les plus courants.
-- Une moderation humaine reste necessaire pour les indices indirects.
create or replace function public.ec08_annonce_sure(p_titre text,p_resume text,p_entreprise uuid)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
declare v_nom text;
begin
 if char_length(trim(coalesce(p_titre,''))) not between 8 and 150
    or char_length(trim(coalesce(p_resume,''))) not between 50 and 1500 then return false; end if;
 if (p_titre||' '||p_resume) ~* '([[:alnum:]._%+\-]+@[[:alnum:].\-]+\.[[:alpha:]]{2,}|https?://|www\.|\+33[0-9 .-]{8,}|0[1-9]([ .-]?[0-9]{2}){4})'
 then return false; end if;
 select nom into v_nom from public.entreprises_ec where id=p_entreprise;
 if v_nom is not null and char_length(trim(v_nom))>=4
    and position(lower(trim(v_nom)) in lower(p_titre||' '||p_resume))>0
 then return false; end if;
 return true;
end $fn$;

-- Nouvelle publication : details complets prives + resume anonyme verifie.
create or replace function public.ec08_publier_besoin(
 p_entreprise uuid,p_titre text,p_description text,p_titre_anonyme text,
 p_annonce_anonyme text,p_budget_centimes integer default null,p_html text default '')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;v_org uuid;
begin
 if not public.ec07_droit_entreprise(p_entreprise,true)
   or not exists(select 1 from public.entreprises_ec where id=p_entreprise and type='startup')
 then raise exception 'Gestionnaire de startup requis'; end if;
 if char_length(trim(coalesce(p_titre,''))) not between 8 and 150
   or char_length(trim(coalesce(p_description,''))) not between 50 and 10000
   or char_length(coalesce(p_html,''))>16000
   or p_budget_centimes<0 then raise exception 'Demande invalide'; end if;
 if not public.ec08_annonce_sure(p_titre_anonyme,p_annonce_anonyme,p_entreprise)
 then raise exception 'L annonce anonyme doit contenir 50 a 1500 caracteres sans email, site, telephone ni nom de la startup'; end if;
 select organisation_id into v_org from public.entreprises_ec where id=p_entreprise;
 insert into public.projets(organisation_id,incube_id,entreprise_id,titre,description,description_html,
    titre_anonyme,annonce_anonyme,budget_centimes,statut_suivi)
 values(v_org,auth.uid(),p_entreprise,trim(p_titre),trim(p_description),coalesce(p_html,''),
    trim(p_titre_anonyme),trim(p_annonce_anonyme),p_budget_centimes,'ouvert') returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'ec08_publier_besoin','projets',v_id);
 return v_id;
end $fn$;

-- Compatibilite pour les anciens boutons : PAS de copie de la description privee
-- dans l'annonce consultable par les prestataires non premium.
create or replace function public.ec07_publier_besoin(
 p_entreprise uuid,p_titre text,p_description text,p_budget_centimes integer default null,
 p_html text default '')
returns uuid language plpgsql security definer set search_path='' as $fn$
begin
 return public.ec08_publier_besoin(p_entreprise,p_titre,p_description,
  'Besoin d expertise professionnelle',
  'Une startup cherche un prestataire pour un projet. La description detaillee est reservee aux comptes Premium.',
  p_budget_centimes,p_html);
end $fn$;

create or replace function public.ec08_mes_besoins(p_entreprise uuid default null)
returns table(id uuid,entreprise_id uuid,titre text,titre_anonyme text,description text,
 annonce_anonyme text,budget_centimes integer,statut_suivi text,statut text,
 nb_reponses bigint,created_at timestamptz,statut_modifie_le timestamptz)
language sql stable security definer set search_path='' as $fn$
 select j.id,j.entreprise_id,j.titre,j.titre_anonyme,j.description,j.annonce_anonyme,
   j.budget_centimes,j.statut_suivi,j.statut,
   (select count(*) from public.candidatures c where c.projet_id=j.id),
   j.created_at,j.statut_modifie_le
 from public.projets j
 where j.organisation_id=public.mon_organisation()
  and ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,false))
    or (j.entreprise_id is null and j.incube_id=auth.uid()))
  and (p_entreprise is null or j.entreprise_id=p_entreprise)
 order by j.created_at desc limit 200;
$fn$;

create or replace function public.ec08_modifier_annonce(
 p_besoin uuid,p_titre_anonyme text,p_annonce_anonyme text)
returns void language plpgsql security definer set search_path='' as $fn$
declare v_j public.projets%rowtype;
begin
 select * into v_j from public.projets where id=p_besoin for update;
 if not found or v_j.entreprise_id is null or not public.ec07_droit_entreprise(v_j.entreprise_id,true)
 then raise exception 'Demande non modifiable'; end if;
 if not public.ec08_annonce_sure(p_titre_anonyme,p_annonce_anonyme,v_j.entreprise_id)
 then raise exception 'Annonce non anonyme : retirez noms, emails, sites et telephones'; end if;
 update public.projets set titre_anonyme=trim(p_titre_anonyme),annonce_anonyme=trim(p_annonce_anonyme)
 where id=p_besoin;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'ec08_modifier_annonce','projets',p_besoin);
end $fn$;

-- Etats visibles par tous les membres connectes, sans leur livrer l'identite du demandeur.
create or replace function public.ec08_changer_statut_besoin(
 p_besoin uuid,p_statut text,p_commentaire text default '')
returns void language plpgsql security definer set search_path='' as $fn$
declare j public.projets%rowtype;v_allowed boolean;
begin
 select * into j from public.projets where id=p_besoin for update;
 if not found or j.organisation_id<>public.mon_organisation() or
    not ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,true))
     or (j.entreprise_id is null and j.incube_id=auth.uid() and public.mon_role()='incube'))
 then raise exception 'Modification non autorisee'; end if;
 if j.statut_suivi=p_statut then return; end if;
 v_allowed:=case j.statut_suivi
  when 'ouvert' then p_statut in ('en_echanges','en_pause','sans_suite')
  when 'reouvert' then p_statut in ('en_echanges','en_pause','sans_suite')
  when 'en_echanges' then p_statut in ('rdv_planifie','devis_recu','en_pause','sans_suite')
  when 'rdv_planifie' then p_statut in ('en_echanges','devis_recu','en_pause','sans_suite')
  when 'devis_recu' then p_statut in ('en_echanges','en_realisation','en_pause','sans_suite')
  when 'en_realisation' then p_statut in ('termine','en_pause','sans_suite')
  when 'en_pause' then p_statut in ('reouvert','sans_suite')
  when 'sans_suite' then p_statut='reouvert'
  when 'termine' then p_statut='reouvert'
  else false end;
 if not coalesce(v_allowed,false) then raise exception 'Transition de statut non autorisee'; end if;
 if char_length(coalesce(p_commentaire,''))>500 then raise exception 'Commentaire trop long'; end if;
 if p_statut in('termine','sans_suite') and char_length(trim(coalesce(p_commentaire,'')))<5
 then raise exception 'Indiquez le motif de cloture (5 caracteres minimum)'; end if;
 update public.projets set statut_suivi=p_statut,statut_modifie_le=now(),
  reouvert_le=case when p_statut='reouvert' then now() else reouvert_le end,
  motif_cloture=case when p_statut in('termine','sans_suite') then trim(p_commentaire) else null end
 where id=p_besoin;
 insert into public.ec08_historique_besoins(organisation_id,projet_id,ancien_statut,nouveau_statut,acteur_id,commentaire)
 values(j.organisation_id,p_besoin,j.statut_suivi,p_statut,auth.uid(),coalesce(p_commentaire,''));
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec08_statut_besoin','projets',p_besoin,
  jsonb_build_object('avant',j.statut_suivi,'apres',p_statut));
end $fn$;

create or replace function public.ec08_historique_besoin(p_besoin uuid)
returns table(ancien_statut text,nouveau_statut text,commentaire text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if not exists(select 1 from public.projets j where j.id=p_besoin and
    ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,false))
      or (j.entreprise_id is null and j.incube_id=auth.uid())))
 then raise exception 'Besoin inaccessible'; end if;
 return query select h.ancien_statut,h.nouveau_statut,h.commentaire,h.created_at
 from public.ec08_historique_besoins h where h.projet_id=p_besoin order by h.created_at desc;
end $fn$;

-- Une candidature ne peut pas etre deposee sur un besoin arrete ou en execution.
create or replace function public.ec08_verifier_candidature() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if not exists(select 1 from public.projets j where j.id=new.projet_id
  and j.statut='publie' and j.statut_suivi in ('ouvert','reouvert','en_echanges','rdv_planifie','devis_recu'))
 then raise exception 'Ce besoin n accepte plus de nouvelles reponses'; end if;
 return new;
end $fn$;
drop trigger if exists ec08_controle_candidature on public.candidatures;
create trigger ec08_controle_candidature before insert on public.candidatures
for each row execute function public.ec08_verifier_candidature();

-- 2. Lecture du marche uniquement par RPC, avec une identite visible aux seuls Premium.
create or replace function public.ec08_fil_besoins(
 p_entreprise uuid default null,p_recherche text default '',p_filtre_statut text default '')
returns table(id uuid,titre text,description text,budget_centimes integer,
 statut_suivi text,score integer,deja_repondu boolean,demandeur text,
 identite_visible boolean,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
declare v_prest uuid;v_premium boolean:=false;
begin
 if public.mon_organisation() is null or public.mon_role() is null
   or char_length(coalesce(p_recherche,''))>120
 then raise exception 'Recherche inaccessible'; end if;
 if p_filtre_statut<>'' and p_filtre_statut not in
   ('ouvert','en_echanges','rdv_planifie','devis_recu','en_realisation','termine','en_pause','sans_suite','reouvert')
 then raise exception 'Statut invalide'; end if;
 if p_entreprise is not null then
   if not public.ec07_droit_entreprise(p_entreprise,false)
      or not exists(select 1 from public.entreprises_ec where id=p_entreprise and type='prestataire')
   then raise exception 'Entreprise prestataire inaccessible'; end if;
   select p.id into v_prest from public.prestataires p
   where p.entreprise_id=p_entreprise and p.statut='valide';
   v_premium:=public.ec08_premium_entreprise(p_entreprise);
 end if;
 return query
 select j.id,
  case when v_premium then j.titre else j.titre_anonyme end,
  case when v_premium then j.description else j.annonce_anonyme end,
  j.budget_centimes,j.statut_suivi,
  case when v_prest is not null then
   (select (least(count(*),3)*30)::integer from public.projet_competences_ec pc
    join public.prestataire_competences_ec ps on ps.competence_id=pc.competence_id
    where pc.projet_id=j.id and ps.prestataire_id=v_prest)
   else 0 end
   +case when trim(coalesce(p_recherche,''))<>'' and
    (j.titre_anonyme ilike '%'||trim(p_recherche)||'%' or j.annonce_anonyme ilike '%'||trim(p_recherche)||'%')
    then 25 else 0 end as score,
  v_prest is not null and exists(select 1 from public.candidatures ca
      where ca.projet_id=j.id and ca.prestataire_id=v_prest),
  case when v_premium then coalesce(e.nom,nullif(pr.nom,''),'Startup')
       else j.alias_demandeur end,
  v_premium,j.created_at
 from public.projets j
 left join public.entreprises_ec e on e.id=j.entreprise_id
 left join public.profiles pr on pr.id=j.incube_id
 where j.organisation_id=public.mon_organisation()
  and j.statut='publie'
  and (p_filtre_statut='' or j.statut_suivi=p_filtre_statut)
  and (p_entreprise is null or j.entreprise_id is distinct from p_entreprise)
  and (trim(coalesce(p_recherche,''))='' or
    j.titre_anonyme ilike '%'||trim(p_recherche)||'%' or
    j.annonce_anonyme ilike '%'||trim(p_recherche)||'%')
 order by 6 desc,j.created_at desc limit 100;
end $fn$;

-- Les anciennes fonctions de recherche restent appelables, mais ne diffusent
-- plus la description privee aux comptes Free/Pro.
create or replace function public.ec07_besoins_disponibles(
 p_entreprise uuid,p_recherche text default '')
returns table(id uuid,titre text,description text,budget_centimes integer,
 score integer,deja_repondu boolean,created_at timestamptz)
language sql stable security definer set search_path='' as $fn$
 select b.id,b.titre,b.description,b.budget_centimes,b.score,b.deja_repondu,b.created_at
 from public.ec08_fil_besoins(p_entreprise,p_recherche,'') b
 where b.statut_suivi in('ouvert','reouvert','en_echanges','rdv_planifie','devis_recu');
$fn$;

create or replace function public.ec_matching_besoins(p_texte text default '',p_limite integer default 30)
returns table(projet_id uuid,titre text,description text,score integer,raisons text[])
language plpgsql stable security definer set search_path='' as $fn$
declare v_ent uuid;
begin
 select p.entreprise_id into v_ent from public.prestataires p
 where p.id=public.mon_prestataire() and p.statut='valide';
 if v_ent is null then raise exception 'Prestataire autorise requis'; end if;
 return query select b.id,b.titre,b.description,b.score,
  array['Competences et termes du besoin']::text[]
 from public.ec08_fil_besoins(v_ent,p_texte,'') b
 where b.statut_suivi in('ouvert','reouvert','en_echanges','rdv_planifie','devis_recu')
 limit least(greatest(coalesce(p_limite,30),1),100);
end $fn$;

-- L'incube voit le NOM du prestataire a la premiere reponse, meme en Free.
create or replace function public.lister_mes_candidatures()
returns table(id uuid,projet_id uuid,alias text,message text,statut text,
 identite_revelee boolean,prestataire_nom text,mise_en_relation text)
language sql stable security definer set search_path='' as $fn$
 select c.id,c.projet_id,c.alias,c.message,c.statut,true,p.nom_public,m.statut
 from public.candidatures c
 join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 left join public.mises_en_relation m on m.candidature_id=c.id
 where public.mon_role()='incube' and j.organisation_id=public.mon_organisation()
  and ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,false))
   or (j.entreprise_id is null and j.incube_id=auth.uid()));
$fn$;

-- Les anciennes boites de dossiers retournent des noms corrects aux deux parties.
create or replace function public.ec07_lister_dossiers(p_entreprise uuid)
returns table(dossier_id uuid,nature text,projet_id uuid,titre text,candidature_id uuid,
 proposition text,candidat text,statut_candidature text,relation_id uuid,statut_relation text,
 conversation_id uuid,statut_opportunite text,assigne_a uuid,assigne_nom text,cree_le timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
declare v_type text;v_premium boolean:=false;
begin
 if not public.ec07_droit_entreprise(p_entreprise,false) then
   raise exception 'Entreprise inaccessible'; end if;
 select type into v_type from public.entreprises_ec where id=p_entreprise;
 if v_type='startup' then
  return query
  select coalesce(c.id,j.id),'besoin'::text,j.id,j.titre,c.id,c.message,
   case when c.id is null then null else p.nom_public end::text,
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
  v_premium:=public.ec08_premium_entreprise(p_entreprise);
  return query
  select c.id,'candidature'::text,j.id,
   case when v_premium then j.titre else j.titre_anonyme end,
   c.id,c.message,
   case when v_premium then coalesce(e.nom,nullif(owner.nom,''),'Startup')
        else j.alias_demandeur end::text,
   c.statut,r.id,r.statut,cv.id,o.statut,a.assigne_a,
   coalesce(nullif(pr.nom,''),'Collaborateur')::text,c.created_at
  from public.prestataires p
  join public.candidatures c on c.prestataire_id=p.id
  join public.projets j on j.id=c.projet_id
  left join public.entreprises_ec e on e.id=j.entreprise_id
  left join public.profiles owner on owner.id=j.incube_id
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

-- Les notes internes de suivi peuvent contenir des noms ou des coordonnees.
-- On refuse leur lecture brute aux prestataires Free/Pro; les ecrans n'exposent
-- que le statut via ec07_lister_dossiers. La startup voit sa propre note.
drop policy if exists ec07_opportunites_lecture on public.opportunites_ec;
create policy ec08_opportunites_privees on public.opportunites_ec for select to authenticated
 using(exists(
  select 1 from public.mises_en_relation r
  join public.candidatures c on c.id=r.candidature_id
  join public.projets j on j.id=c.projet_id
  join public.prestataires p on p.id=c.prestataire_id
  where r.id=opportunites_ec.relation_id
   and (public.ec07_droit_entreprise(j.entreprise_id,false)
     or (j.entreprise_id is null and j.incube_id=auth.uid())
     or public.ec08_premium_entreprise(p.entreprise_id))
 ));

-- 3. Anciennes lectures directes : aucune extraction des UUID incubes par prestataire Free/Pro.
create or replace function public.ec08_conversation_brute_autorisee(p_conversation uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(
  select 1 from public.conversations_ec cv
  join public.mises_en_relation r on r.id=cv.relation_id
  join public.candidatures c on c.id=r.candidature_id
  join public.projets j on j.id=c.projet_id
  join public.prestataires p on p.id=c.prestataire_id
  where cv.id=p_conversation and public.ec07_droit_conversation(cv.id,false)
   and ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,false))
     or (j.entreprise_id is null and j.incube_id=auth.uid())
     or (p.entreprise_id is not null and public.ec08_premium_entreprise(p.entreprise_id))
     or (p.entreprise_id is null and p.proprietaire_id=auth.uid() and p.plan_code='premium'))
 );
$fn$;
drop policy if exists ec07_conversations_lecture on public.conversations_ec;
drop policy if exists ec07_messages_lecture on public.messages_ec;
create policy ec08_conversation_direct on public.conversations_ec
 for select to authenticated using (public.ec08_conversation_brute_autorisee(id));
create policy ec08_messages_direct on public.messages_ec
 for select to authenticated using (public.ec08_conversation_brute_autorisee(conversation_id));

create or replace function public.ec08_lister_messages(p_conversation uuid)
returns table(id uuid,auteur_id uuid,auteur_libelle text,corps text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $fn$
declare v_provider_ent uuid;v_incube_ent uuid;v_premium boolean:=false;v_startup_name text;
begin
 if not public.ec07_droit_conversation(p_conversation,false)
 then raise exception 'Conversation inaccessible'; end if;
 select p.entreprise_id,j.entreprise_id into v_provider_ent,v_incube_ent
 from public.conversations_ec cv
 join public.mises_en_relation r on r.id=cv.relation_id
 join public.candidatures c on c.id=r.candidature_id
 join public.prestataires p on p.id=c.prestataire_id
 join public.projets j on j.id=c.projet_id where cv.id=p_conversation;
 v_premium:=public.ec08_premium_entreprise(v_provider_ent);
 select nom into v_startup_name from public.entreprises_ec where id=v_incube_ent;
 return query
 select m.id,
   case when m.auteur_id=auth.uid() or not public.ec07_droit_entreprise(v_provider_ent,false)
          or v_premium then m.auteur_id else null end,
   case when m.auteur_id=auth.uid() then 'Vous'
    when exists(select 1 from public.entreprise_membres_ec mb where mb.profile_id=m.auteur_id
      and mb.entreprise_id=v_provider_ent and mb.actif)
      then (select e.nom from public.entreprises_ec e where e.id=v_provider_ent)
    when v_premium then coalesce((select e.nom from public.entreprises_ec e where e.id=v_incube_ent),'Equipe startup')
    else 'Equipe startup (confidentielle)' end,
   case when public.ec07_droit_entreprise(v_provider_ent,false) and not v_premium
      and not exists(select 1 from public.entreprise_membres_ec mb
          where mb.profile_id=m.auteur_id and mb.entreprise_id=v_provider_ent and mb.actif)
      and (m.corps ~* '([[:alnum:]._%+\-]+@[[:alnum:].\-]+\.[[:alpha:]]{2,}|https?://|www\.|\+33[0-9 .-]{8,}|0[1-9]([ .-]?[0-9]{2}){4})'
       or (char_length(coalesce(v_startup_name,''))>=4 and position(lower(v_startup_name) in lower(m.corps))>0))
    then '[Message historique masqué : informations identifiantes. Demandez une reformulation.]'
    else m.corps end::text,m.created_at
 from public.messages_ec m where m.conversation_id=p_conversation order by m.created_at asc limit 200;
end $fn$;

-- L'incube ne peut transmettre de contacts directs dans une conversation avec un
-- prestataire non Premium ; cela limite (sans supprimer) le risque d'auto-identification.
create or replace function public.ec07_envoyer_message(p_conversation uuid,p_corps text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_org uuid;v_id uuid;v_candidate uuid;v_startup uuid;v_prest uuid;
 v_startup_name text;
begin
 if not public.ec07_droit_conversation(p_conversation,true)
 then raise exception 'Ecriture interdite (attribution ou gestion requise)'; end if;
 if char_length(trim(coalesce(p_corps,''))) not between 1 and 4000
 then raise exception 'Message invalide'; end if;
 select cv.organisation_id,c.id,j.entreprise_id,p.entreprise_id,e.nom
 into v_org,v_candidate,v_startup,v_prest,v_startup_name
 from public.conversations_ec cv
 join public.mises_en_relation r on r.id=cv.relation_id
 join public.candidatures c on c.id=r.candidature_id
 join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 left join public.entreprises_ec e on e.id=j.entreprise_id
 where cv.id=p_conversation;
 if public.ec07_droit_entreprise(v_startup,false) and not public.ec08_premium_entreprise(v_prest)
 then
  if p_corps ~* '([[:alnum:]._%+\-]+@[[:alnum:].\-]+\.[[:alpha:]]{2,}|https?://|www\.|\+33[0-9 .-]{8,}|0[1-9]([ .-]?[0-9]{2}){4})'
     or (char_length(coalesce(v_startup_name,''))>=4 and position(lower(v_startup_name) in lower(p_corps))>0)
  then raise exception 'Pour conserver votre anonymat, retirez coordonnees et nom de startup du message'; end if;
 end if;
 insert into public.messages_ec(organisation_id,conversation_id,auteur_id,corps)
 values(v_org,p_conversation,auth.uid(),trim(p_corps)) returning id into v_id;
 if public.ec07_droit_entreprise(v_startup,false) then
  insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action)
  values(v_org,v_startup,v_candidate,auth.uid(),'message');
 elsif public.ec07_droit_entreprise(v_prest,false) then
  insert into public.ec07_historique_dossiers(organisation_id,entreprise_id,candidature_id,auteur_id,action)
  values(v_org,v_prest,v_candidate,auth.uid(),'message');
 end if;
 return v_id;
end $fn$;

-- 4. Rendez-vous contextualises : qui, quand, pourquoi, modalite, expert et statut.
alter table public.disponibilites_rdv
 add column if not exists intervenant_id uuid references public.profiles(id);
update public.disponibilites_rdv d set intervenant_id=p.proprietaire_id
 from public.prestataires p where d.prestataire_id=p.id and d.intervenant_id is null;
alter table public.reservations_rdv
 add column if not exists startup_entreprise_id uuid references public.entreprises_ec(id),
 add column if not exists alias_demandeur text not null default ('Startup #'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 add column if not exists objet_public text not null default 'Rendez-vous d expertise',
 add column if not exists details_prives text not null default '',
 add column if not exists projet_id uuid references public.projets(id),
 add column if not exists annule_par uuid references public.profiles(id),
 add column if not exists annule_le timestamptz,
 add column if not exists motif_annulation text not null default '';
update public.reservations_rdv r set startup_entreprise_id=p.entreprise_id
 from public.profiles p join public.entreprises_ec e on e.id=p.entreprise_id
 where r.incubateur_id=p.id and e.type='startup' and r.startup_entreprise_id is null;
create index if not exists ec08_reservations_startup on public.reservations_rdv(startup_entreprise_id,created_at desc);
alter table public.reservations_rdv drop constraint if exists ec08_objet_check;
alter table public.reservations_rdv add constraint ec08_objet_check
 check(char_length(objet_public) between 5 and 120 and char_length(details_prives)<=1000);
-- La contrainte unique historique empechait de re-reserver un creneau annule.
alter table public.reservations_rdv drop constraint if exists reservations_rdv_disponibilite_id_key;
create unique index if not exists ec08_un_rdv_actif_par_creneau
 on public.reservations_rdv(disponibilite_id) where statut='confirme';
create index if not exists ec08_reservations_incube on public.reservations_rdv(incubateur_id,created_at desc);

-- Pas de lecture des identifiants de l'incube via reservations_rdv par le prestataire.
drop policy if exists reservation_select on public.reservations_rdv;
create policy ec08_reservation_privee on public.reservations_rdv for select to authenticated
 using(incubateur_id=auth.uid() or public.est_admin());
-- Pas de lien de visio / lieu extrait avant reservation : les creneaux sont des
-- documents prives, exposes seulement par une fonction serveur expurgee.
drop policy if exists dispo_select on public.disponibilites_rdv;
create policy ec08_disponibilite_privee on public.disponibilites_rdv for select to authenticated
 using(public.est_admin() or exists(
  select 1 from public.prestataires p where p.id=prestataire_id
   and public.ec07_droit_entreprise(p.entreprise_id,false)));

create or replace function public.ec08_proposer_creneau(
 p_debut timestamptz,p_fin timestamptz,p_modalite text,
 p_lieu text default null,p_intervenant uuid default null)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_p public.prestataires%rowtype;v_id uuid;v_expert uuid;
begin
 select * into v_p from public.prestataires where id=public.mon_prestataire() for update;
 if not found or v_p.statut<>'valide' or not public.ec07_droit_entreprise(v_p.entreprise_id,true)
 then raise exception 'Entreprise prestataire validee et permission requises'; end if;
 if p_debut<now()+interval '12 hours' or p_debut>now()+interval '90 days'
    or p_fin<=p_debut or p_fin>p_debut+interval '90 minutes'
    or extract(epoch from (p_fin-p_debut))/60 not in (15,30,45,60,90)
 then raise exception 'Creneau invalide (12 h a 90 j, duree 15 a 90 min)'; end if;
 if p_modalite not in ('visio','telephone','sur_site') or char_length(coalesce(p_lieu,''))>600
 then raise exception 'Modalite ou lieu invalide'; end if;
 v_expert:=coalesce(p_intervenant,auth.uid());
 if not exists(select 1 from public.entreprise_membres_ec m where m.entreprise_id=v_p.entreprise_id
  and m.profile_id=v_expert and m.actif)
 then raise exception 'Intervenant non membre de l entreprise'; end if;
 if exists(select 1 from public.disponibilites_rdv d where d.prestataire_id=v_p.id
    and tstzrange(d.debut,d.fin,'[)') && tstzrange(p_debut,p_fin,'[)'))
 then raise exception 'Un creneau se chevauche deja'; end if;
 insert into public.disponibilites_rdv(prestataire_id,organisation_id,debut,fin,
   modalite,lieu_ou_lien,intervenant_id)
 values(v_p.id,v_p.organisation_id,p_debut,p_fin,p_modalite,p_lieu,v_expert) returning id into v_id;
 return v_id;
end $fn$;

create or replace function public.ec08_lister_creneaux()
returns table(id uuid,debut timestamptz,fin timestamptz,
 prestataire_nom text,logo_path text,intervenant_nom text,avatar_path text,
 modalite text,est_reserve boolean,est_mien boolean,lieu_ou_lien text)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if public.mon_organisation() is null or public.mon_role() is null
 then raise exception 'Connexion requise'; end if;
 return query select d.id,d.debut,d.fin,p.nom_public,e.logo_path,
   coalesce(nullif(pa.nom_public,''),nullif(pr.nom,''),'Expert')::text,
   pa.avatar_path,d.modalite,
   exists(select 1 from public.reservations_rdv r where r.disponibilite_id=d.id and r.statut='confirme'),
   exists(select 1 from public.prestataires px where px.id=d.prestataire_id
    and public.ec07_droit_entreprise(px.entreprise_id,false)),
   case when public.est_admin() or public.ec07_droit_entreprise(p.entreprise_id,false)
      or exists(select 1 from public.reservations_rdv r where r.disponibilite_id=d.id
          and r.incubateur_id=auth.uid() and r.statut='confirme')
    then d.lieu_ou_lien else null end
 from public.disponibilites_rdv d
 join public.prestataires p on p.id=d.prestataire_id
 left join public.entreprises_ec e on e.id=p.entreprise_id
 left join public.profiles pr on pr.id=d.intervenant_id
 left join public.personnes_annuaire_ec pa on pa.profile_id=d.intervenant_id
 where d.organisation_id=public.mon_organisation() and p.statut='valide'
   and d.debut>now()-interval '3 hours' and d.debut<now()+interval '90 days'
 order by d.debut asc limit 240;
end $fn$;

create or replace function public.ec08_reserver_rdv(
 p_creneau uuid,p_objet text,p_details text default '',p_besoin uuid default null)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_d public.disponibilites_rdv%rowtype;v_p public.prestataires%rowtype;v_id uuid;v_startup uuid;v_before text;
begin
 if public.mon_role()<>'incube' then raise exception 'Reservation reservee aux startups'; end if;
 if p_objet not in ('Decouverte de prestation','Cadrage de besoin',
    'Evaluation de solution','Suivi de proposition','Rendez-vous d expertise')
    or char_length(coalesce(p_details,''))>1000 then raise exception 'Objet ou details invalides'; end if;
 select * into v_d from public.disponibilites_rdv where id=p_creneau for update;
 if not found or v_d.organisation_id<>public.mon_organisation()
   or v_d.debut<now()+interval '12 hours' then raise exception 'Creneau indisponible'; end if;
 select * into v_p from public.prestataires where id=v_d.prestataire_id and statut='valide';
 if not found then raise exception 'Prestataire indisponible'; end if;
 if p_besoin is not null and not exists(select 1 from public.projets j where j.id=p_besoin
  and j.organisation_id=public.mon_organisation() and
  ((j.entreprise_id is not null and public.ec07_droit_entreprise(j.entreprise_id,true))
   or (j.entreprise_id is null and j.incube_id=auth.uid())))
 then raise exception 'Besoin non accessible'; end if;
 if p_besoin is not null then
  select j.entreprise_id into v_startup from public.projets j where j.id=p_besoin;
 else
  select e.id into v_startup from public.entreprises_ec e
  join public.entreprise_membres_ec mb on mb.entreprise_id=e.id
  where e.type='startup' and mb.profile_id=auth.uid() and mb.actif
   and e.organisation_id=public.mon_organisation()
  order by case when e.id=(select entreprise_id from public.profiles where id=auth.uid()) then 0 else 1 end
  limit 1;
 end if;
 if exists(select 1 from public.reservations_rdv r
   where r.disponibilite_id=p_creneau and r.statut='confirme')
 then raise exception 'Ce creneau vient d etre reserve'; end if;
 insert into public.reservations_rdv(disponibilite_id,incubateur_id,organisation_id,
  startup_entreprise_id,objet_public,details_prives,projet_id)
 values(p_creneau,auth.uid(),v_d.organisation_id,v_startup,p_objet,coalesce(p_details,''),p_besoin)
 returning id into v_id;
 if p_besoin is not null then
  select statut_suivi into v_before from public.projets where id=p_besoin for update;
  if v_before in ('ouvert','reouvert','en_echanges') then
   update public.projets set statut_suivi='rdv_planifie',statut_modifie_le=now() where id=p_besoin;
   insert into public.ec08_historique_besoins(organisation_id,projet_id,ancien_statut,nouveau_statut,acteur_id,commentaire)
   values(v_d.organisation_id,p_besoin,v_before,'rdv_planifie',auth.uid(),'Rendez-vous reserve');
  end if;
 end if;
 insert into public.notifications_ec(destinataire_id,organisation_id,titre,contenu)
 values(coalesce(v_d.intervenant_id,v_p.proprietaire_id),v_d.organisation_id,
  'Rendez-vous reserve',p_objet||' - '||to_char(v_d.debut at time zone 'Europe/Paris','DD/MM/YYYY HH24:MI'));
 insert into public.audit_log(acteur_id,action,cible_type,cible_id)
 values(auth.uid(),'ec08_reserver_rdv','reservations_rdv',v_id);
 return v_id;
end $fn$;

-- Compatibilite V0.3 : l'ancien bouton reserve toujours de facon transactionnelle.
create or replace function public.reserver_disponibilite(p_disponibilite uuid)
returns uuid language plpgsql security definer set search_path='' as $fn$
begin
 return public.ec08_reserver_rdv(p_disponibilite,'Rendez-vous d expertise','',null);
end $fn$;

create or replace function public.ec08_lister_rdv()
returns table(id uuid,debut timestamptz,fin timestamptz,prestataire_nom text,
 prestataire_logo text,intervenant_nom text,intervenant_avatar text,participant_nom text,
 objet text,details text,besoin_titre text,modalite text,lieu_ou_lien text,
 statut text,je_suis_incube boolean,demandeur_masque boolean)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if public.mon_role() is null then raise exception 'Connexion requise';end if;
 return query select r.id,d.debut,d.fin,p.nom_public,e.logo_path,
  coalesce(nullif(pa.nom_public,''),nullif(exp.nom,''),'Expert')::text,pa.avatar_path,
  case when (r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false)) or public.ec08_premium_entreprise(p.entreprise_id)
    then coalesce(nullif(inc.nom,''),'Incube') else coalesce(j.alias_demandeur,r.alias_demandeur) end::text,
  r.objet_public,
  case when (r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false)) or public.ec08_premium_entreprise(p.entreprise_id)
    then r.details_prives else '' end::text,
  case when r.projet_id is null then null
       when (r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false)) or public.ec08_premium_entreprise(p.entreprise_id)
       then j.titre else j.titre_anonyme end::text,
  d.modalite,
  case when (r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false)) or public.ec07_droit_entreprise(p.entreprise_id,false)
    then d.lieu_ou_lien else null end::text,
  r.statut,((r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false))),
  not ((r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false)) or public.ec08_premium_entreprise(p.entreprise_id))
 from public.reservations_rdv r
 join public.disponibilites_rdv d on d.id=r.disponibilite_id
 join public.prestataires p on p.id=d.prestataire_id
 left join public.entreprises_ec e on e.id=p.entreprise_id
 left join public.profiles inc on inc.id=r.incubateur_id
 left join public.profiles exp on exp.id=d.intervenant_id
 left join public.personnes_annuaire_ec pa on pa.profile_id=d.intervenant_id
 left join public.projets j on j.id=r.projet_id
 where r.organisation_id=public.mon_organisation() and
   ((r.incubateur_id=auth.uid() or public.ec07_droit_entreprise(r.startup_entreprise_id,false)) or
    (p.entreprise_id is not null and public.ec07_droit_entreprise(p.entreprise_id,false))
    or (p.entreprise_id is null and p.proprietaire_id=auth.uid()))
 order by d.debut desc limit 240;
end $fn$;

create or replace function public.ec08_annuler_rdv(p_rdv uuid,p_motif text default '')
returns void language plpgsql security definer set search_path='' as $fn$
declare v record;v_is_incube boolean;v_is_provider boolean;
begin
 select r.id,r.organisation_id,r.incubateur_id,r.startup_entreprise_id,r.statut,d.debut,p.entreprise_id,p.proprietaire_id,
  d.intervenant_id
 into v from public.reservations_rdv r
 join public.disponibilites_rdv d on d.id=r.disponibilite_id
 join public.prestataires p on p.id=d.prestataire_id
 where r.id=p_rdv for update of r;
 if not found or v.organisation_id<>public.mon_organisation() or v.statut<>'confirme'
 then raise exception 'Rendez-vous non annulable'; end if;
 v_is_incube:=v.incubateur_id=auth.uid() or public.ec07_droit_entreprise(v.startup_entreprise_id,true);
 v_is_provider:=public.ec07_droit_entreprise(v.entreprise_id,true) or v.proprietaire_id=auth.uid();
 if not v_is_incube and not v_is_provider then raise exception 'Acces interdit'; end if;
 if v.debut<now() then raise exception 'Rendez-vous deja commence'; end if;
 if char_length(coalesce(p_motif,''))>500 then raise exception 'Motif trop long'; end if;
 if v.debut<now()+interval '24 hours' and char_length(trim(coalesce(p_motif,'')))<5
 then raise exception 'Motif obligatoire moins de 24 heures avant le rendez-vous'; end if;
 update public.reservations_rdv set statut='annule',annule_par=auth.uid(),annule_le=now(),
  motif_annulation=trim(coalesce(p_motif,'')) where id=p_rdv;
 insert into public.notifications_ec(destinataire_id,organisation_id,titre,contenu)
 values(case when v_is_incube then coalesce(v.intervenant_id,v.proprietaire_id)
    else v.incubateur_id end,v.organisation_id,
  'Rendez-vous annule','Le rendez-vous a ete annule. Consultez votre espace EURACONNECT.');
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'ec08_annuler_rdv','reservations_rdv',p_rdv,
  jsonb_build_object('motif_saisi',char_length(coalesce(p_motif,''))>0));
end $fn$;

-- Retirer les retours identifiants des RPC directs non Premium n'est possible que
-- par des fonctions controlees. Les anciennes RPC conservent des identifiants
-- techniques de projets (necessaires aux candidatures), mais jamais auteur/entreprise.
revoke all on function public.ec08_premium_entreprise(uuid),
 public.ec08_annonce_sure(text,text,uuid),
 public.ec08_publier_besoin(uuid,text,text,text,text,integer,text),
 public.ec08_mes_besoins(uuid),public.ec08_modifier_annonce(uuid,text,text),
 public.ec08_changer_statut_besoin(uuid,text,text),public.ec08_historique_besoin(uuid),
 public.ec08_fil_besoins(uuid,text,text),public.ec08_conversation_brute_autorisee(uuid),
 public.ec08_lister_messages(uuid),public.ec08_proposer_creneau(timestamptz,timestamptz,text,text,uuid),
 public.ec08_lister_creneaux(),public.ec08_reserver_rdv(uuid,text,text,uuid),
 public.ec08_lister_rdv(),public.ec08_annuler_rdv(uuid,text)
 from public,anon,authenticated;
grant execute on function public.ec08_premium_entreprise(uuid),
 public.ec08_publier_besoin(uuid,text,text,text,text,integer,text),
 public.ec08_mes_besoins(uuid),public.ec08_modifier_annonce(uuid,text,text),
 public.ec08_changer_statut_besoin(uuid,text,text),public.ec08_historique_besoin(uuid),
 public.ec08_fil_besoins(uuid,text,text),public.ec08_lister_messages(uuid),
 public.ec08_conversation_brute_autorisee(uuid),
 public.ec08_proposer_creneau(timestamptz,timestamptz,text,text,uuid),
 public.ec08_lister_creneaux(),public.ec08_reserver_rdv(uuid,text,text,uuid),
 public.ec08_lister_rdv(),public.ec08_annuler_rdv(uuid,text)
 to authenticated;

commit;
