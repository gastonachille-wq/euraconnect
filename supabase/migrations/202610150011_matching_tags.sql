-- V0.8.7 : score complementaire de tags, lecture strictement limitee aux besoins visibles
-- Depend des migrations V0.8.5 et V0.8.6; aucune modification destructive.
create or replace function public.ec087_matching_tags(p_entreprise uuid)
returns table(besoin_id uuid,tags_communs text[],nb_communs integer)
language sql stable security definer set search_path='' as $fn$
with acces as (
 select e.id from public.entreprises_ec e
 where e.id=p_entreprise and e.type='prestataire'
   and public.ec07_droit_entreprise(e.id,false)
),
visibles as (
 select b.id from public.ec08_fil_besoins(p_entreprise,'','') b
),
mes_tags as (
 select l.tag_id from public.tags_liens_ec l join acces a on true
 where l.cible_type='entreprise' and l.cible_id=a.id
 union
 select l.tag_id from public.tags_liens_ec l
 join public.offres o on o.id=l.cible_id and l.cible_type='offre'
 join public.prestataires p on p.id=o.prestataire_id
 join acces a on a.id=p.entreprise_id
),
communs as (
 select v.id as besoin_id,t.libelle,t.id as tag_id
 from visibles v join public.tags_liens_ec l on l.cible_type='besoin' and l.cible_id=v.id
 join mes_tags mt on mt.tag_id=l.tag_id
 join public.tags_ec t on t.id=l.tag_id
)
select v.id as besoin_id, coalesce(array_agg(c.libelle order by c.libelle) filter(where c.tag_id is not null),'{}'::text[]) as tags_communs,
 count(c.tag_id)::integer as nb_communs
from visibles v left join communs c on c.besoin_id=v.id
group by v.id;
$fn$;
revoke all on function public.ec087_matching_tags(uuid) from public,anon;
grant execute on function public.ec087_matching_tags(uuid) to authenticated;
