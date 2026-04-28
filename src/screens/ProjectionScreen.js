import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header } from '../components/Shared';
import PieChart from '../components/PieChart';
import BrCalendarModal from '../components/BrCalendarModal';
import { useFinance, activeAccounts, activeCreditCards } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { parseTxDate } from '../utils/chart';
import { gerarResumoGastos } from '../services/ai';

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

function todayRange() {
  const n = new Date();
  return { from: formatBrDate(n), to: formatBrDate(n) };
}

/** 1º de janeiro até hoje */
function thisYearRange() {
  const n = new Date();
  const start = new Date(n.getFullYear(), 0, 1);
  return { from: formatBrDate(start), to: formatBrDate(n) };
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
  for (const row of rows) {
    if (row.isTransfer) continue;
    if (row.tipo !== tipo) continue;
    const raw = (row.categoria || '').trim() || 'Outros';
    map[raw] = (map[raw] || 0) + row.valor;
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

const PERIOD_PRESETS = [
  { key: 'today', label: 'Hoje' },
  { key: 'current_month', label: 'Mês Atual' },
  { key: 'prev_month', label: 'Mês anterior' },
  { key: 'this_year', label: 'Este ano' },
  { key: 'last_7', label: 'Últimos 7 dias' },
  { key: 'last_30', label: 'Últimos 30 dias' },
];

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
    filterLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed, marginBottom: 8 },
    periodScroll: { flexGrow: 0, marginBottom: 14 },
    periodScrollContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      backgroundColor: T.white,
    },
    pillActive: { backgroundColor: T.orange, borderColor: T.orange },
    pillText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.graphite },
    pillTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.white },
    customBlock: { marginTop: 4, marginBottom: 4 },
    dateBtnRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
    dateBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: T.graySilver,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: T.offWhite,
    },
    dateBtnLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, marginBottom: 4 },
    dateBtnValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite },
    filterScroll: { flexGrow: 0, marginBottom: 14 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chartTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.charcoal, marginBottom: 8, textAlign: 'center' },
    chartWrap: { alignItems: 'center', marginVertical: 8 },
    legend: { marginTop: 12, gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
    legendPct: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.graphite },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    filterSheet: {
      backgroundColor: T.white,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 20,
      paddingTop: 16,
      maxHeight: '88%',
      borderWidth: 1,
      borderColor: T.grayVLight,
      borderBottomWidth: 0,
    },
    filterSheetTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: T.graphite, marginBottom: 4 },
    filterSheetSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed, marginBottom: 16 },
    modalSectionTitle: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
      color: T.charcoal,
      marginTop: 8,
      marginBottom: 10,
    },
    filterCloseBtn: {
      marginTop: 8,
      marginBottom: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: T.orange,
      alignItems: 'center',
    },
    filterCloseBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.white },
    aiCard: {
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: T.orange,
      // Destaque visual suave: sombra laranja
      shadowColor: T.orange,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    aiCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    aiCardBadge: {
      backgroundColor: T.orange,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    aiCardBadgeText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 11,
      color: T.white,
      letterSpacing: 0.8,
    },
    aiCardTitle: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
      color: T.charcoal,
      flex: 1,
    },
    aiCardText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: T.graphite,
      // line-height aumentado para leitura confortável
      lineHeight: 24,
    },
    aiCardLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    aiCardLoadingText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: T.grayMed,
    },
    aiCardRetry: {
      marginTop: 12,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: T.orange,
    },
    aiCardRetryText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 12,
      color: T.orange,
    },
    // Alerta de gasto acima da receita (#FEB506 conforme Design System)
    alertBanner: {
      backgroundColor: T.amber,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    alertBannerText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
      color: T.chocolate,
      lineHeight: 20,
    },
  });
}

