import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header } from '../components/Shared';
import { useFinance, activeAccounts } from '../context/FinanceContext';
import { useThemeColors } from '../context/AppPreferencesContext';
import { parseTxDate } from '../utils/chart';
import { projectedRecurringOut } from '../utils/recurrence';

function createStyles(T) {
  return StyleSheet.create({
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
    note: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, marginTop: 6 },
  });
}

export default function ProjectionScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { transactions, accounts } = useFinance();
  const meta = 4500;

  const { totalOut, projected, pct, alerts, recurringRemaining } = useMemo(() => {
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
    const recurringRem = projectedRecurringOut(monthTx, now);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = Math.max(1, now.getDate());
    const avgDaily = out / day;
    const daysRemaining = Math.max(0, daysInMonth - now.getDate());
    const proj = out + avgDaily * daysRemaining + recurringRem;

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

    return { totalOut: out, projected: proj, pct: pctVal, alerts: alertList, recurringRemaining: recurringRem };
  }, [transactions, accounts]);

  const barColor = pct < 70 ? T.gold : pct < 90 ? T.amberDark : T.orange;

  return (
    <View style={styles.container}>
      <Header
        title="Projeção Mensal"
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('Recurring')}
            hitSlop={12}
            style={{ padding: 6 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>⏱</Text>
          </TouchableOpacity>
        }
      />

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

        {recurringRemaining > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Recorrências restantes no mês</Text>
            <Text style={styles.cardValue}>{fmt(recurringRemaining)}</Text>
            <Text style={styles.note}>Incluídas na projeção acima.</Text>
          </View>
        ) : null}

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
