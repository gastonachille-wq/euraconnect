-- EURACONNECT V0.8.6 - Epingle de besoins sans divulgation de l'identite
-- Necessite migration V0.8.5. La table existante est conservee.
alter table public.favoris_ec drop constraint if exists favoris_ec_cible_type_check;
alter table public.favoris_ec add constraint favoris_ec_cible_type_check check(cible_type in ('entreprise','personne','besoin'));
-- Les policies lecture/ecriture restent limitees a auth.uid().
create index if not exists favoris_ec_type_utilisateur on public.favoris_ec(utilisateur_id,cible_type);
