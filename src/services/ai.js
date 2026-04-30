import { DEFAULT_CATEGORIES } from '../theme';

// Cache em memória para evitar chamadas duplicadas ao Gemini para a mesma descrição+valor
const _cache = new Map();

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

// ─── Fallback por keywords ──────────────────────────────
const KEYWORDS = {
  Alimentação: ['comida', 'restaurante', 'ifood', 'almoço', 'jantar', 'café', 'mercado', 'padaria', 'lanche', 'pizza', 'burger', 'hamburguer', 'burguer', 'churrasco', 'açougue', 'supermercado', 'hortifruti', 'feira', 'sushi', 'delivery', 'rappi', 'sorvete'],
  Transporte: ['uber', '99app', 'cabify', 'gasolina', 'combustível', 'ônibus', 'metrô', 'estacion', 'pedágio', 'táxi', 'passagem', 'bilhete'],
  Moradia: ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'iptu', 'internet', 'energia', 'reforma', 'pintura', 'encanador', 'eletricista', 'móveis', 'decoração', 'casa'],
  Saúde: ['farmácia', 'médic', 'consulta', 'plano de saúde', 'exame', 'dentista', 'hospital'],
  Lazer: ['cinema', 'viagem', 'bar', 'festa', 'show', 'ingresso', 'parque', 'jogo'],
  Educação: ['curso', 'livro', 'escola', 'faculdade', 'aula', 'mensalidade', 'udemy'],
  Vestuário: ['roupa', 'tênis', 'camisa', 'calça', 'sapato', 'nike', 'adidas', 'zara'],
  Assinaturas: ['netflix', 'spotify', 'disney', 'amazon', 'assinatura', 'plano', 'hbo', 'prime', 'youtube', 'globoplay', 'deezer', 'crunchyroll', 'apple tv', 'paramount'],
  Investimentos: ['investimento', 'ação', 'fundo', 'cripto', 'tesouro', 'poupança', 'bitcoin', 'cdb', 'lci', 'lca', 'renda fixa', 'btg'],
};

function fallbackCategorize(descricao, categoryList) {
  const list = categoryList?.length ? categoryList : DEFAULT_CATEGORIES;
  const outros = list.find((c) => c.name === 'Outros') || list[list.length - 1];
  const desc = descricao.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => desc.includes(w))) {
      return list.find((c) => c.name === cat) || outros;
    }
  }
  return outros;
}

