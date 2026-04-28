# GA$TOO — Regras de Orquestração Claude Code

## Sobre o projeto
App mobile de finanças pessoais com IA.
Stack: React Native com Expo (Expo Router ou React Navigation)
Gerenciador de pacotes: npm
Entry point: App.js
Pasta principal do código: src/
Pasta de testes: tests/
Pasta de assets: assets/
Pasta de scripts utilitários: scripts/
Pasta de documentação: docs/

## Identidade visual (nunca alterar sem aprovação)
- Laranja principal: #FE5E03
- Amarelo alaranjado: #FEB506
- Branco puro: #FFFFFF
- Grafite escuro: #333333
- Fonte principal: Poppins (Regular para textos, Light para títulos, Semibold para destaque)
- Fonte de apoio: Arial (apenas complementar)
- Logo: GA$TOO — manter exato em todas as telas

## Variáveis de ambiente
- Arquivo: .env (NÃO commitar — já está no .gitignore)
- Referência pública: .env.example (commitar sempre que adicionar variável nova)
- Nunca hardcodar chaves, URLs de API ou segredos no código

## Regras gerais para todos os agentes
- Nunca alterar a identidade visual sem aprovação explícita
- Preservar dados financeiros — operações destrutivas precisam de confirmação
- Seguir os padrões já estabelecidos no src/ (não inventar novos padrões)
- Código comentado em português
- Commits descritivos: `tipo(escopo): descrição`
  - Exemplos: `feat(categorizer): adiciona aprendizado por correção`
  - Exemplos: `fix(finance): corrige cálculo de projeção em fevereiro`
  - Exemplos: `test(telas): adiciona testes de integração do dashboard`

---

## Domínios de cada agente (evitar conflitos de arquivo)

| Agente | Responsabilidade |
|---|---|
| ui-designer | src/ (telas e componentes), assets/ |
| ai-categorizer | src/ (serviços de IA e categorização) |
| finance-engine | src/ (lógica financeira, cálculos, alertas) |
| code-reviewer | leitura de tudo; edição apenas para correções pontuais |
| tester | tests/ e arquivos *.test.js / *.spec.js dentro de src/ |
| orchestrator | coordenação geral, CLAUDE.md, docs/ |

## Paralelismo seguro
- `ui-designer`, `ai-categorizer`, `finance-engine` e `tester` podem rodar em paralelo pois atuam em domínios distintos
- `code-reviewer` sempre roda após implementações, nunca em paralelo com quem está editando
- Nunca dois agentes editando o mesmo arquivo ao mesmo tempo

---

## Workflows disponíveis

### 1. Nova feature (sequencial — ordem importa)
1. `ui-designer` → cria/revisa os componentes visuais em src/
2. `ai-categorizer` → integra lógica de IA se envolver categorias
3. `finance-engine` → integra lógica financeira se necessário
4. `code-reviewer` → revisa tudo que foi implementado
5. `tester` → escreve e roda testes em tests/

**Como acionar:** "Implemente [feature] usando o workflow de nova feature"

### 2. Review completo do app (paralelo)
- `ui-designer` → revisa telas e consistência visual em src/
- `ai-categorizer` → revisa modelo de categorização
- `finance-engine` → revisa lógica de saldo, projeções e alertas
- `code-reviewer` → revisa qualidade, segurança e performance
- `tester` → verifica cobertura de testes em tests/

**Como acionar:** "Faça um review completo do app em paralelo"

### 3. Correção de bug (sequencial)
1. `code-reviewer` → identifica causa raiz
2. agente responsável pela área → corrige
3. `tester` → garante que não quebrou nada

**Como acionar:** "Corrija o bug [descrição] usando o workflow de bug fix"

### 4. Ajuste pontual de UI
Apenas `ui-designer` atuando na tela ou componente especificado.

**Como acionar:** "Use o ui-designer para melhorar [tela/componente]"

### 5. Ajuste na IA de categorização
Apenas `ai-categorizer` atuando no serviço de categorização em src/.

**Como acionar:** "Use o ai-categorizer para [melhoria específica]"

---

## Prioridades de qualidade
1. Segurança de dados financeiros (nunca expor, nunca perder)
2. Experiência do usuário (fluidez, clareza, velocidade)
3. Precisão da IA de categorização
4. Cobertura de testes mínima: 80% em código novo (pasta tests/)
5. Consistência visual com a identidade GA$TOO
