drop table if exists reviews cascade;
drop table if exists notes cascade;
drop table if exists insight_items cascade;
drop table if exists insights cascade;
drop table if exists notification_settings cascade;

create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  source text,
  raw_input text,
  title text,
  thumbnail_url text,
  author text,
  duration_seconds int,
  tags text[] default '{}',
  status text not null default 'pending',
  error_message text,
  is_favorited boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_insights_user_id on insights(user_id);
create index idx_insights_status on insights(status);

create table insight_items (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references insights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  confidence numeric,
  order_index int not null default 0,
  saved boolean not null default true,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_insight_items_user_id on insight_items(user_id);
create index idx_insight_items_next_review on insight_items(next_review_at);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_item_id uuid not null references insight_items(id) on delete cascade,
  rating text not null,
  ease_factor_before numeric,
  ease_factor_after numeric,
  interval_before int,
  interval_after int,
  reviewed_at timestamptz not null default now()
);
create index idx_reviews_user_id on reviews(user_id);
create index idx_reviews_insight_item on reviews(insight_item_id);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_id uuid not null references insights(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_insights_updated_at before update on insights
for each row execute function set_updated_at();
create trigger trg_notes_updated_at before update on notes
for each row execute function set_updated_at();

alter table insights enable row level security;
alter table insight_items enable row level security;
alter table reviews enable row level security;
alter table notes enable row level security;

create policy "select own insights" on insights for select using (auth.uid() = user_id);
create policy "insert own insights" on insights for insert with check (auth.uid() = user_id);
create policy "update own insights" on insights for update using (auth.uid() = user_id);
create policy "delete own insights" on insights for delete using (auth.uid() = user_id);

create policy "select own insight_items" on insight_items for select using (auth.uid() = user_id);
create policy "insert own insight_items" on insight_items for insert with check (auth.uid() = user_id);
create policy "update own insight_items" on insight_items for update using (auth.uid() = user_id);
create policy "delete own insight_items" on insight_items for delete using (auth.uid() = user_id);

create policy "select own reviews" on reviews for select using (auth.uid() = user_id);
create policy "insert own reviews" on reviews for insert with check (auth.uid() = user_id);

create policy "select own notes" on notes for select using (auth.uid() = user_id);
create policy "insert own notes" on notes for insert with check (auth.uid() = user_id);
create policy "update own notes" on notes for update using (auth.uid() = user_id);
create policy "delete own notes" on notes for delete using (auth.uid() = user_id);
