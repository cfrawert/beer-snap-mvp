create or replace function public.resolve_post_review_state(
  target_post_id_arg uuid,
  next_report_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.admin_review_queue
    set state = 'resolved',
        resolved_at = now()
    where post_id = target_post_id_arg
      and state <> 'resolved';

  update public.reports
    set status = next_report_status
    where target_post_id = target_post_id_arg
      and status in ('open', 'reviewing');
end;
$$;

create or replace function public.admin_approve_post(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  update public.posts
    set moderation_status = 'approved'
    where id = target_post_id;

  perform public.resolve_post_review_state(target_post_id, 'dismissed');
end;
$$;

create or replace function public.admin_delete_post(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  update public.posts
    set moderation_status = 'removed',
        deleted_at = coalesce(deleted_at, now())
    where id = target_post_id;

  perform public.resolve_post_review_state(target_post_id, 'resolved');
end;
$$;

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'Admin access required';
  end if;

  if current_admin_id = target_user_id then
    raise exception 'Admins cannot delete themselves';
  end if;

  update public.admin_review_queue
    set state = 'resolved',
        resolved_at = now()
    where post_id in (
      select id from public.posts where user_id = target_user_id
    )
      and state <> 'resolved';

  update public.reports
    set status = 'resolved'
    where target_post_id in (
      select id from public.posts where user_id = target_user_id
    )
      and status in ('open', 'reviewing');

  delete from auth.users
    where id = target_user_id;
end;
$$;
