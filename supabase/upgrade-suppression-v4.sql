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
