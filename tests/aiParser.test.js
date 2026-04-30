/**
 * Testes do parser de IA em gerarResumoGastos — GA$TOO
 * Foca na lógica de parse/fallback do JSON retornado pela API.
 */

// Mock theme para evitar erro de import
jest.mock('../src/theme', () => ({
  DEFAULT_CATEGORIES: [],
}));

// Força GEMINI_API_KEY para o código não retornar fallback imediatamente
process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';

// Transações mínimas para passar pelo guard saidas.length === 0
const transacoesMock = [
  { tipo: 'saída', valor: 100, categoria: 'Alimentação', descricao: 'Mercado', data: '01/04/2024' },
];

// Helper: configura fetch para retornar um texto específico
function mockFetchText(text) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  });
}

describe('gerarResumoGastos — parser de IA', () => {
  // Limpa cache do módulo entre testes para evitar hits de cache interno
  let gerarResumoGastos;
  beforeEach(() => {
    jest.resetModules();
    jest.mock('../src/theme', () => ({ DEFAULT_CATEGORIES: [] }));
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    ({ gerarResumoGastos } = require('../src/services/ai'));
  });

  test('JSON válido com todos os campos → retorna shape correto', async () => {
    const payload = {
      diagnostico: 'Você gastou bem este mês.',
      destaques: ['Alimentação: R$ 100,00', 'Transporte: R$ 50,00'],
      sugestao: 'Reduza gastos em Alimentação.',
    };
    mockFetchText(JSON.stringify(payload));

    const result = await gerarResumoGastos(transacoesMock, 'abril/2024');

    expect(result.diagnostico).toBe('Você gastou bem este mês.');
    expect(result.destaques).toHaveLength(2);
    expect(result.sugestao).toBe('Reduza gastos em Alimentação.');
  });

  test('JSON válido mas sem destaques → destaques: []', async () => {
    // Shape sem destaques → cai no catch pois !Array.isArray(out.destaques)
    const payload = { diagnostico: 'Gastos normais.', sugestao: 'Continue assim.' };
    mockFetchText(JSON.stringify(payload));

    const result = await gerarResumoGastos(transacoesMock, 'maio/2024');

    expect(Array.isArray(result.destaques)).toBe(true);
    expect(result.destaques).toHaveLength(0);
  });

  test('string não-JSON → { diagnostico: textoCru, destaques: [], sugestao: "" }', async () => {
    const textoCru = 'Resposta inválida da IA sem JSON';
    mockFetchText(textoCru);

    const result = await gerarResumoGastos(transacoesMock, 'junho/2024');

    expect(result.diagnostico).toBe(textoCru);
    expect(result.destaques).toEqual([]);
    expect(result.sugestao).toBe('');
  });

  test('JSON com shape parcial (só diagnostico) → campos ausentes viram defaults', async () => {
    // Sem sugestao e sem destaques → cai no catch (shape inválido)
    const payload = { diagnostico: 'Apenas diagnóstico.' };
    mockFetchText(JSON.stringify(payload));

    const result = await gerarResumoGastos(transacoesMock, 'julho/2024');

    // Cai no catch: textoCru = JSON string, destaques = [], sugestao = ''
    expect(result.destaques).toEqual([]);
    expect(result.sugestao).toBe('');
  });
});
