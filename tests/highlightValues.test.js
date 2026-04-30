/**
 * Testes de highlightValues — GA$TOO
 */
const { highlightValues } = require('../src/utils/highlightValues');

describe('highlightValues', () => {
  test('string vazia → array vazio', () => {
    expect(highlightValues('')).toEqual([]);
  });

  test('null/undefined → array vazio', () => {
    expect(highlightValues(null)).toEqual([]);
    expect(highlightValues(undefined)).toEqual([]);
  });

  test('texto sem matches → array com 1 item sem highlight', () => {
    const result = highlightValues('Nenhum valor aqui');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: 'Nenhum valor aqui', highlight: false });
  });

  test('texto com R$ 1.234,56 → segmento highlighted', () => {
    const result = highlightValues('Você gastou R$ 1.234,56 este mês');
    const highlighted = result.filter(p => p.highlight);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].text).toBe('R$ 1.234,56');
  });

  test('texto com 45% → segmento highlighted', () => {
    const result = highlightValues('Aumento de 45% nas despesas');
    const highlighted = result.filter(p => p.highlight);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].text).toBe('45%');
  });

  test('múltiplos matches no mesmo texto', () => {
    const result = highlightValues('R$ 200,00 é 30% do total de R$ 666,67');
    const highlighted = result.filter(p => p.highlight);
    expect(highlighted).toHaveLength(3);
    expect(highlighted.map(p => p.text)).toEqual(['R$ 200,00', '30%', 'R$ 666,67']);
  });

  test('texto que começa com valor → primeiro segmento é highlighted', () => {
    const result = highlightValues('R$ 50,00 gastos');
    expect(result[0].highlight).toBe(true);
    expect(result[0].text).toBe('R$ 50,00');
  });
});
