/**
 * Testes de Projeção de Fim de Mês — GA$TOO
 * Cobre calcularProjecaoFimMes e classificarStatusProjecao
 */


// Mock do módulo chart para evitar problemas com ES modules
jest.mock('../src/utils/chart', () => ({
  parseBrDate: (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  },
}));

const { calcularProjecaoFimMes, classificarStatusProjecao } = require('../src/utils/projection');

// ─── calcularProjecaoFimMes ────────────────────────────────────────────────────

describe('calcularProjecaoFimMes', () => {
  const monthKey = '2026-04'; // abril: 30 dias

  // Caso 1: diasPassados < 5 → null
  test('retorna null quando diasPassados < 5 (dia 4 do mês)', () => {
    const hoje = new Date(2026, 3, 4); // dia 4 → diasPassados = 4
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 100000,
      transactions: [],
      monthKey,
      hoje,
    });
    expect(result).toBeNull();
  });

  // Caso 2: boundary diasPassados === 4 → null
  test('retorna null no boundary: diasPassados === 4', () => {
    const hoje = new Date(2026, 3, 4);
    expect(calcularProjecaoFimMes({ saldoAtualCentavos: 50000, transactions: [], monthKey, hoje })).toBeNull();
  });

  // Caso 3: boundary diasPassados === 5 → objeto
  test('retorna objeto no boundary: diasPassados === 5', () => {
    const hoje = new Date(2026, 3, 5); // dia 5 → diasPassados = 5
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 100000,
      transactions: [],
      monthKey,
      hoje,
    });
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('projecaoCentavos');
    expect(result.diasPassados).toBe(5);
  });

  // Caso 4: projeção positiva
  test('projeção positiva: saldo suficiente, gastos variáveis baixos', () => {
    const hoje = new Date(2026, 3, 15); // dia 15 → 15 passados, 15 restantes
    // Gasto variável concluído: R$ 150,00 em 15 dias → média R$ 10/dia → projeção: 100000 - 10*15*100 = 100000 - 15000 = 85000
    const transactions = [
      { tipo: 'saída', valor: 150.00, data: '10/04/2026', categoria: 'Alimentação' },
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 100000,
      transactions,
      monthKey,
      hoje,
    });
    expect(result).not.toBeNull();
    expect(result.projecaoCentavos).toBeGreaterThan(0);
  });

  // Caso 5: projeção negativa
  test('projeção negativa: gastos altos → projecaoCentavos < 0', () => {
    const hoje = new Date(2026, 3, 15);
    // Gastos totais: R$ 9000 em 15 dias → média R$ 600/dia → projeção: 10000 - 600*15*100 = 1000000 - 900000...
    // Use saldo baixo e gastos altos
    const transactions = [
      { tipo: 'saída', valor: 900.00, data: '10/04/2026', categoria: 'Alimentação' },
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 1000, // R$ 10,00
      transactions,
      monthKey,
      hoje,
    });
    expect(result).not.toBeNull();
    expect(result.projecaoCentavos).toBeLessThan(0);
  });

  // Caso 6: exclui transações com isTransfer: true
  test('exclui transações com isTransfer: true do cálculo', () => {
    const hoje = new Date(2026, 3, 15);
    const txComTransfer = [
      { tipo: 'saída', valor: 5000.00, data: '10/04/2026', categoria: 'Transferência', isTransfer: true },
    ];
    const txSemTransfer = [];
    const r1 = calcularProjecaoFimMes({ saldoAtualCentavos: 100000, transactions: txComTransfer, monthKey, hoje });
    const r2 = calcularProjecaoFimMes({ saldoAtualCentavos: 100000, transactions: txSemTransfer, monthKey, hoje });
    expect(r1.projecaoCentavos).toBe(r2.projecaoCentavos);
    expect(r1.gastoVariavelConcluido).toBe(0);
  });

  // Caso 7: exclui despesas de categoriasFixas da média diária variável
  test('exclui despesas de categoriasFixas da média diária variável', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'saída', valor: 1000.00, data: '10/04/2026', categoria: 'Moradia' },
      { tipo: 'saída', valor: 100.00, data: '10/04/2026', categoria: 'Alimentação' },
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 500000,
      transactions,
      monthKey,
      hoje,
      categoriasFixas: ['Moradia'],
    });
    // Só R$ 100 (Alimentação) entra na média — Moradia é fixa e está no passado sem ser pendente
    expect(result.gastoVariavelConcluido).toBe(10000); // 100 * 100 centavos
  });

  // Caso 8: inclui receitas pendentes (data futura no mês)
  test('inclui receitas pendentes (data futura no mês)', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'entrada', valor: 500.00, data: '25/04/2026' }, // futura
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 100000,
      transactions,
      monthKey,
      hoje,
    });
    expect(result.receitasPendentesCentavos).toBe(50000); // R$ 500 = 50000 centavos
    expect(result.projecaoCentavos).toBeGreaterThan(100000); // saldo + receita pendente
  });

  // Caso 9: inclui despesas pendentes (data futura no mês)
  test('inclui despesas pendentes (data futura no mês)', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'saída', valor: 200.00, data: '28/04/2026' }, // futura
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 100000,
      transactions,
      monthKey,
      hoje,
    });
    expect(result.despesasPendentesCentavos).toBe(20000); // R$ 200 = 20000 centavos
    expect(result.projecaoCentavos).toBeLessThan(100000);
  });

  // Caso 10: cálculo em centavos sem erro de float
  test('cálculo em centavos sem erro de float (valores com decimais)', () => {
    const hoje = new Date(2026, 3, 10); // dia 10 → 10 passados, 20 restantes
    const transactions = [
      { tipo: 'saída', valor: 33.33, data: '05/04/2026', categoria: 'Alimentação' },
      { tipo: 'saída', valor: 11.11, data: '08/04/2026', categoria: 'Transporte' },
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 1000000,
      transactions,
      monthKey,
      hoje,
    });
    expect(result).not.toBeNull();
    // gastoVariavelConcluido deve ser inteiro (centavos)
    expect(Number.isInteger(result.gastoVariavelConcluido)).toBe(true);
    expect(Number.isInteger(result.mediaDiariaVariavelCentavos)).toBe(true);
    expect(Number.isInteger(result.projecaoCentavos)).toBe(true);
  });

  // Caso 11: mês sem transações → projecao = saldoAtual
  test('mês sem transações (array vazio) → projecao = saldoAtual', () => {
    const hoje = new Date(2026, 3, 15);
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 75000,
      transactions: [],
      monthKey,
      hoje,
    });
    expect(result).not.toBeNull();
    expect(result.projecaoCentavos).toBe(75000);
  });
});

