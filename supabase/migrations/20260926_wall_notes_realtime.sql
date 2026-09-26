begin;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wall_notes'
  ) then
    alter publication supabase_realtime add table public.wall_notes;
  end if;
end
$$;

commit;
