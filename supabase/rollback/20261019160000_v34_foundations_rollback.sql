-- ATTENTION: supprime les donnees creees par la V3.4. Sauvegarder avant execution.
BEGIN;
DROP FUNCTION IF EXISTS public.ec34_foundations(text,jsonb);
DROP TABLE IF EXISTS ec1.interaction_events;
DROP TABLE IF EXISTS ec1.app_settings;
COMMIT;
