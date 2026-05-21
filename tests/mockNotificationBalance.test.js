/**
 * Testes — Ajuste 1: confirmar/descartar notificação mock impacta saldo
 *
 * Replica as funções puras balanceForAccount e totalBalance do FinanceContext
 * sem importar o módulo (que carrega expo-secure-store, incompatível com Jest bare).
 */

// ── réplicas das funções puras do FinanceContext ──────────────────────────────

function parseBrDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

function isTransactionEffectiveOnOrBefore(t, asOf) {
  const d = parseBrDate(t.data);
  if (!d) return true;
  return d <= asOf;
}

function balanceForAccount(accounts, transactions, accountId, asOf = new Date()) {
  const acc = accounts.find(a => a.id === accountId);
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

function totalBalance(accounts, transactions, asOf = new Date()) {
  return accounts
    .filter(a => !a.archived)
    .reduce((sum, a) => sum + balanceForAccount(accounts, transactions, a.id, asOf), 0);
}

// ── fixtures ────────────────────────────────────────────────────────────────

const ACCOUNT = { id: 'acc1', ativo: true, archived: false, saldoInicial: 1000 };
const ACCOUNTS = [ACCOUNT];

const MOCK_SAIDA = {
  id: '__mock_1',
  descricao: 'iFood',
  categoria: 'Alimentação',
  valor: 47.90,
  tipo: 'saída',
  data: '30/04/2025',
  origin: { type: 'notification', bank: 'Nubank' },
};

const MOCK_ENTRADA = {
  id: '__mock_3',
  descricao: 'Salário',
  categoria: 'Renda',
  valor: 5800.00,
  tipo: 'entrada',
  data: '28/04/2025',
  origin: { type: 'notification', bank: 'Itaú' },
};

// ── helpers que espelham a lógica do DashboardScreen ────────────────────────

/**
 * Simula confirmNotification para mock:
 * cria nova transação com origin: confirmed e accountId da conta ativa.
 */
function simulateConfirm(tx, accounts) {
  const firstAccount = accounts.find(a => a.ativo);
  if (!firstAccount) return [];
  return [{ ...tx, id: `confirmed_${tx.id}`, accountId: firstAccount.id, origin: { type: 'confirmed' } }];
}

/**
 * Simula dismissNotification para mock: não adiciona transação.
 */
function simulateDismiss() {
  return [];
}

// ── testes ───────────────────────────────────────────────────────────────────

describe('Notificação mock — impacto no saldo', () => {
  const asOf = new Date(2025, 11, 31); // 31/12/2025, após todas as datas de teste

  test('saldo inicial sem transações = saldoInicial da conta', () => {
    expect(balanceForAccount(ACCOUNTS, [], 'acc1', asOf)).toBeCloseTo(1000);
  });

  test('confirmar saída mock reduz saldo', () => {
    const txs = simulateConfirm(MOCK_SAIDA, ACCOUNTS);
    const saldo = balanceForAccount(ACCOUNTS, txs, 'acc1', asOf);
    expect(saldo).toBeCloseTo(1000 - 47.90, 2);
  });

  test('confirmar entrada mock aumenta saldo', () => {
    const txs = simulateConfirm(MOCK_ENTRADA, ACCOUNTS);
    const saldo = balanceForAccount(ACCOUNTS, txs, 'acc1', asOf);
    expect(saldo).toBeCloseTo(1000 + 5800, 2);
  });

  test('descartar mock não altera saldo', () => {
    const txs = simulateDismiss();
    const saldo = balanceForAccount(ACCOUNTS, txs, 'acc1', asOf);
    expect(saldo).toBeCloseTo(1000, 2);
  });

  test('confirmar múltiplos mocks acumula corretamente no saldo', () => {
    const txs = [
      ...simulateConfirm(MOCK_SAIDA, ACCOUNTS),
      ...simulateConfirm(MOCK_ENTRADA, ACCOUNTS),
    ];
    const saldo = balanceForAccount(ACCOUNTS, txs, 'acc1', asOf);
    expect(saldo).toBeCloseTo(1000 - 47.90 + 5800, 2);
  });

  test('totalBalance inclui transações confirmadas de mocks', () => {
    const txs = simulateConfirm(MOCK_SAIDA, ACCOUNTS);
    expect(totalBalance(ACCOUNTS, txs, asOf)).toBeCloseTo(1000 - 47.90, 2);
  });

  test('transação confirmada tem origin.type === "confirmed"', () => {
    const txs = simulateConfirm(MOCK_SAIDA, ACCOUNTS);
    expect(txs[0].origin.type).toBe('confirmed');
  });

  test('transação confirmada tem accountId da conta ativa', () => {
    const txs = simulateConfirm(MOCK_SAIDA, ACCOUNTS);
    expect(txs[0].accountId).toBe('acc1');
  });

  test('transação confirmada não tem id com prefixo __mock_', () => {
    const txs = simulateConfirm(MOCK_SAIDA, ACCOUNTS);
    expect(txs[0].id).not.toMatch(/^__mock_/);
  });

  test('sem conta ativa, confirmar mock não gera transação', () => {
    const semConta = [{ ...ACCOUNT, ativo: false }];
    const txs = simulateConfirm(MOCK_SAIDA, semConta);
    expect(txs).toHaveLength(0);
  });
});
