-- AI chat feedback — thumbs up/down on assistant responses
create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  message_id text not null,
  rating smallint not null check (rating in (-1, 1)),
  user_message text,
  assistant_message text,
  classified_intent text,
  created_at timestamptz not null default now()
);

-- Index for querying feedback by user and time
create index idx_ai_feedback_user_id on public.ai_feedback(user_id, created_at desc);

-- RLS: users can only see and insert their own feedback
alter table public.ai_feedback enable row level security;

create policy "Users can insert own feedback"
  on public.ai_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.ai_feedback for select
  using (auth.uid() = user_id);
