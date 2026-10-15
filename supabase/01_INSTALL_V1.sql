-- EURACONNECT 1.0.0 - Installation sur une V0.9.1.
-- 1) Sauvegarde et recette. 2) Executer ce fichier. 3) 02_ACTIVER_V1.sql.
-- Aucune suppression de comptes, entreprises ou donnees historiques.
-- L'ancien front ne doit plus ecrire apres activation. Ne pas exposer le schema ec1.
BEGIN;
DO $preflight$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','organisations','entreprises_ec','entreprise_membres_ec','prestataires','projets','offres','candidatures','conversations_ec','messages_ec','disponibilites_rdv','reservations_rdv','tags_ec','tags_liens_ec','ec090_premium_admin','ec_manager_portefeuille','ec089_contacts_besoin','personnes_annuaire_ec','favoris_ec','notifications_ec','mises_en_relation','offres_incubes','competences_ec','entreprise_competences_ec','personne_competences_ec','projet_competences_ec'] LOOP
  IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'Prerequis V0.9.1 manquant : public.%. Installation annulee.',t; END IF;
 END LOOP;
END $preflight$;
CREATE SCHEMA IF NOT EXISTS ec1;
REVOKE ALL ON SCHEMA ec1 FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS ec1.runtime (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), active boolean NOT NULL DEFAULT false,
 version text NOT NULL DEFAULT '1.0.0', installed_at timestamptz NOT NULL DEFAULT now(),
 activated_at timestamptz, free_response_quota integer NOT NULL DEFAULT 5 CHECK(free_response_quota>=0)
);
INSERT INTO ec1.runtime(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ec1.company_details (
 company_id uuid PRIMARY KEY REFERENCES public.entreprises_ec(id), sector text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', contact_email text NOT NULL DEFAULT '', share_contact boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS ec1.needs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 company_id uuid REFERENCES public.entreprises_ec(id), author_id uuid NOT NULL REFERENCES public.profiles(id),
 title text NOT NULL CHECK(length(title) BETWEEN 8 AND 180), context text NOT NULL CHECK(length(context) BETWEEN 50 AND 20000),
 objectives text NOT NULL DEFAULT '' CHECK(length(objectives)<=6000), deliverables text NOT NULL DEFAULT '' CHECK(length(deliverables)<=6000),
 constraints_text text NOT NULL DEFAULT '' CHECK(length(constraints_text)<=4000),
 budget_min integer CHECK(budget_min>=0), budget_max integer CHECK(budget_max>=0), deadline timestamptz,
 format text NOT NULL DEFAULT 'distance' CHECK(format IN ('distance','site','mixte')),
 status text NOT NULL DEFAULT 'brouillon' CHECK(status IN ('brouillon','ouvert','en_echanges','rdv_planifie','devis_recu','en_realisation','termine','en_pause','sans_suite')),
 contact_name text NOT NULL DEFAULT '', contact_email text NOT NULL DEFAULT '', contact_phone text NOT NULL DEFAULT '', share_contact boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(budget_max IS NULL OR budget_min IS NULL OR budget_max>=budget_min)
);
CREATE INDEX IF NOT EXISTS needs_org_date ON ec1.needs(organisation_id,created_at DESC);
CREATE INDEX IF NOT EXISTS needs_company ON ec1.needs(company_id,status);
CREATE TABLE IF NOT EXISTS ec1.responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), need_id uuid NOT NULL REFERENCES ec1.needs(id), company_id uuid NOT NULL REFERENCES public.entreprises_ec(id),
 author_id uuid NOT NULL REFERENCES public.profiles(id), message text NOT NULL CHECK(length(message) BETWEEN 50 AND 12000),
 approach text NOT NULL DEFAULT '' CHECK(length(approach)<=6000), price integer CHECK(price>=0), lead_days integer CHECK(lead_days BETWEEN 0 AND 3650),
 status text NOT NULL DEFAULT 'envoyee' CHECK(status IN ('envoyee','en_discussion','retenue','declinee','retiree')),
 reason text NOT NULL DEFAULT '' CHECK(length(reason)<=2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(need_id,company_id)
);
CREATE INDEX IF NOT EXISTS responses_company ON ec1.responses(company_id,created_at DESC);
CREATE TABLE IF NOT EXISTS ec1.messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), response_id uuid NOT NULL REFERENCES ec1.responses(id), author_id uuid NOT NULL REFERENCES public.profiles(id),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 6000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_response ON ec1.messages(response_id,created_at,id);
CREATE TABLE IF NOT EXISTS ec1.read_cursors (
 user_id uuid NOT NULL REFERENCES public.profiles(id), response_id uuid NOT NULL REFERENCES ec1.responses(id), last_read timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,response_id)
);
CREATE TABLE IF NOT EXISTS ec1.tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES public.organisations(id), label text NOT NULL CHECK(length(label) BETWEEN 2 AND 60),
 normalized text NOT NULL, created_by uuid REFERENCES public.profiles(id), UNIQUE(organisation_id,normalized)
);
CREATE TABLE IF NOT EXISTS ec1.tag_links (
 tag_id uuid NOT NULL REFERENCES ec1.tags(id), target_type text NOT NULL CHECK(target_type IN ('company','person','need','offer','session')),
 target_id uuid NOT NULL, PRIMARY KEY(tag_id,target_type,target_id)
);
CREATE INDEX IF NOT EXISTS tag_links_target ON ec1.tag_links(target_type,target_id);
CREATE TABLE IF NOT EXISTS ec1.favorites (
 user_id uuid NOT NULL REFERENCES public.profiles(id), target_type text NOT NULL CHECK(target_type IN ('company','person','need','offer','session')),
 target_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,target_type,target_id)
);
CREATE TABLE IF NOT EXISTS ec1.sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 host_id uuid NOT NULL REFERENCES public.profiles(id), company_id uuid REFERENCES public.entreprises_ec(id),
 kind text NOT NULL CHECK(kind IN ('creneau','permanence','atelier','proposition')),
 title text NOT NULL CHECK(length(title) BETWEEN 5 AND 160), description text NOT NULL DEFAULT '' CHECK(length(description)<=10000),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, timezone text NOT NULL DEFAULT 'Europe/Paris',
 capacity integer NOT NULL DEFAULT 1 CHECK(capacity BETWEEN 1 AND 200),
 mode text NOT NULL DEFAULT 'visio' CHECK(mode IN ('visio','telephone','sur_site')),
 location text NOT NULL DEFAULT '' CHECK(length(location)<=1000),
 status text NOT NULL DEFAULT 'ouvert' CHECK(status IN ('ouvert','annule','realise')),
 need_id uuid REFERENCES ec1.needs(id), response_id uuid REFERENCES ec1.responses(id), invitee_id uuid REFERENCES public.profiles(id),
 series_id uuid, created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '1 day')
);
CREATE INDEX IF NOT EXISTS sessions_host_time ON ec1.sessions(host_id,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS sessions_org_time ON ec1.sessions(organisation_id,starts_at);
CREATE TABLE IF NOT EXISTS ec1.registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES ec1.sessions(id), user_id uuid NOT NULL REFERENCES public.profiles(id),
 company_id uuid REFERENCES public.entreprises_ec(id), status text NOT NULL DEFAULT 'confirme' CHECK(status IN ('confirme','attente','annule','present','absent')),
 purpose text NOT NULL DEFAULT '' CHECK(length(purpose)<=1500), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(session_id,user_id)
);
CREATE TABLE IF NOT EXISTS ec1.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), title text NOT NULL,
 target_type text NOT NULL DEFAULT 'dashboard', target_id uuid, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_date ON ec1.notifications(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS ec1.followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.entreprises_ec(id), author_id uuid NOT NULL REFERENCES public.profiles(id),
 body text NOT NULL CHECK(length(body) BETWEEN 5 AND 6000), due_at date, done boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ec1.history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES public.organisations(id), actor_id uuid REFERENCES public.profiles(id),
 target_type text NOT NULL, target_id uuid, action text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ec1.media (
 bucket text NOT NULL, path text NOT NULL, target_type text NOT NULL CHECK(target_type IN ('company','person','offer')),
 target_id uuid NOT NULL, PRIMARY KEY(bucket,path)
);
CREATE TABLE IF NOT EXISTS ec1.import_report (item text PRIMARY KEY, total integer NOT NULL, imported integer NOT NULL, note text NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS ec1.legacy_grants (statement text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS ec1.legacy_resources (kind text NOT NULL, name text NOT NULL, PRIMARY KEY(kind,name));

-- Tous les objets du schema prive sont sans privilege API direct et ont RLS.
DO $security$
DECLARE v record;
BEGIN
 FOR v IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ec1' AND c.relkind='r' LOOP
  EXECUTE format('ALTER TABLE ec1.%I ENABLE ROW LEVEL SECURITY',v.relname);
  EXECUTE format('REVOKE ALL ON TABLE ec1.%I FROM PUBLIC,anon,authenticated',v.relname);
 END LOOP;
END $security$;

-- Autorisations centrales, jamais de role fourni par le client.
CREATE OR REPLACE FUNCTION ec1.actor() RETURNS public.profiles LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.profiles;
BEGIN
 SELECT p.* INTO v FROM public.profiles p WHERE p.id=auth.uid() AND p.statut='actif';
 IF v.id IS NULL THEN RAISE EXCEPTION 'Session active requise. Reconnectez-vous.' USING ERRCODE='42501'; END IF;
 RETURN v;
END $$;
CREATE OR REPLACE FUNCTION ec1.member(p_company uuid,p_write boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.entreprises_ec e JOIN public.profiles p ON p.organisation_id=e.organisation_id
 WHERE e.id=p_company AND p.id=auth.uid() AND p.statut='actif' AND (p.role='admin' OR EXISTS(
 SELECT 1 FROM public.entreprise_membres_ec m WHERE m.entreprise_id=e.id AND m.profile_id=p.id AND m.actif
 AND (NOT p_write OR m.role_membre IN ('proprietaire','gestionnaire')))));
$$;
CREATE OR REPLACE FUNCTION ec1.supervises(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.entreprises_ec e ON e.organisation_id=p.organisation_id
 WHERE p.id=auth.uid() AND p.statut='actif' AND e.id=p_company AND (p.role='admin' OR (p.role='startup_manager' AND EXISTS(
 SELECT 1 FROM public.ec_manager_portefeuille m WHERE m.manager_id=p.id AND m.entreprise_id=e.id))));
$$;
CREATE OR REPLACE FUNCTION ec1.premium(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.ec090_premium_admin a JOIN public.entreprises_ec e ON e.id=a.entreprise_id
 JOIN public.prestataires p ON p.entreprise_id=e.id WHERE e.id=p_company AND e.type='prestataire' AND e.statut='publiee' AND p.statut='valide'
 AND a.active AND a.commence_le<=now() AND (a.expire_le IS NULL OR a.expire_le>now()));
$$;
CREATE OR REPLACE FUNCTION ec1.identity_visible(p_company uuid,p_viewer_company uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; e public.entreprises_ec;
BEGIN
 a:=ec1.actor(); SELECT x.* INTO e FROM public.entreprises_ec x WHERE x.id=p_company AND x.organisation_id=a.organisation_id;
 IF e.id IS NULL THEN RETURN false; END IF;
 IF a.role='admin' OR ec1.member(e.id) OR ec1.supervises(e.id) THEN RETURN true; END IF;
 IF e.type<>'startup' THEN RETURN e.statut='publiee'; END IF;
 -- Un manager n'a jamais acces aux identites des startups hors de son portefeuille.
 IF a.role='startup_manager' THEN RETURN false; END IF;
 IF a.role='prestataire' THEN RETURN ec1.member(p_viewer_company) AND ec1.premium(p_viewer_company); END IF;
 RETURN a.role='incube' AND e.statut='publiee';
END $$;
CREATE OR REPLACE FUNCTION ec1.company_name(p_company uuid,p_viewer uuid DEFAULT NULL) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN ec1.identity_visible(e.id,p_viewer) THEN e.nom ELSE 'Startup accompagnee - '||upper(substr(e.id::text,1,6)) END
 FROM public.entreprises_ec e WHERE e.id=p_company;
$$;
CREATE OR REPLACE FUNCTION ec1.person_name(p_user uuid,p_viewer uuid DEFAULT NULL) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles; a public.profiles; n text;
BEGIN
 a:=ec1.actor();SELECT x.* INTO p FROM public.profiles x WHERE x.id=p_user AND x.organisation_id=a.organisation_id;
 IF p.id IS NULL THEN RETURN 'Compte indisponible';END IF;
 IF p.role='incube' AND p.id<>a.id AND a.role<>'admin' AND (p.entreprise_id IS NULL OR NOT ec1.identity_visible(p.entreprise_id,p_viewer))
 THEN RETURN 'Contact startup - '||upper(substr(p.id::text,1,6));END IF;
 SELECT x.nom_public INTO n FROM public.personnes_annuaire_ec x WHERE x.profile_id=p.id;
 RETURN coalesce(nullif(n,''),nullif(p.nom,''),'Membre EURACONNECT');
END $$;
CREATE OR REPLACE FUNCTION ec1.norm(p_text text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT trim(regexp_replace(translate(lower(coalesce(p_text,'')),U&'\00E0\00E1\00E2\00E4\00E3\00E5\00E7\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F1\00F2\00F3\00F4\00F6\00F5\00F9\00FA\00FB\00FC\00FD\00FF','aaaaaaceeeeiiiinooooouuuuyy'),'[^a-z0-9]+',' ','g'));
$$;
CREATE OR REPLACE FUNCTION ec1.plain(p_text text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT trim(replace(replace(replace(regexp_replace(regexp_replace(coalesce(p_text,''),'</(p|li|div|h[1-6])>|<br\s*/?>',E'\n','gi'),'<[^>]*>','','g'),'&nbsp;',' '),'&amp;','&'),'&lt;','<'));
$$;
-- Masquage de l'identite structurelle et des identifiants directs connus dans les textes.
-- Ce filtre n'est pas une garantie d'anonymat contre tous les indices indirects.
CREATE OR REPLACE FUNCTION ec1.redact(p_text text,p_company uuid,p_viewer uuid DEFAULT NULL) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s text:=coalesce(p_text,''); n text; r record;
BEGIN
 IF p_company IS NULL OR ec1.identity_visible(p_company,p_viewer) THEN RETURN s; END IF;
 SELECT e.nom INTO n FROM public.entreprises_ec e WHERE e.id=p_company;
 IF length(n)>=2 THEN s:=regexp_replace(s,regexp_replace(n,'([\[\]().*+?^$|{}\\])','\\\1','g'),'[startup]','gi');END IF;
 FOR r IN SELECT p.nom FROM public.profiles p JOIN public.entreprise_membres_ec m ON m.profile_id=p.id WHERE m.entreprise_id=p_company LOOP
  IF length(trim(coalesce(r.nom,'')))>=3 THEN s:=regexp_replace(s,regexp_replace(r.nom,'([\[\]().*+?^$|{}\\])','\\\1','g'),'[contact]','gi'); END IF;
 END LOOP;
 s:=regexp_replace(s,'[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}','[email protege]','gi');
 s:=regexp_replace(s,'https?://[^[:space:]<>]+|www\.[^[:space:]<>]+','[lien protege]','gi');
 s:=regexp_replace(s,'(\+33|0)[1-9]([ .-]?[0-9]{2}){4}','[telephone protege]','g');
 RETURN s;
END $$;
CREATE OR REPLACE FUNCTION ec1.tags_for(p_type text,p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'label',t.label) ORDER BY t.label),'[]') FROM ec1.tag_links l JOIN ec1.tags t ON t.id=l.tag_id WHERE l.target_type=p_type AND l.target_id=p_id;
$$;
CREATE OR REPLACE FUNCTION ec1.set_tags(p_type text,p_id uuid,p_terms jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; term text; norm text; tid uuid;
BEGIN
 a:=ec1.actor();
 IF jsonb_typeof(p_terms)<>'array' OR jsonb_array_length(p_terms)>20 THEN RAISE EXCEPTION 'Selectionnez au plus 20 competences.';END IF;
 DELETE FROM ec1.tag_links l WHERE l.target_type=p_type AND l.target_id=p_id;
 FOR term IN SELECT value FROM jsonb_array_elements_text(p_terms) LOOP
  term:=trim(regexp_replace(term,'\s+',' ','g'));norm:=ec1.norm(term);
  IF length(term) NOT BETWEEN 2 AND 60 OR length(norm)<2 THEN RAISE EXCEPTION 'Un tag doit contenir entre 2 et 60 caracteres.';END IF;
  INSERT INTO ec1.tags(organisation_id,label,normalized,created_by) VALUES(a.organisation_id,term,norm,a.id)
   ON CONFLICT(organisation_id,normalized) DO UPDATE SET normalized=excluded.normalized RETURNING id INTO tid;
  INSERT INTO ec1.tag_links(tag_id,target_type,target_id) VALUES(tid,p_type,p_id) ON CONFLICT DO NOTHING;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION ec1.audit(p_type text,p_id uuid,p_action text,p_detail jsonb DEFAULT '{}') RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO ec1.history(organisation_id,actor_id,target_type,target_id,action,detail) VALUES((ec1.actor()).organisation_id,auth.uid(),p_type,p_id,p_action,p_detail);
$$;
CREATE OR REPLACE FUNCTION ec1.notify_company(p_company uuid,p_title text,p_type text,p_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO ec1.notifications(user_id,title,target_type,target_id)
 SELECT p.id,p_title,p_type,p_id FROM public.entreprise_membres_ec m JOIN public.profiles p ON p.id=m.profile_id
 WHERE m.entreprise_id=p_company AND m.actif AND p.statut='actif' AND p.id<>auth.uid();
$$;
CREATE OR REPLACE FUNCTION ec1.can_need(p_need uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM ec1.needs n JOIN public.profiles p ON p.organisation_id=n.organisation_id
 WHERE n.id=p_need AND p.id=auth.uid() AND p.statut='actif' AND (p.role='admin' OR n.author_id=p.id OR ec1.member(n.company_id) OR ec1.supervises(n.company_id)
 OR (p.role IN ('prestataire','incube') AND n.status<>'brouillon')));
$$;
CREATE OR REPLACE FUNCTION ec1.can_response(p_response uuid,p_write boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM ec1.responses r JOIN ec1.needs n ON n.id=r.need_id JOIN public.profiles p ON p.organisation_id=n.organisation_id
 WHERE r.id=p_response AND p.id=auth.uid() AND p.statut='actif' AND (p.role='admin' OR ec1.member(r.company_id,p_write) OR ec1.member(n.company_id,p_write)));
$$;
CREATE OR REPLACE FUNCTION ec1.need_json(p_need uuid,p_viewer uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE n ec1.needs; a public.profiles; own boolean; visible boolean; contacts boolean;
BEGIN
 a:=ec1.actor();SELECT x.* INTO n FROM ec1.needs x WHERE x.id=p_need AND x.organisation_id=a.organisation_id;
 IF n.id IS NULL OR NOT ec1.can_need(n.id) THEN RETURN NULL;END IF;
 own:=ec1.member(n.company_id) OR n.author_id=a.id;visible:=ec1.identity_visible(n.company_id,p_viewer) OR n.author_id=a.id;
 contacts:=own OR ec1.supervises(n.company_id) OR (visible AND n.share_contact);
 RETURN jsonb_build_object('id',n.id,'company_id',n.company_id,'company_name',coalesce(ec1.company_name(n.company_id,p_viewer),'Startup a rattacher'),
 'author_name',ec1.person_name(n.author_id,p_viewer),'identity_visible',visible,'owned',own,'can_edit',a.role='admin' OR ec1.member(n.company_id,true) OR (n.company_id IS NULL AND n.author_id=a.id),
 'title',ec1.redact(n.title,n.company_id,p_viewer),'context',ec1.redact(n.context,n.company_id,p_viewer),
 'objectives',ec1.redact(n.objectives,n.company_id,p_viewer),'deliverables',ec1.redact(n.deliverables,n.company_id,p_viewer),'constraints',ec1.redact(n.constraints_text,n.company_id,p_viewer),
 'budget_min',n.budget_min,'budget_max',n.budget_max,'deadline',n.deadline,'format',n.format,'status',n.status,'created_at',n.created_at,'updated_at',n.updated_at,
 'tags',ec1.tags_for('need',n.id),'favorite',EXISTS(SELECT 1 FROM ec1.favorites f WHERE f.user_id=a.id AND f.target_type='need' AND f.target_id=n.id),
 'responses_count',CASE WHEN own OR ec1.supervises(n.company_id) THEN (SELECT count(*) FROM ec1.responses r WHERE r.need_id=n.id) ELSE NULL END,
 'my_response',(SELECT r.id FROM ec1.responses r WHERE r.need_id=n.id AND r.company_id=p_viewer),
 'match_count',(SELECT count(*) FROM ec1.tag_links x JOIN ec1.tag_links y ON y.tag_id=x.tag_id AND y.target_type='company' AND y.target_id=p_viewer WHERE x.target_type='need' AND x.target_id=n.id),
 'contact',CASE WHEN contacts THEN jsonb_build_object('name',n.contact_name,'email',n.contact_email,'phone',n.contact_phone,'shared',n.share_contact) ELSE NULL END);
END $$;
CREATE OR REPLACE FUNCTION ec1.response_json(p_response uuid,p_viewer uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r ec1.responses; n ec1.needs;
BEGIN
 SELECT x.* INTO r FROM ec1.responses x WHERE x.id=p_response;SELECT x.* INTO n FROM ec1.needs x WHERE x.id=r.need_id;
 IF r.id IS NULL OR NOT (ec1.can_response(r.id) OR ec1.supervises(n.company_id)) THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('id',r.id,'need_id',r.need_id,'company_id',r.company_id,'provider',ec1.company_name(r.company_id,p_viewer),
 'author',ec1.person_name(r.author_id,p_viewer),'need_title',ec1.redact(n.title,n.company_id,p_viewer),'startup',ec1.company_name(n.company_id,p_viewer),
 'startup_id',n.company_id,'message',ec1.redact(r.message,n.company_id,p_viewer),'approach',ec1.redact(r.approach,n.company_id,p_viewer),'price',r.price,'lead_days',r.lead_days,'status',r.status,
 'reason',ec1.redact(r.reason,n.company_id,p_viewer),'created_at',r.created_at,
 'can_decide',ec1.member(n.company_id,true),'can_message',ec1.can_response(r.id,true) AND r.status NOT IN ('declinee','retiree') AND (r.status<>'envoyee' OR ec1.member(n.company_id,true)),
 'unread',(SELECT count(*) FROM ec1.messages m WHERE m.response_id=r.id AND m.author_id<>auth.uid() AND m.created_at>coalesce((SELECT c.last_read FROM ec1.read_cursors c WHERE c.user_id=auth.uid() AND c.response_id=r.id),'-infinity'::timestamptz)));
END $$;
CREATE OR REPLACE FUNCTION ec1.session_json(p_session uuid,p_viewer uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s ec1.sessions; a public.profiles; mine ec1.registrations; host boolean; supervisor boolean;
BEGIN
 a:=ec1.actor();SELECT x.* INTO s FROM ec1.sessions x WHERE x.id=p_session AND x.organisation_id=a.organisation_id;
 IF s.id IS NULL THEN RETURN NULL;END IF;
 SELECT x.* INTO mine FROM ec1.registrations x WHERE x.session_id=s.id AND x.user_id=a.id;
 host:=s.host_id=a.id OR a.role='admin';
 supervisor:=EXISTS(SELECT 1 FROM ec1.registrations r WHERE r.session_id=s.id AND ec1.supervises(r.company_id));
 IF s.kind='proposition' AND NOT(host OR s.invitee_id=a.id OR mine.id IS NOT NULL OR (s.response_id IS NOT NULL AND ec1.can_response(s.response_id)) OR supervisor) THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('id',s.id,'kind',s.kind,'title',ec1.redact(s.title,coalesce((SELECT n.company_id FROM ec1.needs n WHERE n.id=s.need_id),s.company_id),p_viewer),'description',ec1.redact(s.description,coalesce((SELECT n.company_id FROM ec1.needs n WHERE n.id=s.need_id),s.company_id),p_viewer),
 'starts_at',s.starts_at,'ends_at',s.ends_at,'timezone',s.timezone,'mode',s.mode,'status',s.status,'capacity',s.capacity,
 'host_id',s.host_id,'host_name',ec1.person_name(s.host_id,p_viewer),'company_id',s.company_id,'company_name',ec1.company_name(s.company_id,p_viewer),
 'location',CASE WHEN host OR mine.status IN ('confirme','present') THEN ec1.redact(s.location,s.company_id,p_viewer) ELSE '' END,
 'occupied',(SELECT count(*) FROM ec1.registrations r WHERE r.session_id=s.id AND r.status IN ('confirme','present','absent')),
 'registration',mine.status,'registration_id',mine.id,'purpose',mine.purpose,'mine',host OR mine.status IN ('confirme','attente','present','absent'),'can_manage',host,
 'need_id',s.need_id,'response_id',s.response_id,
 'participants',CASE WHEN host OR supervisor THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'name',ec1.person_name(r.user_id,p_viewer),
 'company',ec1.company_name(r.company_id,p_viewer),'status',r.status,'purpose',ec1.redact(r.purpose,r.company_id,p_viewer)) ORDER BY r.created_at)
 FROM ec1.registrations r WHERE r.session_id=s.id AND (host OR ec1.supervises(r.company_id))),'[]') ELSE '[]'::jsonb END);
END $$;
CREATE OR REPLACE FUNCTION ec1.read_action(p_action text,p_args jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; viewer uuid; rid uuid; q text; page_no integer; size_no integer; result jsonb; v_response ec1.responses; v_need ec1.needs;
BEGIN
 a:=ec1.actor();viewer:=nullif(p_args->>'company','')::uuid;rid:=nullif(p_args->>'id','')::uuid;
 IF viewer IS NOT NULL AND NOT ec1.member(viewer) THEN RAISE EXCEPTION 'Entreprise de travail non autorisee.' USING ERRCODE='42501';END IF;
 q:=left(trim(coalesce(p_args->>'q','')),120);page_no:=greatest(coalesce((p_args->>'page')::integer,0),0);size_no:=least(greatest(coalesce((p_args->>'size')::integer,24),1),100);
 CASE p_action
 WHEN 'bootstrap' THEN
  RETURN jsonb_build_object('version','1.0.0','active',(SELECT t.active FROM ec1.runtime t WHERE t.id),
   'user',jsonb_build_object('id',a.id,'name',a.nom,'role',a.role,'company_id',a.entreprise_id,'email',(SELECT u.email FROM auth.users u WHERE u.id=a.id)),
   'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'name',e.nom,'type',e.type,'status',e.statut,'member_role',m.role_membre,'premium',ec1.premium(e.id),'expires_at',pa.expire_le,'provider_status',pr.statut) ORDER BY e.nom)
    FROM public.entreprise_membres_ec m JOIN public.entreprises_ec e ON e.id=m.entreprise_id
    LEFT JOIN public.ec090_premium_admin pa ON pa.entreprise_id=e.id LEFT JOIN public.prestataires pr ON pr.entreprise_id=e.id
    WHERE m.profile_id=a.id AND m.actif AND e.organisation_id=a.organisation_id),'[]'),
   'unread_notifications',(SELECT count(*) FROM ec1.notifications x WHERE x.user_id=a.id AND x.read_at IS NULL),
   'unread_messages',(SELECT count(*) FROM ec1.responses x WHERE ec1.can_response(x.id) AND EXISTS(SELECT 1 FROM ec1.messages m
     WHERE m.response_id=x.id AND m.author_id<>a.id AND m.created_at>coalesce((SELECT c.last_read FROM ec1.read_cursors c WHERE c.user_id=a.id AND c.response_id=x.id),'-infinity'::timestamptz))),
   'profile',coalesce((SELECT to_jsonb(p)-'organisation_id' FROM public.personnes_annuaire_ec p WHERE p.profile_id=a.id),'{}'::jsonb) || jsonb_build_object('tags',ec1.tags_for('person',a.id),'media',(SELECT jsonb_build_object('bucket',m.bucket,'path',m.path) FROM ec1.media m WHERE m.target_type='person' AND m.target_id=a.id LIMIT 1)));
 WHEN 'dashboard' THEN
  WITH scope AS (SELECT x.* FROM ec1.needs x WHERE x.organisation_id=a.organisation_id AND
   (a.role='admin' OR (a.role='startup_manager' AND ec1.supervises(x.company_id)) OR
    (a.role='incube' AND ec1.member(x.company_id)) OR (a.role='prestataire' AND x.status NOT IN ('brouillon','termine','sans_suite')))),
  responses AS (SELECT x.* FROM ec1.responses x JOIN scope s ON s.id=x.need_id WHERE a.role<>'prestataire' OR x.company_id=viewer)
  SELECT jsonb_build_object(
   'kpis',jsonb_build_object('needs',(SELECT count(*) FROM scope WHERE status NOT IN ('brouillon','termine','sans_suite')),
    'responses',(SELECT count(*) FROM responses),'waiting',(SELECT count(*) FROM responses WHERE status='envoyee'),
    'no_response',(SELECT count(*) FROM scope s WHERE s.status='ouvert' AND s.created_at<now()-interval '7 days' AND NOT EXISTS(SELECT 1 FROM ec1.responses r WHERE r.need_id=s.id)),
    'sessions',(SELECT count(*) FROM ec1.sessions s WHERE s.organisation_id=a.organisation_id AND s.status='ouvert' AND s.starts_at>=now() AND (s.host_id=a.id OR EXISTS(SELECT 1 FROM ec1.registrations x WHERE x.session_id=s.id AND x.status='confirme' AND (x.user_id=a.id OR ec1.supervises(x.company_id))))),
    'portfolio',(SELECT count(*) FROM public.ec_manager_portefeuille m WHERE m.manager_id=a.id),
    'users',(SELECT count(*) FROM public.profiles p WHERE p.organisation_id=a.organisation_id AND a.role='admin'),
    'pending_providers',(SELECT count(*) FROM public.prestataires p WHERE p.organisation_id=a.organisation_id AND p.statut='en_validation' AND a.role='admin')),
   'recent_needs',coalesce((SELECT jsonb_agg(ec1.need_json(z.id,viewer)) FROM (SELECT s.id FROM scope s ORDER BY s.updated_at DESC LIMIT 5) z),'[]'),
   'next_sessions',coalesce((SELECT jsonb_agg(ec1.session_json(z.id,viewer)) FROM (SELECT s.id FROM ec1.sessions s WHERE s.organisation_id=a.organisation_id AND s.status='ouvert' AND s.starts_at>=now()
    AND (s.host_id=a.id OR EXISTS(SELECT 1 FROM ec1.registrations x WHERE x.session_id=s.id AND x.status='confirme' AND (x.user_id=a.id OR ec1.supervises(x.company_id)))) ORDER BY s.starts_at LIMIT 4)z),'[]')) INTO result;
  RETURN result;
 WHEN 'needs' THEN
  WITH visible AS (SELECT ec1.need_json(x.id,viewer) AS j FROM ec1.needs x WHERE x.organisation_id=a.organisation_id AND ec1.can_need(x.id)
    AND (coalesce(p_args->>'scope','all')<>'mine' OR ec1.member(x.company_id) OR x.author_id=a.id)
    AND (coalesce(p_args->>'status','')='' OR x.status=p_args->>'status')),
  filtered AS (SELECT v.j FROM visible v WHERE v.j IS NOT NULL AND (q='' OR ec1.norm(concat_ws(' ',v.j->>'title',v.j->>'context',(v.j->'tags')::text)) LIKE '%'||ec1.norm(q)||'%')
   AND (NOT coalesce((p_args->>'favorites')::boolean,false) OR (v.j->>'favorite')::boolean)),
  paged AS (SELECT f.j FROM filtered f ORDER BY CASE WHEN p_args->>'sort'='match' THEN (f.j->>'match_count')::integer ELSE 0 END DESC,f.j->>'created_at' DESC LIMIT size_no OFFSET page_no*size_no)
  SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(p.j) FROM paged p),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result;
  RETURN result;
 WHEN 'need' THEN
  result:=ec1.need_json(rid,viewer);IF result IS NULL THEN RAISE EXCEPTION 'Demande introuvable.';END IF;
  RETURN jsonb_build_object('need',result,'responses',coalesce((SELECT jsonb_agg(ec1.response_json(r.id,viewer) ORDER BY r.created_at DESC) FROM ec1.responses r WHERE r.need_id=rid AND (ec1.can_response(r.id) OR ec1.supervises((result->>'company_id')::uuid))),'[]'),
   'history',coalesce((SELECT jsonb_agg(jsonb_build_object('action',h.action,'date',h.created_at,'detail',h.detail) ORDER BY h.created_at DESC) FROM ec1.history h WHERE h.target_type='need' AND h.target_id=rid),'[]'));
 WHEN 'threads' THEN
  WITH visible AS (SELECT ec1.response_json(x.id,viewer) AS j FROM ec1.responses x WHERE ec1.can_response(x.id)
   AND (viewer IS NULL OR x.company_id=viewer OR EXISTS(SELECT 1 FROM ec1.needs nn WHERE nn.id=x.need_id AND nn.company_id=viewer))),
  filtered AS (SELECT v.j FROM visible v WHERE q='' OR ec1.norm(concat_ws(' ',v.j->>'provider',v.j->>'startup',v.j->>'need_title')) LIKE '%'||ec1.norm(q)||'%')
  SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(z.j) FROM (SELECT f.j FROM filtered f ORDER BY (f.j->>'unread')::integer DESC,f.j->>'created_at' DESC LIMIT size_no OFFSET page_no*size_no)z),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result;
  RETURN result;
 WHEN 'messages' THEN
  IF NOT ec1.can_response(rid) THEN RAISE EXCEPTION 'Conversation introuvable.' USING ERRCODE='42501';END IF;
  SELECT x.* INTO v_response FROM ec1.responses x WHERE x.id=rid;SELECT x.* INTO v_need FROM ec1.needs x WHERE x.id=v_response.need_id;
  IF a.role='admin' THEN PERFORM ec1.audit('response',rid,'consultation_admin_messages');END IF;
  RETURN jsonb_build_object('thread',ec1.response_json(rid,viewer),
   'items',coalesce((SELECT jsonb_agg(z.j ORDER BY z.created_at,z.id) FROM (SELECT m.id,m.created_at,jsonb_build_object('id',m.id,'body',ec1.redact(m.body,v_need.company_id,viewer),
    'author',ec1.person_name(m.author_id,viewer),'self',m.author_id=a.id,'created_at',m.created_at) AS j
    FROM ec1.messages m WHERE m.response_id=rid ORDER BY m.created_at DESC,m.id DESC LIMIT 100 OFFSET page_no*100)z),'[]'),
   'total',(SELECT count(*) FROM ec1.messages m WHERE m.response_id=rid),'read_until',now());
 WHEN 'directory' THEN
  WITH companies AS (SELECT jsonb_build_object('id',e.id,'kind','company','type',e.type,'name',ec1.company_name(e.id,viewer),
   'subtitle',ec1.redact(coalesce(d.sector,''),e.id,viewer),'description',ec1.redact(coalesce(nullif(d.description,''),ec1.plain(e.presentation_html)),e.id,viewer),
   'city',ec1.redact(coalesce(d.city,''),e.id,viewer),'identity_visible',ec1.identity_visible(e.id,viewer),'tags',ec1.tags_for('company',e.id),
   'premium',CASE WHEN e.type='prestataire' THEN ec1.premium(e.id) ELSE false END,
   'can_edit',ec1.member(e.id,true),'status',e.statut,
   'next_slot',(SELECT min(s.starts_at) FROM ec1.sessions s WHERE s.company_id=e.id AND s.kind IN ('creneau','permanence') AND s.status='ouvert' AND s.starts_at>now() AND (SELECT count(*) FROM ec1.registrations r WHERE r.session_id=s.id AND r.status='confirme')<s.capacity),
   'favorite',EXISTS(SELECT 1 FROM ec1.favorites f WHERE f.user_id=a.id AND f.target_type='company' AND f.target_id=e.id),
   'media',CASE WHEN ec1.identity_visible(e.id,viewer) THEN (SELECT jsonb_build_object('bucket',m.bucket,'path',m.path) FROM ec1.media m WHERE m.target_type='company' AND m.target_id=e.id LIMIT 1) ELSE NULL END) AS j
   FROM public.entreprises_ec e LEFT JOIN ec1.company_details d ON d.company_id=e.id WHERE e.organisation_id=a.organisation_id AND (e.statut='publiee' OR ec1.member(e.id) OR ec1.supervises(e.id))),
  people AS (SELECT jsonb_build_object('id',p.id,'kind','person','type',p.role,'name',ec1.person_name(p.id,viewer),'subtitle',CASE WHEN p.role='incube' AND p.entreprise_id IS NULL AND p.id<>a.id AND a.role<>'admin' THEN 'Contact startup' ELSE ec1.redact(coalesce(x.titre,''),p.entreprise_id,viewer) END,
   'description',CASE WHEN p.role='incube' AND p.entreprise_id IS NULL AND p.id<>a.id AND a.role<>'admin' THEN '' ELSE ec1.redact(ec1.plain(x.bio_html),p.entreprise_id,viewer) END,'company_id',p.entreprise_id,'company_name',ec1.company_name(p.entreprise_id,viewer),
   'city','','identity_visible',p.id=a.id OR p.role<>'incube' OR ec1.identity_visible(p.entreprise_id,viewer),'tags',ec1.tags_for('person',p.id),'premium',false,'can_edit',p.id=a.id OR a.role='admin',
   'next_slot',(SELECT min(s.starts_at) FROM ec1.sessions s WHERE s.host_id=p.id AND s.kind IN ('creneau','permanence') AND s.status='ouvert' AND s.starts_at>now() AND (SELECT count(*) FROM ec1.registrations r WHERE r.session_id=s.id AND r.status='confirme')<s.capacity),
   'favorite',EXISTS(SELECT 1 FROM ec1.favorites f WHERE f.user_id=a.id AND f.target_type='person' AND f.target_id=p.id),
   'media',CASE WHEN p.role<>'incube' OR p.id=a.id OR ec1.identity_visible(p.entreprise_id,viewer) THEN (SELECT jsonb_build_object('bucket',m.bucket,'path',m.path) FROM ec1.media m WHERE m.target_type='person' AND m.target_id=p.id LIMIT 1) ELSE NULL END) AS j
   FROM public.profiles p LEFT JOIN public.personnes_annuaire_ec x ON x.profile_id=p.id
   WHERE p.organisation_id=a.organisation_id AND p.statut='actif' AND (coalesce(x.visible,false) OR p.id=a.id OR a.role='admin' OR ec1.supervises(p.entreprise_id))),
  all_items AS (SELECT * FROM companies UNION ALL SELECT * FROM people),
  filtered AS (SELECT t.j FROM all_items t WHERE (coalesce(p_args->>'kind','') IN ('','all') OR t.j->>'kind'=p_args->>'kind')
   AND (coalesce(p_args->>'type','')='' OR t.j->>'type'=p_args->>'type')
   AND (q='' OR ec1.norm(concat_ws(' ',t.j->>'name',t.j->>'subtitle',t.j->>'company_name',(t.j->'tags')::text)) LIKE '%'||ec1.norm(q)||'%')
   AND (NOT coalesce((p_args->>'favorites')::boolean,false) OR (t.j->>'favorite')::boolean))
  SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(z.j) FROM (SELECT f.j FROM filtered f ORDER BY f.j->>'name',f.j->>'id' LIMIT size_no OFFSET page_no*size_no)z),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result;
  RETURN result;
 WHEN 'company' THEN
  IF NOT EXISTS(SELECT 1 FROM public.entreprises_ec e WHERE e.id=rid AND e.organisation_id=a.organisation_id AND (e.statut='publiee' OR ec1.member(e.id) OR ec1.supervises(e.id))) THEN RAISE EXCEPTION 'Entreprise introuvable.';END IF;
  RETURN jsonb_build_object('id',rid,'name',ec1.company_name(rid,viewer),'can_edit',ec1.member(rid,true),
   'media',CASE WHEN ec1.identity_visible(rid,viewer) THEN (SELECT jsonb_build_object('bucket',m.bucket,'path',m.path) FROM ec1.media m WHERE m.target_type='company' AND m.target_id=rid LIMIT 1) ELSE NULL END,
   'details',CASE WHEN ec1.identity_visible(rid,viewer) THEN (SELECT (to_jsonb(d)-'phone'-'contact_email') || CASE WHEN ec1.member(rid) OR ec1.supervises(rid) OR d.share_contact THEN jsonb_build_object('phone',d.phone,'contact_email',d.contact_email) ELSE '{}'::jsonb END FROM ec1.company_details d WHERE d.company_id=rid) ELSE '{}'::jsonb END,
   'members',CASE WHEN ec1.member(rid) OR ec1.supervises(rid) THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',ec1.person_name(p.id,viewer),'role',m.role_membre,'active',m.actif,'email',u.email))
    FROM public.entreprise_membres_ec m JOIN public.profiles p ON p.id=m.profile_id JOIN auth.users u ON u.id=p.id WHERE m.entreprise_id=rid),'[]') ELSE '[]'::jsonb END,
   'tags',ec1.tags_for('company',rid));
 WHEN 'tags' THEN
  RETURN coalesce((SELECT jsonb_agg(z.j) FROM (SELECT jsonb_build_object('id',t.id,'label',t.label) AS j FROM ec1.tags t WHERE t.organisation_id=a.organisation_id
   AND (q='' OR t.normalized LIKE '%'||ec1.norm(q)||'%') ORDER BY CASE WHEN t.normalized=ec1.norm(q) THEN 0 WHEN t.normalized LIKE ec1.norm(q)||'%' THEN 1 ELSE 2 END,t.label LIMIT 15)z),'[]');
 WHEN 'sessions' THEN
  WITH visible AS (SELECT ec1.session_json(s.id,viewer) AS j FROM ec1.sessions s WHERE s.organisation_id=a.organisation_id
    AND (nullif(p_args->>'host_id','') IS NULL OR s.host_id=(p_args->>'host_id')::uuid)
    AND (nullif(p_args->>'target_company','') IS NULL OR s.company_id=(p_args->>'target_company')::uuid)
    AND (nullif(p_args->>'from','') IS NULL OR s.starts_at>=CASE WHEN length(p_args->>'from')=10 THEN (p_args->>'from')::date::timestamp AT TIME ZONE 'Europe/Paris' ELSE (p_args->>'from')::timestamptz END)
    AND (nullif(p_args->>'to','') IS NULL OR s.starts_at<CASE WHEN length(p_args->>'to')=10 THEN (p_args->>'to')::date::timestamp AT TIME ZONE 'Europe/Paris' ELSE (p_args->>'to')::timestamptz END)),
  filtered AS (SELECT v.j FROM visible v WHERE v.j IS NOT NULL
   AND (coalesce(p_args->>'scope','')<>'mine' OR (v.j->>'mine')::boolean)
   AND (coalesce(p_args->>'kind','')='' OR v.j->>'kind'=p_args->>'kind')
   AND (q='' OR ec1.norm(concat_ws(' ',v.j->>'title',v.j->>'host_name')) LIKE '%'||ec1.norm(q)||'%'))
  SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(z.j) FROM (SELECT f.j FROM filtered f ORDER BY f.j->>'starts_at' LIMIT size_no OFFSET page_no*size_no)z),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result;
  RETURN result;
 WHEN 'session' THEN
  result:=ec1.session_json(rid,viewer);IF result IS NULL THEN RAISE EXCEPTION 'Rendez-vous introuvable.';END IF;RETURN result;
 WHEN 'notifications' THEN
  RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(z.j) FROM (SELECT to_jsonb(x)-'user_id' AS j FROM ec1.notifications x WHERE x.user_id=a.id ORDER BY x.created_at DESC LIMIT size_no OFFSET page_no*size_no)z),'[]'),
   'total',(SELECT count(*) FROM ec1.notifications x WHERE x.user_id=a.id));
 WHEN 'portfolio' THEN
  IF a.role NOT IN ('admin','startup_manager') THEN RAISE EXCEPTION 'Supervision reservee aux Startup Managers.' USING ERRCODE='42501';END IF;
  RETURN jsonb_build_object('startups',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'name',e.nom,
   'needs',(SELECT count(*) FROM ec1.needs n WHERE n.company_id=e.id AND n.status NOT IN ('brouillon','termine','sans_suite')),
   'no_response',(SELECT count(*) FROM ec1.needs n WHERE n.company_id=e.id AND n.status='ouvert' AND NOT EXISTS(SELECT 1 FROM ec1.responses r WHERE r.need_id=n.id)),
   'contacts',(SELECT count(DISTINCT r.company_id) FROM ec1.responses r JOIN ec1.needs n ON n.id=r.need_id WHERE n.company_id=e.id),
   'sessions',(SELECT count(*) FROM ec1.registrations r JOIN ec1.sessions s ON s.id=r.session_id WHERE r.company_id=e.id AND r.status='confirme' AND s.starts_at>=now()),
   'tasks',(SELECT count(*) FROM ec1.followups f WHERE f.company_id=e.id AND NOT f.done AND f.due_at<=current_date)) ORDER BY e.nom)
   FROM public.entreprises_ec e WHERE e.organisation_id=a.organisation_id AND e.type='startup' AND ec1.supervises(e.id)),'[]'),
   'notes',CASE WHEN rid IS NOT NULL AND ec1.supervises(rid) THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',f.id,'body',f.body,'due_at',f.due_at,'done',f.done,'author',ec1.person_name(f.author_id),'created_at',f.created_at) ORDER BY f.created_at DESC) FROM ec1.followups f WHERE f.company_id=rid),'[]') ELSE '[]'::jsonb END,
   'needs',CASE WHEN rid IS NOT NULL AND ec1.supervises(rid) THEN coalesce((SELECT jsonb_agg(ec1.need_json(n.id,viewer) ORDER BY n.created_at DESC) FROM ec1.needs n WHERE n.company_id=rid),'[]') ELSE '[]'::jsonb END,
   'contacts',CASE WHEN rid IS NOT NULL AND ec1.supervises(rid) THEN coalesce((SELECT jsonb_agg(ec1.response_json(r.id,viewer)) FROM ec1.responses r JOIN ec1.needs n ON n.id=r.need_id WHERE n.company_id=rid),'[]') ELSE '[]'::jsonb END,
   'sessions',CASE WHEN rid IS NOT NULL AND ec1.supervises(rid) THEN coalesce((SELECT jsonb_agg(ec1.session_json(s.id,viewer) ORDER BY s.starts_at DESC) FROM ec1.sessions s WHERE EXISTS(SELECT 1 FROM ec1.registrations r WHERE r.session_id=s.id AND r.company_id=rid)),'[]') ELSE '[]'::jsonb END);
 WHEN 'offers' THEN
  WITH entries AS (SELECT jsonb_build_object('id',o.id,'company_id',p.entreprise_id,'title',o.titre,'description',o.description,'format',o.format,'price',o.tarif_centimes,
   'provider',e.nom,'can_edit',ec1.member(e.id,true),'tags',ec1.tags_for('offer',o.id),'media',(SELECT jsonb_build_object('bucket',m.bucket,'path',m.path) FROM ec1.media m WHERE m.target_type='offer' AND m.target_id=o.id LIMIT 1),
   'benefit',CASE WHEN a.role IN ('incube','admin','startup_manager') THEN (SELECT i.avantage FROM public.offres_incubes i WHERE i.offre_id=o.id AND i.actif) ELSE NULL END,
   'favorite',EXISTS(SELECT 1 FROM ec1.favorites f WHERE f.user_id=a.id AND f.target_type='offer' AND f.target_id=o.id)) AS j
   FROM public.offres o JOIN public.prestataires p ON p.id=o.prestataire_id JOIN public.entreprises_ec e ON e.id=p.entreprise_id
   WHERE o.organisation_id=a.organisation_id AND ((o.statut='publiee' AND p.statut='valide' AND e.statut='publiee') OR ec1.member(e.id))),
  filtered AS (SELECT x.j FROM entries x WHERE (q='' OR ec1.norm(concat_ws(' ',x.j->>'title',x.j->>'provider',(x.j->'tags')::text)) LIKE '%'||ec1.norm(q)||'%')
   AND (NOT coalesce((p_args->>'favorites')::boolean,false) OR (x.j->>'favorite')::boolean))
  SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(z.j) FROM (SELECT f.j FROM filtered f ORDER BY f.j->>'title' LIMIT size_no OFFSET page_no*size_no)z),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result;RETURN result;
 WHEN 'admin' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Administration requise.' USING ERRCODE='42501';END IF;
  RETURN jsonb_build_object('users',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.nom,'role',p.role,'status',p.statut,'email',u.email,'confirmed',u.email_confirmed_at IS NOT NULL,'created_at',p.created_at) ORDER BY p.created_at DESC)
   FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.organisation_id=a.organisation_id AND (q='' OR coalesce(p.nom,'') ILIKE '%'||q||'%' OR u.email ILIKE '%'||q||'%')),'[]'),
   'companies',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'name',e.nom,'type',e.type,'status',e.statut,'provider_status',p.statut,'premium',ec1.premium(e.id),'expires_at',pa.expire_le) ORDER BY e.nom)
    FROM public.entreprises_ec e LEFT JOIN public.prestataires p ON p.entreprise_id=e.id LEFT JOIN public.ec090_premium_admin pa ON pa.entreprise_id=e.id WHERE e.organisation_id=a.organisation_id),'[]'),
   'assignments',coalesce((SELECT jsonb_agg(to_jsonb(m)-'attribue_par') FROM public.ec_manager_portefeuille m JOIN public.profiles p ON p.id=m.manager_id WHERE p.organisation_id=a.organisation_id),'[]'),
   'history',coalesce((SELECT jsonb_agg(z.j) FROM (SELECT jsonb_build_object('action',h.action,'date',h.created_at,'actor',ec1.person_name(h.actor_id),'detail',h.detail) AS j FROM ec1.history h WHERE h.organisation_id=a.organisation_id ORDER BY h.created_at DESC LIMIT 60)z),'[]'),
   'import_report',coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM ec1.import_report i),'[]'));
 ELSE RAISE EXCEPTION 'Action de lecture inconnue.';
 END CASE;
