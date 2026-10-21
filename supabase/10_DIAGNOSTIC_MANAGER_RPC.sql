-- EURACONNECT - diagnostic V20 non destructif.
-- A exécuter dans SQL Editor DU MEME projet Supabase que celui configuré dans Netlify.
-- Vérifie les objets V20 et les droits de authenticated, mais NE teste PAS
-- une vraie session JWT ni les affectations du Startup Manager.
WITH c AS (
 SELECT
  to_regnamespace('ec1') IS NOT NULL AS schema_ec1,
  to_regprocedure('ec1.actor()') IS NOT NULL AS actor_disponible,
  to_regprocedure('ec1.supervises(uuid)') IS NOT NULL AS supervise_disponible,
  to_regclass('ec1.manager_recommendations') IS NOT NULL AS table_v20_presente,
  to_regprocedure('public.ec20_manager_api(text,jsonb)') IS NOT NULL AS rpc_v20_presente,
  COALESCE(has_function_privilege(
   'authenticated', to_regprocedure('public.ec20_manager_api(text,jsonb)'), 'EXECUTE'
  ), false) AS rpc_executable_par_authenticated,
  COALESCE((SELECT p.prosecdef
   FROM pg_proc p WHERE p.oid=to_regprocedure('public.ec20_manager_api(text,jsonb)')
   LIMIT 1),false) AS rpc_security_definer
)
SELECT current_database() AS base_courante,
       schema_ec1, actor_disponible, supervise_disponible,
       table_v20_presente, rpc_v20_presente, rpc_executable_par_authenticated,
       rpc_security_definer,
       CASE
        WHEN NOT table_v20_presente OR NOT rpc_v20_presente THEN
         'Migration V20 absente/incomplete sur CETTE base : verifier 07_V20_MANAGER_RECOMMANDATIONS.sql.'
        WHEN NOT rpc_executable_par_authenticated THEN
         'RPC presente mais droit EXECUTE manquant pour authenticated.'
        WHEN NOT rpc_security_definer THEN
         'RPC presente mais SECURITY DEFINER absent : verifier la migration.'
        WHEN NOT actor_disponible OR NOT supervise_disponible THEN
         'Prerequis V1 incomplets. Verifier la chaine de migrations.'
        ELSE
         'Objets et privilege RPC coherents. Examiner erreur API, role, session, projet pointe par Netlify.'
       END AS conclusion
FROM c;

-- Rafraichit le cache PostgREST sans modifier les donnees metier.
NOTIFY pgrst, 'reload schema';
