/**
 * Histórico — Transações de Cartão de Crédito
 * Valida que transações feitas no cartão aparecem no histórico,
 * agrupadas como item sintético "Fatura cartão [mês]" (espelha HistoryScreen).
 */

function parseBrDate(s) {
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

// Espelha byMonth + byMonthWithInvoices do HistoryScreen
function buildHistoryMonth(transactions, selMonth, selYear) {
  const byMonth = [];
  for (const t of transactions) {
    if (!t?.data || typeof t.data !== 'string') continue;
    const p = t.data.split('/');
    if (p.length === 3 && parseInt(p[1], 10) === selMonth && parseInt(p[2], 10) === selYear) {
      byMonth.push(t);
    }
  }

  const invoiceGroups = {};
  const nonCard = [];
  for (const t of byMonth) {
    if (t.creditCardId && t.invoiceKey && !t.isTransfer) {
      const key = `${t.creditCardId}::${t.invoiceKey}`;
      if (!invoiceGroups[key]) {
        invoiceGroups[key] = {
          id: `invoice-group-${key}`,
          __invoiceGroup: true,
          creditCardId: t.creditCardId,
          invoiceKey: t.invoiceKey,
          tipo: 'saída',
          valor: 0,
          count: 0,
          data: t.data,
        };
      }
      invoiceGroups[key].valor += t.valor;
      invoiceGroups[key].count += 1;
      if (t.data > invoiceGroups[key].data) invoiceGroups[key].data = t.data;
    } else {
      nonCard.push(t);
    }
  }

  return [...nonCard, ...Object.values(invoiceGroups)];
}

describe('HistoryScreen — transações de cartão de crédito', () => {
  const transactions = [
    {
      id: 1, tipo: 'saída', valor: 150, descricao: 'iFood',
      categoria: 'Alimentação', data: '05/05/2026',
      accountId: 'acc1', creditCardId: 'card1', invoiceKey: '2026-06',
    },
    {
      id: 2, tipo: 'saída', valor: 250, descricao: 'Mercado',
      categoria: 'Alimentação', data: '10/05/2026',
      accountId: 'acc1', creditCardId: 'card1', invoiceKey: '2026-06',
    },
    {
      id: 3, tipo: 'saída', valor: 80, descricao: 'Padaria',
      categoria: 'Alimentação', data: '15/05/2026',
      accountId: 'acc1', creditCardId: null,
    },
    {
      id: 4, tipo: 'entrada', valor: 5000, descricao: 'Salário',
      categoria: 'Renda', data: '01/05/2026', accountId: 'acc1',
    },
  ];

  test('inclui as transações de cartão do mês selecionado', () => {
    const items = buildHistoryMonth(transactions, 5, 2026);
    // 1 grupo de fatura + 1 saída débito + 1 entrada
    expect(items).toHaveLength(3);
  });

  test('agrupa gastos do mesmo cartão/fatura em um item sintético com soma correta', () => {
    const items = buildHistoryMonth(transactions, 5, 2026);
    const group = items.find((i) => i.__invoiceGroup);
    expect(group).toBeDefined();
    expect(group.creditCardId).toBe('card1');
    expect(group.invoiceKey).toBe('2026-06');
    expect(group.valor).toBe(400);
    expect(group.count).toBe(2);
    expect(group.tipo).toBe('saída');
  });

  test('transações sem cartão NÃO entram no grupo de fatura', () => {
    const items = buildHistoryMonth(transactions, 5, 2026);
    const debito = items.find((i) => i.id === 3);
    const salario = items.find((i) => i.id === 4);
    expect(debito).toBeDefined();
    expect(salario).toBeDefined();
    expect(debito.__invoiceGroup).toBeUndefined();
    expect(salario.__invoiceGroup).toBeUndefined();
  });

  test('transações de cartão fora do mês selecionado são ignoradas', () => {
    const extra = [
      ...transactions,
      {
        id: 5, tipo: 'saída', valor: 999, descricao: 'Fora do mês',
        categoria: 'Lazer', data: '07/04/2026',
        accountId: 'acc1', creditCardId: 'card1', invoiceKey: '2026-05',
      },
    ];
    const items = buildHistoryMonth(extra, 5, 2026);
    const totalCardio = items
      .filter((i) => i.__invoiceGroup)
      .reduce((s, i) => s + i.valor, 0);
    expect(totalCardio).toBe(400);
  });

  test('faturas distintas (cartões/meses diferentes) viram grupos separados', () => {
    const multi = [
      ...transactions,
      {
        id: 6, tipo: 'saída', valor: 60, descricao: 'Uber',
        categoria: 'Transporte', data: '20/05/2026',
        accountId: 'acc1', creditCardId: 'card2', invoiceKey: '2026-06',
      },
    ];
    const items = buildHistoryMonth(multi, 5, 2026);
    const groups = items.filter((i) => i.__invoiceGroup);
    expect(groups).toHaveLength(2);
  });
});
