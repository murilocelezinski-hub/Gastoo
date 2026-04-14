# Relatório de QA — Bugs e Falhas de Segurança
**Projeto:** Gastoo
**Versão:** 1.0.0
**Data:** 13/04/2026
**Analisado por:** QA Sênior

---

## Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Problemas Críticos](#-problemas-críticos)
3. [Problemas Altos](#-problemas-altos)
4. [Problemas Médios](#-problemas-médios)
5. [Problemas Baixos](#-problemas-baixos)
6. [Top 3 — Resolver Primeiro](#top-3--resolver-primeiro)

---

## Resumo Executivo

| Severidade | Quantidade |
|---|---|
| 🔴 Crítico | 3 |
| 🟠 Alto | 5 |
| 🟡 Médio | 7 |
| 🟢 Baixo | 3 |
| **Total** | **18** |

---

## 🔴 Problemas Críticos

---

### C1 — Chave de API Gemini exposta no cliente

- **Tipo:** Segurança
- **Severidade:** 🔴 Crítico
- **Localização:** `src/services/ai.js` — linha 3
- **Descrição:** `EXPO_PUBLIC_GEMINI_API_KEY` fica embutida no bundle do app. Qualquer pessoa pode descompilar o APK/IPA, extrair a chave e realizar chamadas à API Gemini no lugar do dono da conta, gerando custos ou esgotando a cota.
- **Como reproduzir:** Descompilar o APK gerado e buscar pela string da chave de API.
- **Sugestão de correção:** Mover as chamadas à Gemini para um backend próprio (ex: Supabase Edge Function, Cloudflare Worker). O app passa a chamar apenas esse proxy autenticado, sem nunca expor a chave ao cliente.

---

### C2 — Crash no boot se AsyncStorage estiver corrompido

- **Tipo:** Bug
- **Severidade:** 🔴 Crítico
- **Localização:** `src/context/FinanceContext.js` — ~linha 249
- **Descrição:** `JSON.parse(raw)` é chamado sem `try/catch`. Se o dado salvo estiver corrompido (app fechado durante escrita, atualização de versão com mudança de schema), o app crasha na inicialização e o usuário fica preso sem conseguir abrir o app.
- **Como reproduzir:** Forçar o fechamento do app durante um `setItem` e reabrir.
- **Sugestão de correção:**
```js
try {
  const p = JSON.parse(raw);
  // continua normalmente...
} catch {
  await AsyncStorage.removeItem(KEY); // limpa dado corrompido
}
```

---

### C3 — Campo de data inicializado com referência de função

- **Tipo:** Bug
- **Severidade:** 🔴 Crítico
- **Localização:** `src/screens/NewTransactionScreen.js` — ~linha 104
- **Descrição:** `setData(formatTodayBr)` passa a função como valor ao invés de chamá-la com `()`. O campo de data exibe `[Function formatTodayBr]` ou fica vazio, impedindo o registro correto da data da transação.
- **Como reproduzir:** Abrir a tela de nova transação e observar o campo de data.
- **Sugestão de correção:**
```js
// Errado
const [data, setData] = useState(formatTodayBr);

// Correto
const [data, setData] = useState(formatTodayBr());
```

---

## 🟠 Problemas Altos

---

### A1 — Autenticação falsa sem validação real

- **Tipo:** Segurança
- **Severidade:** 🟠 Alto
- **Localização:** `src/screens/LoginScreen.js` — ~linhas 62–69
- **Descrição:** O login é implementado com um `setTimeout` que aprova qualquer combinação de email e senha. Qualquer pessoa com acesso físico ao dispositivo consegue entrar no app e visualizar todos os dados financeiros do usuário.
- **Como reproduzir:** Inserir qualquer email e senha aleatórios e confirmar o login.
- **Sugestão de correção:** Implementar autenticação real (Supabase Auth, Firebase Auth, etc.) ou ao menos validar credenciais locais com hash (ex: `bcrypt`).

---

### A2 — Dados financeiros sem criptografia no AsyncStorage

- **Tipo:** Segurança
- **Severidade:** 🟠 Alto
- **Localização:** `src/context/FinanceContext.js` — todas as chamadas `setItem`
- **Descrição:** Saldos, transações, cartões de crédito e contas bancárias ficam armazenados em texto puro no AsyncStorage. Em dispositivos com root/jailbreak ou via backup ADB não criptografado, qualquer aplicativo pode ler esses dados.
- **Como reproduzir:** Acessar o AsyncStorage via ADB em um dispositivo Android com depuração USB ativa:
```bash
adb backup -noapk com.gastoo.app
```
- **Sugestão de correção:** Substituir `AsyncStorage` por `react-native-encrypted-storage` para dados sensíveis (transações, contas, cartões).

---

### A3 — Memory leak no AICategoryScreen ao navegar rapidamente

- **Tipo:** Bug
- **Severidade:** 🟠 Alto
- **Localização:** `src/screens/AICategoryScreen.js` — ~linhas 68–80
- **Descrição:** O `useEffect` possui flag `cancelled`, mas a Promise de `categorizeTransaction` continua pendente após o componente ser desmontado. Em navegações rápidas (usuário pressiona voltar antes da IA responder), requisições se acumulam e podem tentar atualizar estado em componente já desmontado, causando warnings e comportamento inesperado.
- **Como reproduzir:** Iniciar nova transação com IA → pressionar voltar rapidamente várias vezes seguidas.
- **Sugestão de correção:** Usar `AbortController` para cancelar o `fetch` no cleanup do `useEffect`:
```js
useEffect(() => {
  const controller = new AbortController();
  categorizeTransaction(descricao, { signal: controller.signal })
    .then((cat) => {
      if (!controller.signal.aborted) setCategoria(cat);
    });
  return () => controller.abort();
}, []);
```

---

### A4 — Transação com valor zero passa pela validação

- **Tipo:** Bug / Validação
- **Severidade:** 🟠 Alto
- **Localização:** `src/screens/NewTransactionScreen.js` — ~linha 133
- **Descrição:** A condição `canContinue` não verifica se `parseFloat(valor) > 0`. O usuário consegue avançar e salvar uma transação de R$ 0,00, poluindo o histórico e distorcendo relatórios e saldo.
- **Como reproduzir:** Abrir nova transação → não digitar valor → tentar avançar.
- **Sugestão de correção:**
```js
// Antes
const canContinue = !!descricao && !!valor;

// Depois
const canContinue = !!descricao && !!valor && parseFloat(valor) > 0;
```

---

### A5 — Tela de nova transação assume que sempre existe uma conta ativa

- **Tipo:** Edge Case
- **Severidade:** 🟠 Alto
- **Localização:** `src/screens/NewTransactionScreen.js` — ~linha 105
- **Descrição:** O estado inicial usa `act[0]?.id`, que retorna `undefined` se o usuário tiver arquivado todas as contas. A transação é então salva sem `accountId`, quebrando cálculos de saldo e relatórios.
- **Como reproduzir:** Arquivar todas as contas cadastradas → abrir nova transação → salvar.
- **Sugestão de correção:** Verificar se há contas ativas antes de permitir a navegação para a tela de nova transação e exibir um alerta orientando o usuário a criar uma conta.

---

## 🟡 Problemas Médios

---

### M1 — `hitSlop` com valor numérico inválido

- **Tipo:** Bug Mobile
- **Severidade:** 🟡 Médio
- **Localização:** `src/screens/HistoryScreen.js` — linha 77
- **Descrição:** `hitSlop={12}` — React Native exige um objeto `{ top, bottom, left, right }`. Um valor numérico puro é ignorado silenciosamente, deixando a área de toque do botão menor que o mínimo recomendado de 44pt.
- **Sugestão de correção:**
```js
hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
```

---

### M2 — Cor `T.brandFg` inexistente no tema

- **Tipo:** Bug
- **Severidade:** 🟡 Médio
- **Localização:** `src/screens/HistoryScreen.js` — linha 81
- **Descrição:** `T.brandFg` não está definida em `src/theme.js` nem em `src/theme/palettes.js`. Retorna `undefined`, deixando o ícone ⏱ sem cor definida (renderiza transparente ou com cor padrão do sistema).
- **Sugestão de correção:** Substituir por `T.white`, que é a cor usada em todos os outros ícones no header.

---

### M3 — `new Date()` recriado a cada render

- **Tipo:** Performance / Edge Case
- **Severidade:** 🟡 Médio
- **Localização:** `src/screens/HistoryScreen.js` — linha 31
- **Descrição:** `const now = new Date()` fica no corpo do componente e é recriado a cada re-render, gerando alocações desnecessárias. Além disso, se o app permanecer aberto durante a virada do ano, o estado inicial de `selYear` ficará fixado no ano anterior.
- **Sugestão de correção:** Usar inicializador lazy no `useState`:
```js
const [selMonth, setSelMonth] = useState(() => new Date().getMonth() + 1);
const [selYear,  setSelYear]  = useState(() => new Date().getFullYear());
```

---

### M4 — Filtragem de data sem validação de formato

- **Tipo:** Edge Case
- **Severidade:** 🟡 Médio
- **Localização:** `src/screens/HistoryScreen.js` — linhas 44–46
- **Descrição:** O filtro de mês faz `t.data.split('/')` assumindo sempre o formato `DD/MM/YYYY`. Transações com `data` vazia, `undefined` ou em formato diferente somem silenciosamente da lista sem nenhum aviso ao usuário.
- **Sugestão de correção:**
```js
const byMonth = useMemo(() =>
  transactions.filter((t) => {
    if (!t.data) return false;
    const p = t.data.split('/');
    if (p.length !== 3) return false;
    const m = parseInt(p[1], 10);
    const y = parseInt(p[2], 10);
    return !isNaN(m) && !isNaN(y) && m === selMonth && y === selYear;
  }),
  [transactions, selMonth, selYear]
);
```

---

### M5 — Contagem de transações recalculada sem `useMemo`

- **Tipo:** Performance
- **Severidade:** 🟡 Médio
- **Localização:** `src/screens/AccountsScreen.js` — ~linha 333
- **Descrição:** `transactions.filter(...).length` é recalculado para cada conta a cada render, sem memoização. Com muitas transações e contas, isso pode causar lentidão perceptível na tela.
- **Sugestão de correção:** Calcular um mapa `{ [accountId]: count }` em um único `useMemo`:
```js
const txCountByAccount = useMemo(() =>
  transactions.reduce((map, t) => {
    map[t.accountId] = (map[t.accountId] || 0) + 1;
    return map;
  }, {}),
  [transactions]
);
```

---

### M6 — Botões de ícone sem `accessibilityLabel`

- **Tipo:** Acessibilidade
- **Severidade:** 🟡 Médio
- **Localização:** `HistoryScreen.js`, `AccountsScreen.js`, `CreditCardsScreen.js`, `DashboardScreen.js`, `CategoriesSettingsScreen.js`
- **Descrição:** Botões que exibem apenas ícone (setas de navegação, olho para ocultar saldo, lixeira, +) não possuem `accessibilityLabel`. Leitores de tela (TalkBack/VoiceOver) anunciam apenas o emoji ou símbolo sem contexto, tornando o app inacessível para usuários com deficiência visual.
- **Sugestão de correção:**
```jsx
<TouchableOpacity
  accessibilityLabel="Ir para o mês anterior"
  accessibilityRole="button"
  onPress={() => goTo(prev)}
>
```

---

### M7 — Toast sem `accessibilityLiveRegion`

- **Tipo:** Acessibilidade
- **Severidade:** 🟡 Médio
- **Localização:** `src/components/Shared.js` — componente `Toast`
- **Descrição:** As notificações temporárias de sucesso/erro exibidas pelo Toast não são anunciadas por leitores de tela, pois não possuem `accessibilityLiveRegion`. Usuários com deficiência visual não recebem feedback das ações realizadas.
- **Sugestão de correção:**
```jsx
<View accessibilityLiveRegion="polite" style={styles.toast}>
  <Text>{msg}</Text>
</View>
```

---

## 🟢 Problemas Baixos

---

### B1 — Array `cats` recriado a cada render

- **Tipo:** Performance
- **Severidade:** 🟢 Baixo
- **Localização:** `src/screens/HistoryScreen.js` — linha 68
- **Descrição:** `['Todos', ...CATEGORIES.map(c => c.name)]` cria um novo array a cada render. Como `CATEGORIES` é estático, isso gera alocações desnecessárias.
- **Sugestão de correção:**
```js
const cats = useMemo(() => ['Todos', ...CATEGORIES.map((c) => c.name)], []);
```

---

### B2 — `offsetMonth` não suporta delta maior que 12

- **Tipo:** Edge Case
- **Severidade:** 🟢 Baixo
- **Localização:** `src/screens/HistoryScreen.js` — linha 19
- **Descrição:** A função usa `if` simples para corrigir overflow de mês, o que só funciona corretamente para `delta = ±1`. Se futuramente for chamada com valores maiores, o mês resultante ficará fora do range 1–12.
- **Sugestão de correção:**
```js
function offsetMonth(month, year, delta) {
  const total = (year * 12 + (month - 1)) + delta;
  return {
    month: (total % 12) + 1,
    year: Math.floor(total / 12),
  };
}
```

---

### B3 — PieChart sem estado de lista vazia

- **Tipo:** Edge Case
- **Severidade:** 🟢 Baixo
- **Localização:** `src/screens/ProjectionScreen.js`
- **Descrição:** O componente `PieChart` pode receber um array vazio quando não há transações no período selecionado. Dependendo da versão da lib `react-native-svg`, isso pode causar render incorreto ou crash silencioso.
- **Sugestão de correção:**
```jsx
{data.length === 0
  ? <Text style={styles.emptyText}>Sem dados para o período</Text>
  : <PieChart data={data} />
}
```

---

## Top 3 — Resolver Primeiro

| Prioridade | Problema | Impacto |
|---|---|---|
| 1 | 🔴 C2 — Crash no boot (JSON.parse sem try/catch) | Usuário pode ficar completamente impossibilitado de usar o app |
| 2 | 🔴 C3 — Data inicializada como referência de função | Bug visível imediatamente ao criar qualquer transação |
| 3 | 🟠 A1 — Login sem autenticação real | Qualquer pessoa com acesso ao dispositivo visualiza todos os dados financeiros |
