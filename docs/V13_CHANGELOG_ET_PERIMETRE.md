# EURACONNECT V1.3 — Lot 1 (parcours prioritaires et ergonomie)

## Livré et raccordé au socle existant

- Pages dédiées avec URL `#needs/ID` et `#proposal/ID`; retour explicite; les modales sont conservées pour les formulaires et les décisions.
- Assistant de publication des demandes en 3 étapes, modèles Audit / Juridique / Recrutement / Financement, aperçu avant diffusion, mémorisation locale d'un brouillon en `sessionStorage` (sur l'appareil et dans cet onglet uniquement).
- Comparaison de 2 ou 3 propositions depuis une demande, tableau des tarifs, délais, approches, comparaison côte à côte. S'appuie sur les données déjà autorisées pour l'incubé.
- Opportunités classées par `match_count` quand le prestataire consulte la liste; possibilité de masquer « Pas pour moi » localement, sur ce navigateur uniquement (pas synchronisé entre appareils).
- Tableau d'urgence du portefeuille Startup Manager, tri par besoins sans réponse et nombre d'actions en attente. Données existantes ; pas de nouveau scoring persistant.
- File admin « À valider », reprise des actions existantes d'examen et de décision, sans court-circuiter les contrôles administrateur existants.
- Barre d'onglets mobile, bouton de publication flottant pour incubé; conversation plein écran en mode mobile et retour à la liste.
- Réponses rapides de messagerie; champ éditable avant envoi, aucun message envoyé automatiquement.
- Filtres de liste appliqués à la volée avec temporisation; navigation conservant l'identifiant de conversation.
- Palette de recherche `/` regroupant demandes, offres, entreprises et contacts, avec requêtes sur l'API existante (selon droits). Pour les offres, l'ouverture mène pour le moment au catalogue, pas à une URL individuelle.
- Ajustements visuels (base de texte, couleurs, focus, cartes dynamiques), sans nouvelle dépendance.
- Version 1.3.0, build statique Cloudflare, aucun changement de schéma SQL.

## Non livré dans ce lot (à ne pas annoncer comme opérationnel)

- Modification / retrait d'une proposition envoyée, historique des versions et accusé « vue par la startup » : commandes Supabase et permissions à définir.
- « Demander une précision » hors conversation sans engager la décision : nécessite une sémantique métier explicite et une commande serveur.
- Alertes email / mots-clés, relance J+7 programmée, notifications agrégées par dossier : nécessitent stockage serveur et ordonnanceur éventuel.
- Pièces jointes aux messages, antivirus / politique de tailles et accès Storage : non implémentées.
- Actions en un clic sur statut de dossier et confirmation transactionnelle enrichie : non implémentées.
- « Recommander un expert » depuis un besoin : commande sécurisée à définir.
- Analytique administrateur (délai moyen de réponse, conversion, mises en relation) : requêtes d'agrégation côté serveur à définir pour éviter les données trompeuses.
- Onboarding avec état persisté par rôle, funnel commercial prestataire : non implémentés.
- Historique des recherches, filtres actifs supprimables, personnalisations Premium supplémentaires : non implémentés.
- Mode sombre : hors périmètre à la demande.

## Contrôles

`npm run check` : TypeScript strict, 48 tests Node réussis, génération de `dist/` réussie.

Un parcours navigateur local a été tenté mais l'environnement a bloqué le chargement HTTP local. Aucune recette réelle Supabase n'a été exécutée. À valider sur Cloudflare avec quatre rôles, en priorité la confidentialité Premium et la publication guidée.

## Sécurité et limites

Le stockage du brouillon n'est ni chiffré côté client ni synchronisé : éviter les secrets et ne pas utiliser d'ordinateur partagé. L'effacement de l'onglet efface en général la session de stockage. Les décisions et identités sont toujours régies par les RPC Supabase existantes.
