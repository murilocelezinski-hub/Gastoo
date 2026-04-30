# Plano de Refatoração — Aba Insights (ex-Relatórios)

## Objetivo
Reposicionar a aba "Relatórios" como **"Insights"**, com foco em análise de IA e saúde financeira. Resolver dois pontos de atrito: (a) baixa diferenciação visual entre fatias do Donut; (b) bloco denso da análise de IA, difícil de escanear. Atualizar identidade da aba (nome + ícone).

---

## Eixo 0 — Renomear Aba e Trocar Ícone

**Contexto:** A aba hoje se chama "Relatórios" com ícone `ChartLine` (phosphor-react). O foco passa a ser análise de IA e saúde financeira.

**Mudanças:**

1. [App.js:9](App.js#L9) — substituir import:
   ```js
   import { House, Clock, Sparkle, Target } from 'phosphor-react';
   ```
   Remover `ChartLine as ChartLineIcon`. Usar `Sparkle` (representa IA/insight); alternativas válidas: `Brain`, `Lightbulb`, `MagicWand`. Decisão: **Sparkle** — é o padrão visual mais associado a IA generativa em apps modernos e mantém leveza visual.

2. [App.js:189-192](App.js#L189-L192) — atualizar:
   ```js
   tabBarLabel: 'Insights',
   tabBarIcon: ({ color }) => (
     <Sparkle size={22} weight="fill" color={color} />
   ),
   ```

3. [ProjectionScreen.js:424](src/screens/ProjectionScreen.js#L424) — `Header title="Relatórios"` → `title="Insights"`.

4. **Renomear arquivo (opcional, fase 2):** `ProjectionScreen.js` → `InsightsScreen.js`. Atualizar imports em [App.js:25](App.js#L25), [App.js:109](App.js#L109), [App.js:187](App.js#L187). Marcar como pendência separada para evitar conflito com a edição consolidada principal.

---

## Eixo 1 — Paleta de Cores Distintas para Donut

**Problema:** [ProjectionScreen.js:22-33](src/screens/ProjectionScreen.js#L22-L33) — `FALLBACK_SLICE_COLORS` tem cores próximas no espectro. Atribuição usa `label.length % N`, então categorias com nomes do mesmo tamanho colidem.

**Mudanças:**

1. **Nova paleta categórica de alto contraste** (12 cores, alternando matiz e luminosidade para garantir distinção em daltonismo):
   ```
   #FE5E03  #2E86DE  #27AE60  #8E44AD  #F1C40F  #E91E63
   #16A085  #34495E  #D35400  #1ABC9C  #C0392B  #7F8C8D
   ```
   Renomear para `CATEGORY_PALETTE`.

2. **Atribuição determinística por hash do nome** (não por tamanho). Substituir `label.length % N` em [ProjectionScreen.js:94](src/screens/ProjectionScreen.js#L94) por soma de char codes.

3. **Mapa fixo para categorias-chave** dentro de `aggregateByCategory`: se `categories` não tiver `color`, usar mapa pré-definido (Alimentação→laranja, Transporte→azul, Lazer→roxo, Saúde→verde, Moradia→teal) antes do hash.

4. **Borda branca entre fatias.** Reforçar `pieStroke` em [ProjectionScreen.js:282](src/screens/ProjectionScreen.js#L282) com largura ≥2px.

---

## Eixo 2 — Escaneabilidade do Bloco de IA

**Problema:** [ProjectionScreen.js:491-493](src/screens/ProjectionScreen.js#L491-L493) renderiza `<Text>` único com parágrafo corrido vindo de `gerarResumoGastos` ([ai.js:194-207](src/services/ai.js#L194-L207)).

### 2A. Backend — `src/services/ai.js`

- Reescrever prompt para retornar **JSON estruturado**:
  ```json
  {
    "diagnostico": "1-2 frases",
    "destaques": ["bullet 1", "bullet 2", "bullet 3"],
    "sugestao": "1 frase acionável"
  }
  ```
- Adicionar `response_mime_type: "application/json"` na chamada Gemini.
- Fallback (sem API key) devolve o mesmo shape, montado de `topCats` e `top3tx`.
- Atualizar cache: serializar/parsear objeto, novo prefixo `resumov2|...` para invalidar cache antigo.
- Se parse falhar: `{ diagnostico: textoCru, destaques: [], sugestao: '' }`.

### 2B. Frontend — `ProjectionScreen.js`

1. **Subcomponente `AiInsightCard`** dentro do arquivo:
   - **Diagnóstico** — label pequeno `T.grayMed` + parágrafo `T.graphite`.
   - **Destaques** — bullets com bolinha laranja, valores em negrito (regex `R$ X,XX` e `XX%`).
   - **Sugestão de Ação** — borda esquerda laranja 3px, fundo `T.offWhite`, ícone lâmpada/sparkle.
   - Separadores `T.grayVLight` 1px entre seções.

2. **Helper `highlightValues(text)`** — função pura: array de `<Text>` segments com matches `R$ \d+[.,]?\d*` e `\d+([.,]\d+)?%` em negrito.

3. **Estilos novos** em `createStyles(T)`:
   - `aiSectionLabel` (uppercase, 11px, letterSpacing 1, `T.grayMed`)
   - `aiSectionText` (14px, lineHeight 22)
   - `aiBulletRow` (row, gap 10, marginBottom 8)
   - `aiBulletDot` (8x8 round, `T.orange`, marginTop 7)
   - `aiSuggestionBox` (padding 12, borderRadius 10, borderLeftWidth 3, borderLeftColor `T.orange`, backgroundColor `T.offWhite`)
   - `aiHighlight` (`Poppins_600SemiBold`, `T.orange`)
   - `aiDivider` (1px, `T.grayVLight`, marginVertical 12)

4. **Estado `aiResumo`**: `string | null` → `{ diagnostico, destaques, sugestao } | null`. Render em [ProjectionScreen.js:491](src/screens/ProjectionScreen.js#L491) chama `<AiInsightCard data={aiResumo} />`.

---

## Arquivos Impactados

| Arquivo | Mudança | Tipo |
|---|---|---|
| [App.js](App.js) | Import `Sparkle`, label `Insights`, ícone novo | Edição pontual |
| [src/screens/ProjectionScreen.js](src/screens/ProjectionScreen.js) | Header `Insights`, paleta nova, hash determinístico, `AiInsightCard`, `highlightValues`, estilos novos | Edição consolidada (single-pass) |
| [src/services/ai.js](src/services/ai.js) | Prompt → JSON, `response_mime_type`, parser, fallback estruturado, cache v2 | Edição consolidada |
| `tests/` | Testes para `highlightValues` e parser de IA com payload malformado | Novo |

## Sequência (Workflow CLAUDE.md)

1. **ai-categorizer** — refatora `ai.js` para JSON estruturado + fallback.
2. **ui-designer** — edição consolidada de `ProjectionScreen.js` (header, paleta, `AiInsightCard`) + ajuste em `App.js` (label/ícone).
3. **code-reviewer** — valida contraste da paleta em dark mode, fidelidade visual (#FE5E03/#FEB506), semântica do ícone Sparkle.
4. **tester** — cobertura para parser JSON e `highlightValues`.

## Riscos e Considerações

- **Cache existente** em `ai.js`: invalidado via novo prefixo `resumov2|`.
- **Categorias com cor customizada** (`categories[].color`) mantêm prioridade — só mudam fallbacks.
- **Dark mode**: validar contraste ≥3:1 contra `T.white` e `T.charcoal`.
- **Acessibilidade**: `accessibilityLabel` em bullets e dots da legenda.
- **Renomear arquivo `ProjectionScreen.js` → `InsightsScreen.js`**: deixado como fase 2 para não acoplar à edição consolidada principal e simplificar o diff.
- **Rota interna `name="Reports"`** ([App.js:109](App.js#L109)) e `name="ReportsTab"` ([App.js:186](App.js#L186)): manter por enquanto para evitar quebras em navegação programática; renomear apenas se houver varredura completa de `navigation.navigate('Reports')`.
