-- Controles READ ONLY apres la bascule. Aucun resultat inattendu ne doit etre ignore.
SELECT version,active,installed_at,activated_at FROM ec1.runtime;
SELECT * FROM ec1.import_report ORDER BY item;
-- Attendu : zero ancienne fonction executable par un utilisateur.
SELECT p.proname,has_function_privilege('authenticated',p.oid,'EXECUTE') AS accessible
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN ec1.legacy_resources l ON l.kind='function' AND l.name=p.proname
WHERE n.nspname='public' AND has_function_privilege('authenticated',p.oid,'EXECUTE');
-- Attendu : zero table historique lisible par un utilisateur.
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN ec1.legacy_resources l ON l.kind='table' AND l.name=c.relname
WHERE n.nspname='public' AND (has_table_privilege('authenticated',c.oid,'SELECT') OR has_any_column_privilege('authenticated',c.oid,'SELECT'));
SELECT has_schema_privilege('authenticated','ec1','USAGE') AS doit_etre_faux,
 has_function_privilege('authenticated','public.ec1_api(text,jsonb)','EXECUTE') AS doit_etre_vrai,
 has_function_privilege('anon','public.ec1_api(text,jsonb)','EXECUTE') AS doit_etre_faux_anonyme;
SELECT id,public FROM storage.buckets WHERE id IN ('euraconnect-media','euraconnect-v1');
-- A examiner : fonctions personnalisees absentes de l'archive V0.9.1 et encore executables.
-- Les fonctions d'extensions sont exclues. Ne pas revoquer aveuglement une fonction d'une autre application.
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND has_function_privilege('authenticated',p.oid,'EXECUTE')
AND p.proname NOT IN ('ec1_api','ec1_media_allowed')
AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e');
SELECT policyname,cmd,roles,qual,with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
-- Les politiques ec1_media_read / ec1_media_upload sont attendues. Revoir toute autre politique qui
-- donnerait acces aux buckets EURACONNECT, en particulier une ancienne policy SELECT ouverte.
