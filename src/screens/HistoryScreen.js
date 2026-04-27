import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt, CATEGORIES } from '../theme';
import { Header, CatIcon } from '../components/Shared';
import { useFinance } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { sortTransactionsByDate } from '../utils/txSort';
import { useResponsiveLayout } from '../utils/responsiveLayout';

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const TIPO_OPTIONS = [
  { key: 'todos',   label: 'Todos'     },
  { key: 'entrada', label: 'Receitas'  },
  { key: 'saída',   label: 'Despesas'  },
];

function offsetMonth(month, year, delta) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1;  y += 1; }
  if (m < 1)  { m = 12; y -= 1; }
  return { month: m, year: y };
}

const CURRENT_YEAR = new Date().getFullYear();

function monthLabel(month, year) {
  const name = MONTHS_PT[month - 1];
  return year !== CURRENT_YEAR ? `${name} ${year}` : name;
}

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const T = useThemeColors();
  const styles = useMemo(() => createHistoryStyles(T), [T]);
  const { transactions } = useFinance();
  const { transactionListOrder } = useAppPreferences();
  const { isDesktop } = useResponsiveLayout();

  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1); // 1-12
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [catFilter,  setCatFilter]  = useState('Todos');

  const prev = offsetMonth(selMonth, selYear, -1);
  const next = offsetMonth(selMonth, selYear, +1);

  const goTo = ({ month, year }) => { setSelMonth(month); setSelYear(year); };

  // 1. filtro por mês
  const byMonth = useMemo(() =>
    transactions.filter((t) => {
      const p = t.data.split('/');
      return p.length === 3 && parseInt(p[1], 10) === selMonth && parseInt(p[2], 10) === selYear;
    }),
    [transactions, selMonth, selYear]
  );

  // 2. filtro por tipo (transferências nunca aparecem em Receitas/Despesas)
  const byTipo = useMemo(() => {
    if (tipoFilter === 'todos') return byMonth;
    return byMonth.filter((t) => !t.isTransfer && t.tipo === tipoFilter);
  }, [byMonth, tipoFilter]);

  // 3. filtro por categoria
  const filtered = useMemo(() =>
    catFilter === 'Todos' ? byTipo : byTipo.filter((t) => t.categoria === catFilter),
    [byTipo, catFilter]
  );

  const ordered = useMemo(
    () => sortTransactionsByDate(filtered, transactionListOrder),
    [filtered, transactionListOrder]
  );

  // resumo do mês — exclui transferências
  const totalEntradas = useMemo(() => byMonth.reduce((s, t) => !t.isTransfer && t.tipo === 'entrada' ? s + t.valor : s, 0), [byMonth]);
  const totalSaidas   = useMemo(() => byMonth.reduce((s, t) => !t.isTransfer && t.tipo === 'saída'   ? s + t.valor : s, 0), [byMonth]);
  const saldo = totalEntradas - totalSaidas;

  const cats = ['Todos', ...CATEGORIES.map((c) => c.name)];

  return (
    <View style={styles.container}>
      <Header
        title="Histórico"
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

      {/* ── navegador de mês ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => goTo(prev)} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.navArrowText}>{'<'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goTo(prev)} style={styles.navSide} activeOpacity={0.6}>
          <Text style={styles.navSideText}>{monthLabel(prev.month, prev.year)}</Text>
        </TouchableOpacity>

        <View style={styles.navCurrent}>
          <Text style={styles.navCurrentText}>{monthLabel(selMonth, selYear)}</Text>
        </View>

        <TouchableOpacity onPress={() => goTo(next)} style={styles.navSide} activeOpacity={0.6}>
          <Text style={styles.navSideText}>{monthLabel(next.month, next.year)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goTo(next)} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.navArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── resumo do mês ── */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text style={[styles.summaryValue, { color: T.gold }]}>+{fmt(totalEntradas)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={[styles.summaryValue, { color: T.burnt }]}>-{fmt(totalSaidas)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Saldo</Text>
          <Text style={[styles.summaryValue, { color: saldo >= 0 ? T.gold : T.burnt }]}>
            {saldo >= 0 ? '+' : ''}{fmt(saldo)}
          </Text>
        </View>
      </View>

      {/* ── toggle tipo ── */}
      <View style={styles.tipoToggle}>
        {TIPO_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => setTipoFilter(o.key)}
            style={[styles.tipoBtn, tipoFilter === o.key && styles.tipoBtnActive]}
          >
            <Text style={[styles.tipoText, tipoFilter === o.key && styles.tipoTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── pills de categoria ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {cats.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCatFilter(c)}
            style={[styles.pill, catFilter === c && styles.pillActive]}
          >
            <Text style={[styles.pillText, catFilter === c && styles.pillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── lista ── */}
      <FlatList
        style={{ flex: 1 }}
        data={ordered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: isDesktop ? 40 : 20, paddingBottom: 100 + insets.bottom }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada</Text>}
        renderItem={({ item: tx }) => (
          <TouchableOpacity
            style={[styles.txRow, isDesktop && styles.txRowDesktop]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Detail', { tx })}
          >
            <CatIcon category={tx.categoria} size={isDesktop ? 48 : 40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.txDesc, isDesktop && styles.txDescDesktop]} numberOfLines={1}>{tx.descricao}</Text>
              <Text style={[styles.txMeta, isDesktop && styles.txMetaDesktop]}>{tx.categoria} · {tx.data}</Text>
            </View>
            <Text style={[styles.txValue, isDesktop && styles.txValueDesktop, { color: tx.tipo === 'entrada' ? T.gold : T.burnt }]}>
              {tx.tipo === 'entrada' ? '+' : '-'}{fmt(tx.valor)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function createHistoryStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },

    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.chocolate,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    navArrow: { paddingHorizontal: 6 },
    navArrowText: { fontSize: 18, color: T.grayNeutral, fontFamily: 'Poppins_400Regular' },
    navSide: { flex: 1, alignItems: 'center' },
    navSideText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayLight },
    navCurrent: {
      flex: 1.4,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: T.grayLight,
      borderRadius: 24,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    navCurrentText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.white },

    summary: {
      flexDirection: 'row',
      backgroundColor: T.white,
      marginHorizontal: 20,
      marginTop: 14,
      marginBottom: 2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.grayVLight,
      paddingVertical: 12,
    },
    summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
    summaryDivider: { width: 1, backgroundColor: T.grayVLight, marginVertical: 4 },
    summaryLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
    summaryValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

    tipoToggle: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 4,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: T.graySilver,
    },
    tipoBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: T.white },
    tipoBtnActive: { backgroundColor: T.orange },
    tipoText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.graphite },
    tipoTextActive: { color: T.white },

    filterScroll: { flexGrow: 0, flexShrink: 0 },
    filterRow: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.graySilver,
    },
    pillActive: { backgroundColor: T.orange, borderColor: T.orange },
    pillText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.graphite },
    pillTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.white },

    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
    },
    txRowDesktop: {
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    txDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.graphite },
    txDescDesktop: { fontSize: 15 },
    txMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
    txMetaDesktop: { fontSize: 12 },
    txValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    txValueDesktop: { fontSize: 15 },
    emptyText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: T.grayMed,
      textAlign: 'center',
      marginTop: 40,
    },
  });
}
