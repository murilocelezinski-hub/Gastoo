import { supabase } from './supabaseClient';

// ── Transactions ─────────────────────────────────────────────────────────────

export async function upsertTransaction(tx, userId) {
  const { error } = await supabase.from('transactions').upsert({
    id: tx.id,
    user_id: userId,
    data: tx,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[sync] upsertTransaction:', error.message);
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) console.warn('[sync] deleteTransaction:', error.message);
}

export async function fetchTransactions(userId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('data')
    .eq('user_id', userId);
  if (error) { console.warn('[sync] fetchTransactions:', error.message); return []; }
  return data.map((r) => r.data);
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function upsertAccount(account, userId) {
  const { error } = await supabase.from('accounts').upsert({
    id: account.id,
    user_id: userId,
    data: account,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[sync] upsertAccount:', error.message);
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) console.warn('[sync] deleteAccount:', error.message);
}

export async function fetchAccounts(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .select('data')
    .eq('user_id', userId);
  if (error) { console.warn('[sync] fetchAccounts:', error.message); return []; }
  return data.map((r) => r.data);
}

// ── Credit Cards ──────────────────────────────────────────────────────────────

export async function upsertCreditCard(card, userId) {
  const { error } = await supabase.from('credit_cards').upsert({
    id: card.id,
    user_id: userId,
    data: card,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[sync] upsertCreditCard:', error.message);
}

export async function deleteCreditCard(id) {
  const { error } = await supabase.from('credit_cards').delete().eq('id', id);
  if (error) console.warn('[sync] deleteCreditCard:', error.message);
}

export async function fetchCreditCards(userId) {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('data')
    .eq('user_id', userId);
  if (error) { console.warn('[sync] fetchCreditCards:', error.message); return []; }
  return data.map((r) => r.data);
}

// ── User Preferences ──────────────────────────────────────────────────────────

export async function upsertPreferences(prefs, userId) {
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    data: prefs,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[sync] upsertPreferences:', error.message);
}

export async function fetchPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn('[sync] fetchPreferences:', error.message); return null; }
  return data?.data ?? null;
}

// ── Bulk upload (migração local → nuvem) ──────────────────────────────────────

export async function migrateLocalToSupabase({ accounts, transactions, creditCards }, userId) {
  const now = new Date().toISOString();

  const accRows = accounts.map((a) => ({ id: a.id, user_id: userId, data: a, updated_at: now }));
  const txRows = transactions.map((t) => ({ id: t.id, user_id: userId, data: t, updated_at: now }));
  const cardRows = creditCards.map((c) => ({ id: c.id, user_id: userId, data: c, updated_at: now }));

  const results = await Promise.allSettled([
    accRows.length ? supabase.from('accounts').upsert(accRows) : Promise.resolve(),
    txRows.length ? supabase.from('transactions').upsert(txRows) : Promise.resolve(),
    cardRows.length ? supabase.from('credit_cards').upsert(cardRows) : Promise.resolve(),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected' || r.value?.error) {
      console.warn(`[migrate] tabela ${i} falhou:`, r.reason || r.value?.error?.message);
    }
  });
}
