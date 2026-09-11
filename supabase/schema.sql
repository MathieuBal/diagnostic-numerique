-- Installation unique sur un projet Supabase dédié, via SQL Editor.
-- Aucun accès direct aux tables depuis les navigateurs. RPC limités ci-dessous.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table public.trainers (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.workshop_sessions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 title text not null check(char_length(title) between 1 and 100),
 code text not null unique default upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,12)),
 is_open boolean not null default true, created_at timestamptz not null default now()
);
create table public.workshop_participants (
 id uuid primary key, session_id uuid not null references public.workshop_sessions(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 60), secret_hash text not null,
 answers jsonb not null default '{}', observations jsonb not null default '{}',
 position integer not null default 0, revision bigint not null default -1,
 finished boolean not null default false, updated_at timestamptz not null default now()
);
create index participants_session_idx on public.workshop_participants(session_id);
alter table public.trainers enable row level security;
alter table public.workshop_sessions enable row level security;
alter table public.workshop_participants enable row level security;
revoke all on public.trainers,public.workshop_sessions,public.workshop_participants from anon,authenticated;

create function public.trainer_check() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.trainers where user_id=auth.uid()) then
  raise exception 'Accès animateur non autorisé.' using errcode='42501';
 end if;
 return true;
end $$;
create function public.create_session(p_title text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.workshop_sessions;
begin
 perform public.trainer_check();
 insert into public.workshop_sessions(owner_id,title) values(auth.uid(),trim(p_title)) returning * into s;
 return to_jsonb(s);
end $$;
create function public.trainer_sessions() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.workshop_sessions s where owner_id=auth.uid()),'[]'::jsonb);
end $$;
create function public.set_session_open(p_session uuid,p_open boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 update public.workshop_sessions set is_open=p_open where id=p_session and owner_id=auth.uid();
 if not found then raise exception 'Séance inaccessible.'; end if;
 return true;
end $$;
create function public.trainer_participants(p_session uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 if not exists(select 1 from public.workshop_sessions where id=p_session and owner_id=auth.uid()) then raise exception 'Séance inaccessible.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'answers',p.answers,'observations',p.observations,'position',p.position,'finished',p.finished,'updated_at',p.updated_at) order by p.name) from public.workshop_participants p where session_id=p_session),'[]'::jsonb);
end $$;
create function public.save_observations(p_participant uuid,p_observations jsonb) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.trainer_check();
 if p_observations is null or jsonb_typeof(p_observations)<>'object' or octet_length(p_observations::text)>16000 then raise exception 'Observations invalides.'; end if;
 update public.workshop_participants p set observations=p_observations
 where p.id=p_participant and exists(select 1 from public.workshop_sessions s where s.id=p.session_id and s.owner_id=auth.uid());
 if not found then raise exception 'Participant inaccessible.'; end if;
 return true;
end $$;
create function public.join_session(p_code text,p_name text,p_id uuid,p_secret text) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.workshop_sessions; existing public.workshop_participants; h text;
begin
 if p_secret is null or length(p_secret)<64 or length(p_secret)>150 or p_id is null then raise exception 'Session navigateur invalide.'; end if;
 select * into s from public.workshop_sessions where code=upper(trim(p_code)) and is_open for update;
 if not found then raise exception 'Code inconnu ou séance fermée. Vérifiez avec votre animateur.'; end if;
 h:=encode(extensions.digest(p_secret,'sha256'),'hex');
 select * into existing from public.workshop_participants where id=p_id;
 if found then
  if existing.session_id<>s.id or existing.secret_hash<>h then raise exception 'Session navigateur invalide.'; end if;
  return true;
 end if;
 if (select count(*) from public.workshop_participants where session_id=s.id)>=250 then raise exception 'Cette séance a atteint sa capacité.'; end if;
 insert into public.workshop_participants(id,session_id,name,secret_hash) values(p_id,s.id,trim(p_name),h);
 return true;
end $$;
create function public.save_participant(p_id uuid,p_secret text,p_answers jsonb,p_position integer,p_revision bigint,p_finished boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare p public.workshop_participants;
begin
 if p_secret is null or length(p_secret)>150 then raise exception 'Session navigateur invalide.'; end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>64000 or p_position is null or p_position not between 0 and 35 or p_revision is null or p_revision<0 or p_finished is null then raise exception 'Réponses invalides.'; end if;
 select * into p from public.workshop_participants where id=p_id and secret_hash=encode(extensions.digest(p_secret,'sha256'),'hex') for update;
 if not found then raise exception 'Session navigateur invalide.'; end if;
 perform 1 from public.workshop_sessions where id=p.session_id and is_open for share;
 if not found then raise exception 'La collecte est fermée. Gardez une copie et contactez votre animateur.'; end if;
 if p_revision<p.revision then raise exception 'Une version plus récente existe. Utilisez le dernier onglet ouvert et conservez une copie.'; end if;
 if p_revision=p.revision then
  if p_answers=p.answers and p_position=p.position and p_finished=p.finished then return true; end if;
  raise exception 'Deux onglets ont modifié ce parcours. Conservez une copie et contactez votre animateur.';
 end if;
 update public.workshop_participants set answers=p_answers,position=p_position,revision=p_revision,finished=p_finished,updated_at=now() where id=p_id;
 return true;
end $$;
revoke all on function public.trainer_check(),public.create_session(text),public.trainer_sessions(),public.set_session_open(uuid,boolean),public.trainer_participants(uuid),public.save_observations(uuid,jsonb),public.join_session(text,text,uuid,text),public.save_participant(uuid,text,jsonb,integer,bigint,boolean) from public,anon,authenticated;
grant execute on function public.trainer_check(),public.create_session(text),public.trainer_sessions(),public.set_session_open(uuid,boolean),public.trainer_participants(uuid),public.save_observations(uuid,jsonb) to authenticated;
grant execute on function public.join_session(text,text,uuid,text),public.save_participant(uuid,text,jsonb,integer,bigint,boolean) to anon;
commit;
-- Après création de l’utilisateur animateur dans Authentication > Users :
-- insert into public.trainers(user_id) select id from auth.users where email = 'VOTRE_ADRESSE';

-- Accueil unique et programme pédagogique.
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

-- Active le bouton de suppression. Ce script ne supprime aucune séance.
begin;
create or replace function public.delete_session(p_session uuid, p_confirm_title text)
returns boolean language plpgsql security definer set search_path='' as $$
declare s public.workshop_sessions;
begin
 perform public.trainer_check();
 select * into s from public.workshop_sessions
 where id=p_session and owner_id=auth.uid() for update;
 if not found then raise exception 'Séance inaccessible ou déjà supprimée.'; end if;
 if s.is_open then raise exception 'Fermez la collecte avant de supprimer cette séance.'; end if;
 if p_confirm_title is distinct from s.title then raise exception 'Le nom de confirmation ne correspond pas à la séance.'; end if;
 delete from public.workshop_sessions where id=s.id and owner_id=auth.uid();
 return true;
end $$;
revoke all on function public.delete_session(uuid,text) from public,anon,authenticated;
grant execute on function public.delete_session(uuid,text) to authenticated;
commit;
