-- Furfolio: stop treating an ordinary version conflict as a transient DB error.
-- Run separately in this project's SQL Editor. Safe to run more than once.
-- Keeps all existing data, ownership checks, grants, and the publication lock.
begin;
do $$
declare definition text;
begin
  definition := pg_catalog.pg_get_functiondef('furfolio_private.publish_homepage(uuid,integer)'::regprocedure);
  if position('draft_version_conflict' in definition) = 0 then
    raise exception 'Unexpected publish function; no changes applied';
  end if;
  execute replace(definition, '''40001''', '''PT409''');
end;
$$;
notify pgrst, 'reload schema';
commit;
select position('''PT409''' in pg_catalog.pg_get_functiondef('furfolio_private.publish_homepage(uuid,integer)'::regprocedure)) > 0
  as publish_conflict_fix_ok;
