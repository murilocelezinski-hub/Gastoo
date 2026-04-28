import { parseBrDate } from './chart';

function toCents(v) {
  // Opera estritamente em centavos (inteiros). Evita flutuação de ponto flutuante.
  return Math.round((Number(v) || 0) * 100);
}

function fromCents(cents) {
  return (Number(cents) || 0) / 100;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameMonth(d, ref) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function isPendingInCurrentMonth(tx, nowDay) {
  const d = parseBrDate(tx?.data);
  if (!d) return false;
  if (!isSameMonth(d, nowDay)) return false;
  // Pendente = data futura no mês (strictly after hoje).
  return startOfDay(d).getTime() > nowDay.getTime();
}

function isEffectiveOnOrBefore(tx, asOfDay) {
  if (!tx?.data) return true;
  const tDate = parseBrDate(tx.data);
  if (!tDate || Number.isNaN(tDate.getTime())) return true;
  return startOfDay(tDate).getTime() <= asOfDay.getTime();
}

/**
 * Projeção de fim de mês (centavos).
 *
 * Regras:
 * - Projeção = Saldo Atual + Receitas Pendentes (mês) - Despesas Pendentes (mês) - (Média Diária Variável * Dias Restantes do Mês)
 * - Média Diária Variável = soma dos gastos concluídos (não fixos) / dias passados do mês
 * - Trava: exige histórico mínimo de 5 dias no mês atual (hoje >= dia 5). Caso contrário, retorna null.
 * - Estritamente em centavos.
 *
 * @returns {null | { projectionCents: number, breakdown: object }}
 */
export function computeMonthEndProjectionCents({ accounts, transactions, now = new Date() }) {
  const today = startOfDay(now);
  const dayOfMonth = today.getDate();
  if (dayOfMonth < 5) return null;

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
  const daysPassed = Math.max(1, dayOfMonth); // inclui hoje

  // Saldo atual (em centavos): soma por conta não arquivada, respeitando a regra de "efetivo até hoje".
  // Usa lógica equivalente ao totalBalance/balanceForAccount, mas em centavos.
  const activeAccounts = (Array.isArray(accounts) ? accounts : []).filter((a) => !a?.archived);
  const activeIds = new Set(activeAccounts.map((a) => a.id));

  const saldoInicialCents = activeAccounts.reduce((sum, a) => sum + toCents(a?.saldoInicial), 0);

  let saldoAtualCents = saldoInicialCents;
  for (const t of Array.isArray(transactions) ? transactions : []) {
    if (!t) continue;
    if (!activeIds.has(t.accountId)) continue;
    if (!isEffectiveOnOrBefore(t, today)) continue;
    const v = toCents(t.valor);
    if (t.tipo === 'entrada') saldoAtualCents += v;
    else if (t.tipo === 'saída') saldoAtualCents -= v;
  }

  let receitasPendentesCents = 0;
  let despesasPendentesCents = 0;
  let gastosVariaveisConcluidosCents = 0;

  for (const t of Array.isArray(transactions) ? transactions : []) {
    if (!t) continue;
    if (!activeIds.has(t.accountId)) continue;
    if (t.isTransfer) continue;

    // Pendências do mês atual (por data futura).
    if (isPendingInCurrentMonth(t, today)) {
      if (t.tipo === 'entrada') receitasPendentesCents += toCents(t.valor);
      else if (t.tipo === 'saída') despesasPendentesCents += toCents(t.valor);
      continue;
    }

    // Gastos concluídos do mês atual, não fixos (para média diária variável).
    const td = parseBrDate(t.data);
    if (!td) continue;
    if (!isSameMonth(td, today)) continue;
    if (t.tipo !== 'saída') continue;
    if (t.gastoTipo === 'fixo') continue;
    gastosVariaveisConcluidosCents += toCents(t.valor);
  }

  // Média diária variável (centavos/dia): divisão inteira (piso) para não otimizar artificialmente.
  const mediaDiariaVariavelCents = Math.floor(gastosVariaveisConcluidosCents / daysPassed);

  const projectionCents =
    saldoAtualCents +
    receitasPendentesCents -
    despesasPendentesCents -
    mediaDiariaVariavelCents * daysRemaining;

  return {
    projectionCents,
    breakdown: {
      saldoAtualCents,
      saldoInicialCents,
      receitasPendentesCents,
      despesasPendentesCents,
      gastosVariaveisConcluidosCents,
      mediaDiariaVariavelCents,
      daysPassed,
      daysRemaining,
      daysInMonth,
      // versões em reais para UI (conveniência)
      saldoAtual: fromCents(saldoAtualCents),
      saldoInicial: fromCents(saldoInicialCents),
      receitasPendentes: fromCents(receitasPendentesCents),
      despesasPendentes: fromCents(despesasPendentesCents),
      gastosVariaveisConcluidos: fromCents(gastosVariaveisConcluidosCents),
      mediaDiariaVariavel: fromCents(mediaDiariaVariavelCents),
    },
  };
}

export function projectionStatus({ projectionCents, saldoInicialCents }) {
  if (projectionCents == null) return 'collecting'; // UI: cinza
  const base = Math.max(1, Number(saldoInicialCents) || 0);
  if (projectionCents < 0) return 'critical';
  if (projectionCents < Math.floor(base * 0.2)) return 'warning';
  return 'ok';
}

