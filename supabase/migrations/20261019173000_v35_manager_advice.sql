-- V3.5 : avis facultatifs du Startup Manager. AUCUN blocage de publication ni co-validation.
-- Prerequis : migrations 01..09 et ec20_manager_api (07).
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('ec1.actor()') IS NULL OR to_regprocedure('ec1.supervises(uuid)') IS NULL OR to_regclass('ec1.needs') IS NULL THEN
  RAISE EXCEPTION 'Installer les migrations EURACONNECT precedentes'; END IF;
END $$;
CREATE TABLE IF NOT EXISTS ec1.manager_advice (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 manager_id uuid NOT NULL REFERENCES public.profiles(id),
 startup_id uuid NOT NULL REFERENCES public.entreprises_ec(id),
 need_id uuid NOT NULL REFERENCES ec1.needs(id),
 advice text NOT NULL CHECK (char_length(trim(advice)) BETWEEN 30 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ec35_advice_need_date ON ec1.manager_advice(need_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ec35_advice_startup_date ON ec1.manager_advice(startup_id,created_at DESC);
ALTER TABLE ec1.manager_advice ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ec1.manager_advice FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ec35_advice(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; n ec1.needs; v_id uuid; v_result jsonb;
BEGIN
 a:=ec1.actor();
 IF p_args IS NULL OR jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>5000 THEN
  RAISE EXCEPTION 'Parametres incorrects' USING ERRCODE='22023'; END IF;
 IF p_action='list' THEN
  IF a.role NOT IN ('incube','startup_manager','admin') THEN RAISE EXCEPTION 'Acces refuse' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'need_id',r.need_id,'startup_id',r.startup_id,
    'need_title',n.title,'advice',r.advice,'manager_name',coalesce(p.nom,'Startup Manager'),
    'created_at',r.created_at) ORDER BY r.created_at DESC),'[]'::jsonb) INTO v_result
  FROM ec1.manager_advice r JOIN ec1.needs n ON n.id=r.need_id
  JOIN public.profiles p ON p.id=r.manager_id
  WHERE r.organisation_id=a.organisation_id
    AND (ec1.member(r.startup_id) OR (a.role IN ('startup_manager','admin') AND ec1.supervises(r.startup_id)))
    AND (nullif(p_args->>'startup_id','') IS NULL OR r.startup_id=nullif(p_args->>'startup_id','')::uuid)
    AND (nullif(p_args->>'need_id','') IS NULL OR r.need_id=nullif(p_args->>'need_id','')::uuid);
  RETURN coalesce(v_result,'[]'::jsonb);
 ELSIF p_action='create' THEN
  IF a.role NOT IN ('startup_manager','admin') THEN RAISE EXCEPTION 'Reserve aux Startup Managers' USING ERRCODE='42501'; END IF;
  SELECT * INTO n FROM ec1.needs WHERE id=nullif(p_args->>'need_id','')::uuid AND organisation_id=a.organisation_id;
  IF n.id IS NULL OR n.company_id IS NULL OR NOT ec1.supervises(n.company_id) THEN
   RAISE EXCEPTION 'Demande hors portefeuille' USING ERRCODE='42501'; END IF;
  IF char_length(trim(coalesce(p_args->>'advice',''))) NOT BETWEEN 30 AND 3000 THEN
   RAISE EXCEPTION 'Un conseil motive de 30 a 3000 caracteres est requis' USING ERRCODE='22023'; END IF;
  INSERT INTO ec1.manager_advice(organisation_id,manager_id,startup_id,need_id,advice)
  VALUES(a.organisation_id,a.id,n.company_id,n.id,trim(p_args->>'advice')) RETURNING id INTO v_id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id)
  SELECT DISTINCT m.profile_id,'Votre Startup Manager a partage un conseil pour : '||left(n.title,90),'need',n.id
  FROM public.entreprise_membres_ec m JOIN public.profiles p ON p.id=m.profile_id
  WHERE m.entreprise_id=n.company_id AND m.actif AND p.statut='actif';
  PERFORM ec1.audit('need',n.id,'avis_manager',jsonb_build_object('advice_id',v_id,'manager_id',a.id));
  RETURN jsonb_build_object('ok',true,'id',v_id);
 END IF;
 RAISE EXCEPTION 'Action inconnue' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION public.ec35_advice(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec35_advice(text,jsonb) TO authenticated;
COMMIT;
