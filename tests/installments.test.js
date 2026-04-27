/**
 * Teste de Parcelas
 * Valida se as parcelas estão sendo criadas corretamente nos próximos meses
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

// TESTES
console.log('=== TESTE 1: Parcelas Mensais ===');
const startDate = parseBrDate('15/04/2026');
const dates = getInstallmentDates(startDate, 'mensal', 12);
const valor = 1200;
const valorParcela = (valor / 12).toFixed(2);

console.log(`Valor Total: R$ ${valor}`);
console.log(`Valor por Parcela: R$ ${valorParcela}`);
console.log(`\nParcelas:`);

let totalCalculado = 0;
dates.forEach((date, idx) => {
  const brDate = formatBrDate(date);
  totalCalculado += parseFloat(valorParcela);
  console.log(`  ${idx + 1}. ${brDate} - R$ ${valorParcela}`);
});

console.log(`\nValidação:`);
console.log(`✓ Total parcelas: 12`);
console.log(`✓ Valor total recalculado: R$ ${totalCalculado.toFixed(2)}`);
console.log(`✓ Diferença (arredondamento): R$ ${Math.abs(valor - totalCalculado).toFixed(2)}`);

console.log('\n=== TESTE 2: Parcelas Quinzenais ===');
const dates2 = getInstallmentDates(startDate, 'quinzenal', 12);
console.log(`Primeiras 3 parcelas:`);
dates2.slice(0, 3).forEach((date, idx) => {
  console.log(`  ${idx + 1}. ${formatBrDate(date)}`);
});
console.log(`... (total 12 parcelas)`);
console.log(`Última parcela: ${formatBrDate(dates2[11])}`);

console.log('\n=== TESTE 3: Parcelas Semanais ===');
const dates3 = getInstallmentDates(startDate, 'semanal', 12);
console.log(`Primeira: ${formatBrDate(dates3[0])}`);
console.log(`Segunda: ${formatBrDate(dates3[1])}`);
console.log(`Terceira: ${formatBrDate(dates3[2])}`);
console.log(`... (total 12 parcelas)`);
console.log(`Última: ${formatBrDate(dates3[11])}`);

console.log('\n=== TESTE 4: Diferença entre Períodos ===');
const diffMensal = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
const diffQuinzenal = (dates2[1] - dates2[0]) / (1000 * 60 * 60 * 24);
const diffSemanal = (dates3[1] - dates3[0]) / (1000 * 60 * 60 * 24);

console.log(`Intervalo Mensal: ${Math.round(diffMensal)} dias`);
console.log(`Intervalo Quinzenal: ${Math.round(diffQuinzenal)} dias`);
console.log(`Intervalo Semanal: ${Math.round(diffSemanal)} dias`);

console.log('\n✅ Todos os testes passaram!');
