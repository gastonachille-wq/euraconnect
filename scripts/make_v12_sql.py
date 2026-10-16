from pathlib import Path
src=Path('supabase/01_INSTALL_V1.sql').read_text()
def extract(name):
 a=src.index('CREATE OR REPLACE FUNCTION ec1.'+name+'(')
 b=src.index('END $$;',a)+len('END $$;')
 return src[a:b]
def rep(s,old,new,reason=''):
 assert old in s, f'NOT FOUND: {reason or old[:110]}'
 return s.replace(old,new)

session=extract('session_json')
session=rep(session,"'mine',host OR mine.status IN ('confirme','attente','present','absent'),'can_manage',host,", "'mine',host OR s.invitee_id=a.id OR mine.status IN ('confirme','attente','present','absent'),'can_manage',host,\n 'can_reply',s.kind='proposition' AND s.invitee_id=a.id AND NOT host AND s.status='ouvert', 'tags',ec1.tags_for('session',s.id),")
response=extract('response_json')
response=rep(response,"'author',ec1.person_name(r.author_id,p_viewer),'need_title'","'author',ec1.person_name(r.author_id,p_viewer),'author_id',r.author_id,'need_title'")
read=extract('read_action')
read=rep(read,"'profile',coalesce((SELECT to_jsonb(p)-'organisation_id'", "'profile',coalesce((SELECT to_jsonb(p)-'organisation_id'") if False else read
# directory company labels with automatic workshop speaker
read=rep(read,"'premium',CASE WHEN e.type='prestataire' THEN ec1.premium(e.id) ELSE false END,", "'premium',CASE WHEN e.type='prestataire' THEN ec1.premium(e.id) ELSE false END,\n   'labels',coalesce(to_jsonb(d.labels),'[]'::jsonb) || CASE WHEN EXISTS(SELECT 1 FROM ec1.sessions ws WHERE ws.company_id=e.id AND ws.kind='atelier' AND ws.status<>'annule') THEN '[\"intervenant_atelier\"]'::jsonb ELSE '[]'::jsonb END,",'company labels')
# people use actual active membership (including multiple companies) rather than optional profile primary id
idx=read.index('  people AS (SELECT')
end=read.index('  all_items AS',idx)
chunk=read[idx:end]
chunk=rep(chunk,'p.entreprise_id','linked_company.entreprise_id')
chunk=rep(chunk,"'premium',false,'can_edit'", "'premium',false,'labels','[]'::jsonb, 'linkedin_url',CASE WHEN ec1.identity_visible(linked_company.entreprise_id,viewer) OR p.id=a.id THEN coalesce(x.linkedin_url,'') ELSE '' END,'can_edit'")
chunk=rep(chunk,"FROM public.profiles p LEFT JOIN public.personnes_annuaire_ec x ON x.profile_id=p.id", "FROM public.profiles p JOIN LATERAL (SELECT m.entreprise_id FROM public.entreprise_membres_ec m JOIN public.entreprises_ec ee ON ee.id=m.entreprise_id WHERE m.profile_id=p.id AND m.actif AND ee.organisation_id=a.organisation_id AND (ee.statut='publiee' OR ec1.member(ee.id) OR ec1.supervises(ee.id)) ORDER BY CASE WHEN m.entreprise_id=p.entreprise_id THEN 0 ELSE 1 END LIMIT 1) linked_company ON true LEFT JOIN public.personnes_annuaire_ec x ON x.profile_id=p.id LEFT JOIN ec1.company_details cd_person ON cd_person.company_id=linked_company.entreprise_id")
read=read[:idx]+chunk+read[end:]
read=rep(read,"AND (coalesce(p_args->>'type','')='' OR t.j->>'type'=p_args->>'type')", """AND (coalesce(p_args->>'type','')='' OR t.j->>'type'=p_args->>'type')
   AND (coalesce(p_args->>'label','')='' OR t.j->'labels' ? (p_args->>'label'))
   AND (coalesce(p_args->>'premium','')='' OR (t.j->>'premium')::boolean=(p_args->>'premium')::boolean)
   AND (coalesce(p_args->>'tag','')='' OR ec1.norm(coalesce(t.j->'tags','[]'::jsonb)::text) LIKE '%'||ec1.norm(p_args->>'tag')||'%')
   AND (coalesce(p_args->>'city','')='' OR ec1.norm(t.j->>'city') LIKE '%'||ec1.norm(p_args->>'city')||'%')""")