export default function ProjectionScreen({ navigation }) {
  const T = useThemeColors();
  const { themeMode, categories } = useAppPreferences();
  const styles = useMemo(() => createStyles(T), [T]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { transactions, accounts, creditCards } = useFinance();

  const pieStroke = themeMode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)';

  const [periodPreset, setPeriodPreset] = useState('current_month');
  const [dateFrom, setDateFrom] = useState(() => monthRangeContaining(new Date()).from);
  const [dateTo, setDateTo] = useState(() => monthRangeContaining(new Date()).to);
  const [calendarOpen, setCalendarOpen] = useState(null);
  const [periodFilterOpen, setPeriodFilterOpen] = useState(false);

  const [accountId, setAccountId] = useState(null);
  const [creditKey, setCreditKey] = useState('all');
  const [categoryName, setCategoryName] = useState(null);

  const [aiResumo, setAiResumo] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const aiAbortRef = useRef(null);

  const accountsList = useMemo(() => activeAccounts(accounts), [accounts]);
  const cardsList = useMemo(() => activeCreditCards(creditCards), [creditCards]);

  const applyPreset = useCallback((key) => {
    let r;
    if (key === 'today') r = todayRange();
    else if (key === 'current_month') r = monthRangeContaining(new Date());
    else if (key === 'prev_month') r = previousMonthRange();
    else if (key === 'this_year') r = thisYearRange();
    else if (key === 'last_7') r = lastNDaysRange(7);
    else if (key === 'last_30') r = lastNDaysRange(30);
    else return;
    setPeriodPreset(key);
    setDateFrom(r.from);
    setDateTo(r.to);
  }, []);

  const onCalendarConfirm = useCallback(
    (br) => {
      if (calendarOpen === 'from') {
        const pf = parseTxDate(br);
        const pt = parseTxDate(dateTo);
        setDateFrom(br);
        if (pf.getTime() > pt.getTime()) setDateTo(br);
      } else if (calendarOpen === 'to') {
        const pf = parseTxDate(dateFrom);
        const pt = parseTxDate(br);
        setDateTo(br);
        if (pt.getTime() < pf.getTime()) setDateFrom(br);
      }
      setPeriodPreset('custom');
      setCalendarOpen(null);
    },
    [calendarOpen, dateFrom, dateTo]
  );

  const filteredTx = useMemo(() => {
    const accIds = new Set(accountsList.map((a) => a.id));
    let list = transactions.filter((row) => accIds.has(row.accountId));
    if (accountId) list = list.filter((row) => row.accountId === accountId);
    if (creditKey === 'none') list = list.filter((row) => !row.creditCardId);
    else if (creditKey !== 'all') list = list.filter((row) => row.creditCardId === creditKey);
    if (categoryName) list = list.filter((row) => (row.categoria || 'Outros') === categoryName);
    list = list.filter((row) => txInDateRange(row, dateFrom, dateTo));
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

  // Label legível do período ativo para contextualizar o resumo da IA
  const periodoLabel = useMemo(() => {
    const preset = PERIOD_PRESETS.find((p) => p.key === periodPreset);
    if (preset && periodPreset !== 'custom') return preset.label;
    return `${dateFrom} a ${dateTo}`;
  }, [periodPreset, dateFrom, dateTo]);

  const gerarResumo = useCallback(async (txList, label) => {
    if (aiAbortRef.current) aiAbortRef.current.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    setAiLoading(true);
    setAiError(false);
    setAiResumo(null);

    try {
      const texto = await gerarResumoGastos(txList, label, { signal: controller.signal });
      setAiResumo(texto);
    } catch (err) {
      if (err?.name !== 'AbortError') setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Dispara nova análise sempre que as transações filtradas ou o período mudarem
  useEffect(() => {
    gerarResumo(filteredTx, periodoLabel);
    return () => {
      if (aiAbortRef.current) aiAbortRef.current.abort();
    };
  }, [filteredTx, periodoLabel]);

  const chartSize = Math.max(180, Math.min(240, windowWidth - 72));

  const Pill = ({ active, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]} activeOpacity={0.75}>
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
            onPress={() => setPeriodFilterOpen(true)}
            hitSlop={12}
            style={{ paddingVertical: 6, paddingHorizontal: 4 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: T.brandFg, fontSize: 14, fontFamily: 'Poppins_600SemiBold' }}>Filtro</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Alerta visual em amarelo quando despesas excedem receitas */}
        {expenseTotal > incomeTotal && incomeTotal > 0 ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>
              Atenção: suas despesas ({fmt(expenseTotal)}) superam suas receitas ({fmt(incomeTotal)}) neste período.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Despesas por categoria</Text>
          <View style={styles.chartWrap}>
            <PieChart data={expenseSlices} size={chartSize} strokeColor={pieStroke} emptyLabel="Sem despesas" />
          </View>
          {expenseSlices.length > 0 ? <Legend slices={expenseSlices} total={expenseTotal} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Receitas por categoria</Text>
          <View style={styles.chartWrap}>
            <PieChart data={incomeSlices} size={chartSize} strokeColor={pieStroke} emptyLabel="Sem receitas" />
          </View>
          {incomeSlices.length > 0 ? <Legend slices={incomeSlices} total={incomeTotal} /> : null}
        </View>

        {/* Card de resumo IA */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiCardBadge}>
              <Text style={styles.aiCardBadgeText}>IA</Text>
            </View>
            <Text style={styles.aiCardTitle}>Análise do período</Text>
          </View>

          {aiLoading ? (
            <View style={styles.aiCardLoading}>
              <ActivityIndicator size="small" color={T.orange} />
              <Text style={styles.aiCardLoadingText}>Analisando seus gastos...</Text>
            </View>
          ) : aiError ? (
            <View>
              <Text style={styles.aiCardLoadingText}>Não foi possível gerar a análise.</Text>
              <TouchableOpacity
                style={styles.aiCardRetry}
                onPress={() => gerarResumo(filteredTx, periodoLabel)}
                activeOpacity={0.75}
              >
                <Text style={styles.aiCardRetryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : aiResumo ? (
            <Text style={styles.aiCardText}>{aiResumo}</Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={periodFilterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPeriodFilterOpen(false)}
      >
        <View style={styles.filterBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setPeriodFilterOpen(false)}
          />
          <View style={[styles.filterSheet, { paddingBottom: Math.max(12, insets.bottom) }]}>
            <Text style={styles.filterSheetTitle}>Filtros</Text>
            <Text style={styles.filterSheetSub}>Período, conta, cartão e categoria</Text>

            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: windowHeight * 0.72 }}
            >
              <Text style={styles.modalSectionTitle}>Período</Text>
              <Text style={[styles.filterLabel, { marginBottom: 8 }]}>
                {dateFrom} — {dateTo}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.periodScroll}
                contentContainerStyle={styles.periodScrollContent}
              >
                {PERIOD_PRESETS.map(({ key, label }) => (
                  <Pill
                    key={key}
                    active={periodPreset === key}
                    label={label}
                    onPress={() => applyPreset(key)}
                  />
                ))}
              </ScrollView>

              <View style={styles.customBlock}>
                <Text style={styles.filterLabel}>Período personalizado</Text>
                <View style={styles.dateBtnRow}>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setCalendarOpen('from')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.dateBtnLabel}>De</Text>
                    <Text style={styles.dateBtnValue}>{dateFrom}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setCalendarOpen('to')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.dateBtnLabel}>Até</Text>
                    <Text style={styles.dateBtnValue}>{dateTo}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Conta</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.pillRow}>
                  <Pill active={accountId === null} label="Todas" onPress={() => setAccountId(null)} />
                  {accountsList.map((a) => (
                    <Pill key={a.id} active={accountId === a.id} label={a.name} onPress={() => setAccountId(a.id)} />
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.modalSectionTitle}>Cartão</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.pillRow}>
                  <Pill active={creditKey === 'all'} label="Todos" onPress={() => setCreditKey('all')} />
                  <Pill active={creditKey === 'none'} label="Sem cartão" onPress={() => setCreditKey('none')} />
                  {cardsList.map((c) => (
                    <Pill key={c.id} active={creditKey === c.id} label={c.name} onPress={() => setCreditKey(c.id)} />
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.modalSectionTitle}>Categoria</Text>
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
            </ScrollView>

            <TouchableOpacity style={styles.filterCloseBtn} onPress={() => setPeriodFilterOpen(false)} activeOpacity={0.85}>
              <Text style={styles.filterCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BrCalendarModal
        visible={calendarOpen !== null}
        title={calendarOpen === 'to' ? 'Data final' : 'Data inicial'}
        valueBr={calendarOpen === 'to' ? dateTo : dateFrom}
        onConfirm={onCalendarConfirm}
        onClose={() => setCalendarOpen(null)}
        palette={T}
      />
    </View>
  );
}
