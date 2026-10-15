# EURACONNECT V0.8.5 — Favoris réparés & tags intelligents

Release **ciblée** : aucune refonte des autres modules et **aucune suppression de données**.

## Ce qui change

### Favoris, réellement opérationnels
- **Cause identifiée dans V0.8.4** : la colonne `favoris_ec.utilisateur_id` était `NOT NULL` sans valeur par défaut, alors que la création depuis l'annuaire n'envoyait pas l'identifiant utilisateur.
- Correctif SQL : `DEFAULT auth.uid()` ; écriture désormais via `ec09_basculer_favori` à contrôle d'identité et de visibilité.
- Bouton cœur directement sur les cartes et dans les fiches.
- Vue **Mes favoris**, avec pagination côté SQL et filtres par profil, texte, compétence.
- Favoris conservés après reconnexion et isolés par utilisateur (RLS de V0.8.4 maintenue).
- Erreurs d'accès et d'enregistrement visibles au lieu d'un échec silencieux.

### Tags, catégories et compétences intelligents
- **Un seul référentiel partagé** : `competences_ec`, enrichi par les utilisateurs connectés.
- Suggestions pendant la saisie, par nom, synonymes, variantes typographiques, accents et similarité de trigrammes.
- Réutilisation automatique sur correspondance exacte normalisée, y compris les synonymes connus. Les termes proches font l'objet d'un avertissement, sans fusion automatique dangereuse.
- Tag personnel d'entreprise, de personne, d'offre de service et de besoin.
- Création de nouvelles **compétences** directement dans les anciens sélecteurs (plus besoin de demander à l'admin).
- Recherche et filtres de l'annuaire prennent en compte les tags **publiés** sur les entreprises et personnes.
- Jusqu'à 15 tags libres par fiche, 20 compétences sur les fiches entreprise/personne, et 60 nouveaux termes créés par compte et par 24 h.
- Création de nouvelle offre et de nouveau besoin **atomique**, comprenant leurs tags et compétences.

### Confidentialité
Les tags libres d'un besoin ne sont pas publiés dans la bourse des besoins des prestataires non Premium, car un terme libre pourrait permettre de réidentifier une startup. Les compétences choisies pour le matching restent gérées séparément selon les règles existantes. Les tags du référentiel sont **partagés** : n'y inscrivez jamais de coordonnées ou de secrets d'entreprise.

## Déploiement
Consultez `docs/INSTALLATION_V085.md`. Migration unique **nouvelle** :
`supabase/migrations/202610150009_favoris_tags_intelligents.sql`.

## Validation effectuée
- Analyse syntaxique et transpilation des fichiers TS/TSX.
- Vérification TypeScript sous déclarations de test (remplacement provisoire des types des bibliothèques non installables ici).
- Contrôles structurels V0.6/V0.7/V0.8/V0.8.5.

**Non vérifié** : exécution de la migration sur Supabase, tests multi-comptes réels et compilation Next.js avec les dépendances officielles, car npm ne peut accéder au registre dans cet environnement. La pipeline GitHub `.github/workflows/verify.yml` inclut la vérification TypeScript et `next build` réels avant fusion.
