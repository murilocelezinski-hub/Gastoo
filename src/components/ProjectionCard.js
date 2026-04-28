import React, { useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useThemeColors } from '../context/AppPreferencesContext';
import { fmt } from '../theme';

function createStyles(T) {
  return StyleSheet.create({
    card: {
      backgroundColor: T.homeGlass,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: T.homeHairline,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 16,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    title: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.brandFgMuted },
    infoBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    infoTxt: { fontSize: 16, color: T.brandFgMuted },
    value: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: T.brandFg, marginTop: 10 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFgMuted, marginTop: 6 },
    barWrap: {
      height: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.10)',
      overflow: 'hidden',
      marginTop: 12,
    },
    barFill: { height: 10, borderRadius: 999 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      alignSelf: 'center',
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: T.graySilver,
    },
    modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: T.graphite, marginBottom: 10 },
    modalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
    modalLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed, flex: 1 },
    modalVal: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.graphite, flexShrink: 0 },
    modalClose: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
    modalCloseTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.orange },
    tip: { marginTop: 10, fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, lineHeight: 16 },
    ai: { marginTop: 10, fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.graphite },
  });
}

export default function ProjectionCard({ result, status, aiTip, onPressInfo }) {
  const T = useThemeColors();
  const styles = useMemo(() => createStyles(T), [T]);
  const [open, setOpen] = useState(false);

  const resolvedOpen = Boolean(onPressInfo) ? undefined : open;
  const openInfo = () => {
    if (onPressInfo) onPressInfo();
    else setOpen(true);
  };
  const closeInfo = () => setOpen(false);

  const barColor =
    status === 'ok' ? '#FE5E03' :
    status === 'warning' ? '#FEB506' :
    status === 'critical' ? T.burnt :
    T.graySilver;

  const title = 'Projeção de fim de mês';
  const projection = result?.projectionCents != null ? result.projectionCents / 100 : null;

  const message =
    status === 'collecting'
      ? 'Coletando dados da semana...'
      : status === 'ok'
        ? 'Boa! Você tende a fechar o mês no azul.'
        : status === 'warning'
          ? 'Atenção: pode ficar apertado até o fim do mês.'
          : 'Alerta crítico: projeção negativa para o fim do mês.';

  const pct = useMemo(() => {
    const base = Math.max(1, result?.breakdown?.saldoInicialCents || 0);
    if (result?.projectionCents == null) return 0;
    const v = Math.max(0, Math.min(1, (result.projectionCents / base)));
    return v;
  }, [result]);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={openInfo} style={styles.infoBtn} hitSlop={10} activeOpacity={0.7}>
            <Text style={styles.infoTxt}>ℹ️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.value}>
          {projection == null ? '—' : fmt(projection)}
        </Text>
        <Text style={styles.subtitle}>{message}</Text>

        {aiTip ? <Text style={styles.ai}>{aiTip}</Text> : null}

        <View style={styles.barWrap}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
        </View>
      </View>

      {!onPressInfo ? (
        <Modal visible={resolvedOpen} transparent animationType="fade" onRequestClose={closeInfo}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} activeOpacity={1} onPress={closeInfo} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Como calculamos</Text>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Saldo atual</Text>
                <Text style={styles.modalVal}>{fmt(result?.breakdown?.saldoAtual ?? 0)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Receitas pendentes (mês)</Text>
                <Text style={styles.modalVal}>{fmt(result?.breakdown?.receitasPendentes ?? 0)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Despesas pendentes (mês)</Text>
                <Text style={styles.modalVal}>{fmt(result?.breakdown?.despesasPendentes ?? 0)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Gastos médios diários (variável)</Text>
                <Text style={styles.modalVal}>{fmt(result?.breakdown?.mediaDiariaVariavel ?? 0)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Dias restantes no mês</Text>
                <Text style={styles.modalVal}>{String(result?.breakdown?.daysRemaining ?? 0)}</Text>
              </View>

              <Text style={styles.tip}>
                Fórmula: Saldo Atual + Receitas Pendentes - Despesas Pendentes - (Média Diária Variável × Dias Restantes).
              </Text>

              <TouchableOpacity style={styles.modalClose} onPress={closeInfo} activeOpacity={0.7}>
                <Text style={styles.modalCloseTxt}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

