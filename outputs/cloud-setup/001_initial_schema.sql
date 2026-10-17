-- Furfolio: initial schema, ownership policies, and atomic publication.
-- Run the entire file in the Supabase project's SQL Editor as postgres.
-- Target project: dtftipcvgznnnrbjrkea. No API keys or passwords are needed here.
-- Intended for the fresh project; safe to rerun this same migration.
begin;

create schema if not exists furfolio_private;
revoke all on schema furfolio_private from public, anon, authenticated;
grant usage on schema furfolio_private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username = lower(normalize(username, NFKC))
    and username ~ '^[a-z0-9_㐀-鿿]{3,24}$'
  )
);

create table if not exists public.homepages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  slug text not null unique,
  draft jsonb not null,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepages_one_per_owner unique (owner_id),
  constraint homepages_identity_owner unique (id, owner_id),
  constraint homepages_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  constraint homepages_draft_shape check (
    jsonb_typeof(draft) = 'object'
    and draft @> '{"schemaVersion": 1}'::jsonb
    and coalesce(draft->>'templateId', '') in ('y2k', 'minimal', 'cyber', 'editorial')
    and octet_length(draft::text) <= 262144
  )
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  public_id text not null unique,
  secure_url text not null,
  format text not null check (format in ('png', 'jpg', 'jpeg', 'webp', 'avif', 'gif')),
  bytes integer not null check (bytes > 0 and bytes <= 10485760),
  width integer not null check (width > 0 and width <= 10000),
  height integer not null check (height > 0 and height <= 10000),
  created_at timestamptz not null default now(),
  constraint assets_owner_public_id check (
    starts_with(public_id, 'furfolio/' || owner_id::text || '/')
  ),
  constraint assets_cloud_url check (
    secure_url ~ '^https://res[.]cloudinary[.]com/jcirypaz/image/upload/'
  )
);
create index if not exists assets_owner_id_idx on public.assets(owner_id);

create table if not exists public.published_homepages (
  homepage_id uuid primary key,
  owner_id uuid not null,
  slug text not null unique,
  config jsonb not null,
  version integer not null check (version >= 1),
  published_at timestamptz not null default now(),
  constraint published_homepages_owner foreign key (homepage_id, owner_id)
    references public.homepages(id, owner_id) on delete cascade,
  constraint published_homepages_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  constraint published_homepages_config_shape check (
    jsonb_typeof(config) = 'object'
    and config @> '{"schemaVersion": 1, "profile": {"schemaVersion": 1}}'::jsonb
    and jsonb_typeof(config->'media') = 'object'
    and octet_length(config::text) <= 393216
  )
);

alter table public.profiles enable row level security;
alter table public.homepages enable row level security;
alter table public.assets enable row level security;
alter table public.published_homepages enable row level security;

-- Revoke Supabase default grants before giving each role its minimum access.
revoke all on public.profiles, public.homepages, public.assets, public.published_homepages from anon, authenticated;
grant select on public.profiles, public.assets to authenticated;
grant select, insert, delete on public.homepages to authenticated;
grant update (slug, draft) on public.homepages to authenticated;
grant select (slug, config, version, published_at) on public.published_homepages to anon;
grant select, delete on public.published_homepages to authenticated;
grant all on public.profiles, public.homepages, public.assets, public.published_homepages to service_role;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists homepages_read_own on public.homepages;
create policy homepages_read_own on public.homepages for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists homepages_insert_own on public.homepages;
create policy homepages_insert_own on public.homepages for insert to authenticated
  with check ((select auth.uid()) = owner_id);
drop policy if exists homepages_update_own on public.homepages;
create policy homepages_update_own on public.homepages for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists homepages_delete_own on public.homepages;
create policy homepages_delete_own on public.homepages for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists assets_read_own on public.assets;
create policy assets_read_own on public.assets for select to authenticated
  using ((select auth.uid()) = owner_id);
-- Asset insertion and deletion require the backend to verify Cloudinary ownership.

drop policy if exists published_homepages_read_public on public.published_homepages;
create policy published_homepages_read_public on public.published_homepages for select to anon, authenticated
  using (true);
drop policy if exists published_homepages_unpublish_own on public.published_homepages;
create policy published_homepages_unpublish_own on public.published_homepages for delete to authenticated
  using ((select auth.uid()) = owner_id);
-- No INSERT/UPDATE grants: public snapshots can only be written by the checked RPC.

