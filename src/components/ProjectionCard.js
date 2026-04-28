import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useThemeColors } from '../context/AppPreferencesContext';
import { classificarStatusProjecao } from '../utils/projection';

// Formata centavos para R$ com 2 casas decimais
function fmtCentavos(centavos) {
  const val = (Number.isFinite(centavos) ? centavos : 0) / 100;
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_CORES = {
  verde: '#FE5E03',
  amarelo: '#FEB506',
  vermelho: '#D32F2F',
};

export default function ProjectionCard({
  resultado,
  saldoInicialMesCentavos = 0,
  recomendacaoIA = null,
  onInfoPress,
}) {
  const theme = useThemeColors();
  const [showModal, setShowModal] = useState(false);

  // Estado sem dados suficientes
  if (resultado === null) {
    return (
      <View style={[styles.card, { backgroundColor: theme.white ?? '#FFFFFF' }]}>
        <View style={[styles.barWrap, { backgroundColor: theme.grayVLight ?? '#DEDEDC' }]}>
          <View style={[styles.barFill, { width: '0%', backgroundColor: '#DEDEDC' }]} />
        </View>
        <Text style={[styles.loadingText, { color: '#797970' }]}>
          Coletando dados da semana...
        </Text>
      </View>
    );
  }

  const { projecaoCentavos, mediaDiariaVariavelCentavos, diasRestantes, receitasPendentesCentavos, despesasPendentesCentavos } = resultado;
  const status = classificarStatusProjecao(projecaoCentavos, saldoInicialMesCentavos);
  const corBarra = STATUS_CORES[status];

  // Largura da barra de progresso
  let larguraBarra = '100%';
  if (status !== 'vermelho' && saldoInicialMesCentavos > 0) {
    const ratio = Math.min(1, Math.max(0, projecaoCentavos / saldoInicialMesCentavos));
    larguraBarra = `${Math.round(ratio * 100)}%`;
  }

  const handleInfoPress = () => {
    setShowModal(true);
    if (typeof onInfoPress === 'function') onInfoPress();
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.white ?? '#FFFFFF' }]}>
      {/* Cabeçalho */}
      <View style={styles.headerRow}>
        <Text style={[styles.titulo, { color: theme.graphite ?? '#333333' }]}>
          Projeção de Fim de Mês
        </Text>
        <TouchableOpacity onPress={handleInfoPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.iconInfo}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {/* Valor projetado */}
      <Text style={[styles.valorProjetado, { color: corBarra }]}>
        Projeção: {fmtCentavos(projecaoCentavos)}
      </Text>

      {/* Barra de progresso */}
      <View style={[styles.barWrap, { backgroundColor: theme.grayVLight ?? '#DEDEDC' }]}>
        <View style={[styles.barFill, { width: larguraBarra, backgroundColor: corBarra }]} />
      </View>

      {/* Mensagem conforme status */}
      {status === 'verde' && (
        <Text style={[styles.msgTexto, { color: theme.grayMed ?? '#797970' }]}>
          Ótimo! Você está no caminho certo.
        </Text>
      )}
      {status === 'amarelo' && (
        <Text style={[styles.msgTexto, { color: '#CB7D00' }]}>
          Atenção: margem baixa no fim do mês.
        </Text>
      )}
      {status === 'vermelho' && (
        <Text style={[styles.msgTexto, { color: '#D32F2F' }]}>
          Saldo pode ficar negativo!
        </Text>
      )}

      {/* Recomendação da IA (apenas amarelo/vermelho) */}
      {recomendacaoIA && status !== 'verde' && (
        <Text style={[styles.recomendacao, { color: theme.graphite ?? '#333333' }]}>
          💡 {recomendacaoIA}
        </Text>
      )}

      {/* Modal de detalhes */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.white ?? '#FFFFFF' }]}>
            <Text style={[styles.modalTitulo, { color: theme.graphite ?? '#333333' }]}>
              Detalhes da Projeção
            </Text>

            <View style={styles.modalLinhas}>
              <LinhaDetalhe label="Saldo atual" valor={fmtCentavos(saldoInicialMesCentavos)} theme={theme} />
              <LinhaDetalhe label="Receitas pendentes" valor={fmtCentavos(receitasPendentesCentavos)} theme={theme} />
              <LinhaDetalhe label="Despesas pendentes" valor={fmtCentavos(despesasPendentesCentavos)} theme={theme} />
              <LinhaDetalhe label="Média diária variável" valor={fmtCentavos(mediaDiariaVariavelCentavos)} theme={theme} />
              <LinhaDetalhe label="Dias restantes" valor={String(diasRestantes)} theme={theme} />
              <LinhaDetalhe label="Projeção final" valor={fmtCentavos(projecaoCentavos)} theme={theme} destaque />
            </View>

            <TouchableOpacity
              style={[styles.btnFechar, { backgroundColor: '#FE5E03' }]}
              onPress={() => setShowModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnFecharText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Linha de detalhe do modal
function LinhaDetalhe({ label, valor, theme, destaque = false }) {
  return (
    <View style={styles.modalLinha}>
      <Text style={[styles.modalLabel, { color: theme.grayMed ?? '#797970' }]}>{label}</Text>
      <Text style={[styles.modalValor, { color: destaque ? '#FE5E03' : (theme.graphite ?? '#333333'), fontFamily: destaque ? 'Poppins_600SemiBold' : 'Poppins_400Regular' }]}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    // Shadow iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // Shadow Android
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titulo: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  iconInfo: {
    fontSize: 16,
  },
  valorProjetado: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginBottom: 10,
  },
  barWrap: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: 8,
    borderRadius: 999,
  },
  msgTexto: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  recomendacao: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitulo: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLinhas: {
    gap: 12,
    marginBottom: 24,
  },
  modalLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    flex: 1,
  },
  modalValor: {
    fontSize: 13,
    textAlign: 'right',
  },
  btnFechar: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFecharText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
