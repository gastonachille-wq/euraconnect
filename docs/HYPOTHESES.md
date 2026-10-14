# Hypothèses explicites et écarts

- Une organisation d'incubation par défaut (`eurasante`), même si les tables sont préparées avec `organisation_id`.
- Inscription publique uniquement prestataire ; création du compte incubé par invitation manuelle dans Supabase Auth puis promotion par l'administrateur dans l'interface.
- Les offres et les besoins n'intègrent pas encore de compétences normalisées, durée, délais ou échéances : modules des lots suivants.
- Les plans payants sont paramétrés en base, mais **sans paiement ni contrôle des droits payants** ; le prestataire reste Free.
- Les réponses ouvertes utilisent un alias quel que soit le plan tant que les abonnements payants ne sont pas activés, afin de ne jamais révéler par erreur une identité.
- La validation de la confidentialité des candidatures ne couvre que les informations structurées et quelques motifs textuels évidents ; elle n'est **pas suffisante pour une production ouverte**.
- Les demandes de contact direct et les candidatures sur invitation sont réservées à une prochaine livraison : le quota concerné ne couvre ici que les candidatures ouvertes.
- La MFA administrateur et le workflow de récupération sécurisé doivent être ajoutés avant production.
- Le développement répond aux besoins d'un premier déploiement de recette, pas à tous les critères d'acceptation V2.
