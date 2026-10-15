-- EURACONNECT V0.9.0 - Activation PREMIUM uniquement par administrateur.
-- Prerequis : migration V0.8.9 (202610150013).
-- Aucun Stripe, aucun paiement, aucun changement des incubes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ec090_premium_admin (
 entreprise_id uuid PRIMARY KEY REFERENCES public.entreprises_ec(id) ON DELETE CASCADE,
 active boolean NOT NULL DEFAULT false,
 plan_precedent text NOT NULL DEFAULT 'free' CHECK (plan_precedent IN ('free','pro')),
 commence_le timestamptz NOT NULL DEFAULT now(),
 expire_le timestamptz,
 commentaire text NOT NULL DEFAULT '' CHECK (char_length(commentaire)<=500),
 modifie_par uuid REFERENCES public.profiles(id),
 modifie_le timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ec090_dates_valides CHECK (expire_le IS NULL OR expire_le>commence_le)
);
ALTER TABLE public.ec090_premium_admin ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ec090_premium_admin FROM PUBLIC,anon,authenticated;
-- Reprise des prestataires historiquement premium, sans modifier leur statut.
INSERT INTO public.ec090_premium_admin(entreprise_id,active,commence_le,commentaire)
SELECT p.entreprise_id,true,now(),'Reprise du plan Premium existant (V0.8.9)'
FROM public.prestataires p JOIN public.entreprises_ec e ON e.id=p.entreprise_id AND e.type='prestataire'
WHERE p.plan_code='premium' AND p.entreprise_id IS NOT NULL
ON CONFLICT(entreprise_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ec090_admin_lister_prestataires(p_recherche text DEFAULT '')
RETURNS TABLE(entreprise_id uuid,prestataire_id uuid,entreprise_nom text,statut_validation text,plan_code text,premium_actif boolean,commence_le timestamptz,expire_le timestamptz,commentaire text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.est_admin() THEN RAISE EXCEPTION 'Administrateur requis'; END IF;
 IF length(coalesce(p_recherche,''))>120 THEN RAISE EXCEPTION 'Recherche trop longue'; END IF;
 RETURN QUERY SELECT e.id,p.id,e.nom::text,p.statut::text,p.plan_code::text,
  (p.plan_code='premium' AND p.statut='valide' AND coalesce(a.active,false)
   AND a.commence_le<=now() AND (a.expire_le IS NULL OR a.expire_le>now())),
  a.commence_le,a.expire_le,coalesce(a.commentaire,'')::text
 FROM public.entreprises_ec e JOIN public.prestataires p ON p.entreprise_id=e.id
 LEFT JOIN public.ec090_premium_admin a ON a.entreprise_id=e.id
 WHERE e.type='prestataire' AND e.organisation_id=public.mon_organisation()
 AND (trim(coalesce(p_recherche,''))='' OR e.nom ILIKE '%'||trim(p_recherche)||'%' OR p.nom_public ILIKE '%'||trim(p_recherche)||'%')
 ORDER BY e.nom LIMIT 200;
END $fn$;

CREATE OR REPLACE FUNCTION public.ec090_admin_definir_premium(p_entreprise uuid,p_actif boolean,p_expire_le timestamptz DEFAULT NULL,p_commentaire text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_prest uuid; v_org uuid; v_avant text;
BEGIN
 IF NOT public.est_admin() THEN RAISE EXCEPTION 'Administrateur requis'; END IF;
 SELECT p.id,p.organisation_id,p.plan_code INTO v_prest,v_org,v_avant
 FROM public.prestataires p JOIN public.entreprises_ec e ON e.id=p.entreprise_id
 WHERE p.entreprise_id=p_entreprise AND e.type='prestataire' AND e.organisation_id=public.mon_organisation()
 FOR UPDATE OF p;
 IF v_prest IS NULL THEN RAISE EXCEPTION 'Entreprise prestataire introuvable'; END IF;
 IF p_actif IS NULL OR length(coalesce(p_commentaire,''))>500 THEN RAISE EXCEPTION 'Parametres invalides'; END IF;
 IF p_actif AND p_expire_le IS NOT NULL AND p_expire_le<=now() THEN RAISE EXCEPTION 'Expiration dans le passe'; END IF;
 INSERT INTO public.ec090_premium_admin(entreprise_id,active,plan_precedent,commence_le,expire_le,commentaire,modifie_par,modifie_le)
 VALUES(p_entreprise,p_actif,CASE WHEN v_avant IN ('free','pro') THEN v_avant ELSE 'free' END,now(),CASE WHEN p_actif THEN p_expire_le ELSE NULL END,trim(coalesce(p_commentaire,'')),auth.uid(),now())
 ON CONFLICT(entreprise_id) DO UPDATE SET active=excluded.active,
 plan_precedent=CASE WHEN v_avant IN ('free','pro') THEN v_avant ELSE public.ec090_premium_admin.plan_precedent END,commence_le=excluded.commence_le,
 expire_le=excluded.expire_le,commentaire=excluded.commentaire,modifie_par=excluded.modifie_par,modifie_le=excluded.modifie_le;
 UPDATE public.prestataires SET plan_code=CASE WHEN p_actif THEN 'premium' ELSE
 (SELECT a.plan_precedent FROM public.ec090_premium_admin a WHERE a.entreprise_id=p_entreprise) END,updated_at=now() WHERE id=v_prest;
 INSERT INTO public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 VALUES(auth.uid(),'ec090_admin_premium','entreprises_ec',p_entreprise,
 jsonb_build_object('ancien_plan',v_avant,'actif',p_actif,'expiration',p_expire_le,'commentaire',left(coalesce(p_commentaire,''),500)));
END $fn$;

-- Le controle central protege egalement les autres RPC qui appellent cette fonction.
CREATE OR REPLACE FUNCTION public.ec08_premium_entreprise(p_entreprise uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT EXISTS(
 SELECT 1 FROM public.prestataires p JOIN public.ec090_premium_admin a ON a.entreprise_id=p.entreprise_id
 WHERE p.entreprise_id=p_entreprise AND p.plan_code='premium' AND p.statut='valide'
 AND a.active AND a.commence_le<=now() AND (a.expire_le IS NULL OR a.expire_le>now())
 AND p.organisation_id=public.mon_organisation() AND public.ec07_droit_entreprise(p_entreprise,false)
 );
$fn$;
-- Les quotas affiches et l'indicateur Premium utilisent le meme controle.
CREATE OR REPLACE FUNCTION public.ec089_mon_plan(p_entreprise uuid)
RETURNS TABLE(plan_code text,est_premium boolean,quota_candidatures integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_premium boolean;
BEGIN
 IF NOT public.ec07_droit_entreprise(p_entreprise,false) OR
 NOT EXISTS(SELECT 1 FROM public.entreprises_ec e WHERE e.id=p_entreprise AND e.type='prestataire')
 THEN RAISE EXCEPTION 'Compte prestataire requis'; END IF;
 v_premium:=public.ec08_premium_entreprise(p_entreprise);
 RETURN QUERY SELECT CASE WHEN v_premium THEN 'premium' ELSE 'free' END::text,
 v_premium,CASE WHEN v_premium THEN (SELECT pl.quota_candidatures FROM public.plans pl WHERE pl.code='premium')
 ELSE (SELECT pl.quota_candidatures FROM public.plans pl WHERE pl.code='free') END;
END $fn$;
REVOKE ALL ON FUNCTION public.ec090_admin_lister_prestataires(text),public.ec090_admin_definir_premium(uuid,boolean,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec090_admin_lister_prestataires(text),public.ec090_admin_definir_premium(uuid,boolean,timestamptz,text) TO authenticated;
COMMIT;
