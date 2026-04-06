/** Parse DD/MM/YYYY */
export function parseTxDate(str) {
  if (!str || typeof str !== 'string') return new Date(0);
  const parts = str.split('/');
  if (parts.length !== 3) return new Date(0);
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
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
