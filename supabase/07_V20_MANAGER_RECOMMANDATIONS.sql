-- EURACONNECT 2.0 - Recommandations d'experts et suivi sécurisé
-- À exécuter APRÈS la migration 06. Ne supprime aucune donnée historique.
BEGIN;
CREATE TABLE IF NOT EXISTS ec1.manager_recommendations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 manager_id uuid NOT NULL REFERENCES public.profiles(id),
 startup_id uuid NOT NULL REFERENCES public.entreprises_ec(id),
 need_id uuid NOT NULL REFERENCES ec1.needs(id),
 provider_id uuid NOT NULL REFERENCES public.entreprises_ec(id),
 rationale text NOT NULL CHECK (length(trim(rationale)) BETWEEN 15 AND 1800),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(manager_id,need_id,provider_id)
);
REVOKE ALL ON ec1.manager_recommendations FROM PUBLIC, anon, authenticated;
ALTER TABLE ec1.manager_recommendations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ec20_recommendations_startup ON ec1.manager_recommendations(startup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ec20_recommendations_manager ON ec1.manager_recommendations(manager_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ec20_manager_api(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; n ec1.needs; provider public.entreprises_ec; rec_id uuid; result jsonb;
BEGIN
 a:=ec1.actor();
 IF p_args IS NULL OR jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>6000 THEN
  RAISE EXCEPTION 'Requête incorrecte.' USING ERRCODE='22023'; END IF;
 IF p_action='list' THEN
  IF a.role NOT IN ('startup_manager','admin') THEN RAISE EXCEPTION 'Accès réservé au suivi manager.' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'startup_id',r.startup_id,
    'need_id',r.need_id,'need_title',n.title,'provider_id',r.provider_id,'provider_name',p.nom,
    'rationale',r.rationale,'created_at',r.created_at,'manager_name',coalesce(m.nom,'Manager')) ORDER BY r.created_at DESC),'[]'::jsonb)
  INTO result FROM ec1.manager_recommendations r JOIN ec1.needs n ON n.id=r.need_id
  JOIN public.entreprises_ec p ON p.id=r.provider_id JOIN public.profiles m ON m.id=r.manager_id
  WHERE r.organisation_id=a.organisation_id AND ec1.supervises(r.startup_id)
    AND (nullif(p_args->>'startup_id','') IS NULL OR r.startup_id=nullif(p_args->>'startup_id','')::uuid);
  RETURN coalesce(result,'[]'::jsonb);
 ELSIF p_action='mine' THEN
  IF a.role NOT IN ('incube','admin') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'need_id',r.need_id,
    'need_title',n.title,'provider_id',r.provider_id,'provider_name',p.nom,'rationale',r.rationale,
    'manager_name',coalesce(m.nom,'Manager'),'created_at',r.created_at) ORDER BY r.created_at DESC),'[]'::jsonb)
  INTO result FROM ec1.manager_recommendations r JOIN ec1.needs n ON n.id=r.need_id
  JOIN public.entreprises_ec p ON p.id=r.provider_id JOIN public.profiles m ON m.id=r.manager_id
  WHERE r.organisation_id=a.organisation_id AND (a.role='admin' OR ec1.member(r.startup_id));
  RETURN coalesce(result,'[]'::jsonb);
 ELSIF p_action='ask' THEN
  IF a.role<>'incube' THEN RAISE EXCEPTION 'Seul un incubé peut solliciter son manager.' USING ERRCODE='42501'; END IF;
  SELECT x.* INTO n FROM ec1.needs x WHERE x.id=nullif(p_args->>'need_id','')::uuid AND x.organisation_id=a.organisation_id;
  IF n.id IS NULL OR n.company_id IS NULL OR NOT ec1.member(n.company_id) THEN RAISE EXCEPTION 'Vous ne pouvez solliciter un manager que pour votre entreprise.' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_args->>'message',''))) NOT BETWEEN 15 AND 1000 THEN RAISE EXCEPTION 'Décrivez votre besoin d’accompagnement en au moins 15 caractères.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ec_manager_portefeuille pm JOIN public.profiles pp ON pp.id=pm.manager_id WHERE pm.entreprise_id=n.company_id AND pp.statut='actif' AND pp.organisation_id=a.organisation_id AND pp.role='startup_manager') THEN
    RAISE EXCEPTION 'Aucun Startup Manager actif n’est encore affecté à votre entreprise.'; END IF;
  INSERT INTO ec1.followups(company_id,author_id,body,due_at)
  VALUES(n.company_id,a.id,'Demande de la startup · '||left(n.title,130)||' · '||trim(p_args->>'message'),current_date+2)
  RETURNING id INTO rec_id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id)
  SELECT DISTINCT pm.manager_id, 'Une startup de votre portefeuille demande votre aide : '||left(n.title,100),'need',n.id
  FROM public.ec_manager_portefeuille pm JOIN public.profiles pp ON pp.id=pm.manager_id
  WHERE pm.entreprise_id=n.company_id AND pp.statut='actif' AND pp.role='startup_manager' AND pp.organisation_id=a.organisation_id;
  PERFORM ec1.audit('need',n.id,'demande_aide_manager',jsonb_build_object('startup_id',n.company_id));
  RETURN jsonb_build_object('id',rec_id,'success',true);
 ELSIF p_action='recommend' THEN
  IF a.role NOT IN ('startup_manager','admin') THEN RAISE EXCEPTION 'Réservé aux managers.' USING ERRCODE='42501'; END IF;
  SELECT x.* INTO n FROM ec1.needs x WHERE x.id=nullif(p_args->>'need_id','')::uuid AND x.organisation_id=a.organisation_id;
  IF n.id IS NULL OR n.company_id IS NULL OR NOT ec1.supervises(n.company_id) THEN RAISE EXCEPTION 'Demande hors portefeuille.' USING ERRCODE='42501'; END IF;
  IF n.status IN ('brouillon','termine','sans_suite') THEN RAISE EXCEPTION 'Cette demande ne peut plus recevoir de recommandation.'; END IF;
  SELECT x.* INTO provider FROM public.entreprises_ec x WHERE x.id=nullif(p_args->>'provider_id','')::uuid
   AND x.organisation_id=a.organisation_id AND x.type='prestataire' AND x.statut='publiee';
  IF provider.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.prestataires v WHERE v.entreprise_id=provider.id AND v.statut='valide')
  THEN RAISE EXCEPTION 'Le prestataire doit être validé et visible.'; END IF;
  IF length(trim(coalesce(p_args->>'rationale',''))) NOT BETWEEN 15 AND 1800 THEN
   RAISE EXCEPTION 'Expliquez la pertinence de cet expert en au moins 15 caractères.'; END IF;
  INSERT INTO ec1.manager_recommendations(organisation_id,manager_id,startup_id,need_id,provider_id,rationale)
  VALUES (a.organisation_id,a.id,n.company_id,n.id,provider.id,trim(p_args->>'rationale'))
  ON CONFLICT(manager_id,need_id,provider_id) DO UPDATE SET rationale=EXCLUDED.rationale,created_at=now()
  RETURNING id INTO rec_id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id)
   SELECT DISTINCT m.profile_id, 'Votre Startup Manager recommande un expert pour : '||left(n.title,100),'need',n.id
   FROM public.entreprise_membres_ec m JOIN public.profiles pr ON pr.id=m.profile_id
   WHERE m.entreprise_id=n.company_id AND m.actif AND pr.statut='actif';
  PERFORM ec1.audit('need',n.id,'recommandation_manager',jsonb_build_object('provider_id',provider.id,'manager_id',a.id));
  RETURN jsonb_build_object('id',rec_id,'success',true);
 ELSE RAISE EXCEPTION 'Action inconnue.' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ec20_manager_api(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec20_manager_api(text,jsonb) TO authenticated;
COMMIT;
