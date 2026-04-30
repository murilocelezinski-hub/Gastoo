# Plano — Refatorar aba "Metas" para "Perfil"

## Contexto
Hoje a aba "Metas" (`SpendingGoalsTab`) ocupa um slot do tab navigator com a tela `SpendingGoalsScreen`, e o acesso ao perfil acontece por um botão de avatar no header do `DashboardScreen`, que empurra `ProfileMenu` no Stack. O usuário quer consolidar: a aba passa a se chamar **Perfil**, renderiza o conteúdo de `ProfileMenuScreen` (Conta, Aparência, Finanças) e ganha "Conexões Bancárias". O atalho de avatar no Dashboard é removido. Resultado: menos duplicidade de pontos de entrada para perfil, e a aba Metas (de uso pontual) deixa de ocupar espaço fixo no tab bar.

Decisão do usuário: a tela `SpendingGoalsScreen` será **removida por completo** junto com seu fluxo (card de projeção, recomendação IA de limite, e estado `spendingGoals` em `useAppPreferences`, se exclusivo dela).

## Arquivos a modificar

### 1. `App.js`
- **Importações** (~linha 35): adicionar `UserCircle` (ou similar do phosphor-react-native) ao bloco de ícones já importados.
- **Tab Navigator** (linhas 195–204):
  - Renomear `name="SpendingGoalsTab"` → `name="ProfileTab"`.
  - Trocar `component={SpendingGoalsScreen}` → `component={ProfileMenuScreen}`.
  - `tabBarLabel: "Metas"` → `tabBarLabel: "Perfil"`.
  - Trocar ícone `Target` → `UserCircle` (mantendo size 22, weight `fill`, cor dinâmica).
- **Stack Screens** (linhas 98–118):
  - Remover/ajustar a entrada `ProfileMenu` do Stack — como agora ela vive como aba, não precisa mais como rota empilhável. Verificar todos os `navigation.navigate('ProfileMenu')` no projeto antes de remover (ver passo 4).
  - Remover a `import` e o `Stack.Screen` de `SpendingGoalsScreen` (sai por completo do app).
  - Remover o ícone `Target` se não for mais usado em outro lugar.

### 2. `src/screens/DashboardScreen.js` (linhas 1110–1120)
- Remover o `<TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('ProfileMenu')}>` do header.
- Reavaliar o `headerRow`: provavelmente fica só com a logo. Remover do `StyleSheet` os estilos `avatar` se ficarem órfãos (verificar com grep no arquivo).

### 3. `src/screens/ProfileMenuScreen.js`
- **Adicionar item "Conexões Bancárias"** na seção "Finanças" (linhas 108–115), navegando para `'OpenFinanceOnboarding'` (rota já existente em App.js linha 118). Reusar o mesmo componente de linha de menu já usado por "Contas/Cartões/Categorias".
- Como agora é raiz de aba (não mais tela empilhada), revisar header interno: pode precisar de título "Perfil" próprio em vez de depender do header de stack. Verificar `useSafeAreaInsets` + paddingTop.

### 4. Remoção da tela SpendingGoals
- Apagar `src/screens/SpendingGoalsScreen.js`.
- Apagar testes correlatos em `tests/` ou `src/**/*.test.js` que importem essa tela.
- Em `useAppPreferences` / context: remover estado e funções dedicados a `spendingGoals` (cópia de mês, limites por categoria) **se não forem usados em mais nenhum lugar**. Verificar com grep antes de remover.
- Remover qualquer card/widget no Dashboard que referencie projeção ou recomendação IA dessa tela.

### 5. Varredura global por referências obsoletas
- Grep por `ProfileMenu` em `src/` — toda chamada `navigation.navigate('ProfileMenu')` vira `navigation.navigate('ProfileTab')` (ou some, caso do Dashboard).
- Grep por `SpendingGoals`, `SpendingGoalsTab`, `SpendingGoalsScreen` — remover todas as referências.

## Pontos de reuso (não criar código novo)
- Componente de linha de menu já em `ProfileMenuScreen.js` (seção Finanças, linhas 108–115) — reutilizar para o novo item "Conexões Bancárias".
- Ícone `UserCircle` de `phosphor-react-native` (mesma lib já usada para `Target`, `House`, etc. no tab bar).
- Rota `OpenFinanceOnboarding` já registrada — não precisa criar nova tela.

## Verificação end-to-end
1. `npx expo start` — abrir o app.
2. Tab bar mostra **Perfil** no slot antigo de Metas, com ícone de pessoa; cor ativa segue `theme.orange`.
3. Tocar na aba Perfil renderiza o menu (Conta, Aparência, Finanças) sem header duplicado nem flicker.
4. Cada item do menu navega corretamente: Dados do usuário → `UserProfile`; Contas → `Accounts`; Cartões → `CreditCards`; Categorias → `CategoriesSettings`; **Conexões Bancárias → `OpenFinanceOnboarding`**.
5. Voltar dessas sub-telas retorna para a aba Perfil (não para Dashboard).
6. Header do Dashboard não exibe mais o avatar; layout do `headerRow` segue alinhado.
7. Toggle de tema e ordem de visualização continuam persistindo (`useAppPreferences`).
8. Rodar `npm test` — garantir que nenhum teste referencia `ProfileMenu` como rota stack, `SpendingGoalsTab` ou `SpendingGoalsScreen`.
9. Confirmar que não sobraram imports órfãos de `SpendingGoalsScreen` ou ícone `Target`.