END $$;
CREATE OR REPLACE FUNCTION ec1.write_action(p_action text,p_args jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; viewer uuid; rid uuid; target uuid; out_id uuid; n ec1.needs; r ec1.responses; s ec1.sessions;
 e public.entreprises_ec; p public.profiles; v_status text; v_text text; v_role text; v_type text; v_bool boolean;
 v_start timestamptz; v_end timestamptz; v_local timestamp; v_zone text; v_duration integer; v_repeat integer; v_step integer; v_minutes integer;
 v_series uuid; i integer; j integer; v_host uuid; v_count integer; v_conflict boolean; v_notify uuid; v_reg ec1.registrations;
 v_provider uuid; v_company uuid; v_name text; v_path text; v_owner uuid;
BEGIN
 a:=ec1.actor();viewer:=nullif(p_args->>'company','')::uuid;rid:=nullif(p_args->>'id','')::uuid;
 IF NOT (SELECT x.active FROM ec1.runtime x WHERE x.id) THEN RAISE EXCEPTION 'V1 en attente d activation. Executer 02_ACTIVER_V1.sql dans Supabase.';END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=a.id AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmez votre adresse email avant de modifier des donnees.';END IF;
 IF viewer IS NOT NULL AND NOT ec1.member(viewer) THEN RAISE EXCEPTION 'Entreprise de travail non autorisee.' USING ERRCODE='42501';END IF;
 CASE p_action
 WHEN 'save_need' THEN
  SELECT x.* INTO e FROM public.entreprises_ec x WHERE x.id=viewer AND x.organisation_id=a.organisation_id AND x.type='startup';
  IF e.id IS NULL OR a.role NOT IN ('incube','admin') OR NOT ec1.member(e.id,true) THEN RAISE EXCEPTION 'Selectionnez votre startup. Seuls ses gestionnaires publient des demandes.' USING ERRCODE='42501';END IF;
  v_status:=coalesce(p_args->>'status','ouvert');
  IF v_status NOT IN ('brouillon','ouvert') THEN RAISE EXCEPTION 'Statut de publication invalide.';END IF;
  IF nullif(p_args->>'deadline','') IS NOT NULL AND ((p_args->>'deadline')::timestamp AT TIME ZONE 'Europe/Paris')<=now() THEN RAISE EXCEPTION 'La date limite doit etre dans le futur.';END IF;
  IF rid IS NOT NULL THEN
   SELECT x.* INTO n FROM ec1.needs x WHERE x.id=rid AND (x.company_id=e.id OR (x.company_id IS NULL AND (x.author_id=a.id OR a.role='admin'))) FOR UPDATE;
   IF n.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable.';END IF;
   IF n.status<>'brouillon' THEN v_status:=n.status;END IF;
  END IF;
  INSERT INTO ec1.needs(id,organisation_id,company_id,author_id,title,context,objectives,deliverables,constraints_text,budget_min,budget_max,deadline,format,status,contact_name,contact_email,contact_phone,share_contact)
  VALUES(coalesce(rid,gen_random_uuid()),a.organisation_id,e.id,a.id,trim(p_args->>'title'),trim(p_args->>'context'),coalesce(p_args->>'objectives',''),coalesce(p_args->>'deliverables',''),coalesce(p_args->>'constraints',''),
   nullif(p_args->>'budget_min','')::integer,nullif(p_args->>'budget_max','')::integer,nullif(p_args->>'deadline','')::timestamp AT TIME ZONE 'Europe/Paris',coalesce(p_args->>'format','distance'),v_status,
   left(coalesce(p_args->>'contact_name',''),160),left(coalesce(p_args->>'contact_email',''),250),left(coalesce(p_args->>'contact_phone',''),45),coalesce((p_args->>'share_contact')::boolean,false))
  ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,context=excluded.context,objectives=excluded.objectives,deliverables=excluded.deliverables,
   constraints_text=excluded.constraints_text,budget_min=excluded.budget_min,budget_max=excluded.budget_max,deadline=excluded.deadline,format=excluded.format,status=excluded.status,
   contact_name=excluded.contact_name,contact_email=excluded.contact_email,contact_phone=excluded.contact_phone,share_contact=excluded.share_contact,updated_at=now() RETURNING id INTO out_id;
  PERFORM ec1.set_tags('need',out_id,coalesce(p_args->'tags','[]'));
  PERFORM ec1.audit('need',out_id,CASE WHEN rid IS NULL THEN 'demande_creee' ELSE 'demande_modifiee' END,jsonb_build_object('statut',v_status));
  IF v_status='ouvert' AND (rid IS NULL OR n.status='brouillon') THEN
   INSERT INTO ec1.notifications(user_id,title,target_type,target_id)
   SELECT DISTINCT m.profile_id,'Un besoin correspond a vos expertises','need',out_id
   FROM ec1.tag_links nt JOIN ec1.tag_links et ON et.tag_id=nt.tag_id AND et.target_type='company'
   JOIN public.entreprises_ec ee ON ee.id=et.target_id AND ee.type='prestataire' AND ee.statut='publiee'
   JOIN public.entreprise_membres_ec m ON m.entreprise_id=ee.id AND m.actif JOIN public.profiles pp ON pp.id=m.profile_id AND pp.statut='actif' AND pp.role='prestataire'
   WHERE nt.target_type='need' AND nt.target_id=out_id AND ee.organisation_id=a.organisation_id;
  END IF;
  RETURN jsonb_build_object('id',out_id);
 WHEN 'need_status' THEN
  SELECT x.* INTO n FROM ec1.needs x WHERE x.id=rid AND x.organisation_id=a.organisation_id FOR UPDATE;
  IF n.id IS NULL OR NOT ec1.member(n.company_id,true) THEN RAISE EXCEPTION 'Demande introuvable ou non modifiable.' USING ERRCODE='42501';END IF;
  v_status:=p_args->>'status';v_text:=left(coalesce(p_args->>'reason',''),1500);
  IF v_status NOT IN ('ouvert','en_echanges','rdv_planifie','devis_recu','en_realisation','termine','en_pause','sans_suite') THEN RAISE EXCEPTION 'Statut inconnu.';END IF;
  IF n.status IN ('termine','sans_suite') AND v_status<>'ouvert' THEN RAISE EXCEPTION 'Reouvrez la demande avant de changer son avancement.';END IF;
  IF v_status IN ('sans_suite','en_pause') AND length(trim(v_text))<5 THEN RAISE EXCEPTION 'Indiquez le motif de cette decision.';END IF;
  UPDATE ec1.needs nn SET status=v_status,updated_at=now() WHERE nn.id=n.id;
  PERFORM ec1.audit('need',rid,CASE WHEN n.status IN ('termine','sans_suite') THEN 'demande_reouverte' ELSE 'statut_demande' END,jsonb_build_object('ancien',n.status,'nouveau',v_status));
  FOR v_company IN SELECT DISTINCT rr.company_id FROM ec1.responses rr WHERE rr.need_id=rid LOOP
   PERFORM ec1.notify_company(v_company,'Le statut d une demande suivie a change','need',rid);
  END LOOP;
  RETURN jsonb_build_object('id',rid);
 WHEN 'respond' THEN
  SELECT x.* INTO n FROM ec1.needs x WHERE x.id=rid AND x.organisation_id=a.organisation_id FOR SHARE;
  IF n.id IS NULL OR n.status NOT IN ('ouvert','en_echanges','rdv_planifie','devis_recu') OR (n.deadline IS NOT NULL AND n.deadline<=now()) THEN RAISE EXCEPTION 'Cette demande ne recoit plus de nouvelles reponses.';END IF;
  IF a.role<>'prestataire' OR NOT ec1.member(viewer,true) THEN RAISE EXCEPTION 'Un gestionnaire de l entreprise prestataire doit repondre.' USING ERRCODE='42501';END IF;
  SELECT pr.id INTO v_provider FROM public.prestataires pr JOIN public.entreprises_ec ee ON ee.id=pr.entreprise_id
   WHERE pr.entreprise_id=viewer AND pr.statut='valide' AND ee.statut='publiee' AND ee.organisation_id=a.organisation_id FOR UPDATE OF pr;
  IF v_provider IS NULL THEN RAISE EXCEPTION 'Votre entreprise doit etre validee par l administrateur avant de repondre.';END IF;
  IF EXISTS(SELECT 1 FROM ec1.responses rr WHERE rr.need_id=rid AND rr.company_id=viewer) THEN RAISE EXCEPTION 'Votre entreprise a deja repondu. Retrouvez son dossier dans Messages.';END IF;
  IF NOT ec1.premium(viewer) AND (SELECT count(*) FROM ec1.responses rr WHERE rr.company_id=viewer AND rr.created_at>=date_trunc('month',now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris') >= (SELECT t.free_response_quota FROM ec1.runtime t WHERE t.id)
  THEN RAISE EXCEPTION 'Quota mensuel atteint. Contactez votre administrateur pour activer Premium.';END IF;
  INSERT INTO ec1.responses(need_id,company_id,author_id,message,approach,price,lead_days)
   VALUES(rid,viewer,a.id,trim(p_args->>'message'),coalesce(p_args->>'approach',''),nullif(p_args->>'price','')::integer,nullif(p_args->>'lead_days','')::integer) RETURNING id INTO out_id;
  PERFORM ec1.audit('response',out_id,'reponse_envoyee');
  PERFORM ec1.notify_company(n.company_id,'Vous avez recu une nouvelle proposition','need',n.id);
  RETURN jsonb_build_object('id',out_id);
 WHEN 'response_status' THEN
  SELECT x.* INTO r FROM ec1.responses x WHERE x.id=rid FOR UPDATE;SELECT x.* INTO n FROM ec1.needs x WHERE x.id=r.need_id;
  IF n.organisation_id IS DISTINCT FROM a.organisation_id OR r.id IS NULL THEN RAISE EXCEPTION 'Reponse introuvable.';END IF;
  v_status:=p_args->>'status';
  IF v_status='retiree' THEN
   IF NOT ec1.member(r.company_id,true) OR r.status IN ('retenue','declinee','retiree') THEN RAISE EXCEPTION 'Retrait non autorise.';END IF;
  ELSE
   IF NOT ec1.member(n.company_id,true) OR v_status NOT IN ('en_discussion','retenue','declinee') OR r.status='retiree' THEN RAISE EXCEPTION 'Seule la startup peut donner suite ou decliner.' USING ERRCODE='42501';END IF;
  END IF;
  UPDATE ec1.responses rr SET status=v_status,reason=left(coalesce(p_args->>'reason',''),2000),updated_at=now() WHERE rr.id=r.id;
  IF v_status='en_discussion' AND n.status='ouvert' THEN UPDATE ec1.needs nn SET status='en_echanges',updated_at=now() WHERE nn.id=n.id;END IF;
  PERFORM ec1.audit('response',rid,'decision_reponse',jsonb_build_object('ancien',r.status,'nouveau',v_status));
  PERFORM ec1.notify_company(CASE WHEN v_status='retiree' THEN n.company_id ELSE r.company_id END,'Une decision a ete prise sur votre dossier','thread',rid);
  RETURN jsonb_build_object('id',rid);
 WHEN 'send_message' THEN
  IF NOT ec1.can_response(rid,true) THEN RAISE EXCEPTION 'Conversation introuvable ou en lecture seule.' USING ERRCODE='42501';END IF;
  SELECT x.* INTO r FROM ec1.responses x WHERE x.id=rid;SELECT x.* INTO n FROM ec1.needs x WHERE x.id=r.need_id;
  IF r.status IN ('declinee','retiree') THEN RAISE EXCEPTION 'Ce dossier est clos. Demandez sa reouverture a la startup.';END IF;
  IF r.status='envoyee' AND NOT ec1.member(n.company_id,true) THEN RAISE EXCEPTION 'Attendez que la startup donne suite avant d envoyer un nouveau message.';END IF;
  IF r.status='envoyee' THEN UPDATE ec1.responses rr SET status='en_discussion',updated_at=now() WHERE rr.id=r.id;END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text,101));
  IF (SELECT count(*) FROM ec1.messages mm WHERE mm.author_id=a.id AND mm.created_at>now()-interval '1 minute')>=20 THEN RAISE EXCEPTION 'Trop de messages. Patientez une minute.';END IF;
  INSERT INTO ec1.messages(response_id,author_id,body) VALUES(rid,a.id,trim(p_args->>'body')) RETURNING id INTO out_id;
  v_notify:=CASE WHEN ec1.member(n.company_id) THEN r.company_id ELSE n.company_id END;
  PERFORM ec1.notify_company(v_notify,'Nouveau message dans votre dossier','thread',rid);
  PERFORM ec1.audit('response',rid,'message_envoye');RETURN jsonb_build_object('id',out_id);
 WHEN 'read_thread' THEN
  IF NOT ec1.can_response(rid) THEN RAISE EXCEPTION 'Conversation introuvable.';END IF;
  INSERT INTO ec1.read_cursors(user_id,response_id,last_read) VALUES(a.id,rid,least(coalesce(nullif(p_args->>'until','')::timestamptz,now()),now()))
   ON CONFLICT(user_id,response_id) DO UPDATE SET last_read=greatest(ec1.read_cursors.last_read,excluded.last_read);
  UPDATE ec1.notifications nn SET read_at=now() WHERE nn.user_id=a.id AND nn.target_type='thread' AND nn.target_id=rid AND nn.read_at IS NULL;
  RETURN '{}'::jsonb;
 WHEN 'read_notification' THEN
  UPDATE ec1.notifications nn SET read_at=now() WHERE nn.user_id=a.id AND (rid IS NULL OR nn.id=rid) AND nn.read_at IS NULL;RETURN '{}'::jsonb;
 WHEN 'favorite' THEN
  v_type:=p_args->>'type';v_bool:=coalesce((p_args->>'value')::boolean,false);
  IF v_type='need' AND NOT ec1.can_need(rid) THEN RAISE EXCEPTION 'Demande introuvable.';END IF;
  IF v_type='company' AND NOT EXISTS(SELECT 1 FROM public.entreprises_ec ee WHERE ee.id=rid AND ee.organisation_id=a.organisation_id AND (ee.statut='publiee' OR ec1.member(ee.id))) THEN RAISE EXCEPTION 'Entreprise introuvable.';END IF;
  IF v_type='person' AND NOT EXISTS(SELECT 1 FROM public.profiles pp LEFT JOIN public.personnes_annuaire_ec xx ON xx.profile_id=pp.id WHERE pp.id=rid AND pp.organisation_id=a.organisation_id AND pp.statut='actif' AND (xx.visible OR pp.id=a.id OR a.role='admin' OR ec1.supervises(pp.entreprise_id))) THEN RAISE EXCEPTION 'Contact introuvable.';END IF;
  IF v_type='offer' AND NOT EXISTS(SELECT 1 FROM public.offres oo WHERE oo.id=rid AND oo.organisation_id=a.organisation_id) THEN RAISE EXCEPTION 'Offre introuvable.';END IF;
  IF v_type='session' AND ec1.session_json(rid,viewer) IS NULL THEN RAISE EXCEPTION 'Evenement introuvable.';END IF;
  IF v_bool THEN INSERT INTO ec1.favorites(user_id,target_type,target_id) VALUES(a.id,v_type,rid) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM ec1.favorites f WHERE f.user_id=a.id AND f.target_type=v_type AND f.target_id=rid;END IF;
  RETURN jsonb_build_object('favorite',v_bool);
 WHEN 'create_session' THEN
  v_type:=p_args->>'kind';v_host:=a.id;v_zone:='Europe/Paris';
  IF v_type NOT IN ('creneau','permanence','atelier','proposition') THEN RAISE EXCEPTION 'Type de rendez-vous inconnu.';END IF;
  IF v_type='proposition' THEN
   target:=nullif(p_args->>'response_id','')::uuid;
   IF target IS NULL OR NOT ec1.can_response(target,true) THEN RAISE EXCEPTION 'Une proposition de creneau doit etre rattachee a un dossier autorise.';END IF;
   SELECT x.* INTO r FROM ec1.responses x WHERE x.id=target;SELECT x.* INTO n FROM ec1.needs x WHERE x.id=r.need_id;
   IF r.status IN ('declinee','retiree') THEN RAISE EXCEPTION 'Dossier clos.';END IF;
   IF r.status='envoyee' AND NOT ec1.member(n.company_id,true) THEN RAISE EXCEPTION 'La startup doit donner suite avant de proposer un rendez-vous.';END IF;
   v_notify:=CASE WHEN ec1.member(n.company_id) THEN r.author_id ELSE n.author_id END;
  ELSE
   IF a.role NOT IN ('admin','startup_manager','prestataire') THEN RAISE EXCEPTION 'Les prestataires et Startup Managers peuvent proposer des disponibilites et des ateliers.';END IF;
   IF a.role='prestataire' AND NOT EXISTS(SELECT 1 FROM public.prestataires pr WHERE pr.entreprise_id=viewer AND pr.statut='valide' AND ec1.member(viewer)) THEN RAISE EXCEPTION 'Selectionnez une entreprise prestataire validee.';END IF;
  END IF;
  v_local:=nullif(p_args->>'start_local','')::timestamp;v_duration:=coalesce((p_args->>'duration')::integer,30);
  v_repeat:=coalesce((p_args->>'weeks')::integer,1);v_step:=v_duration+coalesce((p_args->>'break_minutes')::integer,0);
  v_minutes:=CASE WHEN v_type='permanence' THEN coalesce((p_args->>'block_minutes')::integer,120) ELSE v_duration END;
  IF v_local IS NULL OR v_duration NOT BETWEEN 15 AND 480 OR v_repeat NOT BETWEEN 1 AND 12 OR v_step<v_duration OR v_minutes<v_duration OR v_minutes>480 THEN RAISE EXCEPTION 'Horaires ou recurrence invalides.';END IF;
  IF v_type<>'permanence' THEN v_repeat:=1;END IF;
  v_series:=gen_random_uuid();PERFORM pg_advisory_xact_lock(hashtextextended(v_host::text,102));
  FOR i IN 0..v_repeat-1 LOOP
   j:=0;
   WHILE j+v_duration<=v_minutes LOOP
    v_start:=(v_local+make_interval(days=>i*7,mins=>j)) AT TIME ZONE v_zone;v_end:=v_start+make_interval(mins=>v_duration);
    IF v_start<=now() OR v_start>now()+interval '1 year' THEN RAISE EXCEPTION 'Choisissez un creneau futur dans les douze prochains mois.';END IF;
    IF EXISTS(SELECT 1 FROM ec1.sessions ss WHERE ss.host_id=v_host AND ss.status<>'annule' AND tstzrange(ss.starts_at,ss.ends_at,'[)') && tstzrange(v_start,v_end,'[)'))
     OR EXISTS(SELECT 1 FROM ec1.registrations rr JOIN ec1.sessions ss ON ss.id=rr.session_id WHERE rr.user_id=a.id AND rr.status='confirme' AND ss.status<>'annule' AND tstzrange(ss.starts_at,ss.ends_at,'[)') && tstzrange(v_start,v_end,'[)'))
    THEN RAISE EXCEPTION 'Vous avez deja un rendez-vous ou une disponibilite sur cette plage. Aucune date de la serie n a ete ajoutee.';END IF;
    INSERT INTO ec1.sessions(organisation_id,host_id,company_id,kind,title,description,starts_at,ends_at,timezone,capacity,mode,location,need_id,response_id,invitee_id,series_id)
    VALUES(a.organisation_id,v_host,viewer,v_type,trim(p_args->>'title'),coalesce(p_args->>'description',''),v_start,v_end,v_zone,
     CASE WHEN v_type='atelier' THEN coalesce((p_args->>'capacity')::integer,20) ELSE 1 END,coalesce(p_args->>'mode','visio'),coalesce(p_args->>'location',''),
     CASE WHEN v_type='proposition' THEN n.id ELSE NULL END,CASE WHEN v_type='proposition' THEN target ELSE NULL END,CASE WHEN v_type='proposition' THEN v_notify ELSE NULL END,v_series)
    RETURNING id INTO out_id;
    PERFORM ec1.set_tags('session',out_id,coalesce(p_args->'tags','[]'));
    j:=j+v_step;
   END LOOP;
  END LOOP;
  IF v_type='proposition' THEN
   INSERT INTO ec1.notifications(user_id,title,target_type,target_id) VALUES(v_notify,'Un creneau vous a ete propose','session',out_id);
  END IF;
  PERFORM ec1.audit('session',out_id,'creneaux_proposes',jsonb_build_object('type',v_type,'series',v_series));
  RETURN jsonb_build_object('id',out_id);
 WHEN 'book_session' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text,102));
  SELECT ss.* INTO s FROM ec1.sessions ss WHERE ss.id=rid AND ss.organisation_id=a.organisation_id FOR UPDATE;
  IF s.id IS NULL OR s.status<>'ouvert' OR s.starts_at<=now() OR s.host_id=a.id THEN RAISE EXCEPTION 'Ce creneau n est pas reservable.';END IF;
  IF s.kind='proposition' AND s.invitee_id IS DISTINCT FROM a.id AND NOT ec1.can_response(s.response_id,true) THEN RAISE EXCEPTION 'Cette proposition ne vous est pas destinee.';END IF;
  IF s.response_id IS NOT NULL THEN
   SELECT rr.* INTO r FROM ec1.responses rr WHERE rr.id=s.response_id;SELECT nn.* INTO n FROM ec1.needs nn WHERE nn.id=r.need_id;
   IF ec1.member(CASE WHEN s.host_id=n.author_id THEN n.company_id ELSE r.company_id END) THEN RAISE EXCEPTION 'La proposition doit etre acceptee par votre interlocuteur.';END IF;
  END IF;
  SELECT rr.* INTO v_reg FROM ec1.registrations rr WHERE rr.session_id=s.id AND rr.user_id=a.id;
  IF v_reg.status IN ('confirme','attente','present') THEN RETURN jsonb_build_object('id',v_reg.id,'status',v_reg.status);END IF;
  IF EXISTS(SELECT 1 FROM ec1.sessions ss WHERE ss.host_id=a.id AND ss.status='ouvert' AND tstzrange(ss.starts_at,ss.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)'))
   OR EXISTS(SELECT 1 FROM ec1.registrations rr JOIN ec1.sessions ss ON ss.id=rr.session_id WHERE rr.user_id=a.id AND rr.status='confirme' AND ss.status='ouvert' AND tstzrange(ss.starts_at,ss.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)'))
  THEN RAISE EXCEPTION 'Vous avez deja un rendez-vous sur cette plage.';END IF;
  SELECT count(*) INTO v_count FROM ec1.registrations rr WHERE rr.session_id=s.id AND rr.status IN ('confirme','present','absent');
  IF v_count>=s.capacity AND s.kind<>'atelier' THEN RAISE EXCEPTION 'Ce creneau vient d etre reserve. Choisissez une autre disponibilite.';END IF;
  v_status:=CASE WHEN v_count>=s.capacity THEN 'attente' ELSE 'confirme' END;
  INSERT INTO ec1.registrations(session_id,user_id,company_id,status,purpose) VALUES(s.id,a.id,viewer,v_status,left(coalesce(p_args->>'purpose',''),1500))
   ON CONFLICT(session_id,user_id) DO UPDATE SET status=excluded.status,purpose=excluded.purpose,company_id=excluded.company_id RETURNING id INTO out_id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id) VALUES(s.host_id,CASE WHEN v_status='attente' THEN 'Une personne rejoint la liste d attente' ELSE 'Une reservation vient d etre confirmee' END,'session',s.id);
  IF s.need_id IS NOT NULL AND v_status='confirme' THEN UPDATE ec1.needs nn SET status='rdv_planifie',updated_at=now() WHERE nn.id=s.need_id AND nn.status IN ('ouvert','en_echanges');END IF;
  PERFORM ec1.audit('session',s.id,'reservation',jsonb_build_object('statut',v_status));RETURN jsonb_build_object('id',out_id,'status',v_status);
 WHEN 'cancel_booking' THEN
  SELECT ss.* INTO s FROM ec1.sessions ss WHERE ss.id=rid AND ss.organisation_id=a.organisation_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Reservation introuvable.';END IF;
  UPDATE ec1.registrations rr SET status='annule' WHERE rr.session_id=s.id AND rr.user_id=a.id AND rr.status IN ('confirme','attente') RETURNING rr.id INTO out_id;
  IF out_id IS NULL THEN RAISE EXCEPTION 'Aucune reservation active a annuler.';END IF;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id) VALUES(s.host_id,'Une personne a annule son inscription','session',s.id);
  -- Promotion en liste d'attente : ne pas imposer un rendez-vous en conflit.
  IF s.kind='atelier' AND s.starts_at>now() THEN
   FOR v_reg IN SELECT rr.* FROM ec1.registrations rr WHERE rr.session_id=s.id AND rr.status='attente' ORDER BY rr.created_at FOR UPDATE LOOP
    IF (SELECT count(*) FROM ec1.registrations rr WHERE rr.session_id=s.id AND rr.status='confirme')>=s.capacity THEN EXIT;END IF;
    IF pg_try_advisory_xact_lock(hashtextextended(v_reg.user_id::text,102)) AND NOT EXISTS(SELECT 1 FROM ec1.sessions ss WHERE ss.host_id=v_reg.user_id AND ss.status='ouvert' AND tstzrange(ss.starts_at,ss.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) AND NOT EXISTS(SELECT 1 FROM ec1.registrations rr JOIN ec1.sessions ss ON ss.id=rr.session_id WHERE rr.user_id=v_reg.user_id AND rr.status='confirme' AND ss.status='ouvert' AND tstzrange(ss.starts_at,ss.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) THEN
     UPDATE ec1.registrations rr SET status='confirme' WHERE rr.id=v_reg.id;
     INSERT INTO ec1.notifications(user_id,title,target_type,target_id) VALUES(v_reg.user_id,'Une place s est liberee : votre inscription est confirmee','session',s.id);EXIT;
    END IF;
   END LOOP;
  END IF;
  PERFORM ec1.audit('session',s.id,'desinscription');RETURN '{}'::jsonb;
 WHEN 'session_status' THEN
  SELECT ss.* INTO s FROM ec1.sessions ss WHERE ss.id=rid AND ss.organisation_id=a.organisation_id FOR UPDATE;
  IF s.id IS NULL OR (s.host_id<>a.id AND a.role<>'admin') THEN RAISE EXCEPTION 'Seul l organisateur peut modifier cet evenement.';END IF;
  v_status:=p_args->>'status';IF v_status NOT IN ('annule','realise') OR (v_status='realise' AND s.ends_at>now()) THEN RAISE EXCEPTION 'Changement de statut non autorise.';END IF;
  UPDATE ec1.sessions ss SET status=v_status WHERE ss.id=s.id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id) SELECT rr.user_id,CASE WHEN v_status='annule' THEN 'Votre rendez-vous ou atelier a ete annule' ELSE 'Votre evenement est termine' END,'session',s.id FROM ec1.registrations rr WHERE rr.session_id=s.id AND rr.status IN ('confirme','attente');
  PERFORM ec1.audit('session',s.id,'statut_evenement',jsonb_build_object('statut',v_status));RETURN '{}'::jsonb;
 WHEN 'attendance' THEN
  SELECT rr.* INTO v_reg FROM ec1.registrations rr WHERE rr.id=rid;SELECT ss.* INTO s FROM ec1.sessions ss WHERE ss.id=v_reg.session_id AND ss.organisation_id=a.organisation_id;
  IF s.id IS NULL OR (s.host_id<>a.id AND a.role<>'admin') OR s.starts_at>now() THEN RAISE EXCEPTION 'Emargement indisponible.';END IF;
  v_status:=p_args->>'status';IF v_status NOT IN ('present','absent') OR v_reg.status NOT IN ('confirme','present','absent') THEN RAISE EXCEPTION 'Statut de presence invalide.';END IF;
  UPDATE ec1.registrations rr SET status=v_status WHERE rr.id=rid;PERFORM ec1.audit('session',s.id,'emargement');RETURN '{}'::jsonb;
 WHEN 'followup' THEN
  target:=nullif(p_args->>'target_company','')::uuid;
  IF NOT ec1.supervises(target) THEN RAISE EXCEPTION 'Cette startup ne fait pas partie de votre portefeuille.' USING ERRCODE='42501';END IF;
  IF rid IS NULL THEN INSERT INTO ec1.followups(company_id,author_id,body,due_at) VALUES(target,a.id,trim(p_args->>'body'),nullif(p_args->>'due_at','')::date) RETURNING id INTO out_id;
  ELSE UPDATE ec1.followups f SET done=coalesce((p_args->>'done')::boolean,false) WHERE f.id=rid AND f.company_id=target RETURNING id INTO out_id;END IF;
  PERFORM ec1.audit('company',target,'suivi_manager');RETURN jsonb_build_object('id',out_id);
 WHEN 'save_profile' THEN
  v_name:=trim(p_args->>'name');IF length(v_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Votre nom doit contenir entre 2 et 120 caracteres.';END IF;
  UPDATE public.profiles pp SET nom=v_name,updated_at=now() WHERE pp.id=a.id;
  INSERT INTO public.personnes_annuaire_ec(profile_id,organisation_id,entreprise_id,nom_public,titre,bio_html,visible)
   VALUES(a.id,a.organisation_id,a.entreprise_id,v_name,left(coalesce(p_args->>'title',''),160),left(coalesce(p_args->>'bio',''),12000),coalesce((p_args->>'visible')::boolean,true))
   ON CONFLICT(profile_id) DO UPDATE SET nom_public=excluded.nom_public,titre=excluded.titre,bio_html=excluded.bio_html,visible=excluded.visible,updated_at=now();
  PERFORM ec1.set_tags('person',a.id,coalesce(p_args->'tags','[]'));RETURN jsonb_build_object('id',a.id);
 WHEN 'save_company' THEN
  IF rid IS NULL THEN
   IF a.role NOT IN ('prestataire','incube','admin') THEN RAISE EXCEPTION 'Contactez votre administrateur pour un rattachement.';END IF;
   v_type:=CASE WHEN a.role='admin' THEN coalesce(p_args->>'type','autre') WHEN a.role='incube' THEN 'startup' ELSE 'prestataire' END;
   IF EXISTS(SELECT 1 FROM public.entreprise_membres_ec m WHERE m.profile_id=a.id AND m.actif) AND a.role<>'admin' THEN RAISE EXCEPTION 'Vous etes deja rattache a une entreprise. Demandez un rattachement complementaire a l administrateur.';END IF;
   v_owner:=CASE WHEN a.role='admin' THEN coalesce(nullif(p_args->>'owner_id','')::uuid,a.id) ELSE a.id END;
   IF v_type NOT IN ('startup','prestataire','autre') THEN RAISE EXCEPTION 'Typologie invalide.';END IF;
   IF NOT EXISTS(SELECT 1 FROM public.profiles pp WHERE pp.id=v_owner AND pp.organisation_id=a.organisation_id AND pp.statut='actif' AND (v_type='autre' OR (v_type='startup' AND pp.role='incube') OR (v_type='prestataire' AND pp.role='prestataire'))) THEN RAISE EXCEPTION 'Selectionnez un proprietaire actif avec un role correspondant a l entreprise.';END IF;
   IF v_type='prestataire' AND EXISTS(SELECT 1 FROM public.prestataires pr WHERE pr.proprietaire_id=v_owner) THEN RAISE EXCEPTION 'Ce proprietaire dispose deja d une entreprise prestataire. Modifiez son entreprise existante.';END IF;
   INSERT INTO public.entreprises_ec(organisation_id,nom,type,statut,presentation_html,cree_par)
    VALUES(a.organisation_id,trim(p_args->>'name'),v_type,'brouillon',left(coalesce(p_args->>'description',''),16000),a.id) RETURNING id INTO out_id;
   INSERT INTO public.entreprise_membres_ec(entreprise_id,profile_id,role_membre) VALUES(out_id,v_owner,'proprietaire');
   UPDATE public.profiles pp SET entreprise_id=out_id WHERE pp.id=v_owner AND pp.entreprise_id IS NULL;
   IF v_type='prestataire' THEN
    IF length(trim(coalesce(p_args->>'description','')))<100 THEN RAISE EXCEPTION 'Presentation de l entreprise : 100 caracteres minimum.';END IF;
    INSERT INTO public.prestataires(organisation_id,entreprise_id,proprietaire_id,nom_public,description) VALUES(a.organisation_id,out_id,v_owner,trim(p_args->>'name'),trim(p_args->>'description'));
   END IF;
  ELSE
   IF NOT ec1.member(rid,true) THEN RAISE EXCEPTION 'Gestionnaire de l entreprise requis.';END IF;
   SELECT ee.* INTO e FROM public.entreprises_ec ee WHERE ee.id=rid;out_id:=rid;
   UPDATE public.entreprises_ec ee SET nom=trim(p_args->>'name'),presentation_html=left(coalesce(p_args->>'description',''),16000),updated_at=now() WHERE ee.id=rid;
   IF e.type='prestataire' AND length(trim(coalesce(p_args->>'description','')))>=100 THEN
    UPDATE public.prestataires pr SET nom_public=trim(p_args->>'name'),description=trim(p_args->>'description'),updated_at=now() WHERE pr.entreprise_id=rid;
   END IF;
  END IF;
  INSERT INTO ec1.company_details(company_id,sector,city,description,phone,contact_email,share_contact)
   VALUES(out_id,left(coalesce(p_args->>'sector',''),160),left(coalesce(p_args->>'city',''),120),left(coalesce(p_args->>'description',''),16000),
    left(coalesce(p_args->>'phone',''),45),left(coalesce(p_args->>'email',''),250),coalesce((p_args->>'share_contact')::boolean,false))
   ON CONFLICT(company_id) DO UPDATE SET sector=excluded.sector,city=excluded.city,description=excluded.description,phone=excluded.phone,contact_email=excluded.contact_email,share_contact=excluded.share_contact;
  PERFORM ec1.set_tags('company',out_id,coalesce(p_args->'tags','[]'));PERFORM ec1.audit('company',out_id,'entreprise_enregistree');RETURN jsonb_build_object('id',out_id);
 WHEN 'save_offer' THEN
  IF a.role NOT IN ('prestataire','admin') OR NOT ec1.member(viewer,true) THEN RAISE EXCEPTION 'Gestionnaire prestataire requis.';END IF;
  SELECT pr.id INTO v_provider FROM public.prestataires pr WHERE pr.entreprise_id=viewer AND pr.statut='valide' FOR UPDATE;
  IF v_provider IS NULL THEN RAISE EXCEPTION 'Votre entreprise doit etre validee avant de publier des offres.';END IF;
  IF rid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.offres oo WHERE oo.id=rid AND oo.prestataire_id=v_provider) THEN RAISE EXCEPTION 'Offre introuvable.';END IF;
  IF rid IS NULL AND NOT ec1.premium(viewer) AND (SELECT count(*) FROM public.offres oo WHERE oo.prestataire_id=v_provider AND oo.statut='publiee')>=3 THEN RAISE EXCEPTION 'Limite de 3 offres actives. Contactez l administrateur pour Premium.';END IF;
  INSERT INTO public.offres(id,organisation_id,prestataire_id,titre,description,format,tarif_centimes)
   VALUES(coalesce(rid,gen_random_uuid()),a.organisation_id,v_provider,trim(p_args->>'title'),trim(p_args->>'description'),coalesce(p_args->>'format','distance'),nullif(p_args->>'price','')::integer)
   ON CONFLICT(id) DO UPDATE SET titre=excluded.titre,description=excluded.description,format=excluded.format,tarif_centimes=excluded.tarif_centimes RETURNING id INTO out_id;
  IF length(trim(coalesce(p_args->>'benefit','')))>=10 THEN
   INSERT INTO public.offres_incubes(offre_id,organisation_id,avantage,actif) VALUES(out_id,a.organisation_id,left(p_args->>'benefit',500),true)
    ON CONFLICT(offre_id) DO UPDATE SET avantage=excluded.avantage,actif=true;
  ELSE UPDATE public.offres_incubes oi SET actif=false WHERE oi.offre_id=out_id;END IF;
  PERFORM ec1.set_tags('offer',out_id,coalesce(p_args->'tags','[]'));RETURN jsonb_build_object('id',out_id);
 WHEN 'admin_user' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Administration requise.' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(a.organisation_id::text,103));
  SELECT pp.* INTO p FROM public.profiles pp WHERE pp.id=rid AND pp.organisation_id=a.organisation_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Compte introuvable.';END IF;
  v_role:=p_args->>'role';v_status:=p_args->>'status';
  IF v_role NOT IN ('admin','incube','prestataire','startup_manager') OR v_status NOT IN ('actif','suspendu') THEN RAISE EXCEPTION 'Role ou statut invalide.';END IF;
  IF rid=a.id AND (v_role<>'admin' OR v_status<>'actif') THEN RAISE EXCEPTION 'Vous ne pouvez pas retirer votre propre acces administrateur.';END IF;
  IF p.role='admin' AND p.statut='actif' AND (v_role<>'admin' OR v_status<>'actif') AND (SELECT count(*) FROM public.profiles pp WHERE pp.organisation_id=a.organisation_id AND pp.role='admin' AND pp.statut='actif')<=1 THEN RAISE EXCEPTION 'Conservez au moins un administrateur actif.';END IF;
  UPDATE public.profiles pp SET role=v_role,statut=v_status,updated_at=now() WHERE pp.id=rid;
  PERFORM ec1.audit('person',rid,'administration_compte',jsonb_build_object('role',v_role,'statut',v_status));RETURN '{}'::jsonb;
 WHEN 'admin_company' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Administration requise.' USING ERRCODE='42501';END IF;
  SELECT ee.* INTO e FROM public.entreprises_ec ee WHERE ee.id=rid AND ee.organisation_id=a.organisation_id FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Entreprise introuvable.';END IF;
  v_status:=p_args->>'status';IF v_status NOT IN ('publiee','masquee','brouillon') THEN RAISE EXCEPTION 'Statut invalide.';END IF;
  UPDATE public.entreprises_ec ee SET statut=v_status,updated_at=now() WHERE ee.id=rid;
  UPDATE public.prestataires pr SET statut=CASE WHEN v_status='publiee' THEN 'valide' WHEN v_status='masquee' THEN 'suspendu' ELSE 'en_validation' END,updated_at=now() WHERE pr.entreprise_id=rid;
  PERFORM ec1.audit('company',rid,'validation_entreprise',jsonb_build_object('statut',v_status));PERFORM ec1.notify_company(rid,'Le statut de votre entreprise a ete mis a jour','company',rid);RETURN '{}'::jsonb;
 WHEN 'admin_premium' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Seul l administrateur active Premium.' USING ERRCODE='42501';END IF;
  SELECT ee.* INTO e FROM public.entreprises_ec ee WHERE ee.id=rid AND ee.organisation_id=a.organisation_id AND ee.type='prestataire' FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Premium concerne uniquement les entreprises prestataires.';END IF;
  IF length(trim(coalesce(p_args->>'reason','')))<5 THEN RAISE EXCEPTION 'Indiquez une justification administrative de 5 caracteres minimum.';END IF;
  v_bool:=coalesce((p_args->>'active')::boolean,false);v_end:=nullif(p_args->>'expires_at','')::timestamp AT TIME ZONE 'Europe/Paris';
  IF v_bool AND (e.statut<>'publiee' OR NOT EXISTS(SELECT 1 FROM public.prestataires pp WHERE pp.entreprise_id=e.id AND pp.statut='valide')) THEN RAISE EXCEPTION 'Validez l entreprise avant d activer Premium.';END IF;
  IF v_bool AND v_end<=now() THEN RAISE EXCEPTION 'La date d expiration doit etre future.';END IF;
  INSERT INTO public.ec090_premium_admin(entreprise_id,active,commence_le,expire_le,commentaire,modifie_par,modifie_le)
   VALUES(rid,v_bool,now(),CASE WHEN v_bool THEN v_end ELSE NULL END,left(coalesce(p_args->>'reason',''),500),a.id,now())
   ON CONFLICT(entreprise_id) DO UPDATE SET active=excluded.active,commence_le=excluded.commence_le,expire_le=excluded.expire_le,commentaire=excluded.commentaire,modifie_par=excluded.modifie_par,modifie_le=now();
  UPDATE public.prestataires pp SET plan_code=CASE WHEN v_bool THEN 'premium' ELSE 'free' END,updated_at=now() WHERE pp.entreprise_id=rid;
  PERFORM ec1.audit('company',rid,'premium_administrateur',jsonb_build_object('actif',v_bool,'expiration',v_end,'motif',left(coalesce(p_args->>'reason',''),500)));
  PERFORM ec1.notify_company(rid,'Les droits Premium de votre entreprise ont ete mis a jour','company',rid);RETURN '{}'::jsonb;
 WHEN 'assign_manager' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Administration requise.';END IF;
  target:=nullif(p_args->>'target_company','')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.profiles pp WHERE pp.id=rid AND pp.role='startup_manager' AND pp.statut='actif' AND pp.organisation_id=a.organisation_id)
   OR NOT EXISTS(SELECT 1 FROM public.entreprises_ec ee WHERE ee.id=target AND ee.type='startup' AND ee.organisation_id=a.organisation_id) THEN RAISE EXCEPTION 'Manager ou startup invalide.';END IF;
  IF coalesce((p_args->>'active')::boolean,true) THEN INSERT INTO public.ec_manager_portefeuille(manager_id,entreprise_id,attribue_par) VALUES(rid,target,a.id) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.ec_manager_portefeuille m WHERE m.manager_id=rid AND m.entreprise_id=target;END IF;
  PERFORM ec1.audit('company',target,'affectation_manager',jsonb_build_object('manager',rid,'actif',coalesce((p_args->>'active')::boolean,true)));RETURN '{}'::jsonb;
 WHEN 'set_member' THEN
  target:=nullif(p_args->>'target_company','')::uuid;
  IF NOT ec1.member(target,true) THEN RAISE EXCEPTION 'Gestionnaire requis.';END IF;
  SELECT ee.* INTO e FROM public.entreprises_ec ee WHERE ee.id=target AND ee.organisation_id=a.organisation_id FOR UPDATE;
  SELECT pp.* INTO p FROM public.profiles pp JOIN auth.users u ON u.id=pp.id WHERE lower(u.email)=lower(trim(p_args->>'email')) AND pp.organisation_id=a.organisation_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Compte non trouve. Creez d abord le compte dans Supabase Auth puis attribuez son role.';END IF;
  IF (e.type='startup' AND p.role<>'incube') OR (e.type='prestataire' AND p.role<>'prestataire') THEN RAISE EXCEPTION 'Le role du contact doit correspondre au type de l entreprise.';END IF;
  v_role:=coalesce(p_args->>'member_role','collaborateur');v_bool:=coalesce((p_args->>'active')::boolean,true);
  IF v_role NOT IN ('proprietaire','gestionnaire','collaborateur') THEN RAISE EXCEPTION 'Role entreprise invalide.';END IF;
  IF a.role<>'admin' AND NOT EXISTS(SELECT 1 FROM public.entreprise_membres_ec m WHERE m.entreprise_id=target AND m.profile_id=a.id AND m.actif AND m.role_membre='proprietaire') THEN RAISE EXCEPTION 'Seul le proprietaire ou l administrateur gere les membres.';END IF;
  IF EXISTS(SELECT 1 FROM public.entreprise_membres_ec m WHERE m.entreprise_id=target AND m.profile_id=p.id AND m.actif AND m.role_membre='proprietaire')
   AND (NOT v_bool OR v_role<>'proprietaire') AND (SELECT count(*) FROM public.entreprise_membres_ec m WHERE m.entreprise_id=target AND m.actif AND m.role_membre='proprietaire')<=1 THEN RAISE EXCEPTION 'Conservez un proprietaire actif.';END IF;
  INSERT INTO public.entreprise_membres_ec(entreprise_id,profile_id,role_membre,actif) VALUES(target,p.id,v_role,v_bool)
   ON CONFLICT(entreprise_id,profile_id) DO UPDATE SET role_membre=excluded.role_membre,actif=excluded.actif,updated_at=now();
  IF v_bool AND p.entreprise_id IS NULL THEN UPDATE public.profiles pp SET entreprise_id=target WHERE pp.id=p.id;END IF;
  PERFORM ec1.audit('company',target,'rattachement_membre',jsonb_build_object('contact',p.id,'role',v_role,'actif',v_bool));RETURN '{}'::jsonb;
 WHEN 'register_media' THEN
  v_type:=p_args->>'type';target:=nullif(p_args->>'target_id','')::uuid;v_path:=p_args->>'path';
  IF v_type='person' THEN v_bool:=target=a.id;ELSIF v_type='company' THEN v_bool:=ec1.member(target,true);
  ELSIF v_type='offer' THEN SELECT ec1.member(pr.entreprise_id,true) INTO v_bool FROM public.offres oo JOIN public.prestataires pr ON pr.id=oo.prestataire_id WHERE oo.id=target;
  ELSE v_bool:=false;END IF;
  IF NOT coalesce(v_bool,false) OR split_part(v_path,'/',1)<>a.id::text OR v_path !~ '\.(webp|png|jpg|jpeg)$' OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='euraconnect-v1' AND o.name=v_path)
   THEN RAISE EXCEPTION 'Image non autorisee.';END IF;
  DELETE FROM ec1.media m WHERE m.target_type=v_type AND m.target_id=target;
  INSERT INTO ec1.media(bucket,path,target_type,target_id) VALUES('euraconnect-v1',v_path,v_type,target);
  RETURN '{}'::jsonb;
 ELSE RAISE EXCEPTION 'Action de modification inconnue.';
 END CASE;
