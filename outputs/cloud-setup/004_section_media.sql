-- Furfolio: publish independent About and interest-detail images.
-- Run separately after 001 / 002 / 003 in the existing project's SQL Editor.
-- Only updates functions; no tables or existing data are deleted. Safe to rerun.
begin;

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


create or replace function public.furfolio_cloud_schema_version()
returns integer language sql security invoker set search_path = '' as $$ select 3; $$;
revoke all on function public.furfolio_cloud_schema_version() from public, anon, authenticated;
grant execute on function public.furfolio_cloud_schema_version() to service_role;

notify pgrst, 'reload schema';
commit;
select public.furfolio_cloud_schema_version() = 3 as section_media_ok;
