-- Create insights table
create table insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  platform text check (platform in ('youtube', 'shorts', 'instagram', 'twitter', 'other')),
  title text,
  user_points text not null,
  ai_insights jsonb default '[]',
  tags text[] default '{}',
  created_at timestamptz default now(),
  last_surfaced_at timestamptz default now(),
  surface_count int default 0
);

-- Enable RLS for insights
alter table insights enable row level security;

-- Policy for insights
create policy "Users can only access their own insights"
  on insights for all
  using (auth.uid() = user_id);

-- Create notification settings table
create table notification_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  enabled boolean default true,
  notify_time text default '08:00'
);

-- Enable RLS for notification settings
alter table notification_settings enable row level security;

-- Policy for notification settings
create policy "Users can only access their own settings"
  on notification_settings for all
  using (auth.uid() = user_id);
