# Plano — Status Open Finance + Revisar Notificações

## Contexto
A `DashboardScreen.js` já possui dois balões (linhas 1077-1118) para Open Finance e Notificações, porém o visual atual difere da referência (imagem anexa). Este plano alinha os componentes ao mockup.

## Objetivos
1. **Balão "Status Open Finance"**: card de convite quando não conectado, com chamada à ação visual (`Conectar` em laranja).
2. **Balão "Para Revisar"**: carrossel horizontal de notificações importadas, cada item com ações `Confirmar` / `Descartar` inline (sem abrir modal).

## Mudanças planejadas

### 1. `src/screens/DashboardScreen.js`
- **Balão Open Finance** (substituir pill atual):
  - Layout em 2 linhas: título `Status Open Finance` (Poppins SemiBold) + subtítulo `Cansado de lançar na mão? Sincronize seu Nubank.` (Poppins Light, muted).
  - CTA `Conectar` à direita em laranja (`T.orange`), Poppins SemiBold.
  - Background `T.homeGlass`, borda sutil laranja, raio 16, padding maior.
  - Mantém `onPress → OpenFinanceOnboarding`.

- **Balão Para Revisar** (substituir pill + remover Modal):
  - Header: `Para Revisar` + badge laranja com contador (ex: `01`).
  - Carrossel horizontal (`ScrollView horizontal pagingEnabled`) exibindo cards das notificações pendentes.
  - Cada card: ícone do banco + nome (`Nubank`, `Inter`), categoria (`Alimentação`, `Mercado`), valor em vermelho, dois botões inline: `Confirmar` (verde) e `Descartar` (cinza/vermelho).
  - Indicador de paginação (dots) abaixo do carrossel.
  - Se `notificationCount === 0` → ocultar bloco.

- **Lógica de ações**:
  - `confirmNotification(txId)`: remove flag `origin.type === 'notification'` (transação vira oficial).
  - `dismissNotification(txId)`: remove a transação.
  - Ambas via `FinanceContext` (verificar se já existem helpers; caso contrário, usar `setTransactions`/equivalente já exposto).

- **Remoção**: `Modal` de notificações (linhas 1361-1421) e estilos `notifModal*` correspondentes ficam obsoletos — remover.

### 2. Estilos (`createStyles`)
Adicionar/ajustar:
- `openFinanceCard` (substitui `openFinancePill` para esse uso): padding 14, gap 4.
- `openFinanceCTA`: texto laranja SemiBold à direita.
- `reviewSection`, `reviewHeader`, `reviewBadge`, `reviewBadgeText`.
- `reviewCarousel`, `reviewCard`, `reviewCardHeader`, `reviewCardBank`, `reviewCardCategory`, `reviewCardValue`.
- `reviewActionsRow`, `reviewBtnConfirm`, `reviewBtnDismiss`, `reviewBtnText`.
- `reviewDots`, `reviewDot`, `reviewDotActive`.

Remover: `notifModal*`, `notifItem*`, `notifEmpty*`, `notifBadge*` (substituídos).

### 3. `FinanceContext` (verificação)
Conferir se há método para atualizar/remover transações pontualmente. Se não houver:
- Adicionar `confirmTransaction(id)` (limpa `origin.type === 'notification'` → marca como confirmada).
- Adicionar `removeTransaction(id)` (já pode existir).

## Arquivos afetados
- `src/screens/DashboardScreen.js` (edição consolidada single-pass)
- `src/context/FinanceContext.js` (somente se faltarem helpers)

## Fora de escopo
- Persistência de estado de "descartado" além da remoção.
- Animação de entrada/saída dos cards.
- Telas de detalhe da notificação.

## Testes manuais
1. Sem notificações → balão "Para Revisar" oculto.
2. Com 2+ notificações → carrossel desliza, dots refletem página ativa.
3. `Confirmar` remove o card e decrementa o contador; transação permanece no histórico sem flag de notificação.
4. `Descartar` remove o card e a transação.
5. Tap no balão Open Finance navega para `OpenFinanceOnboarding`.
