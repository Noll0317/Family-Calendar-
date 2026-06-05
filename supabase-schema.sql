create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('Chris','Sam','Taylor','Aiden','Family')),
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

-- Simple family app policy. Anyone with your anon key can read/write.
-- Keep the app link private. Later we can add real logins.
create policy "family can read events" on public.events for select using (true);
create policy "family can add events" on public.events for insert with check (true);
create policy "family can update events" on public.events for update using (true);
create policy "family can delete events" on public.events for delete using (true);
