# Feature de Parcelas - Documentação

## 📋 Overview

Implementação de sistema de parcelas para transações no Gastoo. Quando um usuário marca uma transação como "Parcelado", o sistema cria automaticamente múltiplas transações nos próximos meses com o valor dividido.

## ✨ Características

### 1. **Criação de Parcelas Automática**
- Ao registrar uma transação com `gastoTipo: 'parcelado'`, o sistema cria 12 parcelas automáticamente
- O valor é dividido igualmente entre as parcelas
- Cada parcela é uma transação independente no banco de dados

### 2. **Períodos Suportados**
- **Diária**: 1 dia entre parcelas
- **Semanal**: 7 dias entre parcelas
- **Quinzenal**: 14 dias entre parcelas
- **Mensal**: 30 dias entre parcelas (padrão)
- **Bimensal**: 60 dias entre parcelas
- **Trimestral**: 90 dias entre parcelas
- **Semestral**: 180 dias entre parcelas
- **Anual**: 365 dias entre parcelas

### 3. **Cálculos Precisos**
```
Exemplo: R$ 1.200 em 12 parcelas mensais
- Valor por parcela: R$ 100,00
- Total recalculado: R$ 1.200,00
- Diferença: R$ 0,00 (sem arredondamento)
```

### 4. **Datas Automáticas**
As datas das parcelas são calculadas automaticamente:
```
Início: 15/04/2026
Período: Mensal (30 dias)

Parcelas:
1. 15/04/2026 - R$ 100,00
2. 15/05/2026 - R$ 100,00
3. 14/06/2026 - R$ 100,00
4. 14/07/2026 - R$ 100,00
... (até 12 parcelas)
```

## 🔧 Implementação Técnica

### Estrutura de Dados

Cada parcela possui campos adicionais:
```javascript
{
  id: "inst-1234567890-0",
  installmentGroupId: "inst-1234567890",    // Agrupa todas as parcelas
  installmentIndex: 0,                       // Número da parcela (0-11)
  installmentTotal: 12,                      // Total de parcelas
  isInstallment: true,                       // Flag indicadora
  // ... campos normais da transação
}
```

### Funções Principais

#### `getInstallmentDates(startDate, periodo, numInstallments)`
Calcula as datas de todas as parcelas baseado no período selecionado.

#### `addTransaction(tx)` - Modificado
Se `tx.gastoTipo === 'parcelado'`:
1. Calcula as datas usando `getInstallmentDates`
2. Divide o valor pelo número de parcelas
3. Cria uma transação para cada parcela
4. Agrupa todas com `installmentGroupId`

### Comportamento Especial

#### Deleteção em Grupo
Se o usuário deleta uma parcela, **todas as parcelas do grupo são deletadas**:
```javascript
deleteTransaction(tx) {
  if (tx.installmentGroupId) {
    // Remove todas as parcelas com o mesmo installmentGroupId
  }
}
```

#### Cartão de Crédito
Parcelas de cartão de crédito funcionam normalmente:
- A fatura (`invoiceKey`) é calculada automaticamente para cada parcela
- Data diferente = potencialmente fatura diferente

## 📊 Testes Realizados

### Teste 1: Parcelas Mensais ✅
```
Valor Total: R$ 1200
Valor por Parcela: R$ 100.00
Parcelas criadas: 12
Última parcela: 11/03/2027
Validação: ✓ Sem erros de arredondamento
```

### Teste 2: Períodos Diferentes ✅
```
Semanal:    7 dias entre parcelas
Quinzenal:  14 dias entre parcelas
Mensal:     30 dias entre parcelas
Semestral:  180 dias entre parcelas
```

### Teste 3: Cálculos ✅
```
Soma de todas as parcelas = Valor original
Sem perdas por arredondamento
```

## 🚀 Como Usar

### No App
1. Criar nova transação
2. Preencher valor (ex: 1200)
3. Preencher descrição (ex: "Curso Online")
4. Selecionar "Parcelado" em vez de "Fixo"
5. Escolher periodicidade (ex: "Mensal")
6. Confirmar

### No Código
```javascript
const { addTransaction } = useFinance();

const tx = {
  tipo: 'saída',
  valor: 1200,
  descricao: 'Curso Online',
  data: '15/04/2026',
  categoria: 'Educação',
  accountId: 'acc-001',
  gastoTipo: 'parcelado',     // Ativa parcelas
  periodicidade: 'mensal',     // 12 parcelas de 30 em 30 dias
};

addTransaction(tx);
// Resultado: 12 transações criadas automaticamente
```

## 🔮 Melhorias Futuras

1. **Número customizável de parcelas** (atualmente fixo em 12)
2. **Edição individual de parcelas** (adicionar juro, atraso, etc)
3. **Visualização em calendário** das próximas parcelas
4. **Alertas para parcelas vencidas**
5. **Simulador de parcelamento** (mostrar antes de confirmar)
6. **Suporte a cartões com múltiplas faturas**

## ⚠️ Limitações Atuais

- Sempre cria 12 parcelas (não customizável)
- Período fixo (sem variações tipo "última quarta do mês")
- Não suporta aumento progressivo de parcelas
- Deleção remove todas as parcelas (sem opção de manter as futuras)

## 📝 Log de Mudanças

### v1.0.0 (2026-04-27)
- ✅ Implementação inicial de parcelas
- ✅ Suporte a 8 períodos diferentes
- ✅ Cálculo automático de datas
- ✅ Deleção em grupo
- ✅ Integração com cartões de crédito
- ✅ Testes de validação passando