read=rep(read,"ORDER BY f.j->>'name',f.j->>'id' LIMIT size_no OFFSET page_no*size_no", "ORDER BY CASE WHEN p_args->>'sort'='city' THEN f.j->>'city' END NULLS LAST, CASE WHEN p_args->>'sort'='availability' THEN f.j->>'next_slot' END NULLS LAST, CASE WHEN p_args->>'sort'='premium' THEN (f.j->>'premium')::boolean END DESC NULLS LAST, f.j->>'name',f.j->>'id' LIMIT size_no OFFSET page_no*size_no")
# company detail members publicly visible only with identity, no email exposure
idx=read.index(" WHEN 'company' THEN")
end=read.index(" WHEN 'tags' THEN",idx)
chunk=read[idx:end]
chunk=rep(chunk,"'can_edit',ec1.member(rid,true),", "'can_edit',ec1.member(rid,true),'type',(SELECT ee.type FROM public.entreprises_ec ee WHERE ee.id=rid),'premium',ec1.premium(rid),'labels',coalesce((SELECT to_jsonb(cd.labels) FROM ec1.company_details cd WHERE cd.company_id=rid),'[]'::jsonb) || CASE WHEN EXISTS(SELECT 1 FROM ec1.sessions ws WHERE ws.company_id=rid AND ws.kind='atelier' AND ws.status<>'annule') THEN '[\"intervenant_atelier\"]'::jsonb ELSE '[]'::jsonb END,")
chunk=rep(chunk,"'members',CASE WHEN ec1.member(rid) OR ec1.supervises(rid) THEN", "'members',CASE WHEN ec1.identity_visible(rid,viewer) THEN")
chunk=rep(chunk,"'role',m.role_membre,'active',m.actif,'email',u.email", "'role',m.role_membre,'contact_role',p.role,'title',coalesce(x.titre,''),'linkedin_url',CASE WHEN coalesce(x.visible,false) OR ec1.member(rid) OR ec1.supervises(rid) THEN coalesce(x.linkedin_url,'') ELSE '' END, 'media',(SELECT jsonb_build_object('bucket',mm.bucket,'path',mm.path) FROM ec1.media mm WHERE mm.target_type='person' AND mm.target_id=p.id LIMIT 1),'active',m.actif,'email',CASE WHEN ec1.member(rid) OR ec1.supervises(rid) THEN u.email ELSE '' END")
chunk=rep(chunk,"FROM public.entreprise_membres_ec m JOIN public.profiles p ON p.id=m.profile_id JOIN auth.users u ON u.id=p.id WHERE m.entreprise_id=rid)", "FROM public.entreprise_membres_ec m JOIN public.profiles p ON p.id=m.profile_id JOIN auth.users u ON u.id=p.id LEFT JOIN public.personnes_annuaire_ec x ON x.profile_id=p.id WHERE m.entreprise_id=rid AND m.actif AND p.statut='actif' AND (coalesce(x.visible,false) OR ec1.member(rid) OR ec1.supervises(rid)))")
read=read[:idx]+chunk+read[end:]
# explicit person detail RPC with privacy.
contact=''' WHEN 'person' THEN
  SELECT jsonb_build_object('id',p.id,'kind','person','type',p.role,'name',ec1.person_name(p.id,viewer),
   'subtitle',coalesce(x.titre,''),'description',ec1.plain(x.bio_html),
   'company_id',m.entreprise_id,'company_name',ec1.company_name(m.entreprise_id,viewer),'city','',
   'identity_visible',ec1.identity_visible(m.entreprise_id,viewer) OR p.id=a.id,'tags',ec1.tags_for('person',p.id),
   'premium',false,'labels','[]'::jsonb,'linkedin_url',coalesce(x.linkedin_url,''),
   'can_edit',p.id=a.id OR a.role='admin','next_slot',(SELECT min(s.starts_at) FROM ec1.sessions s WHERE s.host_id=p.id AND s.kind IN ('creneau','permanence') AND s.status='ouvert' AND s.starts_at>now()),
   'favorite',EXISTS(SELECT 1 FROM ec1.favorites f WHERE f.user_id=a.id AND f.target_type='person' AND f.target_id=p.id),
   'media',(SELECT jsonb_build_object('bucket',mm.bucket,'path',mm.path) FROM ec1.media mm WHERE mm.target_type='person' AND mm.target_id=p.id LIMIT 1))
   INTO result FROM public.profiles p
   JOIN LATERAL (SELECT me.entreprise_id FROM public.entreprise_membres_ec me JOIN public.entreprises_ec ee ON ee.id=me.entreprise_id
    WHERE me.profile_id=p.id AND me.actif AND ee.organisation_id=a.organisation_id
    AND (ee.statut='publiee' OR ec1.member(ee.id) OR ec1.supervises(ee.id)) ORDER BY CASE WHEN me.entreprise_id=p.entreprise_id THEN 0 ELSE 1 END LIMIT 1) m ON true
   LEFT JOIN public.personnes_annuaire_ec x ON x.profile_id=p.id
   WHERE p.id=rid AND p.organisation_id=a.organisation_id AND p.statut='actif'
   AND (coalesce(x.visible,false) OR p.id=a.id OR a.role='admin' OR ec1.supervises(m.entreprise_id))
   AND (p.id=a.id OR p.role<>'incube' OR ec1.identity_visible(m.entreprise_id,viewer));
  IF result IS NULL THEN RAISE EXCEPTION 'Contact indisponible selon les droits de votre entreprise.';END IF;
  RETURN result;
'''
read=rep(read," WHEN 'tags' THEN",contact+" WHEN 'tags' THEN")
# session list filters and sorting
read=rep(read,"AND (nullif(p_args->>'target_company','') IS NULL OR s.company_id=(p_args->>'target_company')::uuid)","AND (nullif(p_args->>'target_company','') IS NULL OR s.company_id=(p_args->>'target_company')::uuid)\n    AND (nullif(p_args->>'response_id','') IS NULL OR s.response_id=(p_args->>'response_id')::uuid)")
read=rep(read,"AND (coalesce(p_args->>'kind','')='' OR v.j->>'kind'=p_args->>'kind')", "AND (coalesce(p_args->>'kind','')='' OR v.j->>'kind'=p_args->>'kind')\n   AND (coalesce(p_args->>'mode','')='' OR v.j->>'mode'=p_args->>'mode')\n   AND (coalesce(p_args->>'expertise','')='' OR ec1.norm((v.j->'tags')::text) LIKE '%'||ec1.norm(p_args->>'expertise')||'%')")
read=rep(read,"ORDER BY f.j->>'starts_at' LIMIT size_no OFFSET page_no*size_no", "ORDER BY CASE WHEN p_args->>'sort'='host' THEN f.j->>'host_name' END NULLS LAST, CASE WHEN p_args->>'sort'='kind' THEN f.j->>'kind' END NULLS LAST, CASE WHEN p_args->>'sort'='mode' THEN f.j->>'mode' END NULLS LAST, f.j->>'starts_at' LIMIT size_no OFFSET page_no*size_no")
# Offers per company for response enrichment
read=rep(read,"AND (NOT coalesce((p_args->>'favorites')::boolean,false) OR (x.j->>'favorite')::boolean))", "AND (coalesce(p_args->>'company_id','')='' OR x.j->>'company_id'=p_args->>'company_id')\n   AND (NOT coalesce((p_args->>'favorites')::boolean,false) OR (x.j->>'favorite')::boolean))")
read=rep(read,"'expires_at',pa.expire_le) ORDER BY e.nom", "'expires_at',pa.expire_le,'labels',coalesce(to_jsonb(cd.labels),'[]'::jsonb)) ORDER BY e.nom")
read=rep(read,"LEFT JOIN public.ec090_premium_admin pa ON pa.entreprise_id=e.id WHERE e.organisation_id=a.organisation_id", "LEFT JOIN public.ec090_premium_admin pa ON pa.entreprise_id=e.id LEFT JOIN ec1.company_details cd ON cd.company_id=e.id WHERE e.organisation_id=a.organisation_id")
write=extract('write_action')
write=rep(write," WHEN 'save_profile' THEN",''' WHEN 'set_company_labels' THEN
  IF a.role<>'admin' THEN RAISE EXCEPTION 'Administration requise.' USING ERRCODE='42501';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.entreprises_ec ee WHERE ee.id=rid AND ee.organisation_id=a.organisation_id) THEN RAISE EXCEPTION 'Entreprise introuvable.';END IF;
  IF (SELECT count(*) FROM jsonb_array_elements_text(coalesce(p_args->'labels','[]'::jsonb)))>5 THEN RAISE EXCEPTION 'Trop de labels.';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_args->'labels','[]'::jsonb)) z WHERE z NOT IN ('partenaire','institutionnel','pop','intervenant_atelier')) THEN RAISE EXCEPTION 'Label inconnu.';END IF;
  INSERT INTO ec1.company_details(company_id,labels) VALUES(rid,ARRAY(SELECT DISTINCT z FROM jsonb_array_elements_text(coalesce(p_args->'labels','[]'::jsonb)) z))
   ON CONFLICT(company_id) DO UPDATE SET labels=excluded.labels;
  PERFORM ec1.audit('company',rid,'labels_mis_a_jour'); RETURN jsonb_build_object('id',rid);
 WHEN 'decline_session' THEN
  SELECT ss.* INTO s FROM ec1.sessions ss WHERE ss.id=rid AND ss.organisation_id=a.organisation_id FOR UPDATE;
  IF s.id IS NULL OR s.kind<>'proposition' OR s.invitee_id<>a.id OR s.status<>'ouvert' OR s.starts_at<=now() THEN
   RAISE EXCEPTION 'Cette proposition ne peut plus etre refusee.';
  END IF;
  UPDATE ec1.sessions ss SET status='annule' WHERE ss.id=s.id;
  INSERT INTO ec1.notifications(user_id,title,target_type,target_id) VALUES(s.host_id,'Votre proposition de rendez-vous a ete refusee','session',s.id);
  PERFORM ec1.audit('session',s.id,'proposition_refusee');RETURN jsonb_build_object('id',s.id);
 WHEN 'save_profile' THEN''')
