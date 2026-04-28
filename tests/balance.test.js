/**
 * Testes de Saldo — GA$TOO
 * Cobre: balanceTotalAt, balanceForAccount, totalBalance, isTransactionEffectiveOnOrBefore.
 */

function parseTxDate(str) {
  if (!str || typeof str !== 'string') return new Date(0);
  const parts = str.split('/');
  if (parts.length !== 3) return new Date(0);
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function parseBrDate(s) {
  if (!s) return null;
  const match = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const dd = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const yy = parseInt(match[3], 10);
  const d = new Date(yy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isTransactionEffectiveOnOrBefore(tx, asOf) {
  const ref = asOf || new Date();
  if (!tx || !tx.data) return true;
  const tDate = parseBrDate(tx.data);
  if (!tDate || Number.isNaN(tDate.getTime())) return true;
  const tDay = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
  const a = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return tDay.getTime() <= a.getTime();
}

function endOfCalendarDay(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setHours(23, 59, 59, 999);
  return x;
}

function balanceTotalAt(accounts, transactions, selectedAccountId, endDate) {
  const end = endOfCalendarDay(endDate);
  const accs = selectedAccountId
    ? accounts.filter((a) => a.id === selectedAccountId && !a.archived)
    : accounts.filter((a) => !a.archived);
  let sum = 0;
  for (const a of accs) {
    let b = Number(a.saldoInicial) || 0;
    for (const t of transactions) {
      if (t.accountId !== a.id) continue;
      const td = parseTxDate(t.data);
      if (td.getTime() === 0 || td.getTime() > end.getTime()) continue;
      if (t.tipo === 'entrada') b += t.valor;
      else if (t.tipo === 'saida') b -= t.valor;
    }
    sum += b;
  }
  return sum;
}

function balanceForAccount(accounts, transactions, accountId, asOf) {
  const ref = asOf || new Date();
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  let b = acc.saldoInicial || 0;
  for (const t of transactions) {
    if (t.accountId !== accountId) continue;
    if (!isTransactionEffectiveOnOrBefore(t, ref)) continue;
    if (t.tipo === 'entrada') b += t.valor;
    else if (t.tipo === 'saida') b -= t.valor;
  }
  return b;
}

function totalBalance(accounts, transactions, asOf) {
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + balanceForAccount(accounts, transactions, a.id, asOf), 0);
}

const ACC1 = { id: 'acc-1', name: 'Corrente', saldoInicial: 1000, archived: false };
const ACC2 = { id: 'acc-2', name: 'Poupanca', saldoInicial: 500, archived: false };
const ACC_ARCHIVED = { id: 'acc-3', name: 'Arquivada', saldoInicial: 200, archived: true };

const TRANSACTIONS = [
  { id: 't1', tipo: 'entrada', valor: 3000, data: '01/04/2026', accountId: 'acc-1' },
  { id: 't2', tipo: 'saida', valor: 800, data: '05/04/2026', accountId: 'acc-1' },
  { id: 't3', tipo: 'entrada', valor: 200, data: '10/04/2026', accountId: 'acc-2' },
  { id: 't4', tipo: 'saida', valor: 100, data: '15/04/2026', accountId: 'acc-2' },
  { id: 't5', tipo: 'entrada', valor: 999, data: '30/04/2026', accountId: 'acc-1' },
];

describe('isTransactionEffectiveOnOrBefore', () => {
  const today = new Date(2026, 3, 14);

  test('transacao com data passada e efetiva', () => {
    expect(isTransactionEffectiveOnOrBefore({ data: '05/04/2026' }, today)).toBe(true);
  });

  test('transacao com data igual a hoje e efetiva', () => {
    expect(isTransactionEffectiveOnOrBefore({ data: '14/04/2026' }, today)).toBe(true);
  });

  test('transacao com data futura nao e efetiva', () => {
    expect(isTransactionEffectiveOnOrBefore({ data: '15/04/2026' }, today)).toBe(false);
  });

  test('transacao sem data e considerada efetiva', () => {
    expect(isTransactionEffectiveOnOrBefore({}, today)).toBe(true);
    expect(isTransactionEffectiveOnOrBefore({ data: null }, today)).toBe(true);
  });

  test('data invalida e tratada como efetiva', () => {
    expect(isTransactionEffectiveOnOrBefore({ data: 'invalida' }, today)).toBe(true);
  });
});

describe('balanceTotalAt', () => {
  const accounts = [ACC1, ACC2, ACC_ARCHIVED];

  test('saldo total (todas as contas ativas) ate 10/04/2026', () => {
    const result = balanceTotalAt(accounts, TRANSACTIONS, null, new Date(2026, 3, 10));
    expect(result).toBeCloseTo(4700, 2);
  });

  test('conta arquivada nao entra no saldo total', () => {
    const txArchived = [{ id: 'ta', tipo: 'entrada', valor: 9999, data: '01/04/2026', accountId: 'acc-3' }];
    const result = balanceTotalAt(accounts, txArchived, null, new Date(2026, 3, 30));
    expect(result).toBeCloseTo(1500, 2);
  });

  test('filtra por accountId especifico', () => {
    const result = balanceTotalAt(accounts, TRANSACTIONS, 'acc-1', new Date(2026, 3, 5));
    expect(result).toBeCloseTo(3200, 2);
  });

  test('saldo inicial sem transacoes = saldoInicial da conta', () => {
    const result = balanceTotalAt([ACC1], [], 'acc-1', new Date(2026, 3, 1));
    expect(result).toBe(1000);
  });
});

describe('balanceForAccount', () => {
  const accounts = [ACC1, ACC2];

  test('retorna 0 para conta inexistente', () => {
    expect(balanceForAccount(accounts, TRANSACTIONS, 'acc-999')).toBe(0);
  });

  test('exclui transacoes futuras do saldo', () => {
    const asOf = new Date(2026, 3, 14);
    const result = balanceForAccount(accounts, TRANSACTIONS, 'acc-1', asOf);
    expect(result).toBeCloseTo(3200, 2);

    const asOfFuture = new Date(2026, 3, 30);
    const resultFuture = balanceForAccount(accounts, TRANSACTIONS, 'acc-1', asOfFuture);
    expect(resultFuture).toBeCloseTo(4199, 2);
  });
});

describe('totalBalance multi conta', () => {
  test('soma saldos de todas as contas ativas', () => {
    const accounts = [ACC1, ACC2, ACC_ARCHIVED];
    const asOf = new Date(2026, 3, 10);
    const result = totalBalance(accounts, TRANSACTIONS, asOf);
    expect(result).toBeCloseTo(4700, 2);
  });

  test('sem contas ativas retorna 0', () => {
    const result = totalBalance([ACC_ARCHIVED], TRANSACTIONS);
    expect(result).toBe(0);
  });
});
