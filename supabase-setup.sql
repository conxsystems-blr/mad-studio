-- MAD Studio: run this once in Supabase → SQL Editor → New query → Run.
-- One table holds every record (settings, quotes, invoices, batches) for the signed-in user.

create table if not exists public.mad_records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  kind       text        not null,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Only you can read and write your own rows.
alter table public.mad_records enable row level security;

drop policy if exists "Own records only" on public.mad_records;
create policy "Own records only" on public.mad_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
