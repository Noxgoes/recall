# Recall — Backend Implementation Plan

Stack: **Supabase** (Auth, Postgres, RLS) + **Groq** (`llama-3.3-70b-versatile`) + **React Query** (TanStack) + **Expo / React Native**

---

## 1. Database Schema (Supabase / Postgres)

### 1.1 `insights`
```sql
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  source text, -- 'youtube' | 'instagram' | 'tiktok' | 'x' | 'article'
  raw_input text, -- original pasted text/notes before AI processing
  title text,
  thumbnail_url text,
  author text,
  duration_seconds int,
  tags text[] default '{}',
  status text not null default 'pending', -- 'pending' | 'processing' | 'ready' | 'failed'
  error_message text, -- populated if Groq extraction fails
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_insights_user_id on insights(user_id);
create index idx_insights_status on insights(status);
```

### 1.2 `insight_items` (the actual extracted takeaways — one insight can have up to 5)
```sql
create table insight_items (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references insights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null, -- e.g. "Design your environment to make good habits easier."
  confidence numeric, -- 0.0–1.0, if you keep the % confidence shown in UI
  order_index int not null default 0,
  saved boolean not null default true, -- maps to the toggle in "Extract Insights" screen

  -- SM-2 spaced repetition fields live here since review happens per-item, not per-link
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,

  created_at timestamptz not null default now()
);

create index idx_insight_items_user_id on insight_items(user_id);
create index idx_insight_items_next_review on insight_items(next_review_at);
```

**Why split `insights` and `insight_items`?** Your UI reviews *individual takeaways* ("Small habits compound...", "Design your environment...") on independent schedules — not the whole saved link at once. If SM-2 fields live on `insights` only, every takeaway from one link would share one review schedule, which doesn't match the product.

### 1.3 `reviews` (historical log)
```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_item_id uuid not null references insight_items(id) on delete cascade,
  rating text not null, -- 'forgot' | 'good' | 'easy'
  ease_factor_before numeric,
  ease_factor_after numeric,
  interval_before int,
  interval_after int,
  reviewed_at timestamptz not null default now()
);

create index idx_reviews_user_id on reviews(user_id);
create index idx_reviews_insight_item on reviews(insight_item_id);
```

### 1.4 `notes`
```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_id uuid not null references insights(id) on delete cascade,
  content text not null, -- markdown
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 1.5 Auto-update `updated_at`
```sql
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_insights_updated_at
before update on insights
for each row execute function set_updated_at();

create trigger trg_notes_updated_at
before update on notes
for each row execute function set_updated_at();
```

---

## 2. Row-Level Security (RLS)

Enable RLS on every table, then add matching policies. This is the #1 source of "insights not showing up" bugs — get this exactly right.

```sql
alter table insights enable row level security;
alter table insight_items enable row level security;
alter table reviews enable row level security;
alter table notes enable row level security;

-- INSIGHTS
create policy "select own insights" on insights
  for select using (auth.uid() = user_id);
create policy "insert own insights" on insights
  for insert with check (auth.uid() = user_id);
create policy "update own insights" on insights
  for update using (auth.uid() = user_id);
create policy "delete own insights" on insights
  for delete using (auth.uid() = user_id);

-- INSIGHT_ITEMS
create policy "select own insight_items" on insight_items
  for select using (auth.uid() = user_id);
create policy "insert own insight_items" on insight_items
  for insert with check (auth.uid() = user_id);
create policy "update own insight_items" on insight_items
  for update using (auth.uid() = user_id);
create policy "delete own insight_items" on insight_items
  for delete using (auth.uid() = user_id);

-- REVIEWS
create policy "select own reviews" on reviews
  for select using (auth.uid() = user_id);
create policy "insert own reviews" on reviews
  for insert with check (auth.uid() = user_id);

-- NOTES
create policy "select own notes" on notes
  for select using (auth.uid() = user_id);
create policy "insert own notes" on notes
  for insert with check (auth.uid() = user_id);
create policy "update own notes" on notes
  for update using (auth.uid() = user_id);
create policy "delete own notes" on notes
  for delete using (auth.uid() = user_id);
