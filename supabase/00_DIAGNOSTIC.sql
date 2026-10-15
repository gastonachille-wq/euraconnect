-- Diagnostic READ ONLY avant migration. Ne modifie aucune donnee.
SELECT name AS objet_attendu,to_regclass('public.'||name) IS NOT NULL AS present
FROM unnest(ARRAY['profiles','entreprises_ec','entreprise_membres_ec','prestataires','projets','offres','candidatures','conversations_ec','messages_ec','disponibilites_rdv','reservations_rdv','tags_ec','tags_liens_ec','ec090_premium_admin','ec_manager_portefeuille','ec089_contacts_besoin','personnes_annuaire_ec','favoris_ec','notifications_ec','mises_en_relation','offres_incubes','competences_ec','entreprise_competences_ec','personne_competences_ec','projet_competences_ec']) AS name;
SELECT 'Comptes' AS objet,count(*) FROM public.profiles
UNION ALL SELECT 'Entreprises',count(*) FROM public.entreprises_ec
UNION ALL SELECT 'Besoins historiques',count(*) FROM public.projets
UNION ALL SELECT 'Besoins sans entreprise',count(*) FROM public.projets WHERE entreprise_id IS NULL
UNION ALL SELECT 'Candidatures',count(*) FROM public.candidatures
UNION ALL SELECT 'Prestataires sans entreprise',count(*) FROM public.prestataires WHERE entreprise_id IS NULL;
SELECT p.role,count(*) FROM public.profiles p GROUP BY p.role;
SELECT id,public FROM storage.buckets WHERE id='euraconnect-media';
