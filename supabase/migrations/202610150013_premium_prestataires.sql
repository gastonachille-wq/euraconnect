-- EURACONNECT 0.8.9 - Monétisation réservée aux entreprises prestataires.
-- Prérequis: V0.8.8 et toutes migrations antérieures.
-- Avant production: sauvegarde et recette de l'accès non Premium.
BEGIN;

-- Les coordonnées commerciales sont volontairement saisies par la startup.
-- Aucun contact personnel n'est importé depuis auth.users.
CREATE TABLE IF NOT EXISTS public.ec089_contacts_besoin (
 besoin_id uuid PRIMARY KEY REFERENCES public.projets(id) ON DELETE CASCADE,
 nom_contact text NOT NULL DEFAULT '',
 email_contact text NOT NULL DEFAULT '',
 telephone_contact text NOT NULL DEFAULT '',
 autorise_premium boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ec089_nom_len CHECK (char_length(nom_contact)<=160),
 CONSTRAINT ec089_mail_len CHECK (char_length(email_contact)<=250),
 CONSTRAINT ec089_tel_len CHECK (char_length(telephone_contact)<=45),
 CONSTRAINT ec089_consent CHECK (NOT autorise_premium OR (length(trim(email_contact))>5 OR length(trim(telephone_contact))>5))
);
ALTER TABLE public.ec089_contacts_besoin ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ec089_contacts_besoin FROM PUBLIC,anon,authenticated;

-- L'offre Premium ne s'applique qu'aux entreprises prestataires validées.
CREATE OR REPLACE FUNCTION public.ec089_mon_plan(p_entreprise uuid)
RETURNS TABLE(plan_code text,est_premium boolean,quota_candidatures integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.ec07_droit_entreprise(p_entreprise,false)
 OR NOT EXISTS(SELECT 1 FROM public.entreprises_ec e WHERE e.id=p_entreprise AND e.type='prestataire')
 THEN RAISE EXCEPTION 'Compte prestataire requis'; END IF;
 RETURN QUERY SELECT pr.plan_code::text,
   (pr.plan_code='premium' AND pr.statut='valide'),pl.quota_candidatures
 FROM public.prestataires pr JOIN public.plans pl ON pl.code=pr.plan_code
 WHERE pr.entreprise_id=p_entreprise AND pr.organisation_id=public.mon_organisation()
 LIMIT 1;
END $fn$;

-- La startup choisit elle-même ce qu'elle divulgue et peut retirer son accord.
CREATE OR REPLACE FUNCTION public.ec089_definir_contact(p_besoin uuid,p_nom text,p_email text,p_telephone text,p_autorise boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_entreprise uuid;
BEGIN
 SELECT j.entreprise_id INTO v_entreprise FROM public.projets j
 WHERE j.id=p_besoin AND j.organisation_id=public.mon_organisation();
 IF v_entreprise IS NULL OR NOT public.ec07_droit_entreprise(v_entreprise,true)
 OR NOT EXISTS(SELECT 1 FROM public.entreprises_ec e WHERE e.id=v_entreprise AND e.type='startup')
 THEN RAISE EXCEPTION 'Gestionnaire startup requis'; END IF;
 IF length(coalesce(p_nom,''))>160 OR length(coalesce(p_email,''))>250 OR length(coalesce(p_telephone,''))>45
 OR (coalesce(p_email,'')<>'' AND p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
 THEN RAISE EXCEPTION 'Coordonnées invalides'; END IF;
 INSERT INTO public.ec089_contacts_besoin(besoin_id,nom_contact,email_contact,telephone_contact,autorise_premium,updated_at)
 VALUES(p_besoin,trim(coalesce(p_nom,'')),trim(coalesce(p_email,'')),trim(coalesce(p_telephone,'')),coalesce(p_autorise,false),now())
 ON CONFLICT(besoin_id) DO UPDATE SET nom_contact=excluded.nom_contact,email_contact=excluded.email_contact,
 telephone_contact=excluded.telephone_contact,autorise_premium=excluded.autorise_premium,updated_at=now();
 INSERT INTO public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 VALUES(auth.uid(),'ec089_contacts','projets',p_besoin,jsonb_build_object('autorise_premium',coalesce(p_autorise,false)));
END $fn$;

-- Cette RPC ne renvoie jamais les données privées en cas d'abonnement gratuit.
CREATE OR REPLACE FUNCTION public.ec089_contact_besoin(p_entreprise uuid,p_besoin uuid)
RETURNS TABLE(nom_startup text,nom_contact text,email_contact text,telephone_contact text,contact_disponible boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.ec08_premium_entreprise(p_entreprise)
 OR NOT EXISTS(SELECT 1 FROM public.entreprises_ec e WHERE e.id=p_entreprise AND e.type='prestataire')
 THEN RAISE EXCEPTION 'Option reservee aux prestataires Premium'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.projets j WHERE j.id=p_besoin
 AND j.organisation_id=public.mon_organisation() AND j.statut='publie')
 THEN RAISE EXCEPTION 'Besoin indisponible'; END IF;
 RETURN QUERY SELECT e.nom::text,c.nom_contact::text,c.email_contact::text,c.telephone_contact::text,
 (c.autorise_premium IS TRUE) AS contact_disponible
 FROM public.projets j JOIN public.entreprises_ec e ON e.id=j.entreprise_id
 JOIN public.ec089_contacts_besoin c ON c.besoin_id=j.id AND c.autorise_premium IS TRUE
 WHERE j.id=p_besoin AND e.type='startup';
END $fn$;

CREATE OR REPLACE FUNCTION public.ec089_mon_contact(p_besoin uuid)
RETURNS TABLE(nom_contact text,email_contact text,telephone_contact text,autorise_premium boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.projets j WHERE j.id=p_besoin
 AND j.entreprise_id IS NOT NULL AND public.ec07_droit_entreprise(j.entreprise_id,false))
 THEN RAISE EXCEPTION 'Acces startup requis'; END IF;
 RETURN QUERY SELECT c.nom_contact,c.email_contact,c.telephone_contact,c.autorise_premium
 FROM public.ec089_contacts_besoin c WHERE c.besoin_id=p_besoin;
END $fn$;

-- Tous les prestataires voient les mêmes informations utiles sur le besoin.
-- Seule l'identité est soumise au plan. Le texte anonymisé est volontairement publié par la startup.
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
  j.titre_anonyme,
  j.annonce_anonyme,
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


REVOKE ALL ON FUNCTION public.ec089_mon_plan(uuid),public.ec089_definir_contact(uuid,text,text,text,boolean),
 public.ec089_contact_besoin(uuid,uuid),public.ec089_mon_contact(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec089_mon_plan(uuid),public.ec089_definir_contact(uuid,text,text,text,boolean),
 public.ec089_contact_besoin(uuid,uuid),public.ec089_mon_contact(uuid) TO authenticated;
COMMIT;