END $$;
-- API unique. Les fonctions internes et les tables ne sont pas exposees a PostgREST.
CREATE OR REPLACE FUNCTION public.ec1_api(p_action text,p_args jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM ec1.actor();
 IF p_args IS NULL OR jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>150000 THEN RAISE EXCEPTION 'Requete invalide.';END IF;
 IF p_action IN ('bootstrap','dashboard','needs','need','threads','messages','directory','company','tags','sessions','session','notifications','portfolio','offers','admin')
 THEN RETURN ec1.read_action(p_action,p_args);
 ELSE RETURN ec1.write_action(p_action,p_args);END IF;
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
 RAISE EXCEPTION 'Un identifiant, une date ou une valeur est incorrect. Verifiez le formulaire.' USING ERRCODE='22023';
 WHEN check_violation OR not_null_violation THEN
 RAISE EXCEPTION 'Verifiez les champs obligatoires, les longueurs de texte, le budget et les horaires.' USING ERRCODE='22023';
 WHEN unique_violation THEN
 RAISE EXCEPTION 'Cet element existe deja. Actualisez la page avant de recommencer.' USING ERRCODE='23505';
END $$;
REVOKE ALL ON FUNCTION public.ec1_api(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec1_api(text,jsonb) TO authenticated;

-- Medias prives : aucun nom de startup n'est contourne par une URL publique.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('euraconnect-v1','euraconnect-v1',false,3145728,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.ec1_media_allowed(p_bucket text,p_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; m ec1.media; p public.profiles; e uuid; viewer uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false;END IF;
 a:=ec1.actor();
 SELECT x.* INTO m FROM ec1.media x WHERE x.bucket=p_bucket AND x.path=p_path;
 IF m.path IS NULL THEN RETURN split_part(p_path,'/',1)=a.id::text;END IF;
 SELECT mm.entreprise_id INTO viewer FROM public.entreprise_membres_ec mm WHERE mm.profile_id=a.id AND mm.actif AND ec1.premium(mm.entreprise_id) LIMIT 1;
 IF m.target_type='company' THEN RETURN ec1.identity_visible(m.target_id,viewer);
 ELSIF m.target_type='person' THEN
  SELECT pp.* INTO p FROM public.profiles pp WHERE pp.id=m.target_id AND pp.organisation_id=a.organisation_id;
  RETURN p.id IS NOT NULL AND (p.id=a.id OR a.role='admin' OR (p.role='incube' AND ec1.identity_visible(p.entreprise_id,viewer)) OR
   (p.role<>'incube' AND EXISTS(SELECT 1 FROM public.personnes_annuaire_ec pp WHERE pp.profile_id=p.id AND pp.visible)));
 ELSIF m.target_type='offer' THEN
  SELECT pr.entreprise_id INTO e FROM public.offres o JOIN public.prestataires pr ON pr.id=o.prestataire_id WHERE o.id=m.target_id AND o.organisation_id=a.organisation_id;
  RETURN e IS NOT NULL AND ec1.identity_visible(e,viewer);
 END IF;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.ec1_media_allowed(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec1_media_allowed(text,text) TO authenticated;
DROP POLICY IF EXISTS ec1_media_read ON storage.objects;
CREATE POLICY ec1_media_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id IN ('euraconnect-v1','euraconnect-media') AND public.ec1_media_allowed(bucket_id,name));
DROP POLICY IF EXISTS ec1_media_upload ON storage.objects;
CREATE POLICY ec1_media_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='euraconnect-v1' AND split_part(name,'/',1)=auth.uid()::text AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
  AND public.ec1_media_allowed(bucket_id,name));

-- REPRISE CONTROLEE : aucun ecrasement des donnees V1 apres activation.
DO $import_guard$ BEGIN
 IF (SELECT r.active FROM ec1.runtime r WHERE r.id) THEN RAISE EXCEPTION 'V1 deja active. Ne rejouez pas la migration d import. Utilisez une migration corrective versionnee.';END IF;
END $import_guard$;
INSERT INTO ec1.company_details(company_id,description)
 SELECT e.id,ec1.plain(e.presentation_html) FROM public.entreprises_ec e ON CONFLICT DO NOTHING;
INSERT INTO ec1.needs(id,organisation_id,company_id,author_id,title,context,budget_max,format,status,contact_name,contact_email,contact_phone,share_contact,created_at,updated_at)
 SELECT p.id,p.organisation_id,p.entreprise_id,p.incube_id,p.titre,
  CASE WHEN length(ec1.plain(p.description))>=50 THEN ec1.plain(p.description) ELSE p.description END,
  p.budget_centimes,'distance',CASE WHEN p.entreprise_id IS NULL THEN 'brouillon' WHEN p.statut='archive' THEN 'sans_suite' WHEN p.statut_suivi='reouvert' THEN 'ouvert' ELSE p.statut_suivi END,
  coalesce(c.nom_contact,''),coalesce(c.email_contact,''),coalesce(c.telephone_contact,''),coalesce(c.autorise_premium,false),p.created_at,coalesce(p.statut_modifie_le,p.created_at)
 FROM public.projets p LEFT JOIN public.ec089_contacts_besoin c ON c.besoin_id=p.id ON CONFLICT DO NOTHING;
INSERT INTO ec1.responses(id,need_id,company_id,author_id,message,status,created_at,updated_at)
 SELECT c.id,c.projet_id,p.entreprise_id,p.proprietaire_id,c.message,
 CASE c.statut WHEN 'relation_acceptee' THEN 'en_discussion' WHEN 'relation_refusee' THEN 'declinee' ELSE 'envoyee' END,c.created_at,c.created_at
 FROM public.candidatures c JOIN public.prestataires p ON p.id=c.prestataire_id JOIN ec1.needs n ON n.id=c.projet_id WHERE p.entreprise_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO ec1.messages(id,response_id,author_id,body,created_at)
 SELECT m.id,rel.candidature_id,m.auteur_id,m.corps,m.created_at
 FROM public.messages_ec m JOIN public.conversations_ec conv ON conv.id=m.conversation_id JOIN public.mises_en_relation rel ON rel.id=conv.relation_id
 JOIN ec1.responses r ON r.id=rel.candidature_id ON CONFLICT DO NOTHING;
INSERT INTO ec1.sessions(id,organisation_id,host_id,company_id,kind,title,starts_at,ends_at,mode,location,status)
 SELECT d.id,d.organisation_id,coalesce(d.intervenant_id,p.proprietaire_id),p.entreprise_id,'creneau','Rendez-vous d expertise',d.debut,d.fin,d.modalite,coalesce(d.lieu_ou_lien,''),
  CASE WHEN EXISTS(SELECT 1 FROM public.reservations_rdv r WHERE r.disponibilite_id=d.id AND r.statut='realise') THEN 'realise' ELSE 'ouvert' END
 FROM public.disponibilites_rdv d JOIN public.prestataires p ON p.id=d.prestataire_id ON CONFLICT DO NOTHING;
INSERT INTO ec1.registrations(id,session_id,user_id,company_id,status,purpose,created_at)
 SELECT DISTINCT ON (r.disponibilite_id,r.incubateur_id) r.id,r.disponibilite_id,r.incubateur_id,r.startup_entreprise_id,
  CASE r.statut WHEN 'realise' THEN 'present' ELSE r.statut END,r.objet_public,r.created_at
 FROM public.reservations_rdv r JOIN ec1.sessions s ON s.id=r.disponibilite_id ORDER BY r.disponibilite_id,r.incubateur_id,CASE r.statut WHEN 'confirme' THEN 0 WHEN 'realise' THEN 1 ELSE 2 END,r.created_at DESC ON CONFLICT DO NOTHING;
INSERT INTO ec1.favorites(user_id,target_type,target_id,created_at)
 SELECT f.utilisateur_id,CASE f.cible_type WHEN 'entreprise' THEN 'company' WHEN 'personne' THEN 'person' WHEN 'besoin' THEN 'need' ELSE 'offer' END,f.cible_id,f.created_at
 FROM public.favoris_ec f ON CONFLICT DO NOTHING;
INSERT INTO ec1.notifications(id,user_id,title,target_type,read_at,created_at)
 SELECT x.id,x.destinataire_id,'Notification de votre ancien espace','dashboard',x.lu_le,x.created_at FROM public.notifications_ec x ON CONFLICT DO NOTHING;
INSERT INTO ec1.tags(organisation_id,label,normalized)
 SELECT DISTINCT ON(o.id,ec1.norm(t.libelle)) o.id,t.libelle,ec1.norm(t.libelle) FROM public.tags_ec t CROSS JOIN public.organisations o
 WHERE length(ec1.norm(t.libelle))>=2 ORDER BY o.id,ec1.norm(t.libelle),t.created_at ON CONFLICT DO NOTHING;
INSERT INTO ec1.tags(organisation_id,label,normalized)
 SELECT DISTINCT ON(o.id,ec1.norm(t.libelle)) o.id,t.libelle,ec1.norm(t.libelle) FROM public.competences_ec t CROSS JOIN public.organisations o
 WHERE length(ec1.norm(t.libelle))>=2 ORDER BY o.id,ec1.norm(t.libelle) ON CONFLICT DO NOTHING;
INSERT INTO ec1.tag_links(tag_id,target_type,target_id)
 SELECT nt.id,CASE l.cible_type WHEN 'entreprise' THEN 'company' WHEN 'personne' THEN 'person' WHEN 'offre' THEN 'offer' ELSE 'need' END,l.cible_id
 FROM public.tags_liens_ec l JOIN public.tags_ec t ON t.id=l.tag_id JOIN ec1.tags nt ON nt.normalized=ec1.norm(t.libelle)
 WHERE nt.organisation_id=CASE l.cible_type
  WHEN 'entreprise' THEN (SELECT e.organisation_id FROM public.entreprises_ec e WHERE e.id=l.cible_id)
  WHEN 'personne' THEN (SELECT p.organisation_id FROM public.profiles p WHERE p.id=l.cible_id)
  WHEN 'offre' THEN (SELECT o.organisation_id FROM public.offres o WHERE o.id=l.cible_id)
  ELSE (SELECT n.organisation_id FROM ec1.needs n WHERE n.id=l.cible_id) END ON CONFLICT DO NOTHING;
INSERT INTO ec1.tag_links(tag_id,target_type,target_id)
 SELECT t.id,'company',c.entreprise_id FROM public.entreprise_competences_ec c JOIN public.competences_ec old ON old.id=c.competence_id
 JOIN public.entreprises_ec e ON e.id=c.entreprise_id JOIN ec1.tags t ON t.normalized=ec1.norm(old.libelle) AND t.organisation_id=e.organisation_id ON CONFLICT DO NOTHING;
INSERT INTO ec1.tag_links(tag_id,target_type,target_id)
 SELECT t.id,'person',c.profile_id FROM public.personne_competences_ec c JOIN public.competences_ec old ON old.id=c.competence_id
 JOIN public.profiles p ON p.id=c.profile_id JOIN ec1.tags t ON t.normalized=ec1.norm(old.libelle) AND t.organisation_id=p.organisation_id ON CONFLICT DO NOTHING;
INSERT INTO ec1.tag_links(tag_id,target_type,target_id)
 SELECT t.id,'need',c.projet_id FROM public.projet_competences_ec c JOIN public.competences_ec old ON old.id=c.competence_id
 JOIN ec1.needs n ON n.id=c.projet_id JOIN ec1.tags t ON t.normalized=ec1.norm(old.libelle) AND t.organisation_id=n.organisation_id ON CONFLICT DO NOTHING;
INSERT INTO ec1.media(bucket,path,target_type,target_id)
 SELECT 'euraconnect-media',e.logo_path,'company',e.id FROM public.entreprises_ec e WHERE nullif(e.logo_path,'') IS NOT NULL AND e.logo_path NOT LIKE 'http%' ON CONFLICT DO NOTHING;
INSERT INTO ec1.media(bucket,path,target_type,target_id)
 SELECT 'euraconnect-media',p.avatar_path,'person',p.profile_id FROM public.personnes_annuaire_ec p WHERE nullif(p.avatar_path,'') IS NOT NULL AND p.avatar_path NOT LIKE 'http%' ON CONFLICT DO NOTHING;
INSERT INTO ec1.media(bucket,path,target_type,target_id)
 SELECT 'euraconnect-media',o.image_path,'offer',o.id FROM public.offres o WHERE nullif(o.image_path,'') IS NOT NULL AND o.image_path NOT LIKE 'http%' ON CONFLICT DO NOTHING;
INSERT INTO ec1.import_report(item,total,imported,note) VALUES
 ('besoins',(SELECT count(*) FROM public.projets),(SELECT count(*) FROM ec1.needs),'Les besoins sans entreprise sont conserves en brouillon.'),
 ('reponses',(SELECT count(*) FROM public.candidatures),(SELECT count(*) FROM ec1.responses),'Les reponses sans entreprise prestataire restent dans les tables historiques.'),
 ('messages',(SELECT count(*) FROM public.messages_ec),(SELECT count(*) FROM ec1.messages),'Reprise des fils rattaches a une reponse importee.'),
 ('creneaux',(SELECT count(*) FROM public.disponibilites_rdv),(SELECT count(*) FROM ec1.sessions),''),
 ('reservations',(SELECT count(*) FROM public.reservations_rdv),(SELECT count(*) FROM ec1.registrations),'Une reservation active par personne et creneau ; doublons historiques conserves hors V1.')
 ON CONFLICT(item) DO UPDATE SET total=excluded.total,imported=excluded.imported,note=excluded.note;
INSERT INTO ec1.legacy_resources(kind,name) VALUES
('function','admin_changer_role_par_email'),('function','admin_lister_utilisateurs'),('function','admin_modifier_utilisateur'),('function','admin_reparer_profil'),('function','admin_valider_prestataire'),('function','creer_prestataire'),('function','creer_profil_auth'),('function','definir_avantage_incube'),('function','demander_mise_en_relation'),('function','ec07_assigner_dossier'),('function','ec07_besoins_disponibles'),('function','ec07_candidater'),('function','ec07_demander_relation'),('function','ec07_droit_conversation'),('function','ec07_droit_entreprise'),('function','ec07_envoyer_message'),('function','ec07_est_assigne'),('function','ec07_historique'),('function','ec07_lister_dossiers'),('function','ec07_ouvrir_conversation'),('function','ec07_publier_besoin'),('function','ec07_rattacher_besoin'),('function','ec07_repondre_relation'),('function','ec07_suivre_opportunite'),('function','ec085_creer_tag'),('function','ec085_definir_tags'),('function','ec085_normaliser_tag'),('function','ec085_peut_modifier_tags'),('function','ec087_matching_tags'),('function','ec088_tags_besoins'),('function','ec089_contact_besoin'),('function','ec089_definir_contact'),('function','ec089_mon_contact'),('function','ec089_mon_plan'),('function','ec08_annonce_sure'),('function','ec08_annuler_rdv'),('function','ec08_changer_statut_besoin'),('function','ec08_conversation_brute_autorisee'),('function','ec08_fil_besoins'),('function','ec08_historique_besoin'),('function','ec08_lister_creneaux'),('function','ec08_lister_messages'),('function','ec08_lister_rdv'),('function','ec08_mes_besoins'),('function','ec08_modifier_annonce'),('function','ec08_premium_entreprise'),('function','ec08_proposer_creneau'),('function','ec08_publier_besoin'),('function','ec08_reserver_rdv'),('function','ec08_verifier_candidature'),('function','ec090_admin_definir_premium'),('function','ec090_admin_lister_prestataires'),('function','ec91_admin_assigner'),('function','ec91_admin_managers'),('function','ec91_admin_modifier_manager'),('function','ec91_admin_portefeuilles'),('function','ec91_manager_autorise'),('function','ec91_mon_portefeuille'),('function','ec_admin_lister_entreprises'),('function','ec_admin_rattacher_membre'),('function','ec_annuaire_rechercher'),('function','ec_creer_entreprise'),('function','ec_dashboard_v06'),('function','ec_definir_competences_v06'),('function','ec_envoyer_message'),('function','ec_est_membre'),('function','ec_image_offre'),('function','ec_lister_membres'),('function','ec_matching_besoins'),('function','ec_mes_entreprises'),('function','ec_mes_relations_acceptees'),('function','ec_modifier_entreprise'),('function','ec_ouvrir_conversation'),('function','ec_peut_gerer_entreprise'),('function','ec_publier_besoin_riche'),('function','ec_publier_offre_riche'),('function','ec_sauver_fiche_entreprise'),('function','ec_sauver_fiche_personne'),('function','ec_sauver_personne'),('function','ec_set_competences'),('function','ec_suivre_opportunite'),('function','ec_verifier_role_entreprise'),('function','envoyer_candidature_ouverte'),('function','est_admin'),('function','indicateurs_admin'),('function','lister_mes_candidatures'),('function','marquer_notification_lue'),('function','mon_organisation'),('function','mon_prestataire'),('function','mon_role'),('function','proposer_disponibilite'),('function','protect_profile_columns'),('function','publier_besoin'),('function','publier_offre'),('function','repondre_mise_en_relation'),('function','reserver_disponibilite'),('table','audit_log'),('table','candidatures'),('table','competences_ec'),('table','conversations_ec'),('table','disponibilites_rdv'),('table','ec07_assignations'),('table','ec07_historique_dossiers'),('table','ec089_contacts_besoin'),('table','ec08_historique_besoins'),('table','ec090_premium_admin'),('table','ec_manager_portefeuille'),('table','entreprise_competences_ec'),('table','entreprise_membres_ec'),('table','entreprises_ec'),('table','favoris_ec'),('table','messages_ec'),('table','mises_en_relation'),('table','notifications_ec'),('table','offres'),('table','offres_incubes'),('table','opportunites_ec'),('table','organisations'),('table','personne_competences_ec'),('table','personnes_annuaire_ec'),('table','plans'),('table','prestataire_competences_ec'),('table','prestataires'),('table','profiles'),('table','projet_competences_ec'),('table','projets'),('table','reservations_rdv'),('table','tags_ec'),('table','tags_liens_ec') ON CONFLICT DO NOTHING;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA ec1 FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Controle : SELECT * FROM ec1.import_report;
