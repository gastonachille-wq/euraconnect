-- EURACONNECT V1 - BASCULE CONTROLEE. Executer apres 01_INSTALL_V1.sql et les controles.
-- Rend les anciennes API inaccessibles aux navigateurs, sans effacer leurs donnees.
-- L'ancien frontend V0.9.1 ne fonctionnera plus apres cette bascule.
BEGIN;
DO $activate$
DECLARE r record; g record; role_name text; statement text;
BEGIN
 IF to_regclass('ec1.runtime') IS NULL THEN RAISE EXCEPTION 'Installer 01_INSTALL_V1.sql avant la bascule.';END IF;
 IF (SELECT x.active FROM ec1.runtime x WHERE x.id) THEN RAISE NOTICE 'V1 deja active : verifications rejouees, donnees conservees.';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.role='admin' AND p.statut='actif') THEN RAISE EXCEPTION 'Un administrateur actif est indispensable.';END IF;
 -- Sauvegarder les privileges executables reels, y compris le droit implicite PUBLIC.
 FOR r IN SELECT p.oid,p.proname,pg_get_function_identity_arguments(p.oid) AS args,p.proowner,p.proacl
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN ec1.legacy_resources l ON l.kind='function' AND l.name=p.proname
  WHERE n.nspname='public' LOOP
  FOR g IN SELECT * FROM aclexplode(coalesce(r.proacl,acldefault('f',r.proowner))) LOOP
   role_name:=CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE (SELECT rolname FROM pg_roles WHERE oid=g.grantee) END;
   IF role_name IN ('PUBLIC','anon','authenticated') THEN
    statement:=format('GRANT %s ON FUNCTION public.%I(%s) TO %s%s;',g.privilege_type,r.proname,r.args,CASE WHEN role_name='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(role_name) END,CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
    INSERT INTO ec1.legacy_grants VALUES(statement) ON CONFLICT DO NOTHING;
   END IF;
  END LOOP;
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon,authenticated',r.proname,r.args);
 END LOOP;
 FOR r IN SELECT c.oid,c.relname,c.relowner,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN ec1.legacy_resources l ON l.kind='table' AND l.name=c.relname WHERE n.nspname='public' AND c.relkind IN ('r','p') LOOP
  FOR g IN SELECT * FROM aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) LOOP
   role_name:=CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE (SELECT rolname FROM pg_roles WHERE oid=g.grantee) END;
   IF role_name IN ('PUBLIC','anon','authenticated') THEN
    statement:=format('GRANT %s ON TABLE public.%I TO %s%s;',g.privilege_type,r.relname,CASE WHEN role_name='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(role_name) END,CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
    INSERT INTO ec1.legacy_grants VALUES(statement) ON CONFLICT DO NOTHING;
   END IF;
  END LOOP;
  -- Une ancienne attribution par colonne ne doit pas contourner la revocation de table.
  FOR g IN SELECT a.attname,x.* FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
    WHERE a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped LOOP
   role_name:=CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE (SELECT rolname FROM pg_roles WHERE oid=g.grantee) END;
   IF role_name IN ('PUBLIC','anon','authenticated') THEN
    statement:=format('GRANT %s (%I) ON TABLE public.%I TO %s%s;',g.privilege_type,g.attname,r.relname,CASE WHEN role_name='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(role_name) END,CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
    INSERT INTO ec1.legacy_grants VALUES(statement) ON CONFLICT DO NOTHING;
    EXECUTE format('REVOKE %s (%I) ON TABLE public.%I FROM %s',g.privilege_type,g.attname,r.relname,CASE WHEN role_name='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
   END IF;
  END LOOP;
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',r.relname);
 END LOOP;
END $activate$;
-- Les visuels des startups ne doivent pas rester disponibles via une ancienne URL publique.
UPDATE storage.buckets SET public=false WHERE id IN ('euraconnect-media','euraconnect-v1');
DROP POLICY IF EXISTS ec06_media_public_read ON storage.objects;
DROP POLICY IF EXISTS ec06_media_authorized_upload ON storage.objects;
REVOKE ALL ON ALL TABLES IN SCHEMA ec1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ec1 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ec1_api(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ec1_media_allowed(text,text) TO authenticated;
UPDATE ec1.runtime SET active=true,activated_at=coalesce(activated_at,now()) WHERE id;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT version,active,activated_at FROM ec1.runtime;
