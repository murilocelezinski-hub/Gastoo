// Simula integração com Open Finance — conecta ao banco selecionado e importa extratos

import { generateOpenFinanceMockTransactions } from '../utils/mockDataHelpers';

/**
 * Simula conexão e importação de dados bancários via Open Finance.
 * @param {{ name: string, color: string, initial: string }} bank - Objeto de banco (de BANKS).
 * @param {Function} addTransaction - Função do contexto para inserir transação.
 * @param {Function} setIsSyncing - Função do contexto para controlar estado de sincronização.
 * @param {string} accountId - ID da conta onde as transações serão inseridas.
 * @returns {Promise<{ success: boolean, count: number, bankName: string }>}
 */
export async function syncBankData(bank, addTransaction, setIsSyncing, accountId) {
  setIsSyncing(true);

  try {
    // Simula latência de API real
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Gera entre 5 e 8 transações mock
    const count = Math.floor(Math.random() * 4) + 5; // 5..8
    const transactions = generateOpenFinanceMockTransactions(bank, count, accountId);

    for (const tx of transactions) {
      await addTransaction(tx);
    }

    setIsSyncing(false);
    return { success: true, count: transactions.length, bankName: bank.name };
  } catch (error) {
    setIsSyncing(false);
    throw error;
  }
}

/**
 * Formata timestamp da última sincronização para exibição amigável.
 * - Se há menos de 1 hora: "Sincronizado há X min"
 * - Caso contrário: "Sincronizado às HH:MM"
 * @param {number|null} timestamp - Unix timestamp em ms (Date.now()).
 * @returns {string}
 */
export function formatLastSync(timestamp) {
  if (!timestamp) return 'Nunca sincronizado';

  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Sincronizado agora mesmo';
  if (diffMin < 60) return `Sincronizado há ${diffMin} min`;

  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `Sincronizado às ${hh}:${mm}`;
}
