// Funções puras para projeção de fim de mês — operam em centavos

import { parseBrDate } from './chart';

/**
 * Calcula a projeção de saldo ao fim do mês corrente.
 * @param {Object} params
 * @param {number} params.saldoAtualCentavos - Saldo atual em centavos
 * @param {Object[]} params.transactions - Array de transações do FinanceContext
 * @param {string} params.monthKey - "YYYY-MM"
 * @param {Date} params.hoje - Data de referência (padrão: hoje)
 * @param {string[]} params.categoriasFixas - Categorias consideradas fixas (ex: ['Moradia', 'Assinaturas'])
 * @returns {Object|null} Retorna null se dias passados < 5 (sem dados suficientes)
 */
export function calcularProjecaoFimMes({
  saldoAtualCentavos,
  transactions,
  monthKey,
  hoje = new Date(),
  categoriasFixas = [],
}) {
  const [y, mo] = monthKey.split('-').map(Number);
  const ultimoDia = new Date(y, mo, 0);
  const totalDiasMes = ultimoDia.getDate();

  // Dias do mês já ocorridos até hoje (inclusive)
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth() + 1;
  const anoHoje = hoje.getFullYear();
  const estaMesAtual = anoHoje === y && mesHoje === mo;
  const diasPassados = estaMesAtual ? diaHoje : totalDiasMes;
  const diasRestantes = totalDiasMes - diasPassados;

  // Sem dados suficientes para projeção confiável
  if (diasPassados < 5) return null;

  // Normaliza "hoje" para fim do dia para comparação correta
  const hojeNormalizado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);

  // Filtra transações do mês referenciado (exclui transferências)
  const txDoMes = transactions.filter((tx) => {
    if (tx.isTransfer) return false;
    const data = parseBrDate(tx.data);
    if (!data) return false;
    return data.getFullYear() === y && data.getMonth() + 1 === mo;
  });

  let receitasPendentesCentavos = 0;
  let despesasPendentesCentavos = 0;
  let gastoVariavelConcluido = 0;

  for (const tx of txDoMes) {
    const data = parseBrDate(tx.data);
    if (!data) continue;

    // Normaliza data da transação para comparação por dia
    const dataTx = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const valorCentavos = Math.round((tx.valor || 0) * 100);
    const isPendente = dataTx > new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const isConcluido = !isPendente;

    if (tx.tipo === 'entrada') {
      // Receitas futuras ainda a receber
      if (isPendente) receitasPendentesCentavos += valorCentavos;
    } else if (tx.tipo === 'saída') {
      if (isPendente) {
        // Despesas futuras já agendadas (fixas ou não)
        despesasPendentesCentavos += valorCentavos;
      } else if (isConcluido) {
        // Apenas gastos variáveis concluídos entram na média diária
        const categoria = tx.categoria || '';
        if (!categoriasFixas.includes(categoria)) {
          gastoVariavelConcluido += valorCentavos;
        }
      }
    }
  }

  // Média diária de gastos variáveis com base nos dias já passados
  const mediaDiariaVariavelCentavos = diasPassados > 0
    ? Math.round(gastoVariavelConcluido / diasPassados)
    : 0;

  // Projeção: saldo atual + receitas pendentes - despesas fixas pendentes - projeção de gastos variáveis
  const projecaoCentavos =
    saldoAtualCentavos +
    receitasPendentesCentavos -
    despesasPendentesCentavos -
    mediaDiariaVariavelCentavos * diasRestantes;

  return {
    projecaoCentavos,
    mediaDiariaVariavelCentavos,
    diasRestantes,
    receitasPendentesCentavos,
    despesasPendentesCentavos,
    gastoVariavelConcluido,
    diasPassados,
  };
}

/**
 * Classifica o status da projeção de fim de mês.
 * - vermelho: projeção negativa
 * - amarelo: projeção positiva mas abaixo de 20% do saldo inicial do mês
 * - verde: projeção saudável (>= 20% do saldo inicial do mês)
 *
 * @param {number} projecaoCentavos - Saldo projetado ao fim do mês (centavos)
 * @param {number} saldoInicialMesCentavos - Saldo no início do mês (centavos)
 * @returns {'verde'|'amarelo'|'vermelho'}
 */
export function classificarStatusProjecao(projecaoCentavos, saldoInicialMesCentavos) {
  if (projecaoCentavos < 0) return 'vermelho';
  if (saldoInicialMesCentavos <= 0) return projecaoCentavos >= 0 ? 'verde' : 'vermelho';
  if (projecaoCentavos >= saldoInicialMesCentavos * 0.20) return 'verde';
  return 'amarelo';
}
