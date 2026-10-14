-- EURACONNECT v2 - bootstrap et parcours essentiels
-- Executer dans SQL editor Supabase, puis configurer les comptes Auth.
create extension if not exists pgcrypto;
create table if not exists public.organisations (
 id uuid primary key default gen_random_uuid(),nom text not null,slug text not null unique,
 created_at timestamptz not null default now());
insert into public.organisations(nom,slug) values('EURASANTE','eurasante') on conflict(slug) do nothing;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 organisation_id uuid not null references public.organisations(id),
 role text not null default 'prestataire' check(role in('admin','incube','prestataire')),
 statut text not null default 'actif' check(statut in('actif','suspendu')),
 nom text, created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.plans (
 code text primary key check(code in('free','pro','premium')),
 prix_centimes integer not null default 0,
 quota_offres integer not null,quota_candidatures integer not null,
 actif boolean not null default true,created_at timestamptz not null default now());
insert into public.plans(code,prix_centimes,quota_offres,quota_candidatures) values
 ('free',0,3,5),('pro',1900,15,30),('premium',4900,100000,100000)
 on conflict(code) do nothing;
create table if not exists public.prestataires (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
 proprietaire_id uuid not null unique references public.profiles(id),
 nom_public text not null check(char_length(nom_public)>=3),
 description text not null check(char_length(description)>=100),
 statut text not null default 'en_validation' check(statut in('en_validation','valide','refuse','suspendu')),
 plan_code text not null default 'free' references public.plans(code),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.offres (
 id uuid primary key default gen_random_uuid(),organisation_id uuid not null references public.organisations(id),
 prestataire_id uuid not null references public.prestataires(id),
 titre text not null check(char_length(titre) between 8 and 100),
 description text not null check(char_length(description)>=50),
 format text not null check(format in('distance','site','mixte')),
 tarif_centimes integer check(tarif_centimes >= 0),
 statut text not null default 'publiee' check(statut in('publiee','hors_quota','archivee')),
 created_at timestamptz not null default now());
create table if not exists public.projets (
 id uuid primary key default gen_random_uuid(),organisation_id uuid not null references public.organisations(id),
 incube_id uuid not null references public.profiles(id),
 titre text not null check(char_length(titre) between 8 and 150),
 description text not null check(char_length(description)>=50),
 budget_centimes integer check(budget_centimes>=0),
 statut text not null default 'publie' check(statut in('publie','archive')),
 created_at timestamptz not null default now());
create table if not exists public.candidatures (
 id uuid primary key default gen_random_uuid(),organisation_id uuid not null references public.organisations(id),
 projet_id uuid not null references public.projets(id),
 prestataire_id uuid not null references public.prestataires(id),
 alias text not null, message text not null check(char_length(message)>=100),
 statut text not null default 'envoyee' check(statut in('envoyee','relation_demandee','relation_acceptee','relation_refusee')),
 identite_revelee boolean not null default false,
 created_at timestamptz not null default now(),unique(projet_id,prestataire_id));
create table if not exists public.mises_en_relation (
 id uuid primary key default gen_random_uuid(),organisation_id uuid not null references public.organisations(id),
 candidature_id uuid not null unique references public.candidatures(id),
 statut text not null default 'demandee' check(statut in('demandee','acceptee','refusee')),
 demande_le timestamptz not null default now(), reponse_le timestamptz);
create table if not exists public.audit_log (
 id uuid primary key default gen_random_uuid(), acteur_id uuid,
 action text not null,cible_type text not null,cible_id uuid,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now());
create index if not exists idx_offres_prestataire on public.offres(prestataire_id,statut);
create index if not exists idx_projets_incube on public.projets(incube_id,statut);
create index if not exists idx_candidatures_projet on public.candidatures(projet_id);
create index if not exists idx_audit_date on public.audit_log(created_at desc);

-- Aucune auto-promotion; provisionnement de profil apres creation Auth.
create or replace function public.creer_profil_auth() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,organisation_id,role,nom)
 values(new.id,(select id from public.organisations where slug='eurasante' limit 1),'prestataire',coalesce(new.raw_user_meta_data->>'full_name',''));
 return new;
