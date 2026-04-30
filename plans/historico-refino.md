# Plano — Refino da aba Histórico (HistoryScreen)

## Context
A aba de Histórico apresenta atrito de UX em três frentes: (1) uso de tons quentes (amarelo/laranja) para entradas e saídas, gerando ambiguidade sobre o que é positivo vs. negativo; (2) cabeçalhos de data tímidos sem ênfase visual de seção; (3) ausência de identidade da instituição financeira na linha — atualmente só aparece o ícone redondo da categoria, sem indicação de banco.

O agrupamento por data já existe via `SectionList` ([HistoryScreen.js:170-187](src/screens/HistoryScreen.js#L170-L187)) e a data já **não** é repetida na linha — então essa peça precisa apenas de refino visual (headers mais fortes). O foco real é **semântica de cores** e **identidade do banco**.

## Mudanças

### 1. Paleta semântica (verde / vermelho)
Adicionar tokens semânticos à paleta — sem remover `gold`/`burnt` (usados em outras telas).

**[src/theme.js](src/theme.js)** — acrescentar ao objeto `T`:
```js
positive: '#16A34A',   // verde — entradas
negative: '#C53030',   // vermelho — saídas
```

**[src/context/AppPreferencesContext.js](src/context/AppPreferencesContext.js)** — adicionar `positive` e `negative` em `lightPalette` e `darkPalette` (variante mais clara no dark, ex.: `#34D399` / `#F87171`) para que `useThemeColors()` os exponha.

### 2. Aplicar cores semânticas em `HistoryScreen`
Trocar referências de `T.gold` → `T.positive` e `T.burnt` → `T.negative` **apenas nas linhas/valores monetários**:
- [HistoryScreen.js:232](src/screens/HistoryScreen.js#L232) — Receitas
- [HistoryScreen.js:237](src/screens/HistoryScreen.js#L237) — Despesas
- [HistoryScreen.js:242](src/screens/HistoryScreen.js#L242) — Saldo
- [HistoryScreen.js:315](src/screens/HistoryScreen.js#L315) — fatura cartão (negative)
- [HistoryScreen.js:334](src/screens/HistoryScreen.js#L334) — valor da transação

Manter `T.orange` em navegação de mês, pills e toggle (identidade de marca preservada).

### 3. Headers de data mais fortes
Refinar `sectionDateLabel` ([HistoryScreen.js:454-461](src/screens/HistoryScreen.js#L454-L461)):
- Aumentar fonte para 13–14px, peso `Poppins_600SemiBold`, cor `T.graphite` (não cinza médio)
- Adicionar separador sutil: pequena linha 1px `T.grayVLight` abaixo, ou padding-bottom maior
- Para "Hoje" e "Ontem" manter destaque; para datas absolutas formatar como **"28 de Abril"** (não `dd/mm/yyyy`) — atualizar a função `groupedSections` ([HistoryScreen.js:170-187](src/screens/HistoryScreen.js#L170-L187)) usando `MONTHS_PT` já presente no arquivo. Omitir o ano quando for o ano corrente (mesma lógica de `monthLabel`).

### 4. Identidade da instituição na linha (refatoração de ícone)
Hoje a linha tem só o `CatIcon` da categoria; o usuário pediu para **priorizar o logo do banco** sem sobreposição de ícones minúsculos.

Estratégia escolhida — **categoria à esquerda + chip do banco à direita do título**:
- Manter `CatIcon` como avatar principal (40×40) à esquerda — mantém a leitura por categoria.
- Adicionar pequeno chip ao lado do nome da conta/categoria contendo o `BankIcon` (16px) + nome curto do banco. Visível no `txMeta`.
- Reutilizar componente existente [BankIcon](src/components/BankIcon.js#L118) (já usado em [DashboardScreen.js:903](src/screens/DashboardScreen.js#L903)).

**Resolver banco da transação:**
- Transações têm `accountId`; contas (`accounts` no `FinanceContext`) têm `bankName` / `bankColor` / `bankInitial`.
- Criar helper em [src/utils/](src/utils/) `accountBank.js` exportando `getAccountBank(accounts, accountId)` → retorna `{ bankName, bankColor, bankInitial }` ou `null`.
- Em `HistoryScreen` consumir `accounts` via `useFinance()` (já importado) e passar para o render.

**Render alterado** ([HistoryScreen.js:329-336](src/screens/HistoryScreen.js#L329-L336)):
```
[CatIcon 40] | descricao
             | [BankIcon 14] BancoNome · categoria       | +/- valor
```
Sem sobreposição, sem ícones minúsculos dentro de outros ícones. Para o item de fatura de cartão ([HistoryScreen.js:291-322](src/screens/HistoryScreen.js#L291-L322)) substituir o `CardIcon` genérico pelo `BankIcon` da bandeira/banco do cartão (já há `creditCards` no contexto com cor/logo).

## Arquivos a modificar
- [src/theme.js](src/theme.js) — tokens `positive` / `negative`
- [src/context/AppPreferencesContext.js](src/context/AppPreferencesContext.js) — expor tokens em ambas paletas
- [src/utils/accountBank.js](src/utils/) — **novo** helper
- [src/screens/HistoryScreen.js](src/screens/HistoryScreen.js) — single-pass: cores, label de seção, render da linha (banco), ícone da fatura

## Verificação
1. `npm start` (Expo) e abrir o app no Histórico.
2. Conferir mês com receita e despesa: valor de entrada **verde**, saída **vermelha**, saldo verde/vermelho conforme sinal.
3. Headers exibindo **"Hoje"**, **"Ontem"** e **"28 de Abril"** (sem ano no ano corrente), tipograficamente destacados.
4. Cada linha mostra o chip de banco legível (ex.: logo Nubank + "Nubank") sem ícone minúsculo dentro de outro ícone.
5. Linha de fatura de cartão exibe a logo do banco/bandeira do cartão.
6. Rodar `npm test -- HistoryScreen` (se existir suíte) e confirmar render sem regressões em outras telas que usam `T.gold`/`T.burnt`.
