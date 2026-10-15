# Plan de recette V0.8.5 — Favoris & tags

Tester sur une copie Supabase et une URL Netlify de recette, idéalement avec **deux comptes distincts** : un incubé et un prestataire.

| Scénario | Étapes | Résultat attendu |
|---|---|---|
| F1 Ajout favori | Annuaire → cœur d'une entreprise publiée | Cœur rempli et compteur +1, aucune erreur |
| F2 Persistance | Actualiser la page, se déconnecter et reconnecter | Favori conservé |
| F3 Retrait | Cliquer le même cœur puis recharger | Favori retiré, compteur diminué |
| F4 Isolation | Se connecter avec un autre compte | Aucun favori du compte précédent |
| F5 Fiche personne | Ajouter puis retirer une personne publiée | Même fonctionnement qu'une entreprise |
| F6 Mes favoris | Ajouter 2 fiches ; activer « Mes favoris » | Uniquement les fiches sauvegardées, paginées |
| F7 Visibilité | Masquer une fiche publiée | Plus visible dans Mes favoris de l'autre compte |
| T1 Suggestion | Taper « marketing » dans compétences | Proposition(s) du référentiel existant |
| T2 Accents et casse | Créer/chercher « réglementation santé », puis « REGLEMENTATION-SANTE » | Réutilisation du même terme canonique |
| T3 Synonyme | Chercher « compta » | Suggestion de la compétence « Comptabilite » si catalogue d'origine conservé |
| T4 Proximité | Saisir une variante proche d'un tag existant | Avertissement avant création distincte |
| T5 Entreprise | Ajouter deux mots-clés → Enregistrer les tags | Persistants après rechargement et cherchables dans l'annuaire si fiche publiée |
| T6 Personne | Ajouter mots-clés → Enregistrer les tags | Persistants et visibles uniquement si fiche publiée |
| T7 Compétence libre | Ajouter une compétence inédite dans la fiche entreprise | Catalogue enrichi ; compétence associée après sauvegarde de la fiche |
| T8 Offre | Créer une offre avec des mots-clés puis les éditer | Tags persistants et rattachés à cette offre |
| T9 Besoin | Créer un besoin avec tags internes + compétences | Publication et tags réussis ensemble ou aucun des deux |
| T10 Confidentialité | Consulter un besoin avec compte prestataire non Premium | Aucune fuite des tags libres du besoin |
| T11 Droits | Collaborateur sans rôle gestionnaire essaye la RPC d'écriture | Refus côté Supabase |
| T12 Longueur | Créer un tag de 70 caractères | Erreur explicite et aucun terme créé |
| T13 Doublon concurrent | Dans deux onglets, créer simultanément exactement le même tag | Un terme canonique, association réutilisée |

**Vérification technique obligatoire** : `npm run typecheck`, `npm run build` sur GitHub/Netlify en plus de `node scripts/verify-v085.mjs`.

**Point de vigilance métier** : les noms de tags créés par les utilisateurs sont partagés et ne font pas l'objet d'une modération éditoriale dans cette release. Ne pas saisir de données personnelles ou confidentielles dans un mot-clé.
