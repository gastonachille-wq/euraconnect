-- EURACONNECT V3.4 / fondations : additive, apres 01..09.
-- Schema ec1 deja prive. Aucune modification des tables historiques.
BEGIN;
DO $$ BEGIN
 IF to_regclass('ec1.runtime') IS NULL OR to_regclass('public.ec_manager_portefeuille') IS NULL OR to_regprocedure('ec1.actor()') IS NULL OR to_regprocedure('ec1.supervises(uuid)') IS NULL THEN
  RAISE EXCEPTION 'V3.4 requiert le socle EURACONNECT V3 et le portefeuille manager existant';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS ec1.app_settings (
 organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 key text NOT NULL CHECK(key ~ '^[a-z][a-z0-9_]{2,79}$'),
 value jsonb NOT NULL, scope text NOT NULL DEFAULT 'organisation' CHECK(scope='organisation'),
 updated_by uuid REFERENCES public.profiles(id), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,key)
);
CREATE TABLE IF NOT EXISTS ec1.interaction_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 actor_id uuid NOT NULL REFERENCES public.profiles(id), company_id uuid REFERENCES public.entreprises_ec(id),
 target_company_id uuid REFERENCES public.entreprises_ec(id), target_contact_id uuid REFERENCES public.profiles(id),
 type text NOT NULL CHECK(type IN ('profile_view','contact_click','message_sent','need_sent_direct','appointment_booked','shortlist_added','favorite_added','mission_started','review_posted')),
 ref_type text NOT NULL CHECK(ref_type IN ('company','contact','need','response','session','offer','shortlist','review')),
 ref_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ec34_interaction_actor_date ON ec1.interaction_events(actor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ec34_interaction_company_date ON ec1.interaction_events(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ec34_interaction_target_date ON ec1.interaction_events(target_company_id,created_at DESC);
ALTER TABLE ec1.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec1.interaction_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ec1.app_settings,ec1.interaction_events FROM PUBLIC,anon,authenticated;
-- RLS defense in depth: les deux tables sont accessibles exclusivement via RPC.
-- L'audit existant ec1.history / ec1.audit est conserve : pas de doublon audit_log.
CREATE OR REPLACE FUNCTION public.ec34_foundations(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; v_company uuid; v_target uuid; v_contact uuid; v_ref uuid; v_type text; v_ref_type text; v_value jsonb; v_key text; v_id uuid; v_out jsonb;
BEGIN
 a:=ec1.actor();
 IF p_args IS NULL OR jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>4096 THEN RAISE EXCEPTION 'Parametres incorrects' USING ERRCODE='22023'; END IF;
 IF p_action='portfolio' THEN
  IF a.role NOT IN ('startup_manager','admin') THEN RAISE EXCEPTION 'Acces reserve' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('company_id',e.id,'name',e.nom,'manager_id',m.manager_id) ORDER BY e.nom),'[]'::jsonb) INTO v_out
  FROM public.ec_manager_portefeuille m JOIN public.entreprises_ec e ON e.id=m.entreprise_id
  WHERE e.organisation_id=a.organisation_id AND (a.role='admin' OR m.manager_id=a.id);
  RETURN v_out;
 ELSIF p_action='settings_list' THEN
  IF a.role NOT IN ('startup_manager','admin') THEN RAISE EXCEPTION 'Acces reserve' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_object_agg(s.key,s.value),'{}'::jsonb) INTO v_out FROM ec1.app_settings s WHERE s.organisation_id=a.organisation_id;
  RETURN v_out;
 ELSIF p_action='settings_set' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Seul un administrateur modifie les parametres globaux' USING ERRCODE='42501'; END IF;
  v_key:=p_args->>'key'; v_value:=p_args->'value';
  IF v_key IS NULL OR v_key !~ '^[a-z][a-z0-9_]{2,79}$' OR v_value IS NULL OR jsonb_typeof(v_value) NOT IN ('number','boolean','string','object') THEN RAISE EXCEPTION 'Cle ou valeur incorrecte' USING ERRCODE='22023'; END IF;
  INSERT INTO ec1.app_settings(organisation_id,key,value,updated_by) VALUES(a.organisation_id,v_key,v_value,a.id)
  ON CONFLICT(organisation_id,key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now();
  PERFORM ec1.audit('setting',NULL,'v34_setting_changed',jsonb_build_object('key',v_key));
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='interaction_log' THEN
  v_company:=nullif(p_args->>'company_id','')::uuid; v_target:=nullif(p_args->>'target_company_id','')::uuid;
  v_contact:=nullif(p_args->>'target_contact_id','')::uuid; v_ref:=nullif(p_args->>'ref_id','')::uuid;
  v_type:=p_args->>'type'; v_ref_type:=p_args->>'ref_type';
  IF v_ref IS NULL OR v_type NOT IN ('profile_view','contact_click','message_sent','need_sent_direct','appointment_booked','shortlist_added','favorite_added','mission_started','review_posted')
   OR v_ref_type NOT IN ('company','contact','need','response','session','offer','shortlist','review') THEN RAISE EXCEPTION 'Interaction incorrecte' USING ERRCODE='22023'; END IF;
  IF v_company IS NOT NULL AND NOT (ec1.member(v_company) OR ec1.supervises(v_company)) THEN RAISE EXCEPTION 'Entreprise hors perimetre' USING ERRCODE='42501'; END IF;
  IF v_target IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.entreprises_ec e WHERE e.id=v_target AND e.organisation_id=a.organisation_id) THEN RAISE EXCEPTION 'Cible hors organisation' USING ERRCODE='42501'; END IF;
  -- Seules les interactions de navigation non sensibles peuvent etre journalisees par le navigateur.
  -- Les evenements metier doivent etre ajoutes par leurs fonctions transactionnelles.
  IF v_type NOT IN ('profile_view','contact_click','favorite_added') THEN RAISE EXCEPTION 'Evenement reserve aux fonctions metier' USING ERRCODE='42501'; END IF;
  INSERT INTO ec1.interaction_events(organisation_id,actor_id,company_id,target_company_id,target_contact_id,type,ref_type,ref_id)
  VALUES(a.organisation_id,a.id,v_company,v_target,v_contact,v_type,v_ref_type,v_ref) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
 ELSIF p_action='interactions_list' THEN
  v_company:=nullif(p_args->>'company_id','')::uuid;
  IF v_company IS NULL OR NOT (ec1.member(v_company) OR ec1.supervises(v_company)) THEN RAISE EXCEPTION 'Entreprise hors perimetre' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC),'[]'::jsonb) INTO v_out FROM
   (SELECT id,company_id,target_company_id,type,ref_type,ref_id,created_at FROM ec1.interaction_events
    WHERE organisation_id=a.organisation_id AND (company_id=v_company OR target_company_id=v_company) ORDER BY created_at DESC LIMIT 100) t;
  RETURN v_out;
 END IF;
 RAISE EXCEPTION 'Action inconnue' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION public.ec34_foundations(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec34_foundations(text,jsonb) TO authenticated;
COMMIT;