create or replace function furfolio_private.guard_homepage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.owner_id <> old.owner_id or new.created_at <> old.created_at then
      raise exception 'homepage_identity_immutable' using errcode = '42501';
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
  else
    new.version := 1;
    new.created_at := now();
    new.updated_at := now();
  end if;
  -- Serialize slug reservation/publication to avoid a cross-table race.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.slug, 0));
  if exists (select 1 from public.published_homepages p
    where p.slug = new.slug and p.owner_id <> new.owner_id) then
    raise exception 'slug_already_taken' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function furfolio_private.guard_homepage() from public, anon, authenticated;
drop trigger if exists furfolio_guard_homepage on public.homepages;
create trigger furfolio_guard_homepage before insert or update on public.homepages
  for each row execute function furfolio_private.guard_homepage();

create or replace function furfolio_private.publish_homepage(p_homepage_id uuid, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  page public.homepages%rowtype;
  referenced_ids text[];
  resolved_media jsonb;
  matched_count integer;
  result jsonb;
  interests jsonb;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into page from public.homepages
    where id = p_homepage_id and owner_id = actor for update;
  if not found then
    raise exception 'homepage_not_found' using errcode = '42501';
  end if;
  if p_expected_version is null or page.version <> p_expected_version then
    raise exception 'draft_version_conflict' using errcode = 'PT409';
  end if;
  if jsonb_typeof(page.draft->'gallery') is distinct from 'array'
    or jsonb_array_length(page.draft->'gallery') > 20 then
    raise exception 'invalid_gallery' using errcode = '22023';
  end if;
  interests := coalesce(page.draft->'interests', '[]'::jsonb);
  if jsonb_typeof(interests) is distinct from 'array' then
    raise exception 'invalid_interests' using errcode = '22023';
  end if;
  if jsonb_array_length(interests) > 6 then
    raise exception 'invalid_interests' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct ref), array[]::text[]) into referenced_ids
  from (
    select page.draft->>'heroAssetId' as ref
    union all
    select page.draft->>'aboutAssetId'
    union all
    select item->>'assetId' from jsonb_array_elements(interests) item
    union all
    select item->>'assetId' from jsonb_array_elements(page.draft->'gallery') item
  ) refs where ref is not null and ref <> '';
  select count(*)::integer, coalesce(jsonb_object_agg(a.id::text, a.secure_url), '{}'::jsonb)
    into matched_count, resolved_media
    from public.assets a where a.owner_id = actor and a.id::text = any(referenced_ids);
  if matched_count <> cardinality(referenced_ids) then
    raise exception 'images_not_uploaded_or_not_owned' using errcode = '22023';
  end if;
  -- Demo atlas images are never included in a user's published profile.
  if exists (select 1 from jsonb_array_elements(page.draft->'gallery') item where item ? 'atlasIndex') then
    raise exception 'demo_images_not_publishable' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(page.slug, 0));
  if exists (select 1 from public.homepages h where h.slug = page.slug and h.owner_id <> actor) then
    raise exception 'slug_already_taken' using errcode = '23505';
  end if;
  result := jsonb_build_object('schemaVersion', 1, 'profile', page.draft, 'media', resolved_media);
  insert into public.published_homepages (homepage_id, owner_id, slug, config, version, published_at)
    values (page.id, actor, page.slug, result, page.version, now())
    on conflict (homepage_id) do update set
      slug = excluded.slug, config = excluded.config, version = excluded.version, published_at = excluded.published_at;
  return jsonb_build_object('slug', page.slug, 'version', page.version);
end;
$$;
revoke all on function furfolio_private.publish_homepage(uuid, integer) from public, anon;
grant execute on function furfolio_private.publish_homepage(uuid, integer) to authenticated;

-- Exposed wrapper is SECURITY INVOKER; privileged implementation is private.
create or replace function public.publish_homepage(p_homepage_id uuid, p_expected_version integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select furfolio_private.publish_homepage(p_homepage_id, p_expected_version);
$$;
revoke all on function public.publish_homepage(uuid, integer) from public, anon;
grant execute on function public.publish_homepage(uuid, integer) to authenticated;

comment on table public.profiles is 'Private username mapping; passwords are managed only by Supabase Auth.';
comment on table public.homepages is 'Private draft. Saving it does not alter the published snapshot.';
comment on table public.assets is 'Server-verified Cloudinary metadata. No image binary data is stored here.';
comment on table public.published_homepages is 'Public snapshot containing only the selected, owned media URLs.';

notify pgrst, 'reload schema';
commit;

-- Expected output: four rows, all with rls_enabled = true.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles', 'homepages', 'published_homepages', 'assets')
order by c.relname;
