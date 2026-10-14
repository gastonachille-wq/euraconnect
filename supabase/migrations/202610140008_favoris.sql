-- EURACONNECT V0.8.4 - favoris personnels
create table if not exists public.favoris_ec (
 utilisateur_id uuid not null references auth.users(id) on delete cascade,
 cible_type text not null check(cible_type in ('entreprise','personne')),
 cible_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(utilisateur_id,cible_type,cible_id)
);
alter table public.favoris_ec enable row level security;
drop policy if exists favoris_lecture on public.favoris_ec;
create policy favoris_lecture on public.favoris_ec for select to authenticated using(utilisateur_id=auth.uid());
drop policy if exists favoris_creation on public.favoris_ec;
create policy favoris_creation on public.favoris_ec for insert to authenticated with check(utilisateur_id=auth.uid());
drop policy if exists favoris_suppression on public.favoris_ec;
create policy favoris_suppression on public.favoris_ec for delete to authenticated using(utilisateur_id=auth.uid());
grant select,insert,delete on public.favoris_ec to authenticated;