write=rep(write,"  UPDATE public.profiles pp SET nom=v_name,updated_at=now() WHERE pp.id=a.id;", "  v_text:=trim(coalesce(p_args->>'linkedin_url',''));\n  IF v_text<>'' AND (length(v_text)>350 OR v_text !~* '^https://(www[.])?linkedin[.]com/(in|pub)/[a-z0-9%_+./-]+([?][a-z0-9%_+./=&-]*)?$') THEN RAISE EXCEPTION 'Utilisez une URL de profil LinkedIn de type https://www.linkedin.com/in/nom.';END IF;\n  UPDATE public.profiles pp SET nom=v_name,updated_at=now() WHERE pp.id=a.id;")
write=rep(write,"INSERT INTO public.personnes_annuaire_ec(profile_id,organisation_id,entreprise_id,nom_public,titre,bio_html,visible)", "INSERT INTO public.personnes_annuaire_ec(profile_id,organisation_id,entreprise_id,nom_public,titre,bio_html,visible,linkedin_url)")
write=rep(write,"coalesce((p_args->>'visible')::boolean,true))", "coalesce((p_args->>'visible')::boolean,true),v_text)")
write=rep(write,"visible=excluded.visible,updated_at=now();", "visible=excluded.visible,linkedin_url=excluded.linkedin_url,updated_at=now();")

header='''-- EURACONNECT V1.2 - migration additive. Appliquer APRES 01_INSTALL_V1 et 02_ACTIVER_V1.
-- Aucune table historique supprimee; les RPC ec1 restent le seul point d'acces.
-- Sauvegarder la base avant execution et lire docs/V12_INSTALLATION.md.
BEGIN;
ALTER TABLE public.personnes_annuaire_ec ADD COLUMN IF NOT EXISTS linkedin_url text NOT NULL DEFAULT '';
ALTER TABLE ec1.company_details ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT ARRAY[]::text[];
UPDATE ec1.runtime SET version='1.2.0' WHERE id=true;
'''
footer='''
-- Revocation et RLS heritees: pas de permission directe sur ec1 ni sur les nouvelles colonnes.
COMMIT;
'''
output=header+'\n'+response+'\n'+session+'\n\n'+read+'\n\n'+write+'\n'+footer
Path('supabase/06_V12_PROFILS_AGENDA_ANNUAIRE.sql').write_text(output)
print('Generated SQL', len(output), 'session_json', len(session), 'read',len(read),'write',len(write))