// ─── Few-shot examples por categoria ───────────────────
const FEW_SHOT = `Você é um assistente de finanças pessoais. Categorize transações com base na descrição e valor.
As categorias disponíveis são: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Assinaturas, Investimentos, Outros.
Responda com uma única palavra, exclusivamente o nome da categoria, sem pontuação, acentos extras ou explicação.

Exemplos:
Descrição: "iFood - Jantar", Valor: R$ 45,90 → Alimentação
Descrição: "Mercado Extra", Valor: R$ 230,00 → Alimentação
Descrição: "McDonald's", Valor: R$ 38,50 → Alimentação
Descrição: "Churrasco - açougue", Valor: R$ 120,00 → Alimentação
Descrição: "Supermercado Pão de Açúcar", Valor: R$ 310,00 → Alimentação
Descrição: "Aluguel apartamento", Valor: R$ 1800,00 → Moradia
Descrição: "Conta de luz Enel", Valor: R$ 95,00 → Moradia
Descrição: "Internet Vivo fibra", Valor: R$ 110,00 → Moradia
Descrição: "Reforma na casa", Valor: R$ 800,00 → Moradia
Descrição: "Encanador - conserto", Valor: R$ 200,00 → Moradia
Descrição: "Móveis Tok Stok", Valor: R$ 1200,00 → Moradia
Descrição: "Farmácia Ultrafarma", Valor: R$ 67,00 → Saúde
Descrição: "Consulta Dr. Silva", Valor: R$ 250,00 → Saúde
Descrição: "Plano de saúde Unimed", Valor: R$ 420,00 → Saúde
Descrição: "Academia Smart Fit", Valor: R$ 99,90 → Saúde
Descrição: "Psicólogo - sessão", Valor: R$ 180,00 → Saúde
Descrição: "Suplementos Whey", Valor: R$ 150,00 → Saúde
Descrição: "Ótica - óculos de grau", Valor: R$ 320,00 → Saúde
Descrição: "Cinema Cinemark", Valor: R$ 55,00 → Lazer
Descrição: "Show Ana Castela", Valor: R$ 180,00 → Lazer
Descrição: "Bar com amigos", Valor: R$ 120,00 → Lazer
Descrição: "Hotel - viagem fim de semana", Valor: R$ 450,00 → Lazer
Descrição: "Parque aquático", Valor: R$ 130,00 → Lazer
Descrição: "Passagem aérea", Valor: R$ 620,00 → Lazer
Descrição: "Curso React Native - Udemy", Valor: R$ 49,90 → Educação
Descrição: "Mensalidade faculdade", Valor: R$ 950,00 → Educação
Descrição: "Livros Amazon", Valor: R$ 85,00 → Educação
Descrição: "Tênis Nike Air", Valor: R$ 350,00 → Vestuário
Descrição: "Zara - camisas", Valor: R$ 210,00 → Vestuário
Descrição: "Renner - calça jeans", Valor: R$ 130,00 → Vestuário
Descrição: "Netflix", Valor: R$ 45,90 → Assinaturas
Descrição: "Spotify Premium", Valor: R$ 21,90 → Assinaturas
Descrição: "Amazon Prime", Valor: R$ 19,90 → Assinaturas
Descrição: "Tesouro Direto", Valor: R$ 500,00 → Investimentos
Descrição: "Aporte fundo imobiliário", Valor: R$ 1000,00 → Investimentos
Descrição: "Compra Bitcoin", Valor: R$ 300,00 → Investimentos
Descrição: "Uber", Valor: R$ 22,00 → Transporte
Descrição: "Posto Shell - Gasolina", Valor: R$ 180,00 → Transporte
Descrição: "Passagem metrô", Valor: R$ 5,00 → Transporte
Descrição: "99 - corrida", Valor: R$ 18,00 → Transporte
Descrição: "Estacionamento shopping", Valor: R$ 25,00 → Transporte
Descrição: "IPVA - carro", Valor: R$ 1100,00 → Transporte
Descrição: "Presente aniversário", Valor: R$ 80,00 → Outros
Descrição: "Taxa bancária", Valor: R$ 12,00 → Outros
Descrição: "Multa de trânsito", Valor: R$ 293,00 → Outros
Descrição: "Conserto celular", Valor: R$ 350,00 → Outros`;

// ─── Recomendação de Projeção de Fim de Mês ────────────
/**
 * Identifica categoria com maior gasto variável e retorna recomendação curta.
 * Acionar apenas quando status for 'amarelo' ou 'vermelho'.
 * @param {Object} spendByCategory - { [categoriaNome]: valorEmReais }
 * @param {string[]} categoriasFixas
 * @param {string} status - 'amarelo' | 'vermelho'
 * @returns {Promise<string>}
 */
