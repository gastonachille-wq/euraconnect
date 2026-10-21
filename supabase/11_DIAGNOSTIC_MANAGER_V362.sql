-- EURACONNECT V3.6.2 - Lecture seule, aucune donnee metier modifiee.
-- Executer sur le projet Supabase pointe par le site Netlify.
WITH checks AS (
 SELECT
  to_regclass('ec1.manager_recommendations') IS NOT NULL AS table_v20,
  to_regprocedure('public.ec1_api(text,jsonb)') IS NOT NULL AS rpc_base,
  to_regprocedure('public.ec20_manager_api(text,jsonb)') IS NOT NULL AS rpc_v20,
  to_regprocedure('public.ec35_advice(text,jsonb)') IS NOT NULL AS rpc_v35,
  COALESCE(has_schema_privilege('authenticated','public','USAGE'),FALSE) AS acces_schema_public,
  COALESCE(has_function_privilege('authenticated',to_regprocedure('public.ec20_manager_api(text,jsonb)'),'EXECUTE'),FALSE) AS v20_autorise,
  COALESCE((SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure('public.ec20_manager_api(text,jsonb)')),FALSE) AS v20_security_definer,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='ec20_manager_api') AS v20_signatures
)
SELECT current_database() AS database_name, table_v20,rpc_base,rpc_v20,rpc_v35,
 acces_schema_public,v20_autorise,v20_security_definer,v20_signatures,
 CASE
   WHEN NOT rpc_base THEN 'Socle V1 incomplet : public.ec1_api absent.'
   WHEN NOT table_v20 OR NOT rpc_v20 THEN 'Migration V20 absente/incomplete sur cette base.'
   WHEN NOT acces_schema_public OR NOT v20_autorise THEN 'Privileges insuffisants pour le role authenticated.'
   WHEN NOT v20_security_definer THEN 'Fonction V20 attendue en SECURITY DEFINER : verifier la migration.'
   WHEN v20_signatures<>1 THEN 'Plusieurs signatures ec20_manager_api : possible ambiguite PostgREST.'
   ELSE 'Objets V20 et privileges detectes. Verifier le projet cible, le JWT et les droits du profil dans /diagnostic.html.'
 END AS conclusion
FROM checks;
-- Le rechargement du cache est volontairement une commande distincte.
-- Si V20 existe mais PostgREST ne le voit pas, executer :
-- NOTIFY pgrst, 'reload schema';
