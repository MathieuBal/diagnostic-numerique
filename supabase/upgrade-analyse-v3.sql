-- Après le schéma initial et upgrade-parcours-v2.sql si nécessaire.
begin;
alter table public.workshop_sessions add column if not exists plan jsonb;
create table if not exists public.workshop_entry (
 singleton boolean primary key default true check(singleton),
 session_id uuid not null references public.workshop_sessions(id) on delete cascade
);
alter table public.workshop_entry enable row level security;
revoke all on public.workshop_entry from public,anon,authenticated;
create or replace function public.trainer_sessions() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 return coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('is_entry',exists(select 1 from public.workshop_entry e where e.session_id=s.id)) order by s.created_at desc) from public.workshop_sessions s where owner_id=auth.uid()),'[]'::jsonb);
end $$;
create or replace function public.activate_session(p_session uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 perform pg_catalog.pg_advisory_xact_lock(821347601);
 if not exists(select 1 from public.workshop_sessions where id=p_session and owner_id=auth.uid()) then raise exception 'Séance inaccessible.'; end if;
 if exists(select 1 from public.workshop_entry e join public.workshop_sessions s on s.id=e.session_id where s.owner_id<>auth.uid()) then raise exception 'Le lien d’accueil est déjà associé à un autre animateur de ce projet.'; end if;
 update public.workshop_sessions set is_open=true where id=p_session and owner_id=auth.uid();
 insert into public.workshop_entry(singleton,session_id) values(true,p_session) on conflict(singleton) do update set session_id=excluded.session_id;
 return true;
end $$;
create or replace function public.join_active(p_name text,p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_code text; existing public.workshop_participants;
begin
 if p_id is null or p_secret is null or length(p_secret)<64 or length(p_secret)>150 or p_name is null or char_length(trim(p_name)) not between 1 and 60 then raise exception 'Indiquez votre prénom et réessayez.'; end if;
 select * into existing from public.workshop_participants where id=p_id;
 if found then
  if existing.secret_hash<>encode(extensions.digest(p_secret,'sha256'),'hex') then raise exception 'Session navigateur invalide.'; end if;
  select code into target_code from public.workshop_sessions where id=existing.session_id;
  return jsonb_build_object('code',target_code);
 end if;
 select s.code into target_code from public.workshop_entry e join public.workshop_sessions s on s.id=e.session_id where s.is_open;
 if target_code is null then raise exception 'Votre animateur doit ouvrir la séance sur le lien d’accueil. Prévenez-le puis réessayez.'; end if;
 perform public.join_session(target_code,p_name,p_id,p_secret);
 return jsonb_build_object('code',target_code);
end $$;
create or replace function public.save_workshop_plan(p_session uuid,p_plan jsonb) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 if p_plan is null or jsonb_typeof(p_plan)<>'object' or octet_length(p_plan::text)>220000 then raise exception 'Programme invalide.'; end if;
 if p_plan->>'version' is distinct from '1' or jsonb_typeof(p_plan->'items') is distinct from 'array' then raise exception 'Programme invalide.'; end if;
 if jsonb_array_length(p_plan->'items')<>12 then raise exception 'Le programme doit contenir 12 ateliers.'; end if;
 update public.workshop_sessions set plan=p_plan where id=p_session and owner_id=auth.uid();
 if not found then raise exception 'Séance inaccessible.'; end if;
 return true;
end $$;
revoke all on function public.activate_session(uuid),public.join_active(text,uuid,text),public.save_workshop_plan(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.activate_session(uuid),public.save_workshop_plan(uuid,jsonb) to authenticated;
grant execute on function public.join_active(text,uuid,text) to anon;
commit;
