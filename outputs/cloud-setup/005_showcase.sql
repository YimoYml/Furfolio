-- Furfolio 005: lightweight community showcase and owner-controlled listing.
-- Run as a NEW query after 001 / 002 / 003 / 004. No existing data is deleted.
-- Existing published homepages are included by default, per the product brief.
-- Safe to rerun: previously disabled choices are preserved.
begin;

alter table public.homepages add column if not exists show_in_showcase boolean not null default true;
alter table public.published_homepages add column if not exists show_in_showcase boolean not null default true;
grant update (show_in_showcase) on public.homepages to authenticated;
grant select (show_in_showcase) on public.published_homepages to anon;
create index if not exists published_homepages_showcase_idx
  on public.published_homepages (published_at desc, slug asc) where show_in_showcase;

-- Only tiny fields are projected by PostgreSQL: no full profile, media URLs,
-- image binaries, draft, account details, or per-homepage preview fetches.
create or replace function public.list_showcase(p_before timestamptz default null, p_after_slug text default null, p_limit integer default 25)
returns table (slug text, name text, english_name text, template_id text, primary_color text, accent_color text, published_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.slug,
    left(coalesce(nullif(btrim(p.config->'profile'->>'name'), ''), '朋友'), 18),
    left(coalesce(p.config->'profile'->>'englishName', ''), 24),
    p.config->'profile'->>'templateId',
    case when p.config->'profile'->'theme'->>'acid' ~ '^#[0-9a-fA-F]{6}$' then p.config->'profile'->'theme'->>'acid' else '#d5ec42' end,
    case when p.config->'profile'->'theme'->>'blue' ~ '^#[0-9a-fA-F]{6}$' then p.config->'profile'->'theme'->>'blue' else '#2949dd' end,
    p.published_at
  from public.published_homepages p
  where p.show_in_showcase and (p_before is null or p.published_at < p_before
    or (p.published_at = p_before and p.slug > coalesce(p_after_slug, '')))
  order by p.published_at desc, p.slug asc
  limit greatest(1, least(coalesce(p_limit, 25), 25));
$$;
revoke all on function public.list_showcase(timestamptz, text, integer) from public;
grant execute on function public.list_showcase(timestamptz, text, integer) to anon, authenticated;

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
  insert into public.published_homepages (homepage_id, owner_id, slug, config, version, published_at, show_in_showcase)
    values (page.id, actor, page.slug, result, page.version, now(), page.show_in_showcase)
    on conflict (homepage_id) do update set
      slug = excluded.slug, config = excluded.config, version = excluded.version, published_at = excluded.published_at, show_in_showcase = excluded.show_in_showcase;
  return jsonb_build_object('slug', page.slug, 'version', page.version, 'show_in_showcase', page.show_in_showcase);
end;
$$;
revoke all on function furfolio_private.publish_homepage(uuid, integer) from public, anon;
grant execute on function furfolio_private.publish_homepage(uuid, integer) to authenticated;



-- Changing the live listing preference never republishes a private draft.
-- Lock the same row as publication so concurrent changes remain atomic.
create or replace function furfolio_private.set_showcase_visibility(p_homepage_id uuid, p_visible boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  page public.homepages%rowtype;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_visible is null then raise exception 'invalid_showcase_visibility' using errcode = '22023'; end if;
  select * into page from public.homepages where id = p_homepage_id and owner_id = actor for update;
  if not found then raise exception 'homepage_not_found' using errcode = '42501'; end if;
  if page.show_in_showcase is distinct from p_visible then
    update public.homepages set show_in_showcase = p_visible where id = page.id returning * into page;
  end if;
  update public.published_homepages set show_in_showcase = p_visible where homepage_id = page.id and owner_id = actor;
  return jsonb_build_object('id',page.id,'slug',page.slug,'version',page.version,'updated_at',page.updated_at,'show_in_showcase',page.show_in_showcase);
end;
$$;
revoke all on function furfolio_private.set_showcase_visibility(uuid, boolean) from public, anon;
grant execute on function furfolio_private.set_showcase_visibility(uuid, boolean) to authenticated;
create or replace function public.set_showcase_visibility(p_homepage_id uuid, p_visible boolean)
returns jsonb language sql security invoker set search_path = '' as $$
  select furfolio_private.set_showcase_visibility(p_homepage_id,p_visible);
$$;
revoke all on function public.set_showcase_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_showcase_visibility(uuid, boolean) to authenticated;

comment on column public.homepages.show_in_showcase is 'Private publishing preference. Saving a draft does not change the public listing.';
comment on column public.published_homepages.show_in_showcase is 'Whether this published snapshot appears in the public showcase; direct homepage URL remains public.';
create or replace function public.furfolio_cloud_schema_version()
returns integer language sql security invoker set search_path = '' as $$ select 4; $$;
revoke all on function public.furfolio_cloud_schema_version() from public, anon, authenticated;
grant execute on function public.furfolio_cloud_schema_version() to service_role;
notify pgrst, 'reload schema';
commit;
select public.furfolio_cloud_schema_version() = 4 as showcase_ok;
