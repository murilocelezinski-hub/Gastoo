/**
 * Testes de Parcelas — GA$TOO
 * Valida criação de datas e cálculo de valores de parcelas por periodicidade.
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

function formatBrDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
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

describe('parseBrDate', () => {
  test('retorna Date para data válida', () => {
    const d = parseBrDate('15/04/2026');
    expect(d).toBeInstanceOf(Date);
    expect(d.getDate()).toBe(15);
    expect(d.getMonth()).toBe(3); // abril = 3
    expect(d.getFullYear()).toBe(2026);
  });

  test('retorna null para string vazia', () => {
    expect(parseBrDate('')).toBeNull();
    expect(parseBrDate(null)).toBeNull();
    expect(parseBrDate(undefined)).toBeNull();
  });

  test('retorna null para formato inválido', () => {
    expect(parseBrDate('2026-04-15')).toBeNull();
    expect(parseBrDate('abc')).toBeNull();
  });
});

describe('getInstallmentDates — periodicidades', () => {
  const start = parseBrDate('15/04/2026');

  test('mensal: gera 12 datas com intervalo de 30 dias', () => {
    const dates = getInstallmentDates(start, 'mensal', 12);
    expect(dates).toHaveLength(12);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(30);
  });

  test('semanal: gera 12 datas com intervalo de 7 dias', () => {
    const dates = getInstallmentDates(start, 'semanal', 12);
    expect(dates).toHaveLength(12);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(7);
  });

  test('quinzenal: gera 12 datas com intervalo de 14 dias', () => {
    const dates = getInstallmentDates(start, 'quinzenal', 12);
    expect(dates).toHaveLength(12);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(14);
  });

  test('diaria: gera 5 datas com intervalo de 1 dia', () => {
    const dates = getInstallmentDates(start, 'diaria', 5);
    expect(dates).toHaveLength(5);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(1);
  });

  test('trimestral: gera datas com intervalo de 90 dias', () => {
    const dates = getInstallmentDates(start, 'trimestral', 4);
    expect(dates).toHaveLength(4);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(90);
  });

  test('anual: gera datas com intervalo de 365 dias', () => {
    const dates = getInstallmentDates(start, 'anual', 2);
    expect(dates).toHaveLength(2);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(365);
  });

  test('periodicidade desconhecida usa 30 dias como padrão', () => {
    const dates = getInstallmentDates(start, 'inexistente', 2);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(30);
  });

  test('primeira data é igual à data de início', () => {
    const dates = getInstallmentDates(start, 'mensal', 3);
    expect(formatBrDate(dates[0])).toBe('15/04/2026');
  });
});

describe('splitInstallmentAmounts — distribuição de centavos', () => {
  test('valor exato divisível: todas as parcelas iguais', () => {
    const parts = splitInstallmentAmounts(12.00, 4);
    expect(parts).toHaveLength(4);
    parts.forEach((p) => expect(p).toBeCloseTo(3.00, 2));
  });

  test('soma das parcelas é sempre igual ao total original', () => {
    const parts = splitInstallmentAmounts(1200, 12);
    const soma = parts.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(1200, 2);
  });

  test('ajuste de centavos na última parcela (R$ 100,00 / 3)', () => {
    const parts = splitInstallmentAmounts(100, 3);
    // 33,33 + 33,33 + 33,34
    const soma = parts.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(100, 2);
    expect(parts).toHaveLength(3);
  });

  test('valor zero retorna array de zeros', () => {
    const parts = splitInstallmentAmounts(0, 5);
    expect(parts).toHaveLength(5);
    parts.forEach((p) => expect(p).toBe(0));
  });

  test('valor negativo é tratado como zero', () => {
    const parts = splitInstallmentAmounts(-500, 3);
    parts.forEach((p) => expect(p).toBe(0));
  });

  test('n=1 retorna apenas o valor total', () => {
    const parts = splitInstallmentAmounts(99.99, 1);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toBeCloseTo(99.99, 2);
  });

  test('erro de ponto flutuante: R$ 5400 / 12', () => {
    const parts = splitInstallmentAmounts(5400, 12);
    const soma = parts.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(5400, 2);
  });
});

describe('formatBrDate', () => {
  test('formata corretamente para DD/MM/YYYY', () => {
    const d = new Date(2026, 3, 5); // 5 de abril de 2026
    expect(formatBrDate(d)).toBe('05/04/2026');
  });

  test('zero-padding em dia e mês < 10', () => {
    const d = new Date(2026, 0, 1); // 1 de janeiro
    expect(formatBrDate(d)).toBe('01/01/2026');
  });
});
