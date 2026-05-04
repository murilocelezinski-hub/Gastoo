---
criado: 2026-05-04
arquivo: src/context/FinanceContext.js
---

# Seed Realista — Persona Brasileira Média

## Perfil
CLT, 30 anos, capital do Sudeste, casado(a), 1 filho. Renda líquida R$ 3.500/mês. Sem carro próprio.

## Contas
| Conta | Saldo Inicial |
|---|---|
| Conta Corrente | R$ 2.800 |
| Poupança | R$ 800 |

## Cartão de crédito
Limite R$ 3.500 · Fechamento dia 5 · Vencimento dia 10.

## Composição mensal (~R$ 3.200–3.400 saídas)
| Categoria | Principais itens |
|---|---|
| Moradia | Aluguel R$ 1.100 + Luz ~R$ 130 + Água ~R$ 70 + Internet R$ 95 + Gás R$ 120 (bimestral) |
| Alimentação | Mercado ~R$ 550 + Feira R$ 110 + iFood R$ 90 |
| Transporte | Ônibus R$ 128 + Uber R$ 60 |
| Saúde | Plano familiar R$ 280 + Farmácia R$ 60 |
| Assinaturas | Netflix R$ 25 + Spotify R$ 22 + Celular R$ 40 |
| Investimentos | Tesouro Direto R$ 150 |

## Eventos pontuais
- Jan: IPTU 1ª parcela (R$ 180), Material escolar (R$ 250)
- Fev: Carnaval extra (R$ 150), Gás botijão (R$ 120)
- Mar: Restituição IR (R$ 420 entrada), Geladeira parcela 1/6 (R$ 300), Presente aniversário (R$ 120)
- Abr: Páscoa (R$ 50), Geladeira parcela 2/6, PIX bar (R$ 45)
- Mai: Dia das Mães (R$ 120), Geladeira parcela 3/6, Gás botijão (R$ 120)

## Compra parcelada
Geladeira Consul R$ 1.800 em 6x R$ 300 · `installmentGroupId: inst-geladeira-2026` · parcelas mar–ago/2026.

## Categoria "Salário"
Não existe como categoria canônica em `src/theme.js`. Entradas de salário mantidas em "Outros".

## Testes
78 testes — 72 passaram, 6 falhas pré-existentes (erro `expo/virtual/env.js` em testes de AI, sem relação com seed).
