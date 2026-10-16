-- EURACONNECT V2.3 : invitations manager vers incubés affectés. Après migration 08.
BEGIN;
CREATE TABLE IF NOT EXISTS ec1.manager_meetings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 manager_id uuid NOT NULL REFERENCES public.profiles(id), startup_id uuid NOT NULL REFERENCES public.entreprises_ec(id),
 invitee_id uuid NOT NULL REFERENCES public.profiles(id), title text NOT NULL CHECK(length(title) BETWEEN 5 AND 160),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, mode text NOT NULL CHECK(mode IN ('visio','telephone','sur_site')),
 location text NOT NULL DEFAULT '', message text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
 responded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '8 hours')
);
REVOKE ALL ON ec1.manager_meetings FROM PUBLIC,anon,authenticated;
ALTER TABLE ec1.manager_meetings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ec23_meetings_manager ON ec1.manager_meetings(manager_id,starts_at DESC);
CREATE INDEX IF NOT EXISTS ec23_meetings_invitee ON ec1.manager_meetings(invitee_id,starts_at DESC);
CREATE OR REPLACE FUNCTION public.ec23_manager_meeting(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.profiles; sid uuid; recipient uuid; meeting ec1.manager_meetings; t1 timestamptz; t2 timestamptz; result jsonb; title_ text;
BEGIN
 a:=ec1.actor();
 IF p_args IS NULL OR jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>5000 THEN RAISE EXCEPTION 'Paramètres invalides' USING ERRCODE='22023'; END IF;
 IF p_action='contacts' THEN
  IF a.role<>'startup_manager' THEN RAISE EXCEPTION 'Réservé au manager' USING ERRCODE='42501'; END IF;
  sid:=nullif(p_args->>'startup_id','')::uuid;
  IF sid IS NULL OR NOT EXISTS(SELECT 1 FROM public.ec_manager_portefeuille pm WHERE pm.manager_id=a.id AND pm.entreprise_id=sid)
    OR NOT ec1.supervises(sid) THEN RAISE EXCEPTION 'Startup hors portefeuille' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(nullif(p.nom,''),'Contact incubé')) ORDER BY p.nom),'[]'::jsonb) INTO result
  FROM public.entreprise_membres_ec m JOIN public.profiles p ON p.id=m.profile_id
  WHERE m.entreprise_id=sid AND m.actif AND p.role='incube' AND p.statut='actif' AND p.organisation_id=a.organisation_id;
  RETURN result;
 ELSIF p_action='list' THEN
  IF a.role NOT IN ('incube','startup_manager') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'startup_name',coalesce(c.nom,''),'manager_name',coalesce(m.nom,''),
   'invitee_name',coalesce(i.nom,''),'starts_at',x.starts_at,'ends_at',x.ends_at,'mode',x.mode,'location',x.location,'message',x.message,
   'status',x.status,'can_respond',x.invitee_id=a.id) ORDER BY x.starts_at DESC),'[]'::jsonb) INTO result
  FROM ec1.manager_meetings x JOIN public.entreprises_ec c ON c.id=x.startup_id
  JOIN public.profiles m ON m.id=x.manager_id JOIN public.profiles i ON i.id=x.invitee_id
  WHERE x.organisation_id=a.organisation_id AND (x.manager_id=a.id OR x.invitee_id=a.id);
  RETURN result;
 ELSIF p_action='invite' THEN
  IF a.role<>'startup_manager' THEN RAISE EXCEPTION 'Réservé au manager' USING ERRCODE='42501'; END IF;
  sid:=nullif(p_args->>'startup_id','')::uuid; recipient:=nullif(p_args->>'invitee_id','')::uuid;
  IF sid IS NULL OR recipient IS NULL OR NOT EXISTS(SELECT 1 FROM public.ec_manager_portefeuille pm WHERE pm.manager_id=a.id AND pm.entreprise_id=sid)
   OR NOT ec1.supervises(sid) THEN RAISE EXCEPTION 'Startup hors portefeuille' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.entreprise_membres_ec mem JOIN public.profiles pr ON pr.id=mem.profile_id
   WHERE mem.entreprise_id=sid AND mem.profile_id=recipient AND mem.actif AND pr.role='incube' AND pr.statut='actif' AND pr.organisation_id=a.organisation_id)
  THEN RAISE EXCEPTION 'Destinataire non autorisé' USING ERRCODE='42501'; END IF;
  title_:=trim(coalesce(p_args->>'title',''));
  IF length(title_) NOT BETWEEN 5 AND 160 OR length(coalesce(p_args->>'message',''))>1500 OR length(coalesce(p_args->>'location',''))>500 THEN RAISE EXCEPTION 'Contenu invalide'; END IF;
  t1:=(p_args->>'starts_at')::timestamptz;t2:=(p_args->>'ends_at')::timestamptz;
  IF t1<=now() OR t2<=t1 OR t2>t1+interval '8 hours' THEN RAISE EXCEPTION 'Créneau invalide ou passé'; END IF;
  IF coalesce(p_args->>'mode','') NOT IN ('visio','telephone','sur_site') THEN RAISE EXCEPTION 'Modalité invalide'; END IF;
  IF EXISTS(SELECT 1 FROM ec1.manager_meetings x WHERE x.status IN ('pending','accepted') AND x.starts_at<t2 AND x.ends_at>t1
    AND (x.manager_id=a.id OR x.invitee_id=recipient)) THEN RAISE EXCEPTION 'Un autre rendez-vous est déjà proposé sur cette plage.'; END IF;
  INSERT INTO ec1.manager_meetings(organisation_id,manager_id,startup_id,invitee_id,title,starts_at,ends_at,mode,location,message)
  VALUES(a.organisation_id,a.id,sid,recipient,title_,t1,t2,p_args->>'mode',coalesce(p_args->>'location',''),coalesce(p_args->>'message','')) RETURNING * INTO meeting;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id)
  VALUES(recipient,'Votre Startup Manager propose un rendez-vous : '||left(title_,90),'dashboard',NULL);
  PERFORM ec1.audit('manager_meeting',meeting.id,'invitation_manager',jsonb_build_object('startup_id',sid,'invitee_id',recipient));
  RETURN jsonb_build_object('id',meeting.id,'success',true);
 ELSIF p_action='respond' THEN
  IF a.role<>'incube' THEN RAISE EXCEPTION 'Réservé au destinataire incubé' USING ERRCODE='42501'; END IF;
  SELECT * INTO meeting FROM ec1.manager_meetings WHERE id=nullif(p_args->>'id','')::uuid AND organisation_id=a.organisation_id FOR UPDATE;
  IF meeting.id IS NULL OR meeting.invitee_id<>a.id OR meeting.status<>'pending' OR meeting.starts_at<=now() THEN RAISE EXCEPTION 'Invitation non disponible' USING ERRCODE='42501'; END IF;
  IF p_args->>'status' NOT IN ('accepted','declined') THEN RAISE EXCEPTION 'Réponse invalide'; END IF;
  UPDATE ec1.manager_meetings SET status=p_args->>'status',responded_at=now() WHERE id=meeting.id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id) VALUES(meeting.manager_id,
   'Réponse à votre proposition de rendez-vous : '||left(meeting.title,90),'dashboard',NULL);
  PERFORM ec1.audit('manager_meeting',meeting.id,'reponse_invitation',jsonb_build_object('status',p_args->>'status'));
  RETURN jsonb_build_object('id',meeting.id,'success',true);
 ELSE RAISE EXCEPTION 'Action inconnue' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ec23_manager_meeting(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ec23_manager_meeting(text,jsonb) TO authenticated;
COMMIT;
