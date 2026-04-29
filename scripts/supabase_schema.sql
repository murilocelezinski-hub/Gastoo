-- ============================================================
-- GA$TOO — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ── accounts ────────────────────────────────────────────────
create table if not exists accounts (
  id          text primary key,
  user_id     uuid references auth.users on delete cascade not null,
  data        jsonb not null,
  updated_at  timestamptz default now()
);
alter table accounts enable row level security;
create policy "accounts: user owns" on accounts
  for all using (auth.uid() = user_id);

-- ── transactions ─────────────────────────────────────────────
create table if not exists transactions (
  id          text primary key,
  user_id     uuid references auth.users on delete cascade not null,
  data        jsonb not null,
  updated_at  timestamptz default now()
);
alter table transactions enable row level security;
create policy "transactions: user owns" on transactions
  for all using (auth.uid() = user_id);

-- ── credit_cards ─────────────────────────────────────────────
create table if not exists credit_cards (
  id          text primary key,
  user_id     uuid references auth.users on delete cascade not null,
  data        jsonb not null,
  updated_at  timestamptz default now()
);
alter table credit_cards enable row level security;
create policy "credit_cards: user owns" on credit_cards
  for all using (auth.uid() = user_id);

-- ── user_preferences ─────────────────────────────────────────
create table if not exists user_preferences (
  user_id     uuid primary key references auth.users on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz default now()
);
alter table user_preferences enable row level security;
create policy "user_preferences: user owns" on user_preferences
  for all using (auth.uid() = user_id);

-- ── índices para performance ──────────────────────────────────
create index if not exists idx_transactions_user_id  on transactions(user_id);
create index if not exists idx_accounts_user_id      on accounts(user_id);
create index if not exists idx_credit_cards_user_id  on credit_cards(user_id);
