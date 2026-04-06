import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_TRANSACTIONS } from '../theme';

const STORAGE_KEY = '@gastoo_finance_v2';

export const DEFAULT_ACCOUNT_ID = 'acc-seed-default';

function seedAccounts() {
  return [{ id: DEFAULT_ACCOUNT_ID, name: 'Conta Corrente', icon: '🏦', saldoInicial: 0, archived: false }];
}

function seedTransactions() {
  return MOCK_TRANSACTIONS.map((tx) => ({
    ...tx,
    accountId: DEFAULT_ACCOUNT_ID,
  }));
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
  const creditCards = (parsed.creditCards || []).map((c) => ({
    ...c,
    archived: Boolean(c.archived),
    limite: Number(c.limite) || 0,
    diaFechamento: Math.min(31, Math.max(1, parseInt(c.diaFechamento, 10) || 10)),
    diaVencimento: Math.min(31, Math.max(1, parseInt(c.diaVencimento, 10) || 15)),
  }));
  return { accounts, transactions: txs, creditCards };
}

export function balanceForAccount(accounts, transactions, accountId) {
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  let b = acc.saldoInicial || 0;
  for (const t of transactions) {
    if (t.accountId !== accountId) continue;
    if (t.tipo === 'entrada') b += t.valor;
    else if (t.tipo === 'saída') b -= t.valor;
  }
  return b;
}

/** Soma saldos apenas de contas não arquivadas */
export function totalBalance(accounts, transactions) {
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + balanceForAccount(accounts, transactions, a.id), 0);
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
  const [creditCards, setCreditCards] = useState([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) raw = await AsyncStorage.getItem('@gastoo_finance_v1');
        if (raw) {
          const p = JSON.parse(raw);
          const m = migrateLoaded(p);
          setAccounts(m.accounts);
          setTransactions(m.transactions);
          setCreditCards(m.creditCards);
        }
      } catch (e) {
        console.warn(e);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts, transactions, creditCards })).catch(() => {});
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

  const addTransaction = useCallback((tx) => {
    const id = tx.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setTransactions((prev) => [{ ...tx, id }, ...prev]);
  }, []);

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
      prev.map((t) => (String(t.id) === String(updated.id) ? { ...t, ...updated } : t))
    );
  }, []);

  const deleteTransaction = useCallback((tx) => {
    setTransactions((prev) => {
      if (tx.transferGroupId) {
        return prev.filter((t) => t.transferGroupId !== tx.transferGroupId);
      }
      return prev.filter((t) => String(t.id) !== String(tx.id));
    });
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
      deleteAccount,
      archiveAccount,
      unarchiveAccount,
      addCreditCard,
      deleteCreditCard,
      archiveCreditCard,
      unarchiveCreditCard,
      addTransaction,
      addTransfer,
      updateTransaction,
      deleteTransaction,
    }),
    [
      ready,
      accounts,
      transactions,
      creditCards,
      toast,
      showToast,
      addAccount,
      deleteAccount,
      archiveAccount,
      unarchiveAccount,
      addCreditCard,
      deleteCreditCard,
      archiveCreditCard,
      unarchiveCreditCard,
      addTransaction,
      addTransfer,
      updateTransaction,
      deleteTransaction,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
