-- EURACONNECT V2.2 : suivi des vues et cycle de vie des demandes.
-- A appliquer APRES 01_INSTALL_V1.sql, sur une base sauvegardee.
-- Requiert ec1.actor, ec1.can_need, ec1.member, ec1.supervises.
BEGIN;
ALTER TABLE ec1.needs ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE TABLE IF NOT EXISTS ec1.need_views (
 need_id uuid NOT NULL REFERENCES ec1.needs(id) ON DELETE CASCADE,
 provider_company_id uuid NOT NULL REFERENCES public.entreprises_ec(id),
 first_viewed_at timestamptz NOT NULL DEFAULT now(),
 last_viewed_at timestamptz NOT NULL DEFAULT now(),
 view_count integer NOT NULL DEFAULT 1,
 PRIMARY KEY (need_id,provider_company_id)
);
REVOKE ALL ON ec1.need_views FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ec22_view(p_need uuid,p_company uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; n ec1.needs; v_count bigint; r_count bigint; privileged boolean;
BEGIN
 a:=ec1.actor();
 SELECT * INTO n FROM ec1.needs WHERE id=p_need AND organisation_id=a.organisation_id;
 IF n.id IS NULL OR NOT ec1.can_need(n.id) THEN RAISE EXCEPTION 'Demande inaccessible' USING ERRCODE='42501'; END IF;
 privileged:=ec1.member(n.company_id) OR ec1.supervises(n.company_id);
 IF a.role='prestataire' AND p_company IS NOT NULL AND ec1.member(p_company)
   AND p_company IS DISTINCT FROM n.company_id AND n.archived_at IS NULL THEN
   INSERT INTO ec1.need_views(need_id,provider_company_id) VALUES(p_need,p_company)
   ON CONFLICT(need_id,provider_company_id) DO UPDATE
     SET last_viewed_at=now(),view_count=ec1.need_views.view_count+1;
 END IF;
 SELECT count(*) INTO v_count FROM ec1.need_views WHERE need_id=p_need;
 SELECT count(*) INTO r_count FROM ec1.responses WHERE need_id=p_need AND status<>'retiree';
 RETURN jsonb_build_object('views',v_count,'responses',r_count,
   'providers',CASE WHEN privileged THEN coalesce((SELECT jsonb_agg(jsonb_build_object('company_id',v.provider_company_id,'name',e.nom,'viewed_at',v.last_viewed_at,'responded',EXISTS(SELECT 1 FROM ec1.responses r WHERE r.need_id=p_need AND r.company_id=v.provider_company_id)) ORDER BY v.last_viewed_at DESC)
   FROM ec1.need_views v JOIN public.entreprises_ec e ON e.id=v.provider_company_id WHERE v.need_id=p_need),'[]'::jsonb) ELSE NULL END);
END $$;
CREATE OR REPLACE FUNCTION public.ec22_archive(p_need uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; n ec1.needs;
BEGIN
 a:=ec1.actor(); SELECT * INTO n FROM ec1.needs WHERE id=p_need AND organisation_id=a.organisation_id FOR UPDATE;
 IF n.id IS NULL OR NOT (ec1.member(n.company_id,true) OR (n.company_id IS NULL AND n.author_id=a.id)) THEN RAISE EXCEPTION 'Archivage non autorise' USING ERRCODE='42501'; END IF;
 UPDATE ec1.needs SET archived_at=now(),status='sans_suite',updated_at=now() WHERE id=p_need;
 RETURN jsonb_build_object('archived',true);
END $$;
CREATE OR REPLACE FUNCTION public.ec22_delete(p_need uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; n ec1.needs;
BEGIN
 a:=ec1.actor(); SELECT * INTO n FROM ec1.needs WHERE id=p_need AND organisation_id=a.organisation_id FOR UPDATE;
 IF n.id IS NULL OR NOT (ec1.member(n.company_id,true) OR (n.company_id IS NULL AND n.author_id=a.id)) THEN RAISE EXCEPTION 'Suppression non autorisee' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM ec1.responses WHERE need_id=p_need) THEN RAISE EXCEPTION 'Une proposition existe : archivez la demande.' USING ERRCODE='23514'; END IF;
 -- Supprimer les references applicatives non commerciales. En cas d'autre dependance,
 -- la contrainte SQL bloque la suppression : ne pas forcer en cascade.
 DELETE FROM ec1.need_views WHERE need_id=p_need;
 DELETE FROM ec1.needs WHERE id=p_need;
 RETURN jsonb_build_object('deleted',true);
END $$;
REVOKE ALL ON FUNCTION public.ec22_view(uuid,uuid),public.ec22_archive(uuid),public.ec22_delete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec22_view(uuid,uuid),public.ec22_archive(uuid),public.ec22_delete(uuid) TO authenticated;
COMMIT;