// ─── classificarStatusProjecao ─────────────────────────────────────────────────

describe('classificarStatusProjecao', () => {
  // Caso 1: projecao >= 20% do saldoInicial → 'verde'
  test("projecao >= 20% saldoInicial → 'verde'", () => {
    expect(classificarStatusProjecao(2000, 10000)).toBe('verde'); // 20% exato
    expect(classificarStatusProjecao(5000, 10000)).toBe('verde'); // 50%
  });

  // Caso 2: projecao >= 0 e < 20% → 'amarelo'
  test("projecao >= 0 e < 20% do saldoInicial → 'amarelo'", () => {
    expect(classificarStatusProjecao(1000, 10000)).toBe('amarelo'); // 10%
    expect(classificarStatusProjecao(500, 10000)).toBe('amarelo'); // 5%
  });

  // Caso 3: projecao < 0 → 'vermelho'
  test("projecao < 0 → 'vermelho'", () => {
    expect(classificarStatusProjecao(-1, 10000)).toBe('vermelho');
    expect(classificarStatusProjecao(-9999, 10000)).toBe('vermelho');
  });

  // Caso 4: edge projecao === 0 → 'amarelo'
  test("edge: projecao === 0 → 'amarelo'", () => {
    expect(classificarStatusProjecao(0, 10000)).toBe('amarelo');
  });

  // Caso 5: edge saldoInicial === 0 e projecao >= 0 → 'verde'
  test("edge: saldoInicial === 0 e projecao >= 0 → 'verde' (sem divisão por zero)", () => {
    expect(classificarStatusProjecao(0, 0)).toBe('verde');
    expect(classificarStatusProjecao(100, 0)).toBe('verde');
  });

  // Caso 6: edge saldoInicial === 0 e projecao < 0 → 'vermelho'
  test("edge: saldoInicial === 0 e projecao < 0 → 'vermelho'", () => {
    expect(classificarStatusProjecao(-100, 0)).toBe('vermelho');
  });

  // Caso extra: saldoInicial negativo e projecao >= 0 → 'verde'
  test("saldoInicial negativo e projecao >= 0 → 'verde'", () => {
    expect(classificarStatusProjecao(0, -5000)).toBe('verde');
  });
});

// ─── Cobertura de branches adicionais ─────────────────────────────────────────

describe('calcularProjecaoFimMes — branches adicionais', () => {
  const monthKey = '2026-04';

  // Mês não-atual: todos os dias contam (diasPassados = totalDiasMes)
  test('monthKey de mês passado: usa totalDiasMes como diasPassados', () => {
    const hoje = new Date(2026, 3, 28); // abril 2026 (mês atual)
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 100000,
      transactions: [],
      monthKey: '2026-03', // março — mês passado
      hoje,
    });
    // março tem 31 dias, diasPassados = 31 ≥ 5 → deve retornar objeto
    expect(result).not.toBeNull();
    expect(result.diasPassados).toBe(31);
    expect(result.diasRestantes).toBe(0);
  });

  // Transação com data inválida é ignorada
  test('transação com data inválida é ignorada', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'saída', valor: 100, data: null },
      { tipo: 'saída', valor: 100, data: 'invalido' },
    ];
    const result = calcularProjecaoFimMes({ saldoAtualCentavos: 100000, transactions, monthKey, hoje });
    expect(result.gastoVariavelConcluido).toBe(0);
  });

  // Receita concluída (não pendente) não afeta receitasPendentes
  test('receita concluída (passada) não entra em receitasPendentesCentavos', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'entrada', valor: 1000, data: '05/04/2026' }, // passada
    ];
    const result = calcularProjecaoFimMes({ saldoAtualCentavos: 100000, transactions, monthKey, hoje });
    expect(result.receitasPendentesCentavos).toBe(0);
  });

  // Despesa fixa pendente entra em despesasPendentes mas não em gastoVariavelConcluido
  test('despesa fixa futura entra em despesasPendentes', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'saída', valor: 800, data: '28/04/2026', categoria: 'Moradia' }, // futura + fixa
    ];
    const result = calcularProjecaoFimMes({
      saldoAtualCentavos: 200000,
      transactions,
      monthKey,
      hoje,
      categoriasFixas: ['Moradia'],
    });
    expect(result.despesasPendentesCentavos).toBe(80000);
    expect(result.gastoVariavelConcluido).toBe(0);
  });

  // tx.valor undefined → Math.round(0) = 0
  test('transação sem valor (undefined) não causa erro', () => {
    const hoje = new Date(2026, 3, 15);
    const transactions = [
      { tipo: 'saída', data: '10/04/2026', categoria: 'Alimentação' }, // sem valor
    ];
    const result = calcularProjecaoFimMes({ saldoAtualCentavos: 100000, transactions, monthKey, hoje });
    expect(result.gastoVariavelConcluido).toBe(0);
  });
});
