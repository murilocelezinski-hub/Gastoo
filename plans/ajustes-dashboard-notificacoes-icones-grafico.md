# Plano — 3 ajustes no DashboardScreen

Arquivo principal: `src/screens/DashboardScreen.js`

---

## Ajuste 1 — Notificações Open Finance: confirmar/descartar remove o card e impacta saldo

### Estado atual
- Funções `confirmNotification` e `dismissNotification` ([linhas 936-964](../src/screens/DashboardScreen.js#L936-L964)) tratam mocks e reais.
- **Reais**: ao confirmar, faz `addTransaction(newTx)` (modifica saldo) e `deleteTransaction(tx)`. Ao descartar, só `deleteTransaction(tx)`. Como `displayNotifications` deriva de `realNotifications` (que vem de `transactions`), o card desaparece automaticamente. ✅
- **Mocks** (`__mock_*`): NÃO são removidos. O array `MOCK_NOTIFICATIONS` é fixo via `useMemo`, então o card permanece após clique. ❌

### Mudanças
1. Adicionar estado `dismissedMockIds` (Set/array) em `DashboardScreen`:
   ```js
   const [dismissedMockIds, setDismissedMockIds] = useState([]);
   ```
2. Filtrar `displayNotifications` removendo mocks descartados:
   ```js
   const displayNotifications = realNotifications.length > 0
     ? realNotifications
     : MOCK_NOTIFICATIONS.filter(m => !dismissedMockIds.includes(m.id));
   ```
3. Em `confirmNotification` (mock branch):
   - Adicionar `addTransaction({ ...tx, accountId: firstAccount.id, origin: { type: 'confirmed' } })` para que o saldo reflita o valor da notificação confirmada.
   - Adicionar `setDismissedMockIds(prev => [...prev, tx.id])` para remover o card.
4. Em `dismissNotification` (mock branch):
   - Apenas `setDismissedMockIds(prev => [...prev, tx.id])`. Saldo permanece inalterado.
5. Resetar `reviewPage` para 0 se a página atual ficar fora do range.

### Critério de aceite
- Clicar em "Confirmar" remove o card do carrossel E o saldo aumenta/diminui conforme `tipo` e `valor` da notificação.
- Clicar em "Descartar" remove o card do carrossel SEM alterar o saldo.
- Funciona tanto para notificações reais quanto mocks.

---

## Ajuste 2 — Ícone de banco à esquerda do valor, padronizado

### Estado atual ([linhas 883-892](../src/screens/DashboardScreen.js#L883-L892))
```jsx
<View style={{ alignItems: 'flex-end', flexDirection: 'row', flexShrink: 0 }}>
  <Text style={[styles.recentTxValue, ...]}>{...}</Text>
  {tx.origin?.type === 'openFinance' ? (
    <BankIcon ... size={16} />
  ) : tx.origin?.type === 'notification' ? (
    <Bell size={12} ... style={{ marginLeft: 4 }} />
  ) : null}
</View>
```
- Ícone do banco aparece **à direita** do valor.
- Tamanho/formato variam (16 px banco vs 12 px sino).

### Mudanças
1. Reordenar JSX: ícone **antes** do `Text` do valor.
2. Padronizar visual: envolver o ícone em um wrapper circular fixo (28×28, `borderRadius: 14`, `backgroundColor` neutro tipo `T.homeGlass` ou `rgba(255,255,255,0.06)`), centralizado.
3. Tamanho do ícone interno: 16 px para ambos `BankIcon` e `Bell`.
4. Espaçamento: `marginRight: 8` entre ícone e valor.
5. Alinhamento vertical: `alignItems: 'center'` no container externo para garantir que o ícone fique na mesma horizontal do valor.
6. Adicionar estilo no `StyleSheet`:
   ```js
   recentTxOriginIcon: {
     width: 28, height: 28, borderRadius: 14,
     backgroundColor: 'rgba(255,255,255,0.08)',
     alignItems: 'center', justifyContent: 'center',
     marginRight: 8,
   }
   ```

### Critério de aceite
- Ícone de banco (Open Finance) ou sino (notification) aparece **à esquerda** do valor.
- Mesmo formato circular padronizado para ambos os tipos.
- Ícone e valor alinhados horizontalmente (mesma `centerY`).
- Transações sem `origin.type` não exibem ícone (espaço fica vazio).

---

## Ajuste 3 — Legenda de datas acima do valor atual (tooltip) no gráfico

### Estado atual ([linhas 1264-1293](../src/screens/DashboardScreen.js#L1264-L1293))
Ordem no JSX:
1. `<BalanceLineChart />` — renderiza o SVG + tooltip (`chartScrubReadout`) logo abaixo do gráfico ([linha 237-244](../src/screens/DashboardScreen.js#L237-L244)).
2. `<View style={styles.chartLabels}>` — labels de datas do eixo X, abaixo do tooltip.

Hierarquia visual atual: **Gráfico → Tooltip (data/valor atual) → Labels de datas**.

### Mudanças
Inverter a ordem: **Gráfico → Labels de datas → Tooltip (data/valor atual)**.

Como o tooltip está renderizado dentro do componente `BalanceLineChart`, há duas opções:

**Opção A (recomendada — menos invasivo):** Mover o tooltip para fora do `BalanceLineChart` e renderizá-lo em `DashboardScreen` após os `chartLabels`.
1. Em `BalanceLineChart`, expor o `activePt` via prop callback (`onActivePointChange`) ou retornar via render prop. Mais simples: mover o tooltip JSX completamente para fora e calcular `displayIndex`/`activePt` no parent.
2. Alternativa mais simples ainda: passar `renderBelow` como prop com os `chartLabels`, e o componente intercala internamente entre gráfico e tooltip.

**Opção B (mais limpa):** Adicionar prop `xAxisLabels` ao `BalanceLineChart` recebendo o `<View style={styles.chartLabels}>...</View>` como ReactNode, e renderizá-lo entre o `<Svg>` e o tooltip dentro do componente.

Escolhida: **Opção B** — adicionar prop `xAxisLabelsNode` em `BalanceLineChart` e renderizá-lo entre o SVG e o tooltip.

#### Passos
1. Em `BalanceLineChart` ([linha 93+](../src/screens/DashboardScreen.js#L93)):
   - Adicionar prop `xAxisLabelsNode`.
   - Após o bloco `</View>` do SVG (linha 234) e antes do tooltip (linha 237), inserir `{xAxisLabelsNode}`.
2. Em `DashboardScreen`, remover o bloco `<View style={styles.chartLabels}>` que está abaixo de `<BalanceLineChart />` ([linhas 1279-1293](../src/screens/DashboardScreen.js#L1279-L1293)) e passá-lo como prop:
   ```jsx
   <BalanceLineChart
     ...
     xAxisLabelsNode={balanceSeries.length > 0 ? (
       <View style={styles.chartLabels}>...</View>
     ) : null}
   />
   ```
3. Ajustar `marginTop` do `chartScrubReadout` se necessário para manter espaçamento consistente.

### Critério de aceite
- Ordem visual: Gráfico → linha de labels (datas distribuídas) → bloco grande com data/valor atual.
- Tooltip continua reagindo ao gesto pan no gráfico.
- Sem regressão visual em modo desktop vs mobile.

---

## Ordem de execução
1. Ajuste 3 (refactor estrutural mais pesado — alterações em componente filho).
2. Ajuste 2 (refactor visual localizado em `RecentTransactions`).
3. Ajuste 1 (lógica + estado local de mocks).

## Arquivos alterados
- `src/screens/DashboardScreen.js` (único)

## Testes
- Smoke manual via Expo: dashboard com mocks → confirmar/descartar/saldo; transações com origin Open Finance e notification → posição do ícone; gráfico → labels acima do tooltip.
- Não há testes unitários afetados (lógica financeira intacta).

## Encerramento
- Atualizar/criar `DASHBOARD_AJUSTES_SUMMARY.md` na raiz.
- Commit + push para `main` (autopush conforme preferência).
