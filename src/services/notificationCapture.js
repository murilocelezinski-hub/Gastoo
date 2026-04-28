// Simula captura e parse de notificações push de apps bancários e de pagamento

import { parseNotificationString } from '../utils/mockDataHelpers';

function padTwo(n) {
  return String(n).padStart(2, '0');
}

function todayFormatted() {
  const d = new Date();
  return `${padTwo(d.getDate())}/${padTwo(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Processa texto de notificação e retorna objeto de transação pronto para addTransaction.
 * @param {string} text - Texto da notificação (ex: "Compra de R$ 50,00 no iFood").
 * @param {string} accountId - ID da conta destino.
 * @returns {Object|null} Transação pronta ou null se não for possível parsear.
 */
export function captureFromNotification(text, accountId) {
  const parsed = parseNotificationString(text);
  if (!parsed) return null;

  return {
    ...parsed,
    accountId,
    data: todayFormatted(),
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    obs: `Importado via notificação: "${text}"`,
    creditCardId: null,
    isTransfer: false,
    isInstallment: false,
  };
}

/** Exemplos de notificações para demonstração na UI. */
export const SAMPLE_NOTIFICATIONS = [
  'Compra de R$ 67,90 no iFood aprovada',
  'Débito R$ 23,50 - Uber',
  'Você gastou R$ 156,00 na Amazon',
  'Pix recebido R$ 500,00 de João Silva',
  'Compra R$ 89,90 Netflix aprovada',
  'Débito automático R$ 15,90 Spotify',
];
