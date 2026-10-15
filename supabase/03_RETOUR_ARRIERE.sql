-- RETOUR D'ACCES A V0.9.1, pas une synchronisation inverse des donnees !
-- Avant execution : arreter les saisies, sauvegarder ec1, re-deployer l'ancien frontend.
-- Les donnees saisies en V1 restent dans ec1 et ne redeviennent PAS visibles dans V0.9.1.
-- Les images restent privees volontairement : ne pas republier les visuels des startups.
BEGIN;
DO $restore$
DECLARE r record;
BEGIN
 IF to_regclass('ec1.legacy_grants') IS NULL THEN RAISE EXCEPTION 'Aucune sauvegarde de privileges trouvee.';END IF;
 FOR r IN SELECT statement FROM ec1.legacy_grants ORDER BY statement LOOP EXECUTE r.statement; END LOOP;
END $restore$;
UPDATE ec1.runtime SET active=false WHERE id;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Important : ce retour reouvre les anciens parcours, avec leurs anciennes regles.
-- A reserver a une copie de recette ou une fenetre de maintenance controlee.
