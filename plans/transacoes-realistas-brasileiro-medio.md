# Plano — Transações realistas do brasileiro médio (seed demo)

## Objetivo
Refinar o conjunto de transações de demonstração do GA$TOO para refletir com fidelidade o cotidiano financeiro de um brasileiro de classe média (renda ~R$ 3.000–4.500), usado quando o app é aberto sem dados ou em modo demo.

## Diagnóstico do estado atual
Arquivo único responsável: [src/context/FinanceContext.js](src/context/FinanceContext.js)
- `seedAccounts()` ([linha 150](src/context/FinanceContext.js#L150)) — Conta Corrente (R$ 4.100) + Poupança (R$ 1.200).
- `buildDemoSeedTransactions()` ([linha 158](src/context/FinanceContext.js#L158)) — ~4 meses (jan–abr/2026), salário fixo R$ 3.800, aluguel R$ 1.200, mercado, transporte, assinaturas, cartão, transferências e investimento mensal.
- `seedCreditCards()` ([linha 257](src/context/FinanceContext.js#L257)) — 1 cartão (limite R$ 10.000, fech. dia 5, venc. dia 10).

Os valores já são plausíveis, mas há lacunas em relação ao "brasileiro médio real":
- Falta **internet/celular** (Vivo/Claro/Tim ~R$ 80–120) — gasto universal.
- Falta **gás de cozinha** (botijão ~R$ 110–130 a cada 2 meses).
- Falta **plano de saúde/odonto** (~R$ 250–400) — muito comum em CLT.
- Sem **IPTU/IPVA** (parcelas no início do ano) e **seguro do carro**.
- Sem **combustível/Uber recorrente** semanal coerente.
- Sem **PIX entre amigos** (rachar conta, vaquinha) — comportamento típico.
- Sem **compra parcelada no cartão** (eletrodoméstico em 6–10x), apesar do app suportar parcelas.
- Sem **anuidade/tarifa bancária** isenta ou pequena.
- "Material escolar dos filhos" cita filhos sem perfil consistente (sem mesada, lanche escolar).
- "Salário" está como categoria **Outros** — deveria ser categoria **Salário** própria (verificar se existe categoria padronizada no app).
- Saldo inicial e renda não estão totalmente alinhados ao perfil "médio" oficial: **renda média do trabalhador formal brasileiro ≈ R$ 3.200 líquido (PNAD 2024/IBGE)**. Considerar ajustar salário para ~R$ 3.200–3.500 líquido para maior fidelidade, mantendo aluguel proporcional (~30% da renda = R$ 1.000–1.100).

## Persona alvo (proposta)
- **Perfil:** CLT, 30 anos, mora em capital do Sudeste, casado(a), 1 filho.
- **Renda líquida:** R$ 3.500/mês (salário) + R$ 200–400 eventuais (freela/bico).
- **Aluguel:** R$ 1.100 (≈31% da renda).
- **Investe:** R$ 150/mês (Tesouro) + poupança eventual.
- **Cartão de crédito:** usa para mercado grande, parcela compras médias.
- **Transporte:** ônibus + Uber esporádico (não tem carro próprio — caso queira incluir carro, criar 2ª persona).

## Categorias-alvo (cobrir todas com pelo menos 1 lançamento/mês)
Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Vestuário, Assinaturas, Investimentos, Salário, Transferência, Outros.

## Composição mensal proposta (~R$ 3.500 receita)
| Categoria | Itens típicos | Faixa mensal |
|---|---|---|
| Moradia | Aluguel R$ 1.100 + Luz R$ 130 + Água R$ 70 + Internet R$ 95 + Gás R$ 60 (rateio) | ~R$ 1.455 |
| Alimentação | Mercado mês R$ 550 + feira R$ 120 + iFood 2x R$ 90 + padaria R$ 80 | ~R$ 840 |
| Transporte | Ônibus mensal R$ 128 + Uber R$ 70 + app combust. eventual | ~R$ 200 |
| Saúde | Plano R$ 280 + farmácia R$ 60 | ~R$ 340 |
| Assinaturas | Netflix R$ 25 + Spotify R$ 22 + celular pré R$ 40 | ~R$ 87 |
| Educação | Livro/curso esporádico | R$ 0–80 |
| Lazer | Cinema, bar com amigos, passeio | R$ 80–150 |
| Vestuário | Roupa esporádica (cartão) | R$ 0–200 |
| Investimentos | Tesouro Direto R$ 150 | R$ 150 |
| **Total despesas** | | **~R$ 3.200–3.400** |
| Sobra → poupança/cartão | | R$ 100–300 |

## Eventos pontuais por mês (para parecer real)
- **Jan:** IPTU 1ª parcela (~R$ 180), volta às aulas (material R$ 250).
- **Fev:** Carnaval (gasto extra R$ 150 em lazer/alimentação).
- **Mar:** Aniversário de alguém (presente R$ 80–150).
- **Abr:** Páscoa (chocolate R$ 50), parcela de eletrodoméstico iniciando (3x R$ 180 — geladeira).
- **Mai (incluir mês corrente, hoje 04/05/2026):** Dia das Mães (presente R$ 120), 2ª parcela geladeira.
- **Receita extra eventual:** 13º proporcional, restituição IR (mar/abr), freela ocasional.

## Plano de implementação (single-pass)
1. **Reescrever** `buildDemoSeedTransactions()` em [src/context/FinanceContext.js](src/context/FinanceContext.js#L158) cobrindo **5 meses** (jan/2026 → mai/2026, mês corrente) com a composição acima.
2. **Ajustar** `seedAccounts()` ([linha 150](src/context/FinanceContext.js#L150)): Conta Corrente saldo inicial R$ 2.800 (mais realista para classe média), Poupança R$ 800.
3. **Ajustar** `seedCreditCards()` ([linha 257](src/context/FinanceContext.js#L257)): limite de R$ 10.000 → **R$ 3.500** (mais coerente com renda de R$ 3.500; bancos costumam dar 1x renda).
4. **Incluir 1 compra parcelada** no cartão (ex.: geladeira R$ 1.800 em 6x R$ 300) usando o suporte de parcelas existente — gerar entradas com `parcelaInfo` ou múltiplas linhas conforme padrão do app (verificar [INSTALLMENTS_SUMMARY.md](INSTALLMENTS_SUMMARY.md) antes de implementar).
5. **Conferir categoria "Salário"** — buscar lista canônica em `src/utils/` ou `src/constants/`. Se não existir, manter "Outros" e marcar item de follow-up.
6. **Atualizar testes** se houver snapshot/contagem de transações dependente do seed (rodar `npm test` para validar).
7. **Atualizar** `COMPLETION_SUMMARY.md` com o novo perfil de seed.

## Supabase — precisa rodar algo?
**Não.** Análise de [src/services/supabaseSync.js](src/services/supabaseSync.js):
- O schema é genérico (`id`, `user_id`, `data jsonb`, `updated_at`) — armazena a transação inteira em `data`. Não há colunas tipadas que precisem de migração.
- O seed só é injetado **localmente** via `secureGet`/`secureSet` ([FinanceContext.js:281-287](src/context/FinanceContext.js#L281-L287)) quando não há dados salvos. Não toca em Supabase.
- Para um usuário **já logado** que sincroniza com Supabase, o seed não roda (pois `parsed.transactions` virá preenchido). Se quiser forçar reset, basta deslogar/limpar storage local — sem mexer no banco.
- **Conclusão:** nenhuma migração SQL, RLS ou alteração de tabela é necessária.

**Único caso em que tocaria Supabase:** se quisermos um botão "Carregar dados de demonstração" para usuário logado, aí sim faríamos `upsertTransaction` em massa. Não está no escopo deste plano.

## Riscos / pontos de atenção
- Mudar saldos iniciais e cartão pode quebrar testes que conferem totais — verificar `tests/` antes.
- O seed só aparece para **novos usuários / instalação limpa**. Usuários atuais com `@gastoo_finance_v2` salvo não verão diferença sem reset.
- Se a categoria "Salário" não existir como canônica, criar pode demandar mexer em `categories` da IA (`src/services/ai.js`) — fora do escopo.

## Entregáveis
- Edição única em [src/context/FinanceContext.js](src/context/FinanceContext.js).
- Novo `SEED_REALISTA_SUMMARY.md` na raiz.
- Resultado de `npm test` focado nos arquivos afetados.
