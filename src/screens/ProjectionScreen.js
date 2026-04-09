import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header } from '../components/Shared';
import PieChart from '../components/PieChart';
import { useFinance, activeAccounts, activeCreditCards } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { parseTxDate } from '../utils/chart';

const FALLBACK_SLICE_COLORS = [
  '#E67E22',
  '#2980B9',
  '#27AE60',
  '#8E44AD',
  '#C0392B',
  '#16A085',
  '#D35400',
  '#2C3E50',
  '#E74C3C',
  '#3498DB',
];

function formatBrDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function monthRangeContaining(ref) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { from: formatBrDate(start), to: formatBrDate(end) };
}

function previousMonthRange() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthRangeContaining(d);
}

function lastNDaysRange(n) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { from: formatBrDate(start), to: formatBrDate(end) };
}

function txInDateRange(tx, fromStr, toStr) {
  const d = parseTxDate(tx.data);
  const f = parseTxDate(fromStr);
  const t = parseTxDate(toStr);
  if (f.getTime() === 0 || t.getTime() === 0) return true;
  f.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  return d >= f && d <= t;
}

function aggregateByCategory(rows, tipo, categories) {
  const map = {};
  for (const t of rows) {
    if (t.isTransfer) continue;
    if (t.tipo !== tipo) continue;
    const raw = (t.categoria || '').trim() || 'Outros';
    map[raw] = (map[raw] || 0) + t.valor;
  }
  const entries = Object.entries(map)
    .map(([label, value]) => {
      const cat = categories.find((c) => c.name === label);
      const color = cat?.color || FALLBACK_SLICE_COLORS[label.length % FALLBACK_SLICE_COLORS.length];
      return { label, value, color };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  return entries;
}

function createStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },
    card: {
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: T.grayVLight,
    },
    sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.graphite, marginBottom: 12 },
    filterLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed, marginBottom: 8 },
    filterScroll: { flexGrow: 0, marginBottom: 14 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      backgroundColor: T.white,
    },
    pillActive: { backgroundColor: T.orange, borderColor: T.orange },
    pillText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.graphite },
    pillTextActive: { fontFamily: 'Poppins_600SemiBold', color: '#fff' },
    dateRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 },
    dateInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: T.graySilver,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: T.graphite,
      backgroundColor: T.offWhite,
    },
    dateHint: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, marginBottom: 14 },
    chartTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.charcoal, marginBottom: 8, textAlign: 'center' },
    chartWrap: { alignItems: 'center', marginVertical: 8 },
    legend: { marginTop: 12, gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
    legendPct: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.graphite },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  });
}

