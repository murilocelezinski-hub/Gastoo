import { computeMonthEndProjectionCents, projectionStatus } from '../src/utils/monthEndProjection';

function tx({ id, tipo, valor, data, categoria = 'Outros', accountId = 'a1', isTransfer = false, gastoTipo = 'nenhum' }) {
  return { id, tipo, valor, data, categoria, accountId, isTransfer, gastoTipo };
}

function acc({ id = 'a1', saldoInicial = 0, archived = false }) {
  return { id, saldoInicial, archived };
}

describe('computeMonthEndProjectionCents', () => {
  test('retorna null quando histórico no mês é < 5 dias (trava)', () => {
    const res = computeMonthEndProjectionCents({
      accounts: [acc({ saldoInicial: 100 })],
      transactions: [],
      now: new Date(2026, 3, 4), // 04/04/2026
    });
    expect(res).toBeNull();
  });

  test('cálculo base com pendências e média diária variável em centavos', () => {
    // Agora: 10/04/2026 (dia 10, restam 20 dias em abril de 30)
    const now = new Date(2026, 3, 10);

    const accounts = [acc({ id: 'a1', saldoInicial: 1000 })];

    const transactions = [
      // Concluídos até hoje:
      tx({ id: 'e1', tipo: 'entrada', valor: 200, data: '05/04/2026', accountId: 'a1' }), // +200
      tx({ id: 's1', tipo: 'saída', valor: 50, data: '06/04/2026', accountId: 'a1', categoria: 'Lazer' }), // -50
      tx({ id: 's2', tipo: 'saída', valor: 50, data: '07/04/2026', accountId: 'a1', categoria: 'Lazer' }), // -50
      // Fixo concluído (não entra na média variável, mas afeta saldo):
      tx({ id: 'fx', tipo: 'saída', valor: 100, data: '08/04/2026', accountId: 'a1', gastoTipo: 'fixo', categoria: 'Moradia' }),
      // Tipo desconhecido: não afeta saldo nem pendências/média (cobre ramo)
      tx({ id: 'weird', tipo: 'ajuste', valor: 999, data: '08/04/2026', accountId: 'a1', categoria: 'Outros' }),

      // Pendentes no mês (futuros):
      tx({ id: 'pIn', tipo: 'entrada', valor: 300, data: '20/04/2026', accountId: 'a1' }),
      tx({ id: 'pOut', tipo: 'saída', valor: 150, data: '22/04/2026', accountId: 'a1', categoria: 'Alimentação' }),
      // Pendente com tipo desconhecido: não entra em receitas/despesas pendentes (cobre ramo)
      tx({ id: 'pWeird', tipo: 'ajuste', valor: 999, data: '25/04/2026', accountId: 'a1', categoria: 'Outros' }),
      // Elemento nulo: ignorado (cobre ramo)
      null,
    ];

    const res = computeMonthEndProjectionCents({ accounts, transactions, now });
    expect(res).not.toBeNull();

    // saldo inicial = 1000.00 => 100000 centavos
    // saldo atual: +200 -50 -50 -100 = +0 => 1000.00
    expect(res.breakdown.saldoInicialCents).toBe(100000);
    expect(res.breakdown.saldoAtualCents).toBe(100000);

    // pendentes
    expect(res.breakdown.receitasPendentesCents).toBe(30000);
    expect(res.breakdown.despesasPendentesCents).toBe(15000);

    // média variável: (50+50) / daysPassed(10) = 10000/10 = 1000 centavos => R$ 10,00/dia
    expect(res.breakdown.gastosVariaveisConcluidosCents).toBe(10000);
    expect(res.breakdown.mediaDiariaVariavelCents).toBe(1000);
    expect(res.breakdown.daysRemaining).toBe(20);

    // projeção = 100000 + 30000 - 15000 - (1000*20) = 95000 centavos
    expect(res.projectionCents).toBe(95000);
  });

  test('ignora transferências e transações de contas arquivadas', () => {
    const now = new Date(2026, 3, 10);
    const accounts = [
      acc({ id: 'a1', saldoInicial: 1000 }),
      acc({ id: 'a2', saldoInicial: 500, archived: true }),
    ];
    const transactions = [
      tx({ id: 't1', tipo: 'saída', valor: 999, data: '09/04/2026', accountId: 'a1', isTransfer: true, categoria: 'Transferência' }),
      tx({ id: 't2', tipo: 'entrada', valor: 999, data: '09/04/2026', accountId: 'a2' }),
    ];
    const res = computeMonthEndProjectionCents({ accounts, transactions, now });
    expect(res.breakdown.saldoInicialCents).toBe(100000);
    // Transferência afeta saldo (é efetiva), mas não entra em pendências/média variável.
    expect(res.breakdown.saldoAtualCents).toBe(100);
  });

  test('trata data inválida como efetiva (não quebra) e não conta em média/pendência', () => {
    const now = new Date(2026, 3, 10);
    const res = computeMonthEndProjectionCents({
      accounts: [acc({ id: 'a1', saldoInicial: 10 })],
      transactions: [
        tx({ id: 'bad', tipo: 'saída', valor: 1, data: 'invalid', accountId: 'a1', categoria: 'Lazer' }),
      ],
      now,
    });
    expect(res.breakdown.saldoAtualCents).toBe(900); // 10 - 1
    expect(res.breakdown.gastosVariaveisConcluidosCents).toBe(0);
    expect(res.breakdown.receitasPendentesCents).toBe(0);
    expect(res.breakdown.despesasPendentesCents).toBe(0);
  });

  test('não explode com entradas vazias e mantém inteiros', () => {
    const now = new Date(2026, 3, 10);
    const res = computeMonthEndProjectionCents({ accounts: [], transactions: null, now });
    expect(res.breakdown.saldoInicialCents).toBe(0);
    expect(Number.isInteger(res.projectionCents)).toBe(true);
  });

  test('cobre ramos: sem data, mês diferente, entrada no mês e conta não ativa', () => {
    const now = new Date(2026, 3, 10);
    const accounts = [acc({ id: 'a1', saldoInicial: 100 })];
    const transactions = [
      // sem data: efetiva para saldo, mas não entra em pendência/média
      { id: 'nodate', tipo: 'saída', valor: 1, accountId: 'a1', categoria: 'Outros' },
      // conta não ativa: ignorada
      tx({ id: 'otherAcc', tipo: 'saída', valor: 999, data: '09/04/2026', accountId: 'aX', categoria: 'Lazer' }),
      // mês diferente: não entra em pendências/média
      tx({ id: 'otherMonth', tipo: 'saída', valor: 5, data: '10/03/2026', accountId: 'a1', categoria: 'Lazer' }),
      // entrada concluída no mês: afeta saldo mas não entra na média variável
      tx({ id: 'in', tipo: 'entrada', valor: 10, data: '09/04/2026', accountId: 'a1', categoria: 'Outros' }),
      // pendência em mês diferente não conta como pendente do mês atual
      tx({ id: 'pendingOtherMonth', tipo: 'saída', valor: 50, data: '02/05/2026', accountId: 'a1', categoria: 'Alimentação' }),
    ];
    const res = computeMonthEndProjectionCents({ accounts, transactions, now });
    // saldo: 100 - 1 + 10 = 109
    // saldo: 100 - 1 - 5 + 10 = 104
    expect(res.breakdown.saldoAtualCents).toBe(10400);
    expect(res.breakdown.gastosVariaveisConcluidosCents).toBe(0);
    expect(res.breakdown.despesasPendentesCents).toBe(0);
  });
});

describe('projectionStatus', () => {
  test('collecting quando projection é null', () => {
    expect(projectionStatus({ projectionCents: null, saldoInicialCents: 10000 })).toBe('collecting');
  });

  test('critical quando projection < 0', () => {
    expect(projectionStatus({ projectionCents: -1, saldoInicialCents: 10000 })).toBe('critical');
  });

  test('warning quando projection < 20% do saldo inicial', () => {
    expect(projectionStatus({ projectionCents: 1999, saldoInicialCents: 10000 })).toBe('warning');
  });

  test('ok quando projection >= 20% do saldo inicial', () => {
    expect(projectionStatus({ projectionCents: 2000, saldoInicialCents: 10000 })).toBe('ok');
  });

  test('ok quando saldo inicial é 0 (evita divisão por zero)', () => {
    expect(projectionStatus({ projectionCents: 1, saldoInicialCents: 0 })).toBe('ok');
  });
});

