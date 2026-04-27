import { parseTxDate } from './chart';

export const PERIOD_LABEL = {
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimensal: 'Bimensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function addPeriod(date, periodicidade) {
  switch (periodicidade) {
    case 'diaria':
      return addDays(date, 1);
    case 'semanal':
      return addDays(date, 7);
    case 'quinzenal':
      return addDays(date, 15);
    case 'mensal':
      return addMonths(date, 1);
    case 'bimensal':
      return addMonths(date, 2);
    case 'trimestral':
      return addMonths(date, 3);
    case 'semestral':
      return addMonths(date, 6);
    case 'anual':
      return addMonths(date, 12);
    default:
      return addMonths(date, 1);
  }
}

export function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/**
 * Usa `tx.data` como "última ocorrência conhecida" e acha a próxima >= referenceDate.
 */
export function nextOccurrenceDate(tx, referenceDate = new Date()) {
  if (!tx?.periodicidade) return null;
  let d = parseTxDate(tx.data);
  if (Number.isNaN(d.getTime())) return null;

  // Normaliza para "meia-noite" para comparar só por data.
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  let guard = 0;
  while (d < ref && guard < 500) {
    d = addPeriod(d, tx.periodicidade);
    guard++;
  }
  return d;
}

/**
 * Soma ocorrências "futuras no mês atual" (inclusive hoje) para transações recorrentes.
 * Considera apenas `tipo === 'saída'` e exclui transferências.
 */
export function projectedRecurringOut(transactions, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let total = 0;

  for (const t of transactions) {
    if (!t || t.isTransfer) continue;
    if (t.tipo !== 'saída') continue;
    if (!t.gastoTipo || t.gastoTipo === 'nenhum') continue;
    if (!t.periodicidade) continue;
    // Parcelas expandidas em múltiplas transações reais: não projetar de novo
    if (t.gastoTipo === 'parcelado' && t.parcelaGrupoId) continue;

    // Encontra a primeira ocorrência >= hoje.
    let occ = nextOccurrenceDate(t, today);
    if (!occ) continue;

    // Se a próxima ocorrência cair antes do mês atual (caso de datas estranhas), empurra para dentro do mês.
    let guard = 0;
    while (occ < monthStart && guard < 50) {
      occ = addPeriod(occ, t.periodicidade);
      guard++;
    }

    // Soma todas ocorrências até o fim do mês.
    guard = 0;
    while (occ && occ <= monthEnd && guard < 200) {
      if (occ >= today) total += Number(t.valor) || 0;
      occ = addPeriod(occ, t.periodicidade);
      guard++;
    }
  }

  return total;
}

/**
 * Próxima parcela a vencer (data >= hoje) dentro do mesmo grupo; se todas no passado, a última.
 */
export function nextParcelInGroup(siblings, referenceDate = new Date()) {
  if (!siblings?.length) return null;
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const withD = siblings
    .map((t) => ({ t, d: parseTxDate(t.data) }))
    .filter((x) => !Number.isNaN(x.d.getTime()));
  if (!withD.length) return null;
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const upcoming = withD.filter((x) => day(x.d) >= ref);
  if (upcoming.length) {
    return upcoming.sort((a, b) => a.d - b.d)[0].t;
  }
  return withD.sort((a, b) => b.d - a.d)[0].t;
}

