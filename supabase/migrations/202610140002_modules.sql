-- EURACONNECT v0.3 : ajout non destructif, a executer APRES 202610140001_core.sql
-- Compatible avec les tables existantes. Pas de DROP des tables metier.
create table if not exists public.offres_incubes (
 id uuid primary key default gen_random_uuid(),
 offre_id uuid not null unique references public.offres(id),
 organisation_id uuid not null references public.organisations(id),
 avantage text not null check(char_length(avantage) between 10 and 500),
 tarif_preferentiel_centimes integer check(tarif_preferentiel_centimes >= 0),
 actif boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.disponibilites_rdv (
 id uuid primary key default gen_random_uuid(),
 prestataire_id uuid not null references public.prestataires(id),
 organisation_id uuid not null references public.organisations(id),
 debut timestamptz not null,
 fin timestamptz not null,
 modalite text not null check(modalite in ('visio','telephone','sur_site')),
 lieu_ou_lien text,
 created_at timestamptz not null default now(),
 constraint disponibilite_duree check(fin > debut and fin <= debut + interval '90 minutes'),
 unique(prestataire_id,debut,fin)
);
create table if not exists public.reservations_rdv (
 id uuid primary key default gen_random_uuid(),
 disponibilite_id uuid not null unique references public.disponibilites_rdv(id),
 incubateur_id uuid not null references public.profiles(id),
 organisation_id uuid not null references public.organisations(id),
 statut text not null default 'confirme' check(statut in ('confirme','annule','realise')),
 created_at timestamptz not null default now()
);
create table if not exists public.notifications_ec (
 id uuid primary key default gen_random_uuid(),
 destinataire_id uuid not null references public.profiles(id),
 organisation_id uuid not null references public.organisations(id),
 titre text not null,
 contenu text not null,
 lu_le timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists idx_rdv_debut on public.disponibilites_rdv(debut);
create index if not exists idx_notifications_user on public.notifications_ec(destinataire_id,created_at desc);
alter table public.offres_incubes enable row level security;
alter table public.disponibilites_rdv enable row level security;
alter table public.reservations_rdv enable row level security;
alter table public.notifications_ec enable row level security;
-- Lire l'avantage seulement pour l'incube de la meme organisation, ou pour son prestataire proprietaire.
create policy oi_select on public.offres_incubes for select to authenticated using (
 (public.mon_role()='incube' and organisation_id=public.mon_organisation() and actif)
 or exists (select 1 from public.offres o where o.id=offre_id and o.prestataire_id=public.mon_prestataire())
 or public.est_admin());
create policy dispo_select on public.disponibilites_rdv for select to authenticated using (
 organisation_id=public.mon_organisation() and (public.mon_role()='incube' or prestataire_id=public.mon_prestataire() or public.est_admin()));
create policy reservation_select on public.reservations_rdv for select to authenticated using (
 incubateur_id=auth.uid() or public.est_admin() or exists(select 1 from public.disponibilites_rdv d where d.id=disponibilite_id and d.prestataire_id=public.mon_prestataire()));
create policy notif_select on public.notifications_ec for select to authenticated using (destinataire_id=auth.uid());
-- Les changements sensibles n'ont lieu que dans les fonctions.
revoke all on public.offres_incubes,public.disponibilites_rdv,public.reservations_rdv,public.notifications_ec from public,anon,authenticated;
grant select on public.offres_incubes,public.disponibilites_rdv,public.reservations_rdv,public.notifications_ec to authenticated;

create or replace function public.definir_avantage_incube(p_offre uuid,p_avantage text,p_tarif integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_offre public.offres%rowtype; v_id uuid;
begin
 select * into v_offre from public.offres where id=p_offre and prestataire_id=public.mon_prestataire() and statut='publiee';
 if not found then raise exception 'Offre inaccessible'; end if;
 if length(trim(p_avantage)) < 10 or length(trim(p_avantage)) > 500 or p_tarif < 0 then raise exception 'Avantage invalide'; end if;
 insert into public.offres_incubes(offre_id,organisation_id,avantage,tarif_preferentiel_centimes)
 values(p_offre,v_offre.organisation_id,trim(p_avantage),p_tarif)
 on conflict(offre_id) do update set avantage=excluded.avantage,tarif_preferentiel_centimes=excluded.tarif_preferentiel_centimes,actif=true
 returning id into v_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'avantage_incube','offres_incubes',v_id);
 return v_id;
end $$;
create or replace function public.proposer_disponibilite(p_debut timestamptz,p_fin timestamptz,p_modalite text,p_lieu text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_p public.prestataires%rowtype;v_id uuid;
begin
 select * into v_p from public.prestataires where proprietaire_id=auth.uid() and statut='valide' for update;
 if not found then raise exception 'Prestataire non valide';end if;
 if p_debut < now()+interval '12 hours' or p_debut > now()+interval '90 days' or p_fin<=p_debut or p_fin>p_debut+interval '90 minutes' then raise exception 'Creneau hors delais';end if;
 if p_modalite not in('visio','telephone','sur_site') then raise exception 'Modalite invalide';end if;
 if exists(select 1 from public.disponibilites_rdv d where d.prestataire_id=v_p.id and tstzrange(d.debut,d.fin,'[)') && tstzrange(p_debut,p_fin,'[)')) then raise exception 'Creneau en conflit';end if;
 insert into public.disponibilites_rdv(prestataire_id,organisation_id,debut,fin,modalite,lieu_ou_lien)
 values(v_p.id,v_p.organisation_id,p_debut,p_fin,p_modalite,p_lieu) returning id into v_id;
 return v_id;
end $$;
create or replace function public.reserver_disponibilite(p_disponibilite uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_d public.disponibilites_rdv%rowtype;v_id uuid;v_owner uuid;
begin
 if public.mon_role()<>'incube' then raise exception 'Reservation reservee aux incubes';end if;
 select * into v_d from public.disponibilites_rdv where id=p_disponibilite for update;
 if not found or v_d.organisation_id<>public.mon_organisation() or v_d.debut<now()+interval '12 hours' then raise exception 'Creneau indisponible';end if;
 if exists(select 1 from public.reservations_rdv where disponibilite_id=v_d.id) then raise exception 'Creneau deja reserve';end if;
 insert into public.reservations_rdv(disponibilite_id,incubateur_id,organisation_id) values(v_d.id,auth.uid(),v_d.organisation_id) returning id into v_id;
 select proprietaire_id into v_owner from public.prestataires where id=v_d.prestataire_id;
 insert into public.notifications_ec(destinataire_id,organisation_id,titre,contenu) values(v_owner,v_d.organisation_id,'Nouveau rendez-vous','Un incube a reserve un rendez-vous.');
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'reserver_rdv','reservations_rdv',v_id);
 return v_id;
end $$;
create or replace function public.marquer_notification_lue(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.notifications_ec set lu_le=now() where id=p_id and destinataire_id=auth.uid();
end $$;
-- Vue d'agregats pour le pilotage, retourne par RPC et jamais par accès brut aux donnees sensibles.
create or replace function public.indicateurs_admin() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.est_admin() then raise exception 'Acces interdit';end if;
 return jsonb_build_object(
 'utilisateurs',(select count(*) from public.profiles),
 'prestataires_valides',(select count(*) from public.prestataires where statut='valide'),
 'prestataires_en_attente',(select count(*) from public.prestataires where statut='en_validation'),
 'offres',(select count(*) from public.offres where statut='publiee'),
 'besoins',(select count(*) from public.projets where statut='publie'),
 'candidatures',(select count(*) from public.candidatures),
 'rendez_vous',(select count(*) from public.reservations_rdv where statut='confirme'));
end $$;
revoke all on function public.definir_avantage_incube(uuid,text,integer),public.proposer_disponibilite(timestamptz,timestamptz,text,text),public.reserver_disponibilite(uuid),public.marquer_notification_lue(uuid),public.indicateurs_admin() from public,anon;
grant execute on function public.definir_avantage_incube(uuid,text,integer),public.proposer_disponibilite(timestamptz,timestamptz,text,text),public.reserver_disponibilite(uuid),public.marquer_notification_lue(uuid),public.indicateurs_admin() to authenticated;