end $$;
drop trigger if exists trg_new_auth_profile on auth.users;
create trigger trg_new_auth_profile after insert on auth.users for each row execute function public.creer_profil_auth();
-- Rattrapage des comptes existants, sans jamais attribuer admin automatiquement.
insert into public.profiles(id,organisation_id,role,nom)
 select u.id,o.id,'prestataire',coalesce(u.raw_user_meta_data->>'full_name','') from auth.users u
 cross join lateral(select id from public.organisations where slug='eurasante' limit 1)o
 on conflict(id) do nothing;

create or replace function public.est_admin() returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and statut='actif')
$$;
create or replace function public.mon_role() returns text
 language sql stable security definer set search_path = '' as $$
 select role from public.profiles where id=(select auth.uid()) and statut='actif'
$$;
create or replace function public.mon_organisation() returns uuid
 language sql stable security definer set search_path = '' as $$
 select organisation_id from public.profiles where id=(select auth.uid()) and statut='actif'
$$;
create or replace function public.mon_prestataire() returns uuid
 language sql stable security definer set search_path = '' as $$
 select id from public.prestataires where proprietaire_id=(select auth.uid())
$$;

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.prestataires enable row level security;
alter table public.offres enable row level security;
alter table public.projets enable row level security;
alter table public.candidatures enable row level security;
alter table public.mises_en_relation enable row level security;
alter table public.audit_log enable row level security;

create policy org_visible on public.organisations for select to authenticated using(id=public.mon_organisation() or public.est_admin());
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.est_admin());
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
-- Empêche de changer role / statut / organisation même via PATCH direct.
create or replace function public.protect_profile_columns() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.role is distinct from old.role or new.statut is distinct from old.statut or new.organisation_id is distinct from old.organisation_id then
  if not public.est_admin() and auth.uid() is not null then raise exception 'Changement de role ou statut interdit'; end if;
 end if;
 new.updated_at=now(); return new;
end $$;
drop trigger if exists trg_profile_protected on public.profiles;
create trigger trg_profile_protected before update on public.profiles for each row execute function public.protect_profile_columns();
create policy plans_read on public.plans for select to authenticated using(actif);
create policy prestataire_read on public.prestataires for select to authenticated
 using((statut='valide' and organisation_id=public.mon_organisation()) or proprietaire_id=(select auth.uid()) or public.est_admin());
create policy offers_read on public.offres for select to authenticated
 using((statut='publiee' and organisation_id=public.mon_organisation() and exists(select 1 from public.prestataires p where p.id=prestataire_id and p.statut='valide')) or prestataire_id=public.mon_prestataire() or public.est_admin());
create policy projets_read on public.projets for select to authenticated
 using((statut='publie' and organisation_id=public.mon_organisation()) or incube_id=(select auth.uid()) or public.est_admin());
-- Incubé ne lit jamais directement la table: la RPC expurge.
create policy candidatures_own on public.candidatures for select to authenticated using(prestataire_id=public.mon_prestataire() or public.est_admin());
create policy relations_own on public.mises_en_relation for select to authenticated
 using(public.est_admin() or exists(select 1 from public.candidatures c where c.id=candidature_id and c.prestataire_id=public.mon_prestataire()));
create policy audit_admin on public.audit_log for select to authenticated using(public.est_admin());

-- Privileges minimaux: RPC seules pour les ecritures métier.
revoke all on public.prestataires,public.offres,public.projets,public.candidatures,public.mises_en_relation,public.audit_log from anon,authenticated;
grant select on public.prestataires,public.offres,public.projets,public.candidatures,public.mises_en_relation,public.audit_log to authenticated;
revoke all on public.profiles from anon,authenticated;
grant select(id,role,nom,organisation_id,statut),update(nom) on public.profiles to authenticated;
grant select on public.plans,public.organisations to authenticated;

create or replace function public.creer_prestataire(p_nom text,p_description text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if public.mon_role()<>'prestataire' then raise exception 'Compte prestataire requis'; end if;
 if char_length(trim(p_nom))<3 or char_length(trim(p_description))<100 then raise exception 'Nom ou description insuffisants'; end if;
 insert into public.prestataires(organisation_id,proprietaire_id,nom_public,description)
 values(public.mon_organisation(),auth.uid(),trim(p_nom),trim(p_description)) returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'creer_prestataire','prestataires',v_id);
 return v_id;
