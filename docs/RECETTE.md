# Recette fonctionnelle et sécurité

## Contrôles déjà automatisés

`npm run check` lance le typage strict, les 44 tests Node et la compilation. Les scripts navigateur, fournis séparément, nécessitent Python, Playwright et Chromium :

```sh
node scripts/build-preview.mjs
python scripts/browser-preview-test.py
python scripts/browser-interactions-test.py
```

Le second script utilise un transport Supabase **simulé**. Il vérifie les interactions et leurs paramètres, pas PostgreSQL.

## Scénarios Supabase obligatoires

| Test | Attendu |
|---|---|
| Startup A publie avec un tag existant et un nouveau terme | Données retrouvées après reconnexion ; normalisation sans doublon. |
| Prestataire Free lit le besoin | Objectifs, contexte, livrables, budget et tags visibles ; nom, logo et contacts startup non transmis. |
| Prestataire Free répond | La startup voit l'entreprise et l'auteur de la réponse. Le prestataire ne voit pas les offres concurrentes. |
| Startup donne suite puis envoie un message | Un seul dossier, conversation disponible ; l'identité startup ne se déverrouille pas par cette seule action. |
| Startup décline | Fil conservé mais non modifiable, statut clair. |
| Admin active Premium puis le révoque | Accès modifié sur les nouvelles lectures, dans besoin, annuaire, messages et agenda. |
| Premium expiré | Identité et contacts de nouveau masqués, même si `plan_code` historique indique Premium. |
| Deux managers de portefeuilles distincts | Chaque manager ne voit que ses startups ; pas de lecture implicite des conversations privées. |
| Collaborateur retiré de son entreprise | Nouvelle lecture ou écriture d'un dossier privé refusée côté serveur. |
| Annuaire : favoris sur plusieurs pages | Le filtre retrouve les fiches de l'ensemble des résultats, pas seulement de la page courante. |
| Disponibilité d'un contact | Rendez-vous relié à son UUID, pas à son nom d'affichage. |
| Deux personnes réservent simultanément la dernière place | Une seule inscription confirmée ; erreur explicite pour un créneau individuel, attente pour un atelier. |
| Permanence lors d'un changement d'heure | L'heure locale reste identique et les durées sont cohérentes. |
| Atelier, annulation et liste d'attente | Capacité respectée, promotion sans conflit, notifications aux personnes concernées. |
| Upload d'un logo startup | Redimensionné, accessible à son propriétaire ; URL publique refusée après la bascule. |
| Appel REST d'une ancienne fonction | Refus après activation V1 ; aucun ancien chemin ne contourne Premium. |

`04_TESTS_METIER_RECETTE.sql` couvre le coeur du flux avec des comptes fictifs transactionnels. Les tests simultanés nécessitent deux sessions de recette : les validations séquentielles ne prouvent pas seules le comportement sous concurrence.

## Limites de ce lot

Pas de paiement. Pas de calendrier externe synchronisé, visioconférence intégrée, envoi SMTP configurable depuis l'interface ou invitation email automatique. Les notifications sont in-app ; les compteurs se rafraîchissent toutes les 30 secondes et au retour dans la fenêtre. La conversation se recharge à son ouverture et après l'envoi ; ce n'est pas un moteur de messagerie temps réel certifié.

La liste des messages montre les 100 derniers par fil. Les messages plus anciens restent en base ; le bouton de pagination d'historique n'est pas encore exposé dans l'interface.

Un clic doublé est bloqué dans les formulaires et les actions critiques ont des contraintes en base. Les créations de nouveaux besoins/ateliers n'ont pas encore de journal d'idempotence de bout en bout pour une relance après coupure réseau.

MFA obligatoire, export/effacement RGPD automatisé, politique de conservation et audit d'accessibilité complet restent à finaliser avant une ouverture générale. L'absence de débordement sur mobile n'est pas une certification RGAA.
