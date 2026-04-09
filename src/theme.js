export const T = {
  orange: '#F05000',
  amber: '#D98C00',
  white: '#FFFFFF',
  graphite: '#333333',
  chocolate: '#2A1200',
  brown: '#844213',
  burnt: '#C96A1E',
  amberDark: '#CB7D00',
  gold: '#E09A00',
  warmWhite: '#F5F0E8',
  charcoal: '#3C3C34',
  grayMed: '#797970',
  grayNeutral: '#989890',
  graySilver: '#BCBCB8',
  grayLight: '#CBCBC7',
  grayVLight: '#DEDEDC',
  offWhite: '#F5F5F3',
};

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: '#F05000', icon: '🍽' },
  { name: 'Transporte', color: '#3C3C34', icon: '🚗' },
  { name: 'Moradia', color: '#2A1200', icon: '🏠' },
  { name: 'Saúde', color: '#989890', icon: '💊' },
  { name: 'Lazer', color: '#CB7D00', icon: '🎮' },
  { name: 'Educação', color: '#844213', icon: '📚' },
  { name: 'Vestuário', color: '#797970', icon: '👕' },
  { name: 'Assinaturas', color: '#C96A1E', icon: '📱' },
  { name: 'Investimentos', color: '#E09A00', icon: '📈' },
  { name: 'Transferência', color: '#5C5C56', icon: '⇄' },
  { name: 'Outros', color: '#BCBCB8', icon: '📦' },
];

/** Lista padrão (compatível com imports antigos `CATEGORIES`) */
export const CATEGORIES = DEFAULT_CATEGORIES;

export const ACCOUNTS = [
  { name: 'Conta Corrente', icon: '🏦' },
  { name: 'Poupança',       icon: '💰' },
  { name: 'Carteira',       icon: '👛' },
  { name: 'Cartão Crédito', icon: '💳' },
  { name: 'Investimentos',  icon: '📈' },
];

export const fmt = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Dados de exemplo vêm de `buildDemoSeedTransactions` no FinanceContext. */
export const MOCK_TRANSACTIONS = [];
