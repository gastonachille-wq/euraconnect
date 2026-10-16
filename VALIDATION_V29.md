# EURACONNECT 2.9.0 - Validation et limites

## Base et methodes

Source de depart : archive V2.8 allegee fournie, sans lecture du depot GitHub en direct.
Tests executes le 16 octobre 2026 dans le conteneur de generation, pas dans les comptes
Cloudflare ou Supabase de l'utilisateur.

| Controle | Resultat constate | Portee |
| --- | --- | --- |
| Typage strict TypeScript 5.8.3 | Reussi | Ensemble du projet source |
| Build statique | Reussi | Modules, styles et ressources generes |
| Tests Node | 80 sur 80 | Tests purs, rendu HTML et contrats structurels ; ne valide pas l'execution SQL |
| Controles navigateur Chromium | 91 sur 91 | Rendu et interactions des composants reels, donnees fictives, transport simule pour RPC |
| Largeurs verifiees | 360, 390, 768, 1024, 1440, 1920 px | Pas de debordement horizontal sur l'annuaire teste |
| Revue visuelle | Bureau, menu reduit et mobile | Images effectivement generees et inspectees |
| API Supabase reelle | Non executee | Permissions, donnees, contraintes et concurrence restent a verifier |
| Deploiement Cloudflare reel | Non execute | L'utilisateur declenche la publication depuis son depot |

Les acces reseau au registre npm n'ont pas permis une nouvelle installation complete
ici. Les controles utilisent la version de TypeScript 5.8.3 deja installee localement,
identique a la version verrouillee. Le ZIP doit encore passer npm ci sur Cloudflare.
Les tests ont ete relances depuis une extraction propre du ZIP, sans ancien dist.

Le navigateur de l'environnement bloque la navigation vers les sites et serveurs
locaux. Les essais ont donc ete executes par rendu hors ligne du code applicatif
reel avec page.set_content. Les appels reseau ecriture utilisent un faux transport
instrumente. Les restrictions du navigateur n'ont pas ete desactivees.

## Constats couverts par les essais navigateur

- Quatre roles, destinations de navigation, entree toujours visible sans accordeon.
- Commande reduire/agrandir en pied, etat memorise, largeur compacte 68 px, infobulles.
- Recherche annuaire conservant le focus, pastilles supprimables, facettes et onglets.
- Ouverture de fiche entreprise depuis le logo et navigation clavier de la recherche.
- Conservation de la conversation et du brouillon pendant filtrage et actualisation.
- Volet mobile ferme non focusable, fond inactif lorsqu'il est ouvert, fermeture par le bas.
- Formulaire manager : erreur locale de dates puis appel de la RPC appropriee une seule fois.
- Consultation/archivage/suppression : verification de l'URL RPC et de son corps JSON.

## Relancer les verifications

```sh
npm ci
npm run check
node scripts/preview-offline.mjs EURACONNECT_APERCU.html
# Facultatif : Python + Playwright et Chromium installes sur la machine de test.
python tests/browser_smoke.py EURACONNECT_APERCU.html validation-browser
```

Le test navigateur n'est pas execute automatiquement lors du build Cloudflare et
n'ajoute pas de dependance de production. Son code complet est livre dans tests/.
Le detail des 91 assertions est fourni dans VALIDATION_BROWSER.json.

Aucune certification de production, d'accessibilite exhaustive ou d'absence de faille
n'est revendiquee. Les verifications multi-comptes Supabase et les autres navigateurs
restent a effectuer avant une ouverture a des utilisateurs reels.
