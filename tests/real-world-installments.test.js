/**
 * Testes de Integração: Parcelas em Cartão de Crédito — GA$TOO
 * Simula cenários reais de compras parceladas e valida chaves de fatura.
 */

// ─── Funções utilitárias locais (espelham FinanceContext) ──────────────────────

function parseBrDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const d = new Date(yy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(d, days) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function addMonths(d, months) {
  const dt = new Date(d.getFullYear(), d.getMonth() + months, 1);
  return dt;
}

function getInstallmentDates(startDate, periodo, numInstallments) {
  const dates = [];
  let current = new Date(startDate);
  const periodDays = {
    diaria: 1,
    semanal: 7,
    quinzenal: 14,
    mensal: 30,
    bimensal: 60,
    trimestral: 90,
    semestral: 180,
    anual: 365,
  };
  const days = periodDays[periodo] || 30;
  for (let i = 0; i < numInstallments; i++) {
    dates.push(new Date(current));
    current = addDays(current, days);
  }
  return dates;
}

/**
 * Determina a chave de fatura (YYYY-MM) a partir da data da transação e do dia de fechamento.
 * Se a data cai APÓS o fechamento, vai para a fatura do mês seguinte.
 */
function invoiceKeyFromDateAndCloseDay(dateObj, closeDay) {
  if (!dateObj || !(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  const cd = Math.min(31, Math.max(1, parseInt(closeDay, 10) || 10));
  const base = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  const invoiceMonth = dateObj.getDate() > cd ? addMonths(base, 1) : base;
  const y = invoiceMonth.getFullYear();
  const mm = String(invoiceMonth.getMonth() + 1).padStart(2, '0');
  return `${y}-${mm}`;
}

function splitInstallmentAmounts(total, n) {
  const safe = Math.max(0, Number(total) || 0);
  const ni = Math.max(1, Math.min(365, n));
  const cents = Math.round(safe * 100);
  if (cents === 0) return Array(ni).fill(0);
  const base = Math.floor(cents / ni);
  const parts = [];
  let acc = 0;
  for (let i = 0; i < ni - 1; i++) {
    parts.push(base / 100);
    acc += base;
  }
  parts.push((cents - acc) / 100);
  return parts;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('invoiceKeyFromDateAndCloseDay — lógica de fatura', () => {
  test('data antes do fechamento vai para fatura do mês atual', () => {
    // Dia 10 de abril, fechamento dia 15 → fatura abril
    const d = new Date(2026, 3, 10); // 10/04/2026
    expect(invoiceKeyFromDateAndCloseDay(d, 15)).toBe('2026-04');
  });

  test('data igual ao fechamento vai para fatura do mês atual', () => {
    const d = new Date(2026, 3, 15); // 15/04/2026
    expect(invoiceKeyFromDateAndCloseDay(d, 15)).toBe('2026-04');
  });

  test('data após o fechamento vai para fatura do mês seguinte', () => {
    // Dia 27 de abril, fechamento dia 15 → fatura maio
    const d = new Date(2026, 3, 27); // 27/04/2026
    expect(invoiceKeyFromDateAndCloseDay(d, 15)).toBe('2026-05');
  });

  test('virada de ano: dezembro após fechamento → janeiro do ano seguinte', () => {
    const d = new Date(2026, 11, 20); // 20/12/2026, fechamento dia 10
    expect(invoiceKeyFromDateAndCloseDay(d, 10)).toBe('2027-01');
  });

  test('dia de fechamento = 1: qualquer data > 1 vai para próximo mês', () => {
    const d = new Date(2026, 3, 2); // 02/04/2026
    expect(invoiceKeyFromDateAndCloseDay(d, 1)).toBe('2026-05');
  });

  test('retorna null para dateObj inválido', () => {
    expect(invoiceKeyFromDateAndCloseDay(null, 10)).toBeNull();
    expect(invoiceKeyFromDateAndCloseDay(undefined, 10)).toBeNull();
    expect(invoiceKeyFromDateAndCloseDay(new Date('invalid'), 10)).toBeNull();
  });

  test('closeDay inválido usa 10 como padrão', () => {
    const d = new Date(2026, 3, 5); // 05/04/2026
    expect(invoiceKeyFromDateAndCloseDay(d, 'abc')).toBe('2026-04');
  });
});

describe('Caso real 1: Eletrônico R$ 5400 / 12x no Itaú (fechamento dia 15)', () => {
  const closeDay = 15;
  const total = 5400;
  const n = 12;
  const startDate = parseBrDate('27/04/2026');

  test('gera exatamente 12 parcelas', () => {
    const dates = getInstallmentDates(startDate, 'mensal', n);
    expect(dates).toHaveLength(n);
  });

  test('soma das parcelas é R$ 5400,00 (sem perda de centavos)', () => {
    const amounts = splitInstallmentAmounts(total, n);
    const soma = amounts.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(total, 2);
  });

  test('primeira parcela (27/04) com fechamento dia 15 → fatura maio 2026', () => {
    // 27 > 15, então vai para a fatura de maio
    expect(invoiceKeyFromDateAndCloseDay(startDate, closeDay)).toBe('2026-05');
  });

  test('cada parcela tem valor correto R$ 450,00', () => {
    const amounts = splitInstallmentAmounts(total, n);
    // 5400 / 12 = 450,00 exato
    amounts.forEach((a) => expect(a).toBeCloseTo(450, 2));
  });
});

describe('Caso real 2: Educação R$ 2400 / 12x no Nubank (fechamento dia 5)', () => {
  const closeDay = 5;
  const total = 2400;
  const n = 12;
  const startDate = parseBrDate('01/05/2026');

  test('primeira parcela (01/05) com fechamento dia 5 → fatura maio 2026', () => {
    // 01 <= 05, vai para maio
    expect(invoiceKeyFromDateAndCloseDay(startDate, closeDay)).toBe('2026-05');
  });

  test('segunda parcela (30 dias depois = 31/05) com fechamento dia 5 → fatura junho 2026', () => {
    const dates = getInstallmentDates(startDate, 'mensal', 2);
    // 31 > 5, vai para junho
    expect(invoiceKeyFromDateAndCloseDay(dates[1], closeDay)).toBe('2026-06');
  });

  test('soma das parcelas = R$ 2400,00', () => {
    const amounts = splitInstallmentAmounts(total, n);
    const soma = amounts.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(total, 2);
  });
});

describe('Caso real 3: Assinatura R$ 1200 / 12x semanal (fechamento dia 20)', () => {
  const closeDay = 20;
  const total = 1200;
  const n = 12;
  const startDate = parseBrDate('20/04/2026');

  test('gera 12 parcelas com intervalo de 7 dias', () => {
    const dates = getInstallmentDates(startDate, 'semanal', n);
    expect(dates).toHaveLength(n);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(7);
  });

  test('soma das parcelas = R$ 1200,00 mesmo com arredondamentos semanais', () => {
    const amounts = splitInstallmentAmounts(total, n);
    const soma = amounts.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(total, 2);
  });

  test('primeira parcela (20/04) com fechamento dia 20 → fatura abril 2026', () => {
    // 20 <= 20, vai para abril
    expect(invoiceKeyFromDateAndCloseDay(startDate, closeDay)).toBe('2026-04');
  });

  test('segunda parcela (27/04) com fechamento dia 20 → fatura maio 2026', () => {
    const dates = getInstallmentDates(startDate, 'semanal', 2);
    // 27 > 20, vai para maio
    expect(invoiceKeyFromDateAndCloseDay(dates[1], closeDay)).toBe('2026-05');
  });
});