export async function gerarRecomendacaoProjecao(spendByCategory, categoriasFixas, status) {
  // Filtra categorias fixas e Transferência, encontra a de maior gasto
  const fixasSet = new Set([...(categoriasFixas || []), 'Transferência']);
  const variaveis = Object.entries(spendByCategory || {}).filter(([cat]) => !fixasSet.has(cat));

  if (variaveis.length === 0) {
    return 'Revise seus gastos variáveis para equilibrar o mês.';
  }

  // Categoria com maior valor gasto
  const [categoriaMaior, valorMaior] = variaveis.reduce((max, cur) => (cur[1] > max[1] ? cur : max));
  const valorFmt = valorMaior.toFixed(2).replace('.', ',');

  const fallback = `Reduza gastos em ${categoriaMaior} para equilibrar o mês.`;

  if (!GEMINI_API_KEY) return fallback;

  const prompt = `Gastos altos em ${categoriaMaior}: R$ ${valorFmt}. Status financeiro: ${status}. Dê uma recomendação financeira direta em no máximo 10 palavras em português, sem emojis.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 40, temperature: 0.3 },
      }),
    });

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

    const data = await response.json();
    let texto = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!texto) return fallback;

    // Trunca para 80 chars se necessário
    if (texto.length > 80) texto = texto.slice(0, 80) + '…';

    return texto;
  } catch {
    return fallback;
  }
}

// ─── Resumo analítico de gastos do período ──────────────
/**
 * Gera um resumo completo em linguagem natural sobre os gastos de um período.
 * Analisa categorias, maiores despesas individuais, tendências e dá insights acionáveis.
 *
 * @param {Object[]} transactions - Transações filtradas do período
 * @param {string} periodoLabel - Ex: "Mês Atual", "Últimos 30 dias"
 * @param {{ signal?: AbortSignal }} options
 * @returns {Promise<string>}
 */
export async function gerarResumoGastos(transactions, periodoLabel = 'período selecionado', { signal } = {}) {
  const saidas = (Array.isArray(transactions) ? transactions : []).filter(
    (t) => t && t.tipo === 'saída' && !t.isTransfer
  );

  if (saidas.length === 0) {
    return 'Nenhuma despesa registrada neste período.';
  }

  // Agrega por categoria
  const porCategoria = {};
  for (const t of saidas) {
    const cat = t.categoria || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + (Number(t.valor) || 0);
  }

  const totalGasto = Object.values(porCategoria).reduce((a, b) => a + b, 0);

  // Top 5 categorias por valor
  const topCats = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)} (${((val / totalGasto) * 100).toFixed(1)}%)`)
    .join(', ');

  // Top 3 maiores transações individuais
  const top3tx = [...saidas]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3)
    .map((t) => `"${t.descricao || t.categoria}" R$ ${Number(t.valor).toFixed(2)}`)
    .join('; ');

  const numTransacoes = saidas.length;
  const ticketMedio = (totalGasto / numTransacoes).toFixed(2);

  // Fallback estruturado (sem API key)
  const topCatsArr = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const fallback = {
    diagnostico: `No ${periodoLabel}, você gastou R$ ${totalGasto.toFixed(2)} em ${numTransacoes} transações.`,
    destaques: [
      topCatsArr[0] ? `${topCatsArr[0][0]}: R$ ${topCatsArr[0][1].toFixed(2)} (${((topCatsArr[0][1] / totalGasto) * 100).toFixed(1)}%)` : null,
      topCatsArr[1] ? `${topCatsArr[1][0]}: R$ ${topCatsArr[1][1].toFixed(2)} (${((topCatsArr[1][1] / totalGasto) * 100).toFixed(1)}%)` : null,
      top3tx ? `Maior despesa: ${[...saidas].sort((a, b) => b.valor - a.valor)[0]?.descricao || ''} R$ ${[...saidas].sort((a, b) => b.valor - a.valor)[0]?.valor?.toFixed(2) || '0'}` : null,
    ].filter(Boolean),
    sugestao: topCatsArr[0] ? `Considere reduzir gastos em ${topCatsArr[0][0]} para equilibrar o orçamento.` : 'Revise seus gastos para identificar oportunidades de economia.',
  };

  if (!GEMINI_API_KEY) return fallback;

  // Cache por hash dos dados (prefixo v2 para invalidar cache antigo)
  const cacheKey = `resumov2|${periodoLabel}|${Math.round(totalGasto * 100)}|${numTransacoes}|${topCats}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const prompt = `Você é um assistente de finanças pessoais. Analise os gastos do usuário e retorne APENAS um JSON válido, sem markdown, sem explicações.

Período: ${periodoLabel}
Total gasto: R$ ${totalGasto.toFixed(2)}
Número de transações: ${numTransacoes}
Ticket médio: R$ ${ticketMedio}
Top categorias: ${topCats}
Maiores despesas: ${top3tx}