```

**Critical rule:** every `insert()` call from the client MUST explicitly set `user_id: session.user.id` in the payload. RLS `with check` will silently reject inserts that omit it or set it wrong — and Supabase returns this as an `error` object, not a thrown exception, so it's easy to miss if you don't log `error` on every mutation.

---

## 3. AI Extraction Flow (Groq)

### 3.1 Correct response parsing
Groq's response wraps your JSON inside `choices[0].message.content` as a **string**, not a parsed object. Always parse defensively:

```ts
// lib/groq.ts
export async function extractInsights(url: string, userNotes?: string) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(url, userNotes) },
      ],
      response_format: { type: 'json_object' }, // forces valid JSON, removes markdown fences
      temperature: 0.3,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('GROQ ERROR', res.status, data);
    throw new Error(data?.error?.message || 'Groq request failed');
  }

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('Groq returned no content');

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    console.error('GROQ JSON PARSE FAILED', rawContent);
    throw new Error('Could not parse Groq response as JSON');
  }

  return {
    title: parsed.title as string,
    insights: parsed.insights as string[], // up to 5 strings
    tags: parsed.tags as string[],
  };
}
```

Use `response_format: { type: 'json_object' }` — this is a Groq/OpenAI-compatible parameter that forces the model to return clean JSON, eliminating the markdown-fence issue entirely rather than stripping it after the fact.

### 3.2 Save flow (end-to-end)
```
1. User pastes URL → insert into `insights` with status='pending'
2. Call extractInsights(url, notes)
3. On success:
   - update insights row: title, tags, status='ready'
   - bulk insert into insight_items (one row per string in insights[])
     each with next_review_at = now() (so it's immediately due, or now() + 1 day if you want a grace period)
4. On failure:
   - update insights row: status='failed', error_message=<caught error>
   - surface a retry action in the UI (don't just fail silently)
5. Invalidate React Query cache for ['insights', userId] and ['insight_items', userId]
```

### 3.3 Suggested system prompt structure
Keep the schema instruction explicit and constrained — this reduces malformed JSON and keeps insights short enough for the "bite-sized" UI cards:

```
You are an insight extraction engine. Given a URL and optional user notes,
return ONLY a JSON object with this exact shape:
{
  "title": string (max 60 chars),
  "insights": string[] (2 to 5 items, each starting with an action verb, max 100 chars each),
  "tags": string[] (1 to 3 single-word categories, e.g. "Mindset", "Focus", "Coding")
}
Do not include markdown, code fences, or any text outside the JSON object.
```

---

## 4. Spaced Repetition (SM-2) — `lib/spaced-repetition.ts`

```ts
type Rating = 'forgot' | 'good' | 'easy';

interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

const RATING_QUALITY: Record<Rating, number> = {
  forgot: 2,
  good: 4,
  easy: 5,
};

export function calculateNextReview(state: SM2State, rating: Rating): SM2State & { nextReviewAt: Date } {
  const q = RATING_QUALITY[rating];
  let { easeFactor, intervalDays, repetitions } = state;

  if (q < 3) {
    // "forgot" resets progress but keeps ease_factor from dropping below floor
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return { easeFactor, intervalDays, repetitions, nextReviewAt };
}
```

### Review submission flow
```
1. User rates an insight_item (forgot/good/easy) on Review screen
2. Read current { ease_factor, interval_days, repetitions } from insight_items
3. Call calculateNextReview()
4. Update insight_items row: new ease_factor, interval_days, repetitions,
   next_review_at, last_reviewed_at = now()
5. Insert a row into `reviews` (audit log — also powers streak/stats calculations)
6. Invalidate ['insight_items', userId] and ['reviews', userId] queries
```

---

## 5. React Query Layer

### 5.1 Consistent query key structure (avoid the #1 stale-cache bug)
```ts
export const queryKeys = {
  insights: (userId: string) => ['insights', userId] as const,
  insightItems: (userId: string) => ['insight_items', userId] as const,
  dueReviews: (userId: string) => ['insight_items', userId, 'due'] as const,
  reviews: (userId: string) => ['reviews', userId] as const,
  stats: (userId: string) => ['stats', userId] as const,
};
```
Every `useQuery` and every `invalidateQueries` call must use these exact factory functions — never hand-type the array literal inline, since a mismatched key (`['insights']` vs `['insights', userId]`) means invalidation silently does nothing.

### 5.2 Example: saving a link (mutation)
```ts
export function useSaveLink() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ url, notes }: { url: string; notes?: string }) => {
      const userId = session!.user.id;

      const { data: insight, error: insertErr } = await supabase
        .from('insights')
        .insert({ user_id: userId, url, raw_input: notes, status: 'pending' })
        .select()
        .single();
      if (insertErr) throw insertErr;

      try {
        const extracted = await extractInsights(url, notes);

        await supabase.from('insights')
          .update({ title: extracted.title, tags: extracted.tags, status: 'ready' })
          .eq('id', insight.id);

        const items = extracted.insights.map((content, i) => ({
          insight_id: insight.id,
          user_id: userId,
          content,
          order_index: i,
        }));
        const { error: itemsErr } = await supabase.from('insight_items').insert(items);
        if (itemsErr) throw itemsErr;

      } catch (e: any) {
        await supabase.from('insights')
          .update({ status: 'failed', error_message: e.message })
          .eq('id', insight.id);
        throw e;
      }

      return insight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(session!.user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.insightItems(session!.user.id) });
    },
  });
}
```

### 5.3 Example: fetching due reviews (Home screen "Today's Recall")
```ts
export function useDueReviews() {
  const { session } = useAuth();
  const userId = session!.user.id;

  return useQuery({
    queryKey: queryKeys.dueReviews(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insight_items')
        .select('*, insights(title, source, author, url)')
        .eq('user_id', userId)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

### 5.4 Pull-to-refresh
```ts
const { refetch, isRefetching } = useDueReviews();
<RefreshControl refreshing={isRefetching} onRefresh={refetch} />
```

---

## 6. Derived Stats (for "Learning Progress" cards)

Don't store `day_streak`, `insights_saved`, `reviews_completed`, `memory_score` as separate mutable columns — derive them from `reviews` and `insights` to avoid drift/bugs. Options:

**A. Compute client-side** from already-fetched `reviews` + `insights` data (fine at low scale).

**B. Postgres view** (recommended once you have real usage):
```sql
create view user_stats as
select
  user_id,
  count(distinct date_trunc('day', reviewed_at)) filter (
    where reviewed_at > now() - interval '1 year'
  ) as active_days,
  count(*) as total_reviews,
  (select count(*) from insights i where i.user_id = r.user_id) as insights_saved
from reviews r
group by user_id;
```
Streak specifically needs a bit more logic (consecutive days ending today/yesterday) — best done as a small Postgres function or computed in a Supabase Edge Function if it gets complex.

**Memory Score** — suggest deriving as: `avg(ease_factor across insight_items) normalized to 0–100%`, or `% of reviews rated 'good'/'easy' vs 'forgot'` over a rolling window. Either is defensible; pick one and document it, since it's a UI number users will scrutinize.

---

## 7. Error-Handling Checklist (fixes the exact bug you just hit + prevents the next ones)

- [ ] Every Supabase call destructures and **checks `error`**, never just `data`
- [ ] Every Groq call checks `res.ok` before touching `data.choices`
- [ ] Groq JSON parsing wrapped in try/catch with the raw string logged on failure
- [ ] `insights.status` field used to drive UI (show spinner on `pending`, retry button on `failed`) instead of assuming success
- [ ] All `user_id` fields explicitly set on insert — never rely on a default
- [ ] React Query keys centralized in one `queryKeys` object, never inline literals
- [ ] `onError` handlers on every mutation surface a toast/alert — no silent failures

---

## 8. Suggested Build Order

1. Schema + RLS (Section 1–2) — get this right first, everything depends on it
2. Groq extraction with `response_format: json_object` (Section 3) — test in isolation with `console.log` before wiring to UI
3. Save-link mutation end-to-end (Section 5.2)
4. Home screen due-reviews query (Section 5.3)
5. SM-2 review submission (Section 4)
6. Stats view (Section 6) — last, since it depends on real review data existing

---

Want me to also generate the actual Supabase migration file (`.sql`) ready to run via `supabase db push`, or scaffold the `lib/groq.ts` / `lib/spaced-repetition.ts` files as complete, drop-in code?