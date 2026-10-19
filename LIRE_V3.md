# EURACONNECT V3.0 - Archive reconstituee

## Pourquoi ce fichier
Le ZIP V3 annonce dans le message precedent n'etait pas disponible dans les fichiers de la conversation. Cette archive a donc ete RECONSTITUEE depuis la V2.9 effectivement disponible. Ce n'est ni une copie byte pour byte de l'archive precedente, ni une V2.9 simplement renommee.

## Perimetre de cette reconstitution
- Menu utilisateur sous l'avatar, fermeture au clavier et confirmation de deconnexion.
- Accueil contextuel par role, indicateurs compacts, demandes sous forme de liste et rendez-vous contextualises.
- Messages avec liste, conversation centrale et panneau contexte repliable; titre = demande.
- Profil en quatre onglets : Mon profil, Mon entreprise, Equipe, Securite.
- Calendrier jour/semaine horaire, repartition des chevauchements, filtres repliables.
- Cartes services verticales par defaut; texte neutre quand la description est incomplete. Aucun tarif, pourcentage ni unite invente.
- Grille, contrastes, boutons et hierarchie harmonises; menu continu et reduction en pied conserves.

## Ce qui reste inchange
Supabase et ses regles d'acces, fonctions RPC, inscriptions, rendez-vous, demandes, recommandations manager et activation Premium conservent leurs contrats V2.9. Aucun paiement ajoute. Aucune migration SQL nouvelle. Aucun compte ni donnee de la base n'est modifie lors de la compilation.

## Deploiement
1. Decompressez cette archive.
2. Importez tout son contenu a la racine du depot GitHub existant, en conservant les dossiers. Remplacez les fichiers du meme nom. Ne deposez pas le ZIP lui-meme.
3. Enregistrez le commit.
4. Gardez sur Cloudflare : `npm run check` puis `npx wrangler deploy`.
5. Gardez les variables de compilation `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Ne jamais utiliser de cle service_role ou sb_secret dans le frontend.
6. Le repertoire `dist` est regenere par la compilation : il est volontairement absent du ZIP.

Ne rejouez pas les migrations SQL historiques pour cette mise a jour graphique. Elles sont conservees comme sources et pour les tests de structure existants.

## Limites
Cette reconstitution reprend la demande graphique, pas toutes les evolutions fonctionnelles du cahier des charges. Les pieces jointes de messagerie, la synchronisation avec les calendriers externes et la refonte des droits serveur ne sont pas ajoutees. Les brouillons de message restent en memoire de la page. Les filtres restent soumis aux limites de pagination de la V2.9. Les tests navigateur utilisent des donnees fictives ou un transport simule; aucune validation n'a ete executee sur le Supabase reel.

Voir VALIDATION_V3.md pour les controles de cette archive. Les anciens README et rapports V2.9 sont historiques et ne constituent pas des preuves de tests V3.
