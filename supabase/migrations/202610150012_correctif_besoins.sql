-- EURACONNECT V0.8.8 correctif SQL / consultation des besoins
-- Prerequis: migrations jusqu a V0.8.7, dont V0.8.5 pour les tags.
-- Re-declaration de la RPC avec alias de colonne explicite pour corriger 42702.
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
      or not exists(select 1 from public.entreprises_ec ec where ec.id=p_entreprise and type='prestataire')
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


-- Tags publiquement attachés aux besoins visibles. Aucun identifiant de startup.
create or replace function public.ec088_tags_besoins(p_entreprise uuid default null)
returns table(besoin_id uuid, tags text[])
language sql stable security definer set search_path='' as $fn$
  with visibles as (
    select b.id from public.ec08_fil_besoins(p_entreprise,'','') b
  )
  select v.id,
    coalesce(array_agg(distinct t.libelle order by t.libelle) filter(where t.id is not null),'{}'::text[])
  from visibles v
  left join public.tags_liens_ec l on l.cible_type='besoin' and l.cible_id=v.id
  left join public.tags_ec t on t.id=l.tag_id
  group by v.id;
$fn$;
revoke all on function public.ec088_tags_besoins(uuid) from public,anon;
grant execute on function public.ec088_tags_besoins(uuid) to authenticated;
