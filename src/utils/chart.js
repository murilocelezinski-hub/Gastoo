/** Parse DD/MM/YYYY */
export function parseTxDate(str) {
  if (!str || typeof str !== 'string') return new Date(0);
  const parts = str.split('/');
  if (parts.length !== 3) return new Date(0);
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function endOfCalendarDay(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Saldo total (ou de uma conta) após todos os lançamentos até o fim do dia `endDate`. */
export function balanceTotalAt(accounts, transactions, selectedAccountId, endDate) {
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
      else if (t.tipo === 'saída') b -= t.valor;
    }
    sum += b;
  }
  return sum;
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Série para gráfico de evolução do saldo.
 * @param {'current_month' | 'prev_month' | 'last_6m' | 'last_12m'} mode
 */
export function buildBalanceEvolutionSeries(accounts, transactions, selectedAccountId, mode, referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  const points = [];

  const pad2 = (n) => String(n).padStart(2, '0');

  if (mode === 'current_month') {
    const y = ref.getFullYear();
    const m = ref.getMonth();
    // Até o fim do mês: o gráfico funciona como projeção; lançamentos com data futura
    // entram a partir do dia de competência, não no saldo "até hoje" (balanceForAccount).
    const endDay = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= endDay; d++) {
      const day = new Date(y, m, d);
      points.push({
        label: `${pad2(d)}/${pad2(m + 1)}`,
        balance: balanceTotalAt(accounts, transactions, selectedAccountId, day),
        date: day,
      });
    }
  } else if (mode === 'prev_month') {
    const first = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const last = new Date(ref.getFullYear(), ref.getMonth(), 0);
    for (let d = 1; d <= last.getDate(); d++) {
      const day = new Date(first.getFullYear(), first.getMonth(), d);
      const mo = first.getMonth();
      points.push({
        label: `${pad2(d)}/${pad2(mo + 1)}`,
        balance: balanceTotalAt(accounts, transactions, selectedAccountId, day),
        date: day,
      });
    }
  } else if (mode === 'last_6m' || mode === 'last_12m') {
    const n = mode === 'last_6m' ? 6 : 12;
    for (let i = n - 1; i >= 0; i--) {
      const monthStart = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const isCurrent =
        monthStart.getMonth() === ref.getMonth() && monthStart.getFullYear() === ref.getFullYear();
      // Mês atual: ponto no último dia do mês = projeção; meses fechados = fim do mês.
      const cut = isCurrent
        ? new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
        : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      points.push({
        label: `${MONTH_SHORT[monthStart.getMonth()]}/${String(monthStart.getFullYear()).slice(-2)}`,
        balance: balanceTotalAt(accounts, transactions, selectedAccountId, cut),
        date: cut,
      });
    }
  }

  return points;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Últimos 6 meses (calendário) com entradas/saídas; exclui transferências.
 */
export function buildChartData(transactions, referenceDate = new Date()) {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.isTransfer) continue;
      const td = parseTxDate(tx.data);
      if (td.getMonth() !== month || td.getFullYear() !== year) continue;
      if (tx.tipo === 'entrada') income += tx.valor;
      else if (tx.tipo === 'saída') expense += tx.valor;
    }
    result.push({ month: MONTH_LABELS[month], income, expense });
  }
  return result;
}
