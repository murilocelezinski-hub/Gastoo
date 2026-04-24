import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { secureGet, secureSet, secureRemove } from '../services/secureStorage';
import { addPeriod, fmtDate } from '../utils/recurrence';

const STORAGE_KEY = '@gastoo_finance_v2';

export const DEFAULT_ACCOUNT_ID = 'acc-seed-default';
export const ACC_SEED_POUP = 'acc-seed-poup';
const CARD_SEED_DEMO = 'card-seed-demo';

function parseBrDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const d = new Date(yy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

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
    { id: DEFAULT_ACCOUNT_ID, name: 'Conta Corrente', icon: '🏦', saldoInicial: 4100, archived: false },
    { id: ACC_SEED_POUP, name: 'Poupança', icon: '💰', saldoInicial: 1200, archived: false },
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

  const trf1 = 'trf-seed-1';
  out.push(t({ tipo: 'entrada', valor: 4800, descricao: 'Salário jan.', categoria: 'Outros', data: '05/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 220, descricao: 'Supermercado', categoria: 'Alimentação', data: '07/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 89.9, descricao: 'Streaming', categoria: 'Assinaturas', data: '09/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 1560, descricao: 'Aluguel', categoria: 'Moradia', data: '10/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 420, descricao: 'Posto', categoria: 'Transporte', data: '14/01/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 280, descricao: 'Farmácia', categoria: 'Saúde', data: '16/01/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 350, descricao: 'Restaurante', categoria: 'Alimentação', data: '19/01/2026', accountId: a1, creditCardId: card }));
  out.push(
    t({
      tipo: 'saída',
      valor: 500,
      descricao: '→ Poupança',
      categoria: 'Transferência',
      data: '22/01/2026',
      accountId: a1,
      isTransfer: true,
      transferGroupId: trf1,
    })
  );
  out.push(
    t({
      tipo: 'entrada',
      valor: 500,
      descricao: '← Conta Corrente',
      categoria: 'Transferência',
      data: '22/01/2026',
      accountId: a2,
      isTransfer: true,
      transferGroupId: trf1,
    })
  );
  out.push(t({ tipo: 'entrada', valor: 350, descricao: 'Freelance', categoria: 'Outros', data: '28/01/2026', accountId: a1 }));

  const trf2 = 'trf-seed-2';
  out.push(t({ tipo: 'entrada', valor: 4800, descricao: 'Salário fev.', categoria: 'Outros', data: '05/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 198, descricao: 'Mercado', categoria: 'Alimentação', data: '06/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 1560, descricao: 'Aluguel', categoria: 'Moradia', data: '10/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 112, descricao: 'Uber', categoria: 'Transporte', data: '11/02/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 640, descricao: 'Parcela notebook', categoria: 'Educação', data: '14/02/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 120, descricao: 'Cinema', categoria: 'Lazer', data: '16/02/2026', accountId: a1 }));
  out.push(
    t({
      tipo: 'saída',
      valor: 200,
      descricao: '→ Poupança',
      categoria: 'Transferência',
      data: '20/02/2026',
      accountId: a1,
      isTransfer: true,
      transferGroupId: trf2,
    })
  );
  out.push(
    t({
      tipo: 'entrada',
      valor: 200,
      descricao: '← Conta Corrente',
      categoria: 'Transferência',
      data: '20/02/2026',
      accountId: a2,
      isTransfer: true,
      transferGroupId: trf2,
    })
  );
  out.push(t({ tipo: 'entrada', valor: 900, descricao: 'Bônus', categoria: 'Outros', data: '25/02/2026', accountId: a1 }));

  const trf3 = 'trf-seed-3';
  out.push(t({ tipo: 'entrada', valor: 5100, descricao: 'Salário mar.', categoria: 'Outros', data: '05/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 310, descricao: 'Compras', categoria: 'Vestuário', data: '07/03/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 1560, descricao: 'Aluguel', categoria: 'Moradia', data: '10/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 75.5, descricao: 'Padaria', categoria: 'Alimentação', data: '12/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 450, descricao: 'Energia', categoria: 'Moradia', data: '15/03/2026', accountId: a1 }));
  out.push(
    t({
      tipo: 'saída',
      valor: 800,
      descricao: '→ Poupança',
      categoria: 'Transferência',
      data: '18/03/2026',
      accountId: a1,
      isTransfer: true,
      transferGroupId: trf3,
    })
  );
  out.push(
    t({
      tipo: 'entrada',
      valor: 800,
      descricao: '← Conta Corrente',
      categoria: 'Transferência',
      data: '18/03/2026',
      accountId: a2,
      isTransfer: true,
      transferGroupId: trf3,
    })
  );
  out.push(t({ tipo: 'saída', valor: 129.9, descricao: 'Livros', categoria: 'Educação', data: '22/03/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 250, descricao: 'Reembolso', categoria: 'Outros', data: '27/03/2026', accountId: a1 }));

  out.push(t({ tipo: 'entrada', valor: 5100, descricao: 'Salário abr.', categoria: 'Outros', data: '05/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 145, descricao: 'iFood', categoria: 'Alimentação', data: '06/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'saída', valor: 890, descricao: 'Compras cartão', categoria: 'Lazer', data: '08/04/2026', accountId: a1, creditCardId: card }));
  out.push(t({ tipo: 'saída', valor: 67, descricao: 'Padaria', categoria: 'Alimentação', data: '09/04/2026', accountId: a1 }));

  // Receitas extras (demo) — várias categorias no mês atual para o gráfico de relatórios
  out.push(t({ tipo: 'entrada', valor: 380, descricao: 'Dividendos FII', categoria: 'Investimentos', data: '01/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 520, descricao: 'Aluguel recebido', categoria: 'Moradia', data: '03/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 150, descricao: 'Reembolso médico', categoria: 'Saúde', data: '04/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 640, descricao: 'Freelance design', categoria: 'Outros', data: '07/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 95, descricao: 'Cashback cartão', categoria: 'Lazer', data: '08/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 210, descricao: 'Venda curso online', categoria: 'Educação', data: '09/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 175, descricao: 'Reembolso VT', categoria: 'Transporte', data: '10/04/2026', accountId: a1 }));
  out.push(t({ tipo: 'entrada', valor: 88, descricao: 'Venda peça', categoria: 'Vestuário', data: '10/04/2026', accountId: a1 }));

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
      icon: '💳',
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

  useEffect(() => {
    (async () => {
      let raw = null;
      try {
        // secureGet já tenta migrar automaticamente dados legados do AsyncStorage
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
          console.warn('[FinanceContext] Dado corrompido, limpando:', e);
          await secureRemove(STORAGE_KEY);
          await secureRemove('@gastoo_finance_v1');
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    secureSet(STORAGE_KEY, JSON.stringify({ accounts, transactions, creditCards })).catch(() => {});
  }, [accounts, transactions, creditCards, ready]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const addAccount = useCallback(({ name, icon, saldoInicial }) => {
    const id = `acc-${Date.now()}`;
    const ac = {
      id,
      name: name.trim(),
      icon: icon || '🏦',
      saldoInicial: Number(saldoInicial) || 0,
      archived: false,
    };
    setAccounts((prev) => [...prev, ac]);
    return id;
  }, []);

  const updateAccount = useCallback((accountId, { name, icon, saldoInicial }) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a;
        return {
          ...a,
          ...(name != null && { name: String(name).trim() }),
          ...(icon != null && { icon }),
          ...(saldoInicial !== undefined && { saldoInicial: Number(saldoInicial) || 0 }),
        };
      })
    );
  }, []);

  const archiveAccount = useCallback((accountId) => {
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, archived: true } : a)));
  }, []);

  const unarchiveAccount = useCallback((accountId) => {
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, archived: false } : a)));
  }, []);

  const addCreditCard = useCallback(({ name, icon, limite, diaFechamento, diaVencimento, accountId }) => {
    const id = `card-${Date.now()}`;
    const card = {
      id,
      name: name.trim(),
      icon: icon || '💳',
      limite: Number(limite) || 0,
      diaFechamento: Math.min(31, Math.max(1, parseInt(diaFechamento, 10) || 10)),
      diaVencimento: Math.min(31, Math.max(1, parseInt(diaVencimento, 10) || 15)),
      accountId,
      archived: false,
    };
    setCreditCards((prev) => [...prev, card]);
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
      return { ok: true };
    },
    [transactions]
  );

  const archiveCreditCard = useCallback((cardId) => {
    setCreditCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, archived: true } : c)));
  }, []);

  const unarchiveCreditCard = useCallback((cardId) => {
    setCreditCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, archived: false } : c)));
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

        const numInstallments = 12;
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
        return;
      }

      setTransactions((prev) => [next, ...prev]);
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
        return ensureInvoiceFieldsForTx(next, creditCards);
      })
    );
  }, [creditCards]);

  const deleteTransaction = useCallback((tx, options = {}) => {
    const { withFutureParcels = false } = options;
    setTransactions((prev) => {
      if (tx?.transferGroupId) {
        return prev.filter((t) => t.transferGroupId !== tx.transferGroupId);
      }
<<<<<<< HEAD
      if (tx.installmentGroupId) {
        return prev.filter((t) => t.installmentGroupId !== tx.installmentGroupId);
=======
      if (withFutureParcels && tx?.parcelaGrupoId && tx.parcelaIndice != null) {
        const g = String(tx.parcelaGrupoId);
        const idx = Number(tx.parcelaIndice) || 0;
        return prev.filter((t) => {
          if (String(t.parcelaGrupoId || '') !== g) return true;
          if (t.parcelaIndice == null) return true;
          return Number(t.parcelaIndice) < idx;
        });
>>>>>>> 820466f (feat: Implementa gerenciamento de parcelas em transações financeiras)
      }
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
