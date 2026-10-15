# Audit du code fourni et décisions de refonte

## Base de travail vérifiée

Archive : `EURACONNECT_V091_STARTUP_MANAGERS.zip`, 96 fichiers. SHA-256 :
`33259c610e70136b8abb471b5c242ec18e9138ed9b5ce5e703fa22d38375c4a8`.

L'inventaire des migrations identifie **15 migrations, 96 noms de fonctions publiques distincts, dont 22 redéfinis au fil des versions, et 33 tables**. Le fichier `source-inventory.json` donne les occurrences. Ces chiffres décrivent l'archive analysée, pas le catalogue d'une base de production consultée en direct.

## Constats issus du code

| Constat | Repère dans V0.9.1 | Conséquence observée ou risque identifié |
|---|---|---|
| Plusieurs générations fonctionnelles coexistent | `app/page.tsx` et composants V03, V04, V06, V07, V08 | Multiplication des chemins d'accès pour un même besoin ou dossier. |
| Le message d'erreur racine utilise `String(e)` hors `Error` | `app/page.tsx`, ligne 31 | Un objet d'erreur renvoyé par Supabase peut devenir `[object Object]`. |
| Candidature puis demande distincte de mise en relation | Migrations `core`, `collaboration_dossiers` et fonctions `demander_mise_en_relation`, `ec07_demander_relation` | L'interface impose une étape technique qui ne correspond pas au simple choix de l'incubé de donner suite. |
| Contrôles Premium dispersés | `plan_code`, `ec08_premium_entreprise`, fonctions V089/V090 | Une révocation doit être vérifiée dans tous les anciens parcours, pas seulement sur le bouton de contact. |
| Description privée et annonce anonymisée concurrentes | `experience_confidentialite` et correctifs besoins | Le prestataire risque de ne disposer que d'un résumé insuffisant pour répondre. |
| Visuels enregistrés dans un bucket public | `euraconnect-media`, politique `ec06_media_public_read` | Une URL d'image connue peut contourner le masquage d'identité dans l'interface. |
| La supervision est un ajout distinct du flux principal | `README_V091.md`, `ec91_mon_portefeuille` | Consultation utile mais séparée de l'agenda commun et sans journal d'accompagnement. |
| Tests historiques principalement structurels | Scripts et documentation de releases | Une analyse syntaxique TSX ne garantit ni le typage complet, ni l'exécution SQL, ni les droits. |

Le code permet d'identifier ces fragilités. Il ne permet pas d'affirmer qu'une fuite a effectivement eu lieu chez un utilisateur.

## Corrections et choix nouveaux

**Un flux unique.** `needs` → `responses` → décision → `messages` et `sessions`. L'incubé peut donner suite, retenir ou décliner. Donner suite ne modifie jamais les droits Premium.

**Une politique d'identité centrale.** Les fonctions `ec1.premium`, `ec1.identity_visible`, `ec1.person_name` et `ec1.redact` sont partagées par les besoins, l'annuaire, les réponses et l'agenda. Les contacts sont un champ structuré distinct, soumis à l'accord de la startup.

**Fermeture des anciens chemins.** L'activation retire les droits navigateur des anciennes fonctions et tables inventoriées. Les données et les identifiants historiques restent conservés. Une fonction ajoutée manuellement hors de l'archive doit être examinée séparément : le script de contrôle la signale, il ne détruit pas un autre service.

**Architecture frontend remplacée, pas dissimulée.** TypeScript strict statique + API Supabase, sans Next.js/React. Objectif : un seul contrôleur de navigation, des contrats de données explicites et un build effectivement exécuté. Renoncement provisoire au SEO serveur des fiches publiques.

**Navigation par intention.** Startup : mes demandes. Prestataire : opportunités. Manager : mes startups. Administrateur : administration. Annuaire, messagerie, agenda et ateliers sont communs, avec des droits différents.

**Un agenda partagé entre modules.** Les disponibilités de l'annuaire utilisent des UUID, jamais un rapprochement sur le nom public d'un prestataire. Une inscription porte un objet et des participants. Les permanences produisent des occurrences réservables.

## Hypothèses retenues explicitement

La structure d'incubation reste la limite de partage. Un compte a un rôle principal. Une entreprise peut avoir plusieurs membres ; les propriétaires et gestionnaires gèrent les besoins et propositions. Les collaborateurs consultent. Un même compte peut choisir parmi ses entreprises autorisées.

Les ateliers sont gratuits, accessibles aux comptes actifs de la structure. La liste d'attente est confirmée automatiquement lorsqu'une place compatible se libère. Le manager n'écrit pas commercialement au nom d'une startup ; il l'aide par la supervision et le suivi interne.

Les besoins sans entreprise sont gardés en brouillon à rattacher, pas publiés sans responsable. Un prestataire non Premium peut répondre dans la limite de cinq propositions mensuelles, valeur initiale conservée et paramétrée dans `ec1.runtime`.

## Réserves qui restent vraies

Le filtrage des noms, emails, téléphones et liens connus ne garantit pas l'absence de réidentification indirecte dans un texte libre. Une information déjà vue par un Premium ne peut pas être retirée de sa mémoire ni de ses exports antérieurs. Les nouvelles lectures sont contrôlées, pas les captures d'écran existantes.

Cette refonte ne prétend pas livrer toutes les fonctions du cahier initial : MFA obligatoire, exports/effacement RGPD automatisés, antivirus documentaire, synchronisation Google/Outlook, emails transactionnels complets, gestion de tâches de projets multi-rôles et QR d'émargement restent hors de ce lot.
