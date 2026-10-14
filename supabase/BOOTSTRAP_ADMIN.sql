-- A executer dans Supabase SQL Editor APRES avoir cree votre compte dans Auth > Users.
-- REMPLACER ADMIN_EMAIL@EXEMPLE.FR par votre adresse exacte.
-- Utilisez une adresse deja confirmee et activez MFA dans Supabase Auth.
DO $$
DECLARE v_id uuid;
BEGIN
 SELECT id INTO v_id FROM auth.users WHERE lower(email)=lower('ADMIN_EMAIL@EXEMPLE.FR');
 IF v_id IS NULL THEN RAISE EXCEPTION 'Compte introuvable : creer le compte dans Auth > Users avant bootstrap'; END IF;
 UPDATE public.profiles SET role='admin',statut='actif' WHERE id=v_id;
 INSERT INTO public.audit_log(acteur_id,action,cible_type,cible_id,detail)
 VALUES(v_id,'bootstrap_admin','profiles',v_id,jsonb_build_object('origine','SQL Editor'));
END $$;
