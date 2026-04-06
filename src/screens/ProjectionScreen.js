import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, fmt } from '../theme';
import { Header } from '../components/Shared';
import { useFinance, activeAccounts } from '../context/FinanceContext';
import { parseTxDate } from '../utils/chart';

export default function ProjectionScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, accounts } = useFinance();
  const meta = 4500;

  const { totalOut, projected, pct, alerts } = useMemo(() => {
    const activeIds = new Set(activeAccounts(accounts).map((a) => a.id));
    const now = new Date();
    const monthTx = transactions.filter((t) => {
      const d = parseTxDate(t.data);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        activeIds.has(t.accountId)
      );
    });
    const out = monthTx.filter((t) => t.tipo === 'saída' && !t.isTransfer).reduce((a, t) => a + t.valor, 0);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = Math.max(1, now.getDate());
    const avgDaily = out / day;
    const daysRemaining = Math.max(0, daysInMonth - now.getDate());
    const proj = out + avgDaily * daysRemaining;

    const pctVal = meta > 0 ? Math.min((out / meta) * 100, 100) : 0;

    const byCat = {};
    for (const t of monthTx) {
      if (t.tipo !== 'saída' || t.isTransfer) continue;
      byCat[t.categoria] = (byCat[t.categoria] || 0) + t.valor;
    }
    const alertList = [];
    for (const [cat, val] of Object.entries(byCat)) {
      if (out > 0 && val / out > 0.35) {
        alertList.push({
          text: `${cat}: ${(val / out * 100).toFixed(0)}% dos gastos do mês`,
          level: 'warn',
        });
      }
    }
    if (alertList.length === 0) {
      alertList.push({ text: 'Nenhum gasto concentrado acima de 35% em uma categoria', level: 'ok' });
    }

    return { totalOut: out, projected: proj, pct: pctVal, alerts: alertList };
  }, [transactions, accounts]);

  const barColor = pct < 70 ? T.gold : pct < 90 ? T.amberDark : T.orange;

  return (
    <View style={styles.container}>
      <Header title="Projeção Mensal" />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom, gap: 20 }}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Gastos do mês</Text>
            <Text style={styles.cardLabel}>{pct.toFixed(0)}%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.cardValue}>{fmt(totalOut)}</Text>
            <Text style={styles.cardValue}>Meta: {fmt(meta)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Projeção para fim do mês</Text>
          <Text style={styles.projValue}>{fmt(projected)}</Text>
          <Text style={[styles.projStatus, { color: projected > meta ? T.orange : T.gold }]}>
            {projected > meta
              ? `⚠ Acima da meta em ${fmt(projected - meta)}`
              : `✓ Dentro da meta — folga de ${fmt(meta - projected)}`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.alertsTitle}>Alertas</Text>
          {alerts.map((a, i) => (
            <View key={i} style={[styles.alertBox, a.level === 'warn' ? styles.alertWarn : styles.alertOk]}>
              <Text style={styles.alertText}>
                {a.level === 'warn' ? '⚠️' : '✓'} {a.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.offWhite },
  card: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: T.grayVLight,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed },
  cardValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.graphite },
  barBg: { height: 12, borderRadius: 6, backgroundColor: T.grayVLight, overflow: 'hidden', marginVertical: 10 },
  barFill: { height: '100%', borderRadius: 6 },
  projValue: { fontFamily: 'Poppins_300Light', fontSize: 32, color: T.chocolate, marginVertical: 6 },
  projStatus: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  alertsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.charcoal, marginBottom: 12 },
  alertBox: { padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  alertWarn: { backgroundColor: 'rgba(240,80,0,0.06)', borderColor: 'rgba(240,80,0,0.15)' },
  alertOk: { backgroundColor: 'rgba(224,154,0,0.06)', borderColor: 'rgba(224,154,0,0.15)' },
  alertText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.charcoal },
});
