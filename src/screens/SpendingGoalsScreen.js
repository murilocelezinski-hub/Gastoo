import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, CatIcon } from '../components/Shared';
import { useFinance } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { fmt } from '../theme';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function monthKeyFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthKeyLabel(monthKey) {
  const [y, m] = String(monthKey).split('-');
  const mm = parseInt(m, 10);
  const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const label = mm >= 1 && mm <= 12 ? monthsPt[mm - 1] : m;
  return `${label} ${y}`;
}

function shiftMonthKey(monthKey, delta) {
  const [y, m] = String(monthKey).split('-');
  const d = new Date(parseInt(y, 10), Math.max(0, (parseInt(m, 10) || 1) - 1), 1);
  d.setMonth(d.getMonth() + delta);
  return monthKeyFromDate(d);
}

function parseTxDateToMonthKey(ddmmyyyy) {
  const parts = String(ddmmyyyy || '').split('/');
  if (parts.length !== 3) return null;
  const mm = parseInt(parts[1], 10);
  const yyyy = parseInt(parts[2], 10);
  if (!Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  return `${yyyy}-${pad2(mm)}`;
}

function createStyles(palette) {
  const p = palette;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.offWhite },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    copyLinkWrap: { alignItems: 'center', marginBottom: 14 },
    copyLink: { paddingVertical: 4, paddingHorizontal: 8 },
    copyLinkText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: p.grayMed },
    monthLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: p.graphite },
    monthBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: p.graySilver,
      backgroundColor: p.white,
    },
    monthBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: p.graphite },
    sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: p.charcoal, marginTop: 8, marginBottom: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.grayVLight,
    },
    rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: p.graphite },
    rowSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: p.grayMed, marginTop: 2 },
    input: {
      width: 110,
      borderWidth: 1.5,
      borderColor: p.graySilver,
      backgroundColor: p.white,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontFamily: 'Poppins_600SemiBold',
      color: p.graphite,
      textAlign: 'right',
    },
    kindPill: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: p.graySilver,
      backgroundColor: p.white,
    },
    kindPillOn: { borderColor: p.orange, backgroundColor: 'rgba(240,80,0,0.12)' },
    kindText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: p.grayMed },
    kindTextOn: { color: p.orange },
    barWrap: { height: 8, borderRadius: 999, backgroundColor: p.grayVLight, overflow: 'hidden', marginTop: 8 },
    barFill: { height: 8, borderRadius: 999 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    totalText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: p.graphite },
  });
}

export default function SpendingGoalsScreen() {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { transactions } = useFinance();
  const { categories, spendingGoals, setCategorySpendingGoal, copySpendingGoals } = useAppPreferences();
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate(new Date()));

  const monthGoals = spendingGoals?.[monthKey]?.categories || {};

  const spendByCategory = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      if (!tx || tx.tipo !== 'saída') continue;
      if (tx.isTransfer) continue;
      const mk = parseTxDateToMonthKey(tx.data);
      if (mk !== monthKey) continue;
      const cat = tx.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(tx.valor) || 0);
    }
    return map;
  }, [transactions, monthKey]);

  const totalFixed = useMemo(() => {
    let sum = 0;
    for (const c of categories) {
      const g = monthGoals?.[c.name];
      if (g?.kind === 'fixed') sum += Number(g.limit) || 0;
    }
    return sum;
  }, [categories, monthGoals]);

  const totalVariable = useMemo(() => {
    let sum = 0;
    for (const c of categories) {
      const g = monthGoals?.[c.name];
      if (g?.kind !== 'fixed') sum += Number(g?.limit) || 0;
    }
    return sum;
  }, [categories, monthGoals]);

  const copyFromPrev = () => {
    const prev = shiftMonthKey(monthKey, -1);
    copySpendingGoals(prev, monthKey);
  };

  return (
    <View style={styles.container}>
      <Header title="Meta de Gastos" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthBtn} onPress={() => setMonthKey(shiftMonthKey(monthKey, -1))} activeOpacity={0.75}>
            <Text style={styles.monthBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthKeyLabel(monthKey)}</Text>
          <TouchableOpacity style={styles.monthBtn} onPress={() => setMonthKey(shiftMonthKey(monthKey, 1))} activeOpacity={0.75}>
            <Text style={styles.monthBtnText}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.copyLinkWrap}>
          <TouchableOpacity style={styles.copyLink} onPress={copyFromPrev} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={styles.copyLinkText}>Copiar mês anterior</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Limites por categoria</Text>

        {categories
          .filter((c) => c.name !== 'Transferência')
          .map((c) => {
            const goal = monthGoals?.[c.name] || { limit: 0, kind: 'variable' };
            const spent = spendByCategory?.[c.name] || 0;
            const limit = Number(goal.limit) || 0;
            const pct = limit > 0 ? Math.min(1, spent / limit) : 0;
            const barColor = spent <= limit ? theme.gold : theme.burnt;
            return (
              <View key={c.name} style={styles.row}>
                <CatIcon category={c.name} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowSub}>
                    Gasto: {fmt(spent)} {limit > 0 ? `· Limite: ${fmt(limit)}` : '· Sem limite'}
                  </Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <TextInput
                    value={String(goal.limit ?? 0)}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/[^\d.,]/g, '').replace(',', '.');
                      setCategorySpendingGoal(monthKey, c.name, { limit: cleaned === '' ? 0 : Number(cleaned), kind: goal.kind });
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={theme.grayNeutral}
                  />

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setCategorySpendingGoal(monthKey, c.name, { limit, kind: 'fixed' })}
                      style={[styles.kindPill, goal.kind === 'fixed' && styles.kindPillOn]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.kindText, goal.kind === 'fixed' && styles.kindTextOn]}>Fixo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setCategorySpendingGoal(monthKey, c.name, { limit, kind: 'variable' })}
                      style={[styles.kindPill, goal.kind !== 'fixed' && styles.kindPillOn]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.kindText, goal.kind !== 'fixed' && styles.kindTextOn]}>Variável</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

        <Text style={styles.sectionTitle}>Totais de metas</Text>
        <View style={styles.totalsRow}>
          <Text style={styles.totalText}>Fixos: {fmt(totalFixed)}</Text>
          <Text style={styles.totalText}>Variáveis: {fmt(totalVariable)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

