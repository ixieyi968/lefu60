begin;

create extension if not exists pgcrypto;

alter table public.photos
  add column if not exists is_pinned boolean not null default false;

update public.photos
set caption = '新上传的珍贵史料'
where caption is null or btrim(caption) = '';

alter table public.photos
  alter column caption set not null;

alter table public.photos
  drop constraint if exists photos_caption_length;

alter table public.photos
  add constraint photos_caption_length
  check (char_length(btrim(caption)) between 1 and 120);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint photo_comments_author_length
    check (char_length(btrim(author)) between 1 and 40),
  constraint photo_comments_body_length
    check (char_length(btrim(body)) between 1 and 500)
);

create index if not exists photo_comments_photo_created_idx
  on public.photo_comments (photo_id, created_at);

alter table public.photos enable row level security;
alter table public.photo_comments enable row level security;

revoke update, delete on table public.photos from anon, authenticated;
grant update (caption, is_pinned) on table public.photos to anon, authenticated;

drop policy if exists "Public can update photo metadata" on public.photos;
create policy "Public can update photo metadata"
  on public.photos
  for update
  to anon, authenticated
  using (true)
  with check (true);

revoke all on table public.photo_comments from anon, authenticated;
grant select, insert on table public.photo_comments to anon, authenticated;

drop policy if exists "Public can read photo comments" on public.photo_comments;
create policy "Public can read photo comments"
  on public.photo_comments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can add photo comments" on public.photo_comments;
create policy "Public can add photo comments"
  on public.photo_comments
  for insert
  to anon, authenticated
  with check (true);

notify pgrst, 'reload schema';

commit;
