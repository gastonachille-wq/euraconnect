# Hypotheses de conception V0.6

1. `organisations` conserve son sens de structure d'incubation. Le nouvel objet `entreprises_ec` represente startup, prestataire ou autre entreprise utilisatrice.
2. Un utilisateur peut etre membre de plusieurs entreprises, mais une seule entreprise principale est choisie via `profiles.entreprise_id`.
3. La fiche entreprise est publiee volontairement; la fiche d'une personne est opt-in et independante.
4. Le rattachement d'un collaborateur existant est realise par un administrateur, en attendant un circuit invitation/consentement. Ce processus doit etre encadre dans les CGU.
5. Les entreprises prestataires deja validees sont publiees automatiquement lors de la migration; leurs proprietaires gardent leurs droits historiques.
6. Les donnees publiees (logos, avatars, images des offres) ne doivent pas contenir de contenu confidentiel.
7. Les candidatures et conversations continuent de fonctionner avec le compte proprietaire historique. Leur delegation multi-comptes sera un lot dedie.
8. Les competences sont uniquement selectionnees dans `competences_ec` (pas d'ajout libre sans moderation).
9. Le WYSIWYG est un editeur natif sans dependance; une future iteration pourra adopter Tiptap et renforcer la sanitation serveur.
10. Cette V0.6 est un lot de recette; un deploiement en production doit etre valide par build, tests Auth, RLS et e2e dans l'infrastructure cible.
