import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { secureGet, secureSet, secureRemove } from '../services/secureStorage';
import { addPeriod, fmtDate } from '../utils/recurrence';
import { parseBrDate } from '../utils/chart';
import {
  upsertAccount, deleteAccount as syncDeleteAccount, fetchAccounts,
  upsertCreditCard, deleteCreditCard as syncDeleteCreditCard, fetchCreditCards,
  upsertTransaction, deleteTransaction as syncDeleteTransaction, fetchTransactions,
  migrateLocalToSupabase,
} from '../services/supabaseSync';
import { supabase } from '../services/supabaseClient';

const STORAGE_KEY = '@gastoo_finance_v2';

export const DEFAULT_ACCOUNT_ID = 'acc-seed-default';
export const ACC_SEED_POUP = 'acc-seed-poup';
const CARD_SEED_DEMO = 'card-seed-demo';

/**
 * Lançamento já "vale" no calendário para saldo de caixa: data (DD/MM/AAAA) <= dia de referência.
 * Datas inválidas são tratadas como já efetivas.
 */
export function isTransactionEffectiveOnOrBefore(tx, asOf = new Date()) {
  if (!tx?.data) return true;
  const tDate = parseBrDate(tx.data);
  if (!tDate || Number.isNaN(tDate.getTime())) return true;
  const tDay = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
  const a = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return tDay.getTime() <= a.getTime();
}

