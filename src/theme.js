export const T = {
  orange: '#FE5E03',
  amber: '#FEB506',
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
  positive: '#166534',
  negative: '#B91C1C',
};

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',  color: '#FE5E03', icon: 'ForkKnife' },
  { name: 'Transporte',   color: '#3C3C34', icon: 'Car' },
  { name: 'Moradia',      color: '#2A1200', icon: 'House' },
  { name: 'Saúde',        color: '#989890', icon: 'Pill' },
  { name: 'Lazer',        color: '#CB7D00', icon: 'GameController' },
  { name: 'Educação',     color: '#844213', icon: 'GraduationCap' },
  { name: 'Vestuário',    color: '#797970', icon: 'TShirt' },
  { name: 'Assinaturas',  color: '#C96A1E', icon: 'Bell' },
  { name: 'Investimentos',color: '#E09A00', icon: 'ChartLine' },
  { name: 'Transferência',color: '#5C5C56', icon: 'ArrowsLeftRight' },
  { name: 'Outros',       color: '#BCBCB8', icon: 'DotsThree' },
];

/** Lista padrão (compatível com imports antigos `CATEGORIES`) */
export const CATEGORIES = DEFAULT_CATEGORIES;

export const ACCOUNTS = [
  { name: 'Conta Corrente', icon: 'Bank' },
  { name: 'Poupança',       icon: 'PiggyBank' },
  { name: 'Carteira',       icon: 'Wallet' },
  { name: 'Cartão Crédito', icon: 'CreditCard' },
  { name: 'Investimentos',  icon: 'TrendUp' },
];

export const fmt = (v) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Dados de exemplo vêm de `buildDemoSeedTransactions` no FinanceContext. */
export const MOCK_TRANSACTIONS = [];
