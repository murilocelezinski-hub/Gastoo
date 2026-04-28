// Utilitário de dados mock — simula importação de banco (Open Finance) e parsing de notificações

export const BANKS = [
  { name: 'Nubank',    color: '#820AD1', initial: 'N'  },
  { name: 'Itaú',     color: '#EC7000', initial: 'I'  },
  { name: 'Bradesco', color: '#CC092F', initial: 'B'  },
  { name: 'Inter',    color: '#FF7A00', initial: 'In' },
  { name: 'C6 Bank',  color: '#242424', initial: 'C6' },
  { name: 'Santander',color: '#EC0000', initial: 'S'  },
  { name: 'XP',       color: '#000000', initial: 'XP' },
];

export const ESTABLISHMENTS = [
  { name: 'iFood',             categoria: 'Alimentação', tipo: 'saída',   valorMin: 25,   valorMax: 120  },
  { name: 'Uber Eats',         categoria: 'Alimentação', tipo: 'saída',   valorMin: 20,   valorMax: 90   },
  { name: 'Rappi',             categoria: 'Alimentação', tipo: 'saída',   valorMin: 15,   valorMax: 80   },
  { name: 'Mercado Livre',     categoria: 'Outros',      tipo: 'saída',   valorMin: 30,   valorMax: 500  },
  { name: 'Amazon',            categoria: 'Outros',      tipo: 'saída',   valorMin: 20,   valorMax: 400  },
  { name: 'Uber',              categoria: 'Transporte',  tipo: 'saída',   valorMin: 8,    valorMax: 60   },
  { name: '99',                categoria: 'Transporte',  tipo: 'saída',   valorMin: 8,    valorMax: 45   },
  { name: 'Shell',             categoria: 'Transporte',  tipo: 'saída',   valorMin: 80,   valorMax: 300  },
  { name: 'Netflix',           categoria: 'Assinaturas', tipo: 'saída',   valorMin: 39,   valorMax: 55   },
  { name: 'Spotify',           categoria: 'Assinaturas', tipo: 'saída',   valorMin: 11,   valorMax: 22   },
  { name: 'Steam',             categoria: 'Lazer',       tipo: 'saída',   valorMin: 15,   valorMax: 200  },
  { name: 'Farmácia São Paulo',categoria: 'Saúde',       tipo: 'saída',   valorMin: 20,   valorMax: 150  },
  { name: 'Drogasil',          categoria: 'Saúde',       tipo: 'saída',   valorMin: 15,   valorMax: 200  },
  { name: 'Salário',           categoria: 'Outros',      tipo: 'entrada', valorMin: 2000, valorMax: 8000 },
  { name: 'Freelance',         categoria: 'Outros',      tipo: 'entrada', valorMin: 300,  valorMax: 2000 },
];

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function padTwo(n) {
  return String(n).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// randomRecentDate
// ---------------------------------------------------------------------------

/**
 * Retorna uma data aleatória dos últimos `daysBack` dias no formato DD/MM/AAAA.
 * @param {number} daysBack - Quantidade máxima de dias para trás (padrão 30).
 * @returns {string} Data no formato DD/MM/AAAA.
 */
export function randomRecentDate(daysBack = 30) {
  const now = new Date();
  const offsetMs = Math.floor(Math.random() * daysBack) * 24 * 60 * 60 * 1000;
  const target = new Date(now.getTime() - offsetMs);
  return `${padTwo(target.getDate())}/${padTwo(target.getMonth() + 1)}/${target.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// generateOpenFinanceMockTransactions
// ---------------------------------------------------------------------------

/**
 * Gera N transações mock simulando importação de Open Finance de um banco.
 * @param {{ name: string, color: string, initial: string }} bank - Objeto de banco (de BANKS).
 * @param {number} count - Quantidade de transações a gerar (padrão 5).
 * @param {string} accountId - ID da conta de destino.
 * @returns {Array<Object>} Array de objetos de transação prontos para addTransaction.
 */
export function generateOpenFinanceMockTransactions(bank, count = 5, accountId) {
  if (!bank || !accountId) return [];

  const origin = {
    type: 'openFinance',
    bankName: bank.name,
    bankColor: bank.color,
    bankInitial: bank.initial,
  };

  const results = [];
  for (let i = 0; i < count; i++) {
    const est = ESTABLISHMENTS[Math.floor(Math.random() * ESTABLISHMENTS.length)];
    const valor = randomBetween(est.valorMin, est.valorMax);

    results.push({
      id: `of-${bank.name.toLowerCase().replace(/\s/g, '')}-${Date.now()}-${i}`,
      tipo: est.tipo,
      valor,
      descricao: est.name,
      categoria: est.categoria,
      data: randomRecentDate(30),
      accountId,
      creditCardId: null,
      obs: '',
      isTransfer: false,
      isInstallment: false,
      origin,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// parseNotificationString
// ---------------------------------------------------------------------------

// Padrões de valor monetário reconhecidos nas strings de notificação
const VALUE_PATTERNS = [
  /R\$\s*([\d.,]+)/i,          // R$ 50,00 ou R$50.00
  /R\s*\$\s*([\d.,]+)/i,       // R $ 50,00
  /valor[:\s]+R?\$?\s*([\d.,]+)/i,
  /de\s+R?\$?\s*([\d.,]+)/i,
  /(?:débito|crédito|compra)[^\d]*([\d.,]+)/i,
];

// Palavras-chave que indicam tipo "entrada"
const ENTRADA_KEYWORDS = ['recebido', 'crédito', 'credito', 'depósito', 'deposito', 'pix recebido', 'entrada'];

/**
 * Parseia uma string de notificação de banco e retorna um objeto de transação parcial.
 * Exemplos de input: "Compra de R$ 50,00 no iFood", "Débito R$120,50 Uber"
 *
 * @param {string} text - Texto da notificação.
 * @returns {{ valor: number, descricao: string, tipo: 'entrada'|'saída', categoria: string, origin: Object }|null}
 */
export function parseNotificationString(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();

  // --- Extrair valor ---
  let valor = null;
  for (const pattern of VALUE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Normaliza: troca vírgula por ponto, remove pontos de milhar
      const raw = match[1].replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        valor = Math.round(parsed * 100) / 100;
        break;
      }
    }
  }

  if (valor === null) return null;

  // --- Determinar tipo ---
  const tipo = ENTRADA_KEYWORDS.some((kw) => lower.includes(kw)) ? 'entrada' : 'saída';

  // --- Identificar estabelecimento / categoria ---
  let descricao = '';
  let categoria = 'Outros';

  for (const est of ESTABLISHMENTS) {
    if (lower.includes(est.name.toLowerCase())) {
      descricao = est.name;
      categoria = est.categoria;
      break;
    }
  }

  // Se não encontrou estabelecimento, tenta extrair após "no", "em", "na" ou usa texto limpo
  if (!descricao) {
    const afterPrep = text.match(/\s(?:no|na|em|at)\s+([A-Za-zÀ-ÿ0-9 ]+)/i);
    if (afterPrep) {
      descricao = afterPrep[1].trim();
    } else {
      // Remove partes monetárias e usa o que sobrar como descrição
      descricao = text
        .replace(/R\$\s*[\d.,]+/gi, '')
        .replace(/[\d.,]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60);
    }
  }

  return {
    valor,
    descricao: descricao || 'Notificação bancária',
    tipo,
    categoria,
    origin: { type: 'notification' },
  };
}