function addMonths(d, months) {
  const dt = new Date(d.getFullYear(), d.getMonth(), 1);
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

function addDays(d, days) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function formatBrDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function getInstallmentDates(startDate, periodo, numInstallments) {
  const dates = [];
  let current = new Date(startDate);

  const periodDays = {
    diaria: 1,
    semanal: 7,
    quinzenal: 14,
    mensal: 30,
    bimensal: 60,
    trimestral: 90,
    semestral: 180,
    anual: 365,
  };

  const days = periodDays[periodo] || 30;

  for (let i = 0; i < numInstallments; i++) {
    dates.push(new Date(current));
    current = addDays(current, days);
  }

  return dates;
}

export function invoiceKeyFromDateAndCloseDay(dateObj, closeDay) {
  if (!dateObj || !(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  const cd = Math.min(31, Math.max(1, parseInt(closeDay, 10) || 10));
  const base = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  const invoiceMonth = dateObj.getDate() > cd ? addMonths(base, 1) : base;
  const y = invoiceMonth.getFullYear();
  const m = String(invoiceMonth.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // YYYY-MM
}

export function invoiceLabelPtBr(invoiceKey) {
  if (!invoiceKey) return '—';
  const m = String(invoiceKey).match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(invoiceKey);
  const yy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return `${monthNames[Math.max(1, Math.min(12, mm)) - 1]} ${yy}`;
}

function splitInstallmentAmounts(total, n) {
  const safe = Math.max(0, Number(total) || 0);
  const ni = Math.max(1, Math.min(365, n));
  const cents = Math.round(safe * 100);
  if (cents === 0) {
    return Array(ni).fill(0);
  }
  const base = Math.floor(cents / ni);
  const parts = [];
  let acc = 0;
  for (let i = 0; i < ni - 1; i++) {
    parts.push(base / 100);
    acc += base;
  }
  parts.push((cents - acc) / 100);
  return parts;
}

function ensureInvoiceFieldsForTx(tx, creditCards) {
  const hasCard = tx && tx.creditCardId;
  if (!hasCard) {
    // se não é cartão, não persiste fatura
    if (tx?.invoiceKey || tx?.invoiceKeyManual) {
      const { invoiceKey, invoiceKeyManual, ...rest } = tx;
      return rest;
    }
    return tx;
  }
  const card = creditCards.find((c) => String(c.id) === String(tx.creditCardId));
  const dateObj = parseBrDate(tx.data);
  const computed = invoiceKeyFromDateAndCloseDay(dateObj || new Date(), card?.diaFechamento ?? 10);

  if (tx.invoiceKey) {
    // Se o dado veio legado (invoiceKey existe, mas invoiceKeyManual não),
    // inferimos: se bate com o cálculo, então é "auto"; se diverge, foi "fixado".
    if (tx.invoiceKeyManual === undefined || tx.invoiceKeyManual === null) {
      return { ...tx, invoiceKeyManual: tx.invoiceKey === computed ? false : true };
    }
    return { ...tx, invoiceKeyManual: Boolean(tx.invoiceKeyManual) };
  }
  return { ...tx, invoiceKey: computed, invoiceKeyManual: false };
}

function seedAccounts() {
  return [
    { id: DEFAULT_ACCOUNT_ID, name: 'Conta Corrente', icon: 'Bank', saldoInicial: 4100, archived: false },
    { id: ACC_SEED_POUP, name: 'Poupança', icon: 'PiggyBank', saldoInicial: 1200, archived: false },
  ];
}

/** Lançamentos de demonstração (~3 meses): receitas, despesas, transferências e cartão. */
function buildDemoSeedTransactions() {
  const a1 = DEFAULT_ACCOUNT_ID;
  const a2 = ACC_SEED_POUP;
  const card = CARD_SEED_DEMO;
  let nid = 1;
  const t = (tx) => ({ ...tx, id: nid++, obs: tx.obs ?? '', creditCardId: tx.creditCardId ?? null });
  const out = [];

  // Janeiro
  const trf1 = 'trf-seed-1';
  out.push(t({ tipo: 'entrada', valor: 3800, descricao: 'Salário jan.', categoria: 'Outros', data: '05/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 1200, descricao: 'Aluguel', categoria: 'Moradia', data: '05/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 185, descricao: 'Conta de luz', categoria: 'Moradia', data: '07/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 340, descricao: 'Supermercado Extra', categoria: 'Alimentação', data: '08/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 128, descricao: 'Passagem de ônibus (mensal)', categoria: 'Transporte', data: '09/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 37.9, descricao: 'Netflix + Spotify', categoria: 'Assinaturas', data: '10/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 95, descricao: 'Farmácia Pague Menos', categoria: 'Saúde', data: '13/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 89, descricao: 'iFood — jantar', categoria: 'Alimentação', data: '15/01/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 210, descricao: 'Calça jeans e camisetas', categoria: 'Vestuário', data: '18/01/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 60, descricao: 'Cinema com namorada', categoria: 'Lazer', data: '20/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 199, descricao: 'Curso de Excel online', categoria: 'Educação', data: '22/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 200, descricao: 'Tesouro Direto', categoria: 'Investimentos', data: '23/01/2026', accountId: a1 }));
  out.push(
    t({ tipo: 'saída', valor: 400, descricao: '→ Poupança', categoria: 'Transferência', data: '25/01/2026', accountId: a1, isTransfer: true, transferGroupId: trf1 })
  );
  out.push(
    t({ tipo: 'entrada', valor: 400, descricao: '← Conta Corrente', categoria: 'Transferência', data: '25/01/2026', accountId: a2, isTransfer: true, transferGroupId: trf1 })
  );
  out.push(t({ tipo: 'entrada', valor: 300, descricao: 'Bico fim de semana', categoria: 'Outros', data: '29/01/2026', accountId: a1 }));

  // Fevereiro
  const trf2 = 'trf-seed-2';
  out.push(t({ tipo: 'entrada', valor: 3800, descricao: 'Salário fev.', categoria: 'Outros', data: '05/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 1200, descricao: 'Aluguel', categoria: 'Moradia', data: '05/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 95, descricao: 'Conta de água', categoria: 'Moradia', data: '07/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 290, descricao: 'Mercado Livre — compras', categoria: 'Vestuário', data: '08/02/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 265, descricao: 'Feira livre e padaria', categoria: 'Alimentação', data: '10/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 80, descricao: 'Uber (semana)', categoria: 'Transporte', data: '12/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 150, descricao: 'Consulta médica particular', categoria: 'Saúde', data: '14/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 120, descricao: 'Churrasco carnaval', categoria: 'Alimentação', data: '16/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 85, descricao: 'Show de pagode', categoria: 'Lazer', data: '17/02/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 37.9, descricao: 'Netflix + Spotify', categoria: 'Assinaturas', data: '10/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 200, descricao: 'Tesouro Direto', categoria: 'Investimentos', data: '20/02/2026', accountId: a1 }));
  out.push(
    t({ tipo: 'saída', valor: 300, descricao: '→ Poupança', categoria: 'Transferência', data: '22/02/2026', accountId: a1, isTransfer: true, transferGroupId: trf2 })
  );
  out.push(
    t({ tipo: 'entrada', valor: 300, descricao: '← Conta Corrente', categoria: 'Transferência', data: '22/02/2026', accountId: a2, isTransfer: true, transferGroupId: trf2 })
  );
  out.push(t({ tipo: 'entrada', valor: 450, descricao: '13º proporcional', categoria: 'Outros', data: '27/02/2026', accountId: a1 }));

  // Março
  const trf3 = 'trf-seed-3';
  out.push(t({ tipo: 'entrada', valor: 3800, descricao: 'Salário mar.', categoria: 'Outros', data: '05/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 1200, descricao: 'Aluguel', categoria: 'Moradia', data: '05/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 210, descricao: 'Conta de luz', categoria: 'Moradia', data: '07/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 380, descricao: 'Atacadão — compras do mês', categoria: 'Alimentação', data: '08/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 128, descricao: 'Passagem de ônibus (mensal)', categoria: 'Transporte', data: '09/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 37.9, descricao: 'Netflix + Spotify', categoria: 'Assinaturas', data: '10/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 280, descricao: 'Material escolar filhos', categoria: 'Educação', data: '12/03/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 75, descricao: 'Remédio pressão (3 meses)', categoria: 'Saúde', data: '14/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 160, descricao: 'Tênis esportivo', categoria: 'Vestuário', data: '17/03/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 95, descricao: 'Passeio no parque + lanche', categoria: 'Lazer', data: '21/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 200, descricao: 'Tesouro Direto', categoria: 'Investimentos', data: '22/03/2026', accountId: a1 }));
  out.push(
    t({ tipo: 'saída', valor: 500, descricao: '→ Poupança', categoria: 'Transferência', data: '24/03/2026', accountId: a1, isTransfer: true, transferGroupId: trf3 })
  );
  out.push(
    t({ tipo: 'entrada', valor: 500, descricao: '← Conta Corrente', categoria: 'Transferência', data: '24/03/2026', accountId: a2, isTransfer: true, transferGroupId: trf3 })
  );
  out.push(t({ tipo: 'entrada', valor: 280, descricao: 'Venda de artesanato', categoria: 'Outros', data: '28/03/2026', accountId: a1 }));

  // Abril (mês atual)
  out.push(t({ tipo: 'entrada', valor: 3800, descricao: 'Salário abr.', categoria: 'Outros', data: '05/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 1200, descricao: 'Aluguel', categoria: 'Moradia', data: '05/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 320, descricao: 'Supermercado Pão de Açúcar', categoria: 'Alimentação', data: '06/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 128, descricao: 'Passagem de ônibus (mensal)', categoria: 'Transporte', data: '07/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 37.9, descricao: 'Netflix + Spotify', categoria: 'Assinaturas', data: '08/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 110, descricao: 'iFood — almoço semana', categoria: 'Alimentação', data: '10/04/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 45, descricao: 'Farmácia — vitaminas', categoria: 'Saúde', data: '12/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 240, descricao: 'Roupa de trabalho', categoria: 'Vestuário', data: '14/04/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 130, descricao: 'Aniversário — jantar família', categoria: 'Lazer', data: '17/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 59.9, descricao: 'Livro didático', categoria: 'Educação', data: '20/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 200, descricao: 'Tesouro Direto', categoria: 'Investimentos', data: '22/04/2026', accountId: a1 }));

  // Receitas extras abril (gráfico de relatórios)
  out.push(t({ tipo: 'entrada', valor: 180, descricao: 'Rendimento poupança', categoria: 'Investimentos', data: '01/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 120, descricao: 'Reembolso plano de saúde', categoria: 'Saúde', data: '04/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 350, descricao: 'Freela — logo de amigo', categoria: 'Outros', data: '09/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 128, descricao: 'Reembolso VT empresa', categoria: 'Transporte', data: '10/04/2026', accountId: a1 }));

  return out;
}

function seedTransactions() {
  return buildDemoSeedTransactions();
}

/** Cartão de demonstração para testes (aba Cartões). */
function seedCreditCards() {
  return [
    {
      id: CARD_SEED_DEMO,
      name: 'Cartão 1',
      icon: 'CreditCard',
      limite: 10000,
      diaFechamento: 5,
      diaVencimento: 10,
      accountId: DEFAULT_ACCOUNT_ID,
      archived: false,
    },
  ];
}

function migrateTransactions(transactions, accounts) {
  return transactions.map((t) => {
    if (t.accountId) return t;
    const match = accounts.find((a) => a.name === t.conta);
    return { ...t, accountId: match?.id || DEFAULT_ACCOUNT_ID };
  });
}

function migrateLoaded(parsed) {
  const accRaw = parsed.accounts?.length ? parsed.accounts : seedAccounts();
  const accounts = accRaw.map((a) => ({
    ...a,
    archived: Boolean(a.archived),
    saldoInicial: Number(a.saldoInicial) || 0,
  }));
  let txs = parsed.transactions?.length ? parsed.transactions : seedTransactions();
  txs = migrateTransactions(txs, accounts);
  const cardsSource =
    parsed.creditCards !== undefined && parsed.creditCards !== null ? parsed.creditCards : seedCreditCards();
  const creditCards = cardsSource.map((c) => ({
    ...c,
    archived: Boolean(c.archived),
    limite: Number(c.limite) || 0,
    diaFechamento: Math.min(31, Math.max(1, parseInt(c.diaFechamento, 10) || 10)),
    diaVencimento: Math.min(31, Math.max(1, parseInt(c.diaVencimento, 10) || 15)),
  }));
  txs = txs.map((t) => ensureInvoiceFieldsForTx(t, creditCards));
  return { accounts, transactions: txs, creditCards };
}

/**
 * `asOf` padrão = hoje: não inclui lançamentos com data futura.
 * Saldos futuros aparecem na projeção (série do gráfico) via `balanceTotalAt` / evolução.
 */
export function balanceForAccount(accounts, transactions, accountId, asOf = new Date()) {
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  let b = acc.saldoInicial || 0;
  for (const t of transactions) {
    if (t.accountId !== accountId) continue;
    if (!isTransactionEffectiveOnOrBefore(t, asOf)) continue;
    if (t.tipo === 'entrada') b += t.valor;
    else if (t.tipo === 'saída') b -= t.valor;
  }
  return b;
}

/** Soma saldos apenas de contas não arquivadas (respeitando a mesma regra de data). */
export function totalBalance(accounts, transactions, asOf = new Date()) {
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + balanceForAccount(accounts, transactions, a.id, asOf), 0);
}

export function accountName(accounts, accountId) {
  return accounts.find((a) => a.id === accountId)?.name ?? '—';
}

export function creditCardName(creditCards, id) {
  return creditCards.find((c) => c.id === id)?.name ?? '—';
}

export function activeAccounts(accounts) {
  return accounts.filter((a) => !a.archived);
}

export function activeCreditCards(cards) {
  return cards.filter((c) => !c.archived);
}

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [accounts, setAccounts] = useState(seedAccounts);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [creditCards, setCreditCards] = useState(seedCreditCards);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      let raw = null;
      try {
        raw = await secureGet(STORAGE_KEY);
        if (!raw) raw = await secureGet('@gastoo_finance_v1');
      } catch (e) {
        console.warn('[FinanceContext] Erro ao ler SecureStore:', e);
      }

      if (raw) {
        try {
          const p = JSON.parse(raw);
          const m = migrateLoaded(p);
          setAccounts(m.accounts);
          setTransactions(m.transactions);
          setCreditCards(m.creditCards);
        } catch (e) {
          console.warn('[FinanceContext] Dado corrompido detectado. Chave:', STORAGE_KEY, '— Erro:', e?.message ?? e);
          try {
            await secureSet('@gastoo_corrupted_backup', raw);
            await secureRemove(STORAGE_KEY);
            await secureRemove('@gastoo_finance_v1');
          } catch (backupErr) {
            console.error('[FinanceContext] Falha ao salvar backup:', backupErr);
          }
        }
      }

      // Sync com Supabase em background (só se autenticado)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          const [remoteAccounts, remoteTx, remoteCards] = await Promise.all([
            fetchAccounts(userId),
            fetchTransactions(userId),
            fetchCreditCards(userId),
          ]);

          if (remoteAccounts.length || remoteTx.length || remoteCards.length) {
            // Dados remotos existem: usar como fonte da verdade
            const merged = migrateLoaded({
              accounts: remoteAccounts.length ? remoteAccounts : undefined,
              transactions: remoteTx.length ? remoteTx : undefined,
              creditCards: remoteCards.length ? remoteCards : undefined,
            });
            if (remoteAccounts.length) setAccounts(merged.accounts);
            if (remoteTx.length) setTransactions(merged.transactions);
            if (remoteCards.length) setCreditCards(merged.creditCards);
          } else if (raw) {
            // Primeiro login com dados locais: migrar para nuvem
            const p = JSON.parse(raw);
            const m = migrateLoaded(p);
            await migrateLocalToSupabase(m, userId);
          }
        }
      } catch (e) {
        console.warn('[FinanceContext] Sync Supabase falhou (modo offline):', e?.message);
      }

      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    secureSet(STORAGE_KEY, JSON.stringify({ accounts, transactions, creditCards })).catch(() => {
      showToast('Erro ao salvar dados. Verifique o armazenamento do dispositivo.');
    });
  }, [accounts, transactions, creditCards, ready]);

  const toastTimerRef = useRef(null);
  const userIdRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data.session?.user?.id ?? null;
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  const addAccount = useCallback(({ name, icon, saldoInicial }) => {
    const id = `acc-${Date.now()}`;
    const ac = {
      id,
      name: name.trim(),
      icon: icon || 'Bank',
      saldoInicial: Number(saldoInicial) || 0,
      archived: false,
    };
    setAccounts((prev) => [...prev, ac]);
    if (userIdRef.current) upsertAccount(ac, userIdRef.current);
    return id;
  }, []);

  const updateAccount = useCallback((accountId, { name, icon, saldoInicial }) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a;
        const next = {
          ...a,
          ...(name != null && { name: String(name).trim() }),
          ...(icon != null && { icon }),
          ...(saldoInicial !== undefined && { saldoInicial: Number(saldoInicial) || 0 }),
        };
        if (userIdRef.current) upsertAccount(next, userIdRef.current);
        return next;
      })
    );
  }, []);

  const archiveAccount = useCallback((accountId) => {
    setAccounts((prev) => prev.map((a) => {
      if (a.id !== accountId) return a;
      const next = { ...a, archived: true };
      if (userIdRef.current) upsertAccount(next, userIdRef.current);
      return next;
    }));
  }, []);

  const unarchiveAccount = useCallback((accountId) => {
    setAccounts((prev) => prev.map((a) => {
      if (a.id !== accountId) return a;
      const next = { ...a, archived: false };
      if (userIdRef.current) upsertAccount(next, userIdRef.current);
      return next;
    }));
  }, []);

  const addCreditCard = useCallback(({ name, icon, limite, diaFechamento, diaVencimento, accountId }) => {
    const id = `card-${Date.now()}`;
    const card = {
      id,
      name: name.trim(),
      icon: icon || 'CreditCard',
      limite: Number(limite) || 0,
      diaFechamento: Math.min(31, Math.max(1, parseInt(diaFechamento, 10) || 10)),
      diaVencimento: Math.min(31, Math.max(1, parseInt(diaVencimento, 10) || 15)),
      accountId,
      archived: false,
    };
    setCreditCards((prev) => [...prev, card]);
    if (userIdRef.current) upsertCreditCard(card, userIdRef.current);
    return id;
  }, []);

  const updateCreditCard = useCallback((cardId, updates) => {
    setCreditCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const next = { ...c, ...updates };
        if (updates.name != null) next.name = String(updates.name).trim();
        if (updates.limite !== undefined) next.limite = Number(updates.limite) || 0;
        if (updates.diaFechamento !== undefined) {
          next.diaFechamento = Math.min(31, Math.max(1, parseInt(updates.diaFechamento, 10) || 10));
        }
        if (updates.diaVencimento !== undefined) {
          next.diaVencimento = Math.min(31, Math.max(1, parseInt(updates.diaVencimento, 10) || 15));
        }
        if (updates.accountId != null) next.accountId = updates.accountId;
        if (updates.icon != null) next.icon = updates.icon;
        if (userIdRef.current) upsertCreditCard(next, userIdRef.current);
        return next;
      })
    );
  }, []);

  const deleteCreditCard = useCallback(
    (cardId) => {
      if (transactions.some((t) => t.creditCardId && String(t.creditCardId) === String(cardId))) {
        return { ok: false, error: 'Existem transações neste cartão. Ajuste ou exclua-as antes.' };
      }
      setCreditCards((prev) => prev.filter((c) => c.id !== cardId));
      syncDeleteCreditCard(cardId);
      return { ok: true };
    },
    [transactions]
  );

  const archiveCreditCard = useCallback((cardId) => {
    setCreditCards((prev) => prev.map((c) => {
      if (c.id !== cardId) return c;
      const next = { ...c, archived: true };
      if (userIdRef.current) upsertCreditCard(next, userIdRef.current);
      return next;
    }));
  }, []);

  const unarchiveCreditCard = useCallback((cardId) => {
    setCreditCards((prev) => prev.map((c) => {
      if (c.id !== cardId) return c;
      const next = { ...c, archived: false };
      if (userIdRef.current) upsertCreditCard(next, userIdRef.current);
      return next;
    }));
  }, []);

  const deleteAccount = useCallback(
    (accountId, mergeIntoId) => {
      const activeNonArchived = accounts.filter((a) => !a.archived);
      if (accountId === DEFAULT_ACCOUNT_ID && activeNonArchived.length === 1 && activeNonArchived[0].id === accountId) {
        return { ok: false, error: 'Não é possível excluir a única conta ativa.' };
      }

      const hasTx = transactions.some((t) => t.accountId === accountId);
      if (hasTx && !mergeIntoId) {
        return { ok: false, error: 'MERGE_REQUIRED', count: transactions.filter((t) => t.accountId === accountId).length };
      }

      if (mergeIntoId) {
        if (mergeIntoId === accountId) {
          return { ok: false, error: 'Escolha outra conta de destino.' };
        }
        const dest = accounts.find((a) => a.id === mergeIntoId);
        if (!dest || dest.archived) return { ok: false, error: 'Escolha uma conta ativa de destino.' };

        setTransactions((prev) =>
          prev.map((t) => (t.accountId === accountId ? { ...t, accountId: mergeIntoId } : t))
        );
        setCreditCards((prev) =>
          prev.map((c) => (c.accountId === accountId ? { ...c, accountId: mergeIntoId } : c))
        );
      }

      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      syncDeleteAccount(accountId);
      return { ok: true };
    },
    [accounts, transactions]
  );

  const addTransaction = useCallback(
    (tx) => {
      const id = tx.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const next = ensureInvoiceFieldsForTx({ ...tx, id }, creditCards);

      if (tx.gastoTipo === 'parcelado' && tx.periodicidade) {
        const installmentGroupId = `inst-${Date.now()}`;
        const startDate = parseBrDate(tx.data);
        if (!startDate) {
          setTransactions((prev) => [next, ...prev]);
          return;
        }

        const numInstallments = Number(tx.numParcelas) || 12;
        const dates = getInstallmentDates(startDate, tx.periodicidade, numInstallments);
        const installmentValue = parseFloat(tx.valor) / numInstallments;

        const installments = dates.map((date, idx) => {
          const instId = `${installmentGroupId}-${idx}`;
          const instTx = {
            ...next,
            id: instId,
            valor: parseFloat(installmentValue.toFixed(2)),
            data: formatBrDate(date),
            installmentGroupId,
            installmentIndex: idx,
            installmentTotal: numInstallments,
            isInstallment: true,
          };
          return ensureInvoiceFieldsForTx(instTx, creditCards);
        });

        setTransactions((prev) => [...installments, ...prev]);
        if (userIdRef.current) installments.forEach((t) => upsertTransaction(t, userIdRef.current));
        return;
      }

      setTransactions((prev) => [next, ...prev]);
      if (userIdRef.current) upsertTransaction(next, userIdRef.current);
    },
    [creditCards]
  );

  const addInstallmentTransactions = useCallback(
    (raw) => {
      if (!raw || raw.gastoTipo !== 'parcelado') {
        return;
      }
      const n = Math.min(365, Math.max(1, parseInt(String(raw.numParcelas), 10) || 1));
      const per = raw.periodicidade || 'mensal';
      const amounts = splitInstallmentAmounts(raw.valor, n);
      const gid = `pxl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const baseD = parseBrDate(raw.data);
      let current =
        baseD && !Number.isNaN(baseD.getTime()) ? new Date(baseD.getFullYear(), baseD.getMonth(), baseD.getDate()) : new Date();
      const rows = [];
      for (let i = 0; i < n; i++) {
        if (i > 0) {
          const nextD = addPeriod(current, per);
          current = new Date(nextD.getFullYear(), nextD.getMonth(), nextD.getDate());
        }
        const dataStr = fmtDate(current);
        const card = raw.creditCardId
          ? creditCards.find((c) => String(c.id) === String(raw.creditCardId)) || null
          : null;
        const {
          numParcelas: _np,
          id: _i0,
          parcelaGrupoId: _g,
          parcelaIndice: _ix,
          parcelaTotal: _pt,
          invoiceKey: _ik,
          invoiceKeyManual: _im,
          ...base
        } = raw;
        const row = {
          ...base,
          id: `${gid}-${i + 1}`,
          data: dataStr,
          valor: amounts[i],
          gastoTipo: 'parcelado',
          periodicidade: per,
          parcelaGrupoId: gid,
          parcelaIndice: i + 1,
          parcelaTotal: n,
        };
        if (row.creditCardId) {
          row.invoiceKey = invoiceKeyFromDateAndCloseDay(current, card?.diaFechamento ?? 10);
          row.invoiceKeyManual = false;
        } else {
          delete row.invoiceKey;
          delete row.invoiceKeyManual;
        }
        rows.push(ensureInvoiceFieldsForTx(row, creditCards));
      }
      setTransactions((prev) => [...rows.reverse(), ...prev]);
      if (userIdRef.current) rows.forEach((t) => upsertTransaction(t, userIdRef.current));
    },
    [creditCards]
  );

  const addTransfer = useCallback(({ valor, descricao, data, accountOrigem, accountDestino }) => {
    if (accountOrigem === accountDestino) return;
    const groupId = `trf-${Date.now()}`;
    const base = { valor, data, categoria: 'Transferência', isTransfer: true, transferGroupId: groupId, obs: '' };
    const outTx = {
      id: `${groupId}-o`,
      tipo: 'saída',
      descricao: descricao || `Transferência enviada`,
      accountId: accountOrigem,
      ...base,
    };
    const inTx = {
      id: `${groupId}-i`,
      tipo: 'entrada',
      descricao: descricao || `Transferência recebida`,
      accountId: accountDestino,
      ...base,
    };
    setTransactions((prev) => [outTx, inTx, ...prev]);
    if (userIdRef.current) {
      upsertTransaction(outTx, userIdRef.current);
      upsertTransaction(inTx, userIdRef.current);
    }
  }, []);

  const updateTransaction = useCallback((updated) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(updated.id)) return t;
        const next = { ...t, ...updated };
        const cardChanged = String(t.creditCardId || '') !== String(next.creditCardId || '');
        // Se mudar o cartão, recalcula sempre (manual não deve persistir entre cartões).
        if (next.creditCardId) {
          if (cardChanged) {
            const card = creditCards.find((c) => String(c.id) === String(next.creditCardId));
            const dateObj = parseBrDate(next.data);
            const computed = invoiceKeyFromDateAndCloseDay(dateObj || new Date(), card?.diaFechamento ?? 10);
            next.invoiceKey = computed;
            next.invoiceKeyManual = false;
          } else {
            // Se usuário não "fixou" fatura manualmente, recalcula ao mudar data
            const manual = Boolean(next.invoiceKeyManual);
            if (!manual && (!next.invoiceKey || t.data !== next.data)) {
              const card = creditCards.find((c) => String(c.id) === String(next.creditCardId));
              const dateObj = parseBrDate(next.data);
              const computed = invoiceKeyFromDateAndCloseDay(dateObj || new Date(), card?.diaFechamento ?? 10);
              next.invoiceKey = computed;
              next.invoiceKeyManual = false;
            }
          }
        } else {
          delete next.invoiceKey;
          delete next.invoiceKeyManual;
        }
        const final = ensureInvoiceFieldsForTx(next, creditCards);
        if (userIdRef.current) upsertTransaction(final, userIdRef.current);
        return final;
      })
    );
  }, [creditCards]);

  const deleteTransaction = useCallback((tx, options = {}) => {
    const { withFutureParcels = false } = options;
    setTransactions((prev) => {
      if (tx?.transferGroupId) {
        const removed = prev.filter((t) => t.transferGroupId === tx.transferGroupId);
        removed.forEach((t) => syncDeleteTransaction(t.id));
        return prev.filter((t) => t.transferGroupId !== tx.transferGroupId);
      }
      if (withFutureParcels && tx?.parcelaGrupoId && tx.parcelaIndice != null) {
        const cutFrom = Number(tx.parcelaIndice) || 0;
        const next = prev.filter((t) => {
          if (String(t.parcelaGrupoId || '') !== String(tx.parcelaGrupoId)) return true;
          const ix = Number(t.parcelaIndice) || 0;
          return ix > 0 && ix < cutFrom;
        });
        const removed = prev.filter((t) => !next.includes(t));
        removed.forEach((t) => syncDeleteTransaction(t.id));
        return next;
      }
      syncDeleteTransaction(tx.id);
      return prev.filter((t) => String(t.id) !== String(tx.id));
    });
  }, []);

  const renameTransactionsCategory = useCallback((fromName, toName) => {
    if (!fromName || !toName || fromName === toName) return;
    setTransactions((prev) =>
      prev.map((t) => (t.categoria === fromName ? { ...t, categoria: toName } : t))
    );
  }, []);

  const value = useMemo(
    () => ({
      ready,
      accounts,
      transactions,
      creditCards,
      toast,
      showToast,
      isSyncing,
      setIsSyncing,
      addAccount,
      updateAccount,
      deleteAccount,
      archiveAccount,
      unarchiveAccount,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      archiveCreditCard,
      unarchiveCreditCard,
      addTransaction,
      addInstallmentTransactions,
      addTransfer,
      updateTransaction,
      deleteTransaction,
      renameTransactionsCategory,
    }),
    [
      ready,
      accounts,
      transactions,
      creditCards,
      toast,
      showToast,
      isSyncing,
      setIsSyncing,
      addAccount,
      updateAccount,
      deleteAccount,
      archiveAccount,
      unarchiveAccount,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      archiveCreditCard,
      unarchiveCreditCard,
      addTransaction,
      addInstallmentTransactions,
      addTransfer,
      updateTransaction,
      deleteTransaction,
      renameTransactionsCategory,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
