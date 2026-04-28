# GA$TOO — Regras de Orquestração e Arquitetura

## Resumo do Projeto
O **GA$TOO** é um aplicativo mobile de finanças pessoais focado em reforço positivo e categorização inteligente via IA.
- **Stack:** React Native com Expo (React Navigation).
- **Persistência:** AsyncStorage e integração com serviços de IA.
- **Entry Point:** `App.js`

## Estrutura de Diretórios
- `/src/components/`: Componentes de UI reutilizáveis (botões, cards, inputs). Sem lógica de negócio.
- `/src/screens/`: Telas da aplicação que conectam a UI aos contextos e serviços.
- `/src/context/`: Estados globais e gerenciamento de dados (ex: `FinanceContext.js`).
- `/src/utils/`: Funções puras e lógica financeira (cálculos de parcelas, datas, projeções).
- `/src/services/`: Integrações externas, chamadas de API e serviços de IA.
- `/tests/`: Testes unitários e de integração (Jest).
- `/scripts/`: Scripts utilitários de automação e infra.
- `/docs/`: Documentação técnica e manuais.

## Padrões de Arquitetura e Código (Obrigatório)
1. **Lógica Financeira Isolada:** Cálculos complexos (faturas, juros, projeções) devem residir em `/src/utils/` e possuir testes unitários dedicados. Nunca processar lógica bruta dentro de componentes React.
2. **Separação de Preocupações:** Telas (`screens/`) não devem conter regras de validação de dados pesadas; devem delegar para `utils` ou `services`.
3. **Consistência de Estado:** O fluxo de transações (CRUD) deve ser centralizado no `FinanceContext`. Evite chamadas diretas ao AsyncStorage fora deste contexto.
4. **Especificações Técnicas:** - **Componentes:** PascalCase (ex: `TransactionCard.js`). Estilos no mesmo arquivo usando `StyleSheet.create`.
   - **Utils/Hooks/Context:** camelCase (ex: `useAuth.js`, `dateHelpers.js`).
   - **Linguagem:** Código e comentários em Português. Nomes de variáveis/funções em Inglês.
   - **Estilos:** Priorizar uso de variáveis do arquivo `theme.js`.

## Identidade Visual
- **Paleta:** Laranja (#FE5E03), Amarelo (#FEB506), Branco (#FFFFFF), Grafite (#333333).
- **Tipografia:** Poppins (Regular, Light, Semibold).
- **Logo:** Manter a grafia exata **GA$TOO** em todas as interfaces.

## Regras de Eficiência e Redução de Tokens (CRÍTICO)
- **Zero Conversacional:** Responda apenas com a execução da tarefa ou código. Sem saudações ou "passo-a-passo".
- **Busca antes de Leitura:** NUNCA use `cat` ou `read` em arquivos grandes sem critério. Use `grep` para localizar o alvo antes de ler o arquivo todo.
- **Edições Consolidadas (Single-Pass):** Ao editar um arquivo, aplique todas as mudanças (imports, hooks, JSX) em um **único bloco de edição/diff**. É proibido parcelar edições no mesmo arquivo na mesma interação.
- **Logs Curtos:** Filtre saídas de terminal. Evite relatórios de `--coverage` completos; foque apenas nos arquivos relevantes ou falhas.
- **Proibição de Listagem Global:** Nunca execute `ls -R` na raiz. Navegue um nível por vez ou use `find` limitado a pastas em `src/`.
- **Ignore List:** Ignore completamente `.expo/`, `node_modules/`, `coverage/`, `dist-export/` e `.git/`.
- **Leitura Parcial:** Para arquivos >300 linhas, utilize `sed` ou ferramentas de range para ler apenas o bloco relevante após o `grep`.
- **Referência a Sumários:** Antes de iniciar, procure por arquivos `*_SUMMARY.md` na raiz para entender o estado atual e economizar tokens de leitura de código antigo.

---

## Domínios de Agentes

| Agente | Responsabilidade e Escopo de Arquivos |
|---|---|
| ui-designer | `src/screens/`, `src/components/`, `assets/`, `App.js` |
| ai-categorizer | `src/services/` (Lógica de IA e integrações) |
| finance-engine | `src/utils/`, `src/context/` (Cálculos e Estado) |
| code-reviewer | Leitura via grep em todo o projeto; correções pontuais |
| tester | `tests/` e arquivos `*.test.js` dentro de `src/` |

### Workflow de Nova Feature (Sequencial)
1. **finance-engine** → Cria/atualiza a lógica base, cálculos e contextos.
2. **ai-categorizer** → Cria/atualiza os serviços de suporte e IA necessários.
3. **ui-designer** → Cria a tela e integra as lógicas em uma única edição consolidada.
4. **code-reviewer** → Revisa a implementação final.
5. **tester** → Adiciona cobertura de teste focada nos novos arquivos.

---

## Protocolo de Encerramento de Tarefa (Obrigatório)
1. **Atualizar Memória:** Ao finalizar, atualize o arquivo `*_SUMMARY.md` correspondente ou crie um novo na raiz detalhando a implementação.
2. **Resumo de Alterações:** O relatório final de entrega deve ser breve: O que foi feito, arquivos alterados e testes executados.
3. **Limpeza:** Apagar arquivos temporários ou logs de erro gerados durante a sessão.

## Prioridades de Qualidade
1. Segurança e integridade dos dados financeiros (Operações destrutivas exigem confirmação).
2. Experiência do usuário (fluidez, clareza e fidelidade à identidade visual).
3. Cobertura de testes mínima: 80% em código novo (testes unitários focados).