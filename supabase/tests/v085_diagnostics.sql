-- EURACONNECT V0.8.5 - Diagnostique NON DESTRUCTIF
-- SQL Editor Supabase : resultats attendus documentes dans RECETTE_V085.md.
select 'migration_favoris' controle,
       to_regclass('public.favoris_ec') is not null resultat
union all select 'catalogue_competences',to_regclass('public.competences_ec') is not null
union all select 'cles_anti_doublons',to_regclass('public.ec09_cles_termes') is not null
union all select 'tags_4_contextes',to_regclass('public.ec09_tags_cibles') is not null
union all select 'rpc_basculer_favori',to_regprocedure('public.ec09_basculer_favori(text,uuid)') is not null
union all select 'rpc_mes_favoris',to_regprocedure('public.ec09_annuaire_favoris(text,text,uuid,integer,integer)') is not null
union all select 'rpc_suggestions',to_regprocedure('public.ec09_suggerer_termes(text,integer)') is not null
union all select 'rpc_creer_terme',to_regprocedure('public.ec09_creer_terme(text,boolean)') is not null
union all select 'rpc_definir_tags',to_regprocedure('public.ec09_definir_tags(text,uuid,uuid[])') is not null
union all select 'rpc_offre_atomique',to_regprocedure('public.ec09_publier_offre_tags(text,text,text,text,integer,uuid[])') is not null
union all select 'rpc_besoin_atomique',to_regprocedure('public.ec09_publier_besoin_tags(uuid,text,text,text,text,integer,text,uuid[],uuid[])') is not null;

-- Les deux tables annexes des tags doivent etre inaccessibles en lecture/ecriture directe.
select 'cles_lecture_refusee' controle,not has_table_privilege('authenticated','public.ec09_cles_termes','SELECT') resultat
union all select 'tags_lecture_refusee',not has_table_privilege('authenticated','public.ec09_tags_cibles','SELECT')
union all select 'tags_ecriture_refusee',not has_table_privilege('authenticated','public.ec09_tags_cibles','INSERT')
union all select 'favs_lecture_active',has_table_privilege('authenticated','public.favoris_ec','SELECT');

-- L'orthographe, les accents et les signes typographiques convergent vers une cle canonique.
select 'meme_cle_accent' controle,
  public.ec09_normaliser_terme('Réglementation santé') = public.ec09_normaliser_terme('reglementation-sante') resultat
union all select 'meme_cle_espaces',
  public.ec09_normaliser_terme('Marketing Digital') = public.ec09_normaliser_terme('marketing-digital')
union all select 'pas_de_collision_C',
  public.ec09_normaliser_terme('C++') <> public.ec09_normaliser_terme('C#');

-- Aucun doublon de CLE dans la table canonique.
select cle,count(*) doublons from public.ec09_cles_termes group by cle having count(*)>1;

-- Information (ne doit pas retourner d'informations sensibles)
select (select count(*) from public.ec09_cles_termes) as cles_canoniques,
       (select count(*) from public.ec09_tags_cibles) as associations_tags,
       (select count(*) from public.favoris_ec) as nombre_favoris;
