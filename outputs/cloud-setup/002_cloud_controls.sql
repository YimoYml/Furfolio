-- Furfolio: limits, upload reservations, and one-time account recovery.
-- Run after 001_initial_schema.sql in the same project's SQL Editor.
-- Only service_role can call these RPCs; browser users cannot access the tables.
begin;
grant usage on schema furfolio_private to service_role;

create table if not exists furfolio_private.rate_buckets (
  key text primary key,
  starts_at bigint not null,
  expires_at timestamptz not null,
  hits integer not null
);
create index if not exists rate_buckets_expiry_idx on furfolio_private.rate_buckets(expires_at);
create table if not exists furfolio_private.upload_tickets (
  asset_id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  issued_at bigint not null,
  expires_at timestamptz not null,
  completed boolean not null default false
);
create index if not exists upload_tickets_owner_idx on furfolio_private.upload_tickets(owner_id);
create table if not exists furfolio_private.recovery_codes (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  claim_id uuid,
  claimed_at timestamptz
);
alter table furfolio_private.rate_buckets enable row level security;
alter table furfolio_private.upload_tickets enable row level security;
alter table furfolio_private.recovery_codes enable row level security;
revoke all on furfolio_private.rate_buckets, furfolio_private.upload_tickets, furfolio_private.recovery_codes from public, anon, authenticated;

create or replace function furfolio_private.consume_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  period bigint;
  count_hits integer;
begin
  if length(p_key) not between 1 and 200 or p_limit not between 1 and 10000 or p_seconds not between 30 and 2678400 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  period := floor(extract(epoch from now()) / p_seconds)::bigint * p_seconds;
  delete from furfolio_private.rate_buckets where expires_at < now();
  insert into furfolio_private.rate_buckets(key, starts_at, expires_at, hits)
    values (p_key, period, to_timestamp(period + p_seconds), 1)
    on conflict (key) do update set starts_at = excluded.starts_at, expires_at = excluded.expires_at,
      hits = case when rate_buckets.starts_at = excluded.starts_at then least(rate_buckets.hits + 1, p_limit + 1) else 1 end
    returning hits into count_hits;
  return count_hits <= p_limit;
end;
$$;

create or replace function furfolio_private.reserve_upload(p_owner uuid, p_asset uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ticket furfolio_private.upload_tickets%rowtype;
  active_count integer;
  active_bytes bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 1));
  select * into ticket from furfolio_private.upload_tickets where asset_id = p_asset for update;
  if found then
    if ticket.owner_id <> p_owner then raise exception 'asset_not_owned' using errcode = '42501'; end if;
    if ticket.completed then raise exception 'asset_already_uploaded' using errcode = '22023'; end if;
    if ticket.expires_at > now() then
      return jsonb_build_object('assetId', p_asset, 'timestamp', ticket.issued_at);
    end if;
    -- Never renew a used identity: old signed requests can remain valid for an hour.
    raise exception 'upload_ticket_expired' using errcode = '22023';
  end if;
  select count(*)::integer, coalesce(sum(bytes),0) into active_count, active_bytes
    from public.assets where owner_id = p_owner;
  active_count := active_count + (select count(*)::integer from furfolio_private.upload_tickets
    where owner_id = p_owner and not completed and expires_at > now());
  if active_count >= 24 or active_bytes >= 33554432 then
    raise exception 'account_image_quota' using errcode = '54000';
  end if;
  if not furfolio_private.consume_limit('upload-user-hour:' || p_owner, 24, 3600)
    or not furfolio_private.consume_limit('upload-global-day', 150, 86400)
    or not furfolio_private.consume_limit('upload-global-month', 500, 2678400) then
    -- Return a denial rather than raise so the rate counters commit.
    return jsonb_build_object('denied', true);
  end if;
  insert into furfolio_private.upload_tickets(asset_id, owner_id, issued_at, expires_at)
    values (p_asset, p_owner, floor(extract(epoch from now()))::bigint, now() + interval '90 minutes')
    returning * into ticket;
  return jsonb_build_object('assetId', p_asset, 'timestamp', ticket.issued_at);
end;
$$;