export default function ProjectionScreen({ navigation }) {
  const T = useThemeColors();
  const { themeMode, categories } = useAppPreferences();
  const styles = useMemo(() => createStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { transactions, accounts, creditCards } = useFinance();

  const pieStroke = themeMode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)';

  const [dateFrom, setDateFrom] = useState(() => monthRangeContaining(new Date()).from);
  const [dateTo, setDateTo] = useState(() => monthRangeContaining(new Date()).to);
  const [accountId, setAccountId] = useState(null);
  const [creditKey, setCreditKey] = useState('all');
  const [categoryName, setCategoryName] = useState(null);

  const accountsList = useMemo(() => activeAccounts(accounts), [accounts]);
  const cardsList = useMemo(() => activeCreditCards(creditCards), [creditCards]);

  const filteredTx = useMemo(() => {
    const accIds = new Set(accountsList.map((a) => a.id));
    let list = transactions.filter((t) => accIds.has(t.accountId));
    if (accountId) list = list.filter((t) => t.accountId === accountId);
    if (creditKey === 'none') list = list.filter((t) => !t.creditCardId);
    else if (creditKey !== 'all') list = list.filter((t) => t.creditCardId === creditKey);
    if (categoryName) list = list.filter((t) => (t.categoria || 'Outros') === categoryName);
    list = list.filter((t) => txInDateRange(t, dateFrom, dateTo));
    return list;
  }, [transactions, accountsList, accountId, creditKey, categoryName, dateFrom, dateTo]);

  const expenseSlices = useMemo(
    () => aggregateByCategory(filteredTx, 'saída', categories),
    [filteredTx, categories]
  );
  const incomeSlices = useMemo(
    () => aggregateByCategory(filteredTx, 'entrada', categories),
    [filteredTx, categories]
  );

  const expenseTotal = useMemo(() => expenseSlices.reduce((s, x) => s + x.value, 0), [expenseSlices]);
  const incomeTotal = useMemo(() => incomeSlices.reduce((s, x) => s + x.value, 0), [incomeSlices]);

  const chartSize = Math.max(180, Math.min(240, Dimensions.get('window').width - 72));

  const applyPreset = useCallback((key) => {
    if (key === 'month') {
      const r = monthRangeContaining(new Date());
      setDateFrom(r.from);
      setDateTo(r.to);
    } else if (key === 'prev') {
      const r = previousMonthRange();
      setDateFrom(r.from);
      setDateTo(r.to);
    } else if (key === '30') {
      const r = lastNDaysRange(30);
      setDateFrom(r.from);
      setDateTo(r.to);
    }
  }, []);

  const Pill = ({ active, label, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.75}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  function Legend({ slices, total }) {
    return (
      <View style={styles.legend}>
        {slices.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.legendPct}>
                {pct.toFixed(1)}% · {fmt(s.value)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Relatórios"
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('Recurring')}
            hitSlop={12}
            style={{ padding: 6 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: T.brandFg, fontSize: 18 }}>⏱</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Período</Text>
          <View style={styles.presetRow}>
            <Pill active={false} label="Este mês" onPress={() => applyPreset('month')} />
            <Pill active={false} label="Mês anterior" onPress={() => applyPreset('prev')} />
            <Pill active={false} label="Últimos 30 dias" onPress={() => applyPreset('30')} />
          </View>
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={T.grayMed}
            />
            <Text style={{ color: T.grayMed, fontSize: 12 }}>até</Text>
            <TextInput
              style={styles.dateInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={T.grayMed}
            />
          </View>
          <Text style={styles.dateHint}>Datas no formato dia/mês/ano.</Text>

          <Text style={styles.filterLabel}>Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.pillRow}>
              <Pill active={accountId === null} label="Todas" onPress={() => setAccountId(null)} />
              {accountsList.map((a) => (
                <Pill
                  key={a.id}
                  active={accountId === a.id}
                  label={a.name}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.filterLabel}>Cartão</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.pillRow}>
              <Pill active={creditKey === 'all'} label="Todos" onPress={() => setCreditKey('all')} />
              <Pill active={creditKey === 'none'} label="Sem cartão" onPress={() => setCreditKey('none')} />
              {cardsList.map((c) => (
                <Pill
                  key={c.id}
                  active={creditKey === c.id}
                  label={c.name}
                  onPress={() => setCreditKey(c.id)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.filterLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.pillRow}>
              <Pill active={categoryName === null} label="Todas" onPress={() => setCategoryName(null)} />
              {categories.map((c) => (
                <Pill
                  key={c.name}
                  active={categoryName === c.name}
                  label={c.name}
                  onPress={() => setCategoryName(c.name)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Despesas por categoria</Text>
          <View style={styles.chartWrap}>
            <PieChart
              data={expenseSlices}
              size={chartSize}
              strokeColor={pieStroke}
              emptyLabel="Sem despesas"
            />
          </View>
          {expenseSlices.length > 0 ? <Legend slices={expenseSlices} total={expenseTotal} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Receitas por categoria</Text>
          <View style={styles.chartWrap}>
            <PieChart
              data={incomeSlices}
              size={chartSize}
              strokeColor={pieStroke}
              emptyLabel="Sem receitas"
            />
          </View>
          {incomeSlices.length > 0 ? <Legend slices={incomeSlices} total={incomeTotal} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
