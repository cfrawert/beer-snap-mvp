create or replace function public.increment_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set post_count_cache = post_count_cache + 1
    where id = new.user_id;
  return new;
end;
$$;

create or replace function public.decrement_post_count_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.users
      set post_count_cache = greatest(post_count_cache - 1, 0)
      where id = new.user_id;
  end if;
  return new;
end;
$$;

create or replace function public.update_reaction_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.reaction = 'like' then
      update public.posts
        set like_count_cache = like_count_cache + 1,
            score_cache = score_cache + 1
        where id = new.post_id;
    else
      update public.posts
        set dislike_count_cache = dislike_count_cache + 1,
            score_cache = score_cache - 1
        where id = new.post_id;
    end if;
  elsif (tg_op = 'UPDATE') then
    if old.reaction <> new.reaction then
      update public.posts
        set like_count_cache = like_count_cache + (case when new.reaction = 'like' then 1 else 0 end)
                                      - (case when old.reaction = 'like' then 1 else 0 end),
            dislike_count_cache = dislike_count_cache + (case when new.reaction = 'dislike' then 1 else 0 end)
                                        - (case when old.reaction = 'dislike' then 1 else 0 end),
            score_cache = score_cache + (case when new.reaction = 'like' then 1 else -1 end)
                                    - (case when old.reaction = 'like' then 1 else -1 end)
        where id = new.post_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if old.reaction = 'like' then
      update public.posts
        set like_count_cache = greatest(like_count_cache - 1, 0),
            score_cache = score_cache - 1
        where id = old.post_id;
    else
      update public.posts
        set dislike_count_cache = greatest(dislike_count_cache - 1, 0),
            score_cache = score_cache + 1
        where id = old.post_id;
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.update_follow_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.users
      set following_count_cache = following_count_cache + 1
      where id = new.follower_user_id;
    update public.users
      set follower_count_cache = follower_count_cache + 1
      where id = new.followed_user_id;
  elsif (tg_op = 'DELETE') then
    update public.users
      set following_count_cache = greatest(following_count_cache - 1, 0)
      where id = old.follower_user_id;
    update public.users
      set follower_count_cache = greatest(follower_count_cache - 1, 0)
      where id = old.followed_user_id;
  end if;
  return null;
end;
$$;

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_user_id, actor_user_id, type)
  values (new.followed_user_id, new.follower_user_id, 'follow');
  return null;
end;
$$;

create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    insert into public.notifications (recipient_user_id, actor_user_id, type, post_id)
    values (post_owner, new.user_id, 'reaction', new.post_id);
  end if;
  return null;
end;
$$;

create or replace function public.notify_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_user_id, actor_user_id, type, post_id)
  select follower_user_id, new.user_id, 'post', new.id
  from public.follows
  where followed_user_id = new.user_id;
  return null;
end;
$$;

create or replace function public.enqueue_report_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_post_id is not null then
    insert into public.admin_review_queue (post_id, source, priority)
    values (new.target_post_id, 'report', 2)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create or replace function public.enqueue_dislike_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.dislike_count_cache >= 5 and new.dislike_count_cache >= (new.like_count_cache * 2) then
    insert into public.admin_review_queue (post_id, source, priority)
    values (new.id, 'dislike_threshold', 1)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