Retorne estritamente neste formato JSON:
{
  "diagnostico": "1 a 2 frases descrevendo o padrão de gastos do período",
  "destaques": ["bullet com insight 1", "bullet com insight 2", "bullet com insight 3"],
  "sugestao": "1 frase acionável e prática para o usuário economizar"
}
Use português brasileiro, linguagem simples, sem emojis.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.5,
          response_mime_type: 'application/json',
        },
      }),
      signal,
    });

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

    const data = await response.json();
    const textoCru = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    let out;
    try {
      out = JSON.parse(textoCru);
      if (!out.diagnostico || !Array.isArray(out.destaques) || !out.sugestao) throw new Error('shape inválido');
    } catch {
      out = { diagnostico: textoCru || fallback.diagnostico, destaques: [], sugestao: '' };
    }

    _cache.set(cacheKey, out);
    return out;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return fallback;
  }
}

// ─── Gemini API call ────────────────────────────────────
export async function categorizeTransaction(descricao, valor, categoryList = DEFAULT_CATEGORIES, signal) {
  // Verifica cache antes de chamar a API — evita requisições duplicadas para a mesma entrada
  const cacheKey = `${descricao?.trim().toLowerCase()}|${valor}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const prompt = `${FEW_SHOT}

Agora categorize:
Descrição: "${descricao}", Valor: R$ ${valor.toFixed(2)} →`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0 },
      }),
      signal,
    });

    if (!response.ok) {
      await response.json().catch(() => ({}));
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Outros';
    const outros = categoryList.find((c) => c.name === 'Outros') || categoryList[categoryList.length - 1];
    const match = categoryList.find((c) => text.toLowerCase().includes(c.name.toLowerCase()));
    const result = { category: match || outros, fromAI: true };
    // Salva no cache apenas no caminho de sucesso da IA (erros transitórios não são cacheados)
    _cache.set(cacheKey, result);
    return result;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return { category: fallbackCategorize(descricao, categoryList), fromAI: false };
  }
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseBrDateSafe(s) {
  const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const d = new Date(yy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function biggestOffenderCategoryLast7d(transactions, now = new Date()) {
  const today = startOfDay(now);
  const from = new Date(today);
  from.setDate(from.getDate() - 6); // 7 dias incluindo hoje

  const sumByCat = new Map();
  for (const t of Array.isArray(transactions) ? transactions : []) {
    if (!t || t.isTransfer) continue;
    if (t.tipo !== 'saída') continue;
    if (t.gastoTipo === 'fixo') continue;
    const d = parseBrDateSafe(t.data);
    if (!d) continue;
    const day = startOfDay(d);
    if (day < from || day > today) continue;
    const cat = t.categoria || 'Outros';
    const prev = sumByCat.get(cat) || 0;
    sumByCat.set(cat, prev + (Number(t.valor) || 0));
  }

  let best = null;
  for (const [cat, total] of sumByCat.entries()) {
    if (!best || total > best.total) best = { cat, total };
  }
  return best;
}

/**
 * Recomendação curta para ajudar a fechar o mês no azul.
 * Só deve ser usada quando status visual estiver AMARELO/VERMELHO.
 */
export async function projectionTipFromWeek(transactions, { signal } = {}) {
  const offender = biggestOffenderCategoryLast7d(transactions);
  if (!offender) return '';
  if (!GEMINI_API_KEY) {
    // Sem chave: devolve recomendação simples sem IA.
    return `Atenção: reduzir gastos de "${offender.cat}" nesta semana ajuda a fechar no azul.`;
  }

  const cacheKey = `projTip|${offender.cat}|${Math.round(offender.total * 100)}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const prompt = `Você é um assistente de finanças pessoais.
Gere UMA frase curta (máx. 110 caracteres), em pt-BR, recomendando uma ação para reduzir gastos.
Contexto: a projeção de fim de mês está apertada. A categoria com maior gasto nos últimos 7 dias foi "${offender.cat}".
Responda com apenas a frase (sem aspas).`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.4 },
      }),
      signal,
    });

    if (!response.ok) {
      await response.json().catch(() => ({}));
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const out = text || `Atenção: reduzir gastos de "${offender.cat}" nesta semana ajuda a fechar no azul.`;
    _cache.set(cacheKey, out);
    return out;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return `Atenção: reduzir gastos de "${offender.cat}" nesta semana ajuda a fechar no azul.`;
  }
}
