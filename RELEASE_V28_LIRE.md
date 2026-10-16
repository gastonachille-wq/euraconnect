# EURACONNECT 2.8 — Annuaire dense & navigation compacte

## Livré
- Barre latérale desktop ramenée à 204 px, 62 px en mode réduit ; suppression des sous-titres répétitifs ; entrées plus denses.
- Suppression sur l'annuaire de la seconde bande de navigation rapide ; liens contextuels intégrés à l'en-tête compact.
- En-tête de l'annuaire réduit, sans grand bloc introductif redondant.
- Une barre d'outils : bouton de filtres avec compteur, recherche rapide (debounce), tri, trois modes d'affichage, compteur de résultats.
- Filtres dans un panneau dépliant positionné sous la barre, ne repoussant pas les résultats lorsqu'il est fermé.
- Fiches entreprise moins hautes : logo, identité, badges, expertises, créneaux et actions conservés.
- Mêmes contrôles de visibilité Premium, navigation et droits métier que la version précédente.

## Limites
- Les filtres reposent sur les paramètres de recherche et l'API existants ; le tri et les facettes globaux sur la totalité d'un annuaire paginé nécessitent encore des évolutions SQL et RPC.
- Cette release n'ajoute pas de changement Supabase. Aucune migration nouvelle.
- Aucun déploiement ou test avec comptes authentifiés réels n'a été effectué.

## Installer
1. Conserver une sauvegarde du dépôt et de Supabase.
2. Copier les fichiers de ce ZIP dans le dépôt (en conservant les variables Cloudflare existantes).
3. Commit & Push : Cloudflare reconstruit `dist` selon votre configuration précédente.
4. Vérifier en conditions réelles l'annuaire avec profils incubé, prestataire, Startup Manager et admin.

## Contrôles locaux
Compilateur TypeScript, tests Node et build statique. Les tests de bout en bout navigateur et RLS Supabase ne sont pas couverts.
