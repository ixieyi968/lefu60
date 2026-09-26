begin;

create extension if not exists pgcrypto;

create table if not exists public.wall_notes (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint wall_notes_author_length
    check (char_length(btrim(author)) between 1 and 40),
  constraint wall_notes_message_length
    check (char_length(btrim(message)) between 1 and 500)
);

create index if not exists wall_notes_created_idx
  on public.wall_notes (created_at desc);

alter table public.wall_notes enable row level security;

revoke all on table public.wall_notes from anon, authenticated;
grant select, insert on table public.wall_notes to anon, authenticated;

drop policy if exists "Public can read wall notes" on public.wall_notes;
create policy "Public can read wall notes"
  on public.wall_notes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can add wall notes" on public.wall_notes;
create policy "Public can add wall notes"
  on public.wall_notes
  for insert
  to anon, authenticated
  with check (true);

notify pgrst, 'reload schema';

commit;
