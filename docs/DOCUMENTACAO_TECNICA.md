# Documentação Técnica — Projeto Gastoo
**Versão:** 1.0.0
**Plataforma:** React Native / Expo 54
**Data:** 13/04/2026

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Navegação](#navegação)
5. [Contextos Globais](#contextos-globais)
6. [Componentes Compartilhados](#componentes-compartilhados)
7. [Telas](#telas)
8. [Serviços](#serviços)
9. [Utilitários](#utilitários)
10. [Tema e Estilo](#tema-e-estilo)
11. [Persistência de Dados](#persistência-de-dados)
12. [Estatísticas do Projeto](#estatísticas-do-projeto)

---

## Visão Geral

Gastoo é um aplicativo de finanças pessoais desenvolvido em React Native com Expo. Permite ao usuário registrar receitas e despesas, visualizar relatórios, gerenciar contas bancárias e cartões de crédito, definir metas de gastos por categoria e categorizar transações com auxílio de Inteligência Artificial (Google Gemini 2.0 Flash).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navegação | React Navigation (Stack + Bottom Tabs) |
| Estado global | React Context API |
| Persistência | AsyncStorage |
| Fontes | Poppins (via @expo-google-fonts) |
| Gráficos | react-native-svg (PieChart customizado) |
| IA / Categorização | Google Gemini 2.0 Flash |
| Área segura | react-native-safe-area-context |
| Imagens | expo-image-picker |
| Arquitetura | Nova Arquitetura React Native habilitada |

---

## Estrutura de Pastas

```
Gastoo/
├── App.js                          # Entry point, navegação, providers
├── index.js                        # Registro do app no Expo
├── app.json                        # Configuração Expo
├── package.json                    # Dependências
├── .env.example                    # Exemplo de variáveis de ambiente
├── assets/                         # Logo, ícones, splash
├── docs/
│   ├── COLLABORATION.md            # Fluxo Git da equipe
│   └── DOCUMENTACAO_TECNICA.md     # Este arquivo
└── src/
    ├── theme.js                    # Cores, categorias, formatação
    ├── theme/
    │   └── palettes.js             # Paletas light/dark
    ├── context/
    │   ├── FinanceContext.js       # Estado financeiro global
    │   └── AppPreferencesContext.js# Preferências e tema
    ├── components/
    │   ├── Shared.js               # Componentes reutilizáveis
    │   ├── BrCalendarModal.js      # Calendário (picker de data)
    │   └── PieChart.js             # Gráfico de pizza customizado
    ├── screens/                    # 17 telas
    ├── services/
    │   └── ai.js                   # Integração Gemini API
    └── utils/
        ├── chart.js                # Dados para gráficos
        └── recurrence.js           # Lógica de recorrência
```

---

## Navegação

**Arquivo:** `App.js` (168 linhas)

### Estrutura da Navegação

```
Stack.Navigator
├── Splash                  # Tela de carregamento animada
├── Login                   # Autenticação
├── Main                    # Tab Navigator (abas principais)
│   ├── DashboardTab        → DashboardScreen
│   ├── HistoryTab          → HistoryScreen
│   ├── ReportsTab          → ProjectionScreen
│   └── SpendingGoalsTab    → SpendingGoalsScreen
├── History                 # Modal (fora das abas)
├── Detail                  # Detalhe de transação
├── NewTransaction          # Nova transação
├── AICategory              # Categorização por IA
├── ManualCategory          # Seleção manual de categoria
├── EditTransaction         # Edição de transação
├── Accounts                # Gerenciar contas
├── CreditCards             # Gerenciar cartões
├── Recurring               # Transações recorrentes
├── Profile                 # Menu do perfil
├── UserProfile             # Editar perfil
├── CategoriesSettings      # Configurar categorias
└── SpendingGoals           # Metas de gastos
```

### Configuração das Abas

| Aba | Label | Ícone | Tela |
|---|---|---|---|
| DashboardTab | Início | 🏠 | DashboardScreen |
| HistoryTab | Histórico | 📋 | HistoryScreen |
| ReportsTab | Relatórios | 📊 | ProjectionScreen |
| SpendingGoalsTab | Metas | 🎯 | SpendingGoalsScreen |

- Fundo: `T.chocolate` (#2A1200)
- Ativo: `T.orange` (#F05000)
- Inativo: `T.grayMed` (#797970)
- Altura: 56px + bottom inset

---

## Contextos Globais

### FinanceContext
**Arquivo:** `src/context/FinanceContext.js` (494 linhas)

Estado financeiro central do app. Gerenciado via `useReducer` + `AsyncStorage`.

#### Estado
```js
{
  transactions: [],    // Todas as transações
  accounts: [],        // Contas bancárias
  creditCards: [],     // Cartões de crédito
  toastMsg: null,      // Mensagem de toast
}
```

#### Funções Exportadas

| Função | Descrição |
|---|---|
| `addTransaction(tx)` | Adiciona nova transação |
| `updateTransaction(tx)` | Atualiza transação existente |
| `deleteTransaction(id)` | Remove transação |
| `addAccount(acc)` | Cria nova conta |
| `updateAccount(acc)` | Edita conta |
| `archiveAccount(id)` | Arquiva conta (soft delete) |
| `mergeAccount(fromId, toId)` | Mescla duas contas |
| `addCreditCard(card)` | Cria cartão de crédito |
| `updateCreditCard(card)` | Edita cartão |
| `archiveCreditCard(id)` | Arquiva cartão |
| `balanceForAccount(id)` | Saldo de uma conta específica |
| `totalBalance()` | Saldo total de todas as contas |
| `showToast(msg)` | Exibe notificação temporária |
| `activeAccounts(accounts)` | Filtra contas ativas |
| `activeCreditCards(cards)` | Filtra cartões ativos |

#### Persistência
Todos os dados são salvos no `AsyncStorage` com as seguintes chaves:
- `@gastoo_transactions`
- `@gastoo_accounts`
- `@gastoo_credit_cards`

---

### AppPreferencesContext
**Arquivo:** `src/context/AppPreferencesContext.js` (228 linhas)

Preferências do usuário e sistema de temas.

#### Estado
```js
{
  theme: 'light',           // 'light' | 'dark'
  categories: [],           // Categorias customizáveis
  spendingGoals: {},        // Metas { 'YYYY-MM': { categoria: valor } }
  userProfile: {            // Perfil do usuário
    name: '',
    email: '',
    photoUri: null,
  }
}
```

#### Hooks Exportados

| Hook | Retorno |
|---|---|
| `useAppPreferences()` | Contexto completo |
| `useThemeColors()` | Paleta de cores do tema ativo |

#### Categorias protegidas
`Transferência` e `Outros` não podem ser removidas.

---

## Componentes Compartilhados

**Arquivo:** `src/components/Shared.js` (182 linhas)

### GastooLogo
Logotipo do app com ícone `$` e texto "Gastoo".

### CatIcon
```jsx
<CatIcon category="Alimentação" size={40} />
```
Ícone circular com cor e emoji da categoria. Busca na lista de categorias do contexto.

### Toast
Notificação temporária (2.4s) com fundo dourado. Aparece na parte inferior da tela.
```jsx
// Acionado via: showToast('Mensagem aqui')
```

### ConfirmModal
Modal de confirmação de exclusão com dois botões (Cancelar / Confirmar).
```jsx
<ConfirmModal
  visible={bool}
  message="Deseja excluir?"
  onCancel={() => {}}
  onConfirm={() => {}}
/>
```

### PrimaryButton
Botão primário laranja com sombra.
```jsx
<PrimaryButton label="Salvar" onPress={() => {}} disabled={false} />
```

### Header
Cabeçalho padrão com suporte a botão de voltar e slot direito.
```jsx
<Header title="Título" onBack={() => {}} right={<Component />} />
```

---

### BrCalendarModal
**Arquivo:** `src/components/BrCalendarModal.js` (164 linhas)

Calendário no padrão brasileiro (`DD/MM/YYYY`). Exibido como modal com grade mensal navegável.

### PieChart
**Arquivo:** `src/components/PieChart.js` (72 linhas)

Gráfico de pizza customizado usando `react-native-svg`. Recebe array de `{ label, value, color }`.

---

## Telas

### SplashScreen
**Arquivo:** `src/screens/SplashScreen.js` (57 linhas)

Tela de carregamento com animação de fade-in do logo. Navega para Login após carregar fontes.

---

### LoginScreen
**Arquivo:** `src/screens/LoginScreen.js` (126 linhas)

Formulário de email e senha. Login simulado via `setTimeout`.

> ⚠️ Sem autenticação real implementada.

---

### DashboardScreen
**Arquivo:** `src/screens/DashboardScreen.js` (550 linhas)

Tela principal do app. Exibe:
- Saldo total com toggle de visibilidade
- Seletor de conta ativa
- Gráfico de evolução de saldo (velas/barras)
- Resumo do mês (receitas, despesas, saldo)
- Lista de transações recentes
- Acesso rápido a: Contas, Cartões, Nova Transação, Recorrentes, Perfil

**Filtros de período:** Mês atual, Mês anterior, 6 meses, 12 meses

---

### HistoryScreen
**Arquivo:** `src/screens/HistoryScreen.js` (281 linhas)

Histórico de transações com navegação mensal.

**Componentes da tela:**
1. **Navegador de mês** — `< Fevereiro  [Março]  Abril >` (fundo `T.chocolate`)
2. **Card de resumo** — Receitas / Despesas / Saldo do mês
3. **Toggle tipo** — Todos / Receitas / Despesas
4. **Pills de categoria** — Scroll horizontal com todas as categorias
5. **Lista de transações** — FlatList com navegação para DetailScreen

**Fluxo de filtragem:**
```
transactions → [filtro mês] → [filtro tipo] → [filtro categoria] → lista
```

---

### ProjectionScreen (Relatórios)
**Arquivo:** `src/screens/ProjectionScreen.js` (454 linhas)

Tela de relatórios e projeções com:
- Gráfico de pizza por categoria
- Filtros por período e tipo
- Totais por categoria com barra de progresso
- Calendário para filtro por data customizada

---

### SpendingGoalsScreen
**Arquivo:** `src/screens/SpendingGoalsScreen.js` (238 linhas)

Metas de gastos mensais por categoria. Exibe progresso atual vs. meta definida com barra colorida.
- Verde: dentro do limite
- Laranja: acima do limite

---

### NewTransactionScreen
**Arquivo:** `src/screens/NewTransactionScreen.js` (425 linhas)

Criação de nova transação ou transferência entre contas.

**Campos:**

| Campo | Tipo | Notas |
|---|---|---|
| Tipo | Toggle | Entrada / Saída / Transferência |
| Valor | Numeric Input | Máscara de moeda |
| Descrição | Text Input | Obrigatório |
| Data | Numeric Input | Máscara DD/MM/AAAA |
| Conta origem | Pills | Scroll horizontal |
| Conta destino | Pills | Apenas em transferências |
| Cartão | Pills | Opcional |
| Tipo de gasto | Toggle | Normal / Fixo / Parcelado |
| Periodicidade | Pills | 8 opções |
| Categoria | Seletor | Via IA ou manual |

**Fluxo de categorização:**
```
Descrição → AICategoryScreen → (confirmar ou) ManualCategoryScreen → salva
```

---

### EditTransactionScreen
**Arquivo:** `src/screens/EditTransactionScreen.js` (362 linhas)

Edição de transação existente. Mesmos campos de NewTransactionScreen.
- Transferências são bloqueadas para edição (exibe mensagem explicativa)
- Campo de data com máscara automática `DD/MM/AAAA`

---

### DetailScreen
**Arquivo:** `src/screens/DetailScreen.js` (171 linhas)

Exibe todos os campos de uma transação. Opções: Editar → EditTransactionScreen, Excluir (com ConfirmModal).

---

### AICategoryScreen
**Arquivo:** `src/screens/AICategoryScreen.js` (138 linhas)

Exibe categoria sugerida pela IA (Gemini) para a descrição digitada.
- Estado de loading durante chamada à API
- Botão "Confirmar" — salva com a categoria sugerida
- Botão "Corrigir" → ManualCategoryScreen

---

### ManualCategoryScreen
**Arquivo:** `src/screens/ManualCategoryScreen.js` (119 linhas)

Grade 2 colunas com todas as categorias disponíveis. Suporta exclusão de categorias específicas (ex: `Transferência`).

---

### AccountsScreen
**Arquivo:** `src/screens/AccountsScreen.js` (552 linhas)

Gerenciamento de contas bancárias.

**Funcionalidades:**
- Criar, editar, arquivar e mesclar contas
- Visualizar saldo individual
- Contagem de transações por conta
- Modal de mesclagem com seletor de conta destino

---

### CreditCardsScreen
**Arquivo:** `src/screens/CreditCardsScreen.js` (586 linhas)

Gerenciamento de cartões de crédito.

**Campos:**

| Campo | Descrição |
|---|---|
| Nome | Nome do cartão |
| Ícone | Emoji selecionável |
| Limite | Valor máximo |
| Vencimento | Dia do mês (1–28) |
| Conta vinculada | Conta para débito da fatura |

---

### RecurringScreen
**Arquivo:** `src/screens/RecurringScreen.js` (105 linhas)

Lista de transações com `gastoTipo: 'fixo'` ou `'parcelado'`. Exibe a próxima data de ocorrência calculada por `nextOccurrenceDate()`.

---

### ProfileMenuScreen
**Arquivo:** `src/screens/ProfileMenuScreen.js` (96 linhas)

Menu lateral do perfil. Links para: UserProfile, Accounts, CreditCards, CategoriesSettings, SpendingGoals. Toggle de tema claro/escuro.

---

### UserProfileScreen
**Arquivo:** `src/screens/UserProfileScreen.js` (144 linhas)

Edição de perfil: nome, email e foto (via `expo-image-picker`).

---

### CategoriesSettingsScreen
**Arquivo:** `src/screens/CategoriesSettingsScreen.js` (369 linhas)

Criação e edição de categorias personalizadas.

**Campos:**
- Nome
- Ícone (emoji — grid de opções)
- Cor (seletor de paleta)
- Contagem de transações vinculadas

Ao renomear uma categoria, todas as transações são atualizadas automaticamente.

---

## Serviços

### ai.js
**Arquivo:** `src/services/ai.js` (113 linhas)

Integração com Google Gemini 2.0 Flash para categorização automática de transações.

#### Função principal
```js
categorizeTransaction(descricao: string): Promise<string>
```

#### Fluxo
```
descrição → prompt few-shot → Gemini API → categoria
                                  ↓ (falha)
                           fallback por keywords
```

#### Fallback por keywords

| Keywords | Categoria |
|---|---|
| uber, taxi, 99 | Transporte |
| ifood, restaurante | Alimentação |
| netflix, spotify | Assinaturas |
| farmácia, médico | Saúde |
| ... (12 regras) | ... |

> ⚠️ A chave da API (`EXPO_PUBLIC_GEMINI_API_KEY`) fica exposta no bundle do app.

---

## Utilitários

### chart.js
**Arquivo:** `src/utils/chart.js` (117 linhas)

Funções para construção de dados de gráficos.

| Função | Descrição |
|---|---|
| `parseTxDate(data)` | Converte `DD/MM/YYYY` para objeto `Date` |
| `balanceTotalAt(transactions, accounts, date)` | Saldo total em uma data específica |
| `buildBalanceEvolutionSeries(...)` | Série temporal de saldo |
| `buildChartData(transactions, accounts, range)` | Dados formatados para o gráfico do Dashboard |

**Ranges suportados:** `current_month`, `prev_month`, `last_6m`, `last_12m`

---

### recurrence.js
**Arquivo:** `src/utils/recurrence.js` (112 linhas)

Lógica de transações recorrentes.

| Função | Descrição |
|---|---|
| `addPeriod(date, periodicidade)` | Avança data pela periodicidade |
| `fmtDate(date)` | Formata `Date` para `DD/MM/YYYY` |
| `nextOccurrenceDate(tx)` | Próxima data de ocorrência |
| `projectedRecurringOut(transactions, months)` | Total projetado de saídas recorrentes |

**Periodicidades suportadas:**

| Chave | Incremento |
|---|---|
| `diaria` | +1 dia |
| `semanal` | +7 dias |
| `quinzenal` | +15 dias |
| `mensal` | +1 mês |
| `bimensal` | +2 meses |
| `trimestral` | +3 meses |
| `semestral` | +6 meses |
| `anual` | +1 ano |

---

## Tema e Estilo

### Paleta de Cores (`src/theme.js`)

| Token | Valor | Uso |
|---|---|---|
| `T.orange` | #F05000 | Primária, botões, ativos |
| `T.chocolate` | #2A1200 | Header, tab bar, fundos escuros |
| `T.offWhite` | #F5F5F3 | Fundo das telas claras |
| `T.white` | #FFFFFF | Cards, inputs |
| `T.gold` | #E09A00 | Receitas, valores positivos |
| `T.burnt` | #C96A1E | Despesas, valores negativos |
| `T.graphite` | #333333 | Texto principal |
| `T.grayMed` | #797970 | Texto secundário |
| `T.graySilver` | #BCBCB8 | Bordas, separadores |
| `T.grayVLight` | #DEDEDC | Bordas suaves |
| `T.charcoal` | #3C3C34 | Labels de campos |

### Tipografia
Fonte: **Poppins** (Google Fonts)

| Peso | Uso |
|---|---|
| `Poppins_300Light` | Títulos de header |
| `Poppins_400Regular` | Textos gerais |
| `Poppins_600SemiBold` | Labels, valores, botões |

### Categorias padrão

| Nome | Ícone | Cor |
|---|---|---|
| Alimentação | 🍽 | #F05000 |
| Transporte | 🚗 | #3C3C34 |
| Moradia | 🏠 | #2A1200 |
| Saúde | 💊 | #989890 |
| Lazer | 🎮 | #CB7D00 |
| Educação | 📚 | #844213 |
| Vestuário | 👕 | #797970 |
| Assinaturas | 📱 | #C96A1E |
| Investimentos | 📈 | #E09A00 |
| Transferência | ⇄ | #5C5C56 |
| Outros | 📦 | #BCBCB8 |

---

## Persistência de Dados

Todos os dados são armazenados localmente via `AsyncStorage` sem criptografia.

| Chave | Conteúdo |
|---|---|
| `@gastoo_transactions` | Array de transações |
| `@gastoo_accounts` | Array de contas |
| `@gastoo_credit_cards` | Array de cartões |
| `@gastoo_preferences` | Tema, categorias, metas, perfil |

**Formato de uma transação:**
```js
{
  id: number,
  tipo: 'entrada' | 'saída',
  valor: number,
  descricao: string,
  categoria: string,
  data: 'DD/MM/YYYY',
  obs: string,
  conta: string,
  accountId: number,
  creditCardId: number | null,
  gastoTipo: 'nenhum' | 'fixo' | 'parcelado',
  periodicidade: string | undefined,
  isTransfer: boolean | undefined,
}
```

---

## Estatísticas do Projeto

| Métrica | Valor |
|---|---|
| Total de arquivos fonte | 31 |
| Total de linhas de código | ~7.200 |
| Telas | 17 |
| Contextos globais | 2 |
| Componentes compartilhados | 6 |
| Utilitários | 2 |
| Serviços externos | 1 (Gemini API) |
| Dependências (package.json) | 14 |
| Categorias padrão | 11 |
| Periodicidades suportadas | 8 |
| Tipos de conta padrão | 5 |
