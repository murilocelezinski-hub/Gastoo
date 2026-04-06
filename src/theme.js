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

export const CATEGORIES = [
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

export const ACCOUNTS = [
  { name: 'Conta Corrente', icon: '🏦' },
  { name: 'Poupança',       icon: '💰' },
  { name: 'Carteira',       icon: '👛' },
  { name: 'Cartão Crédito', icon: '💳' },
  { name: 'Investimentos',  icon: '📈' },
];

export const fmt = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const MOCK_TRANSACTIONS = [
  { id: 1, tipo: 'saída', valor: 45.9, descricao: 'iFood - Jantar', categoria: 'Alimentação', data: '28/03/2026', obs: '', conta: 'Conta Corrente' },
  { id: 2, tipo: 'saída', valor: 150.0, descricao: 'Uber - Semana', categoria: 'Transporte', data: '27/03/2026', obs: '', conta: 'Conta Corrente' },
  { id: 3, tipo: 'entrada', valor: 5200.0, descricao: 'Salário', categoria: 'Outros', data: '25/03/2026', obs: 'Ref. março', conta: 'Conta Corrente' },
  { id: 4, tipo: 'saída', valor: 89.9, descricao: 'Netflix + Spotify', categoria: 'Assinaturas', data: '22/03/2026', obs: '', conta: 'Conta Corrente' },
  { id: 5, tipo: 'saída', valor: 320.0, descricao: 'Consulta médica', categoria: 'Saúde', data: '20/03/2026', obs: 'Dr. Silva', conta: 'Conta Corrente' },
  { id: 6, tipo: 'saída', valor: 1800.0, descricao: 'Aluguel', categoria: 'Moradia', data: '15/03/2026', obs: '', conta: 'Conta Corrente' },
  { id: 7, tipo: 'entrada', valor: 800.0, descricao: 'Freelance design', categoria: 'Outros', data: '12/03/2026', obs: '', conta: 'Conta Corrente' },
  { id: 8, tipo: 'saída', valor: 250.0, descricao: 'Curso React', categoria: 'Educação', data: '10/03/2026', obs: 'Udemy', conta: 'Conta Corrente' },
  { id: 9, tipo: 'saída', valor: 180.0, descricao: 'Tênis Nike', categoria: 'Vestuário', data: '08/03/2026', obs: '', conta: 'Conta Corrente' },
  { id: 10, tipo: 'saída', valor: 95.0, descricao: 'Cinema + pipoca', categoria: 'Lazer', data: '05/03/2026', obs: '', conta: 'Conta Corrente' },
];

export const CHART_DATA = [
  { month: 'Out', income: 5800, expense: 3200 },
  { month: 'Nov', income: 6000, expense: 4100 },
  { month: 'Dez', income: 7200, expense: 5500 },
  { month: 'Jan', income: 5500, expense: 3800 },
  { month: 'Fev', income: 6000, expense: 4200 },
  { month: 'Mar', income: 6000, expense: 2930 },
];
