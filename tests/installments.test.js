/**
 * Teste de Parcelas
 * Valida se as datas de parcelas avançam no tempo.
 */

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

describe('getInstallmentDates', () => {
  test('mensal cria 12 datas e avança no tempo', () => {
    const startDate = parseBrDate('15/04/2026');
    const dates = getInstallmentDates(startDate, 'mensal', 12);
    expect(dates).toHaveLength(12);
    expect(dates[0].getTime()).toBe(startDate.getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
    }
  });

  test('semanal avança ~7 dias', () => {
    const startDate = parseBrDate('15/04/2026');
    const dates = getInstallmentDates(startDate, 'semanal', 3);
    const diff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(7);
  });
});
