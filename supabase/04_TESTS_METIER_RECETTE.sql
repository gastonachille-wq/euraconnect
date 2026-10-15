-- EURACONNECT V1 : tests executables dans SQL Editor, BASE DE RECETTE UNIQUEMENT.
-- Comptes fictifs crees dans une transaction, sans email et sans mot de passe.
-- Le ROLLBACK final supprime toutes les donnees de test. En cas d'erreur, executer ROLLBACK.
-- Non executes dans l'environnement de production de l'utilisateur.
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.as_actor(p_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_id,'role','authenticated')::text,true);
END $$;
CREATE OR REPLACE FUNCTION pg_temp.check_true(p_value boolean,p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF NOT coalesce(p_value,false) THEN RAISE EXCEPTION 'ECHEC : %',p_label;END IF;
 RAISE NOTICE 'OK : %',p_label;
END $$;
DO $tests$
DECLARE org uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid(); startup_user uuid:=gen_random_uuid();
 free_user uuid:=gen_random_uuid(); manager_id uuid:=gen_random_uuid(); stranger_manager uuid:=gen_random_uuid();
 startup_id uuid:=gen_random_uuid(); provider_id uuid:=gen_random_uuid(); other_startup uuid:=gen_random_uuid();
 need_id uuid; response_id uuid; session_id uuid; result jsonb; denied boolean; item record;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claims','{}',true);
 INSERT INTO public.organisations(id,nom,slug) VALUES(org,'EC1 RECETTE - transaction annulee','ec1-recette-'||org);
 FOR item IN SELECT * FROM (VALUES (admin_id,'admin'),(startup_user,'incube'),(free_user,'prestataire'),(manager_id,'startup_manager'),(stranger_manager,'startup_manager')) x(user_id,user_role) LOOP
  INSERT INTO auth.users(id,email,aud,role,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
   VALUES(item.user_id,item.user_id||'@example.invalid','authenticated','authenticated',now(),jsonb_build_object('full_name','Utilisateur de recette'),now(),now());
  UPDATE public.profiles SET organisation_id=org,role=item.user_role,statut='actif',nom=CASE WHEN item.user_role='incube' THEN 'Camille Secret' ELSE 'Test '||item.user_role END WHERE id=item.user_id;
 END LOOP;
 INSERT INTO public.entreprises_ec(id,organisation_id,nom,type,statut,cree_par) VALUES
  (startup_id,org,'Startup Confidentielle Recette','startup','publiee',startup_user),
  (other_startup,org,'Startup Hors Portefeuille','startup','publiee',admin_id),
  (provider_id,org,'Prestataire Identifie Recette','prestataire','publiee',free_user);
 INSERT INTO public.entreprise_membres_ec(entreprise_id,profile_id,role_membre,actif) VALUES
  (startup_id,startup_user,'proprietaire',true),(provider_id,free_user,'proprietaire',true);
 UPDATE public.profiles SET entreprise_id=startup_id WHERE id=startup_user;
 UPDATE public.profiles SET entreprise_id=provider_id WHERE id=free_user;
 INSERT INTO public.prestataires(organisation_id,proprietaire_id,entreprise_id,nom_public,description,statut)
 VALUES(org,free_user,provider_id,'Prestataire Identifie Recette',repeat('Expertise de recette. ',8),'valide');
 UPDATE ec1.runtime SET active=true WHERE id; -- transaction uniquement
 PERFORM pg_temp.as_actor(startup_user);
 result:=public.ec1_api('save_need',jsonb_build_object('company',startup_id,'title','Structurer le projet de Startup Confidentielle Recette',
  'context','Nous recherchons une expertise pour clarifier le projet, definir les priorites et produire des livrables concrets pour notre equipe.',
  'objectives','Une feuille de route','deliverables','Un audit et un plan d action','tags',jsonb_build_array(U&'Qualit\00E9','QUALITE'),
  'contact_name','Camille Secret','contact_email','startup@example.invalid','share_contact',true));
 need_id:=(result->>'id')::uuid;
 PERFORM pg_temp.check_true((SELECT count(*)=1 FROM ec1.tag_links t WHERE t.target_type='need' AND t.target_id=need_id),'Tags : casse et accents dedupliques');
 PERFORM pg_temp.as_actor(free_user);
 result:=public.ec1_api('need',jsonb_build_object('company',provider_id,'id',need_id));
 PERFORM pg_temp.check_true(NOT (result->'need'->>'identity_visible')::boolean,'Free : identite masquee');
 PERFORM pg_temp.check_true(result->'need'->>'context' LIKE '%livrables concrets%','Free : contexte complet et exploitable');
 PERFORM pg_temp.check_true(result->'need'->'contact'='null'::jsonb,'Free : contacts non renvoyes');
 PERFORM pg_temp.check_true(position('Startup Confidentielle Recette' in result::text)=0,'Free : nom aussi retire du titre');
 result:=public.ec1_api('respond',jsonb_build_object('company',provider_id,'id',need_id,'message',repeat('Nous proposons un audit et des ateliers de travail. ',3),'price',250000,'lead_days',15));
 response_id:=(result->>'id')::uuid;
 denied:=false;BEGIN PERFORM public.ec1_api('send_message',jsonb_build_object('company',provider_id,'id',response_id,'body','Relance prematuree'));EXCEPTION WHEN OTHERS THEN denied:=true;END;
 PERFORM pg_temp.check_true(denied,'Prestataire : attend la decision de la startup avant de relancer');
 PERFORM pg_temp.as_actor(startup_user);
 result:=public.ec1_api('need',jsonb_build_object('company',startup_id,'id',need_id));
 PERFORM pg_temp.check_true(result->'responses'->0->>'provider'='Prestataire Identifie Recette','Startup : prestataire toujours identifie');
 PERFORM public.ec1_api('response_status',jsonb_build_object('company',startup_id,'id',response_id,'status','en_discussion'));
 PERFORM pg_temp.as_actor(free_user);
 PERFORM public.ec1_api('send_message',jsonb_build_object('company',provider_id,'id',response_id,'body','Merci pour votre retour. Proposons un cadrage.'));
 result:=public.ec1_api('need',jsonb_build_object('company',provider_id,'id',need_id));
 PERFORM pg_temp.check_true(NOT (result->'need'->>'identity_visible')::boolean,'Donner suite ne confere pas Premium');
 PERFORM public.ec1_api('favorite',jsonb_build_object('company',provider_id,'id',need_id,'type','need','value',true));
 PERFORM public.ec1_api('favorite',jsonb_build_object('company',provider_id,'id',need_id,'type','need','value',true));
 PERFORM pg_temp.check_true((SELECT count(*)=1 FROM ec1.favorites f WHERE f.user_id=free_user AND f.target_id=need_id),'Favori idempotent');
 result:=public.ec1_api('needs',jsonb_build_object('company',provider_id,'favorites',true));
 PERFORM pg_temp.check_true((result->>'total')::integer=1,'Filtre favoris cote base, avant pagination');
 denied:=false;BEGIN PERFORM public.ec1_api('admin_premium',jsonb_build_object('company',provider_id,'id',provider_id,'active',true,'reason','Auto activation interdite'));EXCEPTION WHEN OTHERS THEN denied:=true;END;
 PERFORM pg_temp.check_true(denied,'Prestataire : pas d auto-activation Premium');
 PERFORM pg_temp.as_actor(admin_id);
 PERFORM public.ec1_api('admin_premium',jsonb_build_object('id',provider_id,'active',true,'reason','Recette sous transaction'));
 PERFORM public.ec1_api('assign_manager',jsonb_build_object('id',manager_id,'target_company',startup_id,'active',true));
 PERFORM pg_temp.as_actor(free_user);
 result:=public.ec1_api('need',jsonb_build_object('company',provider_id,'id',need_id));
 PERFORM pg_temp.check_true((result->'need'->>'identity_visible')::boolean,'Premium administratif : identite disponible');
 PERFORM pg_temp.check_true(result->'need'->'contact'->>'email'='startup@example.invalid','Premium : contacts autorises disponibles');
 UPDATE public.ec090_premium_admin SET commence_le=now()-interval '2 days',expire_le=now()-interval '1 day' WHERE entreprise_id=provider_id;
 result:=public.ec1_api('need',jsonb_build_object('company',provider_id,'id',need_id));
 PERFORM pg_temp.check_true(NOT (result->'need'->>'identity_visible')::boolean,'Expiration : identite de nouveau masquee cote serveur');
 PERFORM pg_temp.as_actor(manager_id);
 result:=public.ec1_api('portfolio','{}');
 PERFORM pg_temp.check_true(jsonb_array_length(result->'startups')=1,'Manager : une seule startup affectee');
 denied:=false;BEGIN PERFORM public.ec1_api('messages',jsonb_build_object('id',response_id));EXCEPTION WHEN OTHERS THEN denied:=true;END;
 PERFORM pg_temp.check_true(denied,'Manager : conversations privees non ouvertes par la supervision');
 PERFORM pg_temp.as_actor(stranger_manager);
 result:=public.ec1_api('portfolio','{}');
 PERFORM pg_temp.check_true(jsonb_array_length(result->'startups')=0,'Autre manager : aucun acces au portefeuille');
 PERFORM pg_temp.as_actor(manager_id);
 result:=public.ec1_api('create_session',jsonb_build_object('kind','atelier','title','Atelier de recette','start_local',to_char((now()+interval '14 days') AT TIME ZONE 'Europe/Paris','YYYY-MM-DD"T"HH24:MI:SS'),'duration',60,'capacity',1,'mode','visio'));
 session_id:=(result->>'id')::uuid;
 PERFORM pg_temp.as_actor(startup_user);
 result:=public.ec1_api('book_session',jsonb_build_object('company',startup_id,'id',session_id,'purpose','Structurer notre projet'));
 PERFORM pg_temp.check_true(result->>'status'='confirme','Premiere inscription confirmee');
 PERFORM pg_temp.as_actor(free_user);
 result:=public.ec1_api('book_session',jsonb_build_object('company',provider_id,'id',session_id,'purpose','Participer a la rencontre'));
 PERFORM pg_temp.check_true(result->>'status'='attente','Atelier complet : liste d attente');
 PERFORM pg_temp.as_actor(startup_user);PERFORM public.ec1_api('cancel_booking',jsonb_build_object('company',startup_id,'id',session_id));
 PERFORM pg_temp.check_true((SELECT rr.status='confirme' FROM ec1.registrations rr WHERE rr.session_id=session_id AND rr.user_id=free_user),'Desinscription : promotion de la liste d attente');
 PERFORM pg_temp.check_true(NOT has_table_privilege('authenticated','ec1.needs','SELECT'),'Pas d acces direct aux besoins prives');
 PERFORM pg_temp.check_true(NOT has_schema_privilege('authenticated','ec1','USAGE'),'Schema ec1 non expose aux utilisateurs');
 RAISE NOTICE 'Tests termines. La transaction va etre annulee.';
END $tests$;
ROLLBACK;
