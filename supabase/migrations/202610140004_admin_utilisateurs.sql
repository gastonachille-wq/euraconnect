-- EURACONNECT V0.5 - administration des utilisateurs
-- A appliquer apres les migrations V0.2, V0.3, V0.4. Ne supprime aucune donnee.
-- La lecture de auth.users est confinee dans cette RPC admin uniquement.
create or replace function public.admin_lister_utilisateurs(p_recherche text default '',p_role text default '',p_statut text default '',p_limite integer default 50,p_offset integer default 0)
returns table(id uuid,email text,nom text,role text,statut text,email_confirme boolean,cree_le timestamptz,derniere_connexion timestamptz,profil_present boolean,nb_total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.est_admin() then raise exception 'Acces administrateur requis'; end if;
 return query
 with lignes as (
  select u.id,u.email::text,p.nom,p.role,p.statut,(u.email_confirmed_at is not null) email_confirme,
         u.created_at cree_le,u.last_sign_in_at derniere_connexion,(p.id is not null) profil_present
  from auth.users u left join public.profiles p on p.id=u.id
  where (coalesce(trim(p_recherche),'')='' or u.email ilike '%'||trim(p_recherche)||'%' or coalesce(p.nom,'') ilike '%'||trim(p_recherche)||'%')
    and (coalesce(p_role,'')='' or p.role=p_role)
    and (coalesce(p_statut,'')='' or p.statut=p_statut)
 )
 select l.*,count(*) over() from lignes l order by l.cree_le desc limit least(greatest(p_limite,1),100) offset greatest(p_offset,0);
end $$;
create or replace function public.admin_modifier_utilisateur(p_utilisateur_id uuid,p_role text,p_statut text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.profiles%rowtype; v_admins integer;
begin
 if not public.est_admin() then raise exception 'Acces administrateur requis'; end if;
 if p_role not in ('admin','incube','prestataire') or p_statut not in ('actif','suspendu') then raise exception 'Role ou statut invalide'; end if;
 select * into v_old from public.profiles where id=p_utilisateur_id for update;
 if not found then raise exception 'Profil applicatif manquant pour cet utilisateur'; end if;
 if p_utilisateur_id=auth.uid() and (p_role<>'admin' or p_statut<>'actif') then raise exception 'Vous ne pouvez pas retirer vos propres droits administrateur'; end if;
 if v_old.role='admin' and (p_role<>'admin' or p_statut<>'actif') then
  select count(*) into v_admins from public.profiles where role='admin' and statut='actif';
  if v_admins<=1 then raise exception 'Impossible de desactiver le dernier administrateur actif'; end if;
 end if;
 if v_old.role='prestataire' and p_role<>'prestataire' and exists(select 1 from public.prestataires where proprietaire_id=p_utilisateur_id) then
  raise exception 'Ce compte possede une structure prestataire : transfert requis avant changement de role';
 end if;
 update public.profiles set role=p_role,statut=p_statut,updated_at=now() where id=p_utilisateur_id;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 values(auth.uid(),'admin_modifier_utilisateur','profiles',p_utilisateur_id,
 jsonb_build_object('ancien_role',v_old.role,'nouveau_role',p_role,'ancien_statut',v_old.statut,'nouveau_statut',p_statut));
end $$;
create or replace function public.admin_reparer_profil(p_utilisateur_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.est_admin() then raise exception 'Acces administrateur requis'; end if;
 if not exists(select 1 from auth.users where id=p_utilisateur_id) then raise exception 'Compte Auth introuvable'; end if;
 insert into public.profiles(id,organisation_id,role,statut,nom)
 select u.id,o.id,'prestataire','actif',coalesce(u.raw_user_meta_data->>'full_name','')
 from auth.users u cross join lateral (select id from public.organisations where slug='eurasante' limit 1) o
 where u.id=p_utilisateur_id on conflict(id) do nothing;
 if not found then raise exception 'Profil deja present ou organisation eurasante absente'; end if;
 insert into public.audit_log(acteur_id,action,cible_type,cible_id) values(auth.uid(),'admin_reparer_profil','profiles',p_utilisateur_id);
end $$;
revoke all on function public.admin_lister_utilisateurs(text,text,text,integer,integer) from public,anon;
revoke all on function public.admin_modifier_utilisateur(uuid,text,text) from public,anon;
revoke all on function public.admin_reparer_profil(uuid) from public,anon;
grant execute on function public.admin_lister_utilisateurs(text,text,text,integer,integer),public.admin_modifier_utilisateur(uuid,text,text),public.admin_reparer_profil(uuid) to authenticated;
