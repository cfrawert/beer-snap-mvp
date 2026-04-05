-- Enable extensions
create extension if not exists "pgcrypto";

-- Users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'suspended', 'admin')),
  post_count_cache integer not null default 0,
  follower_count_cache integer not null default 0,
  following_count_cache integer not null default 0
);

-- Push tokens
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  expo_push_token text not null,
  device_id text not null,
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (user_id, device_id),
  unique (expo_push_token)
);

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  image_path text not null,
  image_width integer not null,
  image_height integer not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  visibility text not null default 'public' check (visibility in ('public')),
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'flagged', 'removed')),
  like_count_cache integer not null default 0,
  dislike_count_cache integer not null default 0,
  score_cache integer not null default 0
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);
create index if not exists posts_score_idx on public.posts (score_cache desc, created_at desc);

-- Post reactions
create table if not exists public.post_reactions (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger post_reactions_set_updated_at
  before update on public.post_reactions
  for each row execute procedure public.set_updated_at();

-- Follows
create table if not exists public.follows (
  follower_user_id uuid not null references public.users(id) on delete cascade,
  followed_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, followed_user_id),
  check (follower_user_id <> followed_user_id)
);

create index if not exists follows_followed_idx on public.follows (followed_user_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('follow', 'post', 'reaction', 'report', 'admin')),
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user')),
  target_post_id uuid references public.posts(id) on delete cascade,
  target_user_id uuid references public.users(id) on delete cascade,
  reason_code text not null,
  note text,
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  check (
    (target_type = 'post' and target_post_id is not null and target_user_id is null)
    or (target_type = 'user' and target_user_id is not null and target_post_id is null)
  )
);

create index if not exists reports_status_idx on public.reports (status);

