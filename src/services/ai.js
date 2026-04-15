import { DEFAULT_CATEGORIES } from '../theme';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

// ─── Fallback por keywords ──────────────────────────────
const KEYWORDS = {
  Alimentação: ['comida', 'restaurante', 'ifood', 'almoço', 'jantar', 'café', 'mercado', 'padaria', 'lanche', 'pizza', 'burger', 'churrasco', 'açougue', 'supermercado', 'hortifruti', 'feira', 'sushi', 'delivery'],
  Transporte: ['uber', '99', 'gasolina', 'combustível', 'ônibus', 'metrô', 'estacion', 'pedágio', 'táxi'],
  Moradia: ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'iptu', 'internet', 'energia', 'reforma', 'pintura', 'encanador', 'eletricista', 'móveis', 'decoração', 'casa'],
  Saúde: ['farmácia', 'médic', 'consulta', 'plano de saúde', 'exame', 'dentista', 'hospital'],
  Lazer: ['cinema', 'viagem', 'bar', 'festa', 'show', 'ingresso', 'parque', 'jogo'],
  Educação: ['curso', 'livro', 'escola', 'faculdade', 'aula', 'mensalidade', 'udemy'],
  Vestuário: ['roupa', 'tênis', 'camisa', 'calça', 'sapato', 'nike', 'adidas', 'zara'],
  Assinaturas: ['netflix', 'spotify', 'disney', 'amazon', 'assinatura', 'plano', 'hbo', 'prime'],
  Investimentos: ['investimento', 'ação', 'fundo', 'cripto', 'tesouro', 'poupança', 'bitcoin'],
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

// ─── Gemini API call ────────────────────────────────────
export async function categorizeTransaction(descricao, valor, categoryList = DEFAULT_CATEGORIES, signal) {
  const prompt = `${FEW_SHOT}

Agora categorize:
Descrição: "${descricao}", Valor: R$ ${valor.toFixed(2)} →`;

  console.log('[AI] Chave carregada:', GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : 'UNDEFINED');
  console.log('[AI] URL:', GEMINI_URL);

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
      const errorBody = await response.json().catch(() => ({}));
      console.log('[AI] Erro HTTP:', response.status, JSON.stringify(errorBody));
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[AI] Resposta bruta:', JSON.stringify(data));
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Outros';
    console.log('[AI] Categoria retornada:', text);
    const outros = categoryList.find((c) => c.name === 'Outros') || categoryList[categoryList.length - 1];
    const match = categoryList.find((c) => text.toLowerCase().includes(c.name.toLowerCase()));
    return { category: match || outros, fromAI: true };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.log('[AI] Fallback ativado. Motivo:', err.message);
    return { category: fallbackCategorize(descricao, categoryList), fromAI: false };
  }
}
