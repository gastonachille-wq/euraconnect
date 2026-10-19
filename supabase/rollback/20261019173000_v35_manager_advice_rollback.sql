-- ATTENTION : supprime les avis V3.5. Sauvegarder les donnees avant retour arriere.
BEGIN;
DROP FUNCTION IF EXISTS public.ec35_advice(text,jsonb);
DROP TABLE IF EXISTS ec1.manager_advice;
COMMIT;