-- Admin review queue
create table if not exists public.admin_review_queue (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  source text not null,
  priority integer not null default 0,
  state text not null default 'open' check (state in ('open', 'triaged', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists admin_review_open_unique
  on public.admin_review_queue (post_id)
  where state = 'open';

-- Future-proof tables
create table if not exists public.breweries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country_code text,
  is_active boolean not null default true
);

create table if not exists public.beers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  canonical_name text not null,
  brewery_id uuid references public.breweries(id) on delete set null,
  style_id uuid,
  abv numeric(4,2),
  is_active boolean not null default true
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null,
  geo_point point,
  address_json jsonb,
  city text,
  region text,
  country_code text
);

create table if not exists public.post_observations (
  post_id uuid primary key references public.posts(id) on delete cascade,
  beer_id uuid references public.beers(id) on delete set null,
  brewery_id uuid references public.breweries(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  price_amount numeric(10,2),
  price_currency text,
  consumption_context text,
  consumed_at timestamptz,
  source text not null,
  confidence numeric(3,2),
  beer_name_snapshot text,
  brewery_name_snapshot text,
  place_name_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger post_observations_set_updated_at
  before update on public.post_observations
  for each row execute procedure public.set_updated_at();

-- Auth trigger to create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, handle, display_name, avatar_url)
  values (
    new.id,
    'user_' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', 'Beer Lover'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper function to check admin
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.users where id = user_id and status = 'admin'
  );
$$ language sql stable;

-- Enforce immutability for posts
create or replace function public.enforce_post_immutability()
returns trigger as $$
begin
  if (new.image_path <> old.image_path
      or new.image_width <> old.image_width
      or new.image_height <> old.image_height
      or new.created_at <> old.created_at
      or new.user_id <> old.user_id
      or new.visibility <> old.visibility) then
    raise exception 'Posts are immutable';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger posts_immutable
  before update on public.posts
  for each row execute procedure public.enforce_post_immutability();

-- Post count cache
create or replace function public.increment_post_count()
returns trigger as $$
begin
  update public.users
    set post_count_cache = post_count_cache + 1
    where id = new.user_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_post_count_on_delete()
returns trigger as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.users
      set post_count_cache = greatest(post_count_cache - 1, 0)
      where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger posts_after_insert
  after insert on public.posts
  for each row execute procedure public.increment_post_count();

create trigger posts_after_soft_delete
  after update on public.posts
  for each row execute procedure public.decrement_post_count_on_delete();

-- Reaction cache updates
create or replace function public.update_reaction_cache()
returns trigger as $$
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
$$ language plpgsql;

create trigger post_reactions_after_change
  after insert or update or delete on public.post_reactions
  for each row execute procedure public.update_reaction_cache();

-- Follow cache updates
create or replace function public.update_follow_cache()
returns trigger as $$
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
$$ language plpgsql;

create trigger follows_after_change
  after insert or delete on public.follows
  for each row execute procedure public.update_follow_cache();

-- Notifications
create or replace function public.notify_on_follow()
returns trigger as $$
begin
  insert into public.notifications (recipient_user_id, actor_user_id, type)
  values (new.followed_user_id, new.follower_user_id, 'follow');
  return null;
end;
$$ language plpgsql;

create trigger follows_notify
  after insert on public.follows
  for each row execute procedure public.notify_on_follow();

create or replace function public.notify_on_reaction()
returns trigger as $$
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
$$ language plpgsql;

create trigger reactions_notify
  after insert on public.post_reactions
  for each row execute procedure public.notify_on_reaction();

create or replace function public.notify_on_new_post()
returns trigger as $$
begin
  insert into public.notifications (recipient_user_id, actor_user_id, type, post_id)
  select follower_user_id, new.user_id, 'post', new.id
  from public.follows
  where followed_user_id = new.user_id;
  return null;
end;
$$ language plpgsql;

create trigger posts_notify
  after insert on public.posts
  for each row execute procedure public.notify_on_new_post();

-- Reports enqueue admin review
create or replace function public.enqueue_report_review()
returns trigger as $$
begin
  if new.target_post_id is not null then
    insert into public.admin_review_queue (post_id, source, priority)
    values (new.target_post_id, 'report', 2)
    on conflict do nothing;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger reports_enqueue
  after insert on public.reports
  for each row execute procedure public.enqueue_report_review();

-- Enqueue posts with high dislikes
create or replace function public.enqueue_dislike_review()
returns trigger as $$
begin
  if new.dislike_count_cache >= 5 and new.dislike_count_cache >= (new.like_count_cache * 2) then
    insert into public.admin_review_queue (post_id, source, priority)
    values (new.id, 'dislike_threshold', 1)
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger posts_dislike_queue
  after update on public.posts
  for each row execute procedure public.enqueue_dislike_review();

-- RLS
alter table public.users enable row level security;
alter table public.user_push_tokens enable row level security;
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.admin_review_queue enable row level security;
alter table public.breweries enable row level security;
alter table public.beers enable row level security;
alter table public.places enable row level security;
alter table public.post_observations enable row level security;

-- Users policies
create policy "Public profiles are readable" on public.users
  for select using (true);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id and status = 'active');

-- Push tokens policies
create policy "Users manage own push tokens" on public.user_push_tokens
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Posts policies
create policy "Public can read approved posts" on public.posts
  for select using (deleted_at is null and visibility = 'public' and moderation_status = 'approved');

create policy "Users can read own posts" on public.posts
  for select using (auth.uid() = user_id);

create policy "Admins can read all posts" on public.posts
  for select using (public.is_admin(auth.uid()));

create policy "Users can create posts" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "Users can soft delete own posts" on public.posts
  for update using (auth.uid() = user_id);

create policy "Admins can moderate posts" on public.posts
  for update using (public.is_admin(auth.uid()));

-- Reactions policies
create policy "Users can react" on public.post_reactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own reaction" on public.post_reactions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own reaction" on public.post_reactions
  for delete using (auth.uid() = user_id);

-- Follows policies
create policy "Users can view follows" on public.follows
  for select using (auth.uid() is not null);

create policy "Users can follow" on public.follows
  for insert with check (auth.uid() = follower_user_id);

create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_user_id);

-- Notifications policies
create policy "Users can read notifications" on public.notifications
  for select using (auth.uid() = recipient_user_id);

create policy "Users can update notifications" on public.notifications
  for update using (auth.uid() = recipient_user_id)
  with check (auth.uid() = recipient_user_id);

-- Reports policies
create policy "Users can report" on public.reports
  for insert with check (auth.uid() = reporter_user_id);

create policy "Admins can review reports" on public.reports
  for select using (public.is_admin(auth.uid()));

create policy "Admins can update reports" on public.reports
  for update using (public.is_admin(auth.uid()));

-- Admin review policies
create policy "Admins can manage queue" on public.admin_review_queue
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Reference tables policies
create policy "Public breweries read" on public.breweries
  for select using (true);

create policy "Admin breweries write" on public.breweries
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Public beers read" on public.beers
  for select using (true);

create policy "Admin beers write" on public.beers
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Public places read" on public.places
  for select using (true);

create policy "Admin places write" on public.places
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admin post observations" on public.post_observations
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Storage bucket (public)
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

create policy "Public can read post images" on storage.objects
  for select using (bucket_id = 'posts');

create policy "Authenticated can upload post images" on storage.objects
  for insert with check (bucket_id = 'posts' and auth.uid() is not null);