create or replace function furfolio_private.upload_ticket(p_owner uuid, p_asset uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('assetId', asset_id, 'timestamp', issued_at, 'completed', completed)
  from furfolio_private.upload_tickets where asset_id = p_asset and owner_id = p_owner;
$$;

create or replace function furfolio_private.finish_upload(p_owner uuid, p_asset uuid, p_metadata jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  asset public.assets%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 1));
  if not exists (select 1 from furfolio_private.upload_tickets where asset_id = p_asset and owner_id = p_owner) then
    raise exception 'asset_not_owned' using errcode = '42501';
  end if;
  if (p_metadata->>'bytes')::integer > 3145728 then raise exception 'image_too_large' using errcode = '22023'; end if;
  insert into public.assets(id, owner_id, public_id, secure_url, format, bytes, width, height)
    values (p_asset, p_owner, 'furfolio/' || p_owner::text || '/' || p_asset::text,
      p_metadata->>'secure_url', p_metadata->>'format', (p_metadata->>'bytes')::integer,
      (p_metadata->>'width')::integer, (p_metadata->>'height')::integer)
    on conflict (id) do nothing;
  select * into asset from public.assets where id = p_asset and owner_id = p_owner;
  if not found then raise exception 'asset_not_owned' using errcode = '42501'; end if;
  update furfolio_private.upload_tickets set completed = true where asset_id = p_asset;
  return to_jsonb(asset);
end;
$$;

create or replace function furfolio_private.set_recovery(p_owner uuid, p_hash text)
returns void language sql security definer set search_path = '' as $$
  insert into furfolio_private.recovery_codes(owner_id, code_hash) values (p_owner, p_hash)
  on conflict (owner_id) do update set code_hash = excluded.code_hash, claim_id = null, claimed_at = null;
$$;
create or replace function furfolio_private.claim_recovery(p_username text, p_hash text, p_claim uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  update furfolio_private.recovery_codes c set claim_id = p_claim, claimed_at = now()
    from public.profiles p where p.id = c.owner_id and p.username = p_username and c.code_hash = p_hash
      and (c.claim_id is null or c.claimed_at < now() - interval '20 minutes')
    returning c.owner_id into actor;
  return actor;
end;
$$;
create or replace function furfolio_private.release_recovery(p_owner uuid, p_claim uuid)
returns void language sql security definer set search_path = '' as $$
  update furfolio_private.recovery_codes set claim_id = null, claimed_at = null where owner_id = p_owner and claim_id = p_claim;
$$;
create or replace function furfolio_private.finish_recovery(p_owner uuid, p_claim uuid, p_new_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update furfolio_private.recovery_codes set code_hash = p_new_hash, claim_id = null, claimed_at = null
    where owner_id = p_owner and claim_id = p_claim;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

-- Public functions are invoker wrappers. Their privileged implementations live
-- in a schema which must not be added to Supabase's Exposed schemas.
create or replace function public.furfolio_consume_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language sql security invoker set search_path = '' as $$ select furfolio_private.consume_limit(p_key,p_limit,p_seconds); $$;
create or replace function public.furfolio_reserve_upload(p_owner uuid, p_asset uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select furfolio_private.reserve_upload(p_owner,p_asset); $$;
create or replace function public.furfolio_upload_ticket(p_owner uuid, p_asset uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select furfolio_private.upload_ticket(p_owner,p_asset); $$;
create or replace function public.furfolio_finish_upload(p_owner uuid, p_asset uuid, p_metadata jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select furfolio_private.finish_upload(p_owner,p_asset,p_metadata); $$;
create or replace function public.furfolio_set_recovery(p_owner uuid, p_hash text)
returns void language sql security invoker set search_path = '' as $$ select furfolio_private.set_recovery(p_owner,p_hash); $$;
create or replace function public.furfolio_claim_recovery(p_username text, p_hash text, p_claim uuid)
returns uuid language sql security invoker set search_path = '' as $$ select furfolio_private.claim_recovery(p_username,p_hash,p_claim); $$;
create or replace function public.furfolio_release_recovery(p_owner uuid, p_claim uuid)
returns void language sql security invoker set search_path = '' as $$ select furfolio_private.release_recovery(p_owner,p_claim); $$;
create or replace function public.furfolio_finish_recovery(p_owner uuid, p_claim uuid, p_new_hash text)
returns boolean language sql security invoker set search_path = '' as $$ select furfolio_private.finish_recovery(p_owner,p_claim,p_new_hash); $$;
create or replace function public.furfolio_cloud_schema_version()
returns integer language sql security invoker set search_path = '' as $$ select 2; $$;

do $$ declare func record;
begin
  for func in select p.oid::regprocedure as signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='public' and p.proname like 'furfolio_%')
      or (n.nspname='furfolio_private' and p.proname in ('consume_limit','reserve_upload','upload_ticket','finish_upload','set_recovery','claim_recovery','release_recovery','finish_recovery'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', func.signature);
    execute format('grant execute on function %s to service_role', func.signature);
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
select public.furfolio_cloud_schema_version() as cloud_schema_version;
