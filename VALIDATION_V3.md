# EURACONNECT V3.0 - Validation de l'archive reconstituee

## Origine
Reconstitution depuis EURACONNECT_V29_MENU_FLUIDE_SOURCES.zip. La precedente archive V3 annoncee n'etait pas disponible; l'identite byte pour byte avec cette ancienne livraison n'est pas revendiquee. La reconstitution comporte de veritables changements TypeScript et CSS.

## Controles executes
- Node.js 22.16.0; TypeScript 5.8.3.
- `npm run check` : typage strict reussi, build statique genere, 92 tests Node reussis (80 tests historiques et 12 tests V3).
- `tests/browser_smoke.py` : 91 controles navigateur reussis avec donnees fictives ou transport HTTP simule.
- `tests/browser_v3.py` : 31 controles supplementaires reussis, desktop 1440 px et mobile 390 px; menu compte, deconnexion annulee, onglets profil, panneau de contexte et debordements.
- Apercu autonome regenere depuis les memes fichiers TypeScript et CSS que le code de production.
- Inspection visuelle des captures du tableau de bord; absence de masquage lateral une fois le rendu stabilise. Transitions de largeur supprimees pour eviter le decalage transitoire du menu.

## Installation des dependances en validation
La tentative d'installation npm par le reseau a expire. Les controles ont utilise une copie locale de TypeScript 5.8.3, exactement la version du package-lock. node_modules est exclu du ZIP. Une installation depuis le registre npm par Cloudflare reste a confirmer.

## Non execute
Aucun deploiement sur le compte Cloudflare, aucune ecriture sur Supabase, aucun test de permissions multi-comptes sur la base reelle. Pas d'audit formel WCAG ni de mesure Lighthouse. Les tests SQL historiques sont des tests de structure, pas une preuve de l'execution SQL.

## Commandes reproductibles
```sh
npm ci
npm run check
node scripts/preview-offline.mjs EURACONNECT_APERCU.html
python tests/browser_smoke.py EURACONNECT_APERCU.html validation-browser
python tests/browser_v3.py EURACONNECT_APERCU.html validation-browser-v3
```
Les tests navigateur demandent Python Playwright et Chromium. Ils ne sont pas necessaires a l'execution de l'application et n'ajoutent aucune dependance de production.
