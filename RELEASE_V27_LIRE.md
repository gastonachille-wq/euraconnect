# EURACONNECT V2.7 — Ergonomie, occupation de l'espace et parcours Catalogue

## Ce qui change réellement

### 1. Correction structurelle prioritaire — toutes les pages
La V2.5 avait ajouté `.sidebar { position: relative; }` alors que la navigation conservait sa marge latérale. Sur ordinateur, le menu occupait ainsi une première largeur dans le flux **puis une seconde dans la marge du contenu**. La V2.7 restaure la position fixe de la barre latérale. Le menu reste réduit par icône et ses rubriques demeurent repliables.

Contrôle visuel sur un écran de 1525 px : en mode ouvert, la zone de travail commence à x=222 px (au lieu de x=444 px) ; en mode réduit, à x=70 px. Sur écran de 390 px, le contenu commence à x=0 et la navigation est masquée hors écran tant qu'elle n'est pas ouverte.

### 2. Catalogue de services
- Suppression de la barre secondaire de raccourcis sur le catalogue : les liens vers l'annuaire et les demandes sont replacés près du contenu pertinent.
- Bandeau violet « Univers Expertises » plus compact ; appel à l'action adapté au profil (incubé : décrire mon besoin ; prestataire : publier une offre).
- Cartes sur toute la largeur disponible. Avec une seule offre, la carte devient une présentation horizontale complète ; passage en disposition verticale sur mobile.
- Fiche avec prestataire **cliquable**, titre **cliquable**, prix et modalité visibles, avantage incubés, favoris, boutons « Voir le détail » et « Voir les créneaux ».
- Fiche détaillée avec lien vers le prestataire et vers ses créneaux existants.
- Recherche, favoris, tri et 3 présentations distinctes (grille, liste, compacte).
- Filtres repliables : compétence, modalité, budget maximal, avantage incubé.
- Évitement de l'affichage brut du `Lorem ipsum` dans la carte : texte factuel « description insuffisante », et invitation à compléter lorsque le prestataire peut modifier l'offre. **La donnée Supabase n'est pas réécrite**.
- Couleurs fonctionnelles supplémentaires sur les titres de l'espace actif (demandes, réseau, expertises, rendez-vous, échanges).

### 3. Limite des filtres et du tri
L'API SQL V1 ne gère pas encore le tri/prix et les facettes sur tout le catalogue. Pour éviter de les présenter comme des fonctions globales, la V2.7 charge jusqu'à **100 offres par page**, puis applique les facettes et les tris sur **ce jeu chargé**, avec un avertissement explicite si la pagination côté serveur subsiste. La recherche texte et les favoris sont filtrés côté Supabase. Une migration backend ultérieure est requise pour garantir un tri et des facettes globaux sur un très grand catalogue.

### 4. Installation
1. Sauvegarder votre branche GitHub de production et les données Supabase.
2. Copier les sources du ZIP dans le dépôt GitHub relié à Cloudflare Workers.
3. Conserver les variables de build `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique **anon**, jamais service_role).
4. Lancer `npm run build` (Cloudflare) ; les fichiers publiables sont dans `dist/`.
5. Après déploiement, contrôler les parcours incubé/prestataire et les clics sur le prestataire, le détail et les créneaux.

**Pas de migration Supabase supplémentaire pour la V2.7**. Conserver les migrations nécessaires des versions précédentes (V2.2, V2.3).

### 5. Vérifications et limites
- TypeScript validé ; **62 tests automatisés** passés (57 hérités + 5 nouveaux).
- Build reproductible et version manifest 2.7.0.
- Maquette d'intégration **rendue dans Chromium** sur 8 largeurs : 320, 390, 760, 800, 1024, 1280, 1525 et 1920 pixels, aucun débordement horizontal dans les écrans testés.
- Affichage menu réduit mesuré à 70 px.
- Les contrôles navigateur ont été réalisés sur un rendu statique de la page à données de démonstration. **Aucune authentification réelle, connexion à votre Supabase, recette Cloudflare ni réservation réelle n'a été testée.**
- Les offres mal renseignées restent à reprendre par leurs auteurs ; aucune description commerciale n'a été inventée.
- La refonte complète de l'annuaire, des incubateurs administrables, des facettes globales du catalogue et de tous les univers n'est pas incluse dans cette release.
