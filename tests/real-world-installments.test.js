/**
 * Teste Real de Parcelas em Cartão de Crédito (Jest)
 */

function parseBrDate(s) {
  const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const d = new Date(yy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function invoiceKeyFromDateAndCloseDay(dateObj, closeDay) {
  if (!dateObj || !(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  const cd = Math.min(31, Math.max(1, parseInt(closeDay, 10) || 10));
  const base = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  const invoiceMonth = dateObj.getDate() > cd ? new Date(base.getFullYear(), base.getMonth() + 1, 1) : base;
  const y = invoiceMonth.getFullYear();
  const m = String(invoiceMonth.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

describe('invoiceKeyFromDateAndCloseDay', () => {
  test('antes do fechamento: fatura do mês', () => {
    expect(invoiceKeyFromDateAndCloseDay(parseBrDate('10/04/2026'), 15)).toBe('2026-04');
  });

  test('após o fechamento: fatura do próximo mês', () => {
    expect(invoiceKeyFromDateAndCloseDay(parseBrDate('27/04/2026'), 15)).toBe('2026-05');
  });

  test('entrada inválida: null', () => {
    expect(invoiceKeyFromDateAndCloseDay(null, 10)).toBeNull();
  });
});

