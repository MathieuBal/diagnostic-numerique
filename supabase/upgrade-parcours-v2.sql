-- À exécuter uniquement si le schéma initial était déjà installé.
create or replace function public.save_participant(p_id uuid,p_secret text,p_answers jsonb,p_position integer,p_revision bigint,p_finished boolean)
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