end $$;
create or replace function public.publier_offre(p_titre text,p_description text,p_format text,p_tarif_centimes integer) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_provider public.prestataires%rowtype;v_quota integer;v_count integer;v_id uuid;
begin
 select * into v_provider from public.prestataires where proprietaire_id=auth.uid() for update;
 if not found or v_provider.statut<>'valide' then raise exception 'Prestataire non valide'; end if;
 select quota_offres into v_quota from public.plans where code=v_provider.plan_code;
 select count(*) into v_count from public.offres where prestataire_id=v_provider.id and statut='publiee';
 if v_count>=v_quota then raise exception 'Quota d offres atteint'; end if;
 if char_length(trim(p_titre))<8 or char_length(trim(p_description))<50 or p_format not in('distance','site','mixte') or p_tarif_centimes<0 then raise exception 'Champs offre invalides';end if;
 insert into public.offres(organisation_id,prestataire_id,titre,description,format,tarif_centimes)
 values(v_provider.organisation_id,v_provider.id,trim(p_titre),trim(p_description),p_format,p_tarif_centimes) returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'publier_offre','offres',v_id);
 return v_id;
end $$;
create or replace function public.publier_besoin(p_titre text,p_description text,p_budget_centimes integer) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if public.mon_role()<>'incube' then raise exception 'Acces reserve aux incubes'; end if;
 if char_length(trim(p_titre))<8 or char_length(trim(p_description))<50 or p_budget_centimes<0 then raise exception 'Besoin invalide'; end if;
 insert into public.projets(organisation_id,incube_id,titre,description,budget_centimes)
 values(public.mon_organisation(),auth.uid(),trim(p_titre),trim(p_description),p_budget_centimes) returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'publier_besoin','projets',v_id);
 return v_id;
end $$;
create or replace function public.envoyer_candidature_ouverte(p_projet_id uuid,p_message text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_provider public.prestataires%rowtype;v_projet public.projets%rowtype;v_count integer;v_quota integer;v_id uuid;
begin
 select * into v_provider from public.prestataires where proprietaire_id=auth.uid() for update;
 if not found or v_provider.statut<>'valide' then raise exception 'Prestataire non valide'; end if;
 select * into v_projet from public.projets where id=p_projet_id and statut='publie' and organisation_id=v_provider.organisation_id;
 if not found then raise exception 'Besoin introuvable'; end if;
 if char_length(trim(p_message))<100 then raise exception 'Reponse trop courte (100 caracteres minimum)'; end if;
 -- Sécurité provisoire: texte seul, sans URL/email/numéro de téléphone; contrôle éditorial nécessaire.
 if p_message ~* '(https?://|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?[0-9][0-9 .-]{8,}[0-9])' then raise exception 'Supprimez les coordonnees et liens du message anonyme'; end if;
 select quota_candidatures into v_quota from public.plans where code=v_provider.plan_code;
 select count(*) into v_count from public.candidatures where prestataire_id=v_provider.id and created_at>=date_trunc('month',now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' and created_at< (date_trunc('month',now() at time zone 'Europe/Paris')+interval '1 month') at time zone 'Europe/Paris';
 if v_count>=v_quota then raise exception 'Quota mensuel atteint'; end if;
 insert into public.candidatures(organisation_id,projet_id,prestataire_id,alias,message,identite_revelee)
 values(v_provider.organisation_id,p_projet_id,v_provider.id,'Expert '||upper(substr(md5(gen_random_uuid()::text),1,6)),trim(p_message),false) returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'envoyer_candidature','candidatures',v_id);
 return v_id;
end $$;
-- Exposition expurgee avec colonnes explicitement choisies; l'incube ne lit pas directement candidatures.
create or replace function public.lister_mes_candidatures()
 returns table(id uuid,projet_id uuid,alias text,message text,statut text,identite_revelee boolean,prestataire_nom text,mise_en_relation text)
 language sql stable security definer set search_path='' as $$
 select c.id,c.projet_id,c.alias,c.message,c.statut,c.identite_revelee,
 case when c.identite_revelee then p.nom_public else null end as prestataire_nom,
 m.statut as mise_en_relation
 from public.candidatures c join public.projets j on j.id=c.projet_id
 join public.prestataires p on p.id=c.prestataire_id
 left join public.mises_en_relation m on m.candidature_id=c.id
 where j.incube_id=auth.uid() and public.mon_role()='incube'
$$;
create or replace function public.demander_mise_en_relation(p_candidature_id uuid) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_org uuid;
begin
 select j.organisation_id into v_org from public.candidatures c join public.projets j on j.id=c.projet_id
 where c.id=p_candidature_id and j.incube_id=auth.uid() and public.mon_role()='incube';
 if v_org is null then raise exception 'Candidature inaccessible'; end if;
 insert into public.mises_en_relation(organisation_id,candidature_id) values(v_org,p_candidature_id) returning id into v_id;
 update public.candidatures set statut='relation_demandee' where id=p_candidature_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'demander_relation','mises_en_relation',v_id);
 return v_id;
