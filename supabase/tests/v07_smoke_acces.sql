-- Verification restrictive : aucun compte inexistant ne peut acceder aux donnees.
-- Sur Supabase SQL Editor, apres migration, exécuter ce script EN RECETTE.
-- ROLLBACK restaure la configuration de session; aucune modification de donnees.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
begin
 begin
  perform public.ec07_lister_dossiers('00000000-0000-0000-0000-000000000000');
  raise exception 'TEST RATE: lecture autorisee pour utilisateur fictif';
 exception when sqlstate 'P0001' then
  if sqlerrm not like '%Entreprise inaccessible%' then raise;end if;
 end;
 begin
  perform public.ec07_candidater('00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',repeat('x',150));
  raise exception 'TEST RATE: candidature autorisee pour utilisateur fictif';
 exception when sqlstate 'P0001' then
  if sqlerrm not like '%Gestionnaire prestataire requis%' then raise;end if;
 end;
 raise notice 'V0.7 : refus des acces anonymes confirme';
end $test$;
rollback;