end $$;
create or replace function public.repondre_mise_en_relation(p_relation_id uuid,p_accepter boolean) returns void
 language plpgsql security definer set search_path='' as $$
declare v_relation public.mises_en_relation%rowtype;v_provider_id uuid;
begin
 select * into v_relation from public.mises_en_relation where id=p_relation_id for update;
 select prestataire_id into v_provider_id from public.candidatures where id=v_relation.candidature_id;
 if v_provider_id is distinct from public.mon_prestataire() or v_relation.statut<>'demandee' then raise exception 'Relation inaccessible ou deja traitee'; end if;
 update public.mises_en_relation set statut=case when p_accepter then 'acceptee' else 'refusee' end,reponse_le=now() where id=p_relation_id;
 update public.candidatures set identite_revelee=p_accepter,statut=case when p_accepter then 'relation_acceptee' else 'relation_refusee' end where id=v_relation.candidature_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'repondre_relation','mises_en_relation',p_relation_id);
end $$;
create or replace function public.admin_changer_role_par_email(p_email text,p_role text) returns void
 language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not public.est_admin() or p_role not in('incube','prestataire') then raise exception 'Action interdite'; end if;
 select id into v_id from auth.users where email=lower(trim(p_email));
 if v_id is null then raise exception 'Compte inexistant : creer ou inviter dabord dans Supabase Auth'; end if;
 if exists(select 1 from public.profiles where id=v_id and role='admin') then raise exception 'Le role administrateur ne peut etre change ici'; end if;
 update public.profiles set role=p_role where id=v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail) values(auth.uid(),'changer_role','profiles',v_id,jsonb_build_object('role',p_role));
end $$;
create or replace function public.admin_valider_prestataire(p_prestataire_id uuid) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not public.est_admin() then raise exception 'Action interdite';end if;
 update public.prestataires set statut='valide',updated_at=now() where id=p_prestataire_id and statut='en_validation';
 if not found then raise exception 'Prestataire introuvable ou deja traite';end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'valider_prestataire','prestataires',p_prestataire_id);
end $$;
-- Révocation EXECUTE par défaut : explicite pour authenticated.
revoke all on function public.creer_prestataire(text,text),public.publier_offre(text,text,text,integer),public.publier_besoin(text,text,integer),public.envoyer_candidature_ouverte(uuid,text),public.lister_mes_candidatures(),public.demander_mise_en_relation(uuid),public.repondre_mise_en_relation(uuid,boolean),public.admin_changer_role_par_email(text,text),public.admin_valider_prestataire(uuid) from public,anon;
grant execute on function public.creer_prestataire(text,text),public.publier_offre(text,text,text,integer),public.publier_besoin(text,text,integer),public.envoyer_candidature_ouverte(uuid,text),public.lister_mes_candidatures(),public.demander_mise_en_relation(uuid),public.repondre_mise_en_relation(uuid,boolean),public.admin_changer_role_par_email(text,text),public.admin_valider_prestataire(uuid) to authenticated;
